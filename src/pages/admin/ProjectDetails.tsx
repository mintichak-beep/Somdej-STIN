import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { PracticeProject, Course, PracticeSite, StudentGroup, TeacherAssignment, Transportation, Payment } from '../../types';
import { ArrowLeft, MapPin, Users, UserCheck, Bus, CreditCard, Calendar, Clock, BookOpen, User } from 'lucide-react';

export function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  
  const [project, setProject] = useState<PracticeProject | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [sites, setSites] = useState<PracticeSite[]>([]);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [instructors, setInstructors] = useState<{assignment: TeacherAssignment, name: string}[]>([]);
  const [transport, setTransport] = useState<Transportation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    if (id) {
      fetchDetails();
    }
  }, [id]);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch Project
      const projectDoc = await getDoc(doc(db, 'practiceProjects', id!));
      if (!projectDoc.exists()) throw new Error('Project not found');
      const projectData = { id: projectDoc.id, ...projectDoc.data() } as PracticeProject;
      setProject(projectData);

      // 2. Fetch Course
      const courseDoc = await getDoc(projectData.courseId);
      let courseData: Course | null = null;
      if (courseDoc.exists()) {
        courseData = { id: courseDoc.id, ...courseDoc.data() } as Course;
        setCourse(courseData);
      }

      // 3. Fetch Sites & Groups from Course
      if (courseData) {
        if (courseData.practiceSites?.length > 0) {
          const siteDocs = await Promise.all(courseData.practiceSites.map(ref => getDoc(ref)));
          setSites(siteDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() } as PracticeSite)));
        }
        if (courseData.studentGroups?.length > 0) {
          const groupDocs = await Promise.all(courseData.studentGroups.map(ref => getDoc(ref)));
          setGroups(groupDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() } as StudentGroup)));
        }
      }

      // 4. Fetch Instructors (TeacherAssignments)
      const qInstructors = query(collection(db, 'teacherAssignments'), where('projectId', '==', doc(db, 'practiceProjects', id!)));
      const instructorsSnap = await getDocs(qInstructors);
      const instructorsData = instructorsSnap.docs.map(d => ({ id: d.id, ...d.data() } as TeacherAssignment));
      
      // Fetch teacher names
      const instructorsWithNames = await Promise.all(instructorsData.map(async (assign) => {
        const tDoc = await getDoc(assign.teacherId);
        return {
          assignment: assign,
          name: tDoc.exists() ? (tDoc.data()?.name || 'Unknown') : 'Unknown'
        };
      }));
      setInstructors(instructorsWithNames);

      // 5. Fetch Transportations
      const qTransport = query(collection(db, 'transportations'), where('projectId', '==', doc(db, 'practiceProjects', id!)));
      const transportSnap = await getDocs(qTransport);
      setTransport(transportSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transportation)));

      // 6. Fetch Payments
      const qPayments = query(collection(db, 'payments'), where('projectId', '==', doc(db, 'practiceProjects', id!)));
      const paymentsSnap = await getDocs(qPayments);
      setPayments(paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B365D]"></div>
      </div>
    );
  }

  if (!project || !course) {
    return (
      <div className="p-10 text-center">
        <p>Project or Course data could not be loaded.</p>
        <Link to="/admin/projects" className="text-[#1B365D] underline">Back to Projects</Link>
      </div>
    );
  }

  // Calculate some summaries
  const totalStudents = groups.reduce((acc, g) => acc + (g.studentCount || 0), 0);
  const totalPayments = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const pendingPayments = payments.filter(p => p.status === 'pending').reduce((acc, p) => acc + (p.amount || 0), 0);

  return (
    <div className="flex flex-col h-full space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 border-b border-[#1A1A1A]/10 pb-6">
        <Link to="/admin/projects" className="p-2 bg-white border border-[#1A1A1A]/10 hover:bg-[#F4F1EA] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60 bg-[#1A1A1A]/5 px-2 py-0.5">{course.code}</span>
            <span className={`px-2 py-0.5 text-[10px] uppercase tracking-widest font-bold rounded-sm ${
              project.status === 'planning' ? 'bg-[#1A1A1A]/10 text-[#1A1A1A]/60' :
              project.status === 'ongoing' ? 'bg-[#D4AF37]/20 text-[#D4AF37]' :
              'bg-green-100 text-green-700'
            }`}>
              {project.status}
            </span>
          </div>
          <h2 className="text-3xl font-serif italic text-[#1B365D]">{course.name}</h2>
        </div>
      </div>
      
      <div className="flex justify-end">
        <Link 
          to={`/admin/projects/${id}/assignments`}
          className="px-6 py-3 bg-[#1B365D] text-white text-[10px] uppercase tracking-widest font-bold hover:bg-[#1B365D]/90 transition-colors"
        >
          Manage Student Assignments
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Course Info & Period */}
        <div className="md:col-span-2 space-y-6">
          <section className="bg-white border border-[#1A1A1A]/10 p-6">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/40 mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Course Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[#1A1A1A]/60 mb-1">Academic Year</p>
                <p className="font-bold">{course.academicYear} / S{course.semester}</p>
              </div>
              <div>
                <p className="text-sm text-[#1A1A1A]/60 mb-1">Practice Hours</p>
                <p className="font-bold">{course.practiceHours} hours</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-[#1A1A1A]/60 mb-1">Description</p>
                <p className="text-sm">{course.description || 'No description provided.'}</p>
              </div>
            </div>
          </section>

          {/* Practice Sites & Accommodation (Placeholder for rooms) */}
          <section className="bg-white border border-[#1A1A1A]/10 p-6">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/40 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Sites & Accommodation
            </h3>
            {sites.length === 0 ? (
              <p className="text-sm text-[#1A1A1A]/40 italic">No sites assigned to this course.</p>
            ) : (
              <div className="space-y-4">
                {sites.map(site => (
                  <div key={site.id} className="p-4 border border-[#1A1A1A]/5 bg-[#F4F1EA]/50">
                    <p className="font-bold text-[#1B365D] mb-1">{site.name}</p>
                    <p className="text-sm text-[#1A1A1A]/60">{site.address}</p>
                    <div className="mt-3 text-xs flex gap-4">
                      <span className="bg-white border border-[#1A1A1A]/10 px-2 py-1">Capacity: {site.capacity}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <section className="bg-white border border-[#1A1A1A]/10 p-6">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/40 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Practice Period
            </h3>
            <p className="font-bold text-lg">{course.practicePeriod || 'TBD'}</p>
            
            <div className="mt-6">
              <div className="flex justify-between items-center text-sm text-[#1A1A1A]/60 mb-2">
                <span>Overall Progress</span>
                <span className="font-bold">{project.progress || 0}%</span>
              </div>
              <div className="h-2 w-full bg-[#1A1A1A]/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#1B365D] transition-all" style={{ width: `${project.progress || 0}%` }}></div>
              </div>
            </div>
          </section>

          <section className="bg-white border border-[#1A1A1A]/10 p-6">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/40 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" /> Students ({totalStudents})
            </h3>
            {groups.length === 0 ? (
              <p className="text-sm text-[#1A1A1A]/40 italic">No student groups assigned.</p>
            ) : (
              <ul className="space-y-2">
                {groups.map(g => (
                  <li key={g.id} className="text-sm flex justify-between border-b border-[#1A1A1A]/5 pb-2">
                    <span>{g.name} (Yr {g.year})</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white border border-[#1A1A1A]/10 p-6">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/40 mb-4 flex items-center gap-2">
              <UserCheck className="w-4 h-4" /> Instructors
            </h3>
            {instructors.length === 0 ? (
              <p className="text-sm text-[#1A1A1A]/40 italic">No instructors assigned yet.</p>
            ) : (
              <ul className="space-y-3">
                {instructors.map((t, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#F4F1EA] flex items-center justify-center text-[#1B365D]">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{t.name}</p>
                      <p className="text-[10px] uppercase tracking-widest text-[#1A1A1A]/60">{t.assignment.role}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* Transport & Payments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white border border-[#1A1A1A]/10 p-6">
          <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/40 mb-4 flex items-center gap-2">
            <Bus className="w-4 h-4" /> Transportation
          </h3>
          {transport.length === 0 ? (
            <p className="text-sm text-[#1A1A1A]/40 italic">No transportation scheduled.</p>
          ) : (
            <div className="space-y-3">
              {transport.map(t => (
                <div key={t.id} className="flex justify-between items-center p-3 border border-[#1A1A1A]/5">
                  <div>
                    <p className="text-sm font-bold">{t.vehicleNumber}</p>
                    <p className="text-xs text-[#1A1A1A]/60">Driver: {t.driverName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-[#1B365D]">
                      {t.departureTime?.toDate().toLocaleDateString()}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-[#1A1A1A]/40">Departure</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-[#1A1A1A]/10 p-6">
          <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/40 mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Payment Summary
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-[#F4F1EA]/50 border border-[#1A1A1A]/5">
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60 mb-1">Total Collected</p>
              <p className="text-xl font-bold text-green-700">฿{totalPayments.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-red-50 border border-red-100">
              <p className="text-[10px] uppercase tracking-widest font-bold text-red-600/60 mb-1">Pending</p>
              <p className="text-xl font-bold text-red-700">฿{pendingPayments.toLocaleString()}</p>
            </div>
          </div>
          <p className="text-xs text-[#1A1A1A]/60 italic text-center">
            Payments are tracked per student. Showing aggregate for this project.
          </p>
        </section>
      </div>
    </div>
  );
}
