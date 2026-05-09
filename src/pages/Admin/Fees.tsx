import React, { useState, useEffect } from "react";
import { getStudents, getFees, saveFees, saveStudents, getClasses } from "../../lib/db";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FileSpreadsheet, FileText } from "lucide-react";

export default function Fees() {
  const [view, setView] = useState<"menu" | "history" | "status" | "zoom_control">("menu");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedStudent, setSearchedStudent] = useState<any>(null);
  const [feesHistory, setFeesHistory] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [statusMonth, setStatusMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [zoomControlClass, setZoomControlClass] = useState<string>("");
  const [selectedUnpaidStudents, setSelectedUnpaidStudents] = useState<string[]>([]);

  // டேட்டாபேஸில் இருந்து பழைய கட்டண விபரங்களை எடுக்க
  useEffect(() => {
    if (view === "history" || view === "status" || view === "zoom_control") {
      getFees().then((data) => {
        if (data) setFeesHistory(data);
      });
    }
    if (view === "status" || view === "zoom_control") {
      getStudents().then((data) => {
        if (data) setAllStudents(data);
      });
      getClasses().then((data) => {
        if (data) setClasses(data);
      });
    }
  }, [view]);

  if (view === "menu") {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 flex flex-col space-y-4">
        <button
          onClick={() => setView("history")}
          className="bg-[#1e3a8a] text-white py-3 px-6 rounded-md hover:bg-blue-800 transition-colors font-medium text-center"
        >
          Fee History
        </button>
        <button
          onClick={() => setView("status")}
          className="bg-[#1e3a8a] text-white py-3 px-6 rounded-md hover:bg-blue-800 transition-colors font-medium text-center"
        >
          Student Fee Status
        </button>
        <button
          onClick={() => setView("zoom_control")}
          className="bg-red-600 text-white py-3 px-6 rounded-md hover:bg-red-700 transition-colors font-medium text-center"
        >
          Zoom Access Control
        </button>
      </div>
    );
  }

  if (view === "history") {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-6">
          <button onClick={() => setView("menu")} className="mr-4 text-gray-600 hover:text-gray-900">
            ← Back
          </button>
          <h2 className="text-xl font-bold text-gray-800">Fee History</h2>
        </div>
        <div className="space-y-4">
          {feesHistory.length === 0 ? (
            <div className="text-center text-gray-500 py-8">வரலாறு எதுவும் இல்லை.</div>
          ) : (
            feesHistory.map((fee: any) => (
              <div key={fee.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-[#1e3a8a]">{fee.studentName}{fee.rollNo ? ` (Roll: ${fee.rollNo})` : ''}</h3>
                  <p className="text-sm text-gray-500">Month: {fee.month} | Grade: {fee.grade}</p>
                </div>
                <div className="text-right">
                  <span className="text-green-600 font-bold bg-green-50 px-3 py-1 rounded text-sm">Rs. {fee.amount}</span>
                  <p className="text-xs text-gray-400 mt-1">{new Date(fee.date).toLocaleDateString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (view === "status") {
    // Filter students who haven't paid for the selected month
    const paidStudentIds = feesHistory
      .filter(fee => fee.month === statusMonth)
      .map(fee => fee.studentId);
      
    const outstandingStudents = allStudents.filter(
      student => !paidStudentIds.includes(student.student_id || student.id)
    );
    
    const paidStudents = allStudents.filter(
      student => paidStudentIds.includes(student.student_id || student.id)
    );

    const exportToExcel = () => {
      const data = [
        ...paidStudents.map(s => ({
          "Student Name": s.name,
          "Roll Number": s.rollNo || "N/A",
          "Grade": s.grade,
          "Status": "Paid",
          "Month": statusMonth
        })),
        ...outstandingStudents.map(s => ({
          "Student Name": s.name,
          "Roll Number": s.rollNo || "N/A",
          "Grade": s.grade,
          "Status": "Unpaid",
          "Month": statusMonth
        }))
      ];
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Fee Status");
      XLSX.writeFile(wb, `Fee_Status_${statusMonth}.xlsx`);
    };

    const exportToPDF = () => {
      const doc = new jsPDF();
      doc.text(`Student Fee Status - ${statusMonth}`, 14, 15);
      
      const tableData = [
        ...paidStudents.map(s => [s.name, s.rollNo || "N/A", s.grade, "Paid"]),
        ...outstandingStudents.map(s => [s.name, s.rollNo || "N/A", s.grade, "Unpaid"])
      ];
      
      autoTable(doc, {
        startY: 20,
        head: [['Student Name', 'Roll No', 'Grade', 'Status']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [30, 58, 138] },
        didParseCell: function(data) {
          if (data.section === 'body' && data.column.index === 3) {
            if (data.cell.raw === 'Paid') {
              data.cell.styles.textColor = [21, 128, 61];
            } else {
              data.cell.styles.textColor = [185, 28, 28];
            }
          }
        }
      });
      
      doc.save(`Fee_Status_${statusMonth}.pdf`);
    };

    return (
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center">
            <button
              onClick={() => setView("menu")}
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
            <h2 className="text-xl font-bold text-gray-800">
              Student Fee Status
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input 
              type="month" 
              value={statusMonth}
              onChange={(e) => setStatusMonth(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2" 
            />
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 text-sm font-medium transition-colors"
            >
              <FileSpreadsheet size={16} /> Excel
            </button>
            <button 
              onClick={exportToPDF}
              className="flex items-center gap-1 bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 text-sm font-medium transition-colors"
            >
              <FileText size={16} /> PDF
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Outstanding Fees */}
          <div className="border border-red-200 rounded-lg overflow-hidden">
            <div className="bg-red-50 p-3 border-b border-red-200 flex justify-between items-center">
              <h3 className="font-bold text-red-800">Outstanding Fees</h3>
              <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full">{outstandingStudents.length}</span>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto space-y-3">
              {outstandingStudents.length === 0 ? (
                <p className="text-gray-500 text-center py-4">All students have paid!</p>
              ) : (
                outstandingStudents.map(student => (
                  <div key={student.id} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-gray-800">{student.name}</p>
                      <p className="text-xs text-gray-500">Roll: {student.rollNo || "N/A"} | {student.grade}</p>
                    </div>
                    <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">Unpaid</span>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Paid Fees */}
          <div className="border border-green-200 rounded-lg overflow-hidden">
            <div className="bg-green-50 p-3 border-b border-green-200 flex justify-between items-center">
              <h3 className="font-bold text-green-800">Paid Fees</h3>
              <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full">{paidStudents.length}</span>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto space-y-3">
              {paidStudents.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No payments yet.</p>
              ) : (
                paidStudents.map(student => (
                  <div key={student.id} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-gray-800">{student.name}</p>
                      <p className="text-xs text-gray-500">Roll: {student.rollNo || "N/A"} | {student.grade}</p>
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">Paid</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === "zoom_control") {
    // Filter students who haven't paid for the selected month
    const paidStudentIds = feesHistory
      .filter(fee => fee.month === statusMonth)
      .map(fee => fee.studentId);
      
    const classFilteredStudents = zoomControlClass 
      ? allStudents.filter(s => s.grade === zoomControlClass)
      : allStudents;

    const outstandingStudents = classFilteredStudents.filter(
      student => !paidStudentIds.includes(student.student_id || student.id)
    );
    
    const paidStudents = classFilteredStudents.filter(
      student => paidStudentIds.includes(student.student_id || student.id)
    );

    const handleSelectUnpaid = (studentId: string) => {
      setSelectedUnpaidStudents(prev => 
        prev.includes(studentId) 
          ? prev.filter(id => id !== studentId)
          : [...prev, studentId]
      );
    };

    const handleSelectAllUnpaid = () => {
      if (selectedUnpaidStudents.length === outstandingStudents.length) {
        setSelectedUnpaidStudents([]);
      } else {
        setSelectedUnpaidStudents(outstandingStudents.map(s => s.id));
      }
    };

    const handleBlockZoom = async () => {
      if (selectedUnpaidStudents.length === 0) {
        alert("Please select at least one student.");
        return;
      }
      try {
        const updatedStudents = allStudents.map(s => 
          selectedUnpaidStudents.includes(s.id) ? { ...s, zoomBlocked: true } : s
        );
        setAllStudents(updatedStudents);
        await saveStudents(updatedStudents);
        alert("Zoom access blocked for selected students.");
        setSelectedUnpaidStudents([]);
      } catch (error: any) {
        alert("Error blocking zoom: " + error.message);
      }
    };

    const handleUnblockZoom = async (studentId: string) => {
      try {
        const updatedStudents = allStudents.map(s => 
          s.id === studentId ? { ...s, zoomBlocked: false } : s
        );
        setAllStudents(updatedStudents);
        await saveStudents(updatedStudents);
        alert("Zoom access allowed for this student.");
      } catch (error: any) {
        alert("Error unblocking zoom: " + error.message);
      }
    };

    return (
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center">
            <button
              onClick={() => setView("menu")}
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
            <h2 className="text-xl font-bold text-gray-800">
              Zoom Access Control
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={zoomControlClass}
              onChange={(e) => setZoomControlClass(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.name}>{cls.name}</option>
              ))}
            </select>
            <input 
              type="month" 
              value={statusMonth}
              onChange={(e) => setStatusMonth(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Unpaid Students (Block Zoom) */}
          <div className="border border-red-200 rounded-lg overflow-hidden flex flex-col h-[600px]">
            <div className="bg-red-50 p-3 border-b border-red-200 flex justify-between items-center">
              <h3 className="font-bold text-red-800">Unpaid Students (கட்டணம் செலுத்தாதவர்கள்)</h3>
              <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full">{outstandingStudents.length}</span>
            </div>
            
            <div className="p-3 bg-white border-b border-gray-200 flex justify-between items-center">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={outstandingStudents.length > 0 && selectedUnpaidStudents.length === outstandingStudents.length}
                  onChange={handleSelectAllUnpaid}
                  className="rounded text-red-600 focus:ring-red-500"
                />
                <span className="text-sm font-medium">Select All</span>
              </label>
              <button 
                onClick={handleBlockZoom}
                disabled={selectedUnpaidStudents.length === 0}
                className="bg-red-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Block Zoom for Selected
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {outstandingStudents.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No unpaid students found.</p>
              ) : (
                outstandingStudents.map(student => (
                  <div key={student.id} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center space-x-3">
                      <input 
                        type="checkbox" 
                        checked={selectedUnpaidStudents.includes(student.id)}
                        onChange={() => handleSelectUnpaid(student.id)}
                        className="rounded text-red-600 focus:ring-red-500"
                      />
                      <div>
                        <p className="font-medium text-gray-800">{student.name}</p>
                        <p className="text-xs text-gray-500">Roll: {student.rollNo || "N/A"} | {student.grade}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {student.zoomBlocked ? (
                        <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100">Blocked</span>
                      ) : (
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100">Active</span>
                      )}
                      {student.zoomBlocked && (
                        <button 
                          onClick={() => handleUnblockZoom(student.id)}
                          className="text-[10px] text-blue-600 hover:underline"
                        >
                          Allow Access
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Paid Students (Zoom Allowed) */}
          <div className="border border-green-200 rounded-lg overflow-hidden flex flex-col h-[600px]">
            <div className="bg-green-50 p-3 border-b border-green-200 flex justify-between items-center">
              <h3 className="font-bold text-green-800">Paid Students (கட்டணம் செலுத்தியவர்கள்)</h3>
              <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full">{paidStudents.length}</span>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {paidStudents.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No payments found for this month.</p>
              ) : (
                paidStudents.map(student => (
                  <div key={student.id} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-gray-800">{student.name}</p>
                      <p className="text-xs text-gray-500">Roll: {student.rollNo || "N/A"} | {student.grade}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100">Paid</span>
                      {student.zoomBlocked && (
                        <button 
                          onClick={() => handleUnblockZoom(student.id)}
                          className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-200"
                        >
                          Unblock Zoom
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
