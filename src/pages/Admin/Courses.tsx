import React, { useState, useEffect } from 'react';
import { 
  getCourses, saveCourses, getClasses, getStaffs, 
  getSubjects, saveSubjects,
  getStudentMenuLabels, saveStudentMenuLabels,
  DEFAULT_STUDENT_MENU_LABELS, StudentMenuLabels,
  mergeArraysById
} from '../../lib/db';
import { 
  GRADES_LIST, GRADE_COLOR_CONFIG, normalizeGradeString, doesItemMatchGrade,
  POST_COLOR_THEMES, getPostTheme, RecordingItem
} from '../../components/RecordingSection';
import { 
  BookOpen, Plus, Trash2, ArrowLeft, ExternalLink, 
  ChevronDown, LayoutGrid, Folder, Save, 
  Edit3, Check, Code, Users, Gamepad2, Image as ImageIcon, 
  FileText, Play, RefreshCw, Eye, Sparkles, Copy,
  Tag, Layers, MessageCircle, Calendar, Award, ShieldAlert,
  DollarSign, Phone, CheckCircle2, RotateCcw, AlertTriangle,
  Star, Search
} from 'lucide-react';

export default function Courses() {
  const [view, setView] = useState<'menu' | 'add' | 'view' | 'subjects' | 'menu_labels'>('menu');
  const [courses, setCourses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [staffs, setStaffs] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [menuLabels, setMenuLabels] = useState<StudentMenuLabels>(DEFAULT_STUDENT_MENU_LABELS);
  const [selectedLibraryGrade, setSelectedLibraryGrade] = useState<string | null>(null);
  const [librarySearch, setLibrarySearch] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [customSubjectInput, setCustomSubjectInput] = useState<string>('');

  // Form Data State supporting all Post types (Web Posts, HTML Code Live View, Student Box, Mobile Games, Images)
  const [itemType, setItemType] = useState<'webpost' | 'html_code' | 'student_box' | 'mobile_game' | 'image_post'>('webpost');
  const [formData, setFormData] = useState({
    grade: '',
    subject: '',
    title: '',
    link: '',
    folder: 'General',
    content: '',
    code: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; padding: 20px; text-align: center; background: #f0fdf4; color: #166534; }
    h1 { font-size: 24px; }
    button { background: #16a34a; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; }
  </style>
</head>
<body>
  <h1>✨ Live Web View</h1>
  <p>Interactive HTML5 / CSS3 / JavaScript Content</p>
  <button onclick="alert('Hello from Agaram Dhines Academy!')">Click Me</button>
</body>
</html>`,
    codeLanguage: 'html',
    imageUrl: '',
    studentNamesText: 'Dineshkumar\nKaviyarasan\nPraveen Kumar\nKeerthika\nSangeetha\nAnandhan',
    gameType: 'word_quiz' as 'word_quiz' | 'math_game' | 'memory_match' | 'flappy' | 'custom_url'
  });

  const loadCoursesData = () => {
    getCourses().then(setCourses);
    getClasses().then(setClasses);
    getStaffs().then(setStaffs);
    getSubjects().then(setAllSubjects);
    getStudentMenuLabels().then(setMenuLabels);
  };

  useEffect(() => {
    loadCoursesData();

    const handleDbUpdate = (e: CustomEvent) => {
      if (e.detail?.key === 'courses' && Array.isArray(e.detail?.data)) {
        setCourses(e.detail.data);
      }
    };
    window.addEventListener('db_updated', handleDbUpdate as EventListener);
    return () => window.removeEventListener('db_updated', handleDbUpdate as EventListener);
  }, [view]);

  const availableSubjectsList = Array.from(new Set([
    "30 நாள் தமிழ் பாடநெறி (தரம் 11)",
    "தமிழ் வினா விடை",
    "தமிழ்",
    "Science",
    "Mathematics",
    "ICT / Computer Science",
    "English",
    "History",
    ...classes.flatMap(c => c.subjects || []),
    ...staffs.flatMap(s => s.assignedClasses?.map((c: any) => c.subject) || []),
    ...allSubjects.map(s => s.name)
  ])).filter(Boolean);

  const toggleGrade = (gradeName: string) => {
    if (selectedGrades.includes(gradeName)) {
      setSelectedGrades(selectedGrades.filter(g => g !== gradeName));
    } else {
      setSelectedGrades([...selectedGrades, gradeName]);
    }
  };

  const selectAllGrades = () => {
    setSelectedGrades([...GRADES_LIST]);
  };

  const clearGrades = () => {
    setSelectedGrades([]);
  };

  const toggleSubject = (subjectName: string) => {
    if (selectedSubjects.includes(subjectName)) {
      setSelectedSubjects(selectedSubjects.filter(s => s !== subjectName));
    } else {
      setSelectedSubjects([...selectedSubjects, subjectName]);
    }
  };

  const selectAllSubjects = () => {
    setSelectedSubjects([...availableSubjectsList]);
  };

  const clearSubjects = () => {
    setSelectedSubjects([]);
  };

  const handleAddCustomSubject = async () => {
    if (!customSubjectInput.trim()) return;
    const newSubName = customSubjectInput.trim();
    if (!selectedSubjects.includes(newSubName)) {
      setSelectedSubjects([...selectedSubjects, newSubName]);
    }
    // Also persist to allSubjects list
    if (!allSubjects.some(s => s.name?.toLowerCase() === newSubName.toLowerCase())) {
      const updated = [...allSubjects, { id: Date.now().toString(), name: newSubName }];
      setAllSubjects(updated);
      await saveSubjects(updated);
    }
    setCustomSubjectInput('');
  };

  const handleRenameSubject = async (oldName: string) => {
    const newName = prompt("Enter new subject name:", oldName);
    if (!newName || newName === oldName) return;

    const updatedSubs = allSubjects.map(s => s.name === oldName ? { ...s, name: newName } : s);
    setAllSubjects(updatedSubs);
    await saveSubjects(updatedSubs);

    const updatedCourses = courses.map(c => {
      if (c.subject === oldName) return { ...c, subject: newName };
      if (Array.isArray(c.subjects)) {
        return { ...c, subjects: c.subjects.map((s: string) => s === oldName ? newName : s) };
      }
      return c;
    });
    setCourses(updatedCourses);
    await saveCourses(updatedCourses);

    alert(`Subject "${oldName}" renamed to "${newName}" across all materials.`);
  };

  const handleDeleteSubject = async (subName: string) => {
    if (window.confirm(`Are you sure you want to remove the subject "${subName}"?`)) {
      const updated = allSubjects.filter(s => s.name !== subName);
      setAllSubjects(updated);
      await saveSubjects(updated);
    }
  };

  const handleSaveMenuLabels = async () => {
    await saveStudentMenuLabels(menuLabels);
    alert('Student Panel Menu Items Renamed Successfully! Changes are now live for all students.');
    setView('menu');
  };

  const handleResetMenuLabels = () => {
    if (window.confirm("Reset all student panel menu labels back to defaults?")) {
      setMenuLabels(DEFAULT_STUDENT_MENU_LABELS);
    }
  };

  // Clear all old dummy/sample records from courses with 1 click
  const handleClearAllOldItems = async () => {
    if (window.confirm("Are you sure you want to delete all existing post items? This will reset the Post Library so you can start fresh.")) {
      setCourses([]);
      await saveCourses([]);
      alert("Post Library cleared successfully! All old records have been removed.");
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGrades.length === 0) {
      alert("Please select at least one Target Grade (தரம் 01 to 13)!");
      return;
    }
    if (selectedSubjects.length === 0) {
      alert("Please select at least one Target Subject!");
      return;
    }
    if (!formData.title.trim()) {
      alert("Title is required!");
      return;
    }

    const parsedStudents = itemType === 'student_box'
      ? formData.studentNamesText
          .split(/[\n,]/)
          .map(s => s.trim())
          .filter(Boolean)
      : [];

    const cleanLink = formData.link.trim()
      ? (formData.link.trim().startsWith('http://') || formData.link.trim().startsWith('https://')
          ? formData.link.trim()
          : `https://${formData.link.trim()}`)
      : '';

    const freshDbCourses = await getCourses();
    const baseCourses = mergeArraysById(freshDbCourses, courses);
    let updatedCourses = [...baseCourses];

    if (editingId) {
      updatedCourses = updatedCourses.map(c => {
        if (c.id === editingId) {
          return {
            ...c,
            type: itemType,
            grades: selectedGrades,
            grade: selectedGrades[0] || c.grade,
            subjects: selectedSubjects,
            subject: selectedSubjects[0] || c.subject,
            title: formData.title,
            link: cleanLink,
            folder: formData.folder || 'General',
            content: formData.content,
            code: formData.code,
            codeLanguage: formData.codeLanguage,
            imageUrl: formData.imageUrl.trim(),
            studentNames: parsedStudents,
            gameType: formData.gameType,
            updatedAt: Date.now()
          };
        }
        return c;
      });
      setEditingId(null);
    } else {
      let count = 0;
      const newItems: any[] = [];
      for (const g of selectedGrades) {
        for (const s of selectedSubjects) {
          newItems.push({
            id: (Date.now() + count++).toString() + Math.random().toString().slice(2, 5),
            type: itemType,
            grade: g,
            grades: [g],
            subject: s,
            subjects: [s],
            title: formData.title,
            link: cleanLink,
            folder: formData.folder || 'General',
            content: formData.content,
            code: formData.code,
            codeLanguage: formData.codeLanguage,
            imageUrl: formData.imageUrl.trim(),
            studentNames: parsedStudents,
            gameType: formData.gameType,
            createdAt: Date.now()
          });
        }
      }
      updatedCourses = [...newItems, ...updatedCourses];
    }

    setCourses(updatedCourses);
    await saveCourses(updatedCourses);

    const totalCreated = selectedGrades.length * selectedSubjects.length;
    alert(
      totalCreated === 1 
        ? 'Post Item Saved Successfully! It is now visible inside the Grade page.' 
        : `${totalCreated} Post Items Added Successfully across ${selectedGrades.length} Grades!`
    );

    setSelectedGrades([]);
    setSelectedSubjects([]);
    setFormData({
      grade: '',
      subject: '',
      title: '',
      link: '',
      folder: 'General',
      content: '',
      code: `<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body { font-family: sans-serif; padding: 20px; text-align: center; background: #f0fdf4; color: #166534; }\n  </style>\n</head>\n<body>\n  <h1>✨ Live Web View</h1>\n</body>\n</html>`,
      codeLanguage: 'html',
      imageUrl: '',
      studentNamesText: '',
      gameType: 'word_quiz'
    });
    setView('view');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this post item?")) {
      const freshDbCourses = await getCourses();
      const baseCourses = mergeArraysById(freshDbCourses, courses);
      const updatedCourses = baseCourses.filter(c => c.id !== id);
      setCourses(updatedCourses);
      await saveCourses(updatedCourses);
    }
  };

  const handleEdit = (course: any) => {
    setSelectedGrades(course.grades || (course.grade ? [course.grade] : []));
    setSelectedSubjects(course.subjects || (course.subject ? [course.subject] : []));
    setItemType(course.type || 'webpost');
    setFormData({
      grade: course.grade || '',
      subject: course.subject || '',
      title: course.title || '',
      link: course.link || '',
      folder: course.folder || 'General',
      content: course.content || '',
      code: course.code || '',
      codeLanguage: course.codeLanguage || 'html',
      imageUrl: course.imageUrl || '',
      studentNamesText: Array.isArray(course.studentNames) ? course.studentNames.join('\n') : '',
      gameType: course.gameType || 'word_quiz'
    });
    setEditingId(course.id);
    setView('add');
  };

  // MENU VIEW
  if (view === 'menu') {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-8 animate-fade-in">
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[2.5rem] p-8 sm:p-10 text-white shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
           <div className="relative">
              <div className="flex items-center gap-3 mb-2">
                 <div className="w-12 h-12 bg-white text-indigo-900 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
                    <BookOpen size={24} />
                 </div>
                 <span className="font-black uppercase tracking-[0.2em] text-indigo-300 text-xs sm:text-sm">
                   Grade Posts & Subject Center
                 </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black mb-3">Post & Subject Management</h1>
              <p className="text-indigo-100/70 max-w-xl font-medium text-sm sm:text-base">
                Create Web Posts, HTML Live Code Sandbox, Student Square Box lists, Mobile Games, and Customize Student Panel Menu Labels.
              </p>
           </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <button 
            onClick={() => {
              setEditingId(null);
              setSelectedGrades([]);
              setSelectedSubjects([]);
              setView('add');
            }} 
            className="group relative bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm hover:border-indigo-600 hover:shadow-2xl transition-all text-left overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100 mb-5 group-hover:rotate-6 transition-all">
                 <Plus size={28} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-1">Add New Post Item</h3>
              <p className="text-slate-500 text-xs font-medium">Create Web Posts, HTML Live Code Sandbox, Student Square Boxes, or Mobile Games for Grades 1 to 13.</p>
            </div>
            <span className="text-xs font-black text-indigo-600 mt-4 flex items-center gap-1">Create Post →</span>
          </button>

          <button 
            onClick={() => {
              setSelectedLibraryGrade(null);
              setView('view');
            }} 
            className="group relative bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm hover:border-emerald-600 hover:shadow-2xl transition-all text-left overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-100 mb-5 group-hover:rotate-6 transition-all">
                 <LayoutGrid size={28} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-1">Manage Post Library</h3>
              <p className="text-slate-500 text-xs font-medium">Browse by Grade 1 to 13, view colorful post boxes, edit, or delete items.</p>
            </div>
            <span className="text-xs font-black text-emerald-600 mt-4 flex items-center gap-1">View by Grade ({courses.length}) →</span>
          </button>

          <button 
            onClick={() => setView('subjects')} 
            className="group relative bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm hover:border-purple-600 hover:shadow-2xl transition-all text-left overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 bg-purple-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-purple-100 mb-5 group-hover:rotate-6 transition-all">
                 <Edit3 size={28} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-1">Edit Subjects</h3>
              <p className="text-slate-500 text-xs font-medium">Change subject names, add new subjects, or manage academy subjects.</p>
            </div>
            <span className="text-xs font-black text-purple-600 mt-4 flex items-center gap-1">Edit Subjects →</span>
          </button>

          <button 
            onClick={() => setView('menu_labels')} 
            className="group relative bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm hover:border-amber-600 hover:shadow-2xl transition-all text-left overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-amber-100 mb-5 group-hover:rotate-6 transition-all">
                 <Tag size={28} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-1">Rename Menu Items</h3>
              <p className="text-slate-500 text-xs font-medium">Rename all 11 Student Panel buttons (My Subject, Recording, Homework, etc.)</p>
            </div>
            <span className="text-xs font-black text-amber-600 mt-4 flex items-center gap-1">Customize Menu →</span>
          </button>
        </div>
      </div>
    );
  }

  // RENAME STUDENT PANEL MENU ITEMS VIEW
  if (view === 'menu_labels') {
    const menuItemsConfig = [
      { key: 'subjects', defaultName: 'My Subjects', icon: <BookOpen className="text-pink-600" size={20} />, bg: 'bg-pink-50' },
      { key: 'recording', defaultName: 'Recording', icon: <Play className="text-indigo-600" size={20} />, bg: 'bg-indigo-50' },
      { key: 'homework', defaultName: 'Homework', icon: <FileText className="text-blue-600" size={20} />, bg: 'bg-blue-50' },
      { key: 'attendance', defaultName: 'Attendance', icon: <Calendar className="text-emerald-600" size={20} />, bg: 'bg-emerald-50' },
      { key: 'elearning', defaultName: 'E-Learning', icon: <Play className="text-rose-600" size={20} />, bg: 'bg-rose-50' },
      { key: 'marks', defaultName: 'Marks', icon: <Award className="text-emerald-600" size={20} />, bg: 'bg-emerald-50' },
      { key: 'course_materials', defaultName: 'Course Material', icon: <FileText className="text-red-600" size={20} />, bg: 'bg-red-50' },
      { key: 'rules', defaultName: 'Rules', icon: <ShieldAlert className="text-rose-600" size={20} />, bg: 'bg-rose-50' },
      { key: 'fees', defaultName: 'Fees', icon: <DollarSign className="text-amber-600" size={20} />, bg: 'bg-amber-50' },
      { key: 'chat', defaultName: 'Live Chat', icon: <MessageCircle className="text-purple-600" size={20} />, bg: 'bg-purple-50' },
      { key: 'whatsapp', defaultName: 'WhatsApp', icon: <Phone className="text-green-600" size={20} />, bg: 'bg-green-50' },
    ];

    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setView('menu')} 
              className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-indigo-600 transition-all shadow-sm"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Rename Student Panel Items</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Customize All 11 Student Menu & Home Page Buttons</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetMenuLabels}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
            >
              <RotateCcw size={14} /> Reset Defaults
            </button>
            <button
              onClick={handleSaveMenuLabels}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-100 transition-all"
            >
              <Save size={16} /> Save Menu Names
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {menuItemsConfig.map((item) => (
              <div key={item.key} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                  {item.icon}
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Default: {item.defaultName}
                  </label>
                  <input
                    type="text"
                    value={menuLabels[item.key as keyof StudentMenuLabels] || ''}
                    onChange={(e) => setMenuLabels({ ...menuLabels, [item.key]: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleSaveMenuLabels}
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-black text-sm rounded-2xl shadow-xl shadow-amber-200 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={18} /> Update Menu Names for All Students
          </button>
        </div>
      </div>
    );
  }

  // EDIT SUBJECTS VIEW
  if (view === 'subjects') {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('menu')} 
            className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-indigo-600 transition-all shadow-sm"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Manage & Edit Subjects</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Rename, Add or Delete Academy Subjects</p>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter new subject name (e.g. தமிழ் வினா விடை, கணிதம்...)"
              value={customSubjectInput}
              onChange={(e) => setCustomSubjectInput(e.target.value)}
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={handleAddCustomSubject}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-purple-200 transition-all flex items-center gap-2"
            >
              <Plus size={16} /> Add Subject
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {availableSubjectsList.map((sub, i) => (
              <div key={i} className="p-4 bg-slate-50 hover:bg-purple-50/50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xs">
                    {i + 1}
                  </div>
                  <span className="text-xs font-black text-slate-800">{sub}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleRenameSubject(sub)}
                    className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
                    title="Rename"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    onClick={() => handleDeleteSubject(sub)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ADD / EDIT POST ITEM VIEW
  if (view === 'add') {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('menu')} 
            className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-indigo-600 transition-all shadow-sm"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              {editingId ? 'Edit Post Item' : 'Add New Post Item'}
            </h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
              Select Grade 1 to 13 & Post Format (Web Post, HTML Live Code, Student Box, Game)
            </p>
          </div>
        </div>

        <form onSubmit={handleAddCourse} className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          {/* Post Format Selector */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2.5">
              1. Select Post Type / வடிவமைப்பு
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'webpost', label: 'Web Post / Article', icon: <FileText size={16} />, color: 'indigo' },
                { id: 'html_code', label: 'HTML Live Web View', icon: <Code size={16} />, color: 'emerald' },
                { id: 'student_box', label: 'Student Recognition Box', icon: <Users size={16} />, color: 'purple' },
                { id: 'mobile_game', label: 'Mobile Educational Game', icon: <Gamepad2 size={16} />, color: 'amber' },
              ].map(t => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setItemType(t.id as any)}
                  className={`p-3.5 rounded-2xl border-2 font-bold text-xs flex flex-col items-center gap-2 transition-all ${
                    itemType === t.id
                      ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="p-2 rounded-xl bg-white/20">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Grade Selector (தரம் 01 to தரம் 13) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-widest">
                2. Select Target Grades (தரம் 01 - தரம் 13) *
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={selectAllGrades} className="text-[11px] font-bold text-indigo-600 hover:underline">Select All</button>
                <span className="text-slate-300">|</span>
                <button type="button" onClick={clearGrades} className="text-[11px] font-bold text-rose-600 hover:underline">Clear</button>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {GRADES_LIST.map(g => {
                const isSelected = selectedGrades.includes(g);
                const cfg = GRADE_COLOR_CONFIG[g] || GRADE_COLOR_CONFIG["தரம் 10"];
                return (
                  <button
                    type="button"
                    key={g}
                    onClick={() => toggleGrade(g)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-1 ${
                      isSelected
                        ? `${cfg.accent} text-white border-transparent shadow-sm scale-102`
                        : `${cfg.bg} ${cfg.border} ${cfg.text} hover:scale-102`
                    }`}
                  >
                    {isSelected && <Check size={12} />}
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subject Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-widest">
                3. Select Subject / பாடம் *
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={selectAllSubjects} className="text-[11px] font-bold text-indigo-600 hover:underline">Select All</button>
                <span className="text-slate-300">|</span>
                <button type="button" onClick={clearSubjects} className="text-[11px] font-bold text-rose-600 hover:underline">Clear</button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {availableSubjectsList.map(s => {
                const isSelected = selectedSubjects.includes(s);
                return (
                  <button
                    type="button"
                    key={s}
                    onClick={() => toggleSubject(s)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected && <Check size={12} />}
                    {s}
                  </button>
                );
              })}
            </div>

            {/* Custom Subject Quick Input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Or type a custom subject name..."
                value={customSubjectInput}
                onChange={(e) => setCustomSubjectInput(e.target.value)}
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
              />
              <button
                type="button"
                onClick={handleAddCustomSubject}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900"
              >
                + Add Subject
              </button>
            </div>
          </div>

          {/* Post Title */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-1.5">
              4. Post Title / தலைப்பு *
            </label>
            <input
              type="text"
              placeholder="e.g. தரம் 11 - தமிழ் வினா விடை தொகுப்பு 2026"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* DYNAMIC CONTENT PER ITEM TYPE */}

          {/* 1. HTML / CODE LIVE WEB VIEW */}
          {itemType === 'html_code' && (
            <div className="p-5 bg-slate-900 rounded-3xl text-white space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                  <Code size={16} /> Enter HTML, CSS & JavaScript Code:
                </label>
              </div>
              <textarea
                rows={8}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full p-4 bg-slate-950 text-emerald-400 font-mono text-xs rounded-2xl border border-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                spellCheck={false}
              />
              <div>
                <span className="text-[11px] font-mono text-slate-400 block mb-2">Live Web View Preview:</span>
                <div className="rounded-2xl overflow-hidden border border-slate-700 bg-white h-44">
                  <iframe
                    title="Live Web View Preview"
                    srcDoc={formData.code}
                    sandbox="allow-scripts"
                    className="w-full h-full border-0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. STUDENT NAMES SQUARE BOXES */}
          {itemType === 'student_box' && (
            <div className="p-5 bg-emerald-50/60 rounded-3xl border border-emerald-200 space-y-4">
              <div>
                <label className="block text-xs font-black text-emerald-900 uppercase tracking-widest mb-1.5">
                  Student Names (Enter each name on a new line or separated by commas)
                </label>
                <textarea
                  rows={5}
                  placeholder="Dineshkumar&#10;Kaviyarasan M.&#10;Praveen Kumar&#10;Keerthika T.&#10;Sangeetha R."
                  value={formData.studentNamesText}
                  onChange={(e) => setFormData({ ...formData, studentNamesText: e.target.value })}
                  className="w-full p-4 bg-white border border-emerald-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-emerald-900 uppercase tracking-widest mb-1.5">
                  Recognition Note / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. வாராந்த பரீட்சையில் சிறந்த பெறுபேறுகளைப் பெற்ற மாணவர்கள்."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-emerald-200 rounded-2xl text-xs font-bold outline-none"
                />
              </div>
            </div>
          )}

          {/* 3. MOBILE GAMES */}
          {itemType === 'mobile_game' && (
            <div className="p-5 bg-amber-50/70 rounded-3xl border border-amber-200 space-y-4">
              <div>
                <label className="block text-xs font-black text-amber-900 uppercase tracking-widest mb-1.5">
                  Select Game Type / விளையாட்டு வகை
                </label>
                <select
                  value={formData.gameType}
                  onChange={(e) => setFormData({ ...formData, gameType: e.target.value as any })}
                  className="w-full px-4 py-3 bg-white border border-amber-200 rounded-2xl text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="word_quiz">🔤 Tamil Word & Vocabulary Challenge (தமிழ் சொல் விளையாட்டு)</option>
                  <option value="math_game">🔢 Math Speed Challenge (கணித வேகம் விளையாட்டு)</option>
                  <option value="memory_match">🧠 Memory Match Cards (நினைவாற்றல் விளையாட்டு)</option>
                  <option value="flappy">🚀 Flappy Scholar Jump (தடை தாண்டும் விளையாட்டு)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-amber-900 uppercase tracking-widest mb-1.5">
                  Game Description / அறிவுறுத்தல்கள்
                </label>
                <input
                  type="text"
                  placeholder="e.g. விளையாடி அதிக புள்ளிகளைப் பெறுங்கள்."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-2xl text-xs font-bold outline-none"
                />
              </div>
            </div>
          )}

          {/* 4. WEB POST & IMAGES */}
          {(itemType === 'webpost' || itemType === 'image_post') && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                  <span>Cover / Post Image URL</span>
                  <span className="text-[10px] font-bold text-slate-400 lowercase tracking-normal bg-slate-100 px-2 py-0.5 rounded-md">optional</span>
                </label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/photo-... (optional)"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:bg-white"
                />
                {formData.imageUrl && (
                  <div className="mt-2 rounded-2xl overflow-hidden max-h-40 border border-slate-200">
                    <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-1.5">
                  Post Content / குறிப்புகள் (Text / HTML / Notes)
                </label>
                <textarea
                  rows={6}
                  placeholder="Enter full formatted text, study notes, or announcement here..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Link URL (Optional) */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-widest">
                External Link / URL
              </label>
              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                விருப்பமானது (Optional)
              </span>
            </div>
            <input
              type="text"
              placeholder="https://... (Leave blank if you don't have a link)"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-400 font-medium mt-1.5">
              URL தேவையில்லை என்றால் காலியாக விடலாம். URL இல்லாமலும் இடுகையை நேரடியாக வெளியிடலாம் (Publish).
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-indigo-600 hover:bg-slate-900 text-white font-black text-sm rounded-2xl shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {editingId ? 'Update Post Item' : 'Publish Post Item'}
          </button>
        </form>
      </div>
    );
  }

  // VIEW POST LIBRARY (GRADE 1 TO 13 HUBS)
  const filteredCoursesForSelectedGrade = selectedLibraryGrade
    ? courses.filter(c => doesItemMatchGrade(c, selectedLibraryGrade))
    : courses;

  const searchedCourses = filteredCoursesForSelectedGrade.filter(c => {
    if (!librarySearch.trim()) return true;
    const q = librarySearch.toLowerCase();
    return (
      c.title?.toLowerCase().includes(q) ||
      c.subject?.toLowerCase().includes(q) ||
      c.content?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (selectedLibraryGrade) {
                setSelectedLibraryGrade(null);
              } else {
                setView('menu');
              }
            }} 
            className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-indigo-600 transition-all shadow-sm"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              {selectedLibraryGrade ? `${selectedLibraryGrade} Post Library` : 'Manage Post Library'}
            </h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
              {selectedLibraryGrade ? `Manage all colorful post items for ${selectedLibraryGrade}` : 'Grades 1 to 13 Colorful Grade Hubs'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {courses.length > 0 && (
            <button
              onClick={handleClearAllOldItems}
              className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all border border-rose-200"
              title="Clear All Post Library Items"
            >
              <Trash2 size={14} /> Clear Old Items
            </button>
          )}

          <button
            onClick={() => {
              setEditingId(null);
              setSelectedGrades(selectedLibraryGrade ? [selectedLibraryGrade] : []);
              setSelectedSubjects([]);
              setView('add');
            }}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all"
          >
            <Plus size={16} /> Add New Post Item
          </button>
        </div>
      </div>

      {/* 1. GRADE SQUARES (If no grade selected) */}
      {!selectedLibraryGrade ? (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-800">
              Select Grade to View & Manage Posts (தரம் தெரிவு செய்க):
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4">
              {GRADES_LIST.map((gradeName) => {
                const cfg = GRADE_COLOR_CONFIG[gradeName] || GRADE_COLOR_CONFIG["தரம் 10"];
                const count = courses.filter(c => doesItemMatchGrade(c, gradeName)).length;

                return (
                  <button
                    key={gradeName}
                    onClick={() => setSelectedLibraryGrade(gradeName)}
                    className={`group relative p-5 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center justify-between text-center aspect-square shadow-sm hover:shadow-xl hover:-translate-y-1 ${cfg.bg} ${cfg.border} ${cfg.shadow}`}
                  >
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${cfg.bgGradient} text-white font-black text-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                      {cfg.gradeNum < 10 ? `0${cfg.gradeNum}` : cfg.gradeNum}
                    </div>

                    <div>
                      <h4 className={`font-black text-base ${cfg.text}`}>
                        {gradeName}
                      </h4>
                      <span className={`inline-block text-[11px] font-black px-2.5 py-0.5 rounded-full mt-1 border ${cfg.badge} border-white/60`}>
                        {count} Posts
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* 2. DEDICATED GRADE POSTS HUB */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedLibraryGrade(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition-all"
              >
                ← All Grades
              </button>
              <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                {searchedCourses.length} Posts in {selectedLibraryGrade}
              </span>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search posts in this grade..."
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white"
              />
            </div>
          </div>

          {/* Posts list as colorful rectangular cards */}
          {searchedCourses.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
              <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <BookOpen size={24} />
              </div>
              <h4 className="text-lg font-black text-slate-800">
                No Posts in {selectedLibraryGrade}
              </h4>
              <p className="text-xs text-slate-400">
                Click below to add the first post item to {selectedLibraryGrade}.
              </p>
              <button
                onClick={() => {
                  setSelectedGrades([selectedLibraryGrade]);
                  setSelectedSubjects([]);
                  setView('add');
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition-all"
              >
                + Add Post to {selectedLibraryGrade}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchedCourses.map((course, idx) => {
                const theme = getPostTheme(course, idx);
                return (
                  <div
                    key={course.id || idx}
                    className={`p-5 rounded-3xl border-2 transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-md ${theme.bg} ${theme.border} ${theme.accentBorder}`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg border border-white/60 ${theme.tagBg}`}>
                          {course.type === 'student_box' ? 'Student Box' : course.type === 'html_code' ? 'HTML Live View' : course.type === 'mobile_game' ? 'Mobile Game' : 'Post'}
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          {course.grade || course.grades?.[0] || selectedLibraryGrade}
                        </span>
                      </div>

                      <h3 className={`text-base font-black ${theme.titleColor} mb-1 leading-snug`}>
                        {course.title}
                      </h3>

                      <p className="text-xs text-slate-500 font-bold mb-2">
                        Subject: <span className="text-indigo-600">{course.subject || 'General'}</span>
                      </p>

                      {course.content && (
                        <p className="text-xs text-slate-600 line-clamp-2 mb-3">{course.content}</p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(course)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1 transition-all"
                        >
                          <Edit3 size={13} /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(course.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <span className="text-[10px] font-mono text-slate-400">ID: {course.id?.slice?.(-6) || 'Item'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
