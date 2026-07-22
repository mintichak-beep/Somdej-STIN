import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, query, where, updateDoc, Timestamp, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Course, PracticeSite, StudentGroup } from '../../types';
import { Search, Filter, Plus, Edit, Trash2, Archive, ChevronLeft, ChevronRight, X, AlertTriangle, BookOpen } from 'lucide-react';

export function CourseDirectory() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [sites, setSites] = useState<PracticeSite[]>([]);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('active');
  const [sortField, setSortField] = useState<keyof Course>('code');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    academicYear: new Date().getFullYear(),
    semester: 1,
    practiceHours: 0,
    practicePeriod: '',
    status: 'active' as 'active' | 'archived',
    selectedGroups: [] as string[],
    selectedSites: [] as string[],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [coursesSnap, sitesSnap, groupsSnap] = await Promise.all([
        getDocs(collection(db, 'courses')),
        getDocs(collection(db, 'practiceSites')),
        getDocs(collection(db, 'studentGroups'))
      ]);

      const fetchedCourses = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      const fetchedSites = sitesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PracticeSite));
      const fetchedGroups = groupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentGroup));

      setCourses(fetchedCourses);
      setSites(fetchedSites);
      setGroups(fetchedGroups);
    } catch (err) {
      console.error("Error fetching data:", err);
      setErrorMsg("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (course?: Course) => {
    setErrorMsg('');
    if (course) {
      setEditingCourse(course);
      setFormData({
        code: course.code,
        name: course.name,
        description: course.description || '',
        academicYear: course.academicYear || new Date().getFullYear(),
        semester: course.semester || 1,
        practiceHours: course.practiceHours || 0,
        practicePeriod: course.practicePeriod || '',
        status: course.status || 'active',
        selectedGroups: course.studentGroups?.map(ref => ref.id) || [],
        selectedSites: course.practiceSites?.map(ref => ref.id) || [],
      });
    } else {
      setEditingCourse(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        academicYear: new Date().getFullYear(),
        semester: 1,
        practiceHours: 0,
        practicePeriod: '',
        status: 'active',
        selectedGroups: [],
        selectedSites: [],
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    try {
      const groupRefs = formData.selectedGroups.map(id => doc(db, 'studentGroups', id));
      const siteRefs = formData.selectedSites.map(id => doc(db, 'practiceSites', id));

      const courseData = {
        code: formData.code,
        name: formData.name,
        description: formData.description,
        academicYear: Number(formData.academicYear),
        semester: Number(formData.semester),
        practiceHours: Number(formData.practiceHours),
        practicePeriod: formData.practicePeriod,
        status: formData.status,
        studentGroups: groupRefs,
        practiceSites: siteRefs,
        updatedAt: Timestamp.now(),
      };

      if (editingCourse) {
        await updateDoc(doc(db, 'courses', editingCourse.id), courseData);
      } else {
        const courseRef = await addDoc(collection(db, 'courses'), {
          ...courseData,
          createdAt: Timestamp.now(),
        });
        
        // Auto-create Practice Project
        await addDoc(collection(db, 'practiceProjects'), {
          courseId: courseRef,
          status: 'planning',
          progress: 0,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
      
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error("Error saving course:", err);
      setErrorMsg("Failed to save course. Please check your permissions.");
    }
  };

  const handleDelete = async (courseId: string) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    
    try {
      // Prevent deleting if referenced by Practice Projects
      const projectsQuery = query(
        collection(db, 'practiceProjects'), 
        where('courseId', '==', doc(db, 'courses', courseId))
      );
      const projectsSnap = await getDocs(projectsQuery);
      
      if (!projectsSnap.empty) {
        alert('Cannot delete this course because it is referenced by existing Practice Projects.');
        return;
      }

      await deleteDoc(doc(db, 'courses', courseId));
      fetchData();
    } catch (err) {
      console.error("Error deleting course:", err);
      alert("Failed to delete course.");
    }
  };

  const handleArchive = async (courseId: string) => {
    if (!window.confirm('Are you sure you want to archive this course?')) return;
    try {
      await updateDoc(doc(db, 'courses', courseId), {
        status: 'archived',
        updatedAt: Timestamp.now()
      });
      fetchData();
    } catch (err) {
      console.error("Error archiving course:", err);
      alert("Failed to archive course.");
    }
  };

  // Filter, Search, Sort
  const processedCourses = useMemo(() => {
    let result = [...courses];
    
    // Filter
    if (filterStatus !== 'all') {
      result = result.filter(c => c.status === filterStatus);
    }
    
    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.code?.toLowerCase().includes(q) || 
        c.name?.toLowerCase().includes(q) ||
        c.academicYear?.toString().includes(q)
      );
    }
    
    // Sort
    result.sort((a, b) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [courses, filterStatus, searchQuery, sortField, sortDir]);

  // Pagination
  const totalPages = Math.ceil(processedCourses.length / itemsPerPage);
  const currentData = processedCourses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSort = (field: keyof Course) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  return (
    <div className="flex flex-col h-full space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-4xl md:text-5xl font-serif italic mb-2 tracking-tighter text-[#1A1A1A]">Clinical Courses</h2>
          <p className="text-sm text-[#1A1A1A]/60 max-w-md">Master directory for all clinical practice courses, prerequisites, and resource allocations.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 bg-[#1B365D] text-white text-[10px] uppercase tracking-widest font-bold hover:bg-[#1B365D]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Course
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 p-4 border border-[#1A1A1A]/10 bg-white">
        <div className="flex items-center gap-2 bg-[#F4F1EA] px-3 py-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#1A1A1A]/40" />
          <input 
            type="text" 
            placeholder="Search by code, name, year..." 
            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-[#1A1A1A]/40"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#1A1A1A]/40" />
          <select 
            className="bg-[#F4F1EA] border-none outline-none text-[10px] uppercase tracking-widest font-bold px-3 py-2 cursor-pointer"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 overflow-auto border border-[#1A1A1A]/10 bg-white">
        {loading ? (
          <div className="p-10 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B365D]"></div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1A1A1A]/10 bg-[#F4F1EA]">
                <th className="p-4 text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60 cursor-pointer hover:text-[#1A1A1A]" onClick={() => toggleSort('code')}>
                  Code {sortField === 'code' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-4 text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60 cursor-pointer hover:text-[#1A1A1A]" onClick={() => toggleSort('name')}>
                  Course Name {sortField === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-4 text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60 cursor-pointer hover:text-[#1A1A1A]" onClick={() => toggleSort('academicYear')}>
                  Term {sortField === 'academicYear' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-4 text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60 cursor-pointer hover:text-[#1A1A1A]" onClick={() => toggleSort('practiceHours')}>
                  Hours {sortField === 'practiceHours' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-4 text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Status</th>
                <th className="p-4 text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-sm text-[#1A1A1A]/40 italic font-serif">
                    No courses found matching your criteria.
                  </td>
                </tr>
              ) : (
                currentData.map(course => (
                  <tr key={course.id} className="border-b border-[#1A1A1A]/5 hover:bg-[#F4F1EA]/50 transition-colors">
                    <td className="p-4 text-sm font-bold text-[#1B365D]">{course.code}</td>
                    <td className="p-4 text-sm">{course.name}</td>
                    <td className="p-4 text-sm text-[#1A1A1A]/60">{course.academicYear} / S{course.semester}</td>
                    <td className="p-4 text-sm text-[#1A1A1A]/60">{course.practiceHours}h</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-[10px] uppercase tracking-widest font-bold rounded-sm ${course.status === 'active' ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-[#1A1A1A]/10 text-[#1A1A1A]/60'}`}>
                        {course.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenModal(course)} className="p-2 text-[#1A1A1A]/40 hover:text-[#1B365D] transition-colors" title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                        {course.status !== 'archived' && (
                          <button onClick={() => handleArchive(course.id)} className="p-2 text-[#1A1A1A]/40 hover:text-[#D4AF37] transition-colors" title="Archive">
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => handleDelete(course.id)} className="p-2 text-[#1A1A1A]/40 hover:text-red-600 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center px-4">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/40">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, processedCourses.length)} of {processedCourses.length}
          </p>
          <div className="flex gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="p-2 bg-white border border-[#1A1A1A]/10 disabled:opacity-50 hover:bg-[#F4F1EA]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="p-2 bg-white border border-[#1A1A1A]/10 disabled:opacity-50 hover:bg-[#F4F1EA]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/20 backdrop-blur-sm p-4">
          <div className="bg-[#F4F1EA] w-full max-w-2xl max-h-[90vh] flex flex-col border border-[#1A1A1A]/10 shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-[#1A1A1A]/10 bg-white">
              <h3 className="text-2xl font-serif italic">{editingCourse ? 'Edit Course' : 'New Course'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#1A1A1A]/40 hover:text-[#1A1A1A]">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              {errorMsg && (
                <div className="bg-red-50 text-red-600 p-4 text-sm flex items-center gap-2 border border-red-200">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {errorMsg}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Course Code</label>
                  <input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full p-3 bg-white border border-[#1A1A1A]/10 text-sm focus:outline-none focus:border-[#1B365D]" placeholder="e.g. NUR 101" />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Course Name</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 bg-white border border-[#1A1A1A]/10 text-sm focus:outline-none focus:border-[#1B365D]" placeholder="e.g. Intro to Clinical Nursing" />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Academic Year</label>
                  <input required type="number" value={formData.academicYear} onChange={e => setFormData({...formData, academicYear: parseInt(e.target.value)})} className="w-full p-3 bg-white border border-[#1A1A1A]/10 text-sm focus:outline-none focus:border-[#1B365D]" />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Semester</label>
                  <input required type="number" min="1" max="3" value={formData.semester} onChange={e => setFormData({...formData, semester: parseInt(e.target.value)})} className="w-full p-3 bg-white border border-[#1A1A1A]/10 text-sm focus:outline-none focus:border-[#1B365D]" />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Practice Hours</label>
                  <input required type="number" min="0" value={formData.practiceHours} onChange={e => setFormData({...formData, practiceHours: parseInt(e.target.value)})} className="w-full p-3 bg-white border border-[#1A1A1A]/10 text-sm focus:outline-none focus:border-[#1B365D]" />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Practice Period</label>
                  <input required type="text" value={formData.practicePeriod} onChange={e => setFormData({...formData, practicePeriod: e.target.value})} className="w-full p-3 bg-white border border-[#1A1A1A]/10 text-sm focus:outline-none focus:border-[#1B365D]" placeholder="e.g. Weeks 1-8" />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Description</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-3 bg-white border border-[#1A1A1A]/10 text-sm focus:outline-none focus:border-[#1B365D] min-h-[80px]" placeholder="Course objectives and notes..."></textarea>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Assigned Student Groups</label>
                  <div className="border border-[#1A1A1A]/10 bg-white max-h-40 overflow-y-auto p-2 space-y-1">
                    {groups.length === 0 ? (
                      <p className="text-xs text-[#1A1A1A]/40 p-2 italic">No groups found in database.</p>
                    ) : groups.map(g => (
                      <label key={g.id} className="flex items-center gap-2 p-2 hover:bg-[#F4F1EA] cursor-pointer text-sm">
                        <input 
                          type="checkbox" 
                          checked={formData.selectedGroups.includes(g.id)}
                          onChange={(e) => {
                            if (e.target.checked) setFormData({...formData, selectedGroups: [...formData.selectedGroups, g.id]});
                            else setFormData({...formData, selectedGroups: formData.selectedGroups.filter(id => id !== g.id)});
                          }}
                        />
                        {g.name} (Yr {g.year})
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Eligible Practice Sites</label>
                  <div className="border border-[#1A1A1A]/10 bg-white max-h-40 overflow-y-auto p-2 space-y-1">
                    {sites.length === 0 ? (
                      <p className="text-xs text-[#1A1A1A]/40 p-2 italic">No sites found in database.</p>
                    ) : sites.map(s => (
                      <label key={s.id} className="flex items-center gap-2 p-2 hover:bg-[#F4F1EA] cursor-pointer text-sm">
                        <input 
                          type="checkbox" 
                          checked={formData.selectedSites.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) setFormData({...formData, selectedSites: [...formData.selectedSites, s.id]});
                            else setFormData({...formData, selectedSites: formData.selectedSites.filter(id => id !== s.id)});
                          }}
                        />
                        {s.name}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Status</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="status" value="active" checked={formData.status === 'active'} onChange={() => setFormData({...formData, status: 'active'})} /> Active
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="status" value="archived" checked={formData.status === 'archived'} onChange={() => setFormData({...formData, status: 'archived'})} /> Archived
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-[#1A1A1A]/10 flex justify-end gap-4 bg-[#F4F1EA] sticky bottom-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 border border-[#1A1A1A]/10 text-[#1A1A1A] text-[10px] uppercase tracking-widest font-bold hover:bg-white transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-3 bg-[#1B365D] text-white text-[10px] uppercase tracking-widest font-bold hover:bg-[#1B365D]/90 transition-colors">
                  Save Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
