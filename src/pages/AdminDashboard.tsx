import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export function AdminDashboard() {
  const { currentUser } = useAuth();

  return (
    <div className="flex flex-col h-full space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl md:text-5xl font-serif italic mb-2 tracking-tighter text-[#1A1A1A]">Admin Core</h2>
          <p className="text-sm text-[#1A1A1A]/60 max-w-md">Manage global permissions, system-wide settings, and foundational collections.</p>
        </div>
        <div className="text-right hidden sm:block">
          <span className="block text-4xl font-bold text-[#1B365D]">12</span>
          <span className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/40">Active Nodes</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-none">
        {[
          { title: 'Total Users', value: '1,234', desc: 'Auth & Profiles' },
          { title: 'Active Clinical Courses', value: '24', desc: 'Clinical Course Meta' },
          { title: 'Practice Sites', value: '15', desc: 'Clinical Locations' },
          { title: 'System Health', value: '99.9%', desc: 'Performance Index' },
        ].map((stat, idx) => (
          <div key={idx} className={`border border-[#1A1A1A]/10 p-5 flex flex-col justify-between transition-colors ${idx === 3 ? 'bg-[#1B365D] text-white' : 'hover:bg-white bg-transparent'}`}>
            <span className={`text-[10px] font-bold text-[#D4AF37]`}>METRIC</span>
            <h3 className="text-xl font-serif my-2">{stat.value} <span className="text-sm">{stat.title}</span></h3>
            <p className={`text-[10px] ${idx === 3 ? 'opacity-60' : 'text-[#1A1A1A]/40'}`}>{stat.desc}</p>
          </div>
        ))}
      </div>

      <div className="flex-1 border border-dashed border-[#1A1A1A]/20 p-5 flex flex-col items-center justify-center text-center">
         <span className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/40 mb-2">Admin Dashboard</span>
         <p className="text-sm italic font-serif text-[#1A1A1A]/60">Detailed analytics and system management tools will appear here.</p>
      </div>
    </div>
  );
}
