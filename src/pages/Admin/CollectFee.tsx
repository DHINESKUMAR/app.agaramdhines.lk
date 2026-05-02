import React, { useState, useEffect } from "react";
import { getStudents, saveStudents, getFees, saveFees, getClasses, getAdminSettings } from "../../lib/db";
import { Search, Calendar, CreditCard, User, BookOpen, DollarSign, CheckCircle, Printer } from "lucide-react";

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
    amount: "",
    method: "Cash",
    date: new Date().toISOString().split('T')[0],
    month: new Date().toISOString().slice(0, 7) // YYYY-MM format
  });

  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [editingFeeId, setEditingFeeId] = useState<string | null>(null);

  useEffect(() => {
    getStudents().then(data => setStudents(data || []));
    getClasses().then(data => setClasses(data || []));
    getFees().then(data => setAllFees(data || []));
    getAdminSettings().then(data => setSettings(data));
    
    // Check if student ID is passed in URL (from Fee Defaulters page)
    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get('student');
    if (studentId) {
      getStudents().then(data => {
        const student = data?.find((s: any) => s.id === studentId);
        if (student) handleSelectStudent(student);
      });
    }
  }, []);

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
        const matchesGrade = selectedGrade ? s.grade === selectedGrade : true;
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
    // Don't clear selectedGrade so the list stays visible for easy navigation
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStudent || !paymentData.amount || !paymentData.date || !paymentData.month) {
      alert("Please fill in all required fields.");
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
      let updatedFees;
      let currentFee;

      if (editingFeeId) {
        // Edit existing fee
        updatedFees = existingFees.map((fee: any) => {
          if (fee.id === editingFeeId) {
            currentFee = {
              ...fee,
              month: paymentData.month,
              amount: paymentData.amount,
              method: paymentData.method,
              date: paymentData.date,
            };
            return currentFee;
          }
          return fee;
        });
        setEditingFeeId(null);
      } else {
        // Create new fee
        currentFee = {
          id: Date.now().toString(),
          studentId: selectedStudent.student_id || selectedStudent.id,
          studentName: selectedStudent.name,
          grade: selectedStudent.grade,
          month: paymentData.month,
          amount: paymentData.amount,
          method: paymentData.method,
          date: paymentData.date,
          transactionId: transactionId || `TXN-${Math.floor(Math.random() * 1000000)}`,
          timestamp: new Date().toISOString()
        };
        updatedFees = [...existingFees, currentFee];
      }

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

      setReceiptData(currentFee);
      setShowReceipt(true);
      
      // Reset form
      setPaymentData({
        amount: "",
        method: "Cash",
        date: new Date().toISOString().split('T')[0],
        month: new Date().toISOString().slice(0, 7)
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
      amount: fee.amount.toString(),
      method: fee.method,
      date: fee.date,
      month: fee.month
    });
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
                        <span className="text-xs text-gray-500">ID: {student.student_id || student.id} | Class: {student.grade}</span>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fee Month <span className="text-red-500">*</span></label>
                      <input 
                        type="month" 
                        required
                        value={paymentData.month}
                        onChange={(e) => setPaymentData({...paymentData, month: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-4 py-2.5 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paying Now <span className="text-red-500">*</span></label>
                      <div className="relative mb-2">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <span className="text-gray-500 font-medium">₹</span>
                        </div>
                        <input 
                          type="number" 
                          required
                          min="1"
                          placeholder="0.00"
                          value={paymentData.amount}
                          onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                          className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 transition-shadow font-medium text-gray-900"
                        />
                      </div>
                      {settings?.fees?.items && settings.fees.items.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {settings.fees.items.map((item: any, idx: number) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setPaymentData({...paymentData, amount: item.amount})}
                              className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                            >
                              {item.label}: ₹{item.amount}
                            </button>
                          ))}
                        </div>
                      )}
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
                            <td className="px-4 py-2 text-sm font-medium text-green-600">₹{fee.amount}</td>
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
                <span className="text-2xl font-bold text-gray-800">₹{paymentData.amount}</span>
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
                      Pay ₹{paymentData.amount}
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
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment Method</span>
                  <span className="font-medium text-gray-800">{receiptData.method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fee Month</span>
                  <span className="font-medium text-gray-800">{receiptData.month}</span>
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
                <span className="text-2xl font-black text-blue-700">₹{receiptData.amount}</span>
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
                            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #333; }
                            .header { text-align: center; margin-bottom: 30px; }
                            .title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
                            .subtitle { color: #666; margin-bottom: 20px; }
                            .row { display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #eee; }
                            .label { color: #666; }
                            .value { font-weight: bold; }
                            .box { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 20px; }
                            .total { display: flex; justify-content: space-between; margin-top: 30px; padding: 20px; background: #f0f7ff; border-radius: 8px; font-weight: bold; font-size: 18px; }
                            @media print { body { padding: 0; } }
                          </style>
                        </head>
                        <body>
                          <div class="header">
                            <div class="title">Agaram Dhines Academy</div>
                            <div class="subtitle">Fee Payment Receipt</div>
                          </div>
                          <div class="row"><span class="label">Receipt No:</span><span class="value">${receiptData.transactionId}</span></div>
                          <div class="row"><span class="label">Date:</span><span class="value">${receiptData.date}</span></div>
                          <div class="row"><span class="label">Payment Method:</span><span class="value">${receiptData.method}</span></div>
                          <div class="row"><span class="label">Fee Month:</span><span class="value">${receiptData.month}</span></div>
                          
                          <div class="box">
                            <div style="font-weight:bold; margin-bottom:5px;">Student Details</div>
                            <div>${receiptData.studentName}</div>
                            <div style="color:#666; font-size:14px;">ID: ${receiptData.studentId} | Class: ${receiptData.grade}</div>
                          </div>
                          
                          <div class="total">
                            <span>Amount Paid</span>
                            <span>₹${receiptData.amount}</span>
                          </div>
                          
                          <div style="text-align:center; margin-top:50px; color:#888; font-size:12px;">
                            This is a computer generated receipt and does not require a physical signature.
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
