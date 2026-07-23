import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, deleteDoc, query, where, updateDoc, Timestamp, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AcademicYear, Semester, Course, PracticeProject, Student } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, Plus, Edit, Trash2, Archive, 
  ChevronLeft, ChevronRight, X, AlertTriangle, 
  Calendar, CheckCircle2, Clock, BookOpen, Users, FolderKanban, ArrowRight
} from 'lucide-react';

export function AcademicYearDirectory() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const navigate = useNavigate();

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semestersMap, setSemestersMap] = useState<Record<string, Semester[]>>({});
  const [courses, setCourses] = useState<Course[]>([]);
  const [projects, setProjects] = useState<PracticeProject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'asc' | 'desc'>('newest');
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    year: '',
    status: 'active' as 'active' | 'inactive' | 'archived',
    description: '',
  });

  useEffect(() => {
    setLoading(true);
    const unsubYears = onSnapshot(collection(db, 'academicYears'), (snap) => {
      const years = snap.docs.map(d => ({ id: d.id, ...d.data() } as AcademicYear));
      setAcademicYears(years);

      // Fetch semesters for each year
      years.forEach(y => {
        onSnapshot(collection(db, `academicYears/${y.id}/semesters`), (semSnap) => {
          const sems = semSnap.docs.map(d => ({ id: d.id, academicYearId: y.id, ...d.data() } as Semester));
          setSemestersMap(prev => ({ ...prev, [y.id]: sems }));
        });
      });
      setLoading(false);
    }, (err) => {
      console.error("Error fetching academic years:", err);
      setLoading(false);
    });

    const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
      setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Course)));
    });

    const unsubProjects = onSnapshot(collection(db, 'practiceProjects'), (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as PracticeProject)));
    });

    const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
    });

    return () => {
      unsubYears();
      unsubCourses();
      unsubProjects();
      unsubStudents();
    };
  }, []);

  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const handleOpenModal = (yearObj?: AcademicYear) => {
    setErrorMsg('');
    if (yearObj) {
      setEditingYear(yearObj);
      setFormData({
        year: yearObj.year,
        status: yearObj.status,
        description: yearObj.description || '',
      });
    } else {
      setEditingYear(null);
      setFormData({
        year: (new Date().getFullYear() + 543).toString(), // Thai Buddhist year default or current
        status: 'active',
        description: '',
      });
    }
    setIsModalOpen(true);
  };

  const validateForm = () => {
    if (!formData.year.trim()) return "Academic Year is required (e.g. 2568).";
    // Check uniqueness
    const exists = academicYears.some(y => y.year.trim() === formData.year.trim() && y.id !== editingYear?.id);
    if (exists) return "This Academic Year already exists. Cannot create duplicates.";
    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }
    setErrorMsg('');

    try {
      // If setting this year as active, deactivate other years
      if (formData.status === 'active') {
        const activeYears = academicYears.filter(y => y.status === 'active' && y.id !== editingYear?.id);
        for (const ay of activeYears) {
          await updateDoc(doc(db, 'academicYears', ay.id), { status: 'inactive', updatedAt: Timestamp.now() });
        }
      }

      const payload = {
        year: formData.year.trim(),
        status: formData.status,
        description: formData.description.trim(),
        updatedAt: Timestamp.now(),
      };

      if (editingYear) {
        await updateDoc(doc(db, 'academicYears', editingYear.id), payload);
        triggerSuccess("Academic Year updated successfully.");
      } else {
        const docRef = await addDoc(collection(db, 'academicYears'), {
          ...payload,
          createdAt: Timestamp.now(),
        });
        // Auto-create default semesters 1 and 2
        await addDoc(collection(db, `academicYears/${docRef.id}/semesters`), {
          semesterNumber: 1,
          semesterName: 'Semester 1',
          startDate: `${formData.year}-06-01`,
          endDate: `${formData.year}-10-31`,
          status: 'active',
          createdAt: Timestamp.now(),
        });
        await addDoc(collection(db, `academicYears/${docRef.id}/semesters`), {
          semesterNumber: 2,
          semesterName: 'Semester 2',
          startDate: `${formData.year}-11-01`,
          endDate: `${Number(formData.year) + 1}-03-31`,
          status: 'inactive',
          createdAt: Timestamp.now(),
        });
        triggerSuccess("New Academic Year created successfully with default semesters.");
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error saving academic year:", err);
      setErrorMsg("Failed to save Academic Year. Please check database permissions.");
    }
  };

  const checkReferences = async (yearId: string) => {
    try {
      const yearRef = doc(db, 'academicYears', yearId);
      // Check courses referencing this year if applicable, or semesters
      const sems = semestersMap[yearId] || [];
      if (sems.length > 0) return true;

      const courseSnap = await getDocs(query(collection(db, 'courses'), where('academicYear', '==', Number(yearId))));
      if (!courseSnap.empty) return true;

      const projSnap = await getDocs(collection(db, 'practiceProjects'));
      if (!projSnap.empty) return true;

      return false;
    } catch (e) {
      console.error("Error checking references:", e);
      return false;
    }
  };

  const handleArchive = async (yearId: string) => {
    if (!window.confirm("Are you sure you want to archive this Academic Year?")) return;
    try {
      await updateDoc(doc(db, 'academicYears', yearId), {
        status: 'archived',
        updatedAt: Timestamp.now()
      });
      triggerSuccess("Academic Year archived successfully.");
    } catch (err) {
      console.error("Error archiving:", err);
      alert("Failed to archive academic year.");
    }
  };

  const handleDelete = async (yearId: string) => {
    if (!window.confirm("Are you sure you want to delete this Academic Year?")) return;
    const hasRefs = await checkReferences(yearId);
    if (hasRefs) {
      alert("This Academic Year is currently in use by semesters, courses, or projects and cannot be deleted.");
      return;
    }
    try {
      await deleteDoc(doc(db, 'academicYears', yearId));
      triggerSuccess("Academic Year deleted successfully.");
    } catch (err) {
      console.error("Error deleting:", err);
      alert("Failed to delete academic year.");
    }
  };

  // Filter, Search, Sort
  const filteredYears = useMemo(() => {
    let result = [...academicYears];

    if (filterStatus !== 'all') {
      result = result.filter(y => y.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(y => y.year.toLowerCase().includes(q) || (y.description || '').toLowerCase().includes(q));
    }

    result.sort((a, b) => {
      if (sortOption === 'newest') return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      if (sortOption === 'oldest') return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
      if (sortOption === 'asc') return a.year.localeCompare(b.year);
      if (sortOption === 'desc') return b.year.localeCompare(a.year);
      return 0;
    });

    return result;
  }, [academicYears, filterStatus, searchQuery, sortOption]);

  // Pagination
  const totalPages = Math.ceil(filteredYears.length / itemsPerPage) || 1;
  const currentData = filteredYears.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Summary Metrics
  const totalYearsCount = academicYears.length;
  const activeYear = academicYears.find(y => y.status === 'active');
  const totalSemestersCount = Object.values(semestersMap).reduce((acc: number, sems: any) => acc + (sems?.length || 0), 0);
  const activeSemestersCount = (Object.values(semestersMap) as Semester[][]).flat().filter((s: Semester) => s.status === 'active').length;

  return (
    <div className="flex flex-col h-full space-y-6 medical-pattern min-h-screen p-4 sm:p-6 lg:p-8">
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-lg transition-all animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-gray-100 shadow-xl">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-[#C62828] text-white rounded-2xl flex items-center justify-center shadow-md">
              <Calendar className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Academic Year Management</h1>
          </div>
          <p className="text-sm text-gray-600 font-medium ml-13">Manage academic years and semesters for clinical practice.</p>
        </div>

        {isAdmin && (
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#C62828] hover:bg-[#B71C1C] text-white text-xs uppercase tracking-wider font-bold rounded-2xl shadow-md hover:scale-105 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Academic Year</span>
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-gray-100 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">Total Academic Years</p>
            <h3 className="text-3xl font-extrabold text-gray-900">{totalYearsCount}</h3>
          </div>
          <div className="w-12 h-12 bg-red-50 text-[#C62828] rounded-2xl flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-gray-100 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">Current Academic Year</p>
            <h3 className="text-3xl font-extrabold text-emerald-600">{activeYear ? activeYear.year : 'None'}</h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-gray-100 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">Total Semesters</p>
            <h3 className="text-3xl font-extrabold text-[#1B365D]">{totalSemestersCount}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-gray-100 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">Active Semesters</p>
            <h3 className="text-3xl font-extrabold text-amber-600">{activeSemestersCount}</h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search, Filter & Sort Toolbar */}
      <div className="bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-gray-100 shadow-lg flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full max-w-lg">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by academic year or description..." 
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#C62828] transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-2xl border border-gray-200">
            <Filter className="w-4 h-4 text-gray-500" />
            <select 
              className="bg-transparent border-none outline-none text-xs uppercase tracking-wider font-bold text-gray-700 cursor-pointer"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-2xl border border-gray-200">
            <span className="text-xs uppercase tracking-wider font-bold text-gray-500">Sort:</span>
            <select 
              className="bg-transparent border-none outline-none text-xs uppercase tracking-wider font-bold text-gray-700 cursor-pointer"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="asc">Year Ascending</option>
              <option value="desc">Year Descending</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-2xl border border-gray-200">
            <span className="text-xs uppercase tracking-wider font-bold text-gray-500">Show:</span>
            <select 
              className="bg-transparent border-none outline-none text-xs uppercase tracking-wider font-bold text-gray-700 cursor-pointer"
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-gray-100 shadow-xl overflow-hidden flex-1">
        {loading ? (
          <div className="p-16 flex justify-center items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#C62828]"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80 text-gray-500 text-[11px] uppercase tracking-wider font-bold">
                  <th className="p-4">Academic Year</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Current Semester</th>
                  <th className="p-4">Clinical Courses</th>
                  <th className="p-4">Clinical Practice Projects</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {currentData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-gray-400 italic">
                      No academic years found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  currentData.map(y => {
                    const sems = semestersMap[y.id] || [];
                    const activeSem = sems.find(s => s.status === 'active');
                    const courseCount = courses.filter(c => c.academicYear?.toString() === y.year).length;
                    const projCount = projects.length;
                    const createdDateStr = y.createdAt?.toDate ? y.createdAt.toDate().toLocaleDateString() : 'N/A';

                    return (
                      <tr key={y.id} className="hover:bg-red-50/30 transition-colors group">
                        <td className="p-4 font-bold text-gray-900 flex items-center gap-3">
                          <div className="w-9 h-9 bg-red-50 text-[#C62828] rounded-xl flex items-center justify-center font-bold">
                            {y.year}
                          </div>
                          <div>
                            <span className="text-base font-extrabold text-gray-900">Academic Year {y.year}</span>
                            {y.description && <p className="text-xs text-gray-500 font-normal">{y.description}</p>}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 text-[10px] uppercase tracking-wider font-extrabold rounded-full ${y.status === 'active' ? 'bg-emerald-100 text-emerald-800' : y.status === 'inactive' ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-600'}`}>
                            {y.status}
                          </span>
                        </td>
                        <td className="p-4 text-gray-700 font-medium">
                          {activeSem ? `${activeSem.semesterName}` : 'None active'}
                        </td>
                        <td className="p-4 text-gray-700 font-medium">
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-xl text-xs font-bold">
                            <BookOpen className="w-3 h-3" /> {courseCount} Clinical Courses
                          </span>
                        </td>
                        <td className="p-4 text-gray-700 font-medium">
                          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2.5 py-1 rounded-xl text-xs font-bold">
                            <FolderKanban className="w-3 h-3" /> {projCount} Clinical Practice Projects
                          </span>
                        </td>
                        <td className="p-4 text-xs text-gray-500">{createdDateStr}</td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => navigate(`/admin/academic-years/${y.id}`)}
                              className="px-3 py-1.5 bg-red-50 hover:bg-[#C62828] hover:text-white text-[#C62828] rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                              title="View Details"
                            >
                              <span>Details</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                            {isAdmin && (
                              <>
                                <button 
                                  onClick={() => handleOpenModal(y)} 
                                  className="p-2 text-gray-400 hover:text-[#C62828] hover:bg-red-50 rounded-xl transition-all" 
                                  title="Edit Academic Year"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                {y.status !== 'archived' && (
                                  <button 
                                    onClick={() => handleArchive(y.id)} 
                                    className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all" 
                                    title="Archive Academic Year"
                                  >
                                    <Archive className="w-4 h-4" />
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleDelete(y.id)} 
                                  className="p-2 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all" 
                                  title="Delete Academic Year"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs uppercase tracking-wider font-bold text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredYears.length)} of {filteredYears.length} academic years
            </p>
            <div className="flex items-center gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="p-2 bg-white border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-gray-700 px-3">Page {currentPage} of {totalPages}</span>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="p-2 bg-white border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Academic Year Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg flex flex-col rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-scale-up">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#C62828] text-white rounded-2xl flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">{editingYear ? 'Edit Academic Year' : 'New Academic Year'}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-200/50 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#C62828] shrink-0" />
                  <span className="font-medium">{errorMsg}</span>
                </div>
              )}
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs uppercase tracking-wider font-extrabold text-gray-700">Academic Year * (e.g. 2568)</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.year} 
                    onChange={e => setFormData({...formData, year: e.target.value})} 
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#C62828] transition-all font-bold text-gray-900" 
                    placeholder="2568" 
                  />
                  <p className="text-[11px] text-gray-500">Academic year serves as the master root for all semesters and clinical courses.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs uppercase tracking-wider font-extrabold text-gray-700">Status</label>
                  <select 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value as any})} 
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#C62828] transition-all"
                  >
                    <option value="active">Active (Only one active year allowed)</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs uppercase tracking-wider font-extrabold text-gray-700">Description</label>
                  <textarea 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#C62828] transition-all min-h-[90px]" 
                    placeholder="Notes on academic year curriculum or clinical cycle..."
                  ></textarea>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex justify-end gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-6 py-3 border border-gray-200 text-gray-700 text-xs uppercase tracking-wider font-extrabold rounded-2xl hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-3 bg-[#C62828] hover:bg-[#B71C1C] text-white text-xs uppercase tracking-wider font-extrabold rounded-2xl shadow-md transition-all"
                >
                  Save Academic Year
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
