import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';
import { DEMO_MODE } from '../lib/config';

interface ProtectedRouteProps {
  allowedRoles: Role[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  let activeUser = currentUser;

  if (!activeUser && DEMO_MODE) {
    // Auto-assign demo user for requested role
    const role = allowedRoles[0] || 'admin';
    activeUser = {
      id: `demo-${role}`,
      email: `${role}@stin.ac.th`,
      role: role,
      displayName: role === 'admin' ? 'System Administrator' : role === 'instructor' ? 'Dr. Somchai Instructor' : 'Student Nursing',
      createdAt: new Date()
    };
  }

  if (!activeUser) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(activeUser.role)) {
    // In demo mode, if role doesn't match, allow anyway or redirect
    if (!DEMO_MODE && !allowedRoles.includes(activeUser.role)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <Outlet />;
}

