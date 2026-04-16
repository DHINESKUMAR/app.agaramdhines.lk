import React, { useState, useEffect } from 'react';
import { getClasses } from '../../lib/db';

export default function TermExam() {
  const [view, setView] = useState<'menu' | 'add' | 'view'>('menu');
  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    getClasses().then(setClasses);
  }, []);

  if (view === 'menu') {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 flex flex-col space-y-4">
        <button 
          onClick={() => setView('add')}
          className="bg-[#1e3a8a] text-white py-3 px-6 rounded-md hover:bg-blue-800 transition-colors font-medium text-center"
        >
          Add Term Exam
        </button>
        <button 
          onClick={() => setView('view')}
          className="bg-[#1e3a8a] text-white py-3 px-6 rounded-md hover:bg-blue-800 transition-colors font-medium text-center"
        >
          Manage Term Exams
        </button>
      </div>
    );
  }

  const GRADES = [
    "தரம் 01", "தரம் 02", "தரம் 03", "தரம் 04", "தரம் 05", 
    "தரம் 06", "தரம் 07", "தரம் 08", "தரம் 09", "தரம் 10", 
    "தரம் 11", "தரம் 12", "தரம் 13"
  ];

  if (view === 'add') {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-6">
          <button onClick={() => setView('menu')} className="mr-4 text-gray-600 hover:text-gray-900">
            ← Back
          </button>
          <h2 className="text-xl font-bold text-gray-800">Add Term Exam</h2>
        </div>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert('Term Exam Added'); setView('menu'); }}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Class</label>
            <select className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white">
              <option value="">Select Class</option>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Term Name</label>
            <input type="text" placeholder="e.g., First Term Exam 2026" className="w-full border border-gray-300 rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exam Date</label>
            <input type="date" className="w-full border border-gray-300 rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Results/Paper (PDF)</label>
            <input type="file" className="w-full border border-gray-300 rounded-md px-3 py-2" />
          </div>
          <button type="submit" className="w-full bg-pink-600 text-white py-2 rounded-md hover:bg-pink-700">Save Term Exam</button>
        </form>
      </div>
    );
  }

  if (view === 'view') {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-6">
          <button onClick={() => setView('menu')} className="mr-4 text-gray-600 hover:text-gray-900">
            ← Back
          </button>
          <h2 className="text-xl font-bold text-gray-800">Manage Term Exams</h2>
        </div>
        <div className="space-y-4">
          {/* Mock Data */}
          <div className="border border-gray-200 rounded-lg p-4 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-[#1e3a8a]">Grade 10 - First Term Exam 2026</h3>
              <p className="text-sm text-gray-500">Date: 2026-04-15</p>
            </div>
            <button className="bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200 text-sm font-medium">Delete</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
