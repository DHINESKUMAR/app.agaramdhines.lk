import React, { useState, useEffect, useRef } from "react";
import { getStudents, saveStudents, getClasses } from "../../lib/db";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { secondaryAuth } from "../../lib/firebase";
import * as XLSX from "xlsx";
import { Printer, X, QrCode, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

export default function Students() {
  const [view, setView] = useState<"menu" | "add" | "view" | "import" | "edit" | "view-id-pin">("menu");
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [filterClass, setFilterClass] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [bulkImportGrade, setBulkImportGrade] = useState("");
  const [docModal, setDocModal] = useState<{ type: "idcard" | "certificate" | null, student: any }>({ type: null, student: null });
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    
    let printIframe = document.getElementById('student-print-iframe') as HTMLIFrameElement;
    if (!printIframe) {
      printIframe = document.createElement('iframe');
      printIframe.id = 'student-print-iframe';
      printIframe.style.position = 'absolute';
      printIframe.style.top = '-9999px';
      printIframe.style.left = '-9999px';
      document.body.appendChild(printIframe);
    }
    
    const printDoc = printIframe.contentWindow?.document;
    if (!printDoc) {
      alert('Unable to print document. Please check your browser security settings.');
      return;
    }
    
    printDoc.open();
    printDoc.write(`
      <html>
        <head>
          <title>Print ${docModal.type}</title>
          <style>
            body { font-family: 'Inter', sans-serif; margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0; }
            .print-container { background: white; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            @media print {
              body { background: white; padding: 0; }
              .print-container { box-shadow: none; }
              @page { margin: 0; }
            }
          </style>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body>
          <div class="print-container">
            ${content.innerHTML}
          </div>
        </body>
      </html>
    `);
    printDoc.close();
    
    setTimeout(() => {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
    }, 1000);
  };

  useEffect(() => {
    getStudents().then(setStudents);
    getClasses().then(setClasses);
  }, [view]);

  // Form state
  const [formData, setFormData] = useState({
    grade: "",
    name: "",
    username: "",
    password: "",
    rollNo: "",
    subjects: [] as string[],
    zoomBlocked: false,
    dob: "",
    gender: "",
    guardianName: "",
    address: "",
    phone: "",
    studentCode: "",
    admissionDate: "",
    image: ""
  });

  const resetForm = () => {
    setFormData({
      grade: "",
      name: "",
      username: "",
      password: "",
      rollNo: "",
      subjects: [],
      zoomBlocked: false,
      dob: "",
      gender: "",
      guardianName: "",
      address: "",
      phone: "",
      studentCode: "",
      admissionDate: "",
      image: ""
    });
  };

  const GRADES = [
    "தரம் 01", "தரம் 02", "தரம் 03", "தரம் 04", "தரம் 05", 
    "தரம் 06", "தரம் 07", "தரம் 08", "தரம் 09", "தரம் 10", 
    "தரம் 11", "தரம் 12", "தரம் 13"
  ];

  const availableSubjects = formData.grade 
    ? classes.find(c => c.name === formData.grade)?.subjects || []
    : [];

  const handleSubjectToggle = (subject: string) => {
    setFormData(prev => {
      const subjects = prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject];
      return { ...prev, subjects };
    });
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.username || !formData.password) {
      alert("Name, Username, and Password are required!");
      return;
    }
    
    try {
      // You can bypass auth creation here entirely as stated by the user
      // or at least handle the error better if it already exists/etc. 
      // User says: "Authentication கண்டிப்பா வேண்டுமா அப்டிஇல்லாம login ஆகலாமா database மட்டும் கொடுத்து நாங்க இந்த website செய்ற எதும் database save ஆகல அதுதான ஆனா Authentication இருக்கு"
      // They are asking if Authentication can be skipped and ONLY save to Database. Yes!
      // Here we just save directly to firestore without creating user in secondaryAuth if not wanted.
      
      const newStudent = {
        id: formData.id || "STU" + Math.floor(10000 + Math.random() * 90000), // preserve ID if one was generated/manual
        ...formData
      };
      
      const updatedStudents = [...students, newStudent];
      setStudents(updatedStudents);
      
      // Save to local storage and Firebase Database ONLY
      await saveStudents(updatedStudents);
      
      alert("Student added successfully to the Database!");
      resetForm();
      setView("menu");
    } catch (error: any) {
      console.error("Error creating student:", error);
      alert("Error creating student: " + error.message);
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.username) {
      alert("Name and Username are required!");
      return;
    }
    
    try {
      const updatedStudents = students.map(s => 
        s.id === editingStudentId ? { ...s, ...formData } : s
      );
      setStudents(updatedStudents);
      await saveStudents(updatedStudents);
      
      alert("Student updated successfully!");
      resetForm();
      setEditingStudentId(null);
      setView("view");
    } catch (error: any) {
      console.error("Error updating student:", error);
      alert("Error updating student: " + error.message);
    }
  };

  const handleToggleZoomBlock = async (student: any) => {
    try {
      const updatedStudents = students.map(s => 
        s.id === student.id ? { ...s, zoomBlocked: !s.zoomBlocked } : s
      );
      setStudents(updatedStudents);
      await saveStudents(updatedStudents);
    } catch (error: any) {
      console.error("Error updating student:", error);
      alert("Error updating student: " + error.message);
    }
  };

  const handleEditClick = (student: any) => {
    setFormData({
      grade: student.grade || "",
      name: student.name || "",
      username: student.username || "",
      password: student.password || "",
      rollNo: student.rollNo || "",
      subjects: student.subjects || [],
      zoomBlocked: student.zoomBlocked || false,
      dob: student.dob || "",
      gender: student.gender || "",
      guardianName: student.guardianName || "",
      address: student.address || "",
      phone: student.phone || "",
      studentCode: student.studentCode || "",
      admissionDate: student.admissionDate || "",
      image: student.image || ""
    });
    setEditingStudentId(student.id);
    setView("edit");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this student? They will not be able to login.")) {
      const updatedStudents = students.filter(s => s.id !== id);
      setStudents(updatedStudents);
      await saveStudents(updatedStudents);
      alert("Student deleted successfully. They can no longer login.");
    }
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as any[];
        
        if (jsonData.length === 0) {
          alert("The file is empty.");
          setImporting(false);
          return;
        }

        const normalizedData = jsonData.map(row => {
          const normalizedRow: any = {};
          for (const key in row) {
            normalizedRow[key.trim().toLowerCase()] = row[key];
          }
          return normalizedRow;
        });

        const newStudents = [];
        let addedCount = 0;
        let errorCount = 0;

        for (const row of normalizedData) {
          const gradeKey = Object.keys(row).find(k => k.includes('grade') || k.includes('class') || k.includes('தரம்') || k.includes('வகுப்பு'));
          const nameKey = Object.keys(row).find(k => k.includes('name') || k.includes('பெயர்'));
          const usernameKey = Object.keys(row).find(k => k.includes('username') || k.includes('user') || k.includes('பயனர்'));
          const passwordKey = Object.keys(row).find(k => k.includes('password') || k.includes('pass') || k.includes('கடவுச்சொல்'));
          const rollNoKey = Object.keys(row).find(k => k.includes('roll') || k.includes('பதிவு'));
          const subjectsKey = Object.keys(row).find(k => k.includes('subject') || k.includes('பாடம்'));

          if (!nameKey || !usernameKey || !passwordKey) {
            alert("File must contain columns for Name, Username, and Password");
            setImporting(false);
            return;
          }

          const grade = gradeKey && String(row[gradeKey]).trim() ? String(row[gradeKey]).trim() : bulkImportGrade;
          
          const name = String(row[nameKey] || "").trim();
          if (!grade) {
            errorCount++;
            console.error("Skipping row, grade is missing for", name);
            continue;
          }
          const username = String(row[usernameKey] || "").trim();
          const password = String(row[passwordKey] || "").trim();
          const rollNo = rollNoKey ? String(row[rollNoKey] || "").trim() : "";
          const subjectsStr = subjectsKey ? String(row[subjectsKey] || "").trim() : "";
          
          let subjects = subjectsStr ? subjectsStr.split(/[,;]/).map(s => s.trim()).filter(Boolean) : [];
          
          // Auto-assign default subjects of the grade if no subjects provided in Excel
          if (subjects.length === 0 && grade) {
            const classObj = classes.find(c => c.name === grade);
            if (classObj && classObj.subjects) {
              subjects = classObj.subjects;
            }
          }

          if (!name || !username || !password) {
            errorCount++;
            continue;
          }

          try {
            const email = `${username}@agaram.com`;
            await createUserWithEmailAndPassword(secondaryAuth, email, password);
            
            newStudents.push({
              id: "STU" + Math.floor(10000 + Math.random() * 90000),
              grade,
              name,
              username,
              password,
              rollNo,
              subjects
            });
            addedCount++;
          } catch (error) {
            console.error(`Error adding student ${username}:`, error);
            errorCount++;
          }
        }

        if (newStudents.length > 0) {
          const updatedStudents = [...students, ...newStudents];
          setStudents(updatedStudents);
          await saveStudents(updatedStudents);
        }

        alert(`Import complete! Successfully added: ${addedCount}, Errors: ${errorCount}`);
      } catch (err) {
        console.error("Error parsing file:", err);
        alert("Error parsing file. Please ensure it's a valid CSV or Excel file.");
      } finally {
        setImporting(false);
        setView("menu");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDownloadQrImage = async (studentId: string, studentName: string) => {
    const qrElement = document.getElementById(`qr-download-${studentId}`);
    if (qrElement) {
      try {
        const url = await toPng(qrElement, { pixelRatio: 3, backgroundColor: 'transparent' });
        const link = document.createElement("a");
        link.download = `${studentName}-qr.png`;
        link.href = url;
        link.click();
      } catch (error) {
        console.error("Error generating QR code image:", error);
      }
    }
  };

  const handleDownloadQrPdf = async (studentId: string, studentName: string) => {
    const qrElement = document.getElementById(`qr-download-${studentId}`);
    if (qrElement) {
      try {
        const imgData = await toPng(qrElement, { pixelRatio: 3, backgroundColor: 'transparent' });
        const pdf = new jsPDF();
        pdf.addImage(imgData, "PNG", 10, 10, 100, 150);
        pdf.save(`${studentName}-qr.pdf`);
      } catch (error) {
        console.error("Error generating QR code PDF:", error);
      }
    }
  };

  if (view === "menu") {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 flex flex-col space-y-4">
        <button
          onClick={() => setView("add")}
          className="bg-[#1e3a8a] text-white py-3 px-6 rounded-md hover:bg-blue-800 transition-colors font-medium text-center"
        >
          Add Student
        </button>
        <button
          onClick={() => setView("view")}
          className="bg-[#1e3a8a] text-white py-3 px-6 rounded-md hover:bg-blue-800 transition-colors font-medium text-center"
        >
          View Students
        </button>
        <button
          onClick={() => setView("import")}
          className="bg-[#1e3a8a] text-white py-3 px-6 rounded-md hover:bg-blue-800 transition-colors font-medium text-center"
        >
          Bulk Import Students
        </button>
        <button 
          onClick={() => setView("view-id-pin")}
          className="bg-[#1e3a8a] text-white py-3 px-6 rounded-md hover:bg-blue-800 transition-colors font-medium text-center"
        >
          View ID & PIN
        </button>
      </div>
    );
  }

  if (view === "import") {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-6">
          <button
            onClick={() => setView("menu")}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
          <h2 className="text-xl font-bold text-gray-800">Bulk Import Students</h2>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
            <h3 className="font-semibold text-blue-800 mb-2">File Format Requirements:</h3>
            <p className="text-sm text-blue-700 mb-2">Your CSV or Excel file must include the following headers in the first row:</p>
            <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
              <li><strong>Grade</strong> (Optional if selected below)</li>
              <li><strong>Name</strong></li>
              <li><strong>Username</strong></li>
              <li><strong>Password</strong></li>
              <li><strong>Roll No</strong> (Optional)</li>
              <li><strong>Subjects</strong> (Optional. If left blank, default subjects for the selected class will be auto-assigned. To add custom, separate by commas or semicolons.)</li>
            </ul>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Class / Grade (If missing in Excel)
            </label>
            <select
              value={bulkImportGrade}
              onChange={(e) => setBulkImportGrade(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Select Class --</option>
              {classes.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload CSV or Excel File
            </label>
            <input
              type="file"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={handleBulkImport}
              disabled={importing}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {importing && (
            <div className="text-center text-blue-600 font-medium py-4">
              Importing students... Please wait.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === "add" || view === "edit") {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-6">
          <button
            onClick={() => {
              setView(view === "edit" ? "view" : "menu");
              resetForm();
              setEditingStudentId(null);
            }}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
          <h2 className="text-xl font-bold text-gray-800">{view === "edit" ? "Edit Student" : "Add Student"}</h2>
        </div>

        <form onSubmit={view === "edit" ? handleEditStudent : handleAddStudent} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Student Class And Section
            </label>
            <select 
              value={formData.grade}
              onChange={(e) => setFormData({...formData, grade: e.target.value, subjects: []})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">Select Class</option>
              {classes.length > 0 ? (
                classes.map((cls) => (
                  <option key={cls.id} value={cls.name}>
                    {cls.name}
                  </option>
                ))
              ) : (
                GRADES.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Student Name
            </label>
            <input
              type="text"
              placeholder="Enter Student Name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Of Birth
            </label>
            <input
              type="date"
              value={formData.dob}
              onChange={(e) => setFormData({...formData, dob: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gender
            </label>
            <select 
              value={formData.gender}
              onChange={(e) => setFormData({...formData, gender: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              placeholder="Enter Username"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Guardian Name
            </label>
            <input
              type="text"
              placeholder="Enter Guardian Name"
              value={formData.guardianName}
              onChange={(e) => setFormData({...formData, guardianName: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              placeholder="Enter Address"
              rows={3}
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact No
            </label>
            <input
              type="tel"
              placeholder="Enter Contact No"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Roll No
            </label>
            <input
              type="text"
              placeholder="Enter Roll No"
              value={formData.rollNo}
              onChange={(e) => setFormData({...formData, rollNo: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Student Code (Optional)
            </label>
            <input
              type="text"
              placeholder="Enter Student Code (If any)"
              value={formData.studentCode}
              onChange={(e) => setFormData({...formData, studentCode: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Of Admission
            </label>
            <input
              type="date"
              value={formData.admissionDate}
              onChange={(e) => setFormData({...formData, admissionDate: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password {view === "edit" && "(Leave unchanged to keep current)"}
            </label>
            <input
              type="text"
              placeholder="Enter Password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Student Image (Optional)
            </label>
            <div className="flex items-center space-x-4">
              {formData.image && (
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100">
                  <img src={formData.image} alt="Profile" className="w-full h-full object-cover" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subjects
            </label>
            <div className="grid grid-cols-2 gap-2 border border-gray-300 rounded-md p-3 bg-white">
              {availableSubjects.length > 0 ? (
                availableSubjects.map((subject: string) => (
                  <label key={subject} className="flex items-center space-x-2 text-sm">
                    <input 
                      type="checkbox" 
                      checked={formData.subjects.includes(subject)}
                      onChange={() => handleSubjectToggle(subject)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>{subject}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-gray-500 col-span-2">
                  {formData.grade ? "No subjects assigned to this class." : "Please select a class first to see available subjects."}
                </p>
              )}
            </div>
          </div>

          <div className="col-span-full mt-4">
            <label className="flex items-center space-x-3 cursor-pointer p-3 bg-red-50 border border-red-200 rounded-md">
              <input
                type="checkbox"
                checked={formData.zoomBlocked}
                onChange={(e) => setFormData({...formData, zoomBlocked: e.target.checked})}
                className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <span className="text-red-700 font-medium">
                Block Zoom Access (Unpaid Fee) / கட்டணம் செலுத்தாததால் Zoom-ஐ முடக்கு
              </span>
            </label>
          </div>

          <div className="pt-4 flex justify-center">
            <button
              type="submit"
              className="bg-pink-600 text-white px-8 py-2 rounded-md hover:bg-pink-700 transition-colors font-medium"
            >
              {view === "edit" ? "Update Student" : "Save"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (view === "view") {
    const filteredStudents = students.filter(s => {
      const matchesClass = filterClass ? s.grade === filterClass : true;
      const matchesSearch = searchQuery 
        ? s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
          s.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.rollNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.username?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      return matchesClass && matchesSearch;
    });

    const studentCountByClass = students.reduce((acc, s) => {
      acc[s.grade] = (acc[s.grade] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return (
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="flex items-center">
            <button
              onClick={() => setView("menu")}
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
            <h2 className="text-xl font-bold text-gray-800">View Students</h2>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search by Name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-blue-500 focus:border-blue-500 bg-white w-full sm:w-64"
              />
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-sm text-gray-600 whitespace-nowrap">Filter by Class:</span>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-blue-500 focus:border-blue-500 bg-white w-full sm:w-auto"
              >
                <option value="">All Classes ({students.length})</option>
                {classes.length > 0 ? (
                  classes.map((cls) => (
                    <option key={cls.id} value={cls.name}>
                      {cls.name} ({studentCountByClass[cls.name] || 0})
                    </option>
                  ))
                ) : (
                  GRADES.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade} ({studentCountByClass[grade] || 0})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-5 p-5">
          {filteredStudents.length === 0 ? (
            <div className="text-center text-gray-500 py-8 col-span-full">No students found.</div>
          ) : (
            filteredStudents.map(student => (
              <div key={student.id} className="border border-gray-200 rounded-lg text-center p-4 bg-white shadow-sm flex flex-col items-center">
                <div className="w-[60px] h-[60px] rounded-full bg-gray-100 flex items-center justify-center mb-2 overflow-hidden">
                  {student.image ? (
                    <img src={student.image} alt={student.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-500 font-bold text-xl">{student.name.charAt(0)}</span>
                  )}
                </div>
                <p className="text-gray-500 text-sm mt-2">{student.id}</p>
                <p className="font-bold uppercase text-sm mt-1">{student.name}</p>
                <p className="text-indigo-600 text-xs font-semibold mt-1 px-2 py-0.5 bg-indigo-50 rounded-full inline-block">{student.grade}</p>
                <div className="mt-2 w-full">
                  <button 
                    onClick={() => handleToggleZoomBlock(student)}
                    className={`text-xs px-2 py-1 rounded w-full font-medium transition-colors ${student.zoomBlocked ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                    title={student.zoomBlocked ? "Unblock Zoom" : "Block Zoom (Unpaid)"}
                  >
                    {student.zoomBlocked ? "Zoom Blocked" : "Zoom Active"}
                  </button>
                </div>
                <div className="flex justify-center gap-2 mt-3 w-full border-t pt-3 flex-wrap">
                  <button 
                    onClick={() => setDocModal({ type: "idcard", student })}
                    className="p-1 hover:bg-gray-100 rounded text-indigo-600 text-xs font-medium" 
                    title="ID Card"
                  >
                    ID
                  </button>
                  <button 
                    onClick={() => setDocModal({ type: "certificate", student })}
                    className="p-1 hover:bg-gray-100 rounded text-purple-600 text-xs font-medium" 
                    title="Certificate"
                  >
                    Cert
                  </button>
                  <button className="p-1 hover:bg-gray-100 rounded text-gray-600" title="View">👁️</button>
                  <button 
                    onClick={() => handleEditClick(student)}
                    className="p-1 hover:bg-gray-100 rounded text-blue-600" 
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={() => handleDelete(student.id)}
                    className="p-1 hover:bg-gray-100 rounded text-red-600" 
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Document Modal */}
        {docModal.type && docModal.student && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                <h3 className="font-bold text-gray-800 capitalize">{docModal.type === 'idcard' ? 'Student ID Card' : 'Course Certificate'}</h3>
                <div className="flex gap-2">
                  <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
                    <Printer size={16} /> Print
                  </button>
                  <button onClick={() => setDocModal({ type: null, student: null })} className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="p-8 flex justify-center bg-gray-100 flex-1 overflow-auto">
                <div ref={printRef} className="bg-white shadow-lg">
                  {docModal.type === 'idcard' ? (
                    /* ID Card Template */
                    <div className="w-[300px] h-[480px] relative overflow-hidden bg-white border border-gray-200 rounded-xl flex flex-col">
                      {/* Header Background */}
                      <div className="h-32 bg-gradient-to-br from-indigo-600 to-purple-700 relative">
                        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                        <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 w-24 h-24 bg-white rounded-full p-1 shadow-md">
                          {docModal.student.image ? (
                            <img src={docModal.student.image} alt={docModal.student.name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center text-3xl font-bold text-gray-500">
                              {docModal.student.name.charAt(0)}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 pt-12 pb-6 px-6 flex flex-col items-center text-center">
                        <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide mb-1">{docModal.student.name}</h2>
                        <p className="text-sm text-indigo-600 font-medium mb-4">{docModal.student.grade}</p>
                        
                        <div className="w-full space-y-2 text-left mt-2">
                          <div className="flex justify-between border-b border-gray-100 pb-1">
                            <span className="text-xs text-gray-500 font-medium">ROLL NO</span>
                            <span className="text-xs font-bold text-gray-800">{docModal.student.rollNo || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 pb-1">
                            <span className="text-xs text-gray-500 font-medium">PHONE</span>
                            <span className="text-xs font-bold text-gray-800">{docModal.student.phone || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 pb-1">
                            <span className="text-xs text-gray-500 font-medium">USER</span>
                            <span className="text-xs font-bold text-gray-800">{docModal.student.username}</span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 pb-1">
                            <span className="text-xs text-gray-500 font-medium">PASS</span>
                            <span className="text-xs font-bold text-gray-800">{docModal.student.password}</span>
                          </div>
                        </div>
                        
                        <div className="mt-auto pt-4 w-full flex justify-center">
                          <QRCodeSVG 
                            value={docModal.student.id} 
                            size={64} 
                            level={"H"}
                            includeMargin={false}
                          />
                        </div>
                      </div>
                      
                      {/* Footer */}
                      <div className="h-10 bg-gray-900 flex items-center justify-center">
                        <p className="text-[10px] text-white/80 font-medium tracking-wider uppercase">Agaram Dhines Academy</p>
                      </div>
                    </div>
                  ) : (
                    /* Certificate Template */
                    <div className="w-[800px] h-[565px] relative overflow-hidden bg-white border-[12px] border-double border-indigo-900 p-8 flex flex-col items-center text-center">
                      <div className="absolute top-0 left-0 w-32 h-32 border-t-4 border-l-4 border-yellow-500 m-4"></div>
                      <div className="absolute top-0 right-0 w-32 h-32 border-t-4 border-r-4 border-yellow-500 m-4"></div>
                      <div className="absolute bottom-0 left-0 w-32 h-32 border-b-4 border-l-4 border-yellow-500 m-4"></div>
                      <div className="absolute bottom-0 right-0 w-32 h-32 border-b-4 border-r-4 border-yellow-500 m-4"></div>
                      
                      <div className="mb-6 mt-4">
                        <h1 className="text-4xl font-serif font-bold text-indigo-900 uppercase tracking-widest">Certificate</h1>
                        <p className="text-sm tracking-[0.3em] text-yellow-600 font-bold mt-2 uppercase">of Excellence</p>
                      </div>
                      
                      <p className="text-gray-600 italic mb-6">This is proudly presented to</p>
                      
                      <h2 className="text-5xl font-serif text-gray-900 mb-6 border-b-2 border-gray-300 pb-2 px-12 inline-block">
                        {docModal.student.name}
                      </h2>
                      
                      <p className="text-gray-600 max-w-lg mx-auto leading-relaxed mb-6">
                        For outstanding academic performance and successful completion of the curriculum in <span className="font-bold text-gray-800">{docModal.student.grade}</span> at Agaram Dhines Academy.
                      </p>
                      
                      <div className="flex gap-6 text-sm text-gray-700 mb-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p><span className="font-bold text-indigo-900">Roll No:</span> {docModal.student.rollNo || 'N/A'}</p>
                        <p><span className="font-bold text-indigo-900">Phone:</span> {docModal.student.phone || 'N/A'}</p>
                        <p><span className="font-bold text-indigo-900">User:</span> <span className="font-mono">{docModal.student.username}</span></p>
                        <p><span className="font-bold text-indigo-900">Pass:</span> <span className="font-mono">{docModal.student.password}</span></p>
                      </div>
                      
                      <div className="flex justify-between w-full max-w-2xl mt-auto mb-8 px-12">
                        <div className="text-center">
                          <div className="w-40 border-b border-gray-400 mb-2"></div>
                          <p className="text-xs font-bold text-gray-600 uppercase">Date</p>
                          <p className="text-sm text-gray-800">{new Date().toLocaleDateString()}</p>
                        </div>
                        
                        <div className="w-24 h-24 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg border-4 border-yellow-200 relative -mt-8">
                          <div className="w-20 h-20 border border-yellow-200 rounded-full flex items-center justify-center text-center">
                            <span className="text-[10px] font-bold text-white uppercase leading-tight">Agaram<br/>Academy<br/>Seal</span>
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className="w-40 border-b border-gray-400 mb-2">
                            <span className="font-signature text-2xl text-blue-900">Dhines</span>
                          </div>
                          <p className="text-xs font-bold text-gray-600 uppercase">Principal Signature</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === "view-id-pin") {
    return (
      <div className="p-6">
        <div className="flex items-center mb-6">
          <button
            onClick={() => setView("menu")}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
          <h2 className="text-xl font-bold text-gray-800">Student IDs & PINs</h2>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QR Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PIN/Password</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div id={`qr-${student.id}`} className="bg-white p-1 inline-block">
                        <QRCodeSVG value={student.id} size={40} />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.grade}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.rollNo || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">{student.password}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleDownloadQrImage(student.id, student.name)}
                          className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded"
                          title="Download Image"
                        >
                          <Download size={14} /> IMG
                        </button>
                        <button 
                          onClick={() => handleDownloadQrPdf(student.id, student.name)}
                          className="text-emerald-600 hover:text-emerald-900 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded"
                          title="Download PDF"
                        >
                          <Download size={14} /> PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                      No students found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Hidden QR Download Templates */}
      <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none">
        {students.map(student => (
          <div 
            key={`dl-${student.id}`} 
            id={`qr-download-${student.id}`} 
            className="bg-white p-6 rounded-2xl border-4 border-indigo-600 flex-col items-center w-80 shadow-2xl flex"
          >
            <h3 className="font-black text-2xl text-indigo-800 mb-1 tracking-wider text-center">AGARAM</h3>
            <p className="text-sm font-bold text-gray-500 mb-4 tracking-widest uppercase text-center">Academy</p>
            
            <div className="bg-white p-3 rounded-xl shadow-inner border-2 border-gray-100 mb-6 flex justify-center">
              <QRCodeSVG value={student.id} size={180} level="H" />
            </div>
            
            <div className="w-full bg-indigo-50 rounded-xl p-4 border border-indigo-100">
              <h4 className="font-bold text-lg text-gray-900 text-center mb-2">{student.name}</h4>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div className="text-gray-500">Grade:</div>
                <div className="font-semibold text-gray-900 text-right">{student.grade}</div>
                
                <div className="text-gray-500">Roll No:</div>
                <div className="font-semibold text-gray-900 text-right">{student.rollNo || 'N/A'}</div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-indigo-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-500">Username:</span>
                  <span className="font-mono font-bold text-indigo-700">{student.username}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Password:</span>
                  <span className="font-mono font-bold text-indigo-700">{student.password}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
