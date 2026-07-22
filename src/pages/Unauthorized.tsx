import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export function Unauthorized() {
  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#1A1A1A] font-sans flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center flex flex-col items-center">
        <div className="flex justify-center text-[#1A1A1A]/40 mb-4">
          <ShieldAlert className="w-16 h-16" />
        </div>
        <h2 className="text-4xl font-serif italic tracking-tighter text-[#1B365D] mb-2">
          Access Denied
        </h2>
        <p className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60 mb-6">
          You do not have permission to view this page.
        </p>
        <Link 
          to="/" 
          className="inline-flex items-center justify-center py-3 px-6 border border-transparent text-[10px] uppercase tracking-widest font-bold text-white bg-[#1B365D] hover:bg-[#1B365D]/90 transition-colors"
        >
          Go back home
        </Link>
      </div>
    </div>
  );
}
