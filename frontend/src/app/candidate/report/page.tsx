import { Suspense } from 'react';
import ReportClient from './ReportClient';

export default function CandidateReportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-8">Loading report...</div>}>
      <ReportClient />
    </Suspense>
  );
}
