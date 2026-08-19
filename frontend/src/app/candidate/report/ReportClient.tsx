'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, PlayCircle, AlertTriangle, Calendar, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Accordion } from '@/components/ui/Accordion';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';

export default function CandidateReportClient() {
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEnglishTranscript, setShowEnglishTranscript] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    const id = searchParams?.get('candidateId') || localStorage.getItem('candidateId');
    if (!id) {
      setError('No candidate session found.');
      setLoading(false);
      return;
    }

    if (!localStorage.getItem('candidateId')) {
      localStorage.setItem('candidateId', id);
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    fetch(`${apiUrl}/api/candidates/${id}/report`, {
      headers: {
        'x-environment': typeof window !== 'undefined' ? (window.location.hostname.includes('staging') ? 'staging' : (window.location.hostname.includes('worker.dataalchemy.ai') ? 'production' : 'daily-interview')) : 'daily-interview',
        'Authorization': `Bearer ${localStorage.getItem('candidateToken')}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCandidate(data.candidate);
        } else {
          setError(data.error || 'Failed to load report.');
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Unable to load report.');
      })
      .finally(() => setLoading(false));
  }, [searchParams]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">Loading AI Profile Report...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-8">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertTriangle size={32} className="text-destructive mx-auto mb-4" />
          <h1 className="text-lg font-medium mb-2">Report unavailable</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </Card>
      </main>
    );
  }

  const fullName = [candidate.firstName, candidate.lastName].filter(Boolean).join(' ') || 'Candidate';
  const assessments = candidate.assessments || [];
  const defaultTab = assessments.length > 0 ? assessments[0].id : 'none';

  return (
    <main className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {assessments.length > 0 ? (
          <Tabs defaultValue={defaultTab} className="w-full">
            {assessments.length > 1 && (
              <TabsList className="mb-6 border-b border-border">
                {assessments.map((a: any) => (
                  <TabsTrigger key={a.id} value={a.id} className="pb-2">
                    {a.type === 'video' ? 'Video Profile' : (a.jobTitle ? `Audio Assessment (${a.jobTitle})` : (a.jobId ? `Audio Assessment (${a.jobId})` : 'Audio Assessment'))}
                  </TabsTrigger>
                ))}
              </TabsList>
            )}
            
            {assessments.map((a: any) => {
              let summaryText = a.summary;
              let lingualExercises: any[] | null = null;
              if (a.type === 'audio') {
                try {
                  const parsed = JSON.parse(a.summary);
                  if (parsed.text) summaryText = parsed.text;
                  if (parsed.lingual_exercises) lingualExercises = parsed.lingual_exercises;
                } catch(e) {}
              }
              
              return (
              <TabsContent key={a.id} value={a.id} className="space-y-6">
                
                {/* Header Card */}
                <Card className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h1 className="text-xl font-medium mb-1">{fullName}</h1>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <Badge variant={a.status === 'Completed' ? 'default' : 'secondary'}>
                        {a.status === 'Completed' ? (a.type === 'video' ? 'Video Completed' : 'Audio Completed') : 'Pending'}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Calendar size={14} /> 
                        {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}
                      </div>
                      {(a.videoUrl || a.audioUrl) && (
                        <div className="flex items-center gap-1"><Clock size={14} /> 2m 34s</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Overall Score</p>
                      <div className="text-2xl font-medium text-primary">{a.overallScore || 0}/10</div>
                    </div>
                  </div>
                </Card>

                {/* Body Card */}
                <Card className="p-6">
                  {/* Media Playback */}
                  {(a.videoUrl || a.audioUrl) && (
                    <Accordion title={a.type === 'video' ? "Video Presentation" : "Audio Assessment"} defaultOpen={true}>
                      {a.type === 'video' ? (
                        <div className="aspect-video bg-black rounded-lg overflow-hidden border border-border shadow-sm max-w-2xl mx-auto">
                          <video src={a.videoUrl} controls className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="bg-muted/30 p-8 rounded-lg border border-border shadow-sm max-w-2xl mx-auto flex items-center justify-center">
                          <audio src={a.audioUrl} controls className="w-full max-w-md" />
                        </div>
                      )}
                    </Accordion>
                  )}

                  {/* Transcript */}
                  <Accordion title="Transcript" defaultOpen={true}>
                    <div className="space-y-3">
                      {a.englishTranscript && (
                        <div className="flex justify-end items-center gap-2 text-xs">
                          <span className={showEnglishTranscript ? "text-muted-foreground" : "font-medium text-foreground"}>Original</span>
                          <button 
                            onClick={() => setShowEnglishTranscript(!showEnglishTranscript)}
                            className="relative inline-flex h-5 w-10 items-center rounded-full bg-primary/20 transition-colors focus:outline-none"
                          >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-primary transition-transform ${showEnglishTranscript ? 'translate-x-5' : 'translate-x-1.5'}`} />
                          </button>
                          <span className={showEnglishTranscript ? "font-medium text-foreground" : "text-muted-foreground"}>English</span>
                        </div>
                      )}
                      <div className="max-h-[400px] overflow-y-auto rounded-lg border border-border bg-muted/50 p-4 text-sm text-foreground whitespace-pre-line leading-relaxed">
                        {(showEnglishTranscript && a.englishTranscript) ? a.englishTranscript : (a.transcript || 'Transcript not available.')}
                      </div>
                    </div>
                  </Accordion>

                  {/* Profile Analysis */}
                  <Accordion title="Profile Analysis">
                    <div className="space-y-4 pt-2">
                      {[
                        { label: 'Relevance to Profile', score: a.communicationScore, text: a.scoreExplanations?.communication },
                        { label: 'Fluency', score: a.fluencyScore, text: a.scoreExplanations?.fluency },
                        { label: 'Confidence', score: a.confidenceScore, text: a.scoreExplanations?.confidence },
                        { label: 'Grammar', score: a.grammarScore, text: a.scoreExplanations?.grammar },
                        { label: 'Professional Tone', score: a.professionalismScore, text: a.scoreExplanations?.professionalism },
                      ].map((metric) => (
                        <div key={metric.label} className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 py-3 border-b border-border last:border-0">
                          <div className="flex justify-between items-center md:block">
                            <span className="text-sm font-medium">{metric.label}</span>
                            <Badge variant="outline" className="md:mt-2">{metric.score}/10</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {metric.text || 'No specific insights recorded for this metric.'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Accordion>

                  {/* Lingual Exercises (if available) */}
                  {lingualExercises && lingualExercises.length > 0 && (
                    <Accordion title="Language & Speaking Exercises" defaultOpen={true}>
                      <div className="space-y-6 pt-2">
                        {lingualExercises.map((ex, idx) => (
                          <div key={idx} className="border border-border rounded-lg p-4 bg-muted/20">
                            <h4 className="text-sm font-semibold text-primary mb-2 whitespace-pre-wrap">{ex.question}</h4>
                            <div className="text-sm text-foreground mb-3 pl-4 border-l-2 border-primary/30">
                              <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Candidate Answer:</span>
                              "{ex.answer}"
                            </div>
                            <div className="text-sm text-muted-foreground bg-background rounded p-3 border border-border">
                              <span className="font-medium text-foreground block mb-1">Evaluation:</span>
                              {ex.evaluation}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Accordion>
                  )}

                  {/* Recommendations */}
                  <Accordion title="Suggestions & Recommendations" defaultOpen={true}>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Strengths</h4>
                        <ul className="space-y-2">
                          {(a.strengths?.length ? a.strengths : ['No distinct strengths detected.']).map((s: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary mt-1">•</span> {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Areas to Improve</h4>
                        <ul className="space-y-2">
                          {(a.weaknesses?.length ? a.weaknesses : ['No improvement areas detected.']).map((w: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary mt-1">•</span> {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="mt-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <h4 className="text-sm font-medium text-primary mb-2">Hiring Recommendation</h4>
                      <p className="text-sm text-foreground/80">{a.recommendation || 'No recommendation available.'}</p>
                    </div>
                  </Accordion>
                </Card>

              </TabsContent>
              );
            })}
          </Tabs>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            No assessments available.
          </div>
        )}

      </div>
    </main>
  );
}
