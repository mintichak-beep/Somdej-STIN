import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { ArrowLeft, UserCheck, AlertCircle } from 'lucide-react';

export function StudentLogin() {
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const trimmedId = studentId.trim();
    if (!trimmedId) {
      setError('Student ID not found.');
      return;
    }

    setLoading(true);

    try {
      // 1. Check if students collection is empty; if so, seed studentId 65000001
      const allStudentsSnap = await getDocs(collection(db, 'students'));
      if (allStudentsSnap.empty) {
        const demoStudentRef = doc(collection(db, 'students'));
        await setDoc(demoStudentRef, {
          studentId: '65000001',
          firstName: 'Demo',
          lastName: 'Student',
          email: '65000001@student.stin.ac.th',
          createdAt: new Date()
        });
      }

      // 2. Lookup in students collection by studentId
      const studentsQuery = query(collection(db, 'students'), where('studentId', '==', trimmedId));
      const studentsSnap = await getDocs(studentsQuery);

      if (studentsSnap.empty) {
        setError('Student ID not found.');
        setLoading(false);
        return;
      }

      const studentData = studentsSnap.docs[0].data();
      const sEmail = studentData.email || `${trimmedId.toLowerCase()}@student.stin.ac.th`;
      
      const userObj = {
        id: studentsSnap.docs[0].id,
        email: sEmail,
        studentId: trimmedId,
        role: 'student',
        displayName: `${studentData.firstName || 'Student'} ${studentData.lastName || ''}`.trim(),
        createdAt: new Date()
      };

      localStorage.setItem('stin_current_user', JSON.stringify(userObj));

      try {
        await signInAnonymously(auth);
      } catch (authErr) {
        console.error(authErr);
      }

      navigate('/student');
    } catch (err: any) {
      console.error(err);
      setError('Student ID not found.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#1A1A1A] font-sans flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-8 left-8">
        <button 
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-[#1A1A1A]/60 hover:text-[#C8102E] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Portal Select</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <div className="w-14 h-14 bg-[#1B365D]/10 rounded-xl flex items-center justify-center mb-4 text-[#1B365D]">
          <UserCheck className="w-7 h-7" />
        </div>
        <h2 className="text-center text-4xl font-serif italic tracking-tight text-[#1A1A1A]">
          Student Login
        </h2>
        <p className="mt-2 text-center text-xs uppercase tracking-widest font-bold text-[#1A1A1A]/60">
          Clinical Practice Student Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl border border-[#1A1A1A]/10 rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-[#C8102E]/10 text-[#C8102E] p-4 text-xs font-bold rounded-lg flex items-center gap-3 border border-[#C8102E]/20">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60 mb-2">
                Student ID
              </label>
              <input
                type="text"
                required
                placeholder="e.g. ST1001 or 65123456"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="appearance-none block w-full px-4 py-3 border border-[#1A1A1A]/20 rounded-xl bg-white placeholder-[#1A1A1A]/30 focus:outline-none focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/20 text-sm transition-all"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-xs uppercase tracking-widest font-bold text-white bg-[#C8102E] hover:bg-[#C8102E]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C8102E] disabled:opacity-50 transition-all shadow-md shadow-[#C8102E]/20"
              >
                {loading ? 'Verifying Student ID...' : 'Continue'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
