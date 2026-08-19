'use client';

import { Suspense } from 'react';
import Recording from '@/components/Recording';

export default function CandidateRecordingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground p-4 md:p-6 pt-6 md:pt-10 flex flex-col transition-colors duration-200">
      <Suspense fallback={<div className="flex items-center justify-center h-screen"><p>Loading...</p></div>}>
        <Recording />
      </Suspense>
    </main>
  );
}
