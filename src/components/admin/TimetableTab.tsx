import React, { useState, useMemo } from 'react';
import { StudentAssignment, Student, Teacher, PracticeSite, StudentGroup } from '../../types';
import { Search, Filter, Calendar, List, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

interface TimetableTabProps {
  assignments: StudentAssignment[];
  students: Student[];
  teachers: Teacher[];
  sites: PracticeSite[];
  studentGroups: StudentGroup[];
}

export function TimetableTab({ assignments, students, teachers, sites, studentGroups }: TimetableTabProps) {
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [searchQuery, setSearchQuery] = useState('');

  const data = useMemo(() => {
    return assignments.map(a => {
        const student = students.find(s => s.id === a.studentId.id);
        const group = studentGroups.find(g => g.id === student?.groupId?.id);
        const site = sites.find(s => s.id === a.siteId?.id);
        const primary = teachers.find(t => t.id === a.primaryInstructorId?.id);
        const secondary = teachers.find(t => t.id === a.secondaryInstructorId?.id);
        
        // Basic conflict detection (simple student check for now)
        const hasConflict = assignments.some(other => 
            other.id !== a.id && 
            (other as any).studentId.id === (a as any).studentId.id &&
            other.practiceDate?.toDate().toDateString() === a.practiceDate?.toDate().toDateString()
        );

        return {
            ...a,
            studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
            groupName: group?.name || 'Unknown',
            siteName: site?.name || 'Unknown',
            primaryInstructor: primary ? `${primary.firstName} ${primary.lastName}` : 'Unknown',
            secondaryInstructor: secondary ? `${secondary.firstName} ${secondary.lastName}` : '-',
            hasConflict
        };
    }).filter(item => item.studentName.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [assignments, students, teachers, sites, studentGroups, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl w-64">
          <Search className="w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search student..." className="bg-transparent border-none outline-none text-xs w-full" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex gap-2">
            <button onClick={() => setView('daily')} className={`px-3 py-1 text-xs font-bold rounded-lg ${view === 'daily' ? 'bg-[#1B365D] text-white' : 'bg-gray-100'}`}>Daily</button>
            <button onClick={() => setView('weekly')} className={`px-3 py-1 text-xs font-bold rounded-lg ${view === 'weekly' ? 'bg-[#1B365D] text-white' : 'bg-gray-100'}`}>Weekly</button>
            <button onClick={() => setView('monthly')} className={`px-3 py-1 text-xs font-bold rounded-lg ${view === 'monthly' ? 'bg-[#1B365D] text-white' : 'bg-gray-100'}`}>Monthly</button>
        </div>
      </div>

      <table className="w-full text-left bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        <thead className="bg-[#F4F1EA] text-[10px] uppercase tracking-widest font-bold text-gray-500">
          <tr>
            <th className="p-4">Date</th>
            <th className="p-4">Shift</th>
            <th className="p-4">Student</th>
            <th className="p-4">Site</th>
            <th className="p-4">Instructor</th>
            <th className="p-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-xs">
          {data.map(a => (
            <tr key={a.id} className={a.hasConflict ? 'bg-red-50' : ''}>
              <td className="p-4">{a.practiceDate?.toDate().toLocaleDateString()}</td>
              <td className="p-4 font-bold">
                <span className={`px-2 py-1 rounded-lg ${a.shift === 'morning' ? 'bg-blue-50 text-blue-700' : a.shift === 'afternoon' ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'}`}>
                    {a.shift}
                </span>
                <div className="text-[10px] text-gray-500">{a.startTime}-{a.endTime}</div>
              </td>
              <td className="p-4 font-bold">{a.studentName}</td>
              <td className="p-4">{a.siteName}</td>
              <td className="p-4">{a.primaryInstructor}</td>
              <td className="p-4">
                  {a.hasConflict && <AlertTriangle className="w-4 h-4 text-red-500" />}
                  {a.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
