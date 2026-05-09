import React, { useState, useEffect, useRef } from "react";
import { getStudents, getFees, getClasses, getAdminSettings, getSubjects } from "../../lib/db";
import { Search, X, ExternalLink, CheckCircle, FileText, Download, Printer, Trash2, Copy, Image as ImageIcon, Share2, Plus } from "lucide-react";
import WhatsAppIcon from "../../components/WhatsAppIcon";
import { toPng, toBlob } from 'html-to-image';
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
        const pdfHeight = (pdf.internal.pageSize.getHeight());
        
        const imgProps = pdf.getImageProperties(imgData);
        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfH = (imgProps.height * pdfW) / imgProps.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
        pdf.save(`Unpaid_Receipt_${selectedStudentForReceipt.name}.pdf`);
      } catch (error) {
        console.error("Error generating receipt PDF:", error);
      }
    }
  };

  const copyAsImage = async () => {
    if (receiptRef.current && selectedStudentForReceipt) {
      try {
        const blob = await toBlob(receiptRef.current, { pixelRatio: 2, backgroundColor: '#ffffff' });
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          alert("Image copied to clipboard!");
        }
      } catch (err) {
        console.error('Copy failed', err);
        alert("Failed to copy image. Try downloading instead.");
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
        .filter(s => s.category === "Sub") // Only calculate extra fee subjects
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

            {subjects.filter(s => s.category === "Sub").length > 0 && (
              <div className="flex-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Select Subjects (Extra Fees)</label>
                <div className="flex flex-col gap-2 border border-pink-50 bg-pink-50/30 rounded-xl p-3 max-h-64 overflow-y-auto">
                  {subjects
                    .filter(s => s.category === "Sub")
                    .map((sub) => {
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
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Roll Number</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Fee</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Due Amount</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Payments</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Unpaid Receipt</th>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-bold">{student.rollNo || "N/A"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col my-auto relative">
            <button 
              onClick={() => setShowReceiptModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
            >
              <div className="bg-gray-100 p-1 rounded-full"><Plus className="rotate-45" size={20} /></div>
            </button>
            
            <div className="flex flex-col md:flex-row h-full">
              {/* Left Side: Preview */}
              <div className="flex-1 p-6 bg-slate-100 border-r border-gray-100 overflow-y-auto max-h-[80vh] flex justify-center">
                <div 
                  ref={receiptRef}
                  id="receipt-download-version"
                  className="bg-white shadow-2xl relative p-8 font-sans border-t-[6px] border-pink-500 rounded-b-xl"
                  style={{ width: '450px', minHeight: '600px' }}
                >
                  {/* UNPAID Corner Ribbon */}
                  <div className="absolute top-6 right-[-35px] rotate-45 text-white font-black text-[10px] uppercase tracking-widest px-10 py-1 shadow-md z-20 bg-red-600 border-2 border-white">
                    UNPAID / INVOICE
                  </div>

                  {/* Header */}
                  <div className="flex flex-col items-center text-center mb-6 pt-4">
                    <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSUXk2g5YJOQDHiOYn-CwQrBzvNqPuok_bdUA&s" alt="Academy Logo" className="w-16 h-16 object-contain mb-3" />
                    <h1 className="text-sm font-black text-gray-800 tracking-tight leading-none uppercase">
                      {adminSettings?.instituteName || "AGARAM DHINES ONLINE ACADEMY"}
                    </h1>
                    <p className="text-[9px] text-pink-600 font-black tracking-[3px] uppercase mt-1 italic">Excellence in Digital Learning</p>
                  </div>

                  <div className="h-px bg-gray-100 mb-6" />

                  {/* Invoice Details */}
                  <div className="grid grid-cols-2 gap-4 mb-6 border-y border-gray-50 py-4 text-[11px]">
                    <div className="space-y-1">
                      <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 font-bold">Invoiced To</h2>
                      <p className="text-sm font-black text-gray-900">{selectedStudentForReceipt.name}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">Roll No: {selectedStudentForReceipt.rollNo || "N/A"}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">Class: {selectedStudentForReceipt.grade}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 font-bold">Details</h2>
                      <p className="text-[10px] text-gray-800 font-bold uppercase">Date: {new Date().toLocaleDateString()}</p>
                      <p className="text-red-600 font-black uppercase text-[10px]">Status: Overdue</p>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="mb-6">
                    <div className="bg-gray-50 p-2 border-b border-gray-200 flex justify-between text-[9px] font-black text-gray-500 uppercase tracking-widest">
                      <span>Description</span>
                      <span>Amount</span>
                    </div>
                    <div className="divide-y divide-gray-50 text-[11px]">
                      {receiptItems.map((item, idx) => (
                        <div key={`${item.type}-${item.id}-${idx}`} className="py-3 flex justify-between items-center group relative">
                          <div>
                            <p className="text-xs font-black text-gray-800 uppercase tracking-tighter">{item.label}</p>
                            <p className="text-[9px] text-gray-400 font-bold italic tracking-wider">
                              {item.subLabel}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="text-xs font-black text-gray-900">LKR {item.amount}.00</p>
                            <button 
                              onClick={() => toggleReceiptItem(item.id, item.type as any)}
                              className="text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 print:hidden"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="space-y-2 border-t-2 border-gray-100 pt-4 mb-10 text-right flex flex-col items-end">
                    <div className="w-52 space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <span>Sub Total</span>
                        <span className="text-xs font-black text-gray-600">LKR {receiptItems.reduce((acc, curr) => acc + curr.amount, 0)}.00</span>
                      </div>
                      <div className="bg-red-600 text-white p-3 rounded-xl shadow-lg flex justify-between items-center border border-red-500 shadow-red-100">
                        <span className="text-[9px] font-black uppercase tracking-widest italic">Amount Due</span>
                        <span className="text-lg font-black tracking-tighter">LKR {receiptItems.reduce((acc, curr) => acc + curr.amount, 0)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Aesthetic Footer */}
                  <div className="text-center pt-6 border-t border-dashed border-gray-100">
                    <div className="mb-2">
                       <CheckCircle size={20} className="mx-auto text-red-500" />
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px]">PLEASE PAY BEFORE DUEDATE</p>
                    <p className="text-[8px] text-gray-300 font-bold uppercase tracking-widest mt-2 font-bold italic">Generated via Agaram Academy Portal</p>
                  </div>
                </div>
              </div>

              {/* Right Side: Actions */}
              <div className="w-full md:w-64 p-6 bg-white flex flex-col gap-3 justify-center shadow-inner">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 border-b pb-2 italic">Invoice Actions</h3>
                
                <button 
                  onClick={copyAsImage}
                  className="flex items-center gap-3 w-full p-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-all group shadow-sm border border-blue-100"
                >
                  <div className="bg-white p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                    <Copy size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-tight leading-tight">Copy Image</p>
                    <p className="text-[9px] font-bold text-blue-400">Copy to Clipboard</p>
                  </div>
                </button>

                <button 
                  onClick={handleDownloadReceiptImage}
                  className="flex items-center gap-3 w-full p-3 bg-pink-50 text-pink-700 rounded-xl hover:bg-pink-100 transition-all group shadow-sm border border-pink-100"
                >
                  <div className="bg-white p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                    <ImageIcon size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-tight leading-tight">Save Photo</p>
                    <p className="text-[9px] font-bold text-pink-400">Download as PNG</p>
                  </div>
                </button>

                <button 
                  onClick={handleDownloadReceiptPDF}
                  className="flex items-center gap-3 w-full p-3 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-all group shadow-sm border border-purple-100"
                >
                  <div className="bg-white p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                    <FileText size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-tight leading-tight">PDF Document</p>
                    <p className="text-[9px] font-bold text-purple-400">Download as PDF</p>
                  </div>
                </button>

                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2">
                  <button 
                    onClick={() => {
                      const content = document.getElementById('receipt-download-version');
                      let printIframe = document.getElementById('receipt-print-iframe') as HTMLIFrameElement;
                      if (!printIframe) {
                        printIframe = document.createElement('iframe');
                        printIframe.id = 'receipt-print-iframe';
                        printIframe.style.position = 'absolute';
                        printIframe.style.top = '-9999px';
                        printIframe.style.left = '-9999px';
                        document.body.appendChild(printIframe);
                      }
                      
                      const printDoc = printIframe.contentWindow?.document;
                      if (printDoc && content) {
                        printDoc.open();
                        printDoc.write(`
                          <html>
                            <head>
                              <title>Invoice - ${selectedStudentForReceipt.name}</title>
                              <style>
                                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                                body { font-family: 'Inter', sans-serif; background: white; margin: 0; padding: 20px; }
                                .print-container { width: 100%; display: flex; justify-content: center; }
                                #print-node { width: 450px; border: 1px solid #eee; position: relative; }
                              </style>
                            </head>
                            <body>
                              <div class="print-container">
                                <div id="print-node">${content.innerHTML}</div>
                              </div>
                            </body>
                          </html>
                        `);
                        printDoc.close();
                        setTimeout(() => {
                          printIframe.contentWindow?.focus();
                          printIframe.contentWindow?.print();
                        }, 500);
                      }
                    }}
                    className="flex items-center justify-center gap-2 w-full py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg transition-all hover:bg-gray-50 active:scale-95"
                  >
                    <Printer size={16} />
                    Traditional Print
                  </button>

                  <div className="bg-red-50 p-2.5 rounded-xl border border-red-100 mt-2">
                    <p className="text-[9px] text-center text-red-600 font-black uppercase tracking-[0.1em] leading-relaxed">
                      This is a payment reminder invoice. Please settle the dues at your earliest convenience to avoid service interruption.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
