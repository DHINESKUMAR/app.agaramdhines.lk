import React, { useState, useEffect, useMemo } from "react";
import { getStudents, saveStudents, getFees, saveFees, getClasses, getAdminSettings, getSubjects } from "../../lib/db";
import { Search, Calendar, CreditCard, User, BookOpen, DollarSign, CheckCircle, Printer, Download, Copy, FileText, Image as ImageIcon, Share2, Plus, Trash2 } from "lucide-react";
import { toPng, toBlob } from 'html-to-image';
import jsPDF from 'jspdf';

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
  const [isUnpaidReceipt, setIsUnpaidReceipt] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDeleteFee = async (fee: any) => {
    if (!window.confirm("இந்த கட்டண விபரத்தை நிச்சயமாக நீக்க வேண்டுமா?")) return;
    
    // Determine what to delete (batch or single)
    const idToDelete = fee.batchId || fee.id;
    setIsDeleting(idToDelete);
    
    try {
      let updatedFees;
      if (fee.batchId) {
        updatedFees = allFees.filter(f => f.batchId !== fee.batchId);
      } else {
        updatedFees = allFees.filter(f => f.id !== fee.id);
      }
      
      await saveFees(updatedFees);
      setAllFees(updatedFees);
      alert("கட்டண விபரம் நீக்கப்பட்டது.");
    } catch (error: any) {
      alert("பிழை: " + error.message);
    } finally {
      setIsDeleting(null);
    }
  };

  useEffect(() => {
    if (selectedStudent) {
      const history = allFees.filter(f => f.studentId === selectedStudent.id || f.studentId === selectedStudent.student_id);
      setStudentFeeHistory(history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } else {
      setStudentFeeHistory([]);
    }
  }, [selectedStudent, allFees]);

  const filteredStudents = useMemo(() => {
    if (!(searchQuery || selectedGrade)) return [];
    
    return students.filter(s => {
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
      });
  }, [students, searchQuery, selectedGrade]);

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
          rollNo: selectedStudent.rollNo || "",
          month: (item.type === 'Monthly Tuition' || item.type === 'Subject Fee' || item.category === 'Main') ? paymentData.month : "",
          amount: finalAmount.toString(),
          method: paymentData.method,
          date: paymentData.date,
          type: item.type,
          category: item.category || "",
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

  const groupFeesByBatch = (fees: any[]) => {
    const groups: { [key: string]: any } = {};
    
    fees.forEach(fee => {
      // Prioritize batchId, then transactionId base (for manual/older records), then standard txn id
      let id = fee.batchId;
      if (!id && fee.transactionId) {
        // Extract base ID if it includes sequence suffix like -1, -2
        id = fee.transactionId.split('-')[0] + '-' + fee.transactionId.split('-')[1];
        if (fee.transactionId.split('-').length < 2) id = fee.transactionId;
      }
      if (!id) id = fee.id;

      if (!groups[id]) {
        groups[id] = {
          ...fee,
          totalAmount: parseInt(fee.amount) || 0,
          items: [{ label: (fee.itemName || fee.type), amount: parseInt(fee.amount) || 0, type: fee.type, itemName: fee.itemName, category: fee.category }],
          displayType: fee.type,
          displayMonth: fee.month
        };
      } else {
        groups[id].totalAmount += (parseInt(fee.amount) || 0);
        groups[id].items.push({ label: (fee.itemName || fee.type), amount: parseInt(fee.amount) || 0, type: fee.type, itemName: fee.itemName, category: fee.category });
        if (fee.type === 'Monthly Tuition') {
          groups[id].displayMonth = fee.month;
        }
      }
    });
    
    return Object.values(groups).sort((a: any, b: any) => new Date(b.timestamp || b.date).getTime() - new Date(a.timestamp || a.date).getTime());
  };

  const handleEditFee = (fee: any) => {
    // If it's a grouped fee, we typically only edit one record for now
    // but the UI currently expects a single record format
    const sourceFee = fee.items ? fee : fee;
    setEditingFeeId(sourceFee.id);
    setPaymentData({
      method: sourceFee.method,
      date: sourceFee.date,
      month: sourceFee.month || new Date().toISOString().slice(0, 7),
    });
    
    setSelectedItems(sourceFee.items ? sourceFee.items.map((it: any) => ({
      id: Date.now() + Math.random().toString(),
      type: it.type,
      label: it.label,
      itemName: it.itemName,
      amount: it.amount,
      category: it.category
    })) : [{
      id: sourceFee.id,
      type: sourceFee.type || 'Monthly Tuition',
      label: sourceFee.type === 'Subject Fee' ? sourceFee.itemName : sourceFee.type,
      itemName: sourceFee.itemName,
      amount: parseInt(sourceFee.amount) || 0
    }]);
  };

  const handleLoadReceipt = (fee: any) => {
    setIsUnpaidReceipt(false);
    if (fee.items) {
      setReceiptData({
        ...fee,
        amount: fee.totalAmount,
        totalAmount: fee.totalAmount,
        transactionId: fee.transactionId?.split('-')[0] + '-' + fee.transactionId?.split('-')[1] || fee.transactionId
      });
    } else {
      setReceiptData({
        ...fee,
        items: [{ label: fee.itemName || fee.type, amount: parseInt(fee.amount) || 0, type: fee.type, itemName: fee.itemName }],
        totalAmount: parseInt(fee.amount) || 0
      });
    }
    setShowReceipt(true);
  };

  const handlePreviewUnpaid = () => {
    if (!selectedStudent || selectedItems.length === 0) {
      alert("Please select a student and at least one item to preview the invoice.");
      return;
    }
    
    setIsUnpaidReceipt(true);
    setReceiptData({
      studentId: selectedStudent.student_id || selectedStudent.id,
      studentName: selectedStudent.name,
      grade: selectedStudent.grade,
      rollNo: selectedStudent.rollNo || "",
      month: paymentData.month,
      date: paymentData.date,
      items: selectedItems,
      totalAmount: totalAmount,
      transactionId: "PREVIEW-INVOICE"
    });
    setShowReceipt(true);
  };

  const downloadAsImage = async () => {
    const node = document.getElementById('receipt-download-version');
    if (!node) return;
    try {
      const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `Receipt-${receiptData.studentName}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('oops, something went wrong!', err);
    }
  };

  const copyAsImage = async () => {
    const node = document.getElementById('receipt-download-version');
    if (!node) return;
    try {
      const blob = await toBlob(node, { pixelRatio: 2, backgroundColor: '#ffffff' });
      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        alert("Image copied to clipboard!");
      }
    } catch (err) {
      console.error('Copy failed', err);
      alert("Failed to copy image to clipboard. Try downloading instead.");
    }
  };

  const downloadAsPDF = async () => {
    const node = document.getElementById('receipt-download-version');
    if (!node) return;
    try {
      const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: '#ffffff' });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Receipt-${receiptData.studentName}-${Date.now()}.pdf`);
    } catch (err) {
      console.error('PDF creation failed', err);
    }
  };

  const groupedHistory = useMemo(() => groupFeesByBatch(studentFeeHistory), [studentFeeHistory]);

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
                placeholder="Search by Name or Roll No..." 
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
                        <span className="text-xs text-gray-500">Roll No: {student.rollNo || "N/A"} | Class: {student.grade}</span>
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

          <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-3 justify-end">
                    <button 
                      type="button"
                      onClick={handlePreviewUnpaid}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-md shadow-sm transition-colors flex items-center gap-2"
                    >
                      <Share2 size={18} />
                      Unpaid Preview
                    </button>
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
                        {groupedHistory.map((fee: any, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-4 text-sm font-bold text-gray-900">{fee.displayMonth || "-"}</td>
                            <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">{fee.date}</td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-black text-green-600">LKR {fee.totalAmount}</span>
                                <span className="text-[10px] text-gray-400 font-medium max-w-[200px] line-clamp-1">
                                  {fee.items.map((i: any) => i.label).join(", ")}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-500">
                              <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-bold uppercase tracking-tight">{fee.method}</span>
                            </td>
                            <td className="px-4 py-4 text-sm text-right space-x-3 whitespace-nowrap">
                              <button onClick={() => handleEditFee(fee)} className="text-blue-600 hover:text-blue-800 font-bold uppercase text-[10px] tracking-widest">Edit</button>
                              <button onClick={() => handleLoadReceipt(fee)} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md hover:bg-blue-100 font-black uppercase text-[10px] tracking-widest transition-colors mr-2">Receipt</button>
                              <button 
                                onClick={() => handleDeleteFee(fee)} 
                                disabled={isDeleting === (fee.batchId || fee.id)}
                                className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
                                title="Delete Record"
                              >
                                <Trash2 size={16} />
                              </button>
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col my-auto relative">
            <button 
              onClick={() => setShowReceipt(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
            >
              <div className="bg-gray-100 p-1 rounded-full"><Plus className="rotate-45" size={20} /></div>
            </button>

            <div className="flex flex-col md:flex-row h-full">
              {/* Left Side: Preview */}
              <div className="flex-1 p-6 bg-gray-50 border-r border-gray-100 overflow-y-auto max-h-[80vh]">
                <div id="receipt-download-version" className="bg-white shadow-lg mx-auto p-8 rounded-sm relative overflow-hidden" style={{ width: '450px', minHeight: '600px' }}>
                  {/* Watermark/Banner */}
                  <div className={`absolute top-6 right-[-35px] rotate-45 text-white font-black text-[10px] uppercase tracking-widest px-10 py-1 shadow-md z-20 ${isUnpaidReceipt ? 'bg-red-600' : 'bg-green-600'}`}>
                    {isUnpaidReceipt ? 'UNPAID / INVOICE' : 'OFFICIAL RECEIPT'}
                  </div>

                  <div className="text-center mb-6 pt-4">
                    <img 
                      src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSUXk2g5YJOQDHiOYn-CwQrBzvNqPuok_bdUA&s" 
                      alt="Logo" 
                      className="w-16 h-16 mx-auto mb-2 object-contain"
                    />
                    <h2 className="text-sm font-black text-gray-800 uppercase tracking-tight">AGARAM DHINES ONLINE ACADEMY</h2>
                    <p className="text-[9px] font-bold text-pink-600 uppercase tracking-[3px] mt-1 italic">excellence in digital learning</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6 border-y border-gray-100 py-4">
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 font-bold">Invoiced To:</p>
                      <p className="text-sm font-black text-gray-800">{receiptData.studentName}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">Roll No: {receiptData.rollNo || "N/A"}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">Class: {receiptData.grade}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 font-bold">Details:</p>
                      <p className="text-[10px] text-gray-800 font-bold uppercase">No: {receiptData.transactionId}</p>
                      <p className="text-[10px] text-gray-800 font-bold uppercase">Date: {receiptData.date}</p>
                      {!isUnpaidReceipt && <p className="text-[10px] text-gray-800 font-bold uppercase">Via: {receiptData.method}</p>}
                    </div>
                  </div>

                  <table className="w-full text-left mb-6">
                    <thead>
                      <tr className="border-b-2 border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <th className="pb-2">Description</th>
                        <th className="pb-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {receiptData.items?.map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-3">
                            <p className="text-xs font-black text-gray-800 uppercase">{item.label}</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight italic">
                              {item.type === 'Monthly Tuition' ? receiptData.month : (item.category === 'Main' ? 'Main Subject Fee' : 'Sub Subject Special Fee')}
                            </p>
                          </td>
                          <td className="py-3 text-right text-xs font-black text-gray-800">LKR {item.amount}.00</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="space-y-2 border-t-2 border-gray-100 pt-4 mb-10">
                    <div className="flex justify-between items-center px-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-bold">Sub Total</span>
                      <span className="text-xs font-black text-gray-600">LKR {receiptData.totalAmount || receiptData.amount}.00</span>
                    </div>
                    <div className={`flex justify-between items-center p-3 rounded-xl shadow-lg border ${isUnpaidReceipt ? 'bg-red-600 border-red-500 shadow-red-100' : 'bg-green-600 border-green-500 shadow-green-100'}`}>
                      <span className="text-[10px] font-black text-white uppercase tracking-widest font-bold">{isUnpaidReceipt ? 'Amount Due' : 'Total Paid'}</span>
                      <span className="text-xl font-black text-white">LKR {receiptData.totalAmount || receiptData.amount}</span>
                    </div>
                  </div>

                  <div className="text-center pt-6 border-t border-dashed border-gray-100">
                    <div className="mb-2">
                       <CheckCircle size={20} className={`mx-auto ${isUnpaidReceipt ? 'text-red-500' : 'text-green-500'}`} />
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px]">{isUnpaidReceipt ? 'PLEASE PAY BEFORE DUEDATE' : 'THANK YOU FOR YOUR PAYMENT'}</p>
                    <p className="text-[8px] text-gray-300 font-bold uppercase tracking-widest mt-2 font-bold">www.agaramdhines.lk | excelence in digital learning</p>
                  </div>
                </div>
              </div>

              {/* Right Side: Actions */}
              <div className="w-full md:w-64 p-6 bg-white flex flex-col gap-3 justify-center">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 border-b pb-2">Receipt Actions</h3>
                
                <button 
                  onClick={copyAsImage}
                  className="flex items-center gap-3 w-full p-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-all group"
                >
                  <div className="bg-white p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                    <Copy size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-tight">Copy Image</p>
                    <p className="text-[9px] font-bold text-blue-400">Copy to Clipboard</p>
                  </div>
                </button>

                <button 
                  onClick={downloadAsImage}
                  className="flex items-center gap-3 w-full p-3 bg-pink-50 text-pink-700 rounded-xl hover:bg-pink-100 transition-all group"
                >
                  <div className="bg-white p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                    <ImageIcon size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-tight">Save Photo</p>
                    <p className="text-[9px] font-bold text-pink-400">Download as PNG</p>
                  </div>
                </button>

                <button 
                  onClick={downloadAsPDF}
                  className="flex items-center gap-3 w-full p-3 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-all group"
                >
                  <div className="bg-white p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                    <FileText size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-tight">PDF Document</p>
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
                              <title>Receipt - ${receiptData.studentName}</title>
                              <style>
                                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                                body { font-family: 'Inter', sans-serif; background: white; margin: 0; padding: 20px; }
                                .print-container { width: 100%; display: flex; justify-content: center; }
                                #print-node { width: 450px; border: 1px solid #eee; }
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
                    className="flex items-center justify-center gap-2 w-full py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg"
                  >
                    <Printer size={16} />
                    Traditional Print
                  </button>

                  {!isUnpaidReceipt && (
                    <p className="text-[10px] text-center text-gray-400 font-bold bg-gray-50 p-2 rounded-lg mt-2">
                      Official transaction record for student reference.
                    </p>
                  )}
                  {isUnpaidReceipt && (
                    <p className="text-[10px] text-center text-red-500 font-bold bg-red-50 p-2 rounded-lg mt-2 uppercase tracking-widest">
                      Payment Pending
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
