import React, { useState, useEffect } from 'react';
import { Youtube as YoutubeIcon, PlayCircle, Trash2, ArrowLeft, Plus, ExternalLink, BookOpen } from 'lucide-react';
import { getYoutubeLinks, saveYoutubeLinks } from '../../lib/db';

export default function Youtube() {
  const [links, setLinks] = useState<any[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    subject: '',
    title: '',
    link: ''
  });

  useEffect(() => {
    getYoutubeLinks().then(data => {
      if (Array.isArray(data)) {
        setLinks(data);
      } else {
        setLinks([]);
      }
    });
  }, []);

  const GRADES = [
    "தரம் 01", "தரம் 02", "தரம் 03", "தரம் 04", "தரம் 05", 
    "தரம் 06", "தரம் 07", "தரம் 08", "தரம் 09", "தரம் 10", 
    "தரம் 11", "தரம் 12", "தரம் 13"
  ];

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.title || !formData.link) {
      alert("Subject, Title, and Link are required!");
      return;
    }
    
    // Basic YouTube URL validation
    if (!formData.link.includes('youtube.com') && !formData.link.includes('youtu.be')) {
      alert("Please enter a valid YouTube URL.");
      return;
    }

    const newLink = { 
      id: Date.now().toString(), 
      grade: selectedGrade,
      subject: formData.subject,
      title: formData.title,
      link: formData.link,
      date: new Date().toISOString()
    };
    
    const updatedLinks = [...links, newLink];
    setLinks(updatedLinks);
    await saveYoutubeLinks(updatedLinks);
    
    setFormData({ subject: '', title: '', link: '' });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this video link?")) {
      const updatedLinks = links.filter(l => l.id !== id);
      setLinks(updatedLinks);
      await saveYoutubeLinks(updatedLinks);
    }
  };

  const extractVideoId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  if (selectedGrade) {
    const gradeLinks = links.filter(l => l && l.grade === selectedGrade);
    
    return (
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedGrade(null)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{selectedGrade} - YouTube Links</h2>
              <p className="text-sm text-gray-500">Manage video lessons for this grade</p>
            </div>
          </div>
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-medium flex items-center gap-2">
            <YoutubeIcon size={20} />
            {gradeLinks.length} Videos
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Plus size={20} className="text-blue-600" />
                Add New Video
              </h3>
              <form onSubmit={handleAddLink} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Mathematics" 
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Video Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Algebra Chapter 1" 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">YouTube URL</label>
                  <input 
                    type="url" 
                    placeholder="https://youtube.com/watch?v=..." 
                    value={formData.link}
                    onChange={(e) => setFormData({...formData, link: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" 
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <YoutubeIcon size={18} />
                  Save Video Link
                </button>
              </form>
            </div>
          </div>

          {/* Videos List */}
          <div className="lg:col-span-2 space-y-4">
            {gradeLinks.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <PlayCircle size={32} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No videos added yet</h3>
                <p className="text-gray-500">Add your first YouTube video link for {selectedGrade} using the form.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gradeLinks.map((link) => {
                  const videoId = extractVideoId(link.link);
                  const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80';
                  
                  return (
                    <div key={link.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group">
                      <div className="relative h-40 bg-gray-100">
                        <img 
                          src={thumbnailUrl} 
                          alt={link.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <a 
                            href={link.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg"
                          >
                            <PlayCircle size={24} />
                          </a>
                        </div>
                        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm flex items-center gap-1">
                          <BookOpen size={12} />
                          {link.subject}
                        </div>
                      </div>
                      <div className="p-4">
                        <h4 className="font-bold text-gray-900 mb-1 line-clamp-2" title={link.title}>{link.title}</h4>
                        <div className="flex items-center justify-between mt-4">
                          <a 
                            href={link.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            Watch <ExternalLink size={14} />
                          </a>
                          <button 
                            onClick={() => handleDelete(link.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors p-1.5 hover:bg-red-50 rounded-md"
                            title="Delete Video"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      {/* YouTube Channel Banner */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg bg-gradient-to-r from-red-600 to-red-800 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?q=80&w=2000')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl border-4 border-white/20 shrink-0">
              <YoutubeIcon size={48} className="text-red-600" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Agaram Dhines</h1>
              <p className="text-red-100 text-lg mb-4">Official YouTube Channel for Education</p>
              <div className="flex items-center gap-4 text-sm font-medium">
                <span className="bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm">Educational Videos</span>
                <span className="bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm">தரம் 01 - 13</span>
              </div>
            </div>
          </div>
          <a 
            href="https://www.youtube.com/@agaramdhines" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-white text-red-600 hover:bg-gray-50 px-8 py-3.5 rounded-full font-bold shadow-lg transition-transform hover:scale-105 flex items-center gap-2 whitespace-nowrap"
          >
            <YoutubeIcon size={20} />
            Visit Channel
          </a>
        </div>
      </div>

      {/* Grades Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Manage Class Videos</h2>
          <p className="text-gray-500">Select a grade to add or manage YouTube links</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {GRADES.map((grade) => {
            const videoCount = links.filter(l => l && l.grade === grade).length;
            
            return (
              <button
                key={grade}
                onClick={() => setSelectedGrade(grade)}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-red-200 hover:shadow-md transition-all group text-left relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                
                <div className="flex justify-between items-start mb-4 relative">
                  <div className="w-12 h-12 bg-red-50 text-red-600 rounded-lg flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
                    <PlayCircle size={24} />
                  </div>
                  {videoCount > 0 && (
                    <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">
                      {videoCount}
                    </span>
                  )}
                </div>
                
                <h3 className="text-lg font-bold text-gray-800 mb-1 relative">{grade}</h3>
                <p className="text-sm text-gray-500 relative">
                  {videoCount === 0 ? 'No videos' : `${videoCount} video${videoCount > 1 ? 's' : ''}`}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
