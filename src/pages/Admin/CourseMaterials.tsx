import React, { useState, useEffect } from 'react';
import { getCourseMaterials, saveCourseMaterials, getClasses, getStaffs, getSubjects, saveSubjects, mergeArraysById } from '../../lib/db';
import { 
  GRADES_LIST, GRADE_COLOR_CONFIG, normalizeGradeString, doesItemMatchGrade 
} from '../../components/RecordingSection';
import { BookOpen, Plus, Trash2, ArrowLeft, ExternalLink, ChevronDown, LayoutGrid, Folder, Globe, Save, Edit3, FileText, Download, Check, RefreshCw, Search } from 'lucide-react';

const GRADES = [
  "தரம் 01", "தரம் 02", "தரம் 03", "தரம் 04", "தரம் 05", 
  "தரம் 06", "தரம் 07", "தரம் 08", "தரம் 09", "தரம் 10", 
  "தரம் 11", "தரம் 12", "தரம் 13"
];

export default function CourseMaterials() {
  const [view, setView] = useState<'menu' | 'add' | 'view'>('menu');
  const [materials, setMaterials] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [staffs, setStaffs] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [selectedLibraryGrade, setSelectedLibraryGrade] = useState<string | null>(null);
  const [librarySearch, setLibrarySearch] = useState<string>('');
  const [filterClass, setFilterClass] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [customSubjectInput, setCustomSubjectInput] = useState<string>('');

  const [formData, setFormData] = useState({
    grade: '',
    subject: '',
    title: '',
    link: ''
  });

  const loadData = async () => {
    const [fetchedMaterials, fetchedClasses, fetchedStaffs, fetchedSubjects] = await Promise.all([
      getCourseMaterials(),
      getClasses(),
      getStaffs(),
      getSubjects()
    ]);
    setMaterials(fetchedMaterials);
    setClasses(fetchedClasses);
    setStaffs(fetchedStaffs);
    setAllSubjects(fetchedSubjects);
  };

  useEffect(() => {
    loadData();

    const handleDbUpdate = (e: CustomEvent) => {
      if (e.detail?.key === 'courseMaterials' && Array.isArray(e.detail?.data)) {
        setMaterials(e.detail.data);
      }
    };
    window.addEventListener('db_updated', handleDbUpdate as EventListener);
    return () => window.removeEventListener('db_updated', handleDbUpdate as EventListener);
  }, [view]);

  const ALL_AVAILABLE_GRADES = Array.from(new Set([
    "30 DAY'S TAMIL COURSE",
    ...GRADES,
    ...classes.map(c => c.name)
  ])).filter(Boolean);

  const availableSubjectsList = Array.from(new Set([
    "30 நாள் தமிழ் பாடநெறி (தரம் 11)",
    "தமிழ் வினா விடை",
    "தமிழ்",
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
    setSelectedGrades([...ALL_AVAILABLE_GRADES]);
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

  const handleAddCustomSubject = () => {
    if (!customSubjectInput.trim()) return;
    const newSubName = customSubjectInput.trim();
    if (!selectedSubjects.includes(newSubName)) {
      setSelectedSubjects([...selectedSubjects, newSubName]);
    }
    setCustomSubjectInput('');
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGrades.length === 0) {
      alert("Please select at least one Grade!");
      return;
    }
    if (selectedSubjects.length === 0) {
      alert("Please select at least one Subject!");
      return;
    }
    if (!formData.title || !formData.link) {
      alert("Title and Link are required!");
      return;
    }

    setIsSaving(true);
    try {
      // Save custom subjects to allSubjects if needed
      const updatedAllSubjects = [...allSubjects];
      for (const subj of selectedSubjects) {
        if (!updatedAllSubjects.some(s => s.name.toLowerCase() === subj.toLowerCase())) {
          const newSub = { id: Date.now().toString() + Math.random().toString().slice(2, 6), name: subj };
          updatedAllSubjects.push(newSub);
        }
      }
      if (updatedAllSubjects.length > allSubjects.length) {
        setAllSubjects(updatedAllSubjects);
        await saveSubjects(updatedAllSubjects);
      }

      // Fetch freshest materials from DB to ensure no data is lost
      const freshDbMaterials = await getCourseMaterials();
      let baseMaterials = mergeArraysById(freshDbMaterials, materials);
      let updatedMaterials = [...baseMaterials];

      if (editingId) {
        let isFirst = true;
        for (const g of selectedGrades) {
          for (const s of selectedSubjects) {
            if (isFirst) {
              updatedMaterials = updatedMaterials.map(m => 
                m.id === editingId ? { ...m, grade: g, subject: s, title: formData.title, link: formData.link } : m
              );
              isFirst = false;
            } else {
              updatedMaterials.push({
                id: Date.now().toString() + Math.random().toString().slice(2, 6),
                grade: g,
                subject: s,
                title: formData.title,
                link: formData.link,
                createdAt: Date.now()
              });
            }
          }
        }
        setEditingId(null);
      } else {
        let count = 0;
        const newItems: any[] = [];
        for (const g of selectedGrades) {
          for (const s of selectedSubjects) {
            newItems.push({
              id: (Date.now() + count++).toString() + Math.random().toString().slice(2, 5),
              grade: g,
              subject: s,
              title: formData.title,
              link: formData.link,
              createdAt: Date.now()
            });
          }
        }
        updatedMaterials = [...newItems, ...updatedMaterials];
      }

      setMaterials(updatedMaterials);
      await saveCourseMaterials(updatedMaterials);

      const totalCreated = selectedGrades.length * selectedSubjects.length;
      alert(
        totalCreated === 1 
          ? 'Course Material Saved Successfully to Database!' 
          : `${totalCreated} Course Materials Added Successfully across ${selectedGrades.length} Grades and ${selectedSubjects.length} Subjects!`
      );

      setSelectedGrades([]);
      setSelectedSubjects([]);
      setFormData({ grade: '', subject: '', title: '', link: '' });
      setView('view');
    } catch (err: any) {
      alert("Error saving course material: " + (err?.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this course material?")) {
      const freshDbMaterials = await getCourseMaterials();
      const base = mergeArraysById(freshDbMaterials, materials);
      const updatedMaterials = base.filter(m => m.id !== id);
      setMaterials(updatedMaterials);
      await saveCourseMaterials(updatedMaterials);
      alert("Deleted Successfully from Database");
    }
  };

  const handleEdit = (material: any) => {
    setSelectedGrades([material.grade]);
    setSelectedSubjects([material.subject]);
    setFormData({
      grade: material.grade,
      subject: material.subject,
      title: material.title,
      link: material.link
    });
    setEditingId(material.id);
    setView('add');
  };

  const getSubjectColorClasses = (subjectName: string) => {
    const colors = [
      { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' },
      { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
      { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
      { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' },
      { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
      { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
      { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' }
    ];
    let hash = 0;
    for (let i = 0; i < subjectName.length; i++) {
      hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          {view !== 'menu' && (
            <button
              onClick={() => {
                if (view === 'view' && selectedLibraryGrade) {
                  setSelectedLibraryGrade(null);
                } else {
                  setView('menu');
                  setSelectedLibraryGrade(null);
                  setEditingId(null);
                  setSelectedGrades([]);
                  setSelectedSubjects([]);
                  setFormData({ grade: '', subject: '', title: '', link: '' });
                }
              }}
              className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-red-600 transition-all shadow-sm"
            >
              <ArrowLeft size={24} />
            </button>
          )}
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <span className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shadow-sm">
                <FileText size={24} />
              </span>
              {view === 'view' 
                ? (selectedLibraryGrade ? `${selectedLibraryGrade} Materials` : 'Manage Course Materials')
                : 'Course Materials (பாடக்குறிப்புகள்)'}
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              {view === 'view'
                ? (selectedLibraryGrade ? `Manage all PDF materials for ${selectedLibraryGrade}` : 'GRADES 1 TO 13 COLORFUL GRADE HUBS')
                : 'Manage downloadable PDF materials for students by Grade and Subject'}
            </p>
          </div>
        </div>

        {view === 'view' && (
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              title="Refresh from Database"
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all border border-slate-200"
            >
              <RefreshCw size={14} /> Refresh
            </button>

            <button
              onClick={() => {
                setEditingId(null);
                setSelectedGrades(selectedLibraryGrade ? [selectedLibraryGrade] : []);
                setSelectedSubjects([]);
                setFormData({ grade: '', subject: '', title: '', link: '' });
                setView('add');
              }}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-red-200 transition-all"
            >
              <Plus size={16} /> Add Course Material
            </button>
          </div>
        )}
      </div>

      {/* Main Panel Content */}
      {view === 'menu' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-8">
          <button
            onClick={() => {
              setView('add');
              setEditingId(null);
              setSelectedGrades([]);
              setSelectedSubjects([]);
              setFormData({ grade: '', subject: '', title: '', link: '' });
            }}
            className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 hover:border-red-400 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col items-center justify-center text-center group cursor-pointer"
          >
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-[2rem] flex items-center justify-center mb-6 group-hover:bg-red-100 transition-colors shadow-inner">
              <Plus size={36} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Add Course Material</h2>
            <p className="text-slate-400 text-sm font-medium">Upload a new PDF drive link for multiple subjects and grades</p>
          </button>

          <button
            onClick={() => setView('view')}
            className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 hover:border-indigo-400 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col items-center justify-center text-center group cursor-pointer"
          >
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mb-6 group-hover:bg-indigo-100 transition-colors shadow-inner">
              <LayoutGrid size={36} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">View Materials</h2>
            <p className="text-slate-400 text-sm font-medium">List, search, and manage existing course materials</p>
          </button>
        </div>
      )}

      {view === 'add' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm max-w-2xl mx-auto p-6 sm:p-8">
          <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
            {editingId ? "Edit Course Material" : "Add New Course Material"}
          </h2>

          <form onSubmit={handleAddMaterial} className="space-y-6">
            {/* Multi Grade Selection */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div>
                  <label className="block text-sm font-bold text-slate-800">
                    Target Grades / Classes (வகுப்புகள் - பல தேர்வு செய்யலாம்) <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500">Click to select one or multiple grades</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllGrades}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={clearGrades}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Clear
                  </button>
                  <span className="text-xs font-extrabold bg-red-100 text-red-700 px-2.5 py-1 rounded-full">
                    {selectedGrades.length} selected
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 max-h-48 overflow-y-auto">
                {ALL_AVAILABLE_GRADES.map(g => {
                  const isSelected = selectedGrades.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleGrade(g)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-red-600 text-white shadow-md shadow-red-200 border border-red-600'
                          : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected && <Check size={14} className="stroke-[3]" />}
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Multi Subject Selection */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div>
                  <label className="block text-sm font-bold text-slate-800">
                    Target Subjects (பாடம் - பல தேர்வு செய்யலாம்) <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500">Click to select one or multiple subjects</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllSubjects}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={clearSubjects}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Clear
                  </button>
                  <span className="text-xs font-extrabold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full">
                    {selectedSubjects.length} selected
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 max-h-48 overflow-y-auto mb-3">
                {availableSubjectsList.map(s => {
                  const isSelected = selectedSubjects.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSubject(s)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 border border-indigo-600'
                          : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected && <Check size={14} className="stroke-[3]" />}
                      {s}
                    </button>
                  );
                })}
              </div>

              {/* Custom Subject Addition */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Or type custom subject name..."
                  value={customSubjectInput}
                  onChange={(e) => setCustomSubjectInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomSubject();
                    }
                  }}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustomSubject}
                  className="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all shrink-0"
                >
                  <Plus size={14} /> Add Subject
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Material Title (தலைப்பு)</label>
              <input
                type="text"
                required
                placeholder="E.g., Unit 1 Notes PDF"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Google Drive Link / PDF URL</label>
              <input
                type="url"
                required
                placeholder="https://drive.google.com/..."
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all outline-none"
              />
            </div>

            {/* Total Combinations Summary */}
            {selectedGrades.length > 0 && selectedSubjects.length > 0 && (
              <div className="bg-red-50/60 p-4 rounded-2xl border border-red-100 flex items-center justify-between text-xs font-bold text-red-900">
                <span>Total Materials to be created:</span>
                <span className="bg-red-600 text-white px-3 py-1 rounded-full font-black text-sm">
                  {selectedGrades.length * selectedSubjects.length} Items ({selectedGrades.length} Grades × {selectedSubjects.length} Subjects)
                </span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 px-6 rounded-2xl shadow-lg shadow-red-100 hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save size={18} />
              {editingId ? "Update Material" : "Save Material"}
            </button>
          </form>
        </div>
      )}

      {view === 'view' && (
        <div className="space-y-6 animate-fade-in">
          {/* 1. GRADE SQUARES (If no grade selected) */}
          {!selectedLibraryGrade ? (
            <div className="space-y-6">
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-lg font-black text-slate-800">
                      Select Grade to View & Manage Materials (தரம் தெரிவு செய்க):
                    </h3>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">
                      Click any grade to view and download PDF course materials
                    </p>
                  </div>
                  <span className="text-xs font-black text-red-700 bg-red-50 px-3.5 py-1.5 rounded-xl border border-red-100 self-start sm:self-auto">
                    Total: {materials.length} Materials
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4">
                  {GRADES_LIST.map((gradeName) => {
                    const cfg = GRADE_COLOR_CONFIG[gradeName] || GRADE_COLOR_CONFIG["தரம் 10"];
                    const count = materials.filter(m => doesItemMatchGrade(m, gradeName)).length;

                    return (
                      <button
                        key={gradeName}
                        onClick={() => {
                          setSelectedLibraryGrade(gradeName);
                          setLibrarySearch('');
                        }}
                        className={`group relative p-5 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center justify-between text-center aspect-square shadow-sm hover:shadow-xl hover:-translate-y-1 cursor-pointer ${cfg.bg} ${cfg.border} ${cfg.shadow}`}
                      >
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${cfg.bgGradient} text-white font-black text-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                          {cfg.gradeNum < 10 ? `0${cfg.gradeNum}` : cfg.gradeNum}
                        </div>

                        <div>
                          <h4 className={`font-black text-base ${cfg.text}`}>
                            {gradeName}
                          </h4>
                          <span className={`inline-block text-[11px] font-black px-2.5 py-0.5 rounded-full mt-1 border ${cfg.badge} border-white/60`}>
                            {count} Materials
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Special / Custom Courses like 30 Day's Tamil Course if present */}
                {materials.some(m => !GRADES_LIST.some(g => doesItemMatchGrade(m, g))) && (
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
                      Special & Other Courses:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {Array.from(new Set(materials.map(m => m.grade)))
                        .filter((g): g is string => Boolean(g) && !GRADES_LIST.some(gl => doesItemMatchGrade({ grade: g } as any, gl)))
                        .map((customGrade: string) => {
                          const count = materials.filter(m => m.grade === customGrade).length;
                          return (
                            <button
                              key={customGrade}
                              onClick={() => {
                                setSelectedLibraryGrade(customGrade);
                                setLibrarySearch('');
                              }}
                              className="p-5 rounded-3xl border-2 border-red-200 bg-red-50/50 hover:bg-red-50 hover:border-red-400 transition-all flex items-center justify-between text-left group shadow-sm hover:shadow-md cursor-pointer"
                            >
                              <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-orange-600 text-white font-black text-sm flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                                  <FileText size={20} />
                                </div>
                                <div>
                                  <h4 className="font-black text-sm text-slate-800 group-hover:text-red-700 transition-colors">
                                    {customGrade}
                                  </h4>
                                  <span className="text-[11px] font-bold text-red-600">
                                    {count} Materials
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* 2. DEDICATED GRADE MATERIALS HUB */
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedLibraryGrade(null)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                  >
                    ← All Grades
                  </button>
                  <span className="text-xs font-black text-red-700 bg-red-50 px-3 py-1.5 rounded-xl border border-red-100">
                    {materials.filter(m => doesItemMatchGrade(m, selectedLibraryGrade)).filter(m => {
                      if (!librarySearch.trim()) return true;
                      const q = librarySearch.toLowerCase();
                      return m.title?.toLowerCase().includes(q) || m.subject?.toLowerCase().includes(q);
                    }).length} Materials in {selectedLibraryGrade}
                  </span>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search materials in this grade..."
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-red-500/20"
                  />
                </div>
              </div>

              {/* Materials list for this Grade */}
              {(() => {
                const gradeMaterials = materials
                  .filter(m => doesItemMatchGrade(m, selectedLibraryGrade))
                  .filter(m => {
                    if (!librarySearch.trim()) return true;
                    const q = librarySearch.toLowerCase();
                    return m.title?.toLowerCase().includes(q) || m.subject?.toLowerCase().includes(q);
                  });

                if (gradeMaterials.length === 0) {
                  return (
                    <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
                      <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-500 flex items-center justify-center mx-auto shadow-inner">
                        <FileText size={28} />
                      </div>
                      <h4 className="text-xl font-black text-slate-800">
                        No Course Materials in {selectedLibraryGrade}
                      </h4>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        There are currently no PDF materials uploaded for {selectedLibraryGrade}. Click below to add the first course material.
                      </p>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setSelectedGrades([selectedLibraryGrade]);
                          setSelectedSubjects([]);
                          setFormData({ grade: selectedLibraryGrade, subject: '', title: '', link: '' });
                          setView('add');
                        }}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-md shadow-red-200 transition-all inline-flex items-center gap-2 cursor-pointer"
                      >
                        <Plus size={16} /> Add Material to {selectedLibraryGrade}
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {gradeMaterials.map((material, idx) => {
                      const badge = getSubjectColorClasses(material.subject || 'General');
                      return (
                        <div
                          key={material.id || idx}
                          className="p-5 rounded-3xl border-2 border-slate-100 hover:border-red-200 bg-white hover:bg-red-50/20 transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-md group relative overflow-hidden"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2.5">
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${badge.bg} ${badge.text} ${badge.border}`}>
                                {material.subject || 'Subject Unit'}
                              </span>
                              <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                {material.grade || selectedLibraryGrade}
                              </span>
                            </div>

                            <h3 className="text-base font-black text-slate-800 group-hover:text-red-700 transition-colors mb-2 leading-snug">
                              {material.title}
                            </h3>

                            {/* Saved Link / URL */}
                            <div className="my-3">
                              {material.link ? (
                                <a
                                  href={material.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white font-bold text-xs rounded-xl border border-red-200 hover:border-red-600 transition-all duration-200 shadow-sm group/btn"
                                >
                                  <ExternalLink size={13} className="text-red-500 group-hover/btn:text-white transition-colors" />
                                  <span>Open PDF / Drive Link</span>
                                </a>
                              ) : (
                                <span className="text-xs text-slate-400 italic">No link attached</span>
                              )}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEdit(material)}
                                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <Edit3 size={13} /> Edit
                              </button>
                              <button
                                onClick={() => handleDelete(material.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>

                            <span className="text-[10px] font-mono text-slate-400">
                              ID: {material.id?.slice(-6) || 'Item'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

