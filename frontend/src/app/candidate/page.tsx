'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';

export default function CandidatePage() {
  const router = useRouter();
  const [workerId, setWorkerId] = useState('');
  const [token, setToken] = useState('');
  const [showModal, setShowModal] = useState(false);

  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idFromUrl = params.get('workerId');
    const tokenFromUrl = params.get('token');
    
    if (tokenFromUrl) {
      localStorage.setItem('candidateToken', tokenFromUrl);
    }
    
    if (idFromUrl) {
      setWorkerId(idFromUrl);
      localStorage.setItem('candidateId', idFromUrl);
      setShowModal(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId.trim()) {
      alert('Please enter a valid Worker ID.');
      return;
    }
    
    // Save worker ID to local storage
    localStorage.setItem('candidateId', workerId.trim());
    
    if (token.trim()) {
      localStorage.setItem('candidateToken', token.trim());
    }
    
    // Trigger the modal instead of routing immediately
    setShowModal(true);
  };

  const handleRecordVideo = () => {
    const params = new URLSearchParams(window.location.search);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    router.push(`/candidate/recording-html5${queryString}`);
  };

  const handleMaybeLater = () => {
    // If they choose maybe later, we could redirect back to the portal.
    // For now, just close the modal.
    setShowModal(false);
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-8">
      <Card className="w-full max-w-md p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-normal mb-2">Video Profile Verification</h1>
          <p className="text-xs text-muted-foreground">Enter your Worker ID to connect your profile.</p>
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
            Submit
          </Button>
        </form>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogHeader>
          <DialogTitle>Complete your Video Profile</DialogTitle>
          <DialogDescription>
            This is a one-time video profile that can be used across multiple job applications. 
            Completing this now will allow you to directly apply to future roles without re-recording.
            <br /><br />
            <span className="font-medium">Estimated Time:</span> 3–5 minutes
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleMaybeLater}>
            Maybe Later
          </Button>
          <Button onClick={handleRecordVideo}>
            Record Video
          </Button>
        </DialogFooter>
      </Dialog>
    </main>
  );
}
