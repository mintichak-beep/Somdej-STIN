import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, UserCheck, ArrowRight, Stethoscope, Lock, Zap, Target, LogIn, Shield } from 'lucide-react';
import { DEMO_MODE } from '../lib/config';

export function WelcomePage() {
  const navigate = useNavigate();

  const handleSelectRole = (role: 'admin' | 'instructor' | 'student', path: string) => {
    if (DEMO_MODE) {
      const demoUser = {
        id: `demo-${role}-id`,
        email: `${role}@stin.ac.th`,
        role: role,
        displayName: role === 'admin' ? 'System Administrator' : role === 'instructor' ? 'Dr. Somchai Instructor' : 'Student Nursing (65000001)',
        createdAt: new Date()
      };
      localStorage.setItem('stin_current_user', JSON.stringify(demoUser));
    }
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-[#E3F2FD] text-[#1E293B] font-sans flex flex-col justify-between py-8 px-4 sm:px-8 lg:px-12 relative overflow-hidden">
      {/* Decorative background accents matching reference */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-400/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

      {/* Top Header with Logo & Login */}
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between z-10 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#E53935] rounded-2xl flex items-center justify-center text-white shadow-md">
            <span className="text-2xl font-bold">+</span>
          </div>
          <div>
            <h2 className="font-extrabold text-gray-900 text-lg tracking-tight">STIN-Somdej Connect</h2>
            <p className="text-xs text-gray-600 font-semibold">Student Nursing Practice Coordination System</p>
          </div>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-[#E53935] text-white rounded-2xl text-xs uppercase tracking-wider font-bold shadow-md transition-all hover:scale-105"
        >
          <LogIn className="w-4 h-4" />
          <span>Login Portal</span>
        </button>
      </div>

      {/* Main Hero & Content Section */}
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10 my-auto py-6">
        {/* Left Column: Titles & Role Selection */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight mb-3">
              ระบบประสานงานแหล่งฝึก<br />
              <span className="text-[#E53935]">รพ.สมเด็จพระบรมราชเทวี ณ ศรีราชา</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-700 font-semibold">
              ระบบบริหารจัดการฝึกปฏิบัติการพยาบาลสำหรับอาจารย์และนักศึกษา
            </p>
          </div>

          <div className="mb-5 flex items-center gap-2">
            <div className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center text-[#E53935]">
              <GraduationCap className="w-4 h-4" />
            </div>
            <h3 className="text-xs uppercase tracking-wider font-bold text-gray-800">Choose Your Role</h3>
          </div>

          {/* Role Cards Grid matching reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl">
            {/* Teacher / Instructor Card */}
            <div className="bg-white border border-gray-100 hover:border-red-300 p-6 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mb-4 text-[#E53935] group-hover:scale-105 transition-transform mx-auto shadow-inner">
                  <GraduationCap className="w-10 h-10" />
                </div>
                <h4 className="text-lg font-bold text-gray-900 text-center mb-1">Instructor</h4>
                <p className="text-xs text-gray-500 text-center mb-6">
                  For instructors and administrators
                </p>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => handleSelectRole('instructor', '/instructor')}
                  className="w-full py-3.5 bg-[#E53935] hover:bg-[#C8102E] text-white rounded-2xl text-xs uppercase tracking-widest font-bold shadow-md transition-all flex items-center justify-center gap-2 group-hover:scale-105"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleSelectRole('admin', '/admin')}
                  className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-[11px] font-semibold transition-all text-center"
                >
                  Admin Mode ⚙️
                </button>
              </div>
            </div>

            {/* Student Card */}
            <div className="bg-white border border-gray-100 hover:border-red-300 p-6 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-600 group-hover:scale-105 transition-transform mx-auto shadow-inner">
                  <UserCheck className="w-10 h-10" />
                </div>
                <h4 className="text-lg font-bold text-gray-900 text-center mb-1">Student</h4>
                <p className="text-xs text-gray-500 text-center mb-6">
                  For nursing students
                </p>
              </div>
              <div>
                <button
                  onClick={() => handleSelectRole('student', '/student')}
                  className="w-full py-3.5 bg-[#E53935] hover:bg-[#C8102E] text-white rounded-2xl text-xs uppercase tracking-widest font-bold shadow-md transition-all flex items-center justify-center gap-2 group-hover:scale-105"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Medical Clinical Graphic Illustration Representation matching the mockup */}
        <div className="lg:col-span-5 hidden lg:flex flex-col items-center justify-center relative">
          <div className="w-full max-w-md bg-white/90 backdrop-blur-md border border-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
            {/* Clipboard Header Graphic */}
            <div className="absolute top-4 right-4 w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-[#E53935]">
              <Stethoscope className="w-6 h-6" />
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#E53935] rounded-xl flex items-center justify-center text-white font-bold text-lg">+</div>
              <div>
                <div className="w-32 h-4 bg-gray-900/10 rounded-full mb-1"></div>
                <div className="w-20 h-3 bg-gray-900/10 rounded-full"></div>
              </div>
            </div>

            {/* Simulated Medical Lines on Clipboard */}
            <div className="space-y-3 mb-6">
              <div className="w-full h-3.5 bg-[#E53935]/20 rounded-full"></div>
              <div className="w-5/6 h-3.5 bg-gray-200 rounded-full"></div>
              <div className="w-4/6 h-3.5 bg-gray-200 rounded-full"></div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-3 p-3 bg-red-50/80 rounded-2xl">
                <div className="w-8 h-8 bg-[#E53935] text-white rounded-xl flex items-center justify-center font-bold text-xs"> ward </div>
                <div>
                  <p className="text-xs font-bold text-gray-800">Somdej Hospital</p>
                  <p className="text-[10px] text-gray-500">Clinical Units</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50/80 rounded-2xl">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-xs"> STIN </div>
                <div>
                  <p className="text-xs font-bold text-gray-800">Nursing Portal</p>
                  <p className="text-[10px] text-gray-500">Live Coordination</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer matching reference */}
      <div className="max-w-7xl mx-auto w-full text-center z-10 pt-6 border-t border-blue-200/80 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-600 gap-4">
        <span>© {new Date().getFullYear()} STIN-Somdej Connect. All rights reserved.</span>
        
        <div className="flex items-center gap-6 font-semibold">
          <span className="flex items-center gap-1.5 text-gray-800">
            <Lock className="w-3.5 h-3.5 text-[#E53935]" /> Secure
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5 text-gray-800">
            <Zap className="w-3.5 h-3.5 text-amber-500" /> Reliable
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5 text-gray-800">
            <Target className="w-3.5 h-3.5 text-blue-600" /> Efficient
          </span>
        </div>

        <span className="bg-red-50 text-[#E53935] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-red-200">
          Demo Mode Active
        </span>
      </div>
    </div>
  );
}
