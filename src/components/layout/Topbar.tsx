import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Menu } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Topbar() {
  const { currentUser, signOut } = useAuth();

  const getRoleInitials = () => {
    if (currentUser?.displayName) {
      return currentUser.displayName.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <header className="h-20 shrink-0 border-b border-[#1A1A1A]/10 flex items-center justify-between px-6 md:px-10 bg-[#F4F1EA] z-10">
      <div className="flex items-center gap-4 md:gap-8">
        <button className="md:hidden p-2 -ml-2 text-[#1A1A1A]/60 hover:bg-[#1A1A1A]/5 rounded-md">
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-xl md:text-2xl font-serif italic tracking-tight font-bold text-[#1B365D]">STIN-Somdej Connect</h1>
        <nav className="hidden md:flex gap-6 text-[10px] uppercase tracking-[0.2em] font-semibold text-[#1A1A1A]/60">
          <Link to="/" className="text-[#1B365D] border-b border-[#1B365D]">Dashboard</Link>
          <a href="#" className="hover:text-[#1B365D]">Directory</a>
          <a href="#" className="hover:text-[#1B365D]">Settings</a>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex bg-[#EAE7DF] p-1 rounded-full">
          <span className={`px-4 py-1 text-[10px] font-bold rounded-full ${currentUser?.role === 'admin' ? 'bg-[#1B365D] text-white' : 'text-[#1A1A1A]/40'}`}>ADMIN</span>
          <span className={`px-4 py-1 text-[10px] font-bold rounded-full ${currentUser?.role === 'instructor' ? 'bg-[#1B365D] text-white' : 'text-[#1A1A1A]/40'}`}>INSTRUCTOR</span>
          <span className={`px-4 py-1 text-[10px] font-bold rounded-full ${currentUser?.role === 'student' ? 'bg-[#1B365D] text-white' : 'text-[#1A1A1A]/40'}`}>STUDENT</span>
        </div>
        <button 
          onClick={signOut}
          className="w-10 h-10 rounded-full bg-[#1B365D] flex items-center justify-center text-white text-xs font-bold hover:bg-[#1B365D]/90 transition-colors shrink-0"
          title="Sign out"
        >
          {getRoleInitials()}
        </button>
      </div>
    </header>
  );
}
