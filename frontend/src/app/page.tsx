'use client';

import Link from 'next/link';
import { UserCircle, Users } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-950 text-white selection:bg-blue-500/30">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20 pointer-events-none" />
      
      <div className="z-10 text-center max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="space-y-4">
          <div className="inline-block rounded-full bg-blue-500/10 px-3 py-1 text-sm text-blue-400 font-medium mb-4 ring-1 ring-blue-500/20">
            Next-Generation Talent Onboarding
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
            Welcome to Talent Onboarding Platform
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Choose how you would like to continue. Join as a candidate to record your profile, or as a recruiter to review candidates.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mt-12">
          {/* Candidate Card */}
          <Link href="/candidate" className="group relative rounded-2xl bg-gray-900 border border-gray-800 p-8 hover:border-blue-500/50 transition-all duration-300 hover:shadow-[0_0_40px_-15px_rgba(59,130,246,0.5)] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-blue-500/10 text-blue-400 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
                <UserCircle size={48} />
              </div>
              <h2 className="text-2xl font-bold">Candidate</h2>
              <p className="text-gray-400 text-sm">
                Submit your profile, upload your resume, and record a short video introduction.
              </p>
              <div className="pt-4 w-full">
                <span className="inline-block w-full rounded-lg bg-gray-800 px-4 py-3 font-semibold text-white group-hover:bg-blue-600 transition-colors">
                  Continue as Candidate
                </span>
              </div>
            </div>
          </Link>

          {/* Recruiter Card */}
          <Link href="/recruiter" className="group relative rounded-2xl bg-gray-900 border border-gray-800 p-8 hover:border-purple-500/50 transition-all duration-300 hover:shadow-[0_0_40px_-15px_rgba(168,85,247,0.5)] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-purple-500/10 text-purple-400 group-hover:scale-110 group-hover:bg-purple-500 group-hover:text-white transition-all duration-300">
                <Users size={48} />
              </div>
              <h2 className="text-2xl font-bold">Recruiter</h2>
              <p className="text-gray-400 text-sm">
                Review candidate profiles, watch introduction videos, and find your next hire.
              </p>
              <div className="pt-4 w-full">
                <span className="inline-block w-full rounded-lg bg-gray-800 px-4 py-3 font-semibold text-white group-hover:bg-purple-600 transition-colors">
                  Continue as Recruiter
                </span>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
