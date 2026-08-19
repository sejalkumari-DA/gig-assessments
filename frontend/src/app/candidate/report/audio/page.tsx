import { Suspense } from 'react';
import SessionReportClient from '@/components/SessionReportClient';

export default function CandidateAudioReportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-8">Loading session...</div>}>
      <SessionReportClient type="audio" />
    </Suspense>
  );
}
