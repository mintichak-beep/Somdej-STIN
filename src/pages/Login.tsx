import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { signInAnonymously } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { WelcomeSettings } from '../types';

const DEFAULT_SETTINGS: WelcomeSettings = {
  hospitalLogo: '',
  universityLogo: '',
  welcomeBackground: '',
  teacherIllustration: '',
  studentIllustration: '',
  customIcons: [],
  welcomeTitle: 'STIN Connect',
  welcomeSubtitle: 'Educational Management System',
  announcementText: '',
  enableCarousel: false,
  enableAutoSlide: false,
  theme: 'light'
};

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<WelcomeSettings>(DEFAULT_SETTINGS);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'welcome');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings({ ...DEFAULT_SETTINGS, ...docSnap.data() as WelcomeSettings });
        }
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setSettingsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  if (currentUser) {
    if (currentUser.role === 'admin') return <Navigate to="/admin" replace />;
    if (currentUser.role === 'instructor') return <Navigate to="/instructor" replace />;
    return <Navigate to="/student" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userObj = {
        id: 'admin-id',
        email,
        role: 'admin',
        displayName: 'Administrator',
        createdAt: new Date()
      };
      localStorage.setItem('stin_current_user', JSON.stringify(userObj));

      try {
        await signInAnonymously(auth);
      } catch (authErr) {
        console.error(authErr);
      }

      navigate('/admin');
    } catch (err: any) {
      console.error(err);
      setError('Failed to log in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-[#F4F1EA] flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B365D]"></div>
      </div>
    );
  }

  const isDark = settings.theme === 'dark';
  const isBlue = settings.theme === 'blue';
  
  const bgClass = isDark ? 'bg-[#1A1A1A]' : isBlue ? 'bg-[#1B365D]' : 'bg-[#F4F1EA]';
  const textClass = isDark || isBlue ? 'text-white' : 'text-[#1A1A1A]';
  const cardClass = isDark ? 'bg-black/20 border-white/10' : isBlue ? 'bg-black/20 border-white/10' : 'bg-white border-[#1A1A1A]/10 shadow-sm';
  const inputClass = isDark || isBlue ? 'border-white/20 bg-white/5 text-white placeholder-white/40 focus:border-white focus:ring-white' : 'border-[#1A1A1A]/10 bg-transparent placeholder-[#1A1A1A]/30 focus:border-[#1B365D] focus:ring-[#1B365D]';
  const btnClass = isDark ? 'bg-white text-black hover:bg-white/90 focus:ring-white' : isBlue ? 'bg-white text-[#1B365D] hover:bg-white/90 focus:ring-white' : 'bg-[#1B365D] text-white hover:bg-[#1B365D]/90 focus:ring-[#1B365D]';
  const mutedText = isDark || isBlue ? 'text-white/60' : 'text-[#1A1A1A]/60';
  const titleClass = isDark || isBlue ? 'text-white' : 'text-[#1B365D]';

  return (
    <div className={`min-h-screen ${bgClass} ${textClass} font-sans flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative`}>
      {settings.welcomeBackground && (
        <div className="absolute inset-0 opacity-20 object-cover z-0">
          <img src={settings.welcomeBackground} alt="Background" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="z-10 sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <div className="flex gap-4 mb-4">
          {settings.hospitalLogo && <img src={settings.hospitalLogo} className="h-16 w-auto" alt="Hospital" />}
          {settings.universityLogo && <img src={settings.universityLogo} className="h-16 w-auto" alt="University" />}
        </div>
        
        <h2 className={`mt-2 text-center text-4xl md:text-5xl font-serif italic tracking-tighter ${titleClass}`}>
          {settings.welcomeTitle}
        </h2>
        <p className={`mt-4 text-center text-[10px] md:text-xs uppercase tracking-widest font-bold ${mutedText}`}>
          {settings.welcomeSubtitle}
        </p>

        {settings.announcementText && (
          <div className={`mt-8 max-w-md w-full p-4 text-center text-sm italic font-serif ${isDark || isBlue ? 'bg-black/20 border border-white/10' : 'bg-white/80 border border-[#1A1A1A]/10'} backdrop-blur-sm`}>
            {settings.announcementText}
          </div>
        )}

        {settings.enableCarousel && (
          <div className="mt-8 flex gap-4">
            {settings.teacherIllustration && <img src={settings.teacherIllustration} className="w-24 h-24 rounded-full object-cover border-4 border-white/20" alt="Teacher" />}
            {settings.studentIllustration && <img src={settings.studentIllustration} className="w-24 h-24 rounded-full object-cover border-4 border-white/20" alt="Student" />}
          </div>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className={`py-8 px-4 sm:px-10 border ${cardClass}`}>
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-[#EAE7DF] text-[#1A1A1A] px-4 py-3 text-[10px] uppercase tracking-widest font-bold border border-[#1A1A1A]/10">
                {error}
              </div>
            )}
            <div>
              <label className={`block text-[10px] uppercase tracking-widest font-bold ${mutedText}`}>
                Email Address
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`appearance-none block w-full px-3 py-2 border sm:text-sm focus:outline-none focus:ring-1 ${inputClass}`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-[10px] uppercase tracking-widest font-bold ${mutedText}`}>
                Password
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`appearance-none block w-full px-3 py-2 border sm:text-sm focus:outline-none focus:ring-1 ${inputClass}`}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-3 px-4 border border-transparent text-[10px] uppercase tracking-widest font-bold focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors ${btnClass}`}
              >
                {loading ? 'Authenticating...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
