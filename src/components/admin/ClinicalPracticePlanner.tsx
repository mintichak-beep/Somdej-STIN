import React, { useState, useMemo } from 'react';
import { 
  StudentAssignment, Student, Teacher, PracticeSite, StudentGroup 
} from '../../types';
import { 
  Calendar, List, Search, ChevronLeft, ChevronRight, AlertTriangle, User, MapPin, Clock, Filter
} from 'lucide-react';

interface ClinicalPracticePlannerProps {
  assignments: StudentAssignment[];
  students: Student[];
  teachers: Teacher[];
  sites: PracticeSite[];
  studentGroups: StudentGroup[];
}

export function ClinicalPracticePlanner({ 
  assignments, students, teachers, sites, studentGroups 
}: ClinicalPracticePlannerProps) {
  const [view, setView] = useState<'calendar' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSite, setFilterSite] = useState<string>('all');
  
  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      const student = students.find(s => s.id === a.studentId.id);
      const site = sites.find(s => s.id === a.siteId?.id);
      
      const matchesSearch = student && `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSite = filterSite === 'all' || (site && site.id === filterSite);
      
      return matchesSearch && matchesSite;
    });
  }, [assignments, students, sites, searchQuery, filterSite]);

  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const days = [];
    const date = new Date(year, month, 1);
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [currentDate]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl w-64">
          <Search className="w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search student..." 
            className="bg-transparent border-none outline-none text-xs w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
            <button onClick={() => setView('calendar')} className={`p-2 rounded-xl ${view === 'calendar' ? 'bg-[#1B365D] text-white' : 'bg-gray-100'}`}><Calendar className="w-4 h-4" /></button>
            <button onClick={() => setView('list')} className={`p-2 rounded-xl ${view === 'list' ? 'bg-[#1B365D] text-white' : 'bg-gray-100'}`}><List className="w-4 h-4" /></button>
        </div>
      </div>

      {view === 'list' ? (
        <table className="w-full text-left bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
          <thead className="bg-[#F4F1EA] text-[10px] uppercase tracking-widest font-bold text-gray-500">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Student</th>
              <th className="p-4">Site</th>
              <th className="p-4">Ward/Unit</th>
              <th className="p-4">Shift</th>
              <th className="p-4">Instructors</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {filteredAssignments.map(a => {
              const student = students.find(s => s.id === a.studentId.id);
              const site = sites.find(s => s.id === a.siteId?.id);
              const primary = teachers.find(t => t.id === a.primaryInstructorId?.id);
              const secondary = teachers.find(t => t.id === a.secondaryInstructorId?.id);
              
              return (
                <tr key={a.id}>
                  <td className="p-4">{a.practiceDate?.toDate().toLocaleDateString()}</td>
                  <td className="p-4 font-bold">{student ? `${student.firstName} ${student.lastName}` : 'Unknown'}</td>
                  <td className="p-4">{site?.name || '-'}</td>
                  <td className="p-4">{a.ward || '-'} / {a.unit || '-'}</td>
                  <td className="p-4">{a.shift} ({a.startTime}-{a.endTime})</td>
                  <td className="p-4">{primary?.firstName} {primary?.lastName} {secondary ? `, ${secondary.firstName} ${secondary.lastName}` : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}><ChevronLeft /></button>
            <h2 className="text-sm font-bold">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}><ChevronRight /></button>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="text-center text-[10px] uppercase text-gray-400 font-bold">{d}</div>)}
            {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() }).map((_, i) => <div key={`empty-${i}`}></div>)}
            {daysInMonth.map(d => {
              const dayAssignments = filteredAssignments.filter(a => a.practiceDate?.toDate().toDateString() === d.toDateString());
              return (
                <div key={d.toDateString()} className="border p-2 rounded-xl min-h-[80px]">
                  <div className="text-[10px] font-bold">{d.getDate()}</div>
                  {dayAssignments.map(a => {
                    const student = students.find(s => s.id === a.studentId.id);
                    return <div key={a.id} className="text-[9px] bg-blue-50 text-blue-800 p-1 rounded mt-1 truncate">{student?.firstName}</div>
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
