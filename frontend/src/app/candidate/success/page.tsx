'use client';

import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-card border border-border rounded-3xl p-10 text-center shadow-xl animate-in fade-in zoom-in duration-500">
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
            <CheckCircle size={48} />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold mb-4">Profile Completed Successfully</h1>
        <p className="text-muted-foreground mb-4 leading-relaxed">
          Your video profile has been securely saved. It will now be seamlessly attached to any relevant jobs you apply for, giving you a faster and smoother hiring experience!
        </p>
      </div>
    </main>
  );
}
