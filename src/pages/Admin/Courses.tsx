import React, { useState, useEffect } from 'react';
import { getCourses, saveCourses, getClasses, getStaffs, getCourseWebsiteLinks, saveCourseWebsiteLinks } from '../../lib/db';
import { BookOpen, Plus, Trash2, ArrowLeft, ExternalLink, ChevronDown, List, LayoutGrid, Folder, Globe, Save } from 'lucide-react';

const GRADES = [
  "தரம் 01", "தரம் 02", "தரம் 03", "தரம் 04", "தரம் 05", 
  "தரம் 06", "தரம் 07", "தரம் 08", "தரம் 09", "தரம் 10", 
  "தரம் 11", "தரம் 12", "தரம் 13"
];

export default function Courses() {
  const [view, setView] = useState<'menu' | 'add' | 'view' | 'links'>('menu');
  const [courses, setCourses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [staffs, setStaffs] = useState<any[]>([]);
  const [courseLinks, setCourseLinks] = useState<Record<string, string>>({});
  const [filterClass, setFilterClass] = useState<string>("");
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getCourses().then(setCourses);
    getClasses().then(setClasses);
    getStaffs().then(setStaffs);
    getCourseWebsiteLinks().then(links => setCourseLinks(links || {}));
  }, [view]);

  const [formData, setFormData] = useState({
    grade: '',
    subject: '',
    title: '',
    link: '',
    folder: ''
  });

  const handleSaveLinks = async () => {
    await saveCourseWebsiteLinks(courseLinks);
    alert('Links Saved Successfully');
    setView('menu');
  };


  const getFolderColor = (folderName: string) => {
    const colors = [
      { bg: 'bg-red-50', text: 'text-red-600', icon: 'bg-red-600', border: 'border-red-100', shadow: 'shadow-red-100' },
      { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'bg-blue-600', border: 'border-blue-100', shadow: 'shadow-blue-100' },
      { bg: 'bg-green-50', text: 'text-green-600', icon: 'bg-green-600', border: 'border-green-100', shadow: 'shadow-green-100' },
      { bg: 'bg-purple-50', text: 'text-purple-600', icon: 'bg-purple-600', border: 'border-purple-100', shadow: 'shadow-purple-100' },
      { bg: 'bg-orange-50', text: 'text-orange-600', icon: 'bg-orange-600', border: 'border-orange-100', shadow: 'shadow-orange-100' },
      { bg: 'bg-pink-50', text: 'text-pink-600', icon: 'bg-pink-600', border: 'border-pink-100', shadow: 'shadow-pink-100' },
      { bg: 'bg-indigo-50', text: 'text-indigo-600', icon: 'bg-indigo-600', border: 'border-indigo-100', shadow: 'shadow-indigo-100' },
      { bg: 'bg-teal-50', text: 'text-teal-600', icon: 'bg-teal-600', border: 'border-teal-100', shadow: 'shadow-teal-100' },
    ];
    let hash = 0;
    for (let i = 0; i < folderName.length; i++) {
        hash = folderName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Get unique subjects for the selected grade
  const availableSubjects = Array.from(new Set(
    staffs.flatMap(s => s.assignedClasses?.filter((c: any) => c.grade === formData.grade).map((c: any) => c.subject) || [])
  ));

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.link || !formData.grade || !formData.subject) {
      alert("Class, Subject, Title and Link are required!");
      return;
    }
    const newCourse = { id: Date.now().toString(), ...formData };
    const updatedCourses = [...courses, newCourse];
    setCourses(updatedCourses);
    await saveCourses(updatedCourses);
    alert('Course Added');
    setFormData({ grade: '', subject: '', title: '', link: '', folder: '' });
    setView('menu');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this course?")) {
      const updatedCourses = courses.filter(c => c.id !== id);
      setCourses(updatedCourses);
      await saveCourses(updatedCourses);
    }
  };

  if (view === 'menu') {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div className="bg-gradient-to-br from-slate-900 to-indigo-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
           <div className="relative">
              <div className="flex items-center gap-3 mb-2">
                 <div className="w-12 h-12 bg-white text-indigo-900 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
                    <BookOpen size={24} />
                 </div>
                 <span className="font-black uppercase tracking-[0.2em] text-indigo-300 text-sm">Learning Center</span>
              </div>
              <h1 className="text-4xl font-black mb-4">Course Management</h1>
              <p className="text-indigo-100/70 max-w-xl font-medium">Manage all study units, recordings and learning materials for the academy website.</p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button 
            onClick={() => setView('add')}
            className="group relative bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-sm hover:border-indigo-600 hover:shadow-2xl transition-all text-left overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100 mb-6 group-hover:rotate-6 transition-all">
               <Plus size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Add New Material</h3>
            <p className="text-slate-500 font-medium">Upload recordings, PDFs, or external course links categorized by grade and subject.</p>
          </button>

          <button 
            onClick={() => setView('view')}
            className="group relative bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-sm hover:border-indigo-600 hover:shadow-2xl transition-all text-left overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-100 mb-6 group-hover:rotate-6 transition-all">
               <LayoutGrid size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Manage All Library</h3>
            <p className="text-slate-500 font-medium font-medium">View, filter, and organize study content for all enrolled classes.</p>
          </button>

          <button 
            onClick={() => setView('links')}
            className="group relative bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-sm hover:border-blue-600 hover:shadow-2xl transition-all text-left overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-blue-100 mb-6 group-hover:rotate-6 transition-all">
               <Globe size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Website Grade Links</h3>
            <p className="text-slate-500 font-medium">Set direct website course links for each grade from 01 to 13.</p>
          </button>
        </div>
      </div>
    );
  }

  if (view === 'links') {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-4">
              <button 
                onClick={() => setView('menu')} 
                className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-indigo-600 transition-all shadow-sm"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                 <h2 className="text-3xl font-black text-slate-900">Website Grade Links</h2>
                 <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Direct Course Routing</p>
              </div>
           </div>
           <button 
              onClick={handleSaveLinks}
              className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100"
           >
              <Save size={20} />
              Save All Links
           </button>
        </div>

        <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden p-8 space-y-6">
          <p className="text-slate-500 font-medium bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-start gap-4">
            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">i</span>
            These links will be shown to students if they don't have any specific course material uploaded yet.
          </p>
          
          <div className="grid grid-cols-1 gap-4">
            {GRADES.map(grade => (
              <div key={grade} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                <span className="w-24 font-black text-slate-700">{grade}:</span>
                <input 
                  type="url" 
                  placeholder="https://www.agaramdhines.lk/courses/..."
                  value={courseLinks[grade] || ''}
                  onChange={(e) => setCourseLinks({...courseLinks, [grade]: e.target.value})}
                  className="flex-1 bg-white border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-indigo-600 transition-all"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'add') {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8 md:p-12">
        <div className="flex items-center justify-between mb-10">
          <button 
            onClick={() => setView('menu')} 
            className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-slate-100 text-slate-400 hover:bg-slate-50 hover:text-indigo-600 transition-all"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="text-center">
             <h2 className="text-3xl font-black text-slate-900">New Material</h2>
             <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Website Study Resources</p>
          </div>
          <div className="w-12"></div>
        </div>
        
        <form className="space-y-6" onSubmit={handleAddCourse}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Target Grade</label>
              <select 
                value={formData.grade}
                onChange={(e) => setFormData({...formData, grade: e.target.value, subject: ''})}
                className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all text-sm font-bold bg-slate-50"
              >
                <option value="">Select Grade</option>
                {classes.length > 0 ? (
                  classes.map((cls) => (
                    <option key={cls.id} value={cls.name}>
                      {cls.name}
                    </option>
                  ))
                ) : (
                  GRADES.map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Subject</label>
              <select 
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all text-sm font-bold bg-slate-50 disabled:opacity-50"
                disabled={!formData.grade}
              >
                <option value="">Select Subject</option>
                {availableSubjects.map((subject: any) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
                {formData.grade && availableSubjects.length === 0 && (
                  <option value="" disabled>No subjects assigned</option>
                )}
              </select>
            </div>
          </div>

          <div>
             <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Unit / Folder (Optional)</label>
             <input 
                type="text" 
                placeholder="e.g., Unit 01 - Basics" 
                value={formData.folder}
                onChange={(e) => setFormData({...formData, folder: e.target.value})}
                className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-bold" 
             />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Material Title</label>
            <input 
              type="text" 
              placeholder="Enter unit name or video title..." 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-bold" 
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Link Source</label>
            <input 
              type="url" 
              placeholder="https://..." 
              value={formData.link}
              onChange={(e) => setFormData({...formData, link: e.target.value})}
              className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-bold text-blue-600" 
            />
          </div>

          <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-3xl hover:bg-slate-900 transition-all font-black text-lg shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 mt-4">
             <Plus size={24} />
             Add to Library
          </button>
        </form>
      </div>
    );
  }

  if (view === 'view') {
    const filteredCourses = filterClass 
      ? courses.filter(c => c.grade === filterClass)
      : courses;

    // Grouping for accordion view
    const folderGroups: Record<string, any[]> = {};
    filteredCourses.forEach(c => {
       const key = c.folder || `${c.grade} General Content`;
       if (!folderGroups[key]) folderGroups[key] = [];
       folderGroups[key].push(c);
    });

    return (
      <div className="max-w-6xl mx-auto p-6 space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setView('menu')} 
              className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-indigo-600 transition-all shadow-sm"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
               <h2 className="text-3xl font-black text-slate-900">Manage Library</h2>
               <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Study Material Repository</p>
            </div>
          </div>
          
          <div className="flex items-center bg-white p-2 rounded-2xl border-2 border-slate-100 shadow-sm gap-3">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Class:</span>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="border-none bg-transparent focus:ring-0 text-sm font-black text-indigo-600"
            >
              <option value="">All Materials</option>
              {classes.length > 0 ? (
                classes.map((cls) => (
                  <option key={cls.id} value={cls.name}>{cls.name}</option>
                ))
              ) : (
                GRADES.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="space-y-6">
          {Object.keys(folderGroups).length === 0 ? (
            <div className="bg-white rounded-[3rem] p-24 text-center border-2 border-slate-100 border-dashed">
               <Folder size={64} className="mx-auto text-slate-100 mb-6" />
               <h3 className="text-2xl font-black text-slate-300">No Content Found</h3>
            </div>
          ) : (
            Object.keys(folderGroups).sort().map(folderName => {
               const groupColor = getFolderColor(folderName);
               const isExpanded = expandedFolders[folderName];
               return (
                  <div key={folderName} className={`bg-white border-2 ${groupColor.border} rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl transition-all`}>
                     <button 
                        onClick={() => setExpandedFolders(prev => ({ ...prev, [folderName]: !prev[folderName] }))}
                        className={`w-full flex items-center justify-between p-7 hover:bg-white/50 transition-colors group ${groupColor.bg}`}
                     >
                        <div className="flex items-center gap-6 text-left">
                           <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${isExpanded ? `${groupColor.icon} text-white shadow-lg ${groupColor.shadow} rotate-6` : `${groupColor.bg} ${groupColor.text} border ${groupColor.border}`}`}>
                              <Folder size={28} />
                           </div>
                           <div>
                              <h3 className={`text-xl font-black ${groupColor.text} leading-tight`}>{folderName}</h3>
                              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                                 {folderGroups[folderName].length} Library Items
                              </p>
                           </div>
                        </div>
                        <div className={`transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''} ${groupColor.text}`}>
                           <ChevronDown size={24} />
                        </div>
                     </button>

                     {isExpanded && (
                        <div className="p-6 md:p-10 pt-0 space-y-4 bg-slate-50/20">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {folderGroups[folderName].map(course => (
                                 <div key={course.id} className="bg-white border-2 border-slate-100 rounded-3xl p-6 flex flex-col gap-4 shadow-sm hover:border-indigo-600 transition-all">
                                    <div className="flex justify-between items-start">
                                       <div>
                                          <div className="flex items-center gap-2 mb-2">
                                             <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                                                {course.grade}
                                             </span>
                                             <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                                                {course.subject}
                                             </span>
                                          </div>
                                          <h4 className="text-lg font-black text-slate-800 leading-tight mb-2">{course.title}</h4>
                                          <a href={course.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-xs font-bold hover:underline truncate inline-flex items-center gap-1">
                                             <ExternalLink size={12} /> {course.link}
                                          </a>
                                       </div>
                                       <button 
                                          onClick={() => handleDelete(course.id)}
                                          className="p-2.5 text-red-100 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                       >
                                          <Trash2 size={20} />
                                       </button>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}
                  </div>
               );
            })
          )}
        </div>
      </div>
    );
  }

  return null;
}

