import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { PracticeProject, Course, StudentAssignment, Student, User } from '../../types';
import { ArrowLeft, Edit, Calendar, Clock, MapPin, Search } from 'lucide-react';

export function ProjectAssignments() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [project, setProject] = useState<PracticeProject | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Record<string, StudentAssignment>>({});
  const [instructors, setInstructors] = useState<{id: string, name: string}[]>([]);

  // Editing state
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState<Partial<StudentAssignment>>({});
  
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (id) fetchAssignmentsData();
  }, [id]);

  const fetchAssignmentsData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Project & Course
      const projectDoc = await getDoc(doc(db, 'practiceProjects', id!));
      if (!projectDoc.exists()) return;
      const projectData = { id: projectDoc.id, ...projectDoc.data() } as PracticeProject;
      setProject(projectData);

      const courseDoc = await getDoc(projectData.courseId);
      const courseData = { id: courseDoc.id, ...courseDoc.data() } as Course;
      setCourse(courseData);

      // 2. Fetch Students from Course Groups
      let allStudents: Student[] = [];
      if (courseData.studentGroups && courseData.studentGroups.length > 0) {
        // We have to query students by groupId. To avoid complex 'in' queries that might fail if > 10,
        // we'll query for each group
        const studentPromises = courseData.studentGroups.map(groupRef => 
          getDocs(query(collection(db, 'students'), where('groupId', '==', groupRef)))
        );
        const studentSnaps = await Promise.all(studentPromises);
        allStudents = studentSnaps.flatMap(snap => snap.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
      }
      setStudents(allStudents);

      // 3. Fetch Existing Assignments for this project
      const assignSnap = await getDocs(query(collection(db, 'studentAssignments'), where('projectId', '==', doc(db, 'practiceProjects', id!))));
      const assignMap: Record<string, StudentAssignment> = {};
      assignSnap.docs.forEach(d => {
        const data = d.data() as StudentAssignment;
        if (data.studentId) {
          assignMap[data.studentId.id] = { id: d.id, ...data };
        }
      });
      setAssignments(assignMap);

      // 4. Fetch Instructors (Teachers)
      const teacherSnap = await getDocs(collection(db, 'teachers'));
      const teachersData = teacherSnap.docs.map(d => ({ id: d.id, name: d.data().name }));
      setInstructors(teachersData);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    const existing = assignments[student.id];
    setFormData({
      ward: existing?.ward || '',
      unit: existing?.unit || '',
      shift: existing?.shift || 'morning',
      practiceDate: existing?.practiceDate || Timestamp.now(),
      startTime: existing?.startTime || '08:00',
      endTime: existing?.endTime || '16:00',
      practiceNotes: existing?.practiceNotes || '',
      primaryInstructorId: existing?.primaryInstructorId,
      secondaryInstructorId: existing?.secondaryInstructorId,
      status: existing?.status || 'assigned'
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setSaving(true);
    
    try {
      const existing = assignments[editingStudent.id];
      const payload: any = {
        projectId: doc(db, 'practiceProjects', id!),
        studentId: doc(db, 'students', editingStudent.id),
        status: formData.status || 'assigned',
        ward: formData.ward || '',
        unit: formData.unit || '',
        shift: formData.shift || '',
        practiceDate: formData.practiceDate,
        startTime: formData.startTime || '',
        endTime: formData.endTime || '',
        practiceNotes: formData.practiceNotes || '',
      };

      if (formData.primaryInstructorId) payload.primaryInstructorId = doc(db, 'teachers', formData.primaryInstructorId as any);
      if (formData.secondaryInstructorId) payload.secondaryInstructorId = doc(db, 'teachers', formData.secondaryInstructorId as any);

      if (existing) {
        await updateDoc(doc(db, 'studentAssignments', existing.id), payload);
        setAssignments(prev => ({ ...prev, [editingStudent.id]: { ...existing, ...payload } }));
      } else {
        const newRef = doc(collection(db, 'studentAssignments'));
        await setDoc(newRef, payload);
        setAssignments(prev => ({ ...prev, [editingStudent.id]: { id: newRef.id, ...payload } }));
      }
      
      setEditingStudent(null);
    } catch (err) {
      console.error(err);
      alert('Failed to save assignment');
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.studentId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B365D]"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-6">
        <div className="flex items-center gap-4">
          <Link to={`/admin/projects/${id}`} className="p-2 bg-white border border-[#1A1A1A]/10 hover:bg-[#F4F1EA] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60 bg-[#1A1A1A]/5 px-2 py-0.5">Project Assignments</span>
            </div>
            <h2 className="text-3xl font-serif italic text-[#1B365D]">{course?.name}</h2>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Student List */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2 bg-white border border-[#1A1A1A]/10 px-3 py-2">
            <Search className="w-4 h-4 text-[#1A1A1A]/40" />
            <input 
              type="text" 
              placeholder="Search students..." 
              className="bg-transparent border-none outline-none text-sm w-full placeholder:text-[#1A1A1A]/40"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="grid gap-4">
            {filteredStudents.length === 0 ? (
              <p className="text-sm text-[#1A1A1A]/40 italic">No students found.</p>
            ) : (
              filteredStudents.map(student => {
                const assignment = assignments[student.id];
                return (
                  <div key={student.id} className="bg-white border border-[#1A1A1A]/10 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-[#1B365D]">{student.name}</h4>
                      <p className="text-xs text-[#1A1A1A]/60 font-mono">{student.studentId}</p>
                    </div>
                    
                    <div className="flex-1 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#1A1A1A]/60">
                      {assignment ? (
                        <>
                          <div className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {assignment.ward || '-'} / {assignment.unit || '-'}</div>
                          <div className="flex items-center gap-1"><Clock className="w-4 h-4" /> {assignment.shift} ({assignment.startTime} - {assignment.endTime})</div>
                          <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {assignment.practiceDate?.toDate().toLocaleDateString() || '-'}</div>
                        </>
                      ) : (
                        <p className="text-xs italic text-orange-500">Not Assigned</p>
                      )}
                    </div>

                    <button 
                      onClick={() => handleEdit(student)}
                      className="px-4 py-2 border border-[#1A1A1A]/10 text-[10px] uppercase tracking-widest font-bold hover:bg-[#F4F1EA] transition-colors shrink-0"
                    >
                      <Edit className="w-4 h-4 inline-block mr-1" /> Edit
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Edit Panel */}
        {editingStudent && (
          <div className="w-full md:w-96 shrink-0 bg-white border border-[#1A1A1A]/10 p-6 sticky top-6">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-[#1B365D] mb-1">Edit Assignment</h3>
              <p className="text-sm text-[#1A1A1A]/60">{editingStudent.name} ({editingStudent.studentId})</p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Ward / Site</label>
                <input required type="text" value={formData.ward || ''} onChange={e => setFormData({...formData, ward: e.target.value})} className="w-full p-2 bg-[#F4F1EA] border-none text-sm focus:ring-1 focus:ring-[#1B365D]" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Unit</label>
                <input required type="text" value={formData.unit || ''} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full p-2 bg-[#F4F1EA] border-none text-sm focus:ring-1 focus:ring-[#1B365D]" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Shift</label>
                  <select value={formData.shift || 'morning'} onChange={e => setFormData({...formData, shift: e.target.value})} className="w-full p-2 bg-[#F4F1EA] border-none text-sm focus:ring-1 focus:ring-[#1B365D]">
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="night">Night</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Date</label>
                  <input required type="date" value={formData.practiceDate ? formData.practiceDate.toDate().toISOString().split('T')[0] : ''} onChange={e => setFormData({...formData, practiceDate: Timestamp.fromDate(new Date(e.target.value))})} className="w-full p-2 bg-[#F4F1EA] border-none text-sm focus:ring-1 focus:ring-[#1B365D]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Start Time</label>
                  <input required type="time" value={formData.startTime || ''} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full p-2 bg-[#F4F1EA] border-none text-sm focus:ring-1 focus:ring-[#1B365D]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">End Time</label>
                  <input required type="time" value={formData.endTime || ''} onChange={e => setFormData({...formData, endTime: e.target.value})} className="w-full p-2 bg-[#F4F1EA] border-none text-sm focus:ring-1 focus:ring-[#1B365D]" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Primary Instructor</label>
                <select value={(formData.primaryInstructorId as any)?.id || formData.primaryInstructorId || ''} onChange={e => setFormData({...formData, primaryInstructorId: e.target.value as any})} className="w-full p-2 bg-[#F4F1EA] border-none text-sm focus:ring-1 focus:ring-[#1B365D]">
                  <option value="">-- Select Instructor --</option>
                  {instructors.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Secondary Instructor</label>
                <select value={(formData.secondaryInstructorId as any)?.id || formData.secondaryInstructorId || ''} onChange={e => setFormData({...formData, secondaryInstructorId: e.target.value as any})} className="w-full p-2 bg-[#F4F1EA] border-none text-sm focus:ring-1 focus:ring-[#1B365D]">
                  <option value="">-- Select Instructor --</option>
                  {instructors.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Notes</label>
                <textarea value={formData.practiceNotes || ''} onChange={e => setFormData({...formData, practiceNotes: e.target.value})} className="w-full p-2 bg-[#F4F1EA] border-none text-sm focus:ring-1 focus:ring-[#1B365D] min-h-[80px]" placeholder="Specific instructions..."></textarea>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setEditingStudent(null)} className="px-4 py-2 border border-[#1A1A1A]/10 text-[10px] uppercase tracking-widest font-bold hover:bg-[#F4F1EA] transition-colors">
                  Cancel
                </button>
                <button disabled={saving} type="submit" className="px-4 py-2 bg-[#1B365D] text-white text-[10px] uppercase tracking-widest font-bold hover:bg-[#1B365D]/90 transition-colors disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
