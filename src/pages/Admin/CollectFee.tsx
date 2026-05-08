import React, { useState, useEffect } from "react";
import { getStudents, saveStudents, getFees, saveFees, getClasses, getAdminSettings, getSubjects } from "../../lib/db";
import { Search, Calendar, CreditCard, User, BookOpen, DollarSign, CheckCircle, Printer, Plus } from "lucide-react";

export default function CollectFee() {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [allFees, setAllFees] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentFeeHistory, setStudentFeeHistory] = useState<any[]>([]);
  
  const [paymentData, setPaymentData] = useState({
    method: "Cash",
    date: new Date().toISOString().split('T')[0],
    month: new Date().toISOString().slice(0, 7), // YYYY-MM format
  });

  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isManualAmount, setIsManualAmount] = useState(false);
  const [customItem, setCustomItem] = useState({ name: "", amount: "" });
  const [showCustomForm, setShowCustomForm] = useState(false);

  const [subjects, setSubjects] = useState<any[]>([]);
  const [feeSettings, setFeeSettings] = useState<any[]>([]);

  useEffect(() => {
    getStudents().then(data => setStudents(data || []));
    getClasses().then(data => setClasses(data || []));
    getFees().then(data => setAllFees(data || []));
    getAdminSettings().then(data => setSettings(data));
    getSubjects().then(data => setSubjects(data || []));
    
    // Get fee presets from settings
    getAdminSettings().then(data => {
      if (data?.fees?.items) {
        setFeeSettings(data.fees.items);
      }
    });

    // Check if student ID is passed in URL
    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get('student');
    if (studentId) {
      getStudents().then(data => {
        const student = data?.find((s: any) => s.id === studentId);
        if (student) handleSelectStudent(student);
      });
    }
  }, []);

  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [editingFeeId, setEditingFeeId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedStudent) {
      const history = allFees.filter(f => f.studentId === selectedStudent.id || f.studentId === selectedStudent.student_id);
      setStudentFeeHistory(history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } else {
      setStudentFeeHistory([]);
    }
  }, [selectedStudent, allFees]);

  const filteredStudents = (searchQuery || selectedGrade)
    ? students.filter(s => {
        const searchLow = searchQuery.toLowerCase().trim();
        const matchesSearch = searchQuery 
          ? s.name?.toLowerCase().includes(searchLow) || 
            s.student_id?.toString().toLowerCase().includes(searchLow) ||
            s.id?.toString().toLowerCase().includes(searchLow) ||
            s.rollNo?.toString().toLowerCase().includes(searchLow)
          : true;
        const matchesGrade = selectedGrade 
          ? s.grade?.toString().trim().toLowerCase() === selectedGrade.toString().trim().toLowerCase() 
          : true;
        return matchesSearch && matchesGrade;
      }).sort((a, b) => {
        if (a.grade !== b.grade) {
          return (a.grade || "").localeCompare(b.grade || "");
        }
        return (a.name || "").localeCompare(b.name || "");
      })
    : [];

  const handleSelectStudent = (student: any) => {
    setSelectedStudent(student);
    
    // Default to Tuition fee for the selected grade
    const classData = classes.find(c => c.name === student.grade);
    const tuitionAmount = classData ? parseInt(classData.monthlyTuitionFees.toString().replace(/\D/g, '')) : 1500;
    
    const items: any[] = [{
      id: 'tuition',
      type: 'Monthly Tuition',
      label: 'Monthly Tuition',
      amount: tuitionAmount
    }];

    // Also auto-add subjects student is enrolled in (Main or Sub)
    if (student.subjects && student.subjects.length > 0) {
      student.subjects.forEach((subName: string) => {
        const subData = subjects.find(s => s.name === subName);
        if (subData) {
          // Check if it's already added as tuition (usually not, but good to be safe)
          if (!items.find(i => i.itemName === subName)) {
            items.push({
              id: `sub-${subName}-${Date.now()}`,
              type: 'Subject Fee',
              label: subName,
              itemName: subName,
              amount: parseInt(subData.fee) || 0,
              category: subData.category
            });
          }
        }
      });
    }
    
    setSelectedItems(items);
  };

  useEffect(() => {
    if (!isManualAmount) {
      const total = selectedItems.reduce((sum, item) => sum + (parseInt(item.amount) || 0), 0);
      setTotalAmount(total);
    }
  }, [selectedItems, isManualAmount]);

  const toggleItem = (itemType: string, itemName: string, amount: number, isSubject: boolean, category?: string) => {
    setIsManualAmount(false); // Reset manual override when changing selection
    if (isSubject) {
      setSelectedItems(prev => {
        const exists = prev.find(i => i.itemName === itemName && i.type === 'Subject Fee');
        if (exists) {
          return prev.filter(i => !(i.itemName === itemName && i.type === 'Subject Fee'));
        } else {
          return [...prev, {
            id: Date.now() + Math.random().toString(),
            type: 'Subject Fee',
            label: itemName,
            itemName: itemName,
            amount: amount,
            category: category
          }];
        }
      });
    } else if (itemType === 'Monthly Tuition') {
      setSelectedItems(prev => {
        const exists = prev.find(i => i.type === 'Monthly Tuition');
        if (exists) {
          return prev.filter(i => i.type !== 'Monthly Tuition');
        } else {
          const classData = classes.find(c => c.name === selectedStudent?.grade);
          const tuitionAmount = classData ? parseInt(classData.monthlyTuitionFees.toString().replace(/\D/g, '')) : 1500;
          return [...prev, {
            id: 'tuition',
            type: 'Monthly Tuition',
            label: 'Monthly Tuition',
            amount: tuitionAmount
          }];
        }
      });
    }
  };

  const addCustomItem = () => {
    if (!customItem.name || !customItem.amount) return;
    
    setSelectedItems(prev => [...prev, {
      id: `custom-${Date.now()}`,
      type: 'Other',
      label: customItem.name,
      itemName: customItem.name,
      amount: parseInt(customItem.amount) || 0,
      category: 'Other'
    }]);
    
    setCustomItem({ name: "", amount: "" });
    setShowCustomForm(false);
    setIsManualAmount(false);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStudent || selectedItems.length === 0 || !paymentData.date || !paymentData.month) {
      alert("Please select at least one item and fill in all required fields.");
      return;
    }

    if (paymentData.method === "Online") {
      setShowPaymentGateway(true);
    } else {
      await processPayment();
    }
  };

  const processPayment = async (transactionId?: string) => {
    try {
      const existingFees = await getFees() || [];
      const batchId = `BATCH-${Date.now()}`;
      const txnIdBase = transactionId || `TXN-${Math.floor(Math.random() * 1000000)}`;
      
      // Calculate proportions if amount was manually changed
      const calculatedTotal = selectedItems.reduce((sum, item) => sum + (parseInt(item.amount) || 0), 0);
      const adjustmentRatio = calculatedTotal > 0 ? totalAmount / calculatedTotal : 1;

      const newFeeRecords = selectedItems.map((item, idx) => {
        let finalAmount = parseInt(item.amount) || 0;
        if (isManualAmount) {
          if (idx === selectedItems.length - 1) {
            // Last item gets the remainder to ensure exact total match
            const otherItemsTotal = selectedItems.slice(0, -1).reduce((sum, it) => sum + Math.round((parseInt(it.amount) || 0) * adjustmentRatio), 0);
            finalAmount = totalAmount - otherItemsTotal;
          } else {
            finalAmount = Math.round(finalAmount * adjustmentRatio);
          }
        }

        return {
          id: `${Date.now()}-${idx}`,
          studentId: selectedStudent.student_id || selectedStudent.id,
          studentName: selectedStudent.name,
          grade: selectedStudent.grade,
          month: item.type === 'Monthly Tuition' ? paymentData.month : "",
          amount: finalAmount.toString(),
          method: paymentData.method,
          date: paymentData.date,
          type: item.type,
          itemName: item.itemName || "",
          transactionId: selectedItems.length > 1 ? `${txnIdBase}-${idx + 1}` : txnIdBase,
          batchId: batchId,
          timestamp: new Date().toISOString()
        };
      });

      const updatedFees = [...existingFees, ...newFeeRecords];
      await saveFees(updatedFees);
      setAllFees(updatedFees);

      // Unblock zoom access automatically when fee is paid
      const studentsList = await getStudents();
      const updatedStudents = studentsList.map((s: any) => 
        (s.id === selectedStudent.id || s.student_id === selectedStudent.student_id)
          ? { ...s, zoomBlocked: false } 
          : s
      );
      await saveStudents(updatedStudents);

      setReceiptData({
        ...newFeeRecords[0],
        items: selectedItems,
        totalAmount: totalAmount,
        transactionId: txnIdBase
      });
      setShowReceipt(true);
      
      // Reset form
      setSelectedItems([]);
      setPaymentData({
        method: "Cash",
        date: new Date().toISOString().split('T')[0],
        month: new Date().toISOString().slice(0, 7),
      });
      
    } catch (error) {
      console.error("Error saving fee:", error);
      alert("An error occurred while saving the payment. Please try again.");
    }
  };

  const handleMockPayment = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      setIsProcessingPayment(false);
      setShowPaymentGateway(false);
      const mockTxnId = `ONL-${Math.floor(Math.random() * 100000000)}`;
      processPayment(mockTxnId);
    }, 2000);
  };

  const handleEditFee = (fee: any) => {
    setEditingFeeId(fee.id);
    setPaymentData({
      method: fee.method,
      date: fee.date,
      month: fee.month || new Date().toISOString().slice(0, 7),
    });
    
    setSelectedItems([{
      id: fee.id,
      type: fee.type || 'Monthly Tuition',
      label: fee.type === 'Subject Fee' ? fee.itemName : fee.type,
      itemName: fee.itemName,
      amount: parseInt(fee.amount) || 0
    }]);
  };

  const handleLoadReceipt = (fee: any) => {
    setReceiptData(fee);
    setShowReceipt(true);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Collect Fee</h1>
      
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Column: Search & Select Student */}
        <div className="w-full lg:w-1/3">
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 h-fit">
            <h2 className="font-bold text-gray-700 mb-4 pb-2 border-b border-gray-100">1. Select Student</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Grade</label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All Grades</option>
                {classes.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
              <input 
                type="text" 
                placeholder="Search by Name or ID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {(searchQuery || selectedGrade) && (
              <div className="border border-gray-200 rounded-md max-h-80 overflow-y-auto bg-white shadow-sm mb-4">
                {filteredStudents.length > 0 ? (
                  <ul className="divide-y divide-gray-100">
                    {filteredStudents.map(student => (
                      <li 
                        key={student.id} 
                        onClick={() => handleSelectStudent(student)}
                        className={`p-3 hover:bg-blue-50 cursor-pointer transition-colors flex flex-col ${selectedStudent?.id === student.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                      >
                        <span className="font-medium text-gray-800">{student.name}</span>
                        <span className="text-xs text-gray-500">Roll No: {student.rollNo || "N/A"} | ID: {student.student_id || student.id} | Class: {student.grade}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4 text-center text-sm text-gray-500">No students found</div>
                )}
              </div>
            )}

            {/* Currently Selected Student Card (Small) */}
            {selectedStudent ? (
              <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg p-4 relative">
                <button 
                  onClick={() => setSelectedStudent(null)}
                  className="absolute top-2 right-2 text-blue-400 hover:text-blue-600 text-xs font-medium"
                >
                  Change
                </button>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                    {selectedStudent.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 leading-tight">{selectedStudent.name}</h3>
                    <p className="text-xs text-gray-500">Roll No: {selectedStudent.rollNo || "N/A"}</p>
                    <p className="text-xs text-gray-500">ID: {selectedStudent.student_id || selectedStudent.id}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 border-2 border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-400">
                <User size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Search and select a student to proceed with payment</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Payment Form */}
        <div className="w-full lg:w-2/3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-full">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h2 className="font-bold text-gray-700">2. Payment Details</h2>
            </div>
            
            <div className="p-6">
              {!selectedStudent ? (
                <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-gray-400">
                  <CreditCard size={48} className="mb-4 opacity-30" />
                  <p className="text-lg font-medium text-gray-500">No Student Selected</p>
                  <p className="text-sm mt-1">Please select a student from the left panel first.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmitPayment}>
                  {/* Student Info Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-3">
                      <User size={20} className="text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold">Student Name</p>
                        <p className="font-medium text-gray-800">{selectedStudent.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <BookOpen size={20} className="text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold">Class</p>
                        <p className="font-medium text-gray-800">{selectedStudent.grade}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <DollarSign size={20} className={studentFeeHistory.length > 0 ? "text-green-500" : "text-gray-400"} />
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold">Last Paid Month</p>
                        <p className={`font-bold ${studentFeeHistory.length > 0 ? "text-green-600" : "text-gray-500"}`}>
                          {studentFeeHistory.length > 0 ? studentFeeHistory[0].month : "No Records"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="md:col-span-2 space-y-6">
                       <div>
                         <label className="block text-xs font-black text-blue-500 uppercase tracking-widest mb-3 border-l-4 border-blue-500 pl-2">Main Subjects & Tuition</label>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                           {/* Monthly Tuition Checkbox */}
                           <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedItems.find(i => i.type === 'Monthly Tuition') ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                             <input 
                               type="checkbox"
                               checked={!!selectedItems.find(i => i.type === 'Monthly Tuition')}
                               onChange={() => toggleItem('Monthly Tuition', '', 0, false)}
                               className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                             />
                             <div className="flex-1">
                               <p className="text-sm font-bold text-gray-800">Monthly Tuition</p>
                               <div className="flex items-center gap-2 mt-1">
                                 <input 
                                   type="month" 
                                   value={paymentData.month}
                                   onClick={(e) => e.stopPropagation()}
                                   onChange={(e) => {
                                     e.stopPropagation();
                                     setPaymentData({...paymentData, month: e.target.value});
                                   }}
                                   className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                 />
                               </div>
                             </div>
                             <p className="font-bold text-blue-600">LKR {classes.find(c => c.name === selectedStudent?.grade)?.monthlyTuitionFees || 1500}</p>
                           </label>

                           {/* Main Subjects Checkboxes */}
                           {subjects.filter(s => s.category === "Main").map((sub) => {
                             const isSelected = !!selectedItems.find(i => i.itemName === sub.name && i.type === 'Subject Fee');
                             return (
                               <label key={sub.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                                 <input 
                                   type="checkbox"
                                   checked={isSelected}
                                   onChange={() => toggleItem('Subject Fee', sub.name, parseInt(sub.fee) || 0, true, 'Main')}
                                   className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                 />
                                 <div className="flex-1">
                                   <p className="text-sm font-bold text-gray-800">{sub.name}</p>
                                   <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Main Subject</p>
                                 </div>
                                 <p className="font-bold text-blue-600">LKR {sub.fee || 0}</p>
                               </label>
                             );
                           })}
                         </div>
                       </div>

                       <div>
                         <label className="block text-xs font-black text-pink-500 uppercase tracking-widest mb-3 border-l-4 border-pink-500 pl-2">Sub Subjects (Extra Classes)</label>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                           {/* Sub Subjects Checkboxes */}
                           {subjects.filter(s => s.category === "Sub").map((sub) => {
                             const isSelected = !!selectedItems.find(i => i.itemName === sub.name && i.type === 'Subject Fee');
                             return (
                               <label key={sub.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-pink-50 border-pink-200 shadow-sm' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                                 <input 
                                   type="checkbox"
                                   checked={isSelected}
                                   onChange={() => toggleItem('Subject Fee', sub.name, parseInt(sub.fee) || 0, true, 'Sub')}
                                   className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                                 />
                                 <div className="flex-1">
                                   <p className="text-sm font-bold text-gray-800">{sub.name}</p>
                                   <p className="text-[10px] font-bold uppercase tracking-widest text-pink-500">Sub Subject</p>
                                 </div>
                                 <p className="font-bold text-pink-600">LKR {sub.fee || 0}</p>
                               </label>
                             );
                           })}
                         </div>
                       </div>

                       {/* Custom Item Form */}
                       <div className="border-t border-dashed border-gray-200 pt-4 mt-2">
                         {!showCustomForm ? (
                           <button 
                             type="button"
                             onClick={() => setShowCustomForm(true)}
                             className="text-[10px] font-black text-blue-500 hover:text-blue-700 uppercase tracking-widest flex items-center gap-1 transition-colors group"
                           >
                             <Plus size={14} className="group-hover:rotate-90 transition-transform" /> Add Manual Extra Class Fee (e.g. வினா விடை வகுப்பு)
                           </button>
                         ) : (
                           <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 shadow-sm space-y-3">
                             <div className="flex justify-between items-center">
                               <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Add Manual Special Fee</h4>
                               <p className="text-[9px] text-blue-400 font-bold italic">Ex: 30-Day Course / Q&A Class</p>
                             </div>
                             <div className="grid grid-cols-2 gap-3">
                               <input 
                                 type="text"
                                 placeholder="Fee Name (e.g. 30 நாள் பாடநெறி)"
                                 value={customItem.name}
                                 onChange={(e) => setCustomItem({ ...customItem, name: e.target.value })}
                                 className="border border-blue-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none bg-white font-medium"
                               />
                               <div className="relative">
                                 <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">LKR</span>
                                 <input 
                                   type="number"
                                   placeholder="Amount"
                                   value={customItem.amount}
                                   onChange={(e) => setCustomItem({ ...customItem, amount: e.target.value })}
                                   className="w-full border border-blue-200 rounded pl-10 pr-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none bg-white font-bold"
                                 />
                               </div>
                             </div>
                             <div className="flex gap-2">
                               <button 
                                 type="button"
                                 onClick={addCustomItem}
                                 disabled={!customItem.name || !customItem.amount}
                                 className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                               >
                                 Add to List
                               </button>
                               <button 
                                 type="button"
                                 onClick={() => {
                                   setShowCustomForm(false);
                                   setCustomItem({ name: "", amount: "" });
                                 }}
                                 className="text-gray-500 text-[10px] font-black uppercase tracking-widest px-4 py-2 hover:text-gray-700"
                               >
                                 Cancel
                               </button>
                             </div>
                           </div>
                         )}
                       </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount Selected</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <span className="text-gray-500 font-medium font-bold">LKR</span>
                        </div>
                        <input 
                          type="number" 
                          value={totalAmount}
                          onChange={(e) => {
                            setTotalAmount(parseInt(e.target.value) || 0);
                            setIsManualAmount(true);
                          }}
                          className="w-full pl-12 pr-4 py-2.5 border border-blue-300 bg-white rounded-md font-black text-blue-700 text-xl focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 font-medium italic">* You can manually adjust the total if needed</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method <span className="text-red-500">*</span></label>
                      <select 
                        value={paymentData.method}
                        onChange={(e) => setPaymentData({...paymentData, method: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-4 py-2.5 focus:ring-blue-500 focus:border-blue-500 bg-white transition-shadow"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Online">Online (Card/UPI)</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Calendar size={18} className="text-gray-400" />
                        </div>
                        <input 
                          type="date" 
                          required
                          value={paymentData.date}
                          onChange={(e) => setPaymentData({...paymentData, date: e.target.value})}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                        />
                      </div>
                    </div>
                  </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
                    <button 
                      type="submit" 
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-md shadow-sm transition-colors flex items-center gap-2"
                    >
                      <CreditCard size={20} />
                      {paymentData.method === "Online" && !editingFeeId ? "Pay Online" : editingFeeId ? "Update Payment" : "Submit Payment"}
                    </button>
                    {editingFeeId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFeeId(null);
                          setPaymentData({
                            amount: "",
                            method: "Cash",
                            date: new Date().toISOString().split('T')[0],
                            month: new Date().toISOString().slice(0, 7)
                          });
                        }}
                        className="ml-3 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-md shadow-sm transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>

            {/* Fee History Section */}
            {selectedStudent && (
              <div className="p-6 border-t border-gray-200">
                <h3 className="font-bold text-gray-700 mb-4">Payment History</h3>
                {studentFeeHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {studentFeeHistory.map((fee, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">{fee.month}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">{fee.date}</td>
                            <td className="px-4 py-2 text-sm font-medium text-green-600">LKR {fee.amount}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">{fee.method}</td>
                            <td className="px-4 py-2 text-sm text-right space-x-2">
                              <button onClick={() => handleEditFee(fee)} className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                              <button onClick={() => handleLoadReceipt(fee)} className="text-indigo-600 hover:text-indigo-800 font-medium ml-2">Receipt</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 text-sm border border-dashed border-gray-200 rounded-lg">
                    No payment history found for this student.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mock Payment Gateway Modal */}
      {showPaymentGateway && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white text-center">
              <h3 className="text-2xl font-bold mb-1">Secure Payment</h3>
              <p className="text-blue-100 opacity-90">Agaram Dhines Academy</p>
            </div>
            <div className="p-6">
              <div className="flex justify-between mb-6 pb-4 border-b border-gray-100">
                <span className="text-gray-600">Amount to Pay</span>
                <span className="text-2xl font-bold text-gray-800">LKR {totalAmount}</span>
              </div>
              
              {isProcessingPayment ? (
                <div className="py-8 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-600 font-medium">Processing Payment...</p>
                  <p className="text-sm text-gray-400 mt-2">Please do not close this window</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    <div className="p-4 border border-blue-500 bg-blue-50 rounded-lg flex items-center gap-3 cursor-pointer">
                      <CreditCard className="text-blue-600" />
                      <div className="flex-1">
                        <p className="font-medium text-blue-900">Credit / Debit Card</p>
                        <p className="text-xs text-blue-600">Pay securely with your card</p>
                      </div>
                      <div className="w-4 h-4 rounded-full border-4 border-blue-600 bg-white"></div>
                    </div>
                    <div className="p-4 border border-gray-200 hover:border-blue-300 rounded-lg flex items-center gap-3 cursor-pointer transition-colors">
                      <div className="w-6 h-6 bg-gray-200 rounded-sm flex items-center justify-center text-xs font-bold text-gray-500">UPI</div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-700">UPI / QR</p>
                        <p className="text-xs text-gray-500">GPay, PhonePe, Paytm</p>
                      </div>
                      <div className="w-4 h-4 rounded-full border border-gray-300"></div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setShowPaymentGateway(false)}
                      className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleMockPayment}
                      className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
                    >
                      Pay LKR {totalAmount}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && receiptData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div id="receipt-content" className="p-8 bg-white overflow-y-auto">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Payment Successful</h2>
                <p className="text-gray-500">Thank you for your payment</p>
              </div>
              
              <div className="border-t border-b border-gray-100 py-4 mb-6 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Receipt No</span>
                  <span className="font-medium text-gray-800">{receiptData.transactionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span className="font-medium text-gray-800">{receiptData.date}</span>
                </div>
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Paid Items</span>
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                    {receiptData.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-2 text-xs bg-gray-50">
                        <span className="font-bold text-gray-700">{item.label} {item.type === 'Monthly Tuition' ? `(${receiptData.month})` : ''}</span>
                        <span className="font-black text-blue-600">LKR {item.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment Method</span>
                  <span className="font-medium text-gray-800">{receiptData.method}</span>
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Student Details</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-bold text-gray-800">{receiptData.studentName}</p>
                  <p className="text-sm text-gray-600">ID: {receiptData.studentId}</p>
                  <p className="text-sm text-gray-600">Class: {receiptData.grade}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                <span className="font-bold text-blue-900">Amount Paid</span>
                <span className="text-2xl font-black text-blue-700">LKR {receiptData.totalAmount || receiptData.amount}</span>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-3">
              <button 
                onClick={() => {
                  setShowReceipt(false);
                  setSelectedStudent(null);
                }}
                className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-white transition-colors"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  const content = document.getElementById('receipt-content');
                  
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
                          <title>Fee Receipt - ${receiptData.studentName}</title>
                          <style>
                            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                            body { font-family: 'Inter', sans-serif; padding: 0; margin: 0; color: #1a1a1a; background: #fff; }
                            .receipt { max-width: 800px; margin: 0 auto; padding: 40px; position: relative; border: 1px solid #eee; }
                            
                            .paid-banner {
                              position: absolute;
                              top: 20px;
                              right: -30px;
                              background: #ef008c;
                              color: white;
                              padding: 5px 60px;
                              transform: rotate(45deg);
                              font-weight: 900;
                              text-transform: uppercase;
                              letter-spacing: 2px;
                              font-size: 14px;
                              box-shadow: 0 2px 10px rgba(239, 0, 140, 0.3);
                            }

                            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #f8f8f8; padding-bottom: 30px; }
                            .logo-placeholder { 
                              width: 80px; 
                              height: 80px; 
                              background: #fff; 
                              border-radius: 50%; 
                              margin: 0 auto 15px;
                              display: flex;
                              align-items: center;
                              justify-content: center;
                              border: 4px solid #f0f0f0;
                              overflow: hidden;
                            }
                            .logo-placeholder img { width: 100%; height: 100%; object-fit: cover; }
                            
                            .academy-name { font-size: 28px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: -0.5px; }
                            .slogan { font-size: 12px; color: #ef008c; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; margin-top: 5px; }
                            
                            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px; padding: 0 10px; }
                            .info-label { font-size: 11px; font-weight: 900; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; margin-bottom: 5px; }
                            .info-value { font-size: 15px; font-weight: 700; color: #1e293b; }
                            
                            .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                            .table th { text-align: left; background: #f8fafc; padding: 12px 15px; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #64748b; letter-spacing: 1px; border-top: 1px solid #f1f5f9; }
                            .table td { padding: 15px; border-bottom: 1px solid #f1f5f9; }
                            .item-name { font-weight: 700; font-size: 14px; color: #334155; }
                            .item-desc { font-size: 11px; color: #94a3b8; font-style: italic; margin-top: 2px; }
                            .item-amount { font-weight: 900; font-size: 14px; color: #0f172a; text-align: right; }
                            
                            .totals-container { margin-left: auto; width: 300px; padding: 0 10px; }
                            .total-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; }
                            .total-label { font-size: 12px; font-weight: 900; text-transform: uppercase; color: #94a3b8; }
                            .total-value-sub { font-size: 14px; font-weight: 900; color: #334155; }
                            
                            .grand-total { 
                              background: #ef008c; 
                              color: white; 
                              padding: 15px 20px; 
                              border-radius: 12px; 
                              margin-top: 15px;
                              box-shadow: 0 10px 15px -3px rgba(239, 0, 140, 0.3);
                            }
                            .grand-total .total-label { color: #fff; opacity: 0.8; }
                            .grand-total .total-value { font-size: 22px; font-weight: 900; }
                            
                            .footer { border-top: 1px dashed #e2e8f0; margin-top: 60px; padding-top: 30px; text-align: center; }
                            .footer-icon { color: #ef008c; font-size: 20px; margin-bottom: 15px; display: block; }
                            .footer-note { font-size: 10px; font-weight: 900; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; margin-bottom: 10px; }
                            .thanks { font-size: 14px; font-weight: 800; color: #1e293b; margin-top: 5px; }

                            @media print {
                              .receipt { border: none; padding: 0; }
                              .paid-banner { -webkit-print-color-adjust: exact; }
                              .grand-total { -webkit-print-color-adjust: exact; background-color: #ef008c !important; color: white !important; }
                            }
                          </style>
                        </head>
                        <body>
                          <div class="receipt">
                            <div class="paid-banner">PAID</div>
                            
                            <div class="header">
                              <div class="logo-placeholder">
                                <img src="https://firebasestorage.googleapis.com/v0/b/ais-dev-rclyuuaiyzobly4teokhoa.appspot.com/o/admin%2Flogo.png?alt=media" onerror="this.src='https://ui-avatars.com/api/?name=AD&background=ef008c&color=fff'" />
                              </div>
                              <div class="academy-name">AGARAM DHINES ONLINE ACADEMY</div>
                              <div class="slogan">EXCELLENCE IN DIGITAL LEARNING</div>
                            </div>
                            
                            <div class="info-grid">
                              <div>
                                <div class="info-label">INVOICED TO</div>
                                <div class="info-value">${receiptData.studentName}</div>
                                <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                                  ID: ${receiptData.studentId}<br>
                                  Class: ${receiptData.grade}
                                </div>
                              </div>
                              <div style="text-align: right;">
                                <div class="info-label">RECEIPT INFO</div>
                                <div class="info-value">Date: ${receiptData.date}</div>
                                <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                                  Receipt No: ${receiptData.transactionId}<br>
                                  Method: ${receiptData.method}
                                </div>
                              </div>
                            </div>
                            
                            <table class="table">
                              <thead>
                                <tr>
                                  <th>DESCRIPTION</th>
                                  <th style="text-align: right;">AMOUNT</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${receiptData.items?.map((item: any) => `
                                  <tr>
                                    <td>
                                      <div class="item-name">${item.label.toUpperCase()}</div>
                                      <div class="item-desc">${item.type === 'Monthly Tuition' ? receiptData.month : (item.category === 'Main' ? 'Main Subject Fee' : 'Sub Subject Special Fee')}</div>
                                    </td>
                                    <td class="item-amount">LKR ${item.amount}.00</td>
                                  </tr>
                                `).join('')}
                              </tbody>
                            </table>
                            
                            <div class="totals-container">
                              <div class="total-row">
                                <span class="total-label">SUB TOTAL</span>
                                <span class="total-value-sub">LKR ${receiptData.totalAmount || receiptData.amount}.00</span>
                              </div>
                              <div class="total-row grand-total">
                                <span class="total-label">TOTAL PAID</span>
                                <span class="total-value">LKR ${receiptData.totalAmount || receiptData.amount}</span>
                              </div>
                            </div>
                            
                            <div class="footer">
                              <span class="footer-icon">✓</span>
                              <div class="footer-note">GENERATED VIA AGARAM ACADEMY PORTAL</div>
                              <div class="thanks">THANK YOU FOR YOUR PAYMENT</div>
                              <div style="font-size: 10px; color: #94a3b8; margin-top: 15px; font-weight: bold;">
                                excellence in digital learning • www.agaramdhines.lk
                              </div>
                            </div>
                          </div>
                        </body>
                      </html>
                    `);
                    printDoc.close();
                    setTimeout(() => {
                      printIframe.contentWindow?.focus();
                      printIframe.contentWindow?.print();
                    }, 500);
                  } else if (!printDoc) {
                    alert('Unable to print. Please check your security settings.');
                  }
                }}
                className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Printer size={18} />
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
