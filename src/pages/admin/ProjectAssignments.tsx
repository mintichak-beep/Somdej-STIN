import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc, setDoc, Timestamp, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
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
  const [practiceSites, setPracticeSites] = useState<{id: string, name: string}[]>([]);

  // Editing state
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState<Partial<StudentAssignment>>({});
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!id) return;
    
    // 1. Setup listeners for project
    const unsubProject = onSnapshot(doc(db, 'practiceProjects', id), (docSnap) => {
      if (docSnap.exists()) {
        const projectData = { id: docSnap.id, ...docSnap.data() } as PracticeProject;
        setProject(projectData);
      }
    });

    // 2. Setup listener for assignments
    const q = query(collection(db, 'studentAssignments'), where('projectId', '==', doc(db, 'practiceProjects', id)));
    const unsubAssignments = onSnapshot(q, (snapshot) => {
      const assignMap: Record<string, StudentAssignment> = {};
      snapshot.docs.forEach(d => {
        const data = d.data() as StudentAssignment;
        if (data.studentId) {
          assignMap[data.studentId.id] = { id: d.id, ...data };
        }
      });
      setAssignments(assignMap);
    });

    // 3. Setup listener for teachers
    const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snap) => {
      setInstructors(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
    });

    // 4. Fetch initial other data
    fetchAssignmentsData();

    return () => {
      unsubProject();
      unsubAssignments();
      unsubTeachers();
    };
  }, [id]);

  const fetchAssignmentsData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Project & Course (initial)
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
        const studentPromises = courseData.studentGroups.map(groupRef => 
          getDocs(query(collection(db, 'students'), where('groupId', '==', groupRef)))
        );
        const studentSnaps = await Promise.all(studentPromises);
        allStudents = studentSnaps.flatMap(snap => snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.studentId || 'Student',
            studentId: data.studentId || ''
          } as unknown as Student;
        }));
      }
      setStudents(allStudents);

      // 3. Fetch Practice Sites
      const siteSnap = await getDocs(collection(db, 'practiceSites'));
      const sitesData = siteSnap.docs.map(d => ({ id: d.id, name: d.data().name }));
      setPracticeSites(sitesData);
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
      siteId: (existing?.siteId as any)?.id,
      status: existing?.status || 'assigned'
    });
  };

  const handleRemoveAssignment = async (assignmentId: string, studentId: string) => {
    if (!confirm('Are you sure you want to remove this assignment?')) return;
    try {
      await deleteDoc(doc(db, 'studentAssignments', assignmentId));
      setAssignments(prev => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
      alert('Assignment removed successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to remove assignment');
    }
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

      if (!formData.primaryInstructorId) {
        alert('Primary Instructor is required');
        return;
      }

      if (formData.primaryInstructorId) payload.primaryInstructorId = doc(db, 'teachers', formData.primaryInstructorId as any);
      if (formData.secondaryInstructorId) payload.secondaryInstructorId = doc(db, 'teachers', formData.secondaryInstructorId as any);
      if (formData.siteId) payload.siteId = doc(db, 'practiceSites', formData.siteId as any);

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

  const filteredStudents = students.filter(s => {
    const assignment = assignments[s.id];
    const matchesSearch = (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (s.studentId || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || (assignment ? assignment.status === filterStatus : filterStatus === 'unassigned');
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    const valA = sortField === 'name' ? (a.name || '') : (a.studentId || '');
    const valB = sortField === 'name' ? (b.name || '') : (b.studentId || '');
    return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });

  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

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
              <span className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60 bg-[#1A1A1A]/5 px-2 py-0.5">Clinical Practice Project Assignments</span>
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
              placeholder="Search Students..." 
              className="bg-transparent border-none outline-none text-sm w-full placeholder:text-[#1A1A1A]/40"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-4 items-center bg-white p-4 border border-[#1A1A1A]/10">
          <div className="flex items-center gap-2 border border-[#1A1A1A]/10 px-3 py-2 flex-1">
            <Search className="w-4 h-4 text-[#1A1A1A]/40" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="bg-transparent border-none outline-none text-sm w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select className="border border-[#1A1A1A]/10 p-2 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="assigned">Assigned</option>
            <option value="unassigned">Unassigned</option>
          </select>
          <select className="border border-[#1A1A1A]/10 p-2 text-sm" value={sortField} onChange={(e) => setSortField(e.target.value)}>
            <option value="name">Name</option>
            <option value="studentId">ID</option>
          </select>
          <button onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')} className="border border-[#1A1A1A]/10 p-2 text-sm">
            {sortDirection === 'asc' ? 'Asc' : 'Desc'}
          </button>
        </div>

        <table className="w-full text-left bg-white border border-[#1A1A1A]/10">
          <thead className="bg-[#F4F1EA] text-[10px] uppercase tracking-widest font-bold">
            <tr>
              <th className="p-4">Student ID</th>
              <th className="p-4">Name</th>
              <th className="p-4">Ward / Unit</th>
              <th className="p-4">Shift / Date</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A1A1A]/10 text-sm">
            {paginatedStudents.map(student => {
              const assignment = assignments[student.id];
              return (
                <tr key={student.id}>
                  <td className="p-4 font-mono text-[#1A1A1A]/60">{student.studentId}</td>
                  <td className="p-4 font-bold text-[#1B365D]">{student.name}</td>
                  <td className="p-4">{assignment ? `${assignment.ward || '-'} / ${assignment.unit || '-'}` : '-'}</td>
                  <td className="p-4">{assignment ? `${assignment.shift} (${assignment.practiceDate?.toDate().toLocaleDateString() || '-'})` : '-'}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-[10px] font-bold ${assignment ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {assignment ? assignment.status : 'Unassigned'}
                    </span>
                  </td>
                  <td className="p-4 flex gap-2">
                    <button onClick={() => handleEdit(student)} className="text-[#1B365D] font-bold hover:underline">Edit</button>
                    {assignment && (
                      <button onClick={() => handleRemoveAssignment(assignment.id, student.id)} className="text-red-600 font-bold hover:underline">Remove</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex gap-2 items-center justify-center p-4">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 border border-[#1A1A1A]/10 disabled:opacity-50">Prev</button>
            <span className="text-sm font-bold">Page {currentPage} of {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 border border-[#1A1A1A]/10 disabled:opacity-50">Next</button>
          </div>
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
                <label className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Practice Site</label>
                <select required value={formData.siteId || ''} onChange={e => setFormData({...formData, siteId: e.target.value})} className="w-full p-2 bg-[#F4F1EA] border-none text-sm focus:ring-1 focus:ring-[#1B365D]">
                  <option value="">-- Select Site --</option>
                  {practiceSites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Ward</label>
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
                <select required value={(formData.primaryInstructorId as any)?.id || formData.primaryInstructorId || ''} onChange={e => setFormData({...formData, primaryInstructorId: e.target.value as any})} className="w-full p-2 bg-[#F4F1EA] border-none text-sm focus:ring-1 focus:ring-[#1B365D]">
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
