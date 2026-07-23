import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  doc, onSnapshot, getDoc, updateDoc, collection, 
  query, where, getDocs, addDoc, deleteDoc, arrayUnion, arrayRemove, Timestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Course, PracticeSite, StudentGroup, Student, Teacher, Transportation, Payment } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ArrowLeft, BookOpen, Calendar, Clock, MapPin, Users, UserCheck, 
  Bus, CreditCard, FileText, Settings, Plus, Search, Filter, 
  Download, Upload, Trash2, Edit, CheckCircle2, AlertTriangle, 
  FolderKanban, RefreshCw, LayoutDashboard, Bed, FileSpreadsheet, Eye
} from 'lucide-react';

export function CourseWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  // State
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Sub-collections data
  const [courseSites, setCourseSites] = useState<PracticeSite[]>([]);
  const [allAvailableSites, setAllAvailableSites] = useState<PracticeSite[]>([]);
  const [courseGroups, setCourseGroups] = useState<StudentGroup[]>([]);
  const [allAvailableGroups, setAllAvailableGroups] = useState<StudentGroup[]>([]);
  const [courseStudents, setCourseStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [transportations, setTransportations] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [accommodations, setAccommodations] = useState<any[]>([]);

  // Search/Filters
  const [studentSearch, setStudentSearch] = useState('');
  const [studentFilterGroup, setStudentFilterGroup] = useState('all');

  // Modals / Form States
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [showAssignInstructorModal, setShowAssignInstructorModal] = useState(false);
  const [showAddTransportModal, setShowAddTransportModal] = useState(false);
  const [showAddAccommodationModal, setShowAddAccommodationModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showAddDocumentModal, setShowAddDocumentModal] = useState(false);

  // Forms
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteAddress, setNewSiteAddress] = useState('');
  const [newSiteCapacity, setNewSiteCapacity] = useState('10');
  const [selectedSiteToLink, setSelectedSiteToLink] = useState('');

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCode, setNewGroupCode] = useState('');
  const [newGroupCount, setNewGroupCount] = useState('15');
  const [selectedGroupToLink, setSelectedGroupToLink] = useState('');

  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [instructorRole, setInstructorRole] = useState<'primary' | 'secondary'>('primary');

  const [transportRoute, setTransportRoute] = useState('');
  const [transportCapacity, setTransportCapacity] = useState('20');
  const [transportDriver, setTransportDriver] = useState('');
  const [transportCost, setTransportCost] = useState('500');

  const [accommodationName, setAccommodationName] = useState('');
  const [accommodationAddress, setAccommodationAddress] = useState('');
  const [accommodationRooms, setAccommodationRooms] = useState('5');
  const [accommodationCost, setAccommodationCost] = useState('1200');

  const [paymentStudentId, setPaymentStudentId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('3000');
  const [paymentType, setPaymentType] = useState('tuition');

  const [documentName, setDocumentName] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentType, setDocumentType] = useState('pdf');

  // Settings form
  const [settingsPeriod, setSettingsPeriod] = useState('');
  const [settingsStatus, setSettingsStatus] = useState<'active' | 'archived'>('active');
  const [settingsHours, setSettingsHours] = useState('45');

  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 4000);
  };

  // Real-time course data loader
  useEffect(() => {
    if (!id) return;
    setLoading(true);

    const unsubCourse = onSnapshot(doc(db, 'courses', id), async (snap) => {
      if (!snap.exists()) {
        triggerError('Clinical Course not found');
        setLoading(false);
        return;
      }
      const courseData = { id: snap.id, ...snap.data() } as Course;
      setCourse(courseData);
      setSettingsPeriod(courseData.practicePeriod || '');
      setSettingsStatus(courseData.status || 'active');
      setSettingsHours(courseData.practiceHours?.toString() || '45');

      // Fetch links
      // 1. Practice Sites
      if (courseData.practiceSites && courseData.practiceSites.length > 0) {
        const sitePromises = courseData.practiceSites.map(ref => getDoc(ref));
        const siteSnaps = await Promise.all(sitePromises);
        setCourseSites(siteSnaps.filter(s => s.exists()).map(s => ({ id: s.id, ...s.data() } as PracticeSite)));
      } else {
        setCourseSites([]);
      }

      // 2. Student Groups
      if (courseData.studentGroups && courseData.studentGroups.length > 0) {
        const groupPromises = courseData.studentGroups.map(ref => getDoc(ref));
        const groupSnaps = await Promise.all(groupPromises);
        const groupsList = groupSnaps.filter(g => g.exists()).map(g => ({ id: g.id, ...g.data() } as StudentGroup));
        setCourseGroups(groupsList);

        // Fetch Students belonging to these groups
        if (groupsList.length > 0) {
          const studentPromises = groupsList.map(group => 
            getDocs(query(collection(db, 'students'), where('groupId', '==', doc(db, 'studentGroups', group.id))))
          );
          const studentSnaps = await Promise.all(studentPromises);
          const list: Student[] = studentSnaps.flatMap(snap => snap.docs.map(d => ({
            id: d.id,
            ...d.data()
          } as Student)));
          setCourseStudents(list);
        } else {
          setCourseStudents([]);
        }
      } else {
        setCourseGroups([]);
        setCourseStudents([]);
      }

      setLoading(false);
    }, (err) => {
      console.error(err);
      triggerError('Failed to load course details');
      setLoading(false);
    });

    // Load other collections for selecting / adding links
    const unsubAllSites = onSnapshot(collection(db, 'practiceSites'), (snap) => {
      setAllAvailableSites(snap.docs.map(d => ({ id: d.id, ...d.data() } as PracticeSite)));
    });

    const unsubAllGroups = onSnapshot(collection(db, 'studentGroups'), (snap) => {
      setAllAvailableGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentGroup)));
    });

    const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snap) => {
      setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Sub-modules filtered by Course ID
    const unsubInstructors = onSnapshot(
      query(collection(db, 'teacherAssignments'), where('courseId', '==', id)),
      (snap) => {
        setInstructors(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );

    const unsubTransports = onSnapshot(
      query(collection(db, 'transportations'), where('courseId', '==', id)),
      (snap) => {
        setTransportations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );

    const unsubPayments = onSnapshot(
      query(collection(db, 'payments'), where('courseId', '==', id)),
      (snap) => {
        setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );

    const unsubDocs = onSnapshot(
      query(collection(db, 'courseDocuments'), where('courseId', '==', id)),
      (snap) => {
        setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );

    const unsubAcc = onSnapshot(
      query(collection(db, 'accommodations'), where('courseId', '==', id)),
      (snap) => {
        setAccommodations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );

    return () => {
      unsubCourse();
      unsubAllSites();
      unsubAllGroups();
      unsubTeachers();
      unsubInstructors();
      unsubTransports();
      unsubPayments();
      unsubDocs();
      unsubAcc();
    };
  }, [id]);

  // Operations
  // Practice Sites Assign/Create
  const handleLinkSite = async () => {
    if (!selectedSiteToLink || !course) return;
    try {
      const siteRef = doc(db, 'practiceSites', selectedSiteToLink);
      await updateDoc(doc(db, 'courses', course.id), {
        practiceSites: arrayUnion(siteRef)
      });
      triggerSuccess('Practice Site associated successfully.');
      setShowAddSiteModal(false);
    } catch (e) {
      triggerError('Failed to associate Practice Site.');
    }
  };

  const handleCreateAndLinkSite = async () => {
    if (!newSiteName || !course) return;
    try {
      const siteDoc = await addDoc(collection(db, 'practiceSites'), {
        name: newSiteName,
        address: newSiteAddress,
        capacity: Number(newSiteCapacity),
        status: 'active',
        createdAt: Timestamp.now()
      });
      await updateDoc(doc(db, 'courses', course.id), {
        practiceSites: arrayUnion(siteDoc)
      });
      triggerSuccess('New Practice Site created and linked.');
      setShowAddSiteModal(false);
      setNewSiteName('');
      setNewSiteAddress('');
    } catch (e) {
      triggerError('Failed to create site.');
    }
  };

  const handleUnlinkSite = async (siteId: string) => {
    if (!course) return;
    try {
      await updateDoc(doc(db, 'courses', course.id), {
        practiceSites: arrayRemove(doc(db, 'practiceSites', siteId))
      });
      triggerSuccess('Practice Site reference removed.');
    } catch (e) {
      triggerError('Failed to unlink site.');
    }
  };

  // Student Groups Link/Create
  const handleLinkGroup = async () => {
    if (!selectedGroupToLink || !course) return;
    try {
      const groupRef = doc(db, 'studentGroups', selectedGroupToLink);
      await updateDoc(doc(db, 'courses', course.id), {
        studentGroups: arrayUnion(groupRef)
      });
      triggerSuccess('Student Group linked to Clinical Course.');
      setShowAddGroupModal(false);
    } catch (e) {
      triggerError('Failed to link student group.');
    }
  };

  const handleCreateAndLinkGroup = async () => {
    if (!newGroupName || !course) return;
    try {
      const groupDoc = await addDoc(collection(db, 'studentGroups'), {
        name: newGroupName,
        code: newGroupCode,
        studentCount: Number(newGroupCount),
        createdAt: Timestamp.now()
      });
      await updateDoc(doc(db, 'courses', course.id), {
        studentGroups: arrayUnion(groupDoc)
      });
      triggerSuccess('New Student Group created and linked.');
      setShowAddGroupModal(false);
      setNewGroupName('');
      setNewGroupCode('');
    } catch (e) {
      triggerError('Failed to create student group.');
    }
  };

  const handleUnlinkGroup = async (groupId: string) => {
    if (!course) return;
    try {
      await updateDoc(doc(db, 'courses', course.id), {
        studentGroups: arrayRemove(doc(db, 'studentGroups', groupId))
      });
      triggerSuccess('Student Group reference removed.');
    } catch (e) {
      triggerError('Failed to unlink group.');
    }
  };

  // Instructor Assignments
  const handleAssignInstructor = async () => {
    if (!selectedTeacherId || !course) return;
    try {
      const teacherObj = teachers.find(t => t.id === selectedTeacherId);
      await addDoc(collection(db, 'teacherAssignments'), {
        courseId: course.id,
        teacherId: doc(db, 'teachers', selectedTeacherId),
        teacherName: teacherObj?.name || 'Unknown Teacher',
        role: instructorRole,
        assignedAt: Timestamp.now()
      });
      triggerSuccess('Instructor assigned successfully.');
      setShowAssignInstructorModal(false);
    } catch (e) {
      triggerError('Failed to assign instructor.');
    }
  };

  const handleRemoveInstructor = async (assignmentId: string) => {
    try {
      await deleteDoc(doc(db, 'teacherAssignments', assignmentId));
      triggerSuccess('Instructor assignment removed.');
    } catch (e) {
      triggerError('Failed to remove assignment.');
    }
  };

  // Accommodation
  const handleAddAccommodation = async () => {
    if (!accommodationName || !course) return;
    try {
      await addDoc(collection(db, 'accommodations'), {
        courseId: course.id,
        name: accommodationName,
        address: accommodationAddress,
        rooms: Number(accommodationRooms),
        costPerMonth: Number(accommodationCost),
        createdAt: Timestamp.now()
      });
      triggerSuccess('Accommodation details saved.');
      setShowAddAccommodationModal(false);
      setAccommodationName('');
      setAccommodationAddress('');
    } catch (e) {
      triggerError('Failed to save accommodation.');
    }
  };

  // Transportation
  const handleAddTransport = async () => {
    if (!transportRoute || !course) return;
    try {
      await addDoc(collection(db, 'transportations'), {
        courseId: course.id,
        route: transportRoute,
        capacity: Number(transportCapacity),
        driverName: transportDriver,
        costPerTrip: Number(transportCost),
        createdAt: Timestamp.now()
      });
      triggerSuccess('Transportation plan added.');
      setShowAddTransportModal(false);
      setTransportRoute('');
      setTransportDriver('');
    } catch (e) {
      triggerError('Failed to add transportation.');
    }
  };

  // Payments
  const handleAddPayment = async () => {
    if (!course) return;
    try {
      let studentObj = courseStudents.find(s => s.id === paymentStudentId);
      await addDoc(collection(db, 'payments'), {
        courseId: course.id,
        studentId: paymentStudentId,
        studentName: studentObj ? `${studentObj.firstName} ${studentObj.lastName}` : 'Unassigned Student',
        amount: Number(paymentAmount),
        type: paymentType,
        status: 'pending',
        createdAt: Timestamp.now()
      });
      triggerSuccess('Payment billing record generated.');
      setShowAddPaymentModal(false);
    } catch (e) {
      triggerError('Failed to generate payment billing.');
    }
  };

  const handleApprovePayment = async (paymentId: string) => {
    try {
      await updateDoc(doc(db, 'payments', paymentId), {
        status: 'approved',
        updatedAt: Timestamp.now()
      });
      triggerSuccess('Payment approved.');
    } catch (e) {
      triggerError('Failed to approve payment.');
    }
  };

  // Documents
  const handleAddDocument = async () => {
    if (!documentName || !course) return;
    try {
      await addDoc(collection(db, 'courseDocuments'), {
        courseId: course.id,
        name: documentName,
        url: documentUrl || '#',
        type: documentType,
        uploadedAt: Timestamp.now()
      });
      triggerSuccess('Document uploaded and stored.');
      setShowAddDocumentModal(false);
      setDocumentName('');
      setDocumentUrl('');
    } catch (e) {
      triggerError('Failed to upload document.');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await deleteDoc(doc(db, 'courseDocuments', docId));
      triggerSuccess('Document removed.');
    } catch (e) {
      triggerError('Failed to remove document.');
    }
  };

  // Settings Save
  const handleSaveSettings = async () => {
    if (!course) return;
    try {
      await updateDoc(doc(db, 'courses', course.id), {
        practicePeriod: settingsPeriod,
        practiceHours: Number(settingsHours),
        status: settingsStatus,
        updatedAt: Timestamp.now()
      });
      triggerSuccess('Clinical Course Settings updated successfully.');
    } catch (e) {
      triggerError('Failed to update Settings.');
    }
  };

  // Filtered Students list
  const filteredStudents = useMemo(() => {
    return courseStudents.filter(student => {
      const matchesSearch = `${student.firstName} ${student.lastName} ${student.studentId}`.toLowerCase().includes(studentSearch.toLowerCase());
      const matchesGroup = studentFilterGroup === 'all' || student.groupId?.id === studentFilterGroup;
      return matchesSearch && matchesGroup;
    });
  }, [courseStudents, studentSearch, studentFilterGroup]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#F4F1EA]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1B365D]"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-10 text-center bg-[#F4F1EA] h-screen flex flex-col justify-center items-center">
        <AlertTriangle className="w-12 h-12 text-[#C62828] mb-4" />
        <p className="text-lg font-serif italic text-gray-800 mb-4">Clinical Course could not be loaded or doesn't exist.</p>
        <Link to="/admin/courses" className="px-6 py-2 bg-[#1B365D] text-white rounded-xl text-sm font-semibold">Back to Clinical Course Directory</Link>
      </div>
    );
  }

  // Stats calculation
  const totalStudentsCount = courseStudents.length;
  const totalInstructorsCount = instructors.length;
  const totalSitesCount = courseSites.length;
  const totalAccommodationCount = accommodations.length;
  const totalTransportationCount = transportations.length;
  const totalPaymentSum = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const pendingPaymentSum = payments.filter(p => p.status === 'pending').reduce((acc, p) => acc + (p.amount || 0), 0);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'sites', label: 'Practice Site', icon: MapPin },
    { id: 'groups', label: 'Student Group', icon: Users },
    { id: 'students', label: 'Students', icon: UserCheck },
    { id: 'instructors', label: 'Instructors', icon: Users },
    { id: 'planner', label: 'Clinical Practice Planner', icon: FolderKanban },
    { id: 'timetable', label: 'Timetable', icon: Calendar },
    { id: 'accommodation', label: 'Accommodation', icon: Bed },
    { id: 'transportation', label: 'Transportation', icon: Bus },
    { id: 'invoice', label: 'Invoice', icon: FileSpreadsheet },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'reports', label: 'Reports', icon: FileText },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#F4F1EA] p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Notifications */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-lg fixed top-4 right-4 z-50">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-[#C62828] px-4 py-3 rounded-2xl flex items-center gap-3 shadow-lg fixed top-4 right-4 z-50">
          <AlertTriangle className="w-5 h-5 text-[#C62828] shrink-0" />
          <span className="text-sm font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* Header section with back button & details */}
      <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-gray-100 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin/courses')}
            className="p-3 bg-white border border-gray-200 hover:bg-gray-50 rounded-2xl shadow-sm transition-all text-gray-600"
            title="Back to Clinical Course Directory"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[10px] uppercase tracking-widest font-extrabold text-[#C62828] bg-red-50 px-2.5 py-0.5 rounded-full">{course.code}</span>
              <span className={`px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-extrabold rounded-full ${course.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>{course.status}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">{course.name}</h1>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Academic Year {course.academicYear} | Semester {course.semester} | {course.credits} Credits
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white border border-gray-100 px-4 py-2 rounded-2xl shadow-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Practice Hours</p>
              <p className="text-xs font-bold text-[#1B365D]">{course.practiceHours || 0} hrs</p>
            </div>
          </div>
          <div className="bg-white border border-gray-100 px-4 py-2 rounded-2xl shadow-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Practice Period</p>
              <p className="text-xs font-bold text-[#1B365D]">{course.practicePeriod || 'TBD'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Workspace Tabs Navigation */}
      <div className="bg-white border border-gray-100 rounded-3xl p-2 shadow-md overflow-x-auto flex gap-1 scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-[#1B365D] text-white shadow-md' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Panel */}
      <div className="flex-1 bg-white border border-gray-100 rounded-3xl shadow-xl p-6">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: 'Students Enrolled', value: totalStudentsCount, desc: 'Across active groups', icon: UserCheck, color: 'text-blue-600 bg-blue-50' },
                { title: 'Practice Sites', value: totalSitesCount, desc: 'Assigned clinics', icon: MapPin, color: 'text-[#D4AF37] bg-amber-50' },
                { title: 'Student Groups', value: courseGroups.length, desc: 'Allocated classes', icon: Users, color: 'text-emerald-600 bg-emerald-50' },
                { title: 'Instructors Assigned', value: totalInstructorsCount, desc: 'Clinical supervisors', icon: UserCheck, color: 'text-purple-600 bg-purple-50' },
              ].map((stat, i) => (
                <div key={i} className="border border-gray-100 p-5 rounded-2xl flex items-center justify-between bg-[#F4F1EA]/10 shadow-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-extrabold text-gray-400">{stat.title}</p>
                    <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{stat.value}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{stat.desc}</p>
                  </div>
                  <div className={`p-4 rounded-xl ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Course Detail Card */}
              <div className="lg:col-span-2 border border-gray-100 rounded-2xl p-6 space-y-4 bg-white shadow-sm">
                <h3 className="text-sm font-extrabold text-[#1B365D] uppercase tracking-wider border-b border-gray-100 pb-3">Clinical Course Summary</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{course.description || 'No description provided for this clinical course directory item.'}</p>
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100 text-sm">
                  <div>
                    <span className="text-xs text-gray-400 font-bold block uppercase">Academic Term</span>
                    <span className="font-bold text-gray-800">Year {course.academicYear} / Semester {course.semester}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 font-bold block uppercase">Practice Duration</span>
                    <span className="font-bold text-gray-800">{course.practiceHours} Clinical Hours</span>
                  </div>
                </div>
              </div>

              {/* Quick stats & summary */}
              <div className="border border-gray-100 rounded-2xl p-6 bg-[#F4F1EA]/30 shadow-sm space-y-4">
                <h3 className="text-sm font-extrabold text-[#1B365D] uppercase tracking-wider">Accounting Index</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                    <span className="text-xs font-semibold text-gray-600">Total Billed</span>
                    <span className="text-sm font-bold text-[#1B365D]">{totalPaymentSum.toLocaleString()} THB</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                    <span className="text-xs font-semibold text-gray-600">Pending Approvals</span>
                    <span className="text-sm font-bold text-amber-600">{pendingPaymentSum.toLocaleString()} THB</span>
                  </div>
                  <div className="flex justify-between items-center bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 shadow-sm">
                    <span className="text-xs font-bold text-emerald-800">Approved Payments</span>
                    <span className="text-sm font-extrabold text-emerald-700">{(totalPaymentSum - pendingPaymentSum).toLocaleString()} THB</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6 border-t border-gray-100">
              {/* Course Documents Catalog */}
              <div className="lg:col-span-2 border border-gray-100 rounded-2xl p-6 bg-white shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-extrabold text-[#1B365D] uppercase tracking-wider">Clinical Course Documents Catalog</h3>
                  <button
                    onClick={() => setShowAddDocumentModal(true)}
                    className="px-3 py-1.5 bg-[#1B365D] text-white text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-[#1B365D]/90 shadow-sm flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Document</span>
                  </button>
                </div>

                {documents.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-4">No files uploaded yet. Supported formats: PDF, Excel, Word, Images.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {documents.map(docu => (
                      <div key={docu.id} className="border border-gray-50 bg-gray-50/30 p-3 rounded-xl flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><FileText className="w-4 h-4" /></span>
                          <div>
                            <h4 className="text-xs font-bold text-gray-900 truncate max-w-[140px]">{docu.name}</h4>
                            <span className="text-[9px] uppercase font-semibold text-gray-400">{docu.type} file</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <a
                            href={docu.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-gray-400 hover:text-[#1B365D]"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => handleDeleteDocument(docu.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Course Settings */}
              <div className="border border-gray-100 rounded-2xl p-6 bg-white shadow-sm space-y-4">
                <h3 className="text-sm font-extrabold text-[#1B365D] uppercase tracking-wider border-b border-gray-100 pb-3">Clinical Course Settings</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-extrabold text-gray-400 mb-1">Practice Period</label>
                    <input
                      type="text"
                      placeholder="e.g. June 15 - July 30, 2568"
                      value={settingsPeriod}
                      onChange={(e) => setSettingsPeriod(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-extrabold text-gray-400 mb-1">Practice Hours limit</label>
                    <input
                      type="number"
                      placeholder="e.g. 45"
                      value={settingsHours}
                      onChange={(e) => setSettingsHours(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-extrabold text-gray-400 mb-1">Course Status</label>
                    <select
                      value={settingsStatus}
                      onChange={(e) => setSettingsStatus(e.target.value as any)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-xs bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleSaveSettings}
                      className="w-full py-2 bg-[#1B365D] text-white text-[10px] uppercase tracking-wider font-bold rounded-xl shadow-sm hover:bg-[#1B365D]/95 transition-all text-center"
                    >
                      Save Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRACTICE SITES */}
        {activeTab === 'sites' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-[#1B365D] uppercase tracking-wider">Assigned Practice Sites</h3>
                <p className="text-xs text-gray-500 mt-1">Manage physical locations where Students complete practice hours for this clinical course.</p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowAddSiteModal(true)}
                  className="px-4 py-2 bg-[#1B365D] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#1B365D]/90 shadow-md flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Assign Practice Site</span>
                </button>
              )}
            </div>

            {courseSites.length === 0 ? (
              <div className="text-center p-12 text-gray-400 italic">No Practice Sites assigned to this clinical course. Click the button to assign or create a site.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courseSites.map(site => (
                  <div key={site.id} className="border border-gray-100 bg-white p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-[#1B365D] transition-all">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="p-2.5 bg-amber-50 text-[#D4AF37] rounded-xl"><MapPin className="w-5 h-5" /></span>
                        <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full">ACTIVE</span>
                      </div>
                      <h4 className="text-lg font-bold text-gray-900 mb-1">{site.name}</h4>
                      <p className="text-xs text-gray-500 line-clamp-2">{site.address}</p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1B365D]">Capacity: {site.capacity} Students</span>
                      {isAdmin && (
                        <button 
                          onClick={() => handleUnlinkSite(site.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove Reference"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: STUDENT GROUPS */}
        {activeTab === 'groups' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-[#1B365D] uppercase tracking-wider">Student Group List</h3>
                <p className="text-xs text-gray-500 mt-1">Cohorts of Students registered for this Clinical Course.</p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowAddGroupModal(true)}
                  className="px-4 py-2 bg-[#1B365D] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#1B365D]/90 shadow-md flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Assign Student Group</span>
                </button>
              )}
            </div>

            {courseGroups.length === 0 ? (
              <div className="text-center p-12 text-gray-400 italic">No Student Groups currently linked to this clinical course.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courseGroups.map(group => (
                  <div key={group.id} className="border border-gray-100 bg-white p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-[#1B365D] transition-all">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Users className="w-5 h-5" /></span>
                        <span className="text-[10px] font-extrabold bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded-full">{group.code}</span>
                      </div>
                      <h4 className="text-lg font-bold text-gray-900 mb-1">{group.name}</h4>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-600">{group.studentCount || 0} enrolled students</span>
                      {isAdmin && (
                        <button 
                          onClick={() => handleUnlinkGroup(group.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove Group Link"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: STUDENTS */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-[#1B365D] uppercase tracking-wider">Student Roster</h3>
                <p className="text-xs text-gray-500 mt-1">Browse and search all individual students enrolled through active groups.</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search by Name/ID..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs w-full sm:w-60"
                  />
                </div>
                <select
                  value={studentFilterGroup}
                  onChange={(e) => setStudentFilterGroup(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-xs"
                >
                  <option value="all">All Groups</option>
                  {courseGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="text-center p-12 text-gray-400 italic">No matching Students found in this clinical course.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-[10px] uppercase tracking-wider font-extrabold">
                      <th className="p-4">Student ID</th>
                      <th className="p-4">Name</th>
                      <th className="p-4">Department</th>
                      <th className="p-4">Year Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {filteredStudents.map(student => (
                      <tr key={student.id} className="hover:bg-gray-50/50">
                        <td className="p-4 font-bold text-gray-900">{student.studentId}</td>
                        <td className="p-4 font-semibold text-[#1B365D]">{student.firstName} {student.lastName}</td>
                        <td className="p-4 text-gray-600">Nursing and Allied Health</td>
                        <td className="p-4 text-gray-600">Year 3</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: INSTRUCTORS */}
        {activeTab === 'instructors' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-[#1B365D] uppercase tracking-wider">Assigned Clinical Instructors</h3>
                <p className="text-xs text-gray-500 mt-1">Supervisors responsible for monitoring students at practice sites.</p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowAssignInstructorModal(true)}
                  className="px-4 py-2 bg-[#1B365D] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#1B365D]/90 shadow-md flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Assign Instructor</span>
                </button>
              )}
            </div>

            {instructors.length === 0 ? (
              <div className="text-center p-12 text-gray-400 italic">No instructors currently assigned to this course.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {instructors.map(ins => (
                  <div key={ins.id} className="border border-gray-100 bg-white p-5 rounded-2xl shadow-sm flex justify-between items-center">
                    <div>
                      <span className={`px-2 py-0.5 text-[9px] uppercase tracking-wider font-extrabold rounded-full ${ins.role === 'primary' ? 'bg-red-50 text-[#C62828]' : 'bg-gray-100 text-gray-600'}`}>
                        {ins.role} Instructor
                      </span>
                      <h4 className="text-lg font-bold text-gray-900 mt-2">{ins.teacherName}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">Assigned: {new Date(ins.assignedAt?.seconds * 1000).toLocaleDateString()}</p>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleRemoveInstructor(ins.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: CLINICAL PRACTICE PLANNER */}
        {activeTab === 'planner' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-extrabold text-[#1B365D] uppercase tracking-wider">Clinical Practice Planner</h3>
              <p className="text-xs text-gray-500 mt-1">Designated workflow to coordinate practice sessions with sites, groups, and supervisors.</p>
            </div>
            
            <div className="border border-dashed border-gray-200 p-8 text-center rounded-2xl bg-gray-50">
              <FolderKanban className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-serif italic text-gray-700 mb-4">Integrate student assignments with selected practice sites and clinical instructors.</p>
              <button 
                onClick={() => navigate('/admin/projects')}
                className="px-6 py-2 bg-[#1B365D] text-white text-xs uppercase tracking-wider font-bold rounded-xl shadow-md"
              >
                Go to Clinical Practice Projects Directory
              </button>
            </div>
          </div>
        )}

        {/* TAB 7: TIMETABLE */}
        {activeTab === 'timetable' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-extrabold text-[#1B365D] uppercase tracking-wider">Clinical Course Timetable</h3>
              <p className="text-xs text-gray-500 mt-1">Visual schedule of assignments, lectures, or clinical rotations.</p>
            </div>
            
            <div className="border border-gray-100 bg-white p-6 rounded-2xl shadow-sm text-center">
              <Calendar className="w-12 h-12 text-[#D4AF37] mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-800 mb-1">Rotations Schedule</p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">This clinical course's rotation timetable is active for the clinical practice window: <span className="font-bold text-[#1B365D]">{course.practicePeriod || 'Not scheduled'}</span></p>
            </div>
          </div>
        )}

        {/* TAB 8: ACCOMMODATION */}
        {activeTab === 'accommodation' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-[#1B365D] uppercase tracking-wider">Lodging & Accommodations</h3>
                <p className="text-xs text-gray-500 mt-1">Manage residency blocks, rooms, and costs for remote clinic duties.</p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowAddAccommodationModal(true)}
                  className="px-4 py-2 bg-[#1B365D] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#1B365D]/90 shadow-md flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Accommodation</span>
                </button>
              )}
            </div>

            {accommodations.length === 0 ? (
              <div className="text-center p-12 text-gray-400 italic">No accommodations registered yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {accommodations.map(acc => (
                  <div key={acc.id} className="border border-gray-100 bg-white p-5 rounded-2xl shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="p-2 bg-amber-50 text-[#D4AF37] rounded-xl"><Bed className="w-5 h-5" /></span>
                      <span className="text-xs font-extrabold text-[#1B365D]">{acc.costPerMonth} THB/Month</span>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">{acc.name}</h4>
                    <p className="text-xs text-gray-500">{acc.address}</p>
                    <div className="pt-3 border-t border-gray-50 text-xs text-gray-600 flex justify-between">
                      <span>Rooms: <strong className="text-gray-900">{acc.rooms}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 9: TRANSPORTATION */}
        {activeTab === 'transportation' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-[#1B365D] uppercase tracking-wider">Transportation Plans</h3>
                <p className="text-xs text-gray-500 mt-1">Manage scheduled buses or shuttle routes to remote Practice Sites.</p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowAddTransportModal(true)}
                  className="px-4 py-2 bg-[#1B365D] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#1B365D]/90 shadow-md flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Shuttle Route</span>
                </button>
              )}
            </div>

            {transportations.length === 0 ? (
              <div className="text-center p-12 text-gray-400 italic">No shuttle plans configured.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {transportations.map(tr => (
                  <div key={tr.id} className="border border-gray-100 bg-white p-5 rounded-2xl shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Bus className="w-5 h-5" /></span>
                      <span className="text-xs font-extrabold text-blue-700">{tr.costPerTrip} THB / Trip</span>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">{tr.route}</h4>
                    <div className="pt-3 border-t border-gray-50 text-xs text-gray-600 flex justify-between">
                      <span>Driver: <strong className="text-gray-900">{tr.driverName || 'N/A'}</strong></span>
                      <span>Capacity: <strong className="text-gray-900">{tr.capacity} Pax</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 10: INVOICE */}
        {activeTab === 'invoice' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-[#1B365D] uppercase tracking-wider">Invoice</h3>
                <p className="text-xs text-gray-500 mt-1">Review generated tuition, accommodation, and transportation invoices for Students in this clinical course.</p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowAddPaymentModal(true)}
                  className="px-4 py-2 bg-[#1B365D] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#1B365D]/90 shadow-md flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Generate Billing</span>
                </button>
              )}
            </div>

            {payments.length === 0 ? (
              <div className="text-center p-12 text-gray-400 italic">No active bills generated.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-[10px] uppercase tracking-wider font-extrabold">
                      <th className="p-4">Billing Item</th>
                      <th className="p-4">Student</th>
                      <th className="p-4">Fee Amount</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Date Issued</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {payments.map(bill => (
                      <tr key={bill.id} className="hover:bg-gray-50/50">
                        <td className="p-4 font-bold text-gray-900">INV-{bill.id.substring(0,6).toUpperCase()}</td>
                        <td className="p-4 font-semibold text-[#1B365D]">{bill.studentName}</td>
                        <td className="p-4 text-[#1B365D] font-bold">{bill.amount.toLocaleString()} THB</td>
                        <td className="p-4 text-gray-600 uppercase tracking-wider font-semibold">{bill.type}</td>
                        <td className="p-4 text-gray-500">{new Date(bill.createdAt?.seconds * 1000).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 11: PAYMENT */}
        {activeTab === 'payment' && (
          <div className="space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h3 className="text-sm font-extrabold text-[#1B365D] uppercase tracking-wider">Payment Index</h3>
              <p className="text-xs text-gray-500 mt-1">Review student transaction status, uploaded receipt slips, and issue financial approvals.</p>
            </div>

            {payments.length === 0 ? (
              <div className="text-center p-12 text-gray-400 italic">No transaction records present.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {payments.map(pay => (
                  <div key={pay.id} className="border border-gray-100 bg-white p-5 rounded-2xl shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-400">REC-{pay.id.substring(0,8).toUpperCase()}</span>
                      <span className={`px-2.5 py-0.5 text-[9px] uppercase tracking-wider font-extrabold rounded-full ${pay.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {pay.status}
                      </span>
                    </div>
                    
                    <div>
                      <h4 className="text-base font-bold text-gray-900">{pay.studentName}</h4>
                      <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">{pay.type} Fee</p>
                      <p className="text-lg font-extrabold text-[#1B365D] mt-2">{pay.amount.toLocaleString()} THB</p>
                    </div>

                    <div className="pt-3 border-t border-gray-50 flex justify-between items-center">
                      <span className="text-[10px] text-gray-400">Date: {new Date(pay.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                      {isAdmin && pay.status === 'pending' && (
                        <button
                          onClick={() => handleApprovePayment(pay.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] uppercase tracking-wider font-bold rounded-lg shadow-sm"
                        >
                          Approve Payment
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 12: REPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-extrabold text-[#1B365D] uppercase tracking-wider">Reports & Export</h3>
              <p className="text-xs text-gray-500 mt-1">Download consolidated logs, rosters, and schedules in production-ready Excel format.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { title: 'Student Rotation Index', desc: 'Download CSV roster detailing site assignments, supervisor matching, and period coordinates.' },
                { title: 'Financial Balance Sheet', desc: 'Export course invoice tracking report with approved, pending, and overdue receipts.' },
              ].map((rep, idx) => (
                <div key={idx} className="border border-gray-100 bg-white p-5 rounded-2xl shadow-sm flex flex-col justify-between items-start gap-4">
                  <div>
                    <h4 className="text-base font-bold text-[#1B365D]">{rep.title}</h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{rep.desc}</p>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-[#1B365D] text-xs uppercase tracking-wider font-bold rounded-xl shadow-sm transition-all">
                    <Download className="w-4 h-4 text-[#D4AF37]" />
                    <span>Download Report</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}



      </div>

      {/* MODALS */}
      {/* 1. Add Site Modal */}
      {showAddSiteModal && (
        <div className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Assign Practice Site</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-extrabold text-gray-400 mb-1">Select Existing Site</label>
                <select
                  value={selectedSiteToLink}
                  onChange={(e) => setSelectedSiteToLink(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-2xl text-xs bg-white"
                >
                  <option value="">-- Choose Site --</option>
                  {allAvailableSites.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (Capacity: {s.capacity})</option>
                  ))}
                </select>
                <button
                  onClick={handleLinkSite}
                  disabled={!selectedSiteToLink}
                  className="w-full mt-2 py-2.5 bg-[#1B365D] text-white text-xs uppercase tracking-wider font-bold rounded-xl shadow-sm disabled:opacity-40"
                >
                  Assign Selected Site
                </button>
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink mx-4 text-gray-400 text-[10px] uppercase font-bold">Or Create New</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="New Site Name"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-xs"
                />
                <input
                  type="text"
                  placeholder="Address"
                  value={newSiteAddress}
                  onChange={(e) => setNewSiteAddress(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-xs"
                />
                <input
                  type="number"
                  placeholder="Capacity limit"
                  value={newSiteCapacity}
                  onChange={(e) => setNewSiteCapacity(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-xs"
                />
                <button
                  onClick={handleCreateAndLinkSite}
                  disabled={!newSiteName}
                  className="w-full py-2.5 bg-emerald-600 text-white text-xs uppercase tracking-wider font-bold rounded-xl shadow-sm disabled:opacity-40"
                >
                  Create & Link Site
                </button>
              </div>

              <div className="pt-2 text-right">
                <button onClick={() => setShowAddSiteModal(false)} className="px-4 py-2 text-xs font-bold text-gray-500">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Add Group Modal */}
      {showAddGroupModal && (
        <div className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Assign Student Group</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-extrabold text-gray-400 mb-1">Select Existing Group</label>
                <select
                  value={selectedGroupToLink}
                  onChange={(e) => setSelectedGroupToLink(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-2xl text-xs bg-white"
                >
                  <option value="">-- Choose Group --</option>
                  {allAvailableGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
                  ))}
                </select>
                <button
                  onClick={handleLinkGroup}
                  disabled={!selectedGroupToLink}
                  className="w-full mt-2 py-2.5 bg-[#1B365D] text-white text-xs uppercase tracking-wider font-bold rounded-xl shadow-sm disabled:opacity-40"
                >
                  Link Selected Group
                </button>
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink mx-4 text-gray-400 text-[10px] uppercase font-bold">Or Create New</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Group Name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-xs"
                />
                <input
                  type="text"
                  placeholder="Group Code (e.g. NUR-G3)"
                  value={newGroupCode}
                  onChange={(e) => setNewGroupCode(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-xs"
                />
                <input
                  type="number"
                  placeholder="Student Count"
                  value={newGroupCount}
                  onChange={(e) => setNewGroupCount(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-xs"
                />
                <button
                  onClick={handleCreateAndLinkGroup}
                  disabled={!newGroupName}
                  className="w-full py-2.5 bg-emerald-600 text-white text-xs uppercase tracking-wider font-bold rounded-xl shadow-sm disabled:opacity-40"
                >
                  Create & Link Group
                </button>
              </div>

              <div className="pt-2 text-right">
                <button onClick={() => setShowAddGroupModal(false)} className="px-4 py-2 text-xs font-bold text-gray-500">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Assign Instructor Modal */}
      {showAssignInstructorModal && (
        <div className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Assign Instructor</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-extrabold text-gray-400 mb-1">Select Instructor</label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-2xl text-xs bg-white"
                >
                  <option value="">-- Choose Instructor --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-extrabold text-gray-400 mb-1">Role Type</label>
                <select
                  value={instructorRole}
                  onChange={(e) => setInstructorRole(e.target.value as any)}
                  className="w-full p-3 border border-gray-200 rounded-2xl text-xs bg-white"
                >
                  <option value="primary">Primary Instructor</option>
                  <option value="secondary">Secondary Instructor</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button onClick={() => setShowAssignInstructorModal(false)} className="px-4 py-2 text-xs font-bold text-gray-500">Cancel</button>
                <button onClick={handleAssignInstructor} disabled={!selectedTeacherId} className="px-4 py-2 bg-[#1B365D] text-white text-xs uppercase tracking-wider font-bold rounded-xl shadow-md disabled:opacity-45">Assign</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Add Accommodation Modal */}
      {showAddAccommodationModal && (
        <div className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Accommodation</h3>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Accommodation Name"
                value={accommodationName}
                onChange={(e) => setAccommodationName(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl text-xs"
              />
              <input
                type="text"
                placeholder="Address"
                value={accommodationAddress}
                onChange={(e) => setAccommodationAddress(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl text-xs"
              />
              <input
                type="number"
                placeholder="Number of Rooms"
                value={accommodationRooms}
                onChange={(e) => setAccommodationRooms(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl text-xs"
              />
              <input
                type="number"
                placeholder="Cost per Month"
                value={accommodationCost}
                onChange={(e) => setAccommodationCost(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl text-xs"
              />

              <div className="pt-2 flex justify-end gap-2">
                <button onClick={() => setShowAddAccommodationModal(false)} className="px-4 py-2 text-xs font-bold text-gray-500">Cancel</button>
                <button onClick={handleAddAccommodation} disabled={!accommodationName} className="px-4 py-2 bg-[#1B365D] text-white text-xs uppercase tracking-wider font-bold rounded-xl shadow-md">Add</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Add Transport Modal */}
      {showAddTransportModal && (
        <div className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Shuttle Route</h3>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Route (e.g. Campus to General Hospital)"
                value={transportRoute}
                onChange={(e) => setTransportRoute(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl text-xs"
              />
              <input
                type="text"
                placeholder="Driver Name"
                value={transportDriver}
                onChange={(e) => setTransportDriver(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl text-xs"
              />
              <input
                type="number"
                placeholder="Capacity (pax)"
                value={transportCapacity}
                onChange={(e) => setTransportCapacity(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl text-xs"
              />
              <input
                type="number"
                placeholder="Cost per Trip"
                value={transportCost}
                onChange={(e) => setTransportCost(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl text-xs"
              />

              <div className="pt-2 flex justify-end gap-2">
                <button onClick={() => setShowAddTransportModal(false)} className="px-4 py-2 text-xs font-bold text-gray-500">Cancel</button>
                <button onClick={handleAddTransport} disabled={!transportRoute} className="px-4 py-2 bg-[#1B365D] text-white text-xs uppercase tracking-wider font-bold rounded-xl shadow-md">Add</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Add Payment Modal */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Generate Student Invoice</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-extrabold text-gray-400 mb-1">Select Student</label>
                <select
                  value={paymentStudentId}
                  onChange={(e) => setPaymentStudentId(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-2xl text-xs bg-white"
                >
                  <option value="">-- Choose Student --</option>
                  {courseStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.studentId})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-extrabold text-gray-400 mb-1">Bill Type</label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-2xl text-xs bg-white"
                >
                  <option value="tuition">Tuition Fee</option>
                  <option value="accommodation">Accommodation</option>
                  <option value="transportation">Transportation</option>
                  <option value="miscellaneous">Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-extrabold text-gray-400 mb-1">Amount (THB)</label>
                <input
                  type="number"
                  placeholder="3000"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button onClick={() => setShowAddPaymentModal(false)} className="px-4 py-2 text-xs font-bold text-gray-500">Cancel</button>
                <button onClick={handleAddPayment} disabled={!paymentStudentId} className="px-4 py-2 bg-[#1B365D] text-white text-xs uppercase tracking-wider font-bold rounded-xl shadow-md">Generate Bill</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Add Document Modal */}
      {showAddDocumentModal && (
        <div className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Upload Document</h3>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Document Title"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl text-xs"
              />
              <input
                type="text"
                placeholder="File Link / URL"
                value={documentUrl}
                onChange={(e) => setDocumentUrl(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl text-xs"
              />
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-extrabold text-gray-400 mb-1">Document Type</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-2xl text-xs bg-white"
                >
                  <option value="pdf">PDF File</option>
                  <option value="excel">Excel Spreadsheet</option>
                  <option value="word">Word Document</option>
                  <option value="image">Image/Scan</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button onClick={() => setShowAddDocumentModal(false)} className="px-4 py-2 text-xs font-bold text-gray-500">Cancel</button>
                <button onClick={handleAddDocument} disabled={!documentName} className="px-4 py-2 bg-[#1B365D] text-white text-xs uppercase tracking-wider font-bold rounded-xl shadow-md">Upload</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
