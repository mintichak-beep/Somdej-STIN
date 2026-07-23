import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc, Timestamp, DocumentReference, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Course, PracticeSite, StudentGroup, Student, Teacher } from '../../types';
import { StudentProfileModal } from './StudentProfileModal';
import { Plus, Search, Filter, ArrowUpDown, Eye, Edit2, Archive, Users, MapPin, Map, Bed, Bus, User } from 'lucide-react';

interface CourseStudentGroupsTabProps {
  course: Course;
  isAdmin: boolean;
  triggerSuccess: (msg: string) => void;
  triggerError: (msg: string) => void;
  allSites: PracticeSite[];
  allTeachers: Teacher[];
}

export function CourseStudentGroupsTab({
  course,
  isAdmin,
  triggerSuccess,
  triggerError,
  allSites,
  allTeachers
}: CourseStudentGroupsTabProps) {
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modals
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showStudentProfileModal, setShowStudentProfileModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<StudentGroup | null>(null);
  const [viewingGroup, setViewingGroup] = useState<StudentGroup | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    practiceSiteId: '',
    primaryInstructorId: '',
    secondaryInstructorId: '',
    practicePeriod: '',
    studentIds: [] as string[]
  });

  const [allStudents, setAllStudents] = useState<Student[]>([]);

  const fetchAllStudents = async () => {
    try {
      const snap = await getDocs(collection(db, 'students'));
      setAllStudents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAllStudents();

    setLoading(true);
    const q = query(
      collection(db, 'studentGroups'),
      where('courseId', '==', doc(db, 'courses', course.id))
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StudentGroup));
      setGroups(groupsData);
      setLoading(false);
    }, (err) => {
      console.error(err);
      triggerError('Failed to fetch student groups');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [course.id]);

  // Sync helpers
  const handleSaveGroup = async () => {
    if (!formData.name || !formData.primaryInstructorId) {
      triggerError('Group Name and Primary Instructor are required.');
      return;
    }

    try {
      const groupData = {
        name: formData.name,
        courseId: doc(db, 'courses', course.id),
        practiceSiteId: formData.practiceSiteId ? doc(db, 'practiceSites', formData.practiceSiteId) : null,
        primaryInstructorId: formData.primaryInstructorId ? doc(db, 'teachers', formData.primaryInstructorId) : null,
        secondaryInstructorId: formData.secondaryInstructorId ? doc(db, 'teachers', formData.secondaryInstructorId) : null,
        practicePeriod: formData.practicePeriod,
        studentIds: formData.studentIds.map(id => doc(db, 'students', id)),
        updatedAt: Timestamp.now(),
      };

      if (editingGroup) {
        await updateDoc(doc(db, 'studentGroups', editingGroup.id), groupData);

        // Sync students
        const oldStudentIds = editingGroup.studentIds.map(ref => ref.id);
        const newStudentIds = formData.studentIds;

        // Students to remove (they were in the group but not anymore)
        const toRemove = oldStudentIds.filter(id => !newStudentIds.includes(id));
        for (const id of toRemove) {
          await updateDoc(doc(db, 'students', id), { groupId: null });
        }

        // Students to add (they are in the group now, but weren't before)
        const toAdd = newStudentIds.filter(id => !oldStudentIds.includes(id));
        for (const id of toAdd) {
          await updateDoc(doc(db, 'students', id), { groupId: doc(db, 'studentGroups', editingGroup.id) });
        }

        triggerSuccess('Group updated successfully');
      } else {
        const newDocRef = doc(collection(db, 'studentGroups'));
        await setDoc(newDocRef, {
          ...groupData,
          status: 'active',
          createdAt: Timestamp.now(),
        });
        
        // Sync students for new group
        for (const id of formData.studentIds) {
          await updateDoc(doc(db, 'students', id), { groupId: newDocRef });
        }

        // Add to course
        await updateDoc(doc(db, 'courses', course.id), {
          studentGroups: arrayUnion(newDocRef)
        });
        triggerSuccess('Group created successfully');
      }

      setShowAddEditModal(false);
      setEditingGroup(null);
    } catch (err) {
      console.error(err);
      triggerError('Failed to save group');
    }
  };

  const handleArchiveGroup = async (groupId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'archived' : 'active';
      await updateDoc(doc(db, 'studentGroups', groupId), { status: newStatus });
      triggerSuccess(`Group ${newStatus} successfully`);
    } catch (err) {
      console.error(err);
      triggerError('Failed to update group status');
    }
  };

  const filteredGroups = groups
    .filter(g => (statusFilter === 'all' ? true : g.status === statusFilter))
    .filter(g => g.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortOrder === 'asc') return a.name.localeCompare(b.name);
      return b.name.localeCompare(a.name);
    });

  const totalPages = Math.ceil(filteredGroups.length / itemsPerPage);
  const paginatedGroups = filteredGroups.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const openAddModal = () => {
    setEditingGroup(null);
    setFormData({
      name: '',
      practiceSiteId: '',
      primaryInstructorId: '',
      secondaryInstructorId: '',
      practicePeriod: '',
      studentIds: []
    });
    setShowAddEditModal(true);
  };

  const openEditModal = (g: StudentGroup) => {
    setEditingGroup(g);
    setFormData({
      name: g.name,
      practiceSiteId: g.practiceSiteId?.id || '',
      primaryInstructorId: g.primaryInstructorId?.id || '',
      secondaryInstructorId: g.secondaryInstructorId?.id || '',
      practicePeriod: g.practicePeriod || '',
      studentIds: g.studentIds?.map(ref => ref.id) || []
    });
    setShowAddEditModal(true);
  };

  const openViewModal = (g: StudentGroup) => {
    setViewingGroup(g);
    setShowViewModal(true);
  };

  const getSiteName = (id?: string) => allSites.find(s => s.id === id)?.name || 'Unassigned';
  const getTeacherName = (id?: string) => {
    const t = allTeachers.find(t => t.id === id);
    return t ? `${t.firstName} ${t.lastName}` : 'Unassigned';
  };

  if (loading) return <div className="p-8 text-center text-gray-500 text-sm font-medium">Loading Student Groups...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-sm font-extrabold text-[#1B365D] uppercase tracking-wider">{course.name} - Student Groups</h3>
          <p className="text-xs text-gray-500 mt-1">Manage cohorts allocated to complete their clinical assignments.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs w-full sm:w-48">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search groups..."
              className="bg-transparent border-none outline-none w-full text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          {/* Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>

          {/* Sort */}
          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-1 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
          </button>

          {isAdmin && (
            <button
              onClick={openAddModal}
              className="px-4 py-1.5 bg-[#1B365D] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#1B365D]/90 shadow-md flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Group</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {paginatedGroups.length === 0 ? (
        <div className="text-center p-12 text-gray-400 italic bg-gray-50 rounded-2xl border border-gray-100">
          No student groups found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedGroups.map(group => (
            <div key={group.id} className="border border-gray-100 bg-white p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-gray-200 transition-all group">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-blue-50 text-[#1B365D] rounded-xl"><Users className="w-4 h-4" /></span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${group.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {group.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openViewModal(group)} className="p-1.5 text-gray-400 hover:text-[#1B365D] hover:bg-blue-50 rounded-lg transition-all" title="View">
                      <Eye className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <>
                        <button onClick={() => openEditModal(group)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleArchiveGroup(group.id, group.status)} className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all" title={group.status === 'active' ? 'Archive' : 'Restore'}>
                          <Archive className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-900">{group.name}</h4>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {getSiteName(group.practiceSiteId?.id)}
                  </p>
                </div>
                
                <div className="pt-3 border-t border-gray-50 text-xs text-gray-600 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Students</span>
                    <strong className="text-gray-800">{group.studentIds?.length || 0}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Primary</span>
                    <strong className="text-gray-800 truncate max-w-[120px]">{getTeacherName(group.primaryInstructorId?.id)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Secondary</span>
                    <strong className="text-gray-800 truncate max-w-[120px]">{group.secondaryInstructorId ? getTeacherName(group.secondaryInstructorId.id) : '-'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Period</span>
                    <strong className="text-gray-800">{group.practicePeriod || '-'}</strong>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-gray-500 font-medium">Page {currentPage} of {totalPages}</span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
            className="px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showAddEditModal && (
        <div className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-6">{editingGroup ? 'Edit Student Group' : 'Add Student Group'}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-extrabold text-gray-400 mb-1">Group Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm"
                  placeholder="e.g. Cohort A"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-extrabold text-gray-400 mb-1">Practice Site</label>
                <select
                  value={formData.practiceSiteId}
                  onChange={e => setFormData({ ...formData, practiceSiteId: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm"
                >
                  <option value="">-- Unassigned --</option>
                  {allSites.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-extrabold text-gray-400 mb-1">Primary Instructor *</label>
                  <select
                    value={formData.primaryInstructorId}
                    onChange={e => setFormData({ ...formData, primaryInstructorId: e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm"
                  >
                    <option value="">-- Select --</option>
                    {allTeachers.map(t => (
                      <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-extrabold text-gray-400 mb-1">Secondary Instructor</label>
                  <select
                    value={formData.secondaryInstructorId}
                    onChange={e => setFormData({ ...formData, secondaryInstructorId: e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm"
                  >
                    <option value="">-- Optional --</option>
                    {allTeachers.map(t => (
                      <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-extrabold text-gray-400 mb-1">Practice Period</label>
                <input
                  type="text"
                  value={formData.practicePeriod}
                  onChange={e => setFormData({ ...formData, practicePeriod: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm"
                  placeholder="e.g. 15 Aug 2026 - 30 Oct 2026"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-extrabold text-gray-400 mb-1">Assign Students ({formData.studentIds.length})</label>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-2 space-y-1">
                  {allStudents.map(student => (
                    <label key={student.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.studentIds.includes(student.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({ ...prev, studentIds: [...prev.studentIds, student.id] }));
                          } else {
                            setFormData(prev => ({ ...prev, studentIds: prev.studentIds.filter(id => id !== student.id) }));
                          }
                        }}
                        className="rounded border-gray-300 text-[#1B365D] focus:ring-[#1B365D]"
                      />
                      <span className="text-sm text-gray-700">{student.firstName} {student.lastName} <span className="text-gray-400 text-xs">({student.studentId})</span></span>
                    </label>
                  ))}
                  {allStudents.length === 0 && (
                    <div className="text-xs text-gray-400 p-2 italic">No students available.</div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveGroup}
                  className="px-6 py-2 bg-[#1B365D] text-white text-sm font-bold rounded-xl shadow-sm hover:bg-[#1B365D]/90"
                >
                  Save Group
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingGroup && (
        <div className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-2xl font-black text-[#1B365D]">{viewingGroup.name}</h3>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${viewingGroup.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {viewingGroup.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500">Course: {course.name}</p>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <Map className="w-5 h-5 text-[#1B365D] mt-0.5" />
                  <div>
                    <h4 className="text-[10px] uppercase font-extrabold text-gray-400 mb-0.5">Assigned Practice Site</h4>
                    <p className="text-sm font-bold text-gray-900">{getSiteName(viewingGroup.practiceSiteId?.id)}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <User className="w-5 h-5 text-[#1B365D] mt-0.5" />
                  <div>
                    <h4 className="text-[10px] uppercase font-extrabold text-gray-400 mb-0.5">Assigned Instructors</h4>
                    <p className="text-sm font-bold text-gray-900">
                      Primary: {getTeacherName(viewingGroup.primaryInstructorId?.id)}
                    </p>
                    {viewingGroup.secondaryInstructorId && (
                      <p className="text-sm text-gray-600 mt-1">
                        Secondary: {getTeacherName(viewingGroup.secondaryInstructorId.id)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <Bed className="w-5 h-5 text-[#1B365D] mt-0.5" />
                  <div>
                    <h4 className="text-[10px] uppercase font-extrabold text-gray-400 mb-0.5">Assigned Accommodation</h4>
                    <p className="text-sm font-bold text-gray-900">
                      Managed at Site Level
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <Bus className="w-5 h-5 text-[#1B365D] mt-0.5" />
                  <div>
                    <h4 className="text-[10px] uppercase font-extrabold text-gray-400 mb-0.5">Assigned Transportation</h4>
                    <p className="text-sm font-bold text-gray-900">
                      Managed in Planner
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-extrabold text-gray-900 mb-3 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                Assigned Students ({viewingGroup.studentIds?.length || 0})
              </h4>
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                {viewingGroup.studentIds && viewingGroup.studentIds.length > 0 ? (
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider font-extrabold text-gray-500">
                      <tr>
                        <th className="p-3">Student ID</th>
                        <th className="p-3">Name</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {viewingGroup.studentIds.map(ref => {
                        const std = allStudents.find(s => s.id === ref.id);
                        if (!std) return null;
                        return (
                          <tr key={std.id} className="hover:bg-gray-50/50">
                            <td className="p-3 font-mono text-gray-600">{std.studentId}</td>
                            <td className="p-3 font-medium text-gray-900 cursor-pointer hover:text-blue-600 underline" onClick={() => { setSelectedStudent(std); setShowStudentProfileModal(true); }}>{std.firstName} {std.lastName}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center text-sm text-gray-500 italic">
                    No students assigned to this group.
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {showStudentProfileModal && selectedStudent && (
        <StudentProfileModal
          student={selectedStudent}
          onClose={() => setShowStudentProfileModal(false)}
        />
      )}

    </div>
  );
}
