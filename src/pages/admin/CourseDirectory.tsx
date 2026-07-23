import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, doc, deleteDoc, query, where, updateDoc, Timestamp, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Course, PracticeSite, StudentGroup, PracticeProject } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Search, Filter, Plus, Edit, Trash2, Archive, Eye,
  ChevronLeft, ChevronRight, X, AlertTriangle, 
  BookOpen, Download, RefreshCw, CheckCircle2, 
  Calendar, Clock, Award, Building2, Users
} from 'lucide-react';

export function CourseDirectory() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const isInstructor = currentUser?.role === 'instructor';
  const isStudent = currentUser?.role === 'student';

  const [courses, setCourses] = useState<Course[]>([]);
  const [sites, setSites] = useState<PracticeSite[]>([]);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [projects, setProjects] = useState<PracticeProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  
  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('active');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterSemester, setFilterSemester] = useState<string>('all');
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
    credits: 3,
    description: '',
    academicYear: new Date().getFullYear(),
    semester: 1,
    practiceHours: 45,
    practicePeriod: '',
    practiceStartDate: '',
    practiceEndDate: '',
    status: 'active' as 'active' | 'archived',
    selectedGroups: [] as string[],
    selectedSites: [] as string[],
  });

  useEffect(() => {
    setLoading(true);
    // Realtime snapshot listeners
    const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
      setCourses(fetched);
      setLoading(false);
    }, (err) => {
      console.error("Error listening to courses:", err);
      setLoading(false);
    });

    const unsubSites = onSnapshot(collection(db, 'practiceSites'), (snap) => {
      setSites(snap.docs.map(d => ({ id: d.id, ...d.data() } as PracticeSite)));
    });

    const unsubGroups = onSnapshot(collection(db, 'studentGroups'), (snap) => {
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentGroup)));
    });

    const unsubProjects = onSnapshot(collection(db, 'practiceProjects'), (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as PracticeProject)));
    }, (err) => {
      console.error("Error listening to projects:", err);
    });

    return () => {
      unsubCourses();
      unsubSites();
      unsubGroups();
      unsubProjects();
    };
  }, []);

  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const handleOpenModal = (course?: Course) => {
    setErrorMsg('');
    if (course) {
      setEditingCourse(course);
      setFormData({
        code: course.code,
        name: course.name,
        credits: course.credits || 3,
        description: course.description || '',
        academicYear: course.academicYear || new Date().getFullYear(),
        semester: course.semester || 1,
        practiceHours: course.practiceHours || 0,
        practicePeriod: course.practicePeriod || '',
        practiceStartDate: course.practiceStartDate || '',
        practiceEndDate: course.practiceEndDate || '',
        status: course.status || 'active',
        selectedGroups: course.studentGroups?.map(ref => ref.id) || [],
        selectedSites: course.practiceSites?.map(ref => ref.id) || [],
      });
    } else {
      setEditingCourse(null);
      setFormData({
        code: '',
        name: '',
        credits: 3,
        description: '',
        academicYear: new Date().getFullYear(),
        semester: 1,
        practiceHours: 45,
        practicePeriod: '',
        practiceStartDate: '',
        practiceEndDate: '',
        status: 'active',
        selectedGroups: [],
        selectedSites: [],
      });
    }
    setIsModalOpen(true);
  };

  const validateForm = () => {
    if (!formData.code.trim()) return "Clinical Course Code is required.";
    // Check uniqueness if new or code changed
    if (!editingCourse || editingCourse.code !== formData.code) {
      const exists = courses.some(c => c.code.toLowerCase() === formData.code.trim().toLowerCase());
      if (exists) return "Clinical Course Code must be unique. This code already exists.";
    }
    if (!formData.name.trim()) return "Clinical Course Name is required.";
    if (isNaN(Number(formData.credits)) || Number(formData.credits) <= 0) return "Credits must be a valid positive number.";
    if (isNaN(Number(formData.academicYear))) return "Academic Year must be a number.";
    if (isNaN(Number(formData.practiceHours)) || Number(formData.practiceHours) < 0) return "Practice Hours must be valid.";
    if (formData.practiceStartDate && formData.practiceEndDate) {
      if (new Date(formData.practiceEndDate) < new Date(formData.practiceStartDate)) {
        return "Practice End Date cannot be before Practice Start Date.";
      }
    }
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
      const groupRefs = formData.selectedGroups.map(id => doc(db, 'studentGroups', id));
      const siteRefs = formData.selectedSites.map(id => doc(db, 'practiceSites', id));

      const courseData = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        credits: Number(formData.credits),
        description: formData.description.trim(),
        academicYear: Number(formData.academicYear),
        semester: Number(formData.semester),
        practiceHours: Number(formData.practiceHours),
        practicePeriod: formData.practicePeriod.trim(),
        practiceStartDate: formData.practiceStartDate,
        practiceEndDate: formData.practiceEndDate,
        status: formData.status,
        studentGroups: groupRefs,
        practiceSites: siteRefs,
        updatedAt: Timestamp.now(),
      };

      if (editingCourse) {
        await updateDoc(doc(db, 'courses', editingCourse.id), courseData);
        triggerSuccess("Clinical Course successfully updated.");
      } else {
        const courseRef = await addDoc(collection(db, 'courses'), {
          ...courseData,
          createdAt: Timestamp.now(),
        });
        
        // Auto-create Practice Project linked to this course
        await addDoc(collection(db, 'practiceProjects'), {
          courseId: courseRef,
          status: 'planning',
          progress: 0,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        triggerSuccess("New Clinical Course successfully created.");
      }
      
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error saving course:", err);
      setErrorMsg("Failed to save Clinical Course. Please check your permissions.");
    }
  };

  const checkReferences = async (courseId: string) => {
    try {
      const courseRef = doc(db, 'courses', courseId);
      const projSnap = await getDocs(query(collection(db, 'practiceProjects'), where('courseId', '==', courseRef)));
      if (!projSnap.empty) return true;

      // Check student assignments or reports if applicable
      const assignSnap = await getDocs(collection(db, 'studentAssignments'));
      // if any project matches
      const projIds = projSnap.docs.map(d => d.ref);
      if (projIds.length > 0) {
        // check assignments
        for (const pRef of projIds) {
          const aMatch = assignSnap.docs.filter(d => d.data().projectId?.id === pRef.id);
          if (aMatch.length > 0) return true;
        }
      }
      return false;
    } catch (e) {
      console.error("Error checking references:", e);
      return false;
    }
  };

  const handleOpenProject = async (courseId: string) => {
    // Find project with courseId referencing this course ID
    const project = projects.find(p => p.courseId?.id === courseId);
    
    if (project) {
      navigate(`/admin/projects/${project.id}`);
    } else {
      // Create project on-the-fly to guarantee it exists, then navigate
      try {
        const courseRef = doc(db, 'courses', courseId);
        const newProjRef = await addDoc(collection(db, 'practiceProjects'), {
          courseId: courseRef,
          status: 'planning',
          progress: 0,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        navigate(`/admin/projects/${newProjRef.id}`);
      } catch (err) {
        console.error("Error creating project on the fly:", err);
        alert("Failed to open or create Clinical Practice Project.");
      }
    }
  };

  const handleArchive = async (courseId: string) => {
    if (!window.confirm('Are you sure you want to archive this Clinical Course?')) return;
    
    const isReferenced = await checkReferences(courseId);
    if (isReferenced) {
      alert("This Clinical Course is currently being used in active Clinical Practice Projects or student assignments and cannot be archived.");
      return;
    }

    try {
      await updateDoc(doc(db, 'courses', courseId), {
        status: 'archived',
        updatedAt: Timestamp.now()
      });
      triggerSuccess("Clinical Course archived successfully.");
    } catch (err) {
      console.error("Error archiving course:", err);
      alert("Failed to archive Clinical Course.");
    }
  };

  const handleDelete = async (courseId: string) => {
    if (!window.confirm('Are you sure you want to delete or archive this Clinical Course?')) return;
    
    const isReferenced = await checkReferences(courseId);
    if (isReferenced) {
      alert("This Clinical Course is currently being used and cannot be deleted or archived.");
      return;
    }

    try {
      await deleteDoc(doc(db, 'courses', courseId));
      triggerSuccess("Clinical Course deleted successfully.");
    } catch (err) {
      console.error("Error deleting course:", err);
      alert("Failed to delete Clinical Course.");
    }
  };

  // Unique Academic Years & Semesters for filters
  const availableYears = useMemo(() => {
    const years = new Set(courses.map(c => c.academicYear).filter(Boolean));
    return Array.from(years).sort((a: number, b: number) => b - a);
  }, [courses]);

  // Filter, Search, Sort
  const processedCourses = useMemo(() => {
    let result = [...courses];
    
    // Status filter
    if (filterStatus !== 'all') {
      result = result.filter(c => c.status === filterStatus);
    }

    // Year filter
    if (filterYear !== 'all') {
      result = result.filter(c => c.academicYear?.toString() === filterYear);
    }

    // Semester filter
    if (filterSemester !== 'all') {
      result = result.filter(c => c.semester?.toString() === filterSemester);
    }
    
    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.code?.toLowerCase().includes(q) || 
        c.name?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.academicYear?.toString().includes(q)
      );
    }
    
    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      if (aVal === undefined) aVal = '';
      if (bVal === undefined) bVal = '';
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [courses, filterStatus, filterYear, filterSemester, searchQuery, sortField, sortDir]);

  // Pagination
  const totalPages = Math.ceil(processedCourses.length / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const currentData = useMemo(() => {
    return processedCourses.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);
  }, [processedCourses, safeCurrentPage, itemsPerPage]);

  // Group processed courses by Academic Year and Semester (paginated data)
  const groupedCourses = useMemo(() => {
    const groups: Record<string, Course[]> = {};
    currentData.forEach(course => {
      const yearStr = course.academicYear ? `Academic Year ${course.academicYear}` : 'Unassigned Academic Year';
      const semStr = course.semester ? `Semester ${course.semester}` : 'Unassigned Semester';
      const key = `${yearStr} / ${semStr}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(course);
    });
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      return b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' });
    });
    const sortedGroups: Record<string, Course[]> = {};
    sortedKeys.forEach(key => {
      sortedGroups[key] = groups[key];
    });
    return sortedGroups;
  }, [currentData]);

  // Summary Metrics
  const totalCoursesCount = courses.length;
  const activeCoursesCount = courses.filter(c => c.status === 'active').length;
  const currentAcademicYear = availableYears[0] || new Date().getFullYear();
  const currentSemester = courses[0]?.semester || 1;

  const toggleSort = (field: keyof Course) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const exportCSV = () => {
    const headers = ['Clinical Course Code', 'Clinical Course Name', 'Credits', 'Academic Year', 'Semester', 'Practice Hours', 'Start Date', 'End Date', 'Status'];
    const rows = processedCourses.map(c => [
      c.code,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      c.credits || 3,
      c.academicYear || '',
      c.semester || '',
      c.practiceHours || 0,
      c.practiceStartDate || '',
      c.practiceEndDate || '',
      c.status || 'active'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `clinical_courses_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerSuccess("Clinical Courses exported to CSV successfully.");
  };

  return (
    <div className="flex flex-col h-full space-y-6 medical-pattern min-h-screen p-4 sm:p-6 lg:p-8">
      {/* Success Notification Banner */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-lg transition-all animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-gray-100 shadow-xl">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-[#C62828] text-white rounded-2xl flex items-center justify-center shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Clinical Course Directory</h1>
          </div>
          <p className="text-sm text-gray-600 font-medium ml-13">Manage all Clinical Courses, prerequisites, and resource allocations.</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs uppercase tracking-wider font-bold rounded-2xl shadow-sm transition-all"
            title="Export to CSV"
          >
            <Download className="w-4 h-4 text-[#C62828]" />
            <span>Export CSV</span>
          </button>
          
          <button
            onClick={() => triggerSuccess("Data is up-to-date (Real-time synced).")}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs uppercase tracking-wider font-bold rounded-2xl shadow-sm transition-all"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
            <span>Refresh</span>
          </button>

          {isAdmin && (
            <button 
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#C62828] hover:bg-[#B71C1C] text-white text-xs uppercase tracking-wider font-bold rounded-2xl shadow-md hover:scale-105 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Clinical Course</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-gray-100 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">Total Clinical Courses</p>
            <h3 className="text-3xl font-extrabold text-gray-900">{totalCoursesCount}</h3>
          </div>
          <div className="w-12 h-12 bg-red-50 text-[#C62828] rounded-2xl flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-gray-100 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">Active Clinical Courses</p>
            <h3 className="text-3xl font-extrabold text-emerald-600">{activeCoursesCount}</h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-gray-100 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">Current Academic Year</p>
            <h3 className="text-3xl font-extrabold text-[#1B365D]">{currentAcademicYear}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-gray-100 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">Current Semester</p>
            <h3 className="text-3xl font-extrabold text-amber-600">Semester {currentSemester}</h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-gray-100 shadow-lg flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full max-w-lg">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by code, name, or description..." 
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
              onChange={(e) => setFilterStatus(e.target.value as any)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-2xl border border-gray-200">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select 
              className="bg-transparent border-none outline-none text-xs uppercase tracking-wider font-bold text-gray-700 cursor-pointer"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
            >
              <option value="all">All Years</option>
              {availableYears.map(y => (
                <option key={y} value={y.toString()}>{y}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-2xl border border-gray-200">
            <Award className="w-4 h-4 text-gray-500" />
            <select 
              className="bg-transparent border-none outline-none text-xs uppercase tracking-wider font-bold text-gray-700 cursor-pointer"
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
            >
              <option value="all">All Semesters</option>
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
              <option value="3">Semester 3</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Table Container - Grouped by Academic Year and Semester */}
      <div className="space-y-6 flex-1">
        {loading ? (
          <div className="p-16 flex justify-center items-center bg-white/90 backdrop-blur-md rounded-3xl border border-gray-100 shadow-xl">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#C62828]"></div>
          </div>
        ) : Object.keys(groupedCourses).length === 0 ? (
          <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-gray-100 shadow-xl p-16 text-center text-gray-400 italic">
            No courses found matching your criteria.
          </div>
        ) : (
          Object.keys(groupedCourses).map(groupKey => (
            <div key={groupKey} className="bg-white/90 backdrop-blur-md rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
              {/* Group Header */}
              <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-150 flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-[#1B365D] uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#D4AF37]" />
                  {groupKey}
                </h3>
                <span className="px-3 py-1 bg-[#1B365D]/5 text-[#1B365D] text-xs font-extrabold rounded-full">
                  {groupedCourses[groupKey].length} {groupedCourses[groupKey].length === 1 ? 'Clinical Course' : 'Clinical Courses'}
                </span>
              </div>

              {/* Group Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/50 text-gray-600 text-xs uppercase tracking-wider font-extrabold">
                      <th className="p-4 cursor-pointer select-none text-left hover:bg-gray-100/50 transition-colors" onClick={() => toggleSort('code')}>
                        <div className="flex items-center gap-1.5">
                          Course Code
                          <span className="text-gray-400 text-[10px]">{sortField === 'code' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                        </div>
                      </th>
                      <th className="p-4 cursor-pointer select-none text-left hover:bg-gray-100/50 transition-colors" onClick={() => toggleSort('name')}>
                        <div className="flex items-center gap-1.5">
                          Course Name
                          <span className="text-gray-400 text-[10px]">{sortField === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                        </div>
                      </th>
                      <th className="p-4 cursor-pointer select-none text-left hover:bg-gray-100/50 transition-colors" onClick={() => toggleSort('credits')}>
                        <div className="flex items-center gap-1.5">
                          Credits
                          <span className="text-gray-400 text-[10px]">{sortField === 'credits' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                        </div>
                      </th>
                      <th className="p-4 cursor-pointer select-none text-left hover:bg-gray-100/50 transition-colors" onClick={() => toggleSort('academicYear')}>
                        <div className="flex items-center gap-1.5">
                          Academic Year
                          <span className="text-gray-400 text-[10px]">{sortField === 'academicYear' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                        </div>
                      </th>
                      <th className="p-4 cursor-pointer select-none text-left hover:bg-gray-100/50 transition-colors" onClick={() => toggleSort('semester')}>
                        <div className="flex items-center gap-1.5">
                          Semester
                          <span className="text-gray-400 text-[10px]">{sortField === 'semester' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                        </div>
                      </th>
                      <th className="p-4 cursor-pointer select-none text-left hover:bg-gray-100/50 transition-colors" onClick={() => toggleSort('practiceHours')}>
                        <div className="flex items-center gap-1.5">
                          Practice Hours
                          <span className="text-gray-400 text-[10px]">{sortField === 'practiceHours' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                        </div>
                      </th>
                      <th className="p-4 cursor-pointer select-none text-left hover:bg-gray-100/50 transition-colors" onClick={() => toggleSort('practicePeriod')}>
                        <div className="flex items-center gap-1.5">
                          Practice Period
                          <span className="text-gray-400 text-[10px]">{sortField === 'practicePeriod' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                        </div>
                      </th>
                      <th className="p-4 cursor-pointer select-none text-left hover:bg-gray-100/50 transition-colors" onClick={() => toggleSort('status')}>
                        <div className="flex items-center gap-1.5">
                          Status
                          <span className="text-gray-400 text-[10px]">{sortField === 'status' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                        </div>
                      </th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm font-medium">
                    {groupedCourses[groupKey].map(course => (
                      <tr key={course.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 font-extrabold text-[#C62828] cursor-pointer" onClick={() => handleOpenProject(course.id)}>
                          {course.code}
                        </td>
                        <td className="p-4 font-semibold text-gray-900 cursor-pointer" onClick={() => handleOpenProject(course.id)}>
                          <div>
                            <span>{course.name}</span>
                            {course.description && (
                              <p className="text-xs text-gray-500 font-normal line-clamp-1 mt-0.5">{course.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-gray-700">{course.credits || 3} Credits</td>
                        <td className="p-4 text-gray-700">{course.academicYear}</td>
                        <td className="p-4 text-gray-700">Semester {course.semester}</td>
                        <td className="p-4 text-gray-600">
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-xl text-xs font-bold">
                            <Clock className="w-3 h-3" /> {course.practiceHours} hrs
                          </span>
                        </td>
                        <td className="p-4 text-xs text-gray-500">
                          {course.practiceStartDate && course.practiceEndDate ? (
                            <span>{course.practiceStartDate} to {course.practiceEndDate}</span>
                          ) : (
                            <span>{course.practicePeriod || 'Not scheduled'}</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`inline-block px-3 py-1 text-[10px] uppercase tracking-wider font-extrabold rounded-full ${course.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>
                            {course.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            <button
                              onClick={() => handleOpenProject(course.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1B365D] hover:bg-[#1B365D]/90 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm transition-all"
                              title="Open Clinical Practice Project"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                            {isAdmin && (
                              <>
                                <button 
                                  onClick={() => handleOpenModal(course)} 
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-wider rounded-xl transition-all" 
                                  title="Edit Clinical Course"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                                {course.status !== 'archived' && (
                                  <button 
                                    onClick={() => handleArchive(course.id)} 
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-amber-200 hover:bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-all" 
                                    title="Archive Clinical Course"
                                  >
                                    <Archive className="w-3.5 h-3.5" />
                                    <span>Archive</span>
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleDelete(course.id)} 
                                  className="p-1.5 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all" 
                                  title="Delete Clinical Course"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-gray-100 shadow-lg">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
            Showing <span className="text-[#C62828]">{(safeCurrentPage - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="text-[#C62828]">{Math.min(safeCurrentPage * itemsPerPage, processedCourses.length)}</span> of{' '}
            <span className="text-gray-900">{processedCourses.length}</span> Clinical Courses
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={safeCurrentPage === 1}
              className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-9 h-9 text-xs font-bold uppercase rounded-xl transition-all ${
                  safeCurrentPage === page
                    ? 'bg-[#C62828] text-white shadow-md'
                    : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={safeCurrentPage === totalPages}
              className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Course Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-scale-up">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#C62828] text-white rounded-2xl flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">{editingCourse ? 'Edit Clinical Course' : 'New Clinical Course'}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-200/50 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#C62828] shrink-0" />
                  <span className="font-medium">{errorMsg}</span>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-xs uppercase tracking-wider font-extrabold text-gray-700">Clinical Course Code *</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.code} 
                    onChange={e => setFormData({...formData, code: e.target.value})} 
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#C62828] transition-all" 
                    placeholder="e.g. NUR301" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs uppercase tracking-wider font-extrabold text-gray-700">Clinical Course Name *</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#C62828] transition-all" 
                    placeholder="e.g. Adult Nursing Practice II" 
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="block text-xs uppercase tracking-wider font-extrabold text-gray-700">Credits *</label>
                  <input 
                    required 
                    type="number" 
                    min="1"
                    max="10"
                    value={formData.credits} 
                    onChange={e => setFormData({...formData, credits: parseInt(e.target.value) || 0})} 
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#C62828] transition-all" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs uppercase tracking-wider font-extrabold text-gray-700">Academic Year *</label>
                  <input 
                    required 
                    type="number" 
                    value={formData.academicYear} 
                    onChange={e => setFormData({...formData, academicYear: parseInt(e.target.value) || new Date().getFullYear()})} 
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#C62828] transition-all" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs uppercase tracking-wider font-extrabold text-gray-700">Semester *</label>
                  <select 
                    value={formData.semester} 
                    onChange={e => setFormData({...formData, semester: parseInt(e.target.value)})} 
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#C62828] transition-all"
                  >
                    <option value={1}>Semester 1</option>
                    <option value={2}>Semester 2</option>
                    <option value={3}>Semester 3 (Summer)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs uppercase tracking-wider font-extrabold text-gray-700">Practice Hours *</label>
                  <input 
                    required 
                    type="number" 
                    min="0" 
                    value={formData.practiceHours} 
                    onChange={e => setFormData({...formData, practiceHours: parseInt(e.target.value) || 0})} 
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#C62828] transition-all" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs uppercase tracking-wider font-extrabold text-gray-700">Practice Start Date</label>
                  <input 
                    type="date" 
                    value={formData.practiceStartDate} 
                    onChange={e => setFormData({...formData, practiceStartDate: e.target.value})} 
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#C62828] transition-all" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs uppercase tracking-wider font-extrabold text-gray-700">Practice End Date</label>
                  <input 
                    type="date" 
                    value={formData.practiceEndDate} 
                    onChange={e => setFormData({...formData, practiceEndDate: e.target.value})} 
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#C62828] transition-all" 
                  />
                </div>
                
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-xs uppercase tracking-wider font-extrabold text-gray-700">Description</label>
                  <textarea 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#C62828] transition-all min-h-[90px]" 
                    placeholder="Course objectives, clinical competencies, and instructions..."
                  ></textarea>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs uppercase tracking-wider font-extrabold text-gray-700">Assigned Student Groups</label>
                  <div className="border border-gray-200 bg-gray-50 rounded-2xl max-h-40 overflow-y-auto p-3 space-y-2">
                    {groups.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No student groups found.</p>
                    ) : groups.map(g => (
                      <label key={g.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-xl cursor-pointer text-sm font-medium transition-all">
                        <input 
                          type="checkbox" 
                          checked={formData.selectedGroups.includes(g.id)}
                          onChange={(e) => {
                            if (e.target.checked) setFormData({...formData, selectedGroups: [...formData.selectedGroups, g.id]});
                            else setFormData({...formData, selectedGroups: formData.selectedGroups.filter(id => id !== g.id)});
                          }}
                          className="w-4 h-4 text-[#C62828] rounded border-gray-300 focus:ring-[#C62828]"
                        />
                        <span>{g.name} (Year {g.year})</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs uppercase tracking-wider font-extrabold text-gray-700">Eligible Practice Sites</label>
                  <div className="border border-gray-200 bg-gray-50 rounded-2xl max-h-40 overflow-y-auto p-3 space-y-2">
                    {sites.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No practice sites found.</p>
                    ) : sites.map(s => (
                      <label key={s.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-xl cursor-pointer text-sm font-medium transition-all">
                        <input 
                          type="checkbox" 
                          checked={formData.selectedSites.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) setFormData({...formData, selectedSites: [...formData.selectedSites, s.id]});
                            else setFormData({...formData, selectedSites: formData.selectedSites.filter(id => id !== s.id)});
                          }}
                          className="w-4 h-4 text-[#C62828] rounded border-gray-300 focus:ring-[#C62828]"
                        />
                        <span>{s.name} ({s.location || 'Somdej Hospital'})</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-xs uppercase tracking-wider font-extrabold text-gray-700">Clinical Course Status</label>
                  <div className="flex gap-6 pt-1">
                    <label className="flex items-center gap-2.5 text-sm font-bold cursor-pointer">
                      <input 
                        type="radio" 
                        name="status" 
                        value="active" 
                        checked={formData.status === 'active'} 
                        onChange={() => setFormData({...formData, status: 'active'})} 
                        className="w-4 h-4 text-[#C62828]"
                      /> 
                      Active
                    </label>
                    <label className="flex items-center gap-2.5 text-sm font-bold cursor-pointer">
                      <input 
                        type="radio" 
                        name="status" 
                        value="archived" 
                        checked={formData.status === 'archived'} 
                        onChange={() => setFormData({...formData, status: 'archived'})} 
                        className="w-4 h-4 text-[#C62828]"
                      /> 
                      Archived
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex justify-end gap-4 sticky bottom-0 bg-white">
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
                  Save Clinical Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
