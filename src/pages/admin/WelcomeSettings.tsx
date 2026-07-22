import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { WelcomeSettings } from '../../types';
import { Upload, Image as ImageIcon, Layout, Settings, Monitor, Tablet, Smartphone, Save } from 'lucide-react';

const DEFAULT_SETTINGS: WelcomeSettings = {
  hospitalLogo: '',
  universityLogo: '',
  welcomeBackground: '',
  teacherIllustration: '',
  studentIllustration: '',
  customIcons: [],
  welcomeTitle: 'STIN Connect',
  welcomeSubtitle: 'Educational Management System',
  announcementText: 'Welcome to the clinical practice portal.',
  enableCarousel: false,
  enableAutoSlide: false,
  theme: 'light'
};

export function WelcomeSettingsManager() {
  const [settings, setSettings] = useState<WelcomeSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState<'content' | 'media' | 'theme'>('content');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'welcome');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSettings({ ...DEFAULT_SETTINGS, ...docSnap.data() });
      }
    } catch (error) {
      console.error('Error fetching welcome settings', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'welcome'), settings);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings', error);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (field: keyof WelcomeSettings, file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setSettings(prev => ({ ...prev, [field]: result }));
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B365D]"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex justify-between items-end border-b border-[#1A1A1A]/10 pb-4">
        <div>
          <h2 className="text-4xl md:text-5xl font-serif italic mb-2 tracking-tighter text-[#1B365D]">Welcome Management</h2>
          <p className="text-sm text-[#1A1A1A]/60 max-w-md">Customize the landing and login experience for users.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-[#1B365D] text-white text-[10px] uppercase tracking-widest font-bold hover:bg-[#1B365D]/90 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[600px]">
        {/* Settings Panel */}
        <div className="w-full lg:w-1/3 flex flex-col bg-white border border-[#1A1A1A]/10">
          <div className="flex border-b border-[#1A1A1A]/10">
            <button 
              className={`flex-1 py-3 text-[10px] uppercase tracking-widest font-bold ${activeTab === 'content' ? 'bg-[#1B365D] text-white' : 'hover:bg-[#F4F1EA] text-[#1A1A1A]/60'}`}
              onClick={() => setActiveTab('content')}
            >
              Content
            </button>
            <button 
              className={`flex-1 py-3 text-[10px] uppercase tracking-widest font-bold ${activeTab === 'media' ? 'bg-[#1B365D] text-white' : 'hover:bg-[#F4F1EA] text-[#1A1A1A]/60'}`}
              onClick={() => setActiveTab('media')}
            >
              Media
            </button>
            <button 
              className={`flex-1 py-3 text-[10px] uppercase tracking-widest font-bold ${activeTab === 'theme' ? 'bg-[#1B365D] text-white' : 'hover:bg-[#F4F1EA] text-[#1A1A1A]/60'}`}
              onClick={() => setActiveTab('theme')}
            >
              Theme
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === 'content' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Welcome Title</label>
                  <input type="text" value={settings.welcomeTitle} onChange={e => setSettings({...settings, welcomeTitle: e.target.value})} className="w-full p-2 bg-[#F4F1EA] border-none text-sm focus:ring-1 focus:ring-[#1B365D]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Subtitle</label>
                  <input type="text" value={settings.welcomeSubtitle} onChange={e => setSettings({...settings, welcomeSubtitle: e.target.value})} className="w-full p-2 bg-[#F4F1EA] border-none text-sm focus:ring-1 focus:ring-[#1B365D]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Announcement Text</label>
                  <textarea value={settings.announcementText} onChange={e => setSettings({...settings, announcementText: e.target.value})} className="w-full p-2 bg-[#F4F1EA] border-none text-sm focus:ring-1 focus:ring-[#1B365D] min-h-[100px]" />
                </div>
              </div>
            )}

            {activeTab === 'media' && (
              <div className="space-y-6">
                {[
                  { id: 'hospitalLogo', label: 'Hospital Logo' },
                  { id: 'universityLogo', label: 'University Logo' },
                  { id: 'welcomeBackground', label: 'Background Image' },
                  { id: 'teacherIllustration', label: 'Teacher Illustration' },
                  { id: 'studentIllustration', label: 'Student Illustration' },
                ].map(field => (
                  <div key={field.id} className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">{field.label}</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-[#F4F1EA] border border-[#1A1A1A]/10 flex items-center justify-center overflow-hidden">
                        {(settings as any)[field.id] ? (
                          <img src={(settings as any)[field.id]} alt={field.label} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-[#1A1A1A]/20" />
                        )}
                      </div>
                      <label className="cursor-pointer px-4 py-2 border border-[#1A1A1A]/10 text-[10px] uppercase tracking-widest font-bold hover:bg-[#F4F1EA] transition-colors">
                        <Upload className="w-4 h-4 inline-block mr-2" />
                        Upload
                        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files && handleImageUpload(field.id as any, e.target.files[0])} />
                      </label>
                      {(settings as any)[field.id] && (
                        <button onClick={() => setSettings({...settings, [field.id]: ''})} className="text-[10px] text-red-500 uppercase font-bold hover:underline">
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                <div className="pt-4 border-t border-[#1A1A1A]/10">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={settings.enableCarousel} onChange={e => setSettings({...settings, enableCarousel: e.target.checked})} />
                    <span className="text-sm font-bold">Enable Image Carousel</span>
                  </label>
                </div>
                {settings.enableCarousel && (
                  <div className="pl-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={settings.enableAutoSlide} onChange={e => setSettings({...settings, enableAutoSlide: e.target.checked})} />
                      <span className="text-sm">Auto Slide</span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'theme' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Color Theme</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => setSettings({...settings, theme: 'light'})}
                      className={`p-4 border ${settings.theme === 'light' ? 'border-[#1B365D] bg-[#F4F1EA]' : 'border-[#1A1A1A]/10'} text-center`}
                    >
                      <div className="w-full h-8 bg-[#F4F1EA] border border-[#1A1A1A]/10 mb-2"></div>
                      <span className="text-[10px] font-bold uppercase">Light</span>
                    </button>
                    <button 
                      onClick={() => setSettings({...settings, theme: 'dark'})}
                      className={`p-4 border ${settings.theme === 'dark' ? 'border-[#1B365D] bg-[#F4F1EA]' : 'border-[#1A1A1A]/10'} text-center`}
                    >
                      <div className="w-full h-8 bg-[#1A1A1A] mb-2"></div>
                      <span className="text-[10px] font-bold uppercase">Dark</span>
                    </button>
                    <button 
                      onClick={() => setSettings({...settings, theme: 'blue'})}
                      className={`p-4 border ${settings.theme === 'blue' ? 'border-[#1B365D] bg-[#F4F1EA]' : 'border-[#1A1A1A]/10'} text-center`}
                    >
                      <div className="w-full h-8 bg-[#1B365D] mb-2"></div>
                      <span className="text-[10px] font-bold uppercase">Blue</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Preview Panel */}
        <div className="flex-1 bg-[#F4F1EA] border border-[#1A1A1A]/10 flex flex-col overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-[#1A1A1A]/10 bg-white">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/60 flex items-center gap-2">
              <Layout className="w-4 h-4" /> Live Preview
            </h3>
            <div className="flex gap-2">
              <button onClick={() => setPreviewMode('desktop')} className={`p-2 ${previewMode === 'desktop' ? 'bg-[#1B365D] text-white' : 'text-[#1A1A1A]/40 hover:bg-[#F4F1EA]'}`}><Monitor className="w-4 h-4" /></button>
              <button onClick={() => setPreviewMode('tablet')} className={`p-2 ${previewMode === 'tablet' ? 'bg-[#1B365D] text-white' : 'text-[#1A1A1A]/40 hover:bg-[#F4F1EA]'}`}><Tablet className="w-4 h-4" /></button>
              <button onClick={() => setPreviewMode('mobile')} className={`p-2 ${previewMode === 'mobile' ? 'bg-[#1B365D] text-white' : 'text-[#1A1A1A]/40 hover:bg-[#F4F1EA]'}`}><Smartphone className="w-4 h-4" /></button>
            </div>
          </div>
          
          <div className="flex-1 p-4 md:p-8 flex items-center justify-center overflow-auto">
            {/* Device Frame */}
            <div 
              className={`transition-all duration-300 origin-top shadow-2xl overflow-hidden flex flex-col border border-[#1A1A1A]/10
                ${previewMode === 'desktop' ? 'w-full max-w-[1200px] h-[700px]' : 
                  previewMode === 'tablet' ? 'w-[768px] h-[1024px]' : 
                  'w-[375px] h-[812px] rounded-[2rem] border-8 border-gray-900'}
                ${settings.theme === 'dark' ? 'bg-[#1A1A1A] text-white' : 
                  settings.theme === 'blue' ? 'bg-[#1B365D] text-white' : 
                  'bg-[#F4F1EA] text-[#1A1A1A]'}
              `}
            >
              {/* Preview Content (Mimicking Login.tsx layout) */}
              <div className="flex-1 flex flex-col relative">
                {settings.welcomeBackground && (
                  <div className="absolute inset-0 opacity-20 object-cover">
                    <img src={settings.welcomeBackground} alt="Background" className="w-full h-full object-cover" />
                  </div>
                )}
                
                <div className="flex-1 flex flex-col justify-center items-center z-10 p-6">
                  <div className="flex gap-4 mb-8">
                    {settings.hospitalLogo && <img src={settings.hospitalLogo} className="h-16 w-auto" alt="Hospital" />}
                    {settings.universityLogo && <img src={settings.universityLogo} className="h-16 w-auto" alt="University" />}
                  </div>
                  
                  <h2 className={`text-center text-4xl md:text-5xl font-serif italic tracking-tighter ${settings.theme === 'light' ? 'text-[#1B365D]' : 'text-white'}`}>
                    {settings.welcomeTitle || 'STIN Connect'}
                  </h2>
                  <p className={`mt-4 text-center text-[10px] md:text-xs uppercase tracking-widest font-bold ${settings.theme === 'light' ? 'text-[#1A1A1A]/40' : 'text-white/60'}`}>
                    {settings.welcomeSubtitle || 'Educational Management System'}
                  </p>

                  {settings.announcementText && (
                    <div className={`mt-8 max-w-md p-4 text-center text-sm italic font-serif ${settings.theme === 'light' ? 'bg-white/80 border border-[#1A1A1A]/10' : 'bg-black/20 border border-white/10'} backdrop-blur-sm`}>
                      {settings.announcementText}
                    </div>
                  )}

                  {settings.enableCarousel && (
                    <div className="mt-8 flex gap-4">
                      {settings.teacherIllustration && <img src={settings.teacherIllustration} className="w-24 h-24 rounded-full object-cover border-4 border-white/20" alt="Teacher" />}
                      {settings.studentIllustration && <img src={settings.studentIllustration} className="w-24 h-24 rounded-full object-cover border-4 border-white/20" alt="Student" />}
                    </div>
                  )}

                  <div className={`mt-12 w-full max-w-sm p-6 ${settings.theme === 'light' ? 'bg-white shadow-sm border border-[#1A1A1A]/10' : 'bg-black/20 border border-white/10'}`}>
                    <div className="space-y-4">
                      <div className={`h-10 w-full ${settings.theme === 'light' ? 'bg-[#F4F1EA]' : 'bg-white/10'} rounded-sm`}></div>
                      <div className={`h-10 w-full ${settings.theme === 'light' ? 'bg-[#F4F1EA]' : 'bg-white/10'} rounded-sm`}></div>
                      <div className={`h-12 w-full ${settings.theme === 'light' ? 'bg-[#1B365D]' : 'bg-white text-[#1B365D]'} rounded-sm flex items-center justify-center`}>
                        <span className="text-[10px] uppercase tracking-widest font-bold opacity-80">Sign In</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
