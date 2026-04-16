import React, { useState, useEffect } from 'react';
import { getCourses, saveCourses, getClasses, getStaffs } from '../../lib/db';

export default function Courses() {
  const [view, setView] = useState<'menu' | 'add' | 'view'>('menu');
  const [courses, setCourses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [staffs, setStaffs] = useState<any[]>([]);
  const [filterClass, setFilterClass] = useState<string>("");

  useEffect(() => {
    getCourses().then(setCourses);
    getClasses().then(setClasses);
    getStaffs().then(setStaffs);
  }, [view]);

  const [formData, setFormData] = useState({
    grade: '',
    subject: '',
    title: '',
    link: ''
  });

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
    setFormData({ grade: '', subject: '', title: '', link: '' });
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
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 flex flex-col space-y-4">
        <button 
          onClick={() => setView('add')}
          className="bg-[#1e3a8a] text-white py-3 px-6 rounded-md hover:bg-blue-800 transition-colors font-medium text-center"
        >
          Add Course Link
        </button>
        <button 
          onClick={() => setView('view')}
          className="bg-[#1e3a8a] text-white py-3 px-6 rounded-md hover:bg-blue-800 transition-colors font-medium text-center"
        >
          Manage Courses
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
          <h2 className="text-xl font-bold text-gray-800">Add Course</h2>
        </div>
        <form className="space-y-4" onSubmit={handleAddCourse}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Class</label>
            <select 
              value={formData.grade}
              onChange={(e) => setFormData({...formData, grade: e.target.value, subject: ''})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
            >
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Subject</label>
            <select 
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
              disabled={!formData.grade}
            >
              <option value="">Select Subject</option>
              {availableSubjects.map((subject: any) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
              {formData.grade && availableSubjects.length === 0 && (
                <option value="" disabled>No subjects assigned for this class</option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course Title</label>
            <input 
              type="text" 
              placeholder="e.g., Tamil" 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course Web Link</label>
            <input 
              type="url" 
              placeholder="https://www.agaramdhines.lk/courses/..." 
              value={formData.link}
              onChange={(e) => setFormData({...formData, link: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2" 
            />
          </div>
          <button type="submit" className="w-full bg-pink-600 text-white py-2 rounded-md hover:bg-pink-700">Save Course</button>
        </form>
      </div>
    );
  }

  if (view === 'view') {
    const filteredCourses = filterClass 
      ? courses.filter(c => c.grade === filterClass)
      : courses;

    return (
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button onClick={() => setView('menu')} className="mr-4 text-gray-600 hover:text-gray-900">
              ← Back
            </button>
            <h2 className="text-xl font-bold text-gray-800">Manage Courses</h2>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Filter by Class:</span>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">All Classes</option>
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
        </div>
        <div className="space-y-4">
          {filteredCourses.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No courses found.</div>
          ) : (
            filteredCourses.map(course => (
              <div key={course.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-[#1e3a8a]">{course.grade} {course.subject ? `- ${course.subject}` : ''} - {course.title}</h3>
                  <p className="text-sm text-gray-500">Link: {course.link}</p>
                </div>
                <button 
                  onClick={() => handleDelete(course.id)}
                  className="bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200 text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return null;
}
