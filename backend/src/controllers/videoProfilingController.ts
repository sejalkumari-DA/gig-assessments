import { Request, Response } from 'express';
import { getSupabaseClient } from '../utils/supabase';
import { 
  transcribeWithDeepgram, 
  callBedrock, 
  translateTranscriptToEnglish, 
  createHeuristicAnalysis,
  skipAI,
  bedrockClient,
  deepgramApiKey
} from '../index';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

export const handleVideoProfilingUpload = async (req: Request, res: Response) => {
  try {
    const candidateId = req.body.candidateId;
    const browserTranscript = req.body.transcript || '';
    const interviewLanguage = req.body.interviewLanguage || 'en-US';

    let generatedQuestions: any[] = [];
    if (req.body.generated_questions) {
      try {
        generatedQuestions = JSON.parse(req.body.generated_questions);
      } catch (e) {
        console.warn('Failed to parse generated_questions', e);
      }
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const videoFile = files?.video?.[0];
    const audioFile = files?.audio?.[0];

    if (!candidateId || (!videoFile && !audioFile)) {
      return res.status(400).json({ success: false, error: 'Missing candidateId, video, or audio file' });
    }

    const env = req.headers['x-environment'] as string;
    const dbClient = getSupabaseClient(env);

    // Verify worker exists, if not, auto-create it for testing purposes
    const { data: existing, error: existError } = await dbClient
      .from('workers')
      .select('id')
      .eq('id', candidateId)
      .single();

    if (existError || !existing) {
      console.log('Worker not found, auto-creating for test ID:', candidateId);
      const { error: insertWorkerError } = await dbClient
        .from('workers')
        .insert({
          id: candidateId,
          first_name: 'Test',
          last_name: 'User',
          email: `test-${Date.now()}@example.com`
        });

      if (insertWorkerError) {
        console.error('Failed to auto-create worker:', insertWorkerError);
      }
    }

    let videoUrl = null;
    let audioUrl = null;

    if (videoFile) {
      const videoFileName = `${Date.now()}-candidate-${candidateId}.webm`;
      const { error: videoUploadError } = await dbClient.storage
        .from('video-profiles')
        .upload(videoFileName, videoFile.buffer, {
          contentType: 'video/webm',
          upsert: true,
        });
      if (videoUploadError) throw videoUploadError;
      const { data: videoData } = dbClient.storage.from('video-profiles').getPublicUrl(videoFileName);
      videoUrl = videoData.publicUrl;
    }

    if (audioFile) {
      const audioFileName = `${Date.now()}-candidate-${candidateId}-audio.webm`;
      const { error: audioUploadError } = await dbClient.storage
        .from('audio-profiles')
        .upload(audioFileName, audioFile.buffer, {
          contentType: 'audio/webm',
          upsert: true,
        });
      if (audioUploadError) throw audioUploadError;
      const { data: audioData } = dbClient.storage.from('audio-profiles').getPublicUrl(audioFileName);
      audioUrl = audioData.publicUrl;
    }

    const targetBuffer = audioFile ? audioFile.buffer : videoFile?.buffer;
    if (!targetBuffer) {
      throw new Error('No media buffer available for processing');
    }

    // Transcribe audio/video securely using Deepgram when available, with browser transcript fallback.
    const tmpDir = os.tmpdir();
    const tmpPath = path.join(tmpDir, `${Date.now()}-candidate-${candidateId}-media.webm`);
    await fs.promises.writeFile(tmpPath, targetBuffer);

    let normalizedInterviewLanguage = (interviewLanguage || 'en-US').trim() || 'en-US';
    let transcript = browserTranscript;
    let transcriptionError: string | null = null;

    if (!skipAI && deepgramApiKey) {
      try {
        const langCode = normalizedInterviewLanguage ? normalizedInterviewLanguage.substring(0, 2) : 'auto';
        const deepgramResult = await transcribeWithDeepgram(targetBuffer, langCode);
        if (deepgramResult.transcript) {
          transcript = deepgramResult.transcript;
          if (deepgramResult.detectedLanguage && langCode === 'auto') {
            normalizedInterviewLanguage = deepgramResult.detectedLanguage;
          }
        } else if (!browserTranscript) {
          transcript = 'Deepgram returned an empty transcript.';
        }
      } catch (tErr: any) {
        transcriptionError = tErr?.message || String(tErr);
        console.error('Deepgram transcription failed:', transcriptionError);
        transcript = browserTranscript || transcriptionError || 'Transcription failed due to a Deepgram error.';
      }
    } else {
      transcriptionError = 'Deepgram transcription skipped in development mode.';
      transcript = browserTranscript || 'Deepgram transcription skipped in development mode. Provide browser transcript or enable Deepgram.';
    }

    const englishTranscript = await translateTranscriptToEnglish(transcript, normalizedInterviewLanguage);

    // cleanup temp file
    try {
      await fs.promises.unlink(tmpPath);
    } catch (e) {
      console.warn('Failed to remove temp file', tmpPath);
    }

    // Generate AI analysis from transcript (if available)
    let analysis: any = {
      communication: 0,
      confidence: 0,
      technical: 0,
      grammar: 0,
      fluency: 0,
      professionalism: 0,
      overall: 0,
      strengths: [],
      weaknesses: [],
      summary: '',
      recommendation: '',
    };
    let analysisError: string | null = null;

    if (skipAI || !bedrockClient) {
      analysis = createHeuristicAnalysis(transcript);
      analysisError = 'AI analysis skipped in development mode. Heuristic analysis generated from transcript.';
    } else if (transcript) {
      const analysisPrompt = `You are an expert technical recruiter analyzing a candidate's self-recorded introduction transcript. Return only valid JSON with the following keys: communication, confidence, technical, grammar, fluency, professionalism, overall, strengths, weaknesses, summary, recommendation. 

Scores should be integers from 1 to 10 (overall can be a decimal). 
strengths and weaknesses should be arrays of 2-3 short, specific statements that directly reference what the candidate said (e.g. "Clearly explained their work on X", "Hesitated when discussing Y"). Do not use generic statements.
summary should be a 2-3 sentence paragraph providing a realistic, constructive evaluation of their introduction, mentioning specific details from their transcript.
recommendation should be a short, direct hiring recommendation based on the transcript.

Important evaluation rules:
- Base the feedback strictly on actual transcript evidence. If they mention specific skills, projects, or outcomes, include those in the insights.
- If the transcript is extremely short, vague, or lacks role-relevant content, strongly lower the scores and explicitly mention the lack of detail in the weaknesses and summary.
- Never infer strong technical or professionalism skills from generic filler text or a very short introductory sentence.

Transcript:
"""
\${transcript}
"""

Only return the JSON object.`;

      try {
        const rawOutput = await callBedrock(analysisPrompt, true);
        const jsonMatch = rawOutput.match(/\\{[\\s\\S]*\\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            const extractValue = (obj: any, keyword: string): any => {
              if (!obj || typeof obj !== 'object') return null;
              for (const [k, v] of Object.entries(obj)) {
                if (k.toLowerCase().includes(keyword)) return v;
                if (typeof v === 'object') {
                  const nested = extractValue(v, keyword);
                  if (nested !== null) return nested;
                }
              }
              return null;
            };

            const getNum = (key: string) => {
              const val = extractValue(parsed, key);
              if (val === null) return 0;
              const num = parseFloat(String(val).replace(/[^0-9.]/g, ''));
              return isNaN(num) ? 0 : num;
            };

            analysis = {
              communication: getNum('communication'),
              confidence: getNum('confidence'),
              technical: getNum('technical'),
              grammar: getNum('grammar'),
              fluency: getNum('fluency'),
              professionalism: getNum('professionalism'),
              overall: getNum('overall'),
              strengths: extractValue(parsed, 'strength') || [],
              weaknesses: extractValue(parsed, 'weakness') || [],
              summary: extractValue(parsed, 'summary') || '',
              recommendation: extractValue(parsed, 'recommendation') || '',
            };
          } catch (parsingError) {
            analysisError = 'AI analysis JSON parse failed';
            console.warn('AI analysis JSON parse failed, falling back to heuristic analysis.', parsingError);
            analysis = createHeuristicAnalysis(transcript);
          }
        } else {
          analysisError = 'AI analysis did not return JSON';
          analysis = createHeuristicAnalysis(transcript);
        }
      } catch (aErr: any) {
        analysisError = aErr?.message || String(aErr);
        console.error('Analysis generation failed:', analysisError);
        analysis = createHeuristicAnalysis(transcript);
      }
    } else {
      analysisError = transcriptionError || 'No transcript available to analyze.';
      analysis = createHeuristicAnalysis(transcript);
    }

    const combinedTranscript = englishTranscript !== transcript
      ? `\${transcript}\\n\\n---EN_TRANS---\\n\\n\${englishTranscript}`
      : transcript;

    const { error: insertError } = await dbClient
      .from('video_profile_interviews')
      .insert({
        worker_id: candidateId,
        video_url: videoUrl,
        audio_url: audioUrl,
        transcript: combinedTranscript,
        communication_score: Number(analysis.communication) || 0,
        confidence_score: Number(analysis.confidence) || 0,
        technical_score: Number(analysis.technical) || 0,
        grammar_score: Number(analysis.grammar) || 0,
        fluency_score: Number(analysis.fluency) || 0,
        professionalism_score: Number(analysis.professionalism) || 0,
        overall_score: Number(analysis.overall) || 0,
        strengths: Array.isArray(analysis.strengths) ? analysis.strengths.map(String) : [],
        weaknesses: Array.isArray(analysis.weaknesses) ? analysis.weaknesses.map(String) : [],
        summary: String(analysis.summary || ''),
        recommendation: String(analysis.recommendation || ''),
        status: 'Completed',
        english_transcript: englishTranscript !== transcript ? englishTranscript : null,
        generated_questions: generatedQuestions.length > 0 ? generatedQuestions : null,
      });

    if (insertError) {
      console.warn('Full video profile insert failed, attempting dummy db fallback:', insertError.message);
    }

    // Return partial results and any AI errors so frontend can surface them
    res.json({
      success: true,
      videoUrl,
      transcript,
      englishTranscript,
      interviewLanguage: normalizedInterviewLanguage,
      analysis,
      transcriptionError,
      analysisError,
    });
  } catch (error: any) {
    console.error('Error uploading video:', error.message);
    try {
      require('fs').appendFileSync('upload_errors.log', new Date().toISOString() + ' - ' + (error.stack || error.message) + '\\n');
    } catch (e) { }
    res.status(500).json({ success: false, error: 'Failed to upload video', details: error.message });
  }
};
