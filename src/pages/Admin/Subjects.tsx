import React, { useState, useEffect } from "react";
import { getSubjects, saveSubjects } from "../../lib/db";
import { Plus, Trash2, BookOpen } from "lucide-react";

export default function SubjectsGrades() {
  const [subjects, setSubjects] = useState<any[]>([]);
  
  const [newSubject, setNewSubject] = useState("");

  useEffect(() => {
    getSubjects().then(setSubjects);
  }, []);

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim()) return;
    
    const updated = [...subjects, { id: Date.now().toString(), name: newSubject }];
    setSubjects(updated);
    await saveSubjects(updated);
    setNewSubject("");
  };

  const handleDeleteSubject = async (id: string) => {
    if (window.confirm("Delete this subject?")) {
      const updated = subjects.filter(s => s.id !== id);
      setSubjects(updated);
      await saveSubjects(updated);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Subjects Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
            <BookOpen size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Manage Subjects</h2>
            <p className="text-gray-500 text-sm">Add or remove subjects that can be assigned to classes.</p>
          </div>
        </div>
        
        <form onSubmit={handleAddSubject} className="flex gap-3 mb-8">
          <input
            type="text"
            placeholder="e.g., Mathematics, Science, Tamil..."
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
          />
          <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium flex items-center shadow-sm transition-colors">
            <Plus size={20} className="mr-2" /> Add Subject
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2">
          {subjects.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <BookOpen size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No subjects added yet.</p>
              <p className="text-gray-400 text-sm mt-1">Add your first subject using the form above.</p>
            </div>
          ) : (
            subjects.map(subject => (
              <div key={subject.id} className="flex justify-between items-center p-4 border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow group">
                <span className="font-medium text-gray-800">{subject.name}</span>
                <button onClick={() => handleDeleteSubject(subject.id)} className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
