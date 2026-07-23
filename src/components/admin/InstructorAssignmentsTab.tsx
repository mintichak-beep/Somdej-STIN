import React, { useState, useMemo } from 'react';
import { Teacher, TeacherAssignment, StudentAssignment, Student, StudentGroup, PracticeSite } from '../../types';
import { Search, Plus, Trash2, Edit, Eye } from 'lucide-react';

function checkOverlap(a: StudentAssignment, b: StudentAssignment) {
  if (a.practiceDate.toDate().toDateString() !== b.practiceDate.toDate().toDateString()) return false;
  const [h1, m1] = a.startTime.split(':').map(Number);
  const [h2, m2] = a.endTime.split(':').map(Number);
  const [h3, m3] = b.startTime.split(':').map(Number);
  const [h4, m4] = b.endTime.split(':').map(Number);
  
  const start1 = h1 * 60 + m1;
  const end1 = h2 * 60 + m2;
  const start2 = h3 * 60 + m3;
  const end2 = h4 * 60 + m4;

  return start1 < end2 && start2 < end1;
}

interface InstructorAssignmentsTabProps {
  teachers: Teacher[];
  instructorAssignments: TeacherAssignment[];
  studentAssignments: StudentAssignment[];
  studentGroups: StudentGroup[];
  students: Student[];
  sites: PracticeSite[];
  onRemove: (assignmentId: string) => void;
  isAdmin: boolean;
}

export function InstructorAssignmentsTab({ 
  teachers, 
  instructorAssignments,
  studentAssignments,
  studentGroups,
  students,
  sites,
  onRemove,
  isAdmin
}: InstructorAssignmentsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const data = useMemo(() => {
    return instructorAssignments.map(ia => {
      const teacher = teachers.find(t => t.id === ia.teacherId.id);
      const assignedAssignments = Object.values(studentAssignments).filter(sa => sa.primaryInstructorId?.id === ia.teacherId.id || sa.secondaryInstructorId?.id === ia.teacherId.id);
      
      const uniqueStudents = new Set(assignedAssignments.map(sa => sa.studentId.id));
      const uniqueGroups = new Set(assignedAssignments.map(sa => {
        const student = students.find(s => s.id === sa.studentId.id);
        return student?.groupId;
      }).filter(Boolean));
      const uniqueDates = new Set(assignedAssignments.map(sa => sa.practiceDate.toDate().toDateString()));
      const totalHours = assignedAssignments.reduce((acc, sa) => {
        const [h1, m1] = sa.startTime.split(':').map(Number);
        const [h2, m2] = sa.endTime.split(':').map(Number);
        return acc + ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60;
      }, 0);

      let hasOverlap = false;
      for (let i = 0; i < assignedAssignments.length; i++) {
        for (let j = i + 1; j < assignedAssignments.length; j++) {
          if (checkOverlap(assignedAssignments[i], assignedAssignments[j])) {
            hasOverlap = true;
            break;
          }
        }
        if (hasOverlap) break;
      }
      
      return {
        ...ia,
        teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unknown',
        assignedStudentsCount: uniqueStudents.size,
        assignedGroupsCount: uniqueGroups.size,
        practiceDaysCount: uniqueDates.size,
        practiceHours: totalHours.toFixed(1),
        hasOverlap,
        status: 'Active'
      };
    }).filter(item => 
      item.teacherName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [instructorAssignments, teachers, studentAssignments, searchQuery, students]);

  const paginatedData = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(data.length / itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-gray-100 pb-4">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl w-64">
          <Search className="w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search instructors..." 
            className="bg-transparent border-none outline-none text-xs w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {isAdmin && (
          <button className="px-4 py-2 bg-[#1B365D] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#1B365D]/90 shadow-md flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>Assign Instructor</span>
          </button>
        )}
      </div>

      <table className="w-full text-left bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        <thead className="bg-[#F4F1EA] text-[10px] uppercase tracking-widest font-bold text-gray-500">
          <tr>
            <th className="p-4">Instructor Name</th>
            <th className="p-4">Students</th>
            <th className="p-4">Groups</th>
            <th className="p-4">Days</th>
            <th className="p-4">Hours</th>
            <th className="p-4">Status</th>
            <th className="p-4">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-xs">
          {paginatedData.map(item => (
            <tr key={item.id} className={item.hasOverlap ? 'bg-red-50' : ''}>
              <td className="p-4 font-bold text-gray-900">
                {item.teacherName}
                {item.hasOverlap && <div className="text-[9px] text-red-600 font-bold uppercase">Overlap Warning!</div>}
              </td>
              <td className="p-4">{item.assignedStudentsCount}</td>
              <td className="p-4">{item.assignedGroupsCount}</td>
              <td className="p-4">{item.practiceDaysCount}</td>
              <td className="p-4">{item.practiceHours}</td>
              <td className="p-4"><span className="px-2 py-1 bg-green-50 text-green-700 rounded-lg font-bold">{item.status}</span></td>
              <td className="p-4 flex gap-2">
                <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Eye className="w-4 h-4" /></button>
                <button className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                <button onClick={() => onRemove(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {totalPages > 1 && (
        <div className="flex gap-2 items-center justify-center p-4">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 border rounded-lg disabled:opacity-50">Prev</button>
          <span className="text-xs font-bold">Page {currentPage} of {totalPages}</span>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 border rounded-lg disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}
