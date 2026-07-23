import React from 'react';
import { Student } from '../../types';
import { User, X } from 'lucide-react';

interface StudentProfileModalProps {
  student: Student;
  onClose: () => void;
}

export function StudentProfileModal({ student, onClose }: StudentProfileModalProps) {
  return (
    <div className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-[#1B365D] rounded-2xl">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{student.firstName} {student.lastName}</h2>
              <p className="text-sm text-gray-500 font-mono">{student.studentId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-2xl">
            <h4 className="text-[10px] uppercase font-extrabold text-gray-400 mb-1">Accommodation</h4>
            <p className="text-sm font-bold text-gray-900">Managed in Planner</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-2xl">
            <h4 className="text-[10px] uppercase font-extrabold text-gray-400 mb-1">Transportation</h4>
            <p className="text-sm font-bold text-gray-900">Managed in Planner</p>
          </div>
        </div>
      </div>
    </div>
  );
}
