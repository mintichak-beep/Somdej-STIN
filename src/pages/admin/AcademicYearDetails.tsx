import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, onSnapshot, addDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AcademicYear, Semester, Course, PracticeProject } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ArrowLeft, Calendar, BookOpen, FolderKanban, Plus, Edit, 
  Trash2, Archive, CheckCircle2, Clock, X, AlertTriangle, Building2, Users
} from 'lucide-react';

export function AcademicYearDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const [yearData, setYearData] = useState<AcademicYear | null>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [projects, setProjects] = useState<PracticeProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');

  // Semester Modal State
  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState(false);
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
  const [semError, setSemError] = useState('');
  const [semForm, setSemForm] = useState({
    semesterNumber: 1,
    semesterName: 'Semester 1',
    startDate: '',
    endDate: '',
    status: 'active' as 'active' | 'inactive' | 'archived',
  });

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    const fetchYear = async () => {
      const docRef = doc(db, 'academicYears', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setYearData({ id: snap.id, ...snap.data() } as AcademicYear);
      }
      setLoading(false);
    };

    fetchYear();

    const unsubSems = onSnapshot(collection(db, `academicYears/${id}/semesters`), (snap) => {
      setSemesters(snap.docs.map(d => ({ id: d.id, academicYearId: id, ...d.data() } as Semester)));
    });

    const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
      // filter courses matching this academic year number
      setCourses(all);
    });

    const unsubProjects = onSnapshot(collection(db, 'practiceProjects'), (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as PracticeProject)));
    });

    return () => {
      unsubSems();
      unsubCourses();
      unsubProjects();
    };
  }, [id]);

  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const handleOpenSemesterModal = (sem?: Semester) => {
    setSemError('');
    if (sem) {
      setEditingSemester(sem);
      setSemForm({
        semesterNumber: sem.semesterNumber,
        semesterName: sem.semesterName,
        startDate: sem.startDate || '',
        endDate: sem.endDate || '',
        status: sem.status,
      });
    } else {
      setEditingSemester(null);
      setSemForm({
        semesterNumber: semesters.length + 1,
        semesterName: `Semester ${semesters.length + 1}`,
        startDate: '',
        endDate: '',
        status: semesters.length === 0 ? 'active' : 'inactive',
      });
    }
    setIsSemesterModalOpen(true);
  };

  const handleSaveSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!semForm.semesterName.trim()) {
      setSemError("Semester name is required.");
      return;
    }
    setSemError('');

    try {
      if (semForm.status === 'active') {
        // Deactivate other semesters in this year
        for (const s of semesters) {
          if (s.id !== editingSemester?.id && s.status === 'active') {
            await updateDoc(doc(db, `academicYears/${id}/semesters`, s.id), { status: 'inactive' });
          }
        }
      }

      const payload = {
        semesterNumber: Number(semForm.semesterNumber),
        semesterName: semForm.semesterName.trim(),
        startDate: semForm.startDate,
        endDate: semForm.endDate,
        status: semForm.status,
      };

      if (editingSemester) {
        await updateDoc(doc(db, `academicYears/${id}/semesters`, editingSemester.id), payload);
        triggerSuccess("Semester updated successfully.");
      } else {
        await addDoc(collection(db, `academicYears/${id}/semesters`), {
          ...payload,
          createdAt: Timestamp.now(),
        });
        triggerSuccess("Semester created successfully.");
      }
      setIsSemesterModalOpen(false);
    } catch (err) {
      console.error("Error saving semester:", err);
      setSemError("Failed to save semester.");
    }
  };

  const handleDeleteSemester = async (semId: string) => {
    if (!window.confirm("Are you sure you want to delete this semester?")) return;
    try {
      await deleteDoc(doc(db, `academicYears/${id}/semesters`, semId));
      triggerSuccess("Semester deleted successfully.");
    } catch (err) {
      console.error("Error deleting semester:", err);
      alert("Failed to delete semester.");
    }
  };

  if (loading) {
    return (
      <div className="p-16 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#C62828]"></div>
      </div>
    );
  }

  if (!yearData) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-gray-800">Academic Year not found</h2>
        <button onClick={() => navigate('/admin/academic-years')} className="mt-4 px-4 py-2 bg-[#C62828] text-white rounded-xl">Back to List</button>
      </div>
    );
  }

  const linkedCourses = courses.filter(c => c.academicYear?.toString() === yearData.year);

  return (
    <div className="flex flex-col h-full space-y-6 medical-pattern min-h-screen p-4 sm:p-6 lg:p-8">
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-lg transition-all animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Top Navigation & Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-gray-100 shadow-xl">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin/academic-years')}
            className="p-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-2xl transition-all"
            title="Back to Academic Years"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Academic Year {yearData.year}</h1>
              <span className={`px-3 py-1 text-[10px] uppercase tracking-wider font-extrabold rounded-full ${yearData.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>
                {yearData.status}
              </span>
            </div>
            <p className="text-sm text-gray-600 font-medium">{yearData.description || 'Master coordination hub for clinical practice semesters and courses.'}</p>
          </div>
        </div>

        {isAdmin && (
          <button 
            onClick={() => handleOpenSemesterModal()}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#C62828] hover:bg-[#B71C1C] text-white text-xs uppercase tracking-wider font-bold rounded-2xl shadow-md hover:scale-105 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Semester</span>
          </button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-gray-100 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">Total Semesters</p>
            <h3 className="text-3xl font-extrabold text-gray-900">{semesters.length}</h3>
          </div>
          <div className="w-12 h-12 bg-red-50 text-[#C62828] rounded-2xl flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-gray-100 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">Clinical Courses</p>
            <h3 className="text-3xl font-extrabold text-blue-600">{linkedCourses.length}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-gray-100 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">Clinical Practice Projects</p>
            <h3 className="text-3xl font-extrabold text-purple-600">{projects.length}</h3>
          </div>
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
            <FolderKanban className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Semesters Section */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-gray-100 shadow-xl p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Semesters & Terms</h3>
            <p className="text-xs text-gray-500">Manage terms and academic periods for Academic Year {yearData.year}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {semesters.length === 0 ? (
            <p className="text-xs text-gray-400 italic col-span-3 py-6 text-center">No semesters defined yet for this academic year.</p>
          ) : (
            semesters.map(sem => (
              <div key={sem.id} className="bg-gray-50/80 border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-red-300 transition-all">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-extrabold text-gray-900 text-base">{sem.semesterName}</span>
                    <span className={`px-2.5 py-0.5 text-[9px] uppercase tracking-wider font-extrabold rounded-full ${sem.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>
                      {sem.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600 mb-4">
                    <p><b>Number:</b> Semester {sem.semesterNumber}</p>
                    <p><b>Duration:</b> {sem.startDate || 'N/A'} to {sem.endDate || 'N/A'}</p>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200/60">
                    <button 
                      onClick={() => handleOpenSemesterModal(sem)}
                      className="p-2 text-gray-500 hover:text-[#C62828] hover:bg-white rounded-xl transition-all"
                      title="Edit Semester"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteSemester(sem.id)}
                      className="p-2 text-gray-500 hover:text-red-700 hover:bg-white rounded-xl transition-all"
                      title="Delete Semester"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Clinical Courses Linked Section */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-gray-100 shadow-xl p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Clinical Courses in Academic Year {yearData.year}</h3>
            <p className="text-xs text-gray-500">Courses linked automatically via Academic Year</p>
          </div>
          <button 
            onClick={() => navigate('/admin/courses')}
            className="text-xs uppercase tracking-wider font-bold text-[#C62828] hover:underline"
          >
            Manage Courses →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-[11px] uppercase tracking-wider font-bold">
                <th className="p-3">Course Code</th>
                <th className="p-3">Course Name</th>
                <th className="p-3">Credits</th>
                <th className="p-3">Practice Hours</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {linkedCourses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400 italic">
                    No clinical courses registered for this academic year yet.
                  </td>
                </tr>
              ) : (
                linkedCourses.map(c => (
                  <tr key={c.id} className="hover:bg-red-50/20">
                    <td className="p-3 font-bold text-[#C62828]">{c.code}</td>
                    <td className="p-3 font-semibold text-gray-900">{c.name}</td>
                    <td className="p-3 text-gray-700">{c.credits || 3}</td>
                    <td className="p-3 text-gray-700">{c.practiceHours || 0} hrs</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 text-[9px] uppercase tracking-wider font-bold bg-emerald-100 text-emerald-800 rounded-full">
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Semester Modal */}
      {isSemesterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md flex flex-col rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-scale-up">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#C62828] text-white rounded-2xl flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">{editingSemester ? 'Edit Semester' : 'Add Semester'}</h3>
              </div>
              <button onClick={() => setIsSemesterModalOpen(false)} className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-200/50 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveSemester} className="p-6 space-y-5">
              {semError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-2xl text-sm flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#C62828] shrink-0" />
                  <span className="font-medium">{semError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs uppercase tracking-wider font-extrabold text-gray-700">Semester Name *</label>
                <input 
                  required 
                  type="text" 
                  value={semForm.semesterName} 
                  onChange={e => setSemForm({...semForm, semesterName: e.target.value})} 
                  className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#C62828] transition-all" 
                  placeholder="e.g. Semester 1 or Summer Term" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs uppercase tracking-wider font-extrabold text-gray-700">Semester Number *</label>
                <input 
                  required 
                  type="number" 
                  min="1" 
                  max="3" 
                  value={semForm.semesterNumber} 
                  onChange={e => setSemForm({...semForm, semesterNumber: parseInt(e.target.value) || 1})} 
                  className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#C62828] transition-all" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs uppercase tracking-wider font-extrabold text-gray-700">Start Date</label>
                  <input 
                    type="date" 
                    value={semForm.startDate} 
                    onChange={e => setSemForm({...semForm, startDate: e.target.value})} 
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#C62828] transition-all" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs uppercase tracking-wider font-extrabold text-gray-700">End Date</label>
                  <input 
                    type="date" 
                    value={semForm.endDate} 
                    onChange={e => setSemForm({...semForm, endDate: e.target.value})} 
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#C62828] transition-all" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs uppercase tracking-wider font-extrabold text-gray-700">Status</label>
                <select 
                  value={semForm.status} 
                  onChange={e => setSemForm({...semForm, status: e.target.value as any})} 
                  className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#C62828] transition-all"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsSemesterModalOpen(false)} 
                  className="px-5 py-2.5 border border-gray-200 text-gray-700 text-xs uppercase tracking-wider font-extrabold rounded-2xl hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-[#C62828] hover:bg-[#B71C1C] text-white text-xs uppercase tracking-wider font-extrabold rounded-2xl shadow-md transition-all"
                >
                  Save Semester
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
