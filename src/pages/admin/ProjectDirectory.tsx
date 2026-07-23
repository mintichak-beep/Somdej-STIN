import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Course, PracticeProject } from '../../types';
import { Calendar, Search, Filter, ChevronRight, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ProjectDirectory() {
  const [projects, setProjects] = useState<(PracticeProject & { course?: Course })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const projectsSnap = await getDocs(collection(db, 'practiceProjects'));
      const projectsData = projectsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PracticeProject));

      const coursesSnap = await getDocs(collection(db, 'courses'));
      const coursesData = coursesSnap.docs.reduce((acc, d) => {
        acc[d.id] = { id: d.id, ...d.data() } as Course;
        return acc;
      }, {} as Record<string, Course>);

      const combined = projectsData.map(p => ({
        ...p,
        course: coursesData[p.courseId.id]
      }));

      setProjects(combined);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-8">
      <div>
        <h2 className="text-4xl md:text-5xl font-serif italic mb-2 tracking-tighter text-[#1A1A1A]">Clinical Practice Projects</h2>
        <p className="text-sm text-[#1A1A1A]/60 max-w-md">Overview of all active clinical practice projects synced from the clinical course directory.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-10 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B365D]"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="col-span-full p-10 text-center border border-[#1A1A1A]/10 bg-white">
            <p className="text-sm text-[#1A1A1A]/40 italic font-serif">No clinical practice projects found.</p>
          </div>
        ) : (
          projects.map(project => (
            <Link key={project.id} to={`/admin/projects/${project.id}`} className="group block border border-[#1A1A1A]/10 bg-white hover:bg-[#F4F1EA] transition-colors overflow-hidden flex flex-col">
              <div className="p-6 border-b border-[#1A1A1A]/10 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#D4AF37] rounded-full"></span>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">{project.course?.code || 'Unknown'}</span>
                  </div>
                  <span className={`px-2 py-1 text-[10px] uppercase tracking-widest font-bold rounded-sm ${
                    project.status === 'planning' ? 'bg-[#1A1A1A]/10 text-[#1A1A1A]/60' :
                    project.status === 'ongoing' ? 'bg-[#D4AF37]/20 text-[#D4AF37]' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {project.status}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-[#1B365D] mb-2">{project.course?.name || 'Unknown Clinical Course'}</h3>
                <p className="text-sm text-[#1A1A1A]/60 line-clamp-2 mb-4">{project.course?.description}</p>
                
                <div className="space-y-2 mt-auto">
                  <div className="flex items-center gap-2 text-sm text-[#1A1A1A]/60">
                    <Calendar className="w-4 h-4" />
                    <span>{project.course?.practicePeriod || 'Unscheduled'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-[#1A1A1A]/60">
                    <span>Progress</span>
                    <span className="font-bold">{project.progress || 0}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#1A1A1A]/10 rounded-full overflow-hidden">
                    <div className="h-full bg-[#1B365D] transition-all" style={{ width: `${project.progress || 0}%` }}></div>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-[#F4F1EA] group-hover:bg-[#1B365D] group-hover:text-white transition-colors flex items-center justify-between text-sm font-bold">
                <span>View Details</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
