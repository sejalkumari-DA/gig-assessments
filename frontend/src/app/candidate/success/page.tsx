'use client';

import { CheckCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const type = searchParams?.get('type');

  let title = "Profile Completed Successfully";
  let body = "Your video profile has been securely saved. It will now be seamlessly attached to any relevant jobs you apply for, giving you a faster and smoother hiring experience!";

  if (type === 'audio') {
    title = "Assessment Submitted Successfully";
    body = "Your audio assessment has been securely saved. It will now be seamlessly attached to your job application.";
  } else if (type === 'video-interview') {
    title = "Skill Based Assessment Completed Successfully";
    body = "Your video interview has been securely saved. It will now be seamlessly attached to your job application.";
  }

  return (
    <div className="max-w-md w-full bg-card border border-border rounded-3xl p-10 text-center shadow-xl animate-in fade-in zoom-in duration-500">
      <div className="flex justify-center mb-6">
        <div className="w-24 h-24 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
          <CheckCircle size={48} />
        </div>
      </div>
      
      <h1 className="text-3xl font-bold mb-4">{title}</h1>
      <p className="text-muted-foreground mb-4 leading-relaxed">
        {body}
      </p>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-8">
      <Suspense fallback={<div className="animate-pulse flex space-x-4"><div className="rounded-full bg-slate-200 h-10 w-10"></div><div className="flex-1 space-y-6 py-1"><div className="h-2 bg-slate-200 rounded"></div><div className="space-y-3"><div className="grid grid-cols-3 gap-4"><div className="h-2 bg-slate-200 rounded col-span-2"></div><div className="h-2 bg-slate-200 rounded col-span-1"></div></div><div className="h-2 bg-slate-200 rounded"></div></div></div></div>}>
        <SuccessContent />
      </Suspense>
    </main>
  );
}
