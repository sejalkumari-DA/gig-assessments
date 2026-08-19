'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CandidateTable from '@/components/CandidateTable';
import { Users, LayoutDashboard, Settings, Video, LogOut } from 'lucide-react';

export default function RecruiterDashboard() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reports');
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');
    if (tokenFromUrl) {
      localStorage.setItem('recruiterToken', tokenFromUrl);
    }

    // Check if logged in
    const storedUser = localStorage.getItem('recruiterUser');
    const storedToken = localStorage.getItem('recruiterToken');
    if (!storedUser && !storedToken) {
      router.push('/recruiter');
      return;
    }
    try {
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      router.push('/recruiter');
      return;
    }

    fetchCandidates();
  }, [router]);

  const fetchCandidates = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/candidates`, {
        headers: {
        'x-environment': typeof window !== 'undefined' ? (window.location.hostname.includes('staging') ? 'staging' : (window.location.hostname.includes('worker.dataalchemy.ai') ? 'production' : 'daily-interview')) : 'daily-interview',
          'Authorization': `Bearer ${localStorage.getItem('recruiterToken')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setCandidates(data.candidates);
      }
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCandidate = async (candidateId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/candidates/${candidateId}`, {
        method: 'DELETE',
        headers: {
        'x-environment': typeof window !== 'undefined' ? (window.location.hostname.includes('staging') ? 'staging' : (window.location.hostname.includes('worker.dataalchemy.ai') ? 'production' : 'daily-interview')) : 'daily-interview',
          'Authorization': `Bearer ${localStorage.getItem('recruiterToken')}`
        }
      });
      const data = await response.json();
      if (!data.success) {
        alert(data.error || 'Failed to delete candidate.');
        return;
      }
      await fetchCandidates();
    } catch (error) {
      console.error('Failed to delete candidate:', error);
      alert('Failed to delete candidate.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('recruiterUser');
    router.push('/recruiter');
  };

  if (!user) return null; // Wait for redirect or user load

  return (
    <div className="flex h-screen bg-background text-foreground transition-colors duration-200">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            Talent Dashboard
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('reports')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'reports' ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'}`}
          >
            <Users size={20} /> Reports
          </button>
        </nav>
        
        
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <header className="h-20 border-b border-[var(--border)] flex items-center justify-between px-8 bg-[var(--background)]/50 backdrop-blur sticky top-0 z-10">
          <h2 className="text-2xl font-bold capitalize">{activeTab}</h2>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-blue-500 flex items-center justify-center font-bold text-xs uppercase text-white">
                {user?.full_name?.charAt(0) || 'R'}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium">{user?.full_name || 'Recruiter'}</p>
                <p className="text-xs text-muted-foreground">{user?.role_name || 'Admin'}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 transition-colors bg-destructive/10 px-4 py-2 rounded-lg font-medium">
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </header>

        <main className="p-8">
          {activeTab === 'reports' && (
            <div className="animate-in fade-in duration-500">
              <div className="mb-6 flex justify-between items-center">
                <h3 className="text-lg text-muted-foreground">Total Candidates: {candidates.length}</h3>
                <button onClick={fetchCandidates} className="text-sm text-primary hover:text-primary/80">Refresh List</button>
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <CandidateTable candidates={candidates} onDelete={handleDeleteCandidate} />
              )}
            </div>
          )}

          {activeTab !== 'reports' && (
            <div className="flex items-center justify-center py-20 text-muted-foreground animate-in fade-in duration-500">
              <p>{activeTab} module coming soon.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
