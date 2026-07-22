import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, UserCheck, Stethoscope, ArrowRight } from 'lucide-react';

export function LandingLogin() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-[#1A1A1A] font-sans flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#C8102E]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#1B365D]/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

      <div className="max-w-4xl mx-auto w-full pt-8 pb-12 z-10 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-[#C8102E]/10 rounded-full mb-6">
          <Stethoscope className="w-8 h-8 text-[#C8102E]" />
        </div>
        <h1 className="text-4xl sm:text-6xl font-serif italic tracking-tight text-[#1A1A1A] mb-4">
          STIN Connect
        </h1>
        <p className="text-xs uppercase tracking-widest font-bold text-[#1A1A1A]/60 max-w-lg mx-auto">
          Educational Management System & Clinical Practice Portal
        </p>
      </div>

      <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 z-10 my-auto pb-12">
        {/* Instructor Card */}
        <div 
          onClick={() => navigate('/login/instructor')}
          className="group cursor-pointer bg-white border border-[#1A1A1A]/10 hover:border-[#C8102E] p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#C8102E] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div>
            <div className="w-14 h-14 bg-[#C8102E]/10 rounded-xl flex items-center justify-center mb-6 text-[#C8102E] group-hover:scale-110 transition-transform">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-[#1A1A1A] mb-3">Instructor Login</h2>
            <p className="text-sm text-[#1A1A1A]/60 mb-6 leading-relaxed">
              Access clinical practice projects, student assignments, timetables, practice sites, accommodation, transportation, and evaluation reports.
            </p>
            <div className="inline-flex items-center text-xs uppercase tracking-widest font-bold text-[#C8102E] gap-2">
              <span>Sign in with STIN Email</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        {/* Student Card */}
        <div 
          onClick={() => navigate('/login/student')}
          className="group cursor-pointer bg-white border border-[#1A1A1A]/10 hover:border-[#C8102E] p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#C8102E] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div>
            <div className="w-14 h-14 bg-[#1B365D]/10 rounded-xl flex items-center justify-center mb-6 text-[#1B365D] group-hover:scale-110 transition-transform">
              <UserCheck className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-[#1A1A1A] mb-3">Student Login</h2>
            <p className="text-sm text-[#1A1A1A]/60 mb-6 leading-relaxed">
              Access your personal timetable, clinical courses, ward/unit rotations, instructor notes, accommodation, van transportation, and invoices.
            </p>
            <div className="inline-flex items-center text-xs uppercase tracking-widest font-bold text-[#1B365D] gap-2">
              <span>Sign in with Student ID</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full text-center z-10 pt-4 border-t border-[#1A1A1A]/10 flex justify-between items-center text-xs text-[#1A1A1A]/40">
        <span>© {new Date().getFullYear()} STIN Connect. All rights reserved.</span>
        <button 
          onClick={() => navigate('/login/admin')}
          className="hover:text-[#C8102E] transition-colors underline uppercase tracking-widest font-bold"
        >
          Admin Portal
        </button>
      </div>
    </div>
  );
}
