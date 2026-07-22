import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, doc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { StudentAssignment, Student, PracticeProject, Course } from '../types';
import { MapPin, Clock, Calendar, CheckCircle } from 'lucide-react';

export function StudentDashboard() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentRecord, setStudentRecord] = useState<Student | null>(null);
  const [assignments, setAssignments] = useState<(StudentAssignment & { project?: PracticeProject, course?: Course })[]>([]);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get Student Record
      const userRef = doc(db, 'users', currentUser!.uid);
      const studentSnap = await getDocs(query(collection(db, 'students'), where('userId', '==', userRef)));
      
      if (studentSnap.empty) {
        setLoading(false);
        return;
      }
      
      const sRecord = { id: studentSnap.docs[0].id, ...studentSnap.docs[0].data() } as Student;
      setStudentRecord(sRecord);

      // 2. Get Assignments
      const studentRef = doc(db, 'students', sRecord.id);
      const assignSnap = await getDocs(query(collection(db, 'studentAssignments'), where('studentId', '==', studentRef)));
      
      const assignData = await Promise.all(assignSnap.docs.map(async (d) => {
        const data = d.data() as StudentAssignment;
        let project: PracticeProject | undefined;
        let course: Course | undefined;
        
        if (data.projectId) {
          const pSnap = await getDocs(query(collection(db, 'practiceProjects'), where('__name__', '==', data.projectId.id)));
          if (!pSnap.empty) {
            project = { id: pSnap.docs[0].id, ...pSnap.docs[0].data() } as PracticeProject;
            if (project.courseId) {
              const cSnap = await getDocs(query(collection(db, 'courses'), where('__name__', '==', project.courseId.id)));
              if (!cSnap.empty) {
                course = { id: cSnap.docs[0].id, ...cSnap.docs[0].data() } as Course;
              }
            }
          }
        }
        
        return { id: d.id, ...data, project, course };
      }));

      // Sort by date (descending)
      assignData.sort((a, b) => {
        const dA = a.practiceDate?.toMillis() || 0;
        const dB = b.practiceDate?.toMillis() || 0;
        return dB - dA;
      });

      setAssignments(assignData);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const nextAssignment = assignments.find(a => (a.practiceDate?.toMillis() || 0) > Date.now() && a.status !== 'completed');

  return (
    <div className="flex flex-col h-full space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl md:text-5xl font-serif italic mb-2 tracking-tighter text-[#1A1A1A]">Student Hub</h2>
          <p className="text-sm text-[#1A1A1A]/60 max-w-md">Personalized course materials, assignments, and rotation schedules.</p>
        </div>
        <div className="text-right hidden sm:block">
          <span className="block text-4xl font-bold text-[#1B365D]">{assignments.filter(a => a.status !== 'completed').length}</span>
          <span className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/40">Active Assignments</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-none">
        {[
          { title: 'Current Ward', value: nextAssignment?.ward || '-', desc: 'Clinical Location' },
          { title: 'Next Practice', value: nextAssignment?.practiceDate ? nextAssignment.practiceDate.toDate().toLocaleDateString() : '-', desc: 'Scheduling Log' },
          { title: 'Next Shift', value: nextAssignment?.startTime || '-', desc: 'Logistics' },
          { title: 'Pending Assignments', value: assignments.filter(a => a.status !== 'completed').length.toString(), desc: 'Academic Records' },
        ].map((stat, idx) => (
          <div key={idx} className={`border border-[#1A1A1A]/10 p-5 flex flex-col justify-between transition-colors ${idx === 0 ? 'bg-[#1B365D] text-white' : 'hover:bg-white bg-transparent'}`}>
            <span className={`text-[10px] font-bold ${idx === 0 ? 'text-[#D4AF37]' : 'text-[#D4AF37]'}`}>RECORD</span>
            <h3 className="text-xl font-serif my-2">{stat.value}</h3>
            <p className={`text-[10px] uppercase tracking-widest font-bold ${idx === 0 ? 'opacity-60' : 'text-[#1A1A1A]/40'}`}>{stat.title}</p>
          </div>
        ))}
      </div>

      <div className="flex-1 bg-white border border-[#1A1A1A]/10 flex flex-col">
        <div className="p-4 border-b border-[#1A1A1A]/10 bg-[#F4F1EA]">
          <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> My Clinical Timetable
          </h3>
        </div>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-10 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B365D]"></div>
            </div>
          ) : assignments.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm italic font-serif text-[#1A1A1A]/40">You do not have any practice assignments yet.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1A1A1A]/10 bg-white">
                  <th className="p-4 text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Date</th>
                  <th className="p-4 text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Course</th>
                  <th className="p-4 text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Location</th>
                  <th className="p-4 text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Shift</th>
                  <th className="p-4 text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Status</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map(assign => (
                  <tr key={assign.id} className="border-b border-[#1A1A1A]/5 hover:bg-[#F4F1EA]/50 transition-colors">
                    <td className="p-4 text-sm font-bold text-[#1B365D]">
                      {assign.practiceDate ? assign.practiceDate.toDate().toLocaleDateString() : 'TBD'}
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-bold">{assign.course?.code}</p>
                      <p className="text-xs text-[#1A1A1A]/60 line-clamp-1">{assign.course?.name}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="w-3 h-3 text-[#1A1A1A]/40" />
                        {assign.ward || '-'} / {assign.unit || '-'}
                      </div>
                    </td>
                    <td className="p-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#1A1A1A]/40" />
                        <span className="capitalize">{assign.shift || '-'}</span> ({assign.startTime || ''} - {assign.endTime || ''})
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`flex items-center gap-1 w-max px-2 py-1 text-[10px] uppercase tracking-widest font-bold rounded-sm ${
                        assign.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-[#D4AF37]/20 text-[#D4AF37]'
                      }`}>
                        {assign.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                        {assign.status || 'Assigned'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
