import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Home, 
  Users, 
  BookOpen, 
  MapPin, 
  Settings, 
  FileText, 
  Calendar,
  Bus
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Sidebar() {
  const { currentUser } = useAuth();
  const role = currentUser?.role || 'student';

  const getLinks = () => {
    switch (role) {
      case 'admin':
        return [
          {to: '/admin', label: 'Dashboard', icon: Home},
          {to: '/admin/users', label: 'Users', icon: Users},
          {to: '/admin/academic-years', label: 'Academic Year', icon: Calendar},
          {to: '/admin/courses', label: 'Clinical Course', icon: BookOpen},
          {to: '/admin/sites', label: 'Practice Site', icon: MapPin},
          {to: '/admin/welcome-settings', label: 'Welcome Settings', icon: Settings},
          {to: '/admin/settings', label: 'Settings', icon: Settings},
        ];
      case 'instructor':
        return [
          { to: '/instructor', label: 'Dashboard', icon: Home },
          { to: '/instructor/projects', label: 'Clinical Practice Projects', icon: Calendar },
          { to: '/instructor/students', label: 'Students', icon: Users },
          { to: '/instructor/assignments', label: 'Assignments', icon: FileText },
        ];
      case 'student':
      default:
        return [
          { to: '/student', label: 'Dashboard', icon: Home },
          { to: '/student/projects', label: 'Clinical Practice Projects', icon: Calendar },
          { to: '/student/assignments', label: 'Assignments', icon: FileText },
          { to: '/student/transportation', label: 'Transportation', icon: Bus },
        ];
    }
  };

  const links = getLinks();

  return (
    <aside className="hidden md:flex flex-col w-20 lg:w-64 border-r border-[#1A1A1A]/10 p-4 lg:p-8 bg-[#F4F1EA] transition-all duration-300">
      <div className="mb-8 hidden lg:block">
        <p className="text-[10px] uppercase tracking-widest text-[#1A1A1A]/40 font-bold">System Core</p>
      </div>
      <div className="mb-8 flex lg:hidden justify-center">
        <div className="w-8 h-8 bg-[#1B365D] rounded-full flex items-center justify-center text-white font-serif italic font-bold">S</div>
      </div>
      <nav className="flex-1 overflow-y-auto space-y-6">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              twMerge(
                clsx(
                  "flex items-center lg:justify-start justify-center gap-3 text-sm font-medium transition-colors",
                  isActive
                    ? "text-[#1B365D]"
                    : "text-[#1A1A1A]/60 hover:text-[#1A1A1A]"
                )
              )
            }
            title={link.label}
          >
            {({ isActive }) => (
              <>
                {isActive ? (
                  <span className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full shrink-0 lg:block hidden" />
                ) : (
                  <link.icon className="w-4 h-4 shrink-0 lg:block hidden" />
                )}
                {/* Always show icon on tablet, conditional on desktop based on active state */}
                <link.icon className={clsx("w-6 h-6 shrink-0 lg:hidden", isActive ? "text-[#1B365D]" : "")} />
                <span className="hidden lg:inline">{link.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      
      <div className="mt-auto p-4 bg-[#1B365D] rounded-xl text-white hidden lg:block">
        <p className="text-[10px] uppercase tracking-tighter opacity-60 mb-1">Database Status</p>
        <p className="text-xs font-serif italic">Firestore Connected</p>
        <div className="mt-3 h-1 w-full bg-white/20 rounded-full overflow-hidden">
          <div className="h-full w-3/4 bg-[#D4AF37]"></div>
        </div>
      </div>
    </aside>
  );
}
