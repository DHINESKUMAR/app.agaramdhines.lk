import React, { useState, useEffect, useRef } from "react";
import { getStudents, getFees, getClasses, getAdminSettings, getSubjects } from "../../lib/db";
import { Search, X, ExternalLink, CheckCircle, FileText, Download, Printer, Trash2 } from "lucide-react";
import WhatsAppIcon from "../../components/WhatsAppIcon";
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

export default function FeeDefaulters() {
  const [students, setStudents] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [adminSettings, setAdminSettings] = useState<any>(null);

  // Receipt Modal State
  const receiptRef = useRef<HTMLDivElement>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedStudentForReceipt, setSelectedStudentForReceipt] = useState<any>(null);
  const [receiptItems, setReceiptItems] = useState<any[]>([]); // New state for unified items
  const [monthlyFee, setMonthlyFee] = useState(1500);

  useEffect(() => {
    if (selectedStudentForReceipt) {
      // Build receipt items from unpaid months and subjects
      const items = [
        ...(selectedStudentForReceipt.unpaidMonths || []).map((m: string) => ({
          type: 'monthly',
          label: 'Monthly Tuition Fee',
          subLabel: new Date(m + "-01").toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          amount: selectedStudentForReceipt.totalFee || 1500,
          id: m
        })),
        ...(selectedStudentForReceipt.unpaidSubjects || []).map((s: any) => ({
          type: 'subject',
          label: s.name,
          subLabel: 'Special Subject Fee',
          amount: Number(s.fee) || 0,
          id: s.id
        }))
      ];
      setReceiptItems(items);
      setMonthlyFee(selectedStudentForReceipt.totalFee || 1500);
    }
  }, [selectedStudentForReceipt]);

  const toggleReceiptItem = (itemId: string, type: 'monthly' | 'subject') => {
    setReceiptItems(prev => prev.filter(item => !(item.id === itemId && item.type === type)));
  };

  // WhatsApp Modal State
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [currentWhatsAppIndex, setCurrentWhatsAppIndex] = useState(0);
  const [sentStatus, setSentStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    Promise.all([
      getStudents(), 
      getFees(), 
      getClasses(), 
      getAdminSettings(),
      getSubjects()
    ]).then(([studentsData, feesData, classesData, settings, subjectsData]) => {
      setStudents(studentsData || []);
      setFees(feesData || []);
      setClasses(classesData || []);
      setAdminSettings(settings);
      setSubjects(subjectsData || []);
    });
  }, []);

  const handleDownloadReceiptImage = async () => {
    if (receiptRef.current && selectedStudentForReceipt) {
      try {
        const url = await toPng(receiptRef.current, { pixelRatio: 3, backgroundColor: 'white' });
        const link = document.createElement("a");
        link.download = `Unpaid_Receipt_${selectedStudentForReceipt.name}.png`;
        link.href = url;
        link.click();
      } catch (error) {
        console.error("Error generating receipt image:", error);
      }
    }
  };

  const handleDownloadReceiptPDF = async () => {
    if (receiptRef.current && selectedStudentForReceipt) {
      try {
        const imgData = await toPng(receiptRef.current, { pixelRatio: 3, backgroundColor: 'white' });
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgProps = pdf.getImageProperties(imgData);
        const ratio = Math.min((pdfWidth - 20) / imgProps.width, (pdfHeight - 40) / imgProps.height);
        const width = imgProps.width * ratio;
        const height = imgProps.height * ratio;
        const x = (pdfWidth - width) / 2;
        const y = 20;

        pdf.addImage(imgData, 'PNG', x, y, width, height);
        pdf.save(`Unpaid_Receipt_${selectedStudentForReceipt.name}.pdf`);
      } catch (error) {
        console.error("Error generating receipt PDF:", error);
      }
    }
  };

  const handleSearch = () => {
    if (!selectedClass || (selectedMonths.length === 0 && selectedSubjects.length === 0)) {
      alert("Please select Class and at least one Month or Subject to search.");
      return;
    }

    // Find the class object to get the tuition fee
    const classObj = classes.find(c => c.name === selectedClass);
    const classFee = Number(classObj?.monthlyTuitionFees) || 1500;

    // Find students in the selected class
    const classStudents = students.filter(s => s.grade === selectedClass);
    
    // Find students who haven't paid for any of these selected months or subjects
    const defaultersList = classStudents.map(student => {
      const studentId = student.student_id || student.id;
      const studentFees = fees.filter(f => f.studentId === studentId);
      
      // Filter out months from the selection that have been paid
      const unpaidMonths = selectedMonths.filter(m => {
        return !studentFees.some(fee => fee.month === m && (fee.type === "Monthly Tuition" || !fee.type));
      });

      // Filter out subjects from the selection that have been paid
      const unpaidSubjects = subjects
        .filter(s => selectedSubjects.includes(s.name))
        .filter(s => {
          return !studentFees.some(fee => fee.itemName === s.name && fee.type === "Subject Fee");
        });

      if (unpaidMonths.length === 0 && unpaidSubjects.length === 0) return null;

      const monthsAmount = unpaidMonths.length * classFee;
      const subjectsAmount = unpaidSubjects.reduce((sum, s) => sum + (Number(s.fee) || 0), 0);

      return {
        ...student,
        unpaidMonths,
        unpaidSubjects,
        totalFee: classFee,
        dueAmount: monthsAmount + subjectsAmount
      };
    }).filter(Boolean);

    setDefaulters(defaultersList);
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

    let monthsText = "";
    if (currentStudent.unpaidMonths?.length > 0 && currentStudent.unpaidSubjects?.length > 0) {
      monthsText = `your fees for ${currentStudent.unpaidMonths.length} months and ${currentStudent.unpaidSubjects.length} subjects are pending`;
    } else if (currentStudent.unpaidMonths?.length > 0) {
      monthsText = `your fees for ${currentStudent.unpaidMonths.length} months are pending`;
    } else {
      monthsText = `your subject fees for ${currentStudent.unpaidSubjects.map((s:any) => s.name).join(', ')} are pending`;
    }

    const message = `Dear ${currentStudent.name}, ${monthsText}. Total due amount is LKR ${currentStudent.dueAmount}. Please pay as soon as possible. Thank you.`;
    const encodedMessage = encodeURIComponent(message);
    
    // Use phone number if available, otherwise just open WhatsApp Web to select contact
    const rawPhone = currentStudent.phone || currentStudent.username || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    
    // If the phone number starts with 0, replace it with Sri Lanka country code 94
    // If it's 9 digits and starts with 7, add 94
    let formattedPhone = cleanPhone || '';
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '94' + formattedPhone.substring(1);
    } else if (formattedPhone.length === 9 && (formattedPhone.startsWith('7') || formattedPhone.startsWith('1') || formattedPhone.startsWith('4'))) {
      formattedPhone = '94' + formattedPhone;
    }
    
    const phoneParam = formattedPhone ? `phone=${formattedPhone}&` : '';
    const whatsappUrl = `https://api.whatsapp.com/send?${phoneParam}text=${encodedMessage}`;
    
    // Use window.open for better reliability across browsers
    window.open(whatsappUrl, '_blank');
    
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

  const completionPercentage = selectedStudentsData.length > 0 
    ? Math.round((currentWhatsAppIndex / selectedStudentsData.length) * 100)
    : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Fee Defaulters / Unpaid Fees</h1>
      
      {/* Top Section: Filters */}
      <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 mb-6 font-sans">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 border-b border-gray-100">
            <div className="w-full">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Select Class</label>
              <select 
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 bg-white font-bold text-gray-700"
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

            <div className="w-full">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Select Year</label>
              <select 
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setSelectedMonths([]); // Reset month selection when year changes
                }}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 bg-white font-bold text-gray-700"
              >
                {[2024, 2025, 2026, 2027, 2028].map(year => (
                  <option key={year} value={year.toString()}>{year}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                <span>Select Months</span>
                <span className="text-blue-500 lowercase font-bold tracking-normal italic text-[9px]">{selectedMonths.length} months selected</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 border border-blue-50 bg-blue-50/30 rounded-xl p-3 max-h-64 overflow-y-auto">
                {Array.from({ length: 12 }, (_, i) => {
                  const date = new Date(parseInt(selectedYear), i, 1);
                  const monthVal = `${selectedYear}-${(i + 1).toString().padStart(2, '0')}`;
                  
                  const isSelected = selectedMonths.includes(monthVal);
                  return (
                    <label key={monthVal} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-blue-600 border-blue-600 shadow-md shadow-blue-500/10' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedMonths(prev => 
                            prev.includes(monthVal) ? prev.filter(m => m !== monthVal) : [...prev, monthVal].sort()
                          );
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`text-xs font-black uppercase tracking-tight ${isSelected ? 'text-white' : 'text-gray-600'}`}>
                        {date.toLocaleString('en-US', { month: 'long' })}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {subjects.length > 0 && (
              <div className="flex-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Select Subjects (Extra Fees)</label>
                <div className="flex flex-col gap-2 border border-pink-50 bg-pink-50/30 rounded-xl p-3 max-h-64 overflow-y-auto">
                  {subjects.map((sub) => {
                    const isSelected = selectedSubjects.includes(sub.name);
                    return (
                      <label key={sub.id} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-pink-600 border-pink-600 shadow-md shadow-pink-500/10' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedSubjects(prev => 
                              prev.includes(sub.name) ? prev.filter(s => s !== sub.name) : [...prev, sub.name]
                            );
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                        />
                        <div className="flex-1 flex justify-between items-center">
                          <span className={`text-xs font-black uppercase tracking-tight ${isSelected ? 'text-white' : 'text-gray-600'}`}>
                            {sub.name}
                          </span>
                          {sub.fee && sub.fee !== "0" && (
                            <span className={`text-[10px] font-bold ${isSelected ? 'text-pink-100' : 'text-blue-500'}`}>
                              LKR {sub.fee}
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          <div className="pt-2">
            <button 
              onClick={handleSearch}
              className="w-full md:w-auto min-w-[200px] h-[52px] bg-blue-600 hover:bg-blue-700 text-white font-black px-10 rounded-xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-100"
            >
              <Search size={20} /> SEARCH DEFAULTERS
            </button>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100 gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (selectedIds.length === defaulters.length) {
                setSelectedIds([]);
              } else {
                setSelectedIds(defaulters.map(d => d.id));
              }
            }}
            disabled={defaulters.length === 0}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            {selectedIds.length === defaulters.length && defaulters.length > 0 ? (
              <><X size={16} /> Deselect All</>
            ) : (
              <><CheckCircle size={16} /> Select All Members</>
            )}
          </button>
          <div className="h-4 w-px bg-gray-300" />
          <span className="text-xs font-black uppercase tracking-widest text-gray-500">
            {selectedIds.length} Students Selected
          </span>
        </div>

        <button 
          onClick={handleBulkWhatsApp}
          disabled={selectedIds.length === 0}
          className={`flex items-center gap-2 font-black uppercase text-xs tracking-widest py-3 px-8 rounded-lg shadow-lg transition-all group ${
            selectedIds.length > 0 
              ? 'bg-[#25D366] hover:bg-[#128C7E] text-white shadow-[#25D366]/20' 
              : 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-none'
          }`}
        >
          <WhatsAppIcon size={18} className="group-hover:scale-110 transition-transform" />
          Send Bulk Reminders
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
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Payments</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Unpaid Receipt</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {!hasSearched ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                        Please select a class and month to view defaulters.
                      </td>
                    </tr>
                  ) : defaulters.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-green-600 font-medium">
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">LKR {student.totalFee}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex flex-col">
                            <span className="font-bold text-red-600">LKR {student.dueAmount}</span>
                            <span className="text-[10px] text-gray-500 uppercase font-black uppercase tracking-tighter">
                              {student.unpaidMonths?.length} Month{student.unpaidMonths?.length > 1 ? 's' : ''} Pending
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <a href={`/admin/collect-fee?student=${student.id}`} className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded transition-colors">
                            View / Pay
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <button 
                            onClick={() => { 
                              setSelectedStudentForReceipt(student); 
                              setShowReceiptModal(true); 
                            }}
                            className="text-pink-600 hover:text-pink-900 bg-pink-50 hover:bg-pink-100 px-3 py-1.5 rounded transition-colors flex items-center gap-1 mx-auto"
                          >
                            <FileText size={16} /> Receipt
                          </button>
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
                  {completionPercentage}% Complete
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-8">
                <div 
                  className="bg-[#25D366] h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${completionPercentage}%` }}
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
                      <p className="font-medium text-red-600">LKR {currentStudent.dueAmount}</p>
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
                      Dear {currentStudent.name}, {
                        (currentStudent.unpaidMonths?.length > 0 && currentStudent.unpaidSubjects?.length > 0)
                        ? `your fees for ${currentStudent.unpaidMonths.length} months and ${currentStudent.unpaidSubjects.length} subjects are pending`
                        : currentStudent.unpaidMonths?.length > 0
                          ? `your fees for ${currentStudent.unpaidMonths.length} months are pending`
                          : `your subject fees for ${currentStudent.unpaidSubjects.map((s:any) => s.name).join(', ')} are pending`
                      }. Total due amount is LKR {currentStudent.dueAmount}. Please pay as soon as possible. Thank you.
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

                {currentWhatsAppIndex < selectedStudentsData.length - 1 && (
                  <button
                    onClick={() => setCurrentWhatsAppIndex(prev => prev + 1)}
                    className="px-4 py-2 text-blue-600 font-bold hover:bg-blue-50 rounded-md transition-colors"
                  >
                    Skip
                  </button>
                )}
                
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

      {/* Unpaid Receipt Modal */}
      {showReceiptModal && selectedStudentForReceipt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FileText size={20} className="text-pink-600" />
                Unpaid Receipt Preview
              </h2>
              <button 
                onClick={() => setShowReceiptModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-slate-100 p-4 md:p-8 flex flex-col items-center">
              {/* Receipt Preview Container */}
              <div 
                ref={receiptRef}
                className="bg-white shadow-2xl relative p-8 font-sans border-t-[6px] border-pink-500 rounded-b-xl"
                style={{ width: '148mm', minHeight: '210mm', transform: 'scale(1)', transformOrigin: 'top center' }}
              >
                {/* UNPAID Corner Ribbon */}
                <div className="absolute top-0 right-0 overflow-hidden w-32 h-32 pointer-events-none">
                  <div className="bg-red-600 text-white font-black py-1 px-10 text-center transform rotate-45 translate-x-8 translate-y-4 shadow-md uppercase text-xs border-2 border-white tracking-widest">
                    UNPAID
                  </div>
                </div>

                {/* Header */}
                <div className="flex flex-col items-center text-center mb-8">
                  <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSUXk2g5YJOQDHiOYn-CwQrBzvNqPuok_bdUA&s" alt="Academy Logo" className="w-16 h-16 object-contain mb-3" />
                  <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none uppercase">
                    {adminSettings?.instituteName || "AGARAM DHINES ONLINE ACADEMY"}
                  </h1>
                  <p className="text-[10px] text-pink-600 font-black tracking-[0.3em] uppercase mt-1">Excellence in Digital Learning</p>
                </div>

                <div className="h-px bg-gray-100 mb-6" />

                {/* Invoice Details */}
                <div className="flex justify-between items-start mb-8 text-[11px]">
                  <div className="space-y-1">
                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Invoiced To</h2>
                    <p className="text-sm font-black text-gray-900">{selectedStudentForReceipt.name}</p>
                    <p className="text-gray-600 font-bold">ID: {selectedStudentForReceipt.student_id || selectedStudentForReceipt.id}</p>
                    <p className="text-gray-600 font-bold">Class: {selectedStudentForReceipt.grade}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Receipt Info</h2>
                    <p className="text-gray-600 font-bold">Date: {new Date().toLocaleDateString()}</p>
                    <p className="text-red-600 font-black uppercase">Status: Overdue</p>
                  </div>
                </div>

                {/* Table */}
                <div className="mb-8">
                  <div className="bg-gray-50 p-2 border-b border-gray-200 flex justify-between text-[9px] font-black text-gray-500 uppercase tracking-widest">
                    <span>Description</span>
                    <span>Amount</span>
                  </div>
                  <div className="divide-y divide-gray-100 text-[11px]">
                    {receiptItems.map((item, idx) => (
                      <div key={`${item.type}-${item.id}-${idx}`} className="py-3 flex justify-between items-center group relative">
                        <div>
                          <p className="font-black text-gray-800 uppercase tracking-tighter">{item.label}</p>
                          <p className="text-[9px] text-gray-400 font-bold italic tracking-wider">
                            {item.subLabel}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="font-black text-gray-900">LKR {item.amount}.00</p>
                          <button 
                            onClick={() => toggleReceiptItem(item.id, item.type as any)}
                            className="text-red-400 hover:text-red-600 transition-colors md:opacity-0 group-hover:opacity-100 print:hidden"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="mt-auto pt-6 border-t border-gray-100 flex flex-col items-end">
                  <div className="w-52 space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <span>Sub Total</span>
                      <span className="text-gray-900 font-black">LKR {receiptItems.reduce((acc, curr) => acc + curr.amount, 0)}.00</span>
                    </div>
                    <div className="bg-pink-600 text-white p-3 rounded-lg flex justify-between items-center shadow-lg transform rotate-1">
                      <span className="text-[9px] font-black uppercase tracking-widest italic">Total Due</span>
                      <span className="text-lg font-black tracking-tighter">LKR {receiptItems.reduce((acc, curr) => acc + curr.amount, 0)}.00</span>
                    </div>
                  </div>
                </div>

                {/* Aesthetic Footer */}
                <div className="mt-12 text-center">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="h-px w-8 bg-gray-100" />
                    <CheckCircle size={14} className="text-pink-500" />
                    <div className="h-px w-8 bg-gray-100" />
                  </div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-1 italic">Generated via Agaram Academy Portal</p>
                  <p className="text-[10px] text-gray-800 font-black">PLEASE SETTLE THE DUES AT YOUR EARLIEST</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white border-t border-gray-100 flex justify-center gap-4">
              <button
                onClick={handleDownloadReceiptImage}
                className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-black hover:bg-slate-800 transition-all shadow-xl hover:-translate-y-1 active:translate-y-0 text-sm uppercase tracking-widest"
              >
                <Download size={18} /> Download Image
              </button>
              <button
                onClick={handleDownloadReceiptPDF}
                className="flex items-center gap-2 bg-pink-600 text-white px-6 py-3 rounded-xl font-black hover:bg-pink-700 transition-all shadow-xl hover:-translate-y-1 active:translate-y-0 text-sm uppercase tracking-widest"
              >
                <Printer size={18} /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
