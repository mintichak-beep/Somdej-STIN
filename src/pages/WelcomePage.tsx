import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, GraduationCap, UserCheck, ArrowRight, Stethoscope, Sparkles, LogIn } from 'lucide-react';
import { DEMO_MODE } from '../lib/config';

export function WelcomePage() {
  const navigate = useNavigate();

  const handleSelectRole = (role: 'admin' | 'instructor' | 'student', path: string) => {
    if (DEMO_MODE) {
      const demoUser = {
        id: `demo-${role}-id`,
        email: `${role}@stin.ac.th`,
        role: role,
        displayName: role === 'admin' ? 'System Administrator' : role === 'instructor' ? 'Dr. Somchai Instructor' : 'Student Nursing (65123456)',
        createdAt: new Date()
      };
      localStorage.setItem('stin_current_user', JSON.stringify(demoUser));
    }
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-[#F9F6F0] text-[#111111] font-sans flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#C8102E]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#111111]/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

      {/* Top Bar with LOGIN Button */}
      <div className="max-w-5xl mx-auto w-full flex justify-end z-10 mb-4">
        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#111111] hover:bg-[#C8102E] text-white rounded-xl text-xs uppercase tracking-widest font-bold shadow-md transition-all hover:scale-105"
        >
          <LogIn className="w-4 h-4" />
          <span>LOGIN</span>
        </button>
      </div>

      <div className="max-w-4xl mx-auto w-full pt-4 pb-8 z-10 text-center">
        <div className="inline-flex items-center justify-center p-3.5 bg-white border border-[#111111]/10 rounded-2xl mb-6 shadow-sm">
          <Stethoscope className="w-8 h-8 text-[#C8102E]" />
        </div>
        <h1 className="text-4xl sm:text-6xl font-serif italic tracking-tight text-[#111111] mb-4">
          STIN Connect
        </h1>
        <p className="text-xs uppercase tracking-widest font-bold text-[#111111]/60 max-w-lg mx-auto">
          Educational Management System & Clinical Practice Portal
        </p>

        {/* Enter System Large Button */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => handleSelectRole('admin', '/admin')}
            className="inline-flex items-center gap-3 px-8 py-4 bg-[#C8102E] hover:bg-[#C8102E]/90 text-white rounded-2xl text-xs uppercase tracking-widest font-bold shadow-xl shadow-[#C8102E]/20 transition-all hover:scale-105"
          >
            <Sparkles className="w-5 h-5" />
            <span>ENTER SYSTEM</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-3 px-8 py-4 bg-white border border-[#111111]/20 hover:border-[#C8102E] text-[#111111] rounded-2xl text-xs uppercase tracking-widest font-bold shadow-sm transition-all hover:scale-105"
          >
            <LogIn className="w-4 h-4 text-[#C8102E]" />
            <span>LOGIN PAGE</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full z-10 my-auto py-6">
        <div className="text-center mb-6">
          <h2 className="text-xs uppercase tracking-widest font-bold text-[#111111]/40">
            Or select a demo portal direct entry
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Administrator Card */}
          <div 
            onClick={() => handleSelectRole('admin', '/admin')}
            className="group cursor-pointer bg-white border border-[#111111]/10 hover:border-[#C8102E] p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#111111] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div>
              <div className="w-12 h-12 bg-[#111111]/5 rounded-xl flex items-center justify-center mb-4 text-[#111111] group-hover:scale-110 group-hover:bg-[#C8102E] group-hover:text-white transition-all">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-serif font-bold text-[#111111] mb-2">Administrator</h3>
              <p className="text-xs text-[#111111]/60 mb-6 leading-relaxed">
                Manage courses, practice projects, student assignments, faculty, welcome settings, and institutional reports.
              </p>
              <div className="inline-flex items-center text-xs uppercase tracking-widest font-bold text-[#111111] group-hover:text-[#C8102E] gap-2">
                <span>Open Dashboard</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Instructor Card */}
          <div 
            onClick={() => handleSelectRole('instructor', '/instructor')}
            className="group cursor-pointer bg-white border border-[#111111]/10 hover:border-[#C8102E] p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#C8102E] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div>
              <div className="w-12 h-12 bg-[#C8102E]/10 rounded-xl flex items-center justify-center mb-4 text-[#C8102E] group-hover:scale-110 group-hover:bg-[#C8102E] group-hover:text-white transition-all">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-serif font-bold text-[#111111] mb-2">Instructor</h3>
              <p className="text-xs text-[#111111]/60 mb-6 leading-relaxed">
                Access assigned clinical practice projects, student lists, timetables, practice sites, accommodation, and grading.
              </p>
              <div className="inline-flex items-center text-xs uppercase tracking-widest font-bold text-[#C8102E] gap-2">
                <span>Open Dashboard</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Student Card */}
          <div 
            onClick={() => handleSelectRole('student', '/student')}
            className="group cursor-pointer bg-white border border-[#111111]/10 hover:border-[#C8102E] p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#111111] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div>
              <div className="w-12 h-12 bg-[#111111]/5 rounded-xl flex items-center justify-center mb-4 text-[#111111] group-hover:scale-110 group-hover:bg-[#C8102E] group-hover:text-white transition-all">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-serif font-bold text-[#111111] mb-2">Student</h3>
              <p className="text-xs text-[#111111]/60 mb-6 leading-relaxed">
                View personal timetable, clinical ward/unit rotations, instructor notes, van transportation, and invoices.
              </p>
              <div className="inline-flex items-center text-xs uppercase tracking-widest font-bold text-[#111111] group-hover:text-[#C8102E] gap-2">
                <span>Open Dashboard</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full text-center z-10 pt-4 border-t border-[#111111]/10 flex flex-col sm:flex-row justify-between items-center text-xs text-[#111111]/50 gap-2">
        <span>© {new Date().getFullYear()} STIN Connect. All rights reserved.</span>
        <div className="flex items-center gap-4">
          <span className="bg-[#C8102E]/10 text-[#C8102E] px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
            Demo Mode Active
          </span>
          <button 
            onClick={() => navigate('/login')}
            className="hover:text-[#C8102E] transition-colors underline uppercase tracking-widest font-bold"
          >
            Login Portal
          </button>
        </div>
      </div>
    </div>
  );
}
