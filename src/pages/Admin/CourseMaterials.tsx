import React, { useState, useEffect } from 'react';
import { getCourseMaterials, saveCourseMaterials, getClasses, getStaffs, getSubjects, saveSubjects } from '../../lib/db';
import { BookOpen, Plus, Trash2, ArrowLeft, ExternalLink, ChevronDown, LayoutGrid, Folder, Globe, Save, Edit3, FileText, Download } from 'lucide-react';

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
  const [isManualSubject, setIsManualSubject] = useState(false);
  const [filterClass, setFilterClass] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    grade: '',
    subject: '',
    title: '',
    link: ''
  });

  useEffect(() => {
    getCourseMaterials().then(setMaterials);
    getClasses().then(setClasses);
    getStaffs().then(setStaffs);
    getSubjects().then(setAllSubjects);
  }, [view]);

  const classSubjects = formData.grade 
    ? classes.find(c => c.name === formData.grade)?.subjects || []
    : [];

  const assignedSubjects = Array.from(new Set(
    staffs.flatMap(s => s.assignedClasses?.filter((c: any) => c.grade === formData.grade).map((c: any) => c.subject) || [])
  ));

  const availableSubjectsList = Array.from(new Set([
    ...classSubjects,
    ...assignedSubjects,
    ...allSubjects.map(s => s.name)
  ])).filter(Boolean);

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.link || !formData.grade || !formData.subject) {
      alert("Grade, Subject, Title and Link are required!");
      return;
    }

    const subjectExists = allSubjects.some(s => s.name.toLowerCase() === formData.subject.toLowerCase());
    if (!subjectExists && isManualSubject) {
        const newSub = { id: Date.now().toString(), name: formData.subject };
        const updatedSubs = [...allSubjects, newSub];
        setAllSubjects(updatedSubs);
        await saveSubjects(updatedSubs);
    }

    let updatedMaterials;
    if (editingId) {
      updatedMaterials = materials.map(m => m.id === editingId ? { ...m, ...formData } : m);
      setEditingId(null);
    } else {
      const newMaterial = { id: Date.now().toString(), ...formData };
      updatedMaterials = [...materials, newMaterial];
    }
    
    setMaterials(updatedMaterials);
    await saveCourseMaterials(updatedMaterials);
    alert(editingId ? 'Course Material Updated Successfully' : 'Course Material Added Successfully');
    setFormData({ grade: '', subject: '', title: '', link: '' });
    setView('view');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this course material?")) {
      const updatedMaterials = materials.filter(m => m.id !== id);
      setMaterials(updatedMaterials);
      await saveCourseMaterials(updatedMaterials);
      alert("Deleted Successfully");
    }
  };

  const handleEdit = (material: any) => {
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
              setFormData({ grade: '', subject: '', title: '', link: '' });
            }}
            className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 hover:border-red-400 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col items-center justify-center text-center group cursor-pointer"
          >
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-[2rem] flex items-center justify-center mb-6 group-hover:bg-red-100 transition-colors shadow-inner">
              <Plus size={36} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Add Course Material</h2>
            <p className="text-slate-400 text-sm font-medium">Upload a new PDF drive link for a specific subject and grade</p>
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
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Grade / Class</label>
              <select
                required
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value, subject: '' })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all outline-none"
              >
                <option value="">Select Grade</option>
                <option value="30 DAY'S TAMIL COURSE">30 DAY'S TAMIL COURSE (Grade 11)</option>
                {GRADES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-slate-700">Subject</label>
                <button
                  type="button"
                  onClick={() => {
                    setIsManualSubject(!isManualSubject);
                    setFormData({ ...formData, subject: '' });
                  }}
                  className="text-xs font-black text-red-600 hover:text-red-700 hover:underline"
                >
                  {isManualSubject ? "Choose from list" : "Enter manually"}
                </button>
              </div>

              {isManualSubject ? (
                <input
                  type="text"
                  required
                  placeholder="E.g., Science, Mathematics, Tamil"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all outline-none"
                />
              ) : (
                <select
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all outline-none"
                >
                  <option value="">Select Subject</option>
                  {formData.grade === "30 DAY'S TAMIL COURSE" ? (
                    // Listed Grade 11 subjects for the 30-day course
                    <>
                      <option value="30 நாள் தமிழ் பாடநெறி (தரம் 11)">30 நாள் தமிழ் பாடநெறி (தரம் 11)</option>
                      <option value="தமிழ் வினா விடை">தமிழ் வினா விடை</option>
                      <option value="Tamil">Tamil</option>
                      {availableSubjectsList.filter(s => s !== "Tamil" && s !== "தமிழ் வினா விடை" && s !== "30 நாள் தமிழ் பாடநெறி (தரம் 11)").map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </>
                  ) : (
                    availableSubjectsList.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))
                  )}
                </select>
              )}
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

            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 px-6 rounded-2xl shadow-lg shadow-red-100 hover:shadow-xl transition-all flex items-center justify-center gap-2"
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
            <h2 className="text-xl font-black text-slate-800">Existing Course Materials</h2>
            
            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:bg-white outline-none"
              >
                <option value="">All Grades</option>
                <option value="30 DAY'S TAMIL COURSE">30 DAY'S TAMIL COURSE</option>
                {GRADES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
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
