'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function VideoInterviewPage() {
  const router = useRouter();
  const [workerId, setWorkerId] = useState('');
  const [jobId, setJobId] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const workerIdUrl = params.get('workerId') || params.get('worker_id');
    const jobIdUrl = params.get('jobId') || params.get('job_id');
    const tokenUrl = params.get('token');
    
    if (workerIdUrl) setWorkerId(workerIdUrl);
    if (jobIdUrl) setJobId(jobIdUrl);
    if (tokenUrl) setToken(tokenUrl);

    if (workerIdUrl && jobIdUrl) {
      localStorage.setItem('candidateId', workerIdUrl);
      localStorage.setItem('jobId', jobIdUrl);
      if (tokenUrl) {
        localStorage.setItem('candidateToken', tokenUrl);
      }
      
      const query = new URLSearchParams({
        workerId: workerIdUrl,
        jobId: jobIdUrl,
        type: 'video-interview'
      });
      router.push(`/candidate/recording-html5?${query.toString()}`);
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId.trim() || !jobId.trim()) {
      alert('Please enter both Worker ID and Job ID.');
      return;
    }
    
    // Save to local storage for persistence across reloads
    localStorage.setItem('candidateId', workerId.trim());
    localStorage.setItem('jobId', jobId.trim());
    
    if (token.trim()) {
      localStorage.setItem('candidateToken', token.trim());
    }
    
    // Navigate directly to recording page with type=video-interview
    const query = new URLSearchParams({
      workerId: workerId.trim(),
      jobId: jobId.trim(),
      type: 'video-interview'
    });
    
    router.push(`/candidate/recording-html5?${query.toString()}`);
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-8">
      <Card className="w-full max-w-md p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-normal mb-2">Job Video Interview</h1>
          <p className="text-xs text-muted-foreground">Enter your details to take the video interview for this role.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-medium mb-2 text-muted-foreground">
              Worker ID
            </label>
            <input
              type="text"
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
              placeholder="e.g. 05adbc3d-4f00-411c-9797..."
              className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-2 text-muted-foreground">
              Job ID
            </label>
            <input
              type="text"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              placeholder="e.g. j12345-6789-abcd..."
              className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-2 text-muted-foreground">
              JWT Token (Optional - if not in URL)
            </label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="e.g. eyJhbGciOiJIUzI1..."
              className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          <Button type="submit" className="w-full">
            Start Video Interview
          </Button>
        </form>
      </Card>
    </main>
  );
}
