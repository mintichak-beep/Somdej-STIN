/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { CourseDirectory } from './pages/admin/CourseDirectory';
import { ProjectDirectory } from './pages/admin/ProjectDirectory';
import { ProjectDetails } from './pages/admin/ProjectDetails';
import { ProjectAssignments } from './pages/admin/ProjectAssignments';
import { InstructorDashboard } from './pages/InstructorDashboard';
import { StudentDashboard } from './pages/StudentDashboard';
import { Unauthorized } from './pages/Unauthorized';

import { WelcomeSettingsManager } from './pages/admin/WelcomeSettings';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<AppLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/courses" element={<CourseDirectory />} />
              <Route path="/admin/projects" element={<ProjectDirectory />} />
              <Route path="/admin/projects/:id" element={<ProjectDetails />} />
              <Route path="/admin/projects/:id/assignments" element={<ProjectAssignments />} />
              <Route path="/admin/welcome-settings" element={<WelcomeSettingsManager />} />
              {/* Other admin routes */}
              <Route path="/admin/*" element={<AdminDashboard />} />
            </Route>
          </Route>

          {/* Instructor Routes */}
          <Route element={<ProtectedRoute allowedRoles={['instructor']} />}>
            <Route element={<AppLayout />}>
              <Route path="/instructor" element={<InstructorDashboard />} />
              {/* Other instructor routes */}
              <Route path="/instructor/*" element={<InstructorDashboard />} />
            </Route>
          </Route>

          {/* Student Routes */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route element={<AppLayout />}>
              <Route path="/student" element={<StudentDashboard />} />
              {/* Other student routes */}
              <Route path="/student/*" element={<StudentDashboard />} />
            </Route>
          </Route>

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

