'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, AlertTriangle, Calendar, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Accordion } from '@/components/ui/Accordion';
import { Badge } from '@/components/ui/Badge';

export default function SessionReportClient({ type }: { type: 'video' | 'audio' | 'video-interview' }) {
  const [data, setData] = useState<{ assessment: any, candidate: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEnglishTranscript, setShowEnglishTranscript] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    const sessionId = searchParams?.get('sessionId');
    if (!sessionId) {
      setError('No session ID provided in the URL.');
      setLoading(false);
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    // Extract token from URL first, then fallback to localStorage
    const urlToken = searchParams?.get('token');
    const token = urlToken || localStorage.getItem('clientToken') || localStorage.getItem('candidateToken') || '';
    
    fetch(`${apiUrl}/api/assessments/${type}/${sessionId}`, {
      headers: {
        'x-environment': typeof window !== 'undefined' ? (window.location.hostname.includes('staging') ? 'staging' : (window.location.hostname.includes('worker.dataalchemy.ai') ? 'production' : 'daily-interview')) : 'daily-interview',
        'Authorization': `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success) {
          setData({ assessment: resData.assessment, candidate: resData.candidate });
        } else {
          setError(resData.error || 'Failed to load report.');
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Unable to load report.');
      })
      .finally(() => setLoading(false));
  }, [searchParams, type]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">Loading Session Report...</p>
        </div>
      </main>
    );
  }

  if (error || !data || !data.assessment) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-8">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertTriangle size={32} className="text-destructive mx-auto mb-4" />
          <h1 className="text-lg font-medium mb-2">Report unavailable</h1>
          <p className="text-sm text-muted-foreground">{error || 'Session not found'}</p>
        </Card>
      </main>
    );
  }

  let { assessment: a, candidate: c } = data;

  if (type === 'video-interview' && a?.ai_analysis) {
    let ai = a.ai_analysis;
    if (typeof ai === 'string') {
      try { ai = JSON.parse(ai); } catch(e){}
    }
    a = {
      ...a,
      overall_score: Math.round(Number(ai.overall)) || 0,
      communication_score: Math.round(Number(ai.communication)) || 0,
      confidence_score: Math.round(Number(ai.confidence)) || 0,
      technical_score: Math.round(Number(ai.technical)) || 0,
      grammar_score: Math.round(Number(ai.grammar)) || 0,
      fluency_score: Math.round(Number(ai.fluency)) || 0,
      professionalism_score: Math.round(Number(ai.professionalism)) || 0,
      strengths: Array.isArray(ai.strengths) ? ai.strengths.map(String) : [],
      weaknesses: Array.isArray(ai.weaknesses) ? ai.weaknesses.map(String) : [],
      summary: JSON.stringify({
        text: String(ai.summary || ''),
        lingual_exercises: ai.lingual_exercises || [],
        detailed_explanations: ai.explanations || {}
      }),
      status: 'Completed',
      recommendation: String(ai.recommendation || '')
    };
  }

  const fullName = c ? [c.firstName, c.lastName].filter(Boolean).join(' ') : 'Unknown Candidate';
  const isVideo = type === 'video' || type === 'video-interview';
  
  let summaryText = a.summary;
  let lingualExercises: any[] | null = null;
  let detailedExplanations: any = {};
  
  try {
    const parsed = JSON.parse(a.summary);
    if (parsed.text) summaryText = parsed.text;
    if (parsed.lingual_exercises) lingualExercises = parsed.lingual_exercises;
    if (parsed.detailed_explanations) detailedExplanations = parsed.detailed_explanations;
  } catch(e) {}

  let orig = a.transcript || '';
  let eng = a.english_transcript || orig;
  if (orig.includes('---EN_TRANS---')) {
    const parts = orig.split('---EN_TRANS---');
    orig = parts[0].trim();
    eng = parts[1].trim();
  }

  const transcriptToShow = showEnglishTranscript ? eng : orig;
  const showLanguageToggle = orig !== eng && orig.length > 0;

  return (
    <main className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header Card */}
        <Card className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-xl font-medium mb-1">{fullName}</h1>
            <h2 className="text-sm text-muted-foreground mb-4">
              {isVideo ? 'Video Assessment Session' : `Audio Assessment Session`}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <Badge variant={a.status === 'Completed' || a.overall_score ? 'default' : 'secondary'}>
                {(a.status === 'Completed' || a.overall_score) ? (isVideo ? 'Video Completed' : 'Audio Completed') : 'Pending'}
              </Badge>
              <div className="flex items-center gap-1">
                <Calendar size={14} /> 
                {a.created_at ? new Date(a.created_at).toLocaleDateString() : new Date().toLocaleDateString()}
              </div>
              {(a.video_url || a.audio_url) && (
                <div className="flex items-center gap-1"><Clock size={14} /> Recorded</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 text-right">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Overall Score</p>
              <div className="text-2xl font-medium text-primary">{a.overall_score || 0}/10</div>
            </div>
          </div>
        </Card>

        {/* Media Playback */}
        <Card className="p-6">
          {(a.video_url || a.audio_url) && (
            <Accordion title={isVideo ? "Video Presentation" : "Audio Assessment"} defaultOpen={true}>
              {isVideo ? (
                <div className="aspect-video bg-black rounded-lg overflow-hidden border border-border shadow-sm max-w-2xl mx-auto">
                  <video src={a.video_url} controls className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="bg-muted/30 p-8 rounded-lg border border-border shadow-sm max-w-2xl mx-auto flex items-center justify-center">
                  <audio src={a.audio_url} controls className="w-full max-w-md" />
                </div>
              )}
            </Accordion>
          )}

          {/* Transcript */}
          {transcriptToShow && (
            <div className="mt-8">
              <Accordion title="Transcript" defaultOpen={false}>
                <div className="space-y-4">
                  {showLanguageToggle && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Show English Translation</span>
                      <button
                        onClick={() => setShowEnglishTranscript(!showEnglishTranscript)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${showEnglishTranscript ? 'bg-primary' : 'bg-muted'}`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${showEnglishTranscript ? 'translate-x-5' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  )}
                  <div className="bg-muted/30 p-4 rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {transcriptToShow}
                    </p>
                  </div>
                </div>
              </Accordion>
            </div>
          )}
        </Card>

        {/* AI Analysis Summary */}
        {(summaryText || (a.strengths && a.strengths.length > 0) || (a.weaknesses && a.weaknesses.length > 0)) && (
          <Card className="p-6">
            <Accordion 
              defaultOpen={true}
              title={
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">AI</span>
                  <span className="text-lg">Performance Analysis</span>
                </div>
              }
            >
              <div className="space-y-6 mt-6">
                {summaryText && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Executive Summary</h4>
                    <p className="text-sm leading-relaxed">{summaryText}</p>
                  </div>
                )}

                {/* Detailed Scoring Metrics */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Detailed Scoring</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 bg-muted/20 p-5 rounded-xl border border-border">
                    {[
                      { label: 'Relevance to Profile', score: a.communication_score || 0, expl: detailedExplanations?.communication },
                      { label: 'Professionalism', score: a.professionalism_score || 0, expl: detailedExplanations?.professionalism },
                      { label: 'Fluency', score: a.fluency_score || 0, expl: detailedExplanations?.fluency },
                      { label: 'Grammar', score: a.grammar_score || 0, expl: detailedExplanations?.grammar },
                      { label: 'Confidence', score: a.confidence_score || 0, expl: detailedExplanations?.confidence },
                      { label: 'Technical Ability', score: a.technical_score || 0, expl: detailedExplanations?.technical }
                    ].map((metric, idx) => (
                      <div key={idx} className="flex flex-col gap-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium text-foreground">{metric.label}</span>
                          <span className="font-bold text-primary">{metric.score}/10</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 mb-1">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-1000" 
                            style={{ width: `${(metric.score / 10) * 100}%` }}
                          />
                        </div>
                        {metric.expl && (
                          <p className="text-xs text-muted-foreground italic leading-relaxed">
                            "{metric.expl}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {lingualExercises && lingualExercises.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Language Assessment Tasks</h4>
                    <div className="space-y-4">
                      {lingualExercises.map((task: any, idx: number) => (
                        <div key={idx} className="bg-muted/30 p-4 rounded-lg border border-border">
                          <div className="font-medium text-sm mb-2">{task.task}</div>
                          <div className="text-sm text-muted-foreground mb-3">
                            <span className="font-medium">Candidate Answer:</span> "{task.candidate_answer}"
                          </div>
                          <div className="flex items-start gap-4 text-sm">
                            <div className="flex-1">
                              <span className="font-medium text-green-500">Feedback:</span> {task.feedback}
                            </div>
                            <div className="font-bold text-primary">Score: {task.score}/10</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                  {a.strengths && a.strengths.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-green-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Key Strengths
                      </h4>
                      <ul className="space-y-2">
                      {a.strengths.map((strength: string, i: number) => (
                        <li key={i} className="text-sm text-muted-foreground bg-green-500/10 border border-green-500/20 p-3 rounded-md">
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {a.weaknesses && a.weaknesses.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-orange-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      Areas for Growth
                    </h4>
                    <ul className="space-y-2">
                      {a.weaknesses.map((weakness: string, i: number) => (
                        <li key={i} className="text-sm text-muted-foreground bg-orange-500/10 border border-orange-500/20 p-3 rounded-md">
                          {weakness}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {a.recommendation && (
                <div className="pt-4 border-t border-border">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Recommendation</h4>
                  <p className="text-sm leading-relaxed">{a.recommendation}</p>
                </div>
              )}
            </div>
            </Accordion>
          </Card>
        )}

      </div>
    </main>
  );
}
