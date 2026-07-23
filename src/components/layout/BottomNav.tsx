import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Home, Calendar, FileText, Menu } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function BottomNav() {
  const { currentUser } = useAuth();
  const role = currentUser?.role || 'student';

  const getLinks = () => {
    switch (role) {
      case 'admin':
        return [
          { to: '/admin', label: 'Home', icon: Home },
          { to: '/admin/courses', label: 'Clinical Course', icon: FileText },
          { to: '/admin/settings', label: 'Menu', icon: Menu },
        ];
      case 'instructor':
        return [
          { to: '/instructor', label: 'Home', icon: Home },
          { to: '/instructor/projects', label: 'Clinical Practice Projects', icon: Calendar },
          { to: '/instructor/students', label: 'Menu', icon: Menu },
        ];
      case 'student':
      default:
        return [
          { to: '/student', label: 'Home', icon: Home },
          { to: '/student/projects', label: 'Clinical Practice Projects', icon: Calendar },
          { to: '/student/assignments', label: 'Menu', icon: Menu },
        ];
    }
  };

  const links = getLinks();

  return (
    <footer className="md:hidden fixed bottom-0 w-full h-16 bg-[#F4F1EA] border-t border-[#1A1A1A]/10 flex items-center justify-around px-4 pb-safe z-10">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            twMerge(
              clsx(
                "flex flex-col items-center gap-1 text-[9px] uppercase tracking-widest font-bold",
                isActive ? "text-[#1B365D]" : "text-[#1A1A1A]/30 hover:text-[#1A1A1A]/60"
              )
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive ? (
                <div className="w-1 h-1 bg-[#1B365D] rounded-full" />
              ) : (
                <link.icon className="w-4 h-4 mb-1" />
              )}
              {link.label}
            </>
          )}
        </NavLink>
      ))}
    </footer>
  );
}
