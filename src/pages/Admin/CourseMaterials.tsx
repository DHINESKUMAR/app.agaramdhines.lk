import React, { useState, useEffect } from 'react';
import { getCourseMaterials, saveCourseMaterials, getClasses, getStaffs, getSubjects, saveSubjects, mergeArraysById } from '../../lib/db';
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
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <span className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shadow-sm">
              <FileText size={24} />
            </span>
            Course Materials (பாடக்குறிப்புகள்)
          </h1>
          <p className="text-slate-500 font-medium mt-1">Manage downloadable PDF materials for students by Grade and Subject</p>
        </div>

        {view !== 'menu' && (
          <button
            onClick={() => {
              setView('menu');
              setEditingId(null);
              setSelectedGrades([]);
              setSelectedSubjects([]);
              setFormData({ grade: '', subject: '', title: '', link: '' });
            }}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-2xl font-bold transition-all text-sm border border-slate-200"
          >
            <ArrowLeft size={16} /> Back to Menu
          </button>
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
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-slate-800">Existing Course Materials</h2>
              <span className="bg-red-50 text-red-700 font-bold px-3 py-1 rounded-full text-xs border border-red-100">
                {materials.length} Materials
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search title, subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-slate-700 focus:bg-white outline-none"
                />
              </div>

              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:bg-white outline-none"
              >
                <option value="">All Grades</option>
                <option value="30 DAY'S TAMIL COURSE">30 DAY'S TAMIL COURSE</option>
                {GRADES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>

              <button
                onClick={loadData}
                title="Refresh from Database"
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {materials.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-100">
              <FileText className="mx-auto h-16 w-16 text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-700 mb-1">No course materials found</h3>
              <p className="text-slate-500 text-sm">Add a new material to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs font-black uppercase tracking-wider">
                    <th className="py-4 px-4">Grade</th>
                    <th className="py-4 px-4">Subject</th>
                    <th className="py-4 px-4">Title</th>
                    <th className="py-4 px-4">Link</th>
                    <th className="py-4 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {materials
                    .filter(m => !filterClass || m.grade === filterClass)
                    .filter(m => {
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        m.title?.toLowerCase().includes(q) ||
                        m.subject?.toLowerCase().includes(q) ||
                        m.grade?.toLowerCase().includes(q)
                      );
                    })
                    .map((material) => {
                      const badge = getSubjectColorClasses(material.subject);
                      return (
                        <tr key={material.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="py-4 px-4 font-black text-slate-800 text-sm">{material.grade}</td>
                          <td className="py-4 px-4">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${badge.bg} ${badge.text} ${badge.border}`}>
                              {material.subject}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-bold text-slate-700 text-sm">{material.title}</td>
                          <td className="py-4 px-4">
                            <a
                              href={material.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-red-600 hover:text-red-700 font-bold text-xs inline-flex items-center gap-1 hover:underline"
                            >
                              <ExternalLink size={12} />
                              Open Link
                            </a>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEdit(material)}
                                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(material.id)}
                                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
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
    </div>
  );
}

