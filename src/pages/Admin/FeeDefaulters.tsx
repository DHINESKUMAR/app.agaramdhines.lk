import React, { useState, useEffect } from "react";
import { getStudents, getFees, getClasses } from "../../lib/db";
import { Search, X, ExternalLink, CheckCircle } from "lucide-react";
import WhatsAppIcon from "../../components/WhatsAppIcon";

export default function FeeDefaulters() {
  const [students, setStudents] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // WhatsApp Modal State
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [currentWhatsAppIndex, setCurrentWhatsAppIndex] = useState(0);
  const [sentStatus, setSentStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    Promise.all([getStudents(), getFees(), getClasses()]).then(([studentsData, feesData, classesData]) => {
      setStudents(studentsData || []);
      setFees(feesData || []);
      setClasses(classesData || []);
    });
  }, []);

  const handleSearch = () => {
    if (!selectedClass || !selectedMonth) {
      alert("Please select both Class and Month to search.");
      return;
    }

    // Find students in the selected class
    const classStudents = students.filter(s => s.grade === selectedClass);
    
    // Find students who haven't paid for the selected month
    const unpaidStudents = classStudents.filter(student => {
      const studentId = student.student_id || student.id;
      // Check if there's a fee record for this student for the selected month
      const hasPaid = fees.some(fee => 
        (fee.studentId === studentId) && 
        fee.month === selectedMonth
      );
      return !hasPaid;
    });

    // Map to the required format with mock due amounts (since total fee per class isn't strictly defined in DB yet)
    const formattedDefaulters = unpaidStudents.map(student => ({
      ...student,
      totalFee: 1500, // Mock total fee
      dueAmount: 1500 // Mock due amount
    }));

    setDefaulters(formattedDefaulters);
    setHasSearched(true);
    setSelectedIds([]); // Reset selection
    setSentStatus({}); // Reset sent status
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(defaulters.map(d => d.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const handleBulkWhatsApp = () => {
    if (selectedIds.length === 0) {
      alert("Please select at least one student.");
      return;
    }
    
    setCurrentWhatsAppIndex(0);
    setShowWhatsAppModal(true);
  };

  const selectedStudentsData = defaulters.filter(d => selectedIds.includes(d.id));
  const currentStudent = selectedStudentsData[currentWhatsAppIndex];

  const handleSendWhatsApp = () => {
    if (!currentStudent) return;

    const message = `Dear ${currentStudent.name}, your fee for the month of ${selectedMonth} is pending. Please pay the due amount of ₹${currentStudent.dueAmount} as soon as possible. Thank you.`;
    const encodedMessage = encodeURIComponent(message);
    
    // Use phone number if available, otherwise just open WhatsApp Web to select contact
    const rawPhone = currentStudent.phone || currentStudent.username || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    
    // If the phone number starts with 0, replace it with Sri Lanka country code 94 (assuming Sri Lanka based on previous context)
    // Or just pass the clean phone number if it already has a country code
    let formattedPhone = cleanPhone || '';
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '94' + formattedPhone.substring(1);
    }
    
    const phoneParam = formattedPhone ? `phone=${formattedPhone}&` : '';
    const whatsappUrl = `https://api.whatsapp.com/send?${phoneParam}text=${encodedMessage}`;
    
    // Create an anchor element and click it to avoid popup blockers in some browsers
    const link = document.createElement('a');
    link.href = whatsappUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Mark as sent
    setSentStatus(prev => ({ ...prev, [currentStudent.id]: true }));
    
    // Move to next student if not at the end
    if (currentWhatsAppIndex < selectedStudentsData.length - 1) {
      setCurrentWhatsAppIndex(prev => prev + 1);
    }
  };

  const GRADES = [
    "தரம் 01", "தரம் 02", "தரம் 03", "தரம் 04", "தரம் 05", 
    "தரம் 06", "தரம் 07", "தரம் 08", "தரம் 09", "தரம் 10", 
    "தரம் 11", "தரம் 12", "தரம் 13"
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Fee Defaulters / Unpaid Fees</h1>
      
      {/* Top Section: Filters */}
      <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Class</label>
            <select 
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">-- Select Class --</option>
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
          
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Month</label>
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="w-full md:w-1/3">
            <button 
              onClick={handleSearch}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
            >
              <Search size={18} /> Search
            </button>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="mb-6 flex justify-end">
        <button 
          onClick={handleBulkWhatsApp}
          disabled={selectedIds.length === 0}
          className={`flex items-center gap-2 font-medium py-2.5 px-6 rounded-md shadow-sm transition-colors ${
            selectedIds.length > 0 
              ? 'bg-green-500 hover:bg-green-600 text-white' 
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          <WhatsAppIcon size={20} />
          Send Bulk WhatsApp Reminder
        </button>
      </div>

      {/* Main Section: Data Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left w-12">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.length === defaulters.length && defaulters.length > 0}
                    onChange={handleSelectAll}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Student ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone Number</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Fee</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Due Amount</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {!hasSearched ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Please select a class and month to view defaulters.
                  </td>
                </tr>
              ) : defaulters.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-green-600 font-medium">
                    No defaulters found! All students in this class have paid for the selected month.
                  </td>
                </tr>
              ) : (
                defaulters.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(student.id)}
                        onChange={() => handleSelect(student.id)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{student.student_id || student.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{student.phone || student.username || "N/A"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">₹{student.totalFee}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">₹{student.dueAmount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <a href={`/admin/collect-fee?student=${student.id}`} className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded transition-colors">
                        View / Pay
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {hasSearched && defaulters.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50 text-sm text-gray-600 flex justify-between items-center">
            <span>Showing {defaulters.length} defaulters</span>
            <span className="font-medium">Selected: {selectedIds.length}</span>
          </div>
        )}
      </div>

      {/* WhatsApp Bulk Send Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#25D366] p-4 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <WhatsAppIcon size={24} />
                Bulk WhatsApp Reminders
              </h2>
              <button 
                onClick={() => setShowWhatsAppModal(false)}
                className="text-white hover:bg-white/20 p-1 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-medium mb-1">How this works:</p>
                <p>Since browsers block multiple popups, you need to send messages one by one. Click "Send & Next" to open WhatsApp Web for the current student, then return here to send the next one.</p>
              </div>

              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-gray-700">
                  Student {currentWhatsAppIndex + 1} of {selectedStudentsData.length}
                </span>
                <span className="text-sm font-medium bg-gray-100 px-3 py-1 rounded-full text-gray-600">
                  {Math.round(((currentWhatsAppIndex) / selectedStudentsData.length) * 100)}% Complete
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-8">
                <div 
                  className="bg-[#25D366] h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${((currentWhatsAppIndex) / selectedStudentsData.length) * 100}%` }}
                ></div>
              </div>

              {currentStudent && (
                <div className="border border-gray-200 rounded-lg p-5 bg-gray-50 mb-6">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Student Name</p>
                      <p className="font-medium text-gray-900">{currentStudent.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Phone Number</p>
                      <p className="font-medium text-gray-900">{currentStudent.phone || currentStudent.username || <span className="text-red-500 italic">Not Provided</span>}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Due Amount</p>
                      <p className="font-medium text-red-600">₹{currentStudent.dueAmount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Status</p>
                      {sentStatus[currentStudent.id] ? (
                        <span className="inline-flex items-center gap-1 text-green-600 font-medium text-sm">
                          <CheckCircle size={16} /> Sent
                        </span>
                      ) : (
                        <span className="text-gray-500 text-sm">Pending</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Message Preview</p>
                    <div className="bg-white border border-gray-200 rounded-md p-3 text-sm text-gray-700 whitespace-pre-wrap">
                      Dear {currentStudent.name}, your fee for the month of {selectedMonth} is pending. Please pay the due amount of ₹{currentStudent.dueAmount} as soon as possible. Thank you.
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <button
                onClick={() => setCurrentWhatsAppIndex(prev => Math.max(0, prev - 1))}
                disabled={currentWhatsAppIndex === 0}
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowWhatsAppModal(false)}
                  className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                
                {currentWhatsAppIndex === selectedStudentsData.length - 1 && sentStatus[currentStudent?.id] ? (
                  <button
                    onClick={() => setShowWhatsAppModal(false)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
                  >
                    <CheckCircle size={18} /> Done
                  </button>
                ) : (
                  <button
                    onClick={handleSendWhatsApp}
                    className="bg-[#25D366] hover:bg-[#128C7E] text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <WhatsAppIcon size={18} /> 
                    {currentWhatsAppIndex < selectedStudentsData.length - 1 ? "Send & Next" : "Send Final"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
