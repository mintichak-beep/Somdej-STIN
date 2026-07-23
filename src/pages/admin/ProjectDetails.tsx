import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  doc, onSnapshot, getDoc, updateDoc, collection, 
  query, where, getDocs, addDoc, deleteDoc, arrayUnion, arrayRemove, Timestamp, setDoc 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Course, PracticeSite, StudentGroup, Student, Teacher, Transportation, Payment, PracticeProject, TeacherAssignment, StudentAssignment, Room } from '../../types';
import { InstructorAssignmentsTab } from '../../components/admin/InstructorAssignmentsTab';
import { ClinicalPracticePlanner } from '../../components/admin/ClinicalPracticePlanner';
import { TimetableTab } from '../../components/admin/TimetableTab';
import { AccommodationTab } from '../../components/admin/AccommodationTab';
import { CourseStudentGroupsTab } from '../../components/admin/CourseStudentGroupsTab';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ArrowLeft, BookOpen, Calendar, Clock, MapPin, Users, UserCheck, 
  Bus, CreditCard, FileText, Settings, Plus, Search, Filter, 
  Download, Upload, Trash2, Edit, CheckCircle2, AlertTriangle, 
  FolderKanban, RefreshCw, LayoutDashboard, Bed, FileSpreadsheet, Eye, User, Phone, Archive, X
} from 'lucide-react';

export function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  // Core Project and Course State
  const [project, setProject] = useState<PracticeProject | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState('overview');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Course Specific Sub-collections loaded via courseId
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
  const [rooms, setRooms] = useState<Room[]>([]);

  // Search/Filters for generic students list
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
  const [newSiteContactPerson, setNewSiteContactPerson] = useState('');
  const [newSitePhone, setNewSitePhone] = useState('');
  const [newSiteStatus, setNewSiteStatus] = useState('active');
  const [selectedSiteToLink, setSelectedSiteToLink] = useState('');

  // Modals / State for Edit and View Site
  const [showEditSiteModal, setShowEditSiteModal] = useState(false);
  const [showViewSiteModal, setShowViewSiteModal] = useState(false);
  const [selectedSiteToView, setSelectedSiteToView] = useState<PracticeSite | null>(null);
  const [selectedSiteToEdit, setSelectedSiteToEdit] = useState<PracticeSite | null>(null);

  // Edit fields
  const [editSiteName, setEditSiteName] = useState('');
  const [editSiteAddress, setEditSiteAddress] = useState('');
  const [editSiteContactPerson, setEditSiteContactPerson] = useState('');
  const [editSitePhone, setEditSitePhone] = useState('');
  const [editSiteCapacity, setEditSiteCapacity] = useState('10');
  const [editSiteStatus, setEditSiteStatus] = useState('active');

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

  // Clinical Practice Planner (Student Assignments) Tab State
  const [assignments, setAssignments] = useState<Record<string, StudentAssignment>>({});
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState<Partial<StudentAssignment>>({});
  const [plannerSearchQuery, setPlannerSearchQuery] = useState('');
  const [savingAssignment, setSavingAssignment] = useState(false);

  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 4000);
  };

  // 1. Core Loader - fetches project first, then registers real-time listeners using courseId
  useEffect(() => {
    if (!id) return;
    setLoading(true);

    let unsubCourse = () => {};
    let unsubAllSites = () => {};
    let unsubAllGroups = () => {};
    let unsubTeachers = () => {};
    let unsubInstructors = () => {};
    let unsubTransports = () => {};
    let unsubPayments = () => {};
    let unsubDocs = () => {};
    let unsubAcc = () => {};
    let unsubAssignments = () => {};
    let unsubRooms = () => {};

    const loadProjectAndCourse = async () => {
      try {
        const projectDoc = await getDoc(doc(db, 'practiceProjects', id));
        if (!projectDoc.exists()) {
          triggerError('Clinical Practice Project not found');
          setLoading(false);
          return;
        }

        const projectData = { id: projectDoc.id, ...projectDoc.data() } as PracticeProject;
        setProject(projectData);

        const courseId = projectData.courseId.id;

        // Register real-time listeners using courseId
        unsubCourse = onSnapshot(doc(db, 'courses', courseId), async (snap) => {
          if (!snap.exists()) {
            triggerError('Clinical Course not found');
            return;
          }
          const courseData = { id: snap.id, ...snap.data() } as Course;
          setCourse(courseData);

          // Resolve Practice Sites
          if (courseData.practiceSites && courseData.practiceSites.length > 0) {
            const sitePromises = courseData.practiceSites.map(ref => getDoc(ref));
            const siteSnaps = await Promise.all(sitePromises);
            setCourseSites(siteSnaps.filter(s => s.exists()).map(s => ({ id: s.id, ...s.data() } as PracticeSite)));
          } else {
            setCourseSites([]);
          }

          // Resolve Student Groups & Students
          if (courseData.studentGroups && courseData.studentGroups.length > 0) {
            const groupPromises = courseData.studentGroups.map(ref => getDoc(ref));
            const groupSnaps = await Promise.all(groupPromises);
            const groupsList = groupSnaps.filter(g => g.exists()).map(g => ({ id: g.id, ...g.data() } as StudentGroup));
            setCourseGroups(groupsList);

            if (groupsList.length > 0) {
              const studentPromises = groupsList.map(group => 
                getDocs(query(collection(db, 'students'), where('groupId', '==', doc(db, 'studentGroups', group.id))))
              );
              const studentSnaps = await Promise.all(studentPromises);
              const list: Student[] = studentSnaps.flatMap(snap => snap.docs.map(d => {
                const data = d.data();
                return {
                  id: d.id,
                  ...data,
                  name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.studentId || 'Student',
                  studentId: data.studentId || ''
                } as unknown as Student;
              }));
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

        // Other sub-collections
        unsubAllSites = onSnapshot(collection(db, 'practiceSites'), (snap) => {
          setAllAvailableSites(snap.docs.map(d => ({ id: d.id, ...d.data() } as PracticeSite)));
        });

        unsubAllGroups = onSnapshot(collection(db, 'studentGroups'), (snap) => {
          setAllAvailableGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentGroup)));
        });

        unsubTeachers = onSnapshot(collection(db, 'teachers'), (snap) => {
          setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        unsubInstructors = onSnapshot(
          query(collection(db, 'teacherAssignments'), where('courseId', '==', courseId)),
          (snap) => {
            setInstructors(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          }
        );

        unsubTransports = onSnapshot(
          query(collection(db, 'transportations'), where('courseId', '==', courseId)),
          (snap) => {
            setTransportations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          }
        );

        unsubPayments = onSnapshot(
          query(collection(db, 'payments'), where('courseId', '==', courseId)),
          (snap) => {
            setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          }
        );

        unsubDocs = onSnapshot(
          query(collection(db, 'courseDocuments'), where('courseId', '==', courseId)),
          (snap) => {
            setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          }
        );

        unsubAcc = onSnapshot(
          query(collection(db, 'accommodations'), where('courseId', '==', courseId)),
          (snap) => {
            setAccommodations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          }
        );

        unsubRooms = onSnapshot(collection(db, 'rooms'), (snap) => {
            setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() } as Room)));
        });

        // Student Assignments (specific to project id)
        unsubAssignments = onSnapshot(
          query(collection(db, 'studentAssignments'), where('projectId', '==', doc(db, 'practiceProjects', id))),
          (snap) => {
            const assignMap: Record<string, StudentAssignment> = {};
            snap.docs.forEach(d => {
              const data = d.data() as StudentAssignment;
              if (data.studentId) {
                assignMap[data.studentId.id] = { id: d.id, ...data };
              }
            });
            setAssignments(assignMap);
          }
        );

      } catch (err) {
        console.error(err);
        triggerError('Failed to initialize workspace data');
        setLoading(false);
      }
    };

    loadProjectAndCourse();

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
      unsubAssignments();
    };
  }, [id]);

  // Synchronize courseSites with real-time allAvailableSites changes
  useEffect(() => {
    if (!course || !course.practiceSites) {
      setCourseSites([]);
      return;
    }
    const courseSiteIds = course.practiceSites.map(ref => ref.id);
    const matchedSites = allAvailableSites.filter(site => courseSiteIds.includes(site.id));
    setCourseSites(matchedSites);
  }, [course, allAvailableSites]);

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
        location: newSiteAddress,
        contactPerson: newSiteContactPerson,
        contactNumber: newSitePhone,
        phone: newSitePhone,
        capacity: Number(newSiteCapacity),
        status: newSiteStatus || 'active',
        createdAt: Timestamp.now()
      });
      await updateDoc(doc(db, 'courses', course.id), {
        practiceSites: arrayUnion(siteDoc)
      });
      triggerSuccess('New Practice Site created and linked.');
      setShowAddSiteModal(false);
      setNewSiteName('');
      setNewSiteAddress('');
      setNewSiteContactPerson('');
      setNewSitePhone('');
      setNewSiteStatus('active');
    } catch (e) {
      triggerError('Failed to create site.');
    }
  };

  const handleEditSite = async () => {
    if (!selectedSiteToEdit) return;
    try {
      await updateDoc(doc(db, 'practiceSites', selectedSiteToEdit.id), {
        name: editSiteName,
        address: editSiteAddress,
        location: editSiteAddress,
        contactPerson: editSiteContactPerson,
        contactNumber: editSitePhone,
        phone: editSitePhone,
        capacity: Number(editSiteCapacity),
        status: editSiteStatus,
        updatedAt: Timestamp.now()
      });
      triggerSuccess('Practice Site updated successfully.');
      setShowEditSiteModal(false);
      setSelectedSiteToEdit(null);
    } catch (e) {
      console.error(e);
      triggerError('Failed to update Practice Site.');
    }
  };

  const handleArchiveSite = async (siteId: string) => {
    try {
      await updateDoc(doc(db, 'practiceSites', siteId), {
        status: 'archived',
        updatedAt: Timestamp.now()
      });
      triggerSuccess('Practice Site archived successfully.');
    } catch (e) {
      console.error(e);
      triggerError('Failed to archive Practice Site.');
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

  // Payments / Invoices
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

  // Clinical Practice Planner: Handle editing & saving student assignments
  const handleEditAssignment = (student: Student) => {
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
      status: existing?.status || 'assigned',
      siteId: existing?.siteId || null
    });
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !id) return;

    // Validation: Check for duplicates for the same student, date, and time
    const duplicate = (Object.values(assignments) as StudentAssignment[]).find(a => 
      a.studentId.id === editingStudent.id && 
      a.practiceDate?.toDate().toDateString() === formData.practiceDate.toDate().toDateString() &&
      a.startTime === formData.startTime &&
      a.endTime === formData.endTime &&
      a.id !== (assignments[editingStudent.id]?.id)
    );

    if (duplicate) {
      triggerError('This student already has an assignment at this date and time.');
      return;
    }

    // Validation: Warn for instructor overlap
    const instructorAssignments = (Object.values(assignments) as StudentAssignment[]).filter(a => 
      (a.primaryInstructorId?.id === (formData.primaryInstructorId as any)?.id || 
       a.secondaryInstructorId?.id === (formData.primaryInstructorId as any)?.id ||
       a.primaryInstructorId?.id === (formData.secondaryInstructorId as any)?.id ||
       a.secondaryInstructorId?.id === (formData.secondaryInstructorId as any)?.id) &&
      a.practiceDate?.toDate().toDateString() === formData.practiceDate.toDate().toDateString() &&
      a.id !== (assignments[editingStudent.id]?.id)
    );
    
    // Check for time overlap
    const [h1, m1] = formData.startTime.split(':').map(Number);
    const [h2, m2] = formData.endTime.split(':').map(Number);
    const start = h1 * 60 + m1;
    const end = h2 * 60 + m2;
    
    const overlap = instructorAssignments.find(a => {
      const [h3, m3] = a.startTime.split(':').map(Number);
      const [h4, m4] = a.endTime.split(':').map(Number);
      const start2 = h3 * 60 + m3;
      const end2 = h4 * 60 + m4;
      return start < end2 && start2 < end;
    });

    if (overlap) {
      if (!window.confirm('This instructor has an overlapping assignment. Continue?')) {
        return;
      }
    }

    setSavingAssignment(true);
    
    try {
      const existing = assignments[editingStudent.id];
      const payload: any = {
        projectId: doc(db, 'practiceProjects', id),
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

      if (formData.primaryInstructorId) {
        payload.primaryInstructorId = doc(db, 'teachers', (formData.primaryInstructorId as any).id || formData.primaryInstructorId);
      } else {
        payload.primaryInstructorId = null;
      }
      if (formData.secondaryInstructorId) {
        payload.secondaryInstructorId = doc(db, 'teachers', (formData.secondaryInstructorId as any).id || formData.secondaryInstructorId);
      } else {
        payload.secondaryInstructorId = null;
      }
      if (formData.siteId) {
        payload.siteId = doc(db, 'practiceSites', (formData.siteId as any).id || formData.siteId);
      } else {
        payload.siteId = null;
      }

      if (existing) {
        await updateDoc(doc(db, 'studentAssignments', existing.id), payload);
      } else {
        const newRef = doc(collection(db, 'studentAssignments'));
        await setDoc(newRef, payload);
      }
      
      triggerSuccess(`Successfully saved assignment for ${editingStudent.firstName} ${editingStudent.lastName}`);
      setEditingStudent(null);
    } catch (err) {
      console.error(err);
      triggerError('Failed to save student assignment.');
    } finally {
      setSavingAssignment(false);
    }
  };

  // Filtered Students list for generic tab
  const filteredStudentsGeneric = useMemo(() => {
    return courseStudents.filter(student => {
      const nameStr = `${student.firstName || ''} ${student.lastName || ''} ${student.studentId || ''}`.toLowerCase();
      const matchesSearch = nameStr.includes(studentSearch.toLowerCase());
      const matchesGroup = studentFilterGroup === 'all' || student.groupId?.id === studentFilterGroup;
      return matchesSearch && matchesGroup;
    });
  }, [courseStudents, studentSearch, studentFilterGroup]);

  // Filtered Students list for Planner tab
  const filteredStudentsPlanner = useMemo(() => {
    return courseStudents.filter(s => {
      const nameStr = `${s.firstName || ''} ${s.lastName || ''} ${s.studentId || ''}`.toLowerCase();
      return nameStr.includes(plannerSearchQuery.toLowerCase());
    });
  }, [courseStudents, plannerSearchQuery]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#F4F1EA]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1B365D]"></div>
      </div>
    );
  }

  if (!project || !course) {
    return (
      <div className="p-10 text-center bg-[#F4F1EA] h-screen flex flex-col justify-center items-center">
        <AlertTriangle className="w-12 h-12 text-[#C62828] mb-4" />
        <p className="text-lg font-serif italic text-gray-800 mb-4">Workspace could not be loaded or doesn't exist.</p>
        <Link to="/admin/projects" className="px-6 py-2 bg-[#1B365D] text-white rounded-xl text-sm font-semibold">Back to Clinical Practice Projects</Link>
      </div>
    );
  }

  // Summary Metrics
  const totalStudentsCount = courseStudents.length;
  const totalInstructorsCount = instructors.length;
  const totalSitesCount = courseSites.length;
  const totalAccommodationCount = accommodations.length;
  const totalTransportationCount = transportations.length;
  const totalPaymentSum = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const pendingPaymentSum = payments.filter(p => p.status === 'pending').reduce((acc, p) => acc + (p.amount || 0), 0);

  const upcomingActivities = useMemo(() => {
    const list = (Object.values(assignments) as StudentAssignment[])
      .filter(a => a.practiceDate)
      .map(a => {
        const student = courseStudents.find(s => s.id === a.studentId?.id);
        const dateObj = a.practiceDate instanceof Timestamp ? a.practiceDate.toDate() : new Date(a.practiceDate as any);
        return {
          id: a.id,
          title: `Rotation: ${student ? `${student.firstName} ${student.lastName}` : 'Enrolled Student'} - Ward: ${a.ward || 'General'} (${a.shift || 'morning'})`,
          date: dateObj,
          notes: a.practiceNotes || '',
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    return list;
  }, [assignments, courseStudents]);

  const recentUpdates = useMemo(() => {
    const updates: Array<{ id: string; text: string; date: Date; type: string }> = [];

    if (project?.updatedAt) {
      const pDate = project.updatedAt instanceof Timestamp ? project.updatedAt.toDate() : new Date(project.updatedAt as any);
      updates.push({
        id: `project-${project.id}`,
        text: `Project "${course?.name || ''}" is "${project.status}" with progress ${project.progress || 0}%`,
        date: pDate,
        type: 'project'
      });
    }

    payments.forEach(p => {
      const pDate = p.updatedAt instanceof Timestamp 
        ? p.updatedAt.toDate() 
        : p.createdAt instanceof Timestamp 
          ? p.createdAt.toDate() 
          : null;
      if (pDate) {
        updates.push({
          id: `payment-${p.id}`,
          text: `Payment of ${p.amount.toLocaleString()} THB for ${p.studentName} is ${p.status}`,
          date: pDate,
          type: 'payment'
        });
      }
    });

    documents.forEach(d => {
      const dDate = d.uploadedAt instanceof Timestamp ? d.uploadedAt.toDate() : null;
      if (dDate) {
        updates.push({
          id: `doc-${d.id}`,
          text: `Document "${d.name}" uploaded`,
          date: dDate,
          type: 'document'
        });
      }
    });

    return updates.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
  }, [project, course, payments, documents]);

  // Helper to count students assigned to a practice site in this project
  const getAssignedStudentsCount = (siteId: string) => {
    return (Object.values(assignments) as StudentAssignment[]).filter(a => a.siteId?.id === siteId).length;
  };

  // Helper to get list of unique instructors assigned to a practice site in this project
  const getAssignedInstructorsForSite = (siteId: string) => {
    const teacherIds = new Set<string>();
    (Object.values(assignments) as StudentAssignment[])
      .filter(a => a.siteId?.id === siteId)
      .forEach(a => {
        if (a.primaryInstructorId) {
          teacherIds.add(a.primaryInstructorId.id);
        }
        if (a.secondaryInstructorId) {
          teacherIds.add(a.secondaryInstructorId.id);
        }
      });
    return Array.from(teacherIds)
      .map(tid => teachers.find(t => t.id === tid))
      .filter(Boolean) as Teacher[];
  };

  // 13 Navigation Tabs mandated by requirements
  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'sites', label: 'Practice Sites', icon: MapPin },
    { id: 'groups', label: 'Student Groups', icon: Users },
    { id: 'students', label: 'Students', icon: UserCheck },
    { id: 'instructors', label: 'Instructors', icon: Users },
    { id: 'planner', label: 'Clinical Practice Planner', icon: FolderKanban },
    { id: 'timetable', label: 'Timetable', icon: Calendar },
    { id: 'accommodation', label: 'Accommodation', icon: Bed },
    { id: 'transportation', label: 'Transportation', icon: Bus },
    { id: 'invoice', label: 'Invoice', icon: FileSpreadsheet },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'documents', label: 'Documents', icon: FileText },
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

      {/* Header section with clinical course credentials displayed at the top */}
      <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-gray-100 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin/projects')}
            className="p-3 bg-white border border-gray-200 hover:bg-gray-50 rounded-2xl shadow-sm transition-all text-gray-600"
            title="Back to Clinical Practice Projects"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[10px] uppercase tracking-widest font-extrabold text-[#C62828] bg-red-50 px-2.5 py-0.5 rounded-full">{course.code}</span>
              <span className={`px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-extrabold rounded-full ${project.status === 'ongoing' ? 'bg-amber-100 text-amber-800' : project.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>
                {project.status}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">{course.name}</h1>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Academic Year {course.academicYear} | Semester {course.semester} | {course.credits || 3} Credits
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

      {/* Workspace Navigation Tabs */}
      <div className="bg-white border border-gray-100 rounded-3xl p-2 shadow-md overflow-x-auto flex gap-1 scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setEditingStudent(null);
              }}
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

      {/* Active Tab Panel Body */}
      <div className="flex-1 bg-white border border-gray-100 rounded-3xl shadow-xl p-6">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Summary Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: 'Total Students', value: totalStudentsCount, desc: 'Enrolled in active groups', icon: UserCheck, color: 'text-blue-600 bg-blue-50/50' },
                { title: 'Total Instructors', value: totalInstructorsCount, desc: 'Clinical supervisors assigned', icon: Users, color: 'text-purple-600 bg-purple-50/50' },
                { title: 'Practice Period', value: course.practicePeriod || 'TBD', desc: 'Clinical schedule duration', icon: Calendar, color: 'text-amber-600 bg-amber-50/50' },
                { title: 'Project Status', value: `${project.status?.toUpperCase() || 'PLANNING'} (${project.progress || 0}%)`, desc: 'Overall planning progress', icon: FolderKanban, color: 'text-emerald-600 bg-emerald-50/50' },
              ].map((stat, i) => (
                <div key={i} className="border border-gray-100 p-5 rounded-2xl flex items-center justify-between bg-white shadow-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-extrabold text-gray-400">{stat.title}</p>
                    <h3 className="text-xl font-extrabold text-gray-900 mt-1">{stat.value}</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">{stat.desc}</p>
                  </div>
                  <div className={`p-3.5 rounded-xl ${stat.color}`}>
                    <stat.icon className="w-5 h-5 shrink-0" />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Primary Details */}
              <div className="lg:col-span-2 space-y-8">
                {/* Course Information */}
                <div className="border border-gray-100 rounded-2xl p-6 bg-white space-y-4 shadow-sm">
                  <h3 className="text-sm font-extrabold text-[#1B365D] uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-gray-100">
                    <BookOpen className="w-4 h-4" /> Course Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 font-extrabold block mb-0.5">Course Name / Code</span>
                      <span className="font-bold text-gray-800 text-sm">[{course.code}] {course.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 font-extrabold block mb-0.5">Credits / Hours</span>
                      <span className="font-bold text-gray-800 text-sm">{course.credits || 3} Credits | {course.practiceHours || 0} Clinical Hours</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 font-extrabold block mb-0.5">Academic Term</span>
                      <span className="font-bold text-gray-800">Year {course.academicYear} / Semester {course.semester}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 font-extrabold block mb-0.5">Status</span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-extrabold rounded-full bg-blue-50 text-blue-700">
                        {project.status}
                      </span>
                    </div>
                    <div className="sm:col-span-2 pt-3 border-t border-gray-50">
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 font-extrabold block mb-1">Course Description</span>
                      <p className="text-gray-600 leading-relaxed">{course.description || 'No course overview description available.'}</p>
                    </div>
                  </div>
                </div>

                {/* Practice Sites */}
                <div className="border border-gray-100 rounded-2xl p-6 bg-white space-y-4 shadow-sm">
                  <h3 className="text-sm font-extrabold text-[#1B365D] uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-gray-100">
                    <MapPin className="w-4 h-4" /> Practice Sites
                  </h3>
                  {courseSites.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-2">No data available</p>
                  ) : (
                    <div className="space-y-4">
                      {courseSites.map(site => (
                        <div key={site.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#F4F1EA]/10 rounded-xl border border-gray-100 gap-2">
                          <div>
                            <h4 className="text-xs font-bold text-gray-900">{site.name}</h4>
                            <p className="text-[11px] text-gray-500 mt-1">{site.address || 'No address registered'}</p>
                            {(site.contactPerson || site.contactNumber) && (
                              <p className="text-[10px] text-gray-400 mt-0.5">Contact: {site.contactPerson || 'N/A'} ({site.contactNumber || 'N/A'})</p>
                            )}
                          </div>
                          <span className="text-[11px] font-bold text-[#1B365D] bg-blue-50 px-2.5 py-1 rounded-lg shrink-0 self-start sm:self-center">
                            Max Capacity: {site.capacity || 10} Students
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Accommodation */}
                <div className="border border-gray-100 rounded-2xl p-6 bg-white space-y-4 shadow-sm">
                  <h3 className="text-sm font-extrabold text-[#1B365D] uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-gray-100">
                    <Bed className="w-4 h-4" /> Accommodation
                  </h3>
                  {accommodations.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-2">No data available</p>
                  ) : (
                    <div className="space-y-4">
                      {accommodations.map(acc => (
                        <div key={acc.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#F4F1EA]/10 rounded-xl border border-gray-100 gap-2">
                          <div>
                            <h4 className="text-xs font-bold text-gray-900">{acc.name}</h4>
                            <p className="text-[11px] text-gray-500 mt-1">{acc.address || 'No address registered'}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Rooms: {acc.rooms || 0}</p>
                          </div>
                          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg shrink-0 self-start sm:self-center">
                            {acc.costPerMonth?.toLocaleString() || 0} THB / Month
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Transportation */}
                <div className="border border-gray-100 rounded-2xl p-6 bg-white space-y-4 shadow-sm">
                  <h3 className="text-sm font-extrabold text-[#1B365D] uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-gray-100">
                    <Bus className="w-4 h-4" /> Transportation
                  </h3>
                  {transportations.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-2">No data available</p>
                  ) : (
                    <div className="space-y-4">
                      {transportations.map(tr => (
                        <div key={tr.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#F4F1EA]/10 rounded-xl border border-gray-100 gap-2">
                          <div>
                            <h4 className="text-xs font-bold text-gray-900">{tr.route}</h4>
                            <p className="text-[10px] text-gray-400 mt-1">Driver: {tr.driverName || 'N/A'}</p>
                            <p className="text-[10px] text-gray-500">Max Capacity: {tr.capacity || 0} Pax</p>
                          </div>
                          <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg shrink-0 self-start sm:self-center">
                            {tr.costPerTrip?.toLocaleString() || 0} THB / Trip
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Secondary Details */}
              <div className="space-y-8">
                {/* Payment Summary */}
                <div className="border border-gray-100 rounded-2xl p-6 bg-white space-y-4 shadow-sm">
                  <h3 className="text-sm font-extrabold text-[#1B365D] uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-gray-100">
                    <CreditCard className="w-4 h-4" /> Payment Summary
                  </h3>
                  {payments.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-2">No data available</p>
                  ) : (
                    <div className="space-y-3 pt-1">
                      <div className="flex justify-between items-center bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                        <span className="text-xs font-semibold text-gray-600">Total Billed</span>
                        <span className="text-xs font-bold text-[#1B365D]">{totalPaymentSum.toLocaleString()} THB</span>
                      </div>
                      <div className="flex justify-between items-center bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                        <span className="text-xs font-semibold text-gray-600">Pending Approvals</span>
                        <span className="text-xs font-bold text-amber-600">{pendingPaymentSum.toLocaleString()} THB</span>
                      </div>
                      <div className="flex justify-between items-center bg-emerald-50/30 p-3 rounded-xl border border-emerald-100">
                        <span className="text-xs font-bold text-emerald-800">Approved Payments</span>
                        <span className="text-xs font-extrabold text-emerald-700">{(totalPaymentSum - pendingPaymentSum).toLocaleString()} THB</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Upcoming Activities */}
                <div className="border border-gray-100 rounded-2xl p-6 bg-white space-y-4 shadow-sm">
                  <h3 className="text-sm font-extrabold text-[#1B365D] uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-gray-100">
                    <Calendar className="w-4 h-4" /> Upcoming Activities
                  </h3>
                  {upcomingActivities.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-2">No data available</p>
                  ) : (
                    <div className="relative border-l border-gray-200 ml-2 pl-4 space-y-4 py-1">
                      {upcomingActivities.map(act => (
                        <div key={act.id} className="relative">
                          <span className="absolute -left-[21px] top-1 bg-[#1B365D] h-2.5 w-2.5 rounded-full border-2 border-white"></span>
                          <p className="text-[10px] text-gray-400 font-bold">{act.date.toLocaleDateString()} {act.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          <p className="text-xs font-bold text-gray-800 mt-0.5">{act.title}</p>
                          {act.notes && (
                            <p className="text-[10px] text-gray-500 italic mt-0.5">{act.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Updates */}
                <div className="border border-gray-100 rounded-2xl p-6 bg-white space-y-4 shadow-sm">
                  <h3 className="text-sm font-extrabold text-[#1B365D] uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-gray-100">
                    <RefreshCw className="w-4 h-4" /> Recent Updates
                  </h3>
                  {recentUpdates.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-2">No data available</p>
                  ) : (
                    <div className="space-y-3">
                      {recentUpdates.map(up => (
                        <div key={up.id} className="p-3 bg-gray-50/50 rounded-xl border border-gray-50 text-xs">
                          <div className="flex justify-between items-center text-[10px] text-gray-400 font-semibold mb-1">
                            <span className="uppercase tracking-wider font-bold text-[#1B365D]">{up.type} update</span>
                            <span>{up.date.toLocaleDateString()}</span>
                          </div>
                          <p className="text-gray-700 leading-relaxed font-medium">{up.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRACTICE SITES */}
        {activeTab === 'sites' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-[#1B365D] uppercase tracking-wider">Associated Practice Sites</h3>
                <p className="text-xs text-gray-500 mt-1">Hospitals, medical labs, or care clinics approved for clinical rotations.</p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => {
                    setSelectedSiteToLink('');
                    setNewSiteName('');
                    setNewSiteAddress('');
                    setNewSiteContactPerson('');
                    setNewSitePhone('');
                    setNewSiteStatus('active');
                    setShowAddSiteModal(true);
                  }}
                  className="px-4 py-2.5 bg-[#1B365D] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#1B365D]/90 shadow-sm flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Assign / Add Practice Site</span>
                </button>
              )}
            </div>

            {courseSites.length === 0 ? (
              <div className="text-center p-12 text-gray-400 italic bg-white rounded-2xl border border-gray-100">No practice sites assigned to this course.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courseSites.map(site => {
                  const assignedStudentsCount = getAssignedStudentsCount(site.id);
                  const assignedInstructors = getAssignedInstructorsForSite(site.id);
                  const isArchived = site.status === 'archived';

                  return (
                    <div 
                      key={site.id} 
                      className={`border bg-white p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200 ${
                        isArchived ? 'border-gray-200 bg-gray-50/50 opacity-75' : 'border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      <div className="space-y-4">
                        {/* Status & Icon Header */}
                        <div className="flex justify-between items-center">
                          <span className={`p-2 rounded-xl ${isArchived ? 'bg-gray-100 text-gray-500' : 'bg-amber-50 text-[#D4AF37]'}`}>
                            <MapPin className="w-5 h-5" />
                          </span>
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            isArchived ? 'bg-gray-100 text-gray-500 border border-gray-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          }`}>
                            {site.status || 'active'}
                          </span>
                        </div>

                        {/* Title and Address */}
                        <div className="space-y-1">
                          <h4 className="text-base font-bold text-gray-900 leading-tight">{site.name}</h4>
                          <p className="text-xs text-gray-500 flex items-start gap-1.5 leading-relaxed">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                            <span>{site.address || site.location || 'No address registered.'}</span>
                          </p>
                        </div>

                        {/* Contact Person & Phone */}
                        <div className="space-y-1 text-xs pt-1">
                          <p className="text-gray-600 flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="font-semibold text-gray-700">Contact:</span> <span>{site.contactPerson || 'Not provided'}</span>
                          </p>
                          <p className="text-gray-600 flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="font-semibold text-gray-700">Phone:</span> <span>{site.phone || site.contactNumber || 'Not provided'}</span>
                          </p>
                        </div>

                        {/* Assignments Stats */}
                        <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-gray-400 font-medium block">Assigned Students</span>
                            <span className="text-sm font-bold text-[#1B365D] mt-0.5 block">{assignedStudentsCount} students</span>
                          </div>
                          <div>
                            <span className="text-gray-400 font-medium block">Assigned Instructors</span>
                            <span className="text-sm font-bold text-[#1B365D] mt-0.5 block">{assignedInstructors.length} instructors</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons Footer */}
                      <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedSiteToView(site);
                              setShowViewSiteModal(true);
                            }}
                            className="p-2 text-gray-500 hover:text-[#1B365D] hover:bg-gray-100 rounded-xl transition-all"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedSiteToEdit(site);
                                  setEditSiteName(site.name || '');
                                  setEditSiteAddress(site.address || site.location || '');
                                  setEditSiteContactPerson(site.contactPerson || '');
                                  setEditSitePhone(site.phone || site.contactNumber || '');
                                  setEditSiteCapacity(String(site.capacity || 10));
                                  setEditSiteStatus(site.status || 'active');
                                  setShowEditSiteModal(true);
                                }}
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                title="Edit Site"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    await updateDoc(doc(db, 'practiceSites', site.id), {
                                      status: isArchived ? 'active' : 'archived',
                                      updatedAt: Timestamp.now()
                                    });
                                    triggerSuccess(`Practice Site ${isArchived ? 'activated' : 'archived'} successfully.`);
                                  } catch (err) {
                                    console.error(err);
                                    triggerError('Failed to change site status.');
                                  }
                                }}
                                className={`p-2 rounded-xl transition-all ${
                                  isArchived 
                                    ? 'text-emerald-600 hover:bg-emerald-50' 
                                    : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                                }`}
                                title={isArchived ? "Activate Site" : "Archive Site"}
                              >
                                {isArchived ? <CheckCircle2 className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                              </button>
                            </>
                          )}
                        </div>

                        {isAdmin && (
                          <button
                            onClick={() => handleUnlinkSite(site.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            title="Unlink from Course"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: STUDENT GROUPS */}
        {activeTab === 'groups' && course && (
          <CourseStudentGroupsTab 
            course={course}
            isAdmin={isAdmin}
            triggerSuccess={triggerSuccess}
            triggerError={triggerError}
            allSites={courseSites}
            allTeachers={teachers}
          />
        )}

        {/* TAB 4: STUDENTS */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-[#1B365D] uppercase tracking-wider">Student Enrolment Index</h3>
                <p className="text-xs text-gray-500 mt-1">Review profiles of all students enrolled in this Clinical Course.</p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs w-full sm:w-56">
                  <Search className="w-4 h-4 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search name or ID..."
                    className="bg-transparent border-none outline-none w-full text-xs"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                </div>

                <select
                  value={studentFilterGroup}
                  onChange={(e) => setStudentFilterGroup(e.target.value)}
                  className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs"
                >
                  <option value="all">All Groups</option>
                  {courseGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {filteredStudentsGeneric.length === 0 ? (
              <div className="text-center p-12 text-gray-400 italic">No matching students found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-[10px] uppercase tracking-wider font-extrabold">
                      <th className="p-4">Student ID</th>
                      <th className="p-4">Name</th>
                      <th className="p-4">Class Group</th>
                      <th className="p-4">Assigned Ward</th>
                      <th className="p-4">Clinical Supervisor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {filteredStudentsGeneric.map(std => {
                      const assign = assignments[std.id];
                      return (
                        <tr key={std.id} className="hover:bg-gray-50/50">
                          <td className="p-4 font-mono font-bold text-gray-700">{std.studentId}</td>
                          <td className="p-4 font-bold text-gray-900">{std.firstName} {std.lastName}</td>
                          <td className="p-4 text-gray-600">{courseGroups.find(g => g.id === std.groupId?.id)?.name || 'Generic'}</td>
                          <td className="p-4">
                            {assign ? (
                              <span className="text-[#1B365D] font-bold">{assign.ward} / {assign.unit}</span>
                            ) : (
                              <span className="text-gray-400 italic">Not Assigned</span>
                            )}
                          </td>
                          <td className="p-4">
                            {assign?.primaryInstructorId ? (
                              <span className="text-gray-700 font-semibold">{teachers.find(t => t.id === assign.primaryInstructorId?.id)?.name || 'Assigned supervisor'}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: INSTRUCTORS */}
        {activeTab === 'instructors' && (
          <InstructorAssignmentsTab
            teachers={teachers as Teacher[]}
            instructorAssignments={instructors as TeacherAssignment[]}
            studentAssignments={Object.values(assignments) as StudentAssignment[]}
            studentGroups={courseGroups}
            students={courseStudents}
            sites={courseSites}
            onRemove={handleRemoveInstructor}
            isAdmin={isAdmin}
          />
        )}

        {/* TAB 6: CLINICAL PRACTICE PLANNER */}
        {activeTab === 'planner' && (
          <ClinicalPracticePlanner
            assignments={Object.values(assignments) as StudentAssignment[]}
            students={courseStudents}
            teachers={teachers as Teacher[]}
            sites={courseSites}
            studentGroups={courseGroups}
          />
        )}

        {/* TAB 7: TIMETABLE */}
        {activeTab === 'timetable' && (
          <TimetableTab
            assignments={Object.values(assignments) as StudentAssignment[]}
            students={courseStudents}
            teachers={teachers as Teacher[]}
            sites={courseSites}
            studentGroups={courseGroups}
          />
        )}

        {/* TAB 8: ACCOMMODATION */}
        {activeTab === 'accommodation' && (
          <AccommodationTab
            accommodations={accommodations}
            rooms={rooms}
            students={courseStudents}
            sites={courseSites}
            assignments={Object.values(assignments) as StudentAssignment[]}
          />
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
                  onClick={() => {
                    setTransportRoute('');
                    setTransportDriver('');
                    setShowAddTransportModal(true);
                  }}
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
                  <div key={tr.id} className="border border-gray-100 bg-white p-5 rounded-2xl shadow-sm space-y-3 hover:border-gray-200 transition-all">
                    <div className="flex justify-between items-start">
                      <span className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Bus className="w-5 h-5" /></span>
                      <span className="text-xs font-extrabold text-blue-700">{tr.costPerTrip} THB / Trip</span>
                    </div>
                    <h4 className="text-base font-bold text-gray-900">{tr.route}</h4>
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
                <h3 className="text-sm font-extrabold text-[#1B365D] uppercase tracking-wider">Invoices & Billing</h3>
                <p className="text-xs text-gray-500 mt-1">Review generated tuition, accommodation, and transportation invoices for Students in this course.</p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => {
                    setPaymentStudentId('');
                    setShowAddPaymentModal(true);
                  }}
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
                        <td className="p-4 font-mono font-bold text-gray-900">INV-{bill.id.substring(0,6).toUpperCase()}</td>
                        <td className="p-4 font-semibold text-[#1B365D]">{bill.studentName}</td>
                        <td className="p-4 text-[#1B365D] font-bold">{bill.amount?.toLocaleString()} THB</td>
                        <td className="p-4 text-gray-600 uppercase tracking-wider font-semibold">{bill.type}</td>
                        <td className="p-4 text-gray-500">{bill.createdAt ? new Date(bill.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</td>
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
              <h3 className="text-sm font-extrabold text-[#1B365D] uppercase tracking-wider">Payment Verification Index</h3>
              <p className="text-xs text-gray-500 mt-1">Review student transaction status, uploaded receipt slips, and issue financial approvals.</p>
            </div>

            {payments.length === 0 ? (
              <div className="text-center p-12 text-gray-400 italic">No transaction records present.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {payments.map(pay => (
                  <div key={pay.id} className="border border-gray-100 bg-white p-5 rounded-2xl shadow-sm space-y-4 hover:border-gray-200 transition-all">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-400">REC-{pay.id.substring(0,8).toUpperCase()}</span>
                      <span className={`px-2.5 py-0.5 text-[9px] uppercase tracking-wider font-extrabold rounded-full ${pay.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {pay.status}
                      </span>
                    </div>
                    
                    <div>
                      <h4 className="text-base font-bold text-gray-900">{pay.studentName}</h4>
                      <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">{pay.type} Fee</p>
                      <p className="text-lg font-extrabold text-[#1B365D] mt-2">{pay.amount?.toLocaleString()} THB</p>
                    </div>

                    <div className="pt-3 border-t border-gray-50 flex justify-between items-center">
                      <span className="text-[10px] text-gray-400">Date: {pay.createdAt ? new Date(pay.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</span>
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
              <h3 className="text-sm font-extrabold text-[#1B365D] uppercase tracking-wider">Reports & Data Export</h3>
              <p className="text-xs text-gray-500 mt-1">Download consolidated logs, rosters, and schedules in production-ready format.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { title: 'Student Rotation Index', desc: 'Download CSV roster detailing site assignments, supervisor matching, and period coordinates.' },
                { title: 'Financial Balance Sheet', desc: 'Export course invoice tracking report with approved, pending, and overdue receipts.' },
              ].map((rep, idx) => (
                <div key={idx} className="border border-gray-100 bg-white p-5 rounded-2xl shadow-sm flex flex-col justify-between items-start gap-4 hover:border-gray-200 transition-all">
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

        {/* TAB 13: DOCUMENTS (Fleshed out manual and syllabus manager!) */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-[#1B365D] uppercase tracking-wider">Course Documents & Manuals</h3>
                <p className="text-xs text-gray-500 mt-1">Upload and manage syllabi, guidelines, clinical manuals, and checklists for students.</p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => {
                    setDocumentName('');
                    setDocumentUrl('');
                    setShowAddDocumentModal(true);
                  }}
                  className="px-4 py-2 bg-[#1B365D] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#1B365D]/90 shadow-md flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Upload Document</span>
                </button>
              )}
            </div>

            {documents.length === 0 ? (
              <div className="text-center p-12 text-gray-400 italic">No documents uploaded for this course yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {documents.map(docItem => (
                  <div key={docItem.id} className="border border-gray-100 bg-white p-5 rounded-2xl shadow-sm flex flex-col justify-between space-y-4 hover:border-gray-200 transition-all">
                    <div className="flex justify-between items-start">
                      <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                        <FileText className="w-5 h-5" />
                      </span>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{docItem.type || 'PDF'}</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 line-clamp-1">{docItem.name}</h4>
                      <p className="text-[10px] text-gray-500 mt-1">Uploaded: {docItem.uploadedAt ? new Date(docItem.uploadedAt.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div className="pt-3 border-t border-gray-50 flex justify-between items-center">
                      <a
                        href={docItem.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-[#1B365D] hover:underline flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" /> View / Download
                      </a>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteDocument(docItem.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete Document"
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

      </div>

      {/* 1. Add / Assign Site Modal */}
      {showAddSiteModal && (
        <div className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 my-8">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-4">
              <h3 className="text-base font-extrabold text-[#1B365D] uppercase tracking-wider">Assign or Add Practice Site</h3>
              <button onClick={() => setShowAddSiteModal(false)} className="p-1.5 hover:bg-gray-100 rounded-xl transition-all">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Assign Existing */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Option A: Link Existing Site</h4>
                <div className="flex gap-2">
                  <div className="flex-grow">
                    <select
                      value={selectedSiteToLink}
                      onChange={(e) => setSelectedSiteToLink(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl text-xs bg-white text-gray-800 font-semibold"
                    >
                      <option value="">-- Choose Existing Practice Site --</option>
                      {allAvailableSites
                        .filter(s => !courseSites.some(cs => cs.id === s.id))
                        .map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} (Contact: {s.contactPerson || 'N/A'}, Status: {s.status || 'active'})
                          </option>
                        ))}
                    </select>
                  </div>
                  <button
                    onClick={handleLinkSite}
                    disabled={!selectedSiteToLink}
                    className="px-4 py-2.5 bg-[#1B365D] text-white text-xs uppercase tracking-wider font-bold rounded-xl shadow-sm disabled:opacity-40 whitespace-nowrap hover:bg-[#1B365D]/90"
                  >
                    Assign
                  </button>
                </div>
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink mx-4 text-gray-400 text-[10px] uppercase font-bold tracking-widest">Or Option B: Create New</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              {/* Create Brand New */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest font-extrabold text-gray-400">Site Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. City General Hospital"
                      value={newSiteName}
                      onChange={(e) => setNewSiteName(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest font-extrabold text-gray-400">Capacity Limit (Students) *</label>
                    <input
                      type="number"
                      placeholder="Capacity (e.g. 15)"
                      value={newSiteCapacity}
                      onChange={(e) => setNewSiteCapacity(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest font-extrabold text-gray-400">Address / Location</label>
                  <input
                    type="text"
                    placeholder="Full street address or map coordinates"
                    value={newSiteAddress}
                    onChange={(e) => setNewSiteAddress(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest font-extrabold text-gray-400">Contact Person</label>
                    <input
                      type="text"
                      placeholder="Coordinator Name"
                      value={newSiteContactPerson}
                      onChange={(e) => setNewSiteContactPerson(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest font-extrabold text-gray-400">Phone / Contact Number</label>
                    <input
                      type="text"
                      placeholder="e.g. +66-89-123-4567"
                      value={newSitePhone}
                      onChange={(e) => setNewSitePhone(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest font-extrabold text-gray-400">Initial Status</label>
                  <select
                    value={newSiteStatus}
                    onChange={(e) => setNewSiteStatus(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl text-xs bg-white font-medium text-gray-800"
                  >
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <button
                  onClick={handleCreateAndLinkSite}
                  disabled={!newSiteName.trim()}
                  className="w-full py-3 bg-emerald-600 text-white text-xs uppercase tracking-wider font-bold rounded-xl shadow-sm disabled:opacity-40 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create & Associate New Site</span>
                </button>
              </div>

              <div className="pt-2 text-right border-t border-gray-100">
                <button onClick={() => setShowAddSiteModal(false)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Site Modal */}
      {showEditSiteModal && selectedSiteToEdit && (
        <div className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 my-8">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-4">
              <h3 className="text-base font-extrabold text-[#1B365D] uppercase tracking-wider flex items-center gap-2">
                <Edit className="w-4 h-4" /> Edit Practice Site Details
              </h3>
              <button onClick={() => { setShowEditSiteModal(false); setSelectedSiteToEdit(null); }} className="p-1.5 hover:bg-gray-100 rounded-xl transition-all">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest font-extrabold text-gray-400">Site Name *</label>
                  <input
                    type="text"
                    value={editSiteName}
                    onChange={(e) => setEditSiteName(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest font-extrabold text-gray-400">Capacity (Students) *</label>
                  <input
                    type="number"
                    value={editSiteCapacity}
                    onChange={(e) => setEditSiteCapacity(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest font-extrabold text-gray-400">Address / Location</label>
                <input
                  type="text"
                  value={editSiteAddress}
                  onChange={(e) => setEditSiteAddress(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest font-extrabold text-gray-400">Contact Person</label>
                  <input
                    type="text"
                    value={editSiteContactPerson}
                    onChange={(e) => setEditSiteContactPerson(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest font-extrabold text-gray-400">Phone / Contact Number</label>
                  <input
                    type="text"
                    value={editSitePhone}
                    onChange={(e) => setEditSitePhone(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest font-extrabold text-gray-400">Status</label>
                <select
                  value={editSiteStatus}
                  onChange={(e) => setEditSiteStatus(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-xs bg-white text-gray-800 font-medium"
                >
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-gray-100">
                <button
                  onClick={() => { setShowEditSiteModal(false); setSelectedSiteToEdit(null); }}
                  className="px-4 py-2 border border-gray-200 text-xs font-bold rounded-xl bg-white text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSite}
                  disabled={!editSiteName.trim()}
                  className="px-4 py-2 bg-[#1B365D] text-white text-xs font-bold rounded-xl hover:bg-[#1B365D]/90 disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Site Details Modal */}
      {showViewSiteModal && selectedSiteToView && (
        <div className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 my-8">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-4">
              <h3 className="text-base font-extrabold text-[#1B365D] uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-500" /> Practice Site Details
              </h3>
              <button onClick={() => { setShowViewSiteModal(false); setSelectedSiteToView(null); }} className="p-1.5 hover:bg-gray-100 rounded-xl transition-all">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Site Info Header */}
              <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">{selectedSiteToView.name}</h4>
                    <p className="text-xs text-gray-500 mt-1 flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                      <span>{selectedSiteToView.address || selectedSiteToView.location || 'No address registered.'}</span>
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase border ${
                    selectedSiteToView.status === 'archived' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  }`}>
                    {selectedSiteToView.status || 'active'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-gray-200/50 text-xs text-gray-700">
                  <div>
                    <span className="text-gray-400 font-medium block">Contact Person</span>
                    <span className="font-semibold text-gray-900">{selectedSiteToView.contactPerson || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium block">Phone Number</span>
                    <span className="font-semibold text-gray-900">{selectedSiteToView.phone || selectedSiteToView.contactNumber || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium block">Max Capacity</span>
                    <span className="font-semibold text-gray-900">{selectedSiteToView.capacity || 10} students</span>
                  </div>
                </div>
              </div>

              {/* Assigned Supervisors */}
              <div>
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" /> Assigned Instructors ({getAssignedInstructorsForSite(selectedSiteToView.id).length})
                </h4>
                {getAssignedInstructorsForSite(selectedSiteToView.id).length === 0 ? (
                  <p className="text-xs text-gray-400 italic bg-gray-50/50 p-4 rounded-xl border border-dashed">No supervisors assigned to any student at this site.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {getAssignedInstructorsForSite(selectedSiteToView.id).map(instructor => (
                      <span key={instructor.id} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-100">
                        <User className="w-3.5 h-3.5" />
                        {instructor.firstName} {instructor.lastName}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Assigned Students */}
              <div>
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#1B365D]" /> Assigned Students ({getAssignedStudentsCount(selectedSiteToView.id)})
                </h4>
                {getAssignedStudentsCount(selectedSiteToView.id) === 0 ? (
                  <p className="text-xs text-gray-400 italic bg-gray-50/50 p-4 rounded-xl border border-dashed">No students currently assigned to this site for this clinical project.</p>
                ) : (
                  <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 uppercase text-[9px] tracking-wider font-extrabold">
                            <th className="p-3">Student Name</th>
                            <th className="p-3">Ward / Unit</th>
                            <th className="p-3">Shift / Time</th>
                            <th className="p-3">Supervisors</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-medium">
                          {courseStudents
                            .filter(s => assignments[s.id]?.siteId?.id === selectedSiteToView.id)
                            .map(student => {
                              const assign = assignments[student.id];
                              const pSupervisor = teachers.find(t => t.id === assign.primaryInstructorId?.id);
                              const sSupervisor = teachers.find(t => t.id === assign.secondaryInstructorId?.id);
                              return (
                                <tr key={student.id} className="hover:bg-gray-50/50">
                                  <td className="p-3 font-semibold text-gray-800">
                                    <div>{student.firstName} {student.lastName}</div>
                                    <div className="text-[10px] text-gray-400">{student.studentId}</div>
                                  </td>
                                  <td className="p-3 text-gray-600">
                                    <span className="bg-blue-50 text-[#1B365D] text-[10px] px-2 py-0.5 rounded-full font-bold">{assign.ward || 'General'}</span>
                                    <div className="text-[10px] text-gray-400 mt-0.5">{assign.unit || 'N/A'}</div>
                                  </td>
                                  <td className="p-3 text-gray-600">
                                    <div className="capitalize font-bold text-gray-700">{assign.shift}</div>
                                    <div className="text-[10px] text-gray-400 mt-0.5">{assign.startTime} - {assign.endTime}</div>
                                  </td>
                                  <td className="p-3 text-gray-600 space-y-0.5">
                                    {pSupervisor && <div className="text-[10px] font-bold text-emerald-800">Primary: {pSupervisor.name}</div>}
                                    {sSupervisor && <div className="text-[10px] text-gray-500">Secondary: {sSupervisor.name}</div>}
                                    {!pSupervisor && !sSupervisor && <span className="text-gray-400 italic">None</span>}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => { setShowViewSiteModal(false); setSelectedSiteToView(null); }}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 rounded-xl transition-all"
                >
                  Close Detail
                </button>
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
                  className="w-full p-3 border border-gray-200 rounded-2xl text-xs bg-white text-gray-800"
                >
                  <option value="">-- Choose Group --</option>
                  {allAvailableGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.code || 'COHORT'})</option>
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
                <button onClick={() => setShowAddGroupModal(false)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800">Cancel</button>
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
                  className="w-full p-3 border border-gray-200 rounded-2xl text-xs bg-white text-gray-800"
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
                  className="w-full p-3 border border-gray-200 rounded-2xl text-xs bg-white text-gray-800"
                >
                  <option value="primary">Primary Instructor</option>
                  <option value="secondary">Secondary Instructor</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button onClick={() => setShowAssignInstructorModal(false)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800">Cancel</button>
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
                <button onClick={() => setShowAddAccommodationModal(false)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800">Cancel</button>
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
                <button onClick={() => setShowAddTransportModal(false)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800">Cancel</button>
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
                  className="w-full p-3 border border-gray-200 rounded-2xl text-xs bg-white text-gray-800"
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
                  className="w-full p-3 border border-gray-200 rounded-2xl text-xs bg-white text-gray-800"
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
                <button onClick={() => setShowAddPaymentModal(false)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800">Cancel</button>
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
                  className="w-full p-3 border border-gray-200 rounded-2xl text-xs bg-white text-gray-800"
                >
                  <option value="pdf">PDF File</option>
                  <option value="excel">Excel Spreadsheet</option>
                  <option value="word">Word Document</option>
                  <option value="image">Image/Scan</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button onClick={() => setShowAddDocumentModal(false)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800">Cancel</button>
                <button onClick={handleAddDocument} disabled={!documentName} className="px-4 py-2 bg-[#1B365D] text-white text-xs uppercase tracking-wider font-bold rounded-xl shadow-md">Upload</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
