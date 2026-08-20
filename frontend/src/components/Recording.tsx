"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, StopCircle, Upload, Loader2, AlertCircle, Video, VideoOff, Mic, MicOff, Volume2, Pause, Play, FileText, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Accordion } from "@/components/ui/Accordion";

export default function Recording() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [step, setStep] = useState<'rules' | 'recording'>('rules');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(90); // 1.5 minutes per question
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [interviewLanguage, setInterviewLanguage] = useState('en-US');
  const [speechSupport, setSpeechSupport] = useState(true);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef('');
  const interimTranscriptRef = useRef('');
  const isRecordingRef = useRef(false);
  const [questions, setQuestions] = useState<string[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [ttsState, setTtsState] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [ttsHighlight, setTtsHighlight] = useState<{ charIndex: number; charLength: number } | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [pollyState, setPollyState] = useState<'idle' | 'loading' | 'playing' | 'paused'>('idle');
  const pollyAudioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlType = searchParams?.get('type');
  const urlJobId = searchParams?.get('jobId') || searchParams?.get('job_id');
  const isAudioAssessment = urlType === 'audio' || searchParams?.get('mode') === 'audio-only';
  
  const isAudioOnly = isAudioAssessment;
  const [isCameraOn, setIsCameraOn] = useState(!isAudioOnly);
  const [isMicOn, setIsMicOn] = useState(true);

  // Extract auth token and workerId from URL if present (for direct links)
  useEffect(() => {
    const urlToken = searchParams?.get('token');
    if (urlToken) {
      localStorage.setItem('candidateToken', urlToken);
    }
    const urlWorkerId = searchParams?.get('workerId') || searchParams?.get('worker_id');
    if (urlWorkerId) {
      localStorage.setItem('candidateId', urlWorkerId);
    }
  }, [searchParams]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    // Fetch dynamic questions
    const fetchQuestions = async () => {
      setIsLoadingQuestions(true);
      try {
        let workerId = searchParams?.get('workerId') || searchParams?.get('worker_id') || localStorage.getItem('candidateId');
        if (!workerId) {
          workerId = '05adbc3d-4f00-411c-9797-fdb975cab8c7'; // Test ID provided by user
          localStorage.setItem('candidateId', workerId);
        }
        
        let token = searchParams?.get('token') || localStorage.getItem('candidateToken');

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        let queryStr = '';
        if (isAudioAssessment && urlJobId) {
            queryStr = `?type=audio&jobId=${urlJobId}`; // Language is auto-detected by backend
        } else if (urlType === 'video-interview' && urlJobId) {
            queryStr = `?type=video-interview&jobId=${urlJobId}`;
        } else {
            queryStr = `?lang=${interviewLanguage}`;
        }
        const res = await fetch(`${apiUrl}/api/candidates/${workerId}/questions${queryStr}`, {
          headers: {
        'x-environment': typeof window !== 'undefined' ? (window.location.hostname.includes('staging') ? 'staging' : (window.location.hostname.includes('worker.dataalchemy.ai') ? 'production' : 'daily-interview')) : 'daily-interview',
            'Authorization': `Bearer ${token}`
          }
        });
        const text = await res.text();

        try {
          const data = JSON.parse(text);
          if (data.success && data.questions) {
            const cleanedQuestions = data.questions.map((q: string) => 
              q.replace(/\\n/g, ' ')
               .replace(/\n/g, ' ')
               .replace(/\*\*/g, '')
               .replace(/\\"/g, '"')
               .trim()
            );
            setQuestions(cleanedQuestions);
            if (data.language) {
              setInterviewLanguage(data.language);
            }
          }
        } catch (parseError) {
          console.error('Failed to parse questions API response as JSON:', parseError);
          // Fallback questions if API returns HTML (e.g. proxy error or 404)
          if (urlType === 'audio' || isAudioAssessment) {
            setQuestions([
              "Cold-Reading Exercise: Please read the following script aloud.\n\nThank you for taking the time to participate in this assessment. In this role, you will be expected to communicate clearly and effectively. Please read this sentence naturally, at your normal speaking pace.",
              "Cold-Reading Exercise: Please read the following script aloud.\n\nOur company values strong collaboration and attention to detail. We are looking for individuals who can adapt to new challenges and provide high-quality results consistently.",
              "Situational Question: Please answer the following question aloud.\n\nIf you were asked to explain a complex topic to someone who has no background in it, how would you ensure they understand you clearly?"
            ]);
          } else if (urlType === 'video-interview') {
            setQuestions([
              "Please introduce yourself and describe your background in relation to this role.",
              "Could you share a specific example of how you solved a challenging technical problem?",
              "What are the most critical skills you bring to this position?",
              "Describe a situation where you had to adapt to a significant change at work.",
              "Why are you interested in this position and how does it align with your career goals?"
            ]);
          } else {
            setQuestions([
              "Could you please introduce yourself and provide a brief overview of your background?",
              "Can you highlight the key skills and experiences that make you a great fit?",
              "What are your career goals and what are you looking for in your next role?"
            ]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch questions:', err);
      } finally {
        setIsLoadingQuestions(false);
      }
    };
    fetchQuestions();
  }, [interviewLanguage]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRecording) {
      handleNextQuestion();
    }
    return () => clearInterval(interval);
  }, [isRecording, timeLeft]);

  const startCamera = async (video: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: isAudioOnly ? false : video, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Sync initial mic state with stream
      if (!isMicOn) {
        stream.getAudioTracks().forEach(track => {
          track.enabled = false;
        });
      }

      setHasPermission(true);
    } catch (err) {
      console.error("Error accessing media devices.", err);
      setHasPermission(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const toggleCamera = () => {
    if (isRecording) return; // Prevent toggle during recording
    const newIsCameraOn = !isCameraOn;
    setIsCameraOn(newIsCameraOn);
    stopCamera();
    startCamera(newIsCameraOn);
  };

  const toggleMic = () => {
    if (isRecording) return; // Prevent toggle during recording to keep file consistent
    const newIsMicOn = !isMicOn;
    setIsMicOn(newIsMicOn);
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = newIsMicOn;
      });
    }
  };

  const handleStartRecording = () => {
    setRecordedChunks([]);
    setVideoBlob(null);
    setAudioBlob(null);
    setTimeLeft(90);
    setCurrentQuestionIndex(0);
    setIsPaused(false);
    setRecognitionError(null);

    if (streamRef.current) {
      const stream = streamRef.current;

      // Video + Audio recorder (if camera is on)
      if (isCameraOn) {
        let mimeType = 'video/webm; codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }
        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        const localChunks: Blob[] = [];
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            localChunks.push(event.data);
            setRecordedChunks((prev) => [...prev, event.data]);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(localChunks, { type: mimeType });
          setVideoBlob(blob);
          if (videoRef.current) {
            videoRef.current.srcObject = null;
            videoRef.current.src = URL.createObjectURL(blob);
            videoRef.current.controls = true;
          }
        };

        mediaRecorder.start(250);
      } else {
        // Clear video blob if we recorded audio-only
        setVideoBlob(null);
      }

      // Separate Audio recorder (always running to get pure audio)
      try {
        const audioStream = new MediaStream(stream.getAudioTracks());
        const audioMimeType = 'audio/webm';
        const audioRecorder = new MediaRecorder(audioStream, { mimeType: audioMimeType });
        const audioChunks: Blob[] = [];
        audioRecorderRef.current = audioRecorder;

        audioRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
          }
        };

        audioRecorder.onstop = () => {
          const aBlob = new Blob(audioChunks, { type: audioMimeType });
          setAudioBlob(aBlob);

          if (!isCameraOn) {
            if (videoRef.current) {
              videoRef.current.srcObject = null;
            }
          }
        };

        audioRecorder.start(250);
      } catch (err) {
        console.error("Could not start audio recorder", err);
      }

      // Start Web Speech API for live transcription
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          
          let bcp47Lang = interviewLanguage;
          if (bcp47Lang.toLowerCase() === 'ja' || bcp47Lang.toLowerCase() === 'japanese') bcp47Lang = 'ja-JP';
          else if (bcp47Lang.toLowerCase() === 'es' || bcp47Lang.toLowerCase() === 'spanish') bcp47Lang = 'es-ES';
          else if (bcp47Lang.toLowerCase() === 'fr' || bcp47Lang.toLowerCase() === 'french') bcp47Lang = 'fr-FR';
          else if (bcp47Lang.toLowerCase() === 'de' || bcp47Lang.toLowerCase() === 'german') bcp47Lang = 'de-DE';
          else if (!bcp47Lang.includes('-') && bcp47Lang.length === 2) bcp47Lang = `${bcp47Lang}-${bcp47Lang.toUpperCase()}`;
          
          recognition.lang = bcp47Lang;

          recognition.onresult = (event: any) => {
            let currentInterim = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                const flushed = `${transcriptRef.current} ${event.results[i][0].transcript}`.trim();
                transcriptRef.current = flushed;
                setTranscript(flushed);
              } else {
                currentInterim += event.results[i][0].transcript;
              }
            }
            interimTranscriptRef.current = currentInterim;
            setInterimTranscript(currentInterim);
          };

          recognition.onerror = (event: any) => {
            console.warn('Speech recognition error', event.error);
          };

          recognition.onend = () => {
            if (isRecordingRef.current) {
              try {
                recognition.start();
              } catch (e) {
                console.warn('Could not restart speech recognition on end:', e);
              }
            }
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (e) {
          console.warn('Failed to start speech recognition', e);
        }
      }

      isRecordingRef.current = true;
      setIsRecording(true);
    }
  };

  const handleStopRecording = () => {
    if ((mediaRecorderRef.current || audioRecorderRef.current) && isRecording) {
      if (recognitionRef.current) {
        try {
          const flushedTranscript = `${transcriptRef.current} ${interimTranscriptRef.current}`.trim();
          transcriptRef.current = flushedTranscript;
          setTranscript(flushedTranscript);
          interimTranscriptRef.current = '';
          setInterimTranscript('');

          recognitionRef.current.stop();
          recognitionRef.current = null;
        } catch (err) {
          console.warn('Speech recognition stop failed:', err);
        }
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
        audioRecorderRef.current.stop();
      }

      isRecordingRef.current = false;
      setIsRecording(false);

      // Wait a tick for chunks to populate
      setTimeout(() => {
        setRecordedChunks((currentChunks) => {
          if (isCameraOn && currentChunks.length > 0) {
            const blob = new Blob(currentChunks, { type: 'video/webm' });
            setVideoBlob(blob);
            if (videoRef.current) {
              videoRef.current.srcObject = null;
              videoRef.current.src = URL.createObjectURL(blob);
              videoRef.current.controls = true;
            }
          }
          return currentChunks;
        });
      }, 200);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      // Intentionally NOT pausing the MediaRecorders here.
      // Pausing and resuming MediaRecorder causes WebM timestamp corruption in Chromium,
      // which results in Deepgram and other audio parsers failing to extract the audio.
      // We will let the recording run continuously in the background during the transition.
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (pollyAudioRef.current) {
        pollyAudioRef.current.pause();
        pollyAudioRef.current = null;
      }
      setPollyState('idle');
      setTtsState('idle');
      setTtsHighlight(null);
      isRecordingRef.current = false;
      setIsRecording(false);
      setIsPaused(true);
      setCurrentQuestionIndex((prev) => prev + 1);
      setTimeLeft(90);
    } else {
      handleStopRecording();
    }
  };

  const handleStartOrResume = () => {
    if (isPaused) {
      // Not resuming MediaRecorders since we didn't pause them
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {}
      }
      isRecordingRef.current = true;
      setIsRecording(true);
      setIsPaused(false);
    } else {
      handleStartRecording();
    }
  };

  const handleRetake = () => {
    setVideoBlob(null);
    setAudioBlob(null);
    setRecordedChunks([]);
    transcriptRef.current = '';
    interimTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setRecognitionError(null);
    setCurrentQuestionIndex(0);
    setIsPaused(false);
    setTimeLeft(90);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (pollyAudioRef.current) {
      pollyAudioRef.current.pause();
      pollyAudioRef.current = null;
    }
    setPollyState('idle');
    setTtsState('idle');
    setTtsHighlight(null);
    startCamera(isCameraOn);
    if (videoRef.current) {
      videoRef.current.controls = false;
    }
  };

  const handleUpload = async () => {
    console.log("=== FRONTEND UPLOAD DEBUG ===");
    console.log("videoBlob:", videoBlob, videoBlob?.size);
    console.log("audioBlob:", audioBlob, audioBlob?.size);

    if (!videoBlob && !audioBlob) {
      console.warn("Both blobs are null, aborting upload");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      if (videoBlob && videoBlob.size > 0) {
        formData.append("video", videoBlob, "profile.webm");
      }
      if (audioBlob && audioBlob.size > 0) {
        formData.append("audio", audioBlob, "audio.webm");
      }

      let workerId = localStorage.getItem('candidateId');
      if (!workerId) {
        workerId = '05adbc3d-4f00-411c-9797-fdb975cab8c7'; // Test ID
      }
      formData.append("candidateId", workerId);
      formData.append("interviewLanguage", interviewLanguage);
      formData.append("transcript", transcriptRef.current);
      formData.append('generated_questions', JSON.stringify(questions));
      if (urlType === 'audio' || urlType === 'video-interview') {
        formData.append('type', urlType);
        if (urlJobId) formData.append('jobId', urlJobId);
      }

      // We'll use a manual XMLHttpRequest to track upload progress
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        xhr.open('POST', `${apiUrl}/api/upload/recording`);
        const token = localStorage.getItem('candidateToken');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.responseText);
          } else {
            let errorMessage = `Upload failed with status ${xhr.status}`;
            try {
              const res = JSON.parse(xhr.responseText);
              if (res.error) errorMessage = res.error;
            } catch (e) { }
            reject(new Error(errorMessage));
          }
        };

        xhr.onerror = () => reject(new Error('Network error while uploading video.'));
        xhr.send(formData);
      });

      // Navigate to the Success page
      router.push(`/candidate/success`);
    } catch (error: any) {
      alert(error.message || 'Error uploading video.');
      console.error(error);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const toggleTTS = () => {
    if (!('speechSynthesis' in window)) return;
    
    if (ttsState === 'idle') {
      window.speechSynthesis.cancel();
      const text = questions[currentQuestionIndex];
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = interviewLanguage;
      
      utterance.onstart = () => setTtsState('playing');
      utterance.onend = () => {
        setTtsState('idle');
        setTtsHighlight(null);
      };
      utterance.onerror = () => {
        setTtsState('idle');
        setTtsHighlight(null);
      };
      utterance.onpause = () => setTtsState('paused');
      utterance.onresume = () => setTtsState('playing');
      utterance.onboundary = (e) => {
        if (e.name === 'word') {
          setTtsHighlight({ charIndex: e.charIndex, charLength: e.charLength });
        }
      };
      
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } else if (ttsState === 'playing') {
      window.speechSynthesis.pause();
    } else if (ttsState === 'paused') {
      window.speechSynthesis.resume();
    }
  };

  const togglePollyTTS = async () => {
    if (pollyState === 'playing') {
      pollyAudioRef.current?.pause();
      setPollyState('paused');
      return;
    }
    if (pollyState === 'paused') {
      pollyAudioRef.current?.play();
      setPollyState('playing');
      return;
    }
    
    setPollyState('loading');
    try {
      const text = questions[currentQuestionIndex];
      const token = localStorage.getItem('candidateToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/tts/synthesize`, {
        method: 'POST',
        headers: {
        'x-environment': typeof window !== 'undefined' ? (window.location.hostname.includes('staging') ? 'staging' : (window.location.hostname.includes('worker.dataalchemy.ai') ? 'production' : 'daily-interview')) : 'daily-interview',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text, language: interviewLanguage })
      });
      const data = await res.json();
      if (data.audioBase64) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`);
        audio.onended = () => setPollyState('idle');
        audio.onerror = () => setPollyState('idle');
        audio.play();
        pollyAudioRef.current = audio;
        setPollyState('playing');
      } else {
        console.error('No audio returned', data);
        setPollyState('idle');
      }
    } catch (err) {
      console.error('Error fetching Polly audio:', err);
      setPollyState('idle');
    }
  };

  const renderHighlightedQuestion = (text: string) => {
    if (ttsState === 'idle' || !ttsHighlight) {
      return <span className="font-medium text-foreground text-base whitespace-pre-wrap">{text}</span>;
    }
    const { charIndex, charLength } = ttsHighlight;
    const before = text.substring(0, charIndex);
    const highlighted = text.substring(charIndex, charIndex + charLength);
    const after = text.substring(charIndex + charLength);
    
    return (
      <span className="font-medium text-foreground text-base whitespace-pre-wrap">
        {before}
        <span className="bg-primary/30 text-primary px-1 rounded-sm">{highlighted}</span>
        {after}
      </span>
    );
  };

  const [agreedToRules, setAgreedToRules] = useState(false);

  if (step === 'rules') {
    return (
      <div className="w-full max-w-2xl mx-auto mt-4 animate-in fade-in zoom-in duration-300">
        <Card className="p-5 shadow-sm">
          <h2 className="text-xl font-medium mb-3">Interview Rules & Setup</h2>
          <div className="space-y-3 text-muted-foreground mb-4 text-sm">
            <p>{isAudioAssessment ? "Welcome to your audio assessment! Here is how the process works:" : "Welcome to your video profile recording! Here is how the process works:"}</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>{isAudioAssessment ? "You will be asked up to 3 personalized questions based on the job description." : "You will be asked up to 3 personalized questions based on your resume."}</li>
              <li>You will have 1 minute and 30 seconds to answer each question.</li>
              <li>The questions will appear one by one. You control when to start recording each question.</li>
              <li>Please ensure you are in a quiet environment{isAudioAssessment ? "." : " with good lighting."}</li>
            </ul>
            
            <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border">
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={agreedToRules}
                  onChange={(e) => setAgreedToRules(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-foreground">
                  Okay, I have understood the rules and I'm ready to proceed.
                </span>
              </label>
            </div>

            <p className="mt-3 text-sm font-medium text-foreground">
              To proceed, we need access to your {isAudioAssessment ? "microphone" : "camera and microphone"}.
            </p>
          </div>
          <button
            onClick={() => {
              setStep('recording');
              startCamera(isCameraOn);
            }}
            disabled={!agreedToRules}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Grant Permissions & Continue
          </button>
        </Card>
      </div>
    );
  }

  if (hasPermission === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <AlertCircle size={48} className="text-destructive mb-4" />
        <h3 className="text-xl font-medium mb-2">Camera & Microphone Access Denied</h3>
        <p className="text-sm text-muted-foreground">Please allow access to record your introduction.</p>
      </div>
    );
  }

  if (isUploading) {
    return (
      <div className="w-full max-w-md mx-auto mt-12 animate-in fade-in zoom-in duration-300">
        <div className="bg-background border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Loader2 className="animate-spin h-5 w-5 text-primary" /> Processing Profile
          </h3>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Uploading {isCameraOn ? 'video' : 'audio'}</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full overflow-hidden h-2">
              <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>

            <p className="text-xs text-muted-foreground pt-4 text-center border-t border-border mt-4">
              Estimated time: 1-2 minutes
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-5">
        <h2 className="text-2xl font-normal mb-1.5">Record Introduction</h2>
        <p className="text-sm text-muted-foreground">Answer the questions presented. You have 1:30 for each.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 w-full items-stretch">
        {/* Main Recording Interface */}
        <div className="flex-1 w-full lg:w-1/2 flex flex-col">
          <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-border shadow-sm flex items-center justify-center">
            {isAudioOnly ? (
              <div className="flex flex-col items-center justify-center text-muted-foreground w-full h-full bg-background p-6 text-center">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center bg-muted border-4 ${isRecording ? 'border-primary animate-pulse' : 'border-transparent'} mb-4 transition-all duration-300`}>
                  <Mic className={`w-12 h-12 ${isRecording ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                {isRecording ? (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <p className="text-sm font-medium text-primary mb-2">Listening... Start speaking</p>
                    <div className="h-10 mt-2 flex items-center justify-center max-w-sm mx-auto overflow-hidden">
                      <p className="text-xs italic text-muted-foreground">
                        {interimTranscript || transcript || "Waiting for audio signal..."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium">Audio Recording Mode</p>
                    <p className="text-xs text-muted-foreground mt-2">Camera is disabled for this requirement.</p>
                  </>
                )}
              </div>
            ) : !isCameraOn ? (
              <div className="flex flex-col items-center justify-center text-muted-foreground w-full h-full bg-background">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center bg-muted border-4 ${isRecording ? 'border-red-500 animate-pulse' : 'border-transparent'} mb-4 transition-all duration-300`}>
                  <Camera size={32} className={isRecording ? 'text-red-500' : 'text-muted-foreground'} />
                </div>
                <p className="font-medium">Audio Only</p>
                {audioBlob && !isRecording && (
                  <audio src={URL.createObjectURL(audioBlob)} controls className="mt-6 w-3/4" />
                )}
              </div>
            ) : (
              <div className="relative w-full h-full">
                <video
                  ref={videoRef}
                  autoPlay
                  muted={!videoBlob}
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ transform: !videoBlob ? 'scaleX(-1)' : undefined }}
                />
                {!isAudioOnly && isRecording && (interimTranscript || transcript) && (
                  <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm p-3 rounded-lg border border-white/10 text-center shadow-lg animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-sm text-white/90">
                      {interimTranscript || (transcript.length > 50 ? '...' + transcript.slice(-50) : transcript)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {isRecording && (
              <div className="absolute top-4 right-4 bg-background/80 backdrop-blur px-3 py-1.5 rounded-md flex items-center gap-2 border border-red-500/30">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="font-mono text-sm font-medium">{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-between mt-2 bg-card p-4 rounded-xl border border-border shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground px-2 py-1 bg-muted rounded-md border border-border">
                {isAudioOnly ? "Audio Required" : "Video & Audio Required"}
              </span>
            </div>

            <div className="flex gap-3">
              {(!videoBlob && !audioBlob) ? (
                isRecording ? (
                  <button
                    onClick={handleNextQuestion}
                    className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-6 py-2.5 rounded-md transition-colors flex items-center gap-2"
                  >
                    <StopCircle size={18} /> {currentQuestionIndex < questions.length - 1 ? "Next Question" : "Finish Recording"}
                  </button>
                ) : (
                  <>
                    {isPaused && (
                      <>
                        <button
                          onClick={() => {
                            if (window.confirm("This will restart the entire interview from Question 1. Are you sure you want to retake?")) {
                              handleRetake();
                            }
                          }}
                          className="border border-border hover:bg-muted text-foreground text-sm font-medium px-6 py-2.5 rounded-md transition-colors"
                        >
                          Retake
                        </button>
                        {!isAudioOnly && transcript && (
                          <button
                            onClick={() => setShowTranscriptModal(true)}
                            className="border border-primary text-primary hover:bg-primary/5 text-sm font-medium px-4 py-2.5 rounded-md transition-colors flex items-center gap-2"
                          >
                            <FileText size={18} /> Review Transcription
                          </button>
                        )}
                      </>
                    )}
                    <button
                      onClick={handleStartOrResume}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-6 py-2.5 rounded-md transition-colors flex items-center gap-2"
                    >
                      {isAudioOnly ? <Mic size={18} /> : <Camera size={18} />} {isPaused ? "Record Next Question" : "Start Recording"}
                    </button>
                  </>
                )
              ) : (
                <>
                  <button
                    onClick={handleRetake}
                    disabled={isUploading}
                    className="border border-border hover:bg-muted text-foreground text-sm font-medium px-6 py-2.5 rounded-md transition-colors disabled:opacity-50"
                  >
                    Retake
                  </button>
                  {!isAudioOnly && transcript && (
                    <button
                      onClick={() => setShowTranscriptModal(true)}
                      disabled={isUploading}
                      className="border border-primary text-primary hover:bg-primary/5 text-sm font-medium px-4 py-2.5 rounded-md transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      <FileText size={18} /> Review Transcription
                    </button>
                  )}
                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-6 py-2.5 rounded-md transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    Continue
                  </button>
                </>
              )}
            </div>

            <div className="w-10 hidden sm:block"></div>
          </div>
        </div>

        {/* Right Sidebar - Language & Talking Points */}
        <div className="flex-1 w-full lg:w-1/2 flex flex-col gap-6">


          <Card className="w-full p-6 shadow-sm border border-border flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-foreground">Talking Points</h3>
              {questions.length > 0 && !videoBlob && !audioBlob && (
                <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                  Question {currentQuestionIndex + 1} out of {questions.length}
                </span>
              )}
            </div>
          <ul className="space-y-4 text-sm text-muted-foreground flex-1 overflow-y-auto pr-2">
            {isLoadingQuestions ? (
              <li className="flex items-center gap-3">
                <Loader2 className="animate-spin w-4 h-4 text-primary" />
                Generating personalized questions...
              </li>
            ) : questions.length > 0 ? (
                <li className="flex items-start gap-3 leading-relaxed">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 text-xs font-medium">{currentQuestionIndex + 1}</span>
                  <div className="flex-1 flex flex-col items-start">
                    {renderHighlightedQuestion(questions[currentQuestionIndex])}
                    {urlType === 'video-interview' && (
                      <div className="mt-3 flex flex-wrap gap-3">
                        <button 
                          onClick={togglePollyTTS}
                          disabled={pollyState === 'loading'}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors text-xs font-medium border border-primary/20 disabled:opacity-50"
                          title={pollyState === 'playing' ? "Pause" : "Listen to question"}
                        >
                          {pollyState === 'loading' ? <Loader2 size={14} className="animate-spin" /> : (pollyState === 'playing' ? <Pause size={14} /> : (pollyState === 'paused' ? <Play size={14} /> : <Volume2 size={14} />))} 
                          {pollyState === 'loading' ? "Loading..." : (pollyState === 'playing' ? "Pause" : (pollyState === 'paused' ? "Resume" : "Listen to question"))}
                        </button>
                      </div>
                    )}
                  </div>
                </li>
            ) : (
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-xs font-medium">!</span>
                <span>Failed to load questions. Please introduce yourself and your background.</span>
              </li>
            )}
          </ul>
        </Card>
        </div>
      </div>
      
      {showTranscriptModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background border border-border shadow-lg rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-medium">Your Recorded Answer</h3>
              <button onClick={() => setShowTranscriptModal(false)} className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {transcript ? (
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{transcript}</p>
              ) : (
                <p className="text-sm italic text-muted-foreground text-center py-8">No transcript captured. Ensure your microphone was picking up your voice clearly.</p>
              )}
            </div>
            <div className="p-4 border-t border-border flex justify-end bg-muted/30 rounded-b-xl">
              <button onClick={() => setShowTranscriptModal(false)} className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-6 py-2.5 rounded-md transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
