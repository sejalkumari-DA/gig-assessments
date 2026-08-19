
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PlayCircle, FileText, Trash2 } from 'lucide-react';
import VideoPlayer from './VideoPlayer';

export default function CandidateTable({
  candidates,
  onDelete,
}: {
  candidates: any[];
  onDelete?: (candidateId: string) => Promise<void>;
}) {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!candidates || candidates.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-sm">
        <UsersIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-medium text-foreground mb-2">No Candidates Yet</h3>
        <p className="text-muted-foreground">When candidates submit their profiles, they will appear here.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider border-b border-border">
              <th className="px-6 py-4 font-medium">Candidate</th>
              <th className="px-6 py-4 font-medium text-center">Resume</th>
              <th className="px-6 py-4 font-medium text-center">Status</th>
              <th className="px-6 py-4 font-medium text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {candidates.map((candidate) => (
              <tr key={candidate.id} className="hover:bg-muted/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                      {candidate.firstName?.[0]}{candidate.lastName?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{candidate.firstName} {candidate.lastName}</p>
                      <p className="text-xs text-muted-foreground">{candidate.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  {candidate.resumeUrl ? (
                    <a
                      href={candidate.resumeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center p-2 rounded-lg bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      title="View Resume"
                    >
                      <FileText size={18} />
                    </a>
                  ) : (
                    <span className="text-muted-foreground/60 text-xs">No Resume</span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${candidate.status === 'Completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                    }`}>
                    {candidate.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  {(candidate.videoUrl || candidate.audioUrl) ? (
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {candidate.videoUrl && (
                        <button
                          onClick={() => setSelectedVideo(candidate.videoUrl)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-colors text-sm font-medium border border-blue-500/20 hover:border-transparent"
                        >
                          <PlayCircle size={16} /> Watch
                        </button>
                      )}
                      {candidate.audioUrl && !candidate.videoUrl && (
                        <button
                          onClick={() => setSelectedVideo(candidate.audioUrl)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600/10 text-green-400 hover:bg-green-600 hover:text-white rounded-lg transition-colors text-sm font-medium border border-green-500/20 hover:border-transparent"
                        >
                          <PlayCircle size={16} /> Listen
                        </button>
                      )}
                      <Link
                        href={`/candidate/report?candidateId=${candidate.id}`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted text-foreground/80 hover:bg-muted/80 hover:text-foreground rounded-lg transition-colors text-sm font-medium border border-border"
                      >
                        View Report
                      </Link>
                      <button
                        onClick={async () => {
                          if (!onDelete) return;
                          if (!window.confirm(`Delete candidate ${candidate.firstName} ${candidate.lastName}?`)) {
                            return;
                          }
                          setDeletingId(candidate.id);
                          try {
                            await onDelete(candidate.id);
                          } finally {
                            setDeletingId(null);
                          }
                        }}
                        disabled={deletingId === candidate.id}
                        title="Delete candidate"
                        aria-label="Delete candidate"
                        className="inline-flex items-center justify-center w-9 h-9 bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition-colors border border-red-500/20 hover:border-transparent disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <span className="text-muted-foreground/60 text-xs">Video Intro Not Submitted</span>
                      <button
                        onClick={async () => {
                          if (!onDelete) return;
                          if (!window.confirm(`Delete candidate ${candidate.firstName} ${candidate.lastName}?`)) {
                            return;
                          }
                          setDeletingId(candidate.id);
                          try {
                            await onDelete(candidate.id);
                          } finally {
                            setDeletingId(null);
                          }
                        }}
                        disabled={deletingId === candidate.id}
                        title="Delete candidate"
                        aria-label="Delete candidate"
                        className="inline-flex items-center justify-center w-9 h-9 bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition-colors border border-red-500/20 hover:border-transparent disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedVideo && (
        <VideoPlayer
          videoUrl={selectedVideo}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </div>
  );
}

function UsersIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
