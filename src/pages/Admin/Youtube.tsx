import React, { useState, useEffect } from 'react';
import { Youtube as YoutubeIcon, PlayCircle, Trash2, ArrowLeft, Plus, ExternalLink, BookOpen, Folder, Globe, FileText, LayoutGrid, List, Share2 } from 'lucide-react';
import { getYoutubeLinks, saveYoutubeLinks, getWebPosts, saveWebPosts } from '../../lib/db';

export default function Youtube() {
  const [activeTab, setActiveTab] = useState<'youtube' | 'webposts'>('youtube');
  const [links, setLinks] = useState<any[]>([]);
  const [webPosts, setWebPosts] = useState<any[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [isNewFolder, setIsNewFolder] = useState(false);
  const [isNewSubject, setIsNewSubject] = useState(false);

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditFormData({ ...item });
  };

  const handleSaveEdit = async () => {
    if (!editFormData) return;

    if (activeTab === 'youtube') {
      const updatedLinks = links.map(l => l.id === editingId ? editFormData : l);
      setLinks(updatedLinks);
      await saveYoutubeLinks(updatedLinks);
    } else {
      const updatedPosts = webPosts.map(p => p.id === editingId ? editFormData : p);
      setWebPosts(updatedPosts);
      await saveWebPosts(updatedPosts);
    }
    
    setEditingId(null);
    setEditFormData(null);
  };

  const togglePublicStatus = async (item: any) => {
    const updatedItem = { ...item, isPublic: !item.isPublic, grade: !item.isPublic ? "Public" : (selectedGrade === "Public (All Students)" ? "தரம் 01" : selectedGrade) };
    
    if (activeTab === 'youtube') {
      const updatedLinks = links.map(l => l.id === item.id ? updatedItem : l);
      setLinks(updatedLinks);
      await saveYoutubeLinks(updatedLinks);
    } else {
      const updatedPosts = webPosts.map(p => p.id === item.id ? updatedItem : p);
      setWebPosts(updatedPosts);
      await saveWebPosts(updatedPosts);
    }
  };

  const [formData, setFormData] = useState({
    subject: '',
    title: '',
    link: '',
    folder: '',
    isPublic: false,
    content: '', // for web posts
    imageUrl: '' // featured image
  });

  useEffect(() => {
    Promise.all([getYoutubeLinks(), getWebPosts()]).then(([linksData, postsData]) => {
      setLinks(Array.isArray(linksData) ? linksData : []);
      setWebPosts(Array.isArray(postsData) ? postsData : []);
    });
  }, []);

  const GRADES = [
    "Public (All Students)",
    "தரம் 01", "தரம் 02", "தரம் 03", "தரம் 04", "தரம் 05", 
    "தரம் 06", "தரம் 07", "தரம் 08", "தரம் 09", "தரம் 10", 
    "தரம் 11", "தரம் 12", "தரம் 13"
  ];

  // Get unique subjects relative to active tab
  const tabSubjects = Array.from(new Set(
    (activeTab === 'youtube' ? links : webPosts).map(item => item.subject)
  )).filter((s): s is string => !!s).sort();

  // Get unique folders relative to active tab and selected grade
  const tabFolders = Array.from(new Set(
    (activeTab === 'youtube' ? links : webPosts)
      .filter(item => item.grade === selectedGrade || (selectedGrade === "Public (All Students)" && item.isPublic))
      .map(item => item.folder)
  )).filter((f): f is string => !!f).sort();

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeTab === 'youtube') {
      if (!formData.subject || !formData.title || !formData.link || !formData.folder) {
        alert("Subject, Folder, Title, and Link are required!");
        return;
      }
      
      if (!formData.link.includes('youtube.com') && !formData.link.includes('youtu.be')) {
        alert("Please enter a valid YouTube URL.");
        return;
      }

      const newLink = { 
        id: Date.now().toString(), 
        grade: selectedGrade === "Public (All Students)" ? "Public" : selectedGrade,
        isPublic: selectedGrade === "Public (All Students)",
        subject: formData.subject,
        folder: formData.folder,
        title: formData.title,
        link: formData.link,
        date: new Date().toISOString()
      };
      
      const updatedLinks = [...links, newLink];
      setLinks(updatedLinks);
      await saveYoutubeLinks(updatedLinks);
    } else {
      if (!formData.subject || !formData.title || !formData.content) {
        alert("Subject, Title, and Content are required!");
        return;
      }

      const newPost = {
        id: Date.now().toString(),
        grade: selectedGrade === "Public (All Students)" ? "Public" : selectedGrade,
        isPublic: selectedGrade === "Public (All Students)",
        subject: formData.subject,
        folder: formData.folder,
        title: formData.title,
        content: formData.content,
        link: formData.link,
        imageUrl: formData.imageUrl,
        date: new Date().toISOString()
      };

      const updatedPosts = [...webPosts, newPost];
      setWebPosts(updatedPosts);
      await saveWebPosts(updatedPosts);
    }
    
    setFormData({ subject: '', title: '', link: '', folder: '', isPublic: false, content: '', imageUrl: '' });
    setIsNewFolder(false);
    setIsNewSubject(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(`Are you sure you want to delete this ${activeTab === 'youtube' ? 'video' : 'post'}?`)) {
      if (activeTab === 'youtube') {
        const updatedLinks = links.filter(l => l.id !== id);
        setLinks(updatedLinks);
        await saveYoutubeLinks(updatedLinks);
      } else {
        const updatedPosts = webPosts.filter(p => p.id !== id);
        setWebPosts(updatedPosts);
        await saveWebPosts(updatedPosts);
      }
    }
  };

  const extractVideoId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  if (selectedGrade) {
    const isGradePublic = selectedGrade === "Public (All Students)";
    const gradeLinks = links.filter(l => l && (isGradePublic ? l.isPublic : l.grade === selectedGrade));
    const gradePosts = webPosts.filter(p => p && (isGradePublic ? p.isPublic : p.grade === selectedGrade));
    
    // Group links by folder
    const folders: { [key: string]: any[] } = {};
    gradeLinks.forEach(link => {
      const f = link.folder || 'General';
      if (!folders[f]) folders[f] = [];
      folders[f].push(link);
    });

    return (
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedGrade(null)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                {isGradePublic ? <Globe className="text-green-500" size={24} /> : null}
                {selectedGrade} - E-Learning
              </h2>
              <p className="text-sm text-gray-500">Manage videos and posts for this section</p>
            </div>
          </div>
          
          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('youtube')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'youtube' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <YoutubeIcon size={18} /> YouTube
            </button>
            <button 
              onClick={() => setActiveTab('webposts')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'webposts' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <FileText size={18} /> Web Posts
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Add Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Plus size={20} className="text-blue-600" />
                Add {activeTab === 'youtube' ? 'Video' : 'Post'}
              </h3>
              <form onSubmit={handleAddEntry} className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-gray-400 uppercase">Subject</label>
                    <button 
                      type="button"
                      onClick={() => setIsNewSubject(!isNewSubject)}
                      className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                    >
                      {isNewSubject ? "Select Existing" : "+ Add New Subject"}
                    </button>
                  </div>
                  {isNewSubject ? (
                    <input 
                      type="text" 
                      placeholder="Type new subject name..." 
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm" 
                      autoFocus
                    />
                  ) : (
                    <select 
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-white font-medium"
                    >
                      <option value="">Select a subject...</option>
                      {tabSubjects.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-gray-400 uppercase">Folder / Unit</label>
                    <button 
                      type="button"
                      onClick={() => setIsNewFolder(!isNewFolder)}
                      className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                    >
                      {isNewFolder ? "Select Existing" : "+ Add New Folder"}
                    </button>
                  </div>
                  {isNewFolder ? (
                    <input 
                      type="text" 
                      placeholder="Type new folder name..." 
                      value={formData.folder}
                      onChange={(e) => setFormData({...formData, folder: e.target.value})}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm" 
                      autoFocus
                    />
                  ) : (
                    <select 
                      value={formData.folder}
                      onChange={(e) => setFormData({...formData, folder: e.target.value})}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-white"
                    >
                      <option value="">Select a folder...</option>
                      {tabFolders.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  )}
                </div>
                {activeTab === 'webposts' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">External Link (Optional)</label>
                      <input 
                        type="url" 
                        placeholder="https://..." 
                        value={formData.link}
                        onChange={(e) => setFormData({...formData, link: e.target.value})}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm font-medium" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Featured Image URL (Optional)</label>
                      <input 
                        type="url" 
                        placeholder="Image URL..." 
                        value={formData.imageUrl}
                        onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm font-medium" 
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Title</label>
                  <input 
                    type="text" 
                    placeholder="Enter descriptive title" 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm" 
                  />
                </div>
                {activeTab === 'youtube' ? (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">YouTube URL</label>
                    <input 
                      type="url" 
                      placeholder="https://..." 
                      value={formData.link}
                      onChange={(e) => setFormData({...formData, link: e.target.value})}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm" 
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Content (HTML/Text)</label>
                    <textarea 
                      rows={6}
                      placeholder="Write your post content here..." 
                      value={formData.content}
                      onChange={(e) => setFormData({...formData, content: e.target.value})}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm" 
                    />
                  </div>
                )}
                <button 
                  type="submit" 
                  className={`w-full py-3 rounded-xl text-white font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${activeTab === 'youtube' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  <Plus size={18} />
                  Save {activeTab === 'youtube' ? 'Video' : 'Post'}
                </button>
              </form>
            </div>
          </div>

          {/* Content List */}
          <div className="lg:col-span-3 space-y-8">
            {activeTab === 'youtube' ? (
              Object.keys(folders).length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 flex flex-col items-center text-center">
                   <YoutubeIcon size={48} className="text-gray-200 mb-4" />
                   <h3 className="text-lg font-bold text-gray-800">No folders yet</h3>
                   <p className="text-gray-500">Your categorized videos will appear here.</p>
                </div>
              ) : (
                Object.keys(folders).sort().map(folderName => (
                  <div key={folderName} className="space-y-4">
                    <div className="flex items-center gap-2 text-indigo-900 border-b pb-2">
                       <Folder size={20} className="text-indigo-600" />
                       <h3 className="text-lg font-black uppercase tracking-wider">{folderName}</h3>
                       <span className="bg-indigo-100 text-indigo-600 text-xs font-bold px-2 py-0.5 rounded-full">
                         {folders[folderName].length}
                       </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {folders[folderName].map(link => {
                        const videoId = extractVideoId(link.link);
                        const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80';
                        return (
                          <div key={link.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-all">
                             <div className="relative aspect-video">
                                <img src={thumbnailUrl} alt={link.title} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                   <a href={link.link} target="_blank" rel="noopener" className="p-3 bg-red-600 text-white rounded-full"><PlayCircle size={32} /></a>
                                </div>
                             </div>
                             <div className="p-4">
                                {editingId === link.id ? (
                                  <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Subject</label>
                                      <select 
                                        value={editFormData.subject}
                                        onChange={(e) => setEditFormData({...editFormData, subject: e.target.value})}
                                        className="w-full text-xs border rounded-lg px-2 py-1.5 bg-white font-medium"
                                      >
                                        <option value="">Select Subject...</option>
                                        {tabSubjects.map(s => (
                                          <option key={s} value={s}>{s}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Folder</label>
                                      <select 
                                        value={editFormData.folder}
                                        onChange={(e) => setEditFormData({...editFormData, folder: e.target.value})}
                                        className="w-full text-xs border rounded-lg px-2 py-1.5 bg-white"
                                      >
                                        <option value="">Select Folder...</option>
                                        {tabFolders.map(f => (
                                          <option key={f} value={f}>{f}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Visibility</label>
                                      <select 
                                        value={editFormData.grade}
                                        onChange={(e) => setEditFormData({...editFormData, grade: e.target.value, isPublic: e.target.value === "Public"})}
                                        className="w-full text-[10px] border rounded-lg px-2 py-1.5 bg-white font-bold"
                                      >
                                        {GRADES.map(g => (
                                          <option key={g} value={g === "Public (All Students)" ? "Public" : g}>{g}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                      <button onClick={handleSaveEdit} className="flex-1 bg-indigo-600 text-white text-[10px] font-black uppercase py-2 rounded-lg shadow-sm">Save</button>
                                      <button onClick={() => setEditingId(null)} className="flex-1 bg-white text-slate-400 text-[10px] font-black uppercase py-2 rounded-lg border border-slate-200">Cancel</button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex justify-between items-start">
                                      <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded tracking-widest">{link.subject}</span>
                                      <button 
                                        onClick={() => togglePublicStatus(link)}
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${link.isPublic ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
                                      >
                                        {link.isPublic ? 'Public' : 'Private'}
                                      </button>
                                    </div>
                                    <h4 className="font-bold text-gray-900 mt-2 line-clamp-2">{link.title}</h4>
                                    <div className="mt-4 flex justify-between items-center">
                                       <div className="flex gap-1">
                                          <button onClick={() => startEdit(link)} className="text-gray-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded-lg text-xs font-bold">Edit</button>
                                          <button onClick={() => handleDelete(link.id)} className="text-gray-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                                       </div>
                                       <span className="text-[10px] text-gray-400">{new Date(link.date).toLocaleDateString()}</span>
                                    </div>
                                  </>
                                )}
                             </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )
            ) : (
              <div className="space-y-8">
                {(() => {
                  const postFolders: { [key: string]: any[] } = {};
                  gradePosts.forEach(post => {
                    const f = post.folder || 'General';
                    if (!postFolders[f]) postFolders[f] = [];
                    postFolders[f].push(post);
                  });

                  if (Object.keys(postFolders).length === 0) {
                    return (
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
                        No web posts created for this grade yet.
                      </div>
                    );
                  }

                  return Object.keys(postFolders).sort().map(folderName => (
                    <div key={folderName} className="space-y-4">
                      <div className="flex items-center gap-2 text-indigo-900 border-b pb-2">
                        <Folder size={20} className="text-indigo-600" />
                        <h3 className="text-lg font-black uppercase tracking-wider">{folderName}</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {postFolders[folderName].map(post => (
                          <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all group">
                            {editingId === post.id ? (
                               <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                     <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Subject</label>
                                        <select 
                                          value={editFormData.subject}
                                          onChange={(e) => setEditFormData({...editFormData, subject: e.target.value})}
                                          className="w-full text-xs border rounded-xl px-3 py-2 bg-white"
                                        >
                                          <option value="">Select Subject...</option>
                                          {tabSubjects.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                          ))}
                                        </select>
                                     </div>
                                     <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Folder</label>
                                        <select 
                                          value={editFormData.folder}
                                          onChange={(e) => setEditFormData({...editFormData, folder: e.target.value})}
                                          className="w-full text-xs border rounded-xl px-3 py-2 bg-white"
                                        >
                                          <option value="">Select Folder...</option>
                                          {tabFolders.map(f => (
                                            <option key={f} value={f}>{f}</option>
                                          ))}
                                        </select>
                                     </div>
                                     <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Grade / Public</label>
                                        <select 
                                          value={editFormData.grade}
                                          onChange={(e) => setEditFormData({...editFormData, grade: e.target.value, isPublic: e.target.value === "Public"})}
                                          className="w-full text-xs border rounded-xl px-3 py-2 bg-white font-bold"
                                        >
                                          {GRADES.map(g => (
                                            <option key={g} value={g === "Public (All Students)" ? "Public" : g}>{g}</option>
                                          ))}
                                        </select>
                                     </div>
                                  </div>
                                  <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Featured Image URL</label>
                                    <input 
                                      type="url" 
                                      value={editFormData.imageUrl || ''}
                                      onChange={(e) => setEditFormData({...editFormData, imageUrl: e.target.value})}
                                      className="w-full text-sm border rounded-xl px-3 py-2"
                                      placeholder="https://image-url.com/poster.jpg"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Title</label>
                                    <input 
                                      type="text" 
                                      value={editFormData.title}
                                      onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                                      className="w-full text-sm border rounded-xl px-3 py-2 font-bold"
                                      placeholder="Title"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Content</label>
                                    <textarea 
                                      value={editFormData.content}
                                      onChange={(e) => setEditFormData({...editFormData, content: e.target.value})}
                                      className="w-full text-sm border rounded-xl px-3 py-2"
                                      rows={4}
                                      placeholder="Content"
                                    />
                                  </div>
                                  <div className="flex gap-2 pt-2">
                                    <button onClick={handleSaveEdit} className="bg-indigo-600 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-md">Save Changes</button>
                                    <button onClick={() => setEditingId(null)} className="bg-white text-slate-500 text-xs font-bold px-6 py-2.5 rounded-xl border border-slate-200">Cancel</button>
                                  </div>
                               </div>
                            ) : (
                               <>
                                <div className="flex justify-between items-start mb-4">
                                  <div className="flex items-center gap-2">
                                     <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded tracking-widest">{post.subject}</span>
                                     <button 
                                       onClick={() => togglePublicStatus(post)}
                                       className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${post.isPublic ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
                                     >
                                       {post.isPublic ? 'Public' : 'Private'}
                                     </button>
                                  </div>
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => {
                                        const shareUrl = post.link || window.location.href;
                                        if (navigator.share) {
                                          navigator.share({ title: post.title, text: post.content, url: shareUrl });
                                        } else {
                                          navigator.clipboard.writeText(shareUrl);
                                          alert("Link copied to clipboard!");
                                        }
                                      }}
                                      className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                      <Share2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(post.id)} className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                  </div>
                                 </div>
                                 {post.imageUrl && (
                                   <div className="mb-4 aspect-video rounded-xl overflow-hidden border border-slate-100">
                                      <img src={post.imageUrl} alt="Featured" className="w-full h-full object-cover" />
                                   </div>
                                 )}
                                <h4 className="text-xl font-bold text-gray-900 mb-3">{post.title}</h4>
                                <p className="text-gray-600 text-sm line-clamp-3 mb-4">{post.content}</p>
                                {post.link && (
                                  <div className="mb-4">
                                    <a href={post.link} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
                                      <ExternalLink size={12} /> Visit Link
                                    </a>
                                  </div>
                                )}
                                <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                                  <span className="text-xs text-gray-400">{new Date(post.date).toLocaleDateString()}</span>
                                  <div className="flex gap-3">
                                     <button onClick={() => startEdit(post)} className="text-indigo-600 font-bold text-xs hover:underline">Edit Post</button>
                                  </div>
                                </div>
                               </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-10">
      {/* Banner */}
      <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-slate-900 text-white min-h-[300px] flex flex-col justify-end">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2000')] bg-cover bg-center opacity-40 mix-blend-luminosity"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
        <div className="relative p-8 md:p-12 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3">
                  <YoutubeIcon size={24} className="text-white" />
                </div>
                <span className="font-black uppercase tracking-[0.2em] text-red-500 text-sm">Media Hub</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">E-Learning & YouTube</h1>
              <p className="text-slate-400 text-lg max-w-2xl font-medium">Manage units, video lessons, and interactive web posts categories by grade.</p>
            </div>
            <div className="flex gap-4">
              <div className="bg-slate-800/50 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center min-w-[100px]">
                <div className="text-2xl font-black text-red-500">{links.length}</div>
                <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Videos</div>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center min-w-[100px]">
                <div className="text-2xl font-black text-indigo-500">{webPosts.length}</div>
                <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Posts</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selector */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
           <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
             <LayoutGrid className="text-red-600" />
             Select Target Grade
           </h2>
           <div className="hidden md:flex gap-2">
              <button 
                onClick={() => setViewType('grid')}
                className={`p-2 rounded-lg transition-all ${viewType === 'grid' ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:bg-gray-100'}`}
              >
                <LayoutGrid size={20} />
              </button>
              <button 
                onClick={() => setViewType('list')}
                className={`p-2 rounded-lg transition-all ${viewType === 'list' ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:bg-gray-100'}`}
              >
                <List size={20} />
              </button>
           </div>
        </div>

        <div className={viewType === 'grid' ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" : "space-y-2"}>
          {GRADES.map((grade) => {
            const isPublicBtn = grade === "Public (All Students)";
            const vCount = links.filter(l => l && (isPublicBtn ? l.isPublic : l.grade === grade)).length;
            const pCount = webPosts.filter(p => p && (isPublicBtn ? p.isPublic : p.grade === grade)).length;
            
            if (viewType === 'grid') {
              return (
                <button
                  key={grade}
                  onClick={() => setSelectedGrade(grade)}
                  className={`bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:border-red-500 hover:shadow-xl transition-all group text-left relative overflow-hidden flex flex-col justify-between h-[180px] ${isPublicBtn ? ' ring-2 ring-green-100' : ''}`}
                >
                  <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-12 -mt-12 transition-all group-hover:scale-125 ${isPublicBtn ? 'bg-green-50' : 'bg-red-50'}`}></div>
                  
                  <div className="relative flex justify-between items-start">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${isPublicBtn ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {isPublicBtn ? <Globe size={24} /> : <YoutubeIcon size={24} />}
                    </div>
                    {(vCount + pCount) > 0 && (
                      <span className="bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded-lg">
                        {vCount + pCount}
                      </span>
                    )}
                  </div>
                  
                  <div className="relative">
                    <h3 className="text-lg font-black text-slate-900 leading-tight mb-1">{grade}</h3>
                    <div className="flex gap-2">
                       <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <YoutubeIcon size={10} /> {vCount}
                       </span>
                       <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <FileText size={10} /> {pCount}
                       </span>
                    </div>
                  </div>
                </button>
              );
            }

            return (
              <button
                key={grade}
                onClick={() => setSelectedGrade(grade)}
                className="w-full bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between hover:bg-red-50 group transition-all"
              >
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-all">
                     {isPublicBtn ? <Globe size={18} /> : <Folder size={18} />}
                   </div>
                   <span className="font-bold text-slate-800">{grade}</span>
                </div>
                <div className="flex gap-3 text-xs font-bold text-slate-400">
                  <span className="flex items-center gap-1 group-hover:text-red-600"><YoutubeIcon size={14} /> {vCount}</span>
                  <span className="flex items-center gap-1 group-hover:text-indigo-600"><FileText size={14} /> {pCount}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  );
}
