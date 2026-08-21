import React, { useState, useEffect, useRef } from "react";
import { getStudents, saveStudents, deleteStudent, getClasses, getAdminSettings, sanitizeSubjectList, areSubjectsMatching } from "../../lib/db";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { secondaryAuth } from "../../lib/firebase";
import * as XLSX from "xlsx";
import { Printer, X, QrCode, Download, FileText, Copy, Check, User, LayoutGrid, List, Search, Eye, Edit, Trash2, ArrowLeft, BookOpen, ShieldCheck, ShieldAlert } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';

export default function Students() {
  const [view, setView] = useState<"menu" | "add" | "view" | "import" | "edit" | "view-id-pin">("menu");
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [filterClass, setFilterClass] = useState<string>("");
  const [filterSubject, setFilterSubject] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [bulkImportGrade, setBulkImportGrade] = useState("");
  const [docModal, setDocModal] = useState<{ type: "idcard" | "certificate" | "details" | null, student: any }>({ type: null, student: null });
  const [adminSettings, setAdminSettings] = useState<any>(null);
  const [copiedIdAdmin, setCopiedIdAdmin] = useState(false);
  const [studentViewMode, setStudentViewMode] = useState<'grid' | 'table'>('grid');
  const printRef = useRef<HTMLDivElement>(null);

  const handleDownloadDoc = async (format: 'png' | 'pdf') => {
    const element = printRef.current;
    if (!element) return;
    
    try {
      const isIdCard = docModal.type === 'idcard';
      const imgData = await toPng(element, { pixelRatio: 3, backgroundColor: 'transparent' });
      
      if (format === 'png') {
        const link = document.createElement('a');
        link.download = `${docModal.student.name}_${isIdCard ? 'ID_Card' : 'Certificate'}.png`;
        link.href = imgData;
        link.click();
      } else {
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'in',
          format: isIdCard ? [3.375, 2.125] : [11, 8.5]
        });
        const w = isIdCard ? 3.375 : 11;
        const h = isIdCard ? 2.125 : 8.5;
        pdf.addImage(imgData, 'PNG', 0, 0, w, h);
        pdf.save(`${docModal.student.name}_${isIdCard ? 'ID_Card' : 'Certificate'}.pdf`);
      }
    } catch (error) {
      console.error("Error downloading doc:", error);
      alert("Failed to download doc. (பதிவிறக்கம் தோல்வியடைந்தது.)");
    }
  };

  const handleCopyDocImage = async () => {
    const element = printRef.current;
    if (!element) return;
    
    try {
      const imgData = await toPng(element, { pixelRatio: 3, backgroundColor: 'transparent' });
      const response = await fetch(imgData);
      const blob = await response.blob();
      
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      
      setCopiedIdAdmin(true);
      setTimeout(() => setCopiedIdAdmin(false), 2000);
    } catch (error) {
      console.error("Error copying document image:", error);
      alert("Failed to copy image. Clipboard copy might be restricted in this browser session. Try downloading as PNG instead. (படம் நகலெடுக்க முடியவில்லை, PNG-ஆக பதிவிறக்கவும்.)");
    }
  };

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

  const [showBulkSubjectModal, setShowBulkSubjectModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bulkSubjectData, setBulkSubjectData] = useState<{
    grade: string;
    subject: string;
    action: 'add' | 'remove';
    studentIds: string[];
  }>({ grade: "", subject: "", action: 'add', studentIds: [] });
  const [bulkSearchQuery, setBulkSearchQuery] = useState("");

  useEffect(() => {
    getStudents().then(setStudents);
    getClasses().then(setClasses);
    getAdminSettings().then(setAdminSettings);
    import('../../lib/db').then(({ getSubjects }) => getSubjects().then(setAllSubjects));

    const handleDbUpdate = (e: any) => {
      const key = e.detail?.key;
      if (!key || key === 'students') {
        getStudents().then(setStudents);
      }
      if (!key || key === 'classes') {
        getClasses().then(setClasses);
      }
      if (!key || key === 'subjects') {
        import('../../lib/db').then(({ getSubjects }) => getSubjects().then(setAllSubjects));
      }
    };

    window.addEventListener('db_updated', handleDbUpdate);
    return () => {
      window.removeEventListener('db_updated', handleDbUpdate);
    };
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

  const [updateProgress, setUpdateProgress] = useState(-1);

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

  const getGradeSortValue = (name: string) => {
    const match = name.match(/\d+/);
    return match ? parseInt(match[0]) : 999;
  };

  const unifiedGrades = React.useMemo(() => {
    const map = new Map<string, string>(); // normKey -> displayName

    // 1. Existing classes from DB
    classes.forEach((c: any) => {
      if (c?.name) {
        const name = c.name.toString().trim();
        if (name) {
          const digits = name.replace(/[^0-9]/g, '');
          const key = digits ? `grade_${parseInt(digits, 10)}` : name.toLowerCase();
          if (!map.has(key)) {
            map.set(key, name);
          }
        }
      }
    });

    // 2. Standard GRADES list
    GRADES.forEach((g) => {
      const name = g.trim();
      const digits = name.replace(/[^0-9]/g, '');
      const key = digits ? `grade_${parseInt(digits, 10)}` : name.toLowerCase();
      if (!map.has(key)) {
        map.set(key, name);
      }
    });

    // 3. Grades present in student records
    students.forEach((s: any) => {
      if (s?.grade) {
        const name = s.grade.toString().trim();
        if (name) {
          const digits = name.replace(/[^0-9]/g, '');
          const key = digits ? `grade_${parseInt(digits, 10)}` : name.toLowerCase();
          if (!map.has(key)) {
            map.set(key, name);
          }
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => getGradeSortValue(a) - getGradeSortValue(b));
  }, [classes, students]);

  const getStudentCountForGrade = (gradeName: string) => {
    if (!gradeName) return 0;
    const targetNorm = gradeName.toString().trim();
    const targetDigits = targetNorm.replace(/[^0-9]/g, '');

    return students.filter(s => {
      if (!s.grade) return false;
      const sNorm = s.grade.toString().trim();
      if (sNorm === targetNorm || sNorm.toLowerCase() === targetNorm.toLowerCase()) return true;
      const sDigits = sNorm.replace(/[^0-9]/g, '');
      if (targetDigits !== '' && sDigits !== '' && parseInt(targetDigits, 10) === parseInt(sDigits, 10)) return true;
      return false;
    }).length;
  };

  const sortedClasses = [...classes].sort((a, b) => getGradeSortValue(a.name) - getGradeSortValue(b.name));

  const availableSubjects = Array.from(new Set([
    ...allSubjects.map(s => s.name),
    ...(formData.subjects || []),
    ...students.flatMap(s => s.subjects || s.enrolledClasses || [])
  ])).filter(s => s && typeof s === 'string' && s.trim().length > 0);

  const handleSubjectToggle = (subject: string) => {
    setFormData(prev => {
      const isChecked = prev.subjects.some(s => s.trim().toLowerCase() === subject.trim().toLowerCase());
      let updatedSubjects: string[];
      if (isChecked) {
        updatedSubjects = prev.subjects.filter(s => s.trim().toLowerCase() !== subject.trim().toLowerCase());
      } else {
        updatedSubjects = [...prev.subjects, subject];
      }
      return { ...prev, subjects: sanitizeSubjectList(updatedSubjects) };
    });
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.username || !formData.password) {
      alert("Name, Username, and Password are required!");
      return;
    }
    
    setUpdateProgress(30);
    
    try {
      const currentStudents = await getStudents();
      const targetUser = formData.username.trim().toLowerCase();
      const cleanRollNo = formData.rollNo ? formData.rollNo.toString().trim() : "";

      // Check if this student already exists by username or ID, if so update them
      const existingStudentIndex = currentStudents.findIndex((s: any) => 
        (s.username && s.username.toString().trim().toLowerCase() === targetUser) ||
        (s.id && (formData as any).id && String(s.id).trim() === String((formData as any).id).trim())
      );

      let updatedStudents: any[];

      if (existingStudentIndex !== -1) {
        // Update existing record
        updatedStudents = currentStudents.map((s: any, idx: number) => {
          if (idx === existingStudentIndex) {
            return {
              ...s,
              ...formData,
              rollNo: cleanRollNo || s.rollNo || "",
              id: String(s.id)
            };
          }
          return s;
        });
      } else {
        // Create new student
        const generatedId = (formData as any).id || "STU" + Math.floor(100000 + Math.random() * 900000);
        const newStudent = {
          ...formData,
          rollNo: cleanRollNo,
          id: String(generatedId)
        };
        updatedStudents = [...currentStudents.filter((s: any) => String(s.id) !== String(newStudent.id)), newStudent];
      }
      
      setUpdateProgress(70);
      
      // Save to local storage and Firebase Database simultaneously
      await saveStudents(updatedStudents);
      setStudents(updatedStudents);
      
      setUpdateProgress(100);
      
      setTimeout(() => {
        alert("Student saved successfully!");
        resetForm();
        setView("menu");
        setUpdateProgress(-1);
      }, 150);
    } catch (error: any) {
      console.error("Error saving student:", error);
      alert("Error saving student: " + (error.message || error));
      setUpdateProgress(-1);
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.username) {
      alert("Name and Username are required!");
      return;
    }
    
    setUpdateProgress(30);
    
    try {
      const currentStudents = await getStudents();
      const targetId = editingStudentId ? String(editingStudentId).trim() : "";
      const targetUser = formData.username ? formData.username.trim().toLowerCase() : "";
      const cleanRollNo = formData.rollNo ? formData.rollNo.toString().trim() : "";

      let matched = false;
      const updatedStudents = currentStudents.map((s: any) => {
        const isMatch = (targetId && String(s.id).trim() === targetId) ||
                        (targetUser && s.username && s.username.toString().trim().toLowerCase() === targetUser);
        if (isMatch) {
          matched = true;
          return { 
            ...s, 
            ...formData, 
            rollNo: cleanRollNo,
            id: String(s.id || targetId || "STU" + Math.floor(100000 + Math.random() * 900000))
          };
        }
        return s;
      });

      // If for any reason the student wasn't in the list by ID, add/upsert the student
      if (!matched) {
        updatedStudents.push({
          ...formData,
          rollNo: cleanRollNo,
          id: targetId || "STU" + Math.floor(100000 + Math.random() * 900000)
        });
      }
      
      setUpdateProgress(70);
      await saveStudents(updatedStudents);
      setStudents(updatedStudents);
      
      setUpdateProgress(100);

      setTimeout(() => {
        alert("Student updated successfully!");
        resetForm();
        setEditingStudentId(null);
        setView("view");
        setUpdateProgress(-1);
      }, 150);
    } catch (error: any) {
      console.error("Error updating student:", error);
      alert("Error updating student: " + (error.message || error));
      setUpdateProgress(-1);
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

  const handleBulkSubjectSubmit = async () => {
    if (!bulkSubjectData.subject || bulkSubjectData.studentIds.length === 0) {
      alert("Please select a subject and at least one student.");
      return;
    }
    
    setLoading(true);
    try {
      const allStudents = await getStudents();
      const updatedStudents = allStudents.map((s: any) => {
        if (bulkSubjectData.studentIds.includes(s.id)) {
          let updatedSubjects = [...(s.subjects || [])];
          if (bulkSubjectData.action === 'add') {
            if (!updatedSubjects.includes(bulkSubjectData.subject)) {
              updatedSubjects.push(bulkSubjectData.subject);
            }
          } else if (bulkSubjectData.action === 'remove') {
            updatedSubjects = updatedSubjects.filter(sub => sub !== bulkSubjectData.subject);
          }
          return { ...s, subjects: updatedSubjects };
        }
        return s;
      });

      await saveStudents(updatedStudents);
      setStudents(updatedStudents);
      alert(`Applied subject ${bulkSubjectData.action} to ${bulkSubjectData.studentIds.length} students.`);
      setShowBulkSubjectModal(false);
    } catch(err) {
      console.error(err);
      alert("Error applying bulk subject updates.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (student: any) => {
    setFormData({
      grade: student.grade || "",
      name: student.name || "",
      username: student.username || "",
      password: student.password || "",
      rollNo: student.rollNo || "",
      subjects: sanitizeSubjectList(student.subjects || student.enrolledClasses || []),
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
    setEditingStudentId(String(student.id || ""));
    setView("edit");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300;
          const MAX_HEIGHT = 300;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
            setFormData(prev => ({ ...prev, image: compressedBase64 }));
          } else {
            setFormData(prev => ({ ...prev, image: event.target?.result as string }));
          }
        };
        img.onerror = () => {
          setFormData(prev => ({ ...prev, image: event.target?.result as string }));
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("இந்த மாணவரை நீக்க விரும்புகிறீர்களா? (Are you sure you want to delete this student? They will not be able to login.)")) {
      try {
        const updatedStudents = await deleteStudent(id);
        setStudents(updatedStudents);
        alert("மாணவர் வெற்றிகரமாக Database-லிருந்து நீக்கப்பட்டார் / Student deleted successfully from database.");
      } catch (err: any) {
        console.error("Error deleting student:", err);
        alert("Error deleting student: " + (err.message || err));
      }
    }
  };

  const handleExportCSV = () => {
    if (students.length === 0) {
      alert("No students to export.");
      return;
    }

    const filteredStudents = students.filter(s => {
      const matchesClass = filterClass === "unassigned" 
        ? (!s.grade || s.grade === "")
        : (filterClass ? s.grade === filterClass : true);

      const studentSubs = (s.subjects || s.enrolledClasses || []).map((sub: any) => sub?.toString().trim().toLowerCase());
      const matchesSubject = !filterSubject
        ? true
        : studentSubs.some((sub: string) => sub === filterSubject.toLowerCase());

      const searchLow = searchQuery.toLowerCase().trim();
      const isNumericSearch = /^\d+$/.test(searchLow);

      const matchesSearch = searchQuery 
        ? s.name?.toLowerCase().includes(searchLow) || 
          s.id?.toString().toLowerCase().includes(searchLow) ||
          s.rollNo?.toString().toLowerCase().includes(searchLow) ||
          (isNumericSearch && s.rollNo?.toString().endsWith(searchLow)) ||
          (isNumericSearch && s.id?.toString().endsWith(searchLow)) ||
          s.username?.toString().toLowerCase().includes(searchLow) ||
          s.phone?.toString().includes(searchLow)
        : true;
      return matchesClass && matchesSubject && matchesSearch;
    });

    const dataToExport = filteredStudents.map(s => ({
      "Roll No": s.rollNo || "",
      "Name": s.name,
      "Grade": s.grade || "",
      "Username": s.username,
      "Password": s.password,
      "Guardian Name": s.guardianName || "",
      "Address": s.address || "",
      "DOB": s.dob || "",
      "Gender": s.gender || "",
      "Admission Date": s.admissionDate || "",
      "Subjects": (s.subjects || []).join(", "),
      "Zoom Blocked": s.zoomBlocked ? "Yes" : "No"
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    XLSX.writeFile(workbook, `Students_Export_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportPDF = () => {
    if (students.length === 0) {
      alert("No students to export.");
      return;
    }

    const filteredStudents = students.filter(s => {
      const matchesClass = filterClass === "unassigned" 
        ? (!s.grade || s.grade === "")
        : (filterClass ? s.grade === filterClass : true);

      const studentSubs = (s.subjects || s.enrolledClasses || []).map((sub: any) => sub?.toString().trim().toLowerCase());
      const matchesSubject = !filterSubject
        ? true
        : studentSubs.some((sub: string) => sub === filterSubject.toLowerCase());

      const searchLow = searchQuery.toLowerCase().trim();
      const isNumericSearch = /^\d+$/.test(searchLow);

      const matchesSearch = searchQuery 
        ? s.name?.toLowerCase().includes(searchLow) || 
          s.id?.toString().toLowerCase().includes(searchLow) ||
          s.rollNo?.toString().toLowerCase().includes(searchLow) ||
          (isNumericSearch && s.rollNo?.toString().endsWith(searchLow)) ||
          (isNumericSearch && s.id?.toString().endsWith(searchLow)) ||
          s.username?.toString().toLowerCase().includes(searchLow) ||
          s.phone?.toString().includes(searchLow)
        : true;
      return matchesClass && matchesSubject && matchesSearch;
    });

    const doc = new jsPDF();
    const tableColumn = ["Roll No", "Name", "Grade", "Username", "Password"];
    const tableRows = filteredStudents.map(s => [
      s.rollNo || "",
      s.name,
      s.grade || "",
      s.username,
      s.password
    ]);

    doc.text(`Student List - ${filterClass || "All Classes"}`, 14, 15);
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 138] }
    });
    doc.save(`Students_Export_${filterClass || "All"}_${new Date().toISOString().split('T')[0]}.pdf`);
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
          
          // Check for duplicate roll number within existing students OR newStudents being imported
          if (rollNo) {
            const isDuplicateInExisting = students.some(s => s.rollNo && s.rollNo.toString().trim() === rollNo);
            const isDuplicateInNew = newStudents.some(s => s.rollNo === rollNo);
            
            if (isDuplicateInExisting || isDuplicateInNew) {
              console.error(`Skipping row, roll number ${rollNo} already exists for ${name}`);
              errorCount++;
              continue;
            }
          }
          
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
                {unifiedGrades.map(g => (
                  <option key={g} value={g}>{g}</option>
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
              onChange={(e) => setFormData({...formData, grade: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">Select Class</option>
              {unifiedGrades.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
              {formData.grade && !unifiedGrades.includes(formData.grade) && (
                <option key={formData.grade} value={formData.grade}>
                  {formData.grade}
                </option>
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
                      checked={formData.subjects.some((s: string) => s.trim().toLowerCase() === subject.trim().toLowerCase())}
                      onChange={() => handleSubjectToggle(subject)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>{subject}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-gray-500 col-span-2">
                  No subjects available in the system yet. Please create subjects in Admin Settings.
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
              disabled={updateProgress >= 0}
              className={`text-white px-8 py-2 rounded-md transition-all duration-300 font-medium relative overflow-hidden flex justify-center items-center ${
                updateProgress >= 0 ? "bg-amber-500 w-48" : "bg-pink-600 hover:bg-pink-700 w-48"
              }`}
            >
              {/* Progress Background */}
              {updateProgress >= 0 && (
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-emerald-500 transition-all duration-300"
                  style={{ width: `${updateProgress}%` }}
                />
              )}
              
              {/* Button Text */}
              <span className="relative z-10 font-bold whitespace-nowrap">
                {updateProgress >= 0 
                  ? `Saving... ${updateProgress}%`
                  : (view === "edit" ? "Update Student" : "Save")}
              </span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (view === "view") {
    // Determine students matching class/grade first (for subject count calculations)
    const targetStudentsForClass = filterClass === "unassigned" 
      ? students.filter(s => !s.grade || s.grade === "")
      : (filterClass ? students.filter(s => s.grade === filterClass) : students);

    // Compute list of available subjects for the Subject Filter dropdown
    const availableSubjectsList = (() => {
      const subjectsSet = new Set<string>();
      targetStudentsForClass.forEach(s => {
        const subs = s.subjects || s.enrolledClasses || [];
        if (Array.isArray(subs)) {
          subs.forEach((sub: any) => {
            const clean = sub?.toString().trim();
            if (clean) subjectsSet.add(clean);
          });
        }
      });

      classes.forEach(c => {
        if (!filterClass || c.name === filterClass) {
          if (Array.isArray(c.subjects)) {
            c.subjects.forEach((sub: any) => {
              const clean = sub?.toString().trim();
              if (clean) subjectsSet.add(clean);
            });
          }
        }
      });

      if (!filterClass || subjectsSet.size === 0) {
        allSubjects.forEach(s => {
          const name = typeof s === 'string' ? s : s?.name;
          const clean = name?.toString().trim();
          if (clean) subjectsSet.add(clean);
        });
      }

      return Array.from(subjectsSet).sort((a, b) => a.localeCompare(b));
    })();

    const filteredStudents = students.filter(s => {
      const matchesClass = filterClass === "unassigned" 
        ? (!s.grade || s.grade === "")
        : (filterClass ? s.grade === filterClass : true);

      const studentSubs = (s.subjects || s.enrolledClasses || []).map((sub: any) => sub?.toString().trim().toLowerCase());
      const matchesSubject = !filterSubject
        ? true
        : studentSubs.some((sub: string) => sub === filterSubject.toLowerCase());

      const searchLow = searchQuery.toLowerCase().trim();
      const isNumericSearch = /^\d+$/.test(searchLow);

      const matchesSearch = searchQuery 
        ? s.name?.toLowerCase().includes(searchLow) || 
          s.id?.toString().toLowerCase().includes(searchLow) ||
          s.rollNo?.toString().toLowerCase().includes(searchLow) ||
          (isNumericSearch && s.rollNo?.toString().endsWith(searchLow)) ||
          (isNumericSearch && s.id?.toString().endsWith(searchLow)) ||
          s.username?.toString().toLowerCase().includes(searchLow) ||
          s.phone?.toString().includes(searchLow)
        : true;
      return matchesClass && matchesSubject && matchesSearch;
    });

    const studentCountByClass = students.reduce((acc, s) => {
      if (s.grade) {
        acc[s.grade] = (acc[s.grade] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const unassignedCount = students.filter(s => !s.grade || s.grade === "").length;

    return (
      <>
        <div className="w-full max-w-full mx-auto bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView("menu")}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center justify-center"
                title="Back to Menu"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">View Students</h2>
                  <span className="bg-indigo-50 text-indigo-700 font-bold text-xs px-2.5 py-1 rounded-full border border-indigo-100">
                    {filteredStudents.length} Students
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Manage and search all registered student profiles</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search Box */}
              <div className="relative flex-1 sm:w-64 min-w-[200px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Name, Roll No, Phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full transition-all"
                />
              </div>

              {/* Class Filter */}
              <select
                value={filterClass}
                onChange={(e) => {
                  setFilterClass(e.target.value);
                  setFilterSubject("");
                }}
                className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700 font-medium"
              >
                <option value="">All Classes ({students.length})</option>
                <option value="unassigned" className="text-red-600 font-bold">Unassigned ({unassignedCount})</option>
                {unifiedGrades.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade} ({getStudentCountForGrade(grade)})
                  </option>
                ))}
              </select>

              {/* Subject Filter */}
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className={`py-2 px-3 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium transition-all ${
                  filterSubject 
                    ? "bg-indigo-600 text-white border-indigo-600 font-bold shadow-sm shadow-indigo-200" 
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
              >
                <option value="" className="bg-white text-slate-800">All Subjects / பாடங்கள் ({availableSubjectsList.length})</option>
                {availableSubjectsList.map((subj) => {
                  const count = targetStudentsForClass.filter(s =>
                    (s.subjects || s.enrolledClasses || []).some((sub: any) => sub?.toString().trim().toLowerCase() === subj.toLowerCase())
                  ).length;
                  return (
                    <option key={subj} value={subj} className="bg-white text-slate-800">
                      {subj} ({count})
                    </option>
                  );
                })}
              </select>

              {/* Bulk Assign Subjects Button */}
              <button
                onClick={() => {
                  setBulkSubjectData(prev => ({...prev, grade: filterClass}));
                  setShowBulkSubjectModal(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-100"
              >
                <BookOpen size={16} /> Bulk Assign Subjects
              </button>

              {/* Export Buttons */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={handleExportCSV}
                  className="bg-white hover:bg-emerald-50 text-emerald-700 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                  title="Export CSV (Excel)"
                >
                  <Download size={14} /> CSV
                </button>
                <button
                  onClick={handleExportPDF}
                  className="bg-white hover:bg-red-50 text-red-700 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                  title="Export PDF"
                >
                  <FileText size={14} /> PDF
                </button>
              </div>

              {/* View Mode Switcher (Grid vs Table) */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setStudentViewMode('grid')}
                  className={`p-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    studentViewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setStudentViewMode('table')}
                  className={`p-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    studentViewMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Table View"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>
        
          {filteredStudents.length === 0 ? (
            <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <User size={40} className="mx-auto text-slate-300 mb-2" />
              <p className="text-slate-600 font-semibold">No students found matching your filter or search.</p>
              <p className="text-slate-400 text-xs mt-1">Try clearing the search box or changing class filter.</p>
            </div>
          ) : studentViewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-5">
              {filteredStudents.map(student => (
                <div 
                  key={student.id} 
                  className="bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-xl transition-all duration-200 rounded-2xl p-4 flex flex-col items-center justify-between text-center relative group"
                >
                  <div className="w-full flex flex-col items-center">
                    {/* Student Image / Avatar */}
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-100 to-purple-100 border-2 border-indigo-200 shadow-sm flex items-center justify-center mb-3 overflow-hidden group-hover:scale-105 transition-transform">
                      {student.image ? (
                        <img src={student.image} alt={student.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-indigo-700 font-extrabold text-2xl uppercase">{student.name ? student.name.charAt(0) : 'S'}</span>
                      )}
                    </div>

                    {/* Student Name */}
                    <h3 className="font-bold text-slate-900 text-sm leading-tight uppercase line-clamp-2 title-case px-1" title={student.name}>
                      {student.name}
                    </h3>

                    {/* Roll No */}
                    <p className="text-xs font-semibold text-slate-500 mt-1 bg-slate-100 px-2 py-0.5 rounded-md">
                      Roll No: {student.rollNo || "N/A"}
                    </p>

                    {/* Class / Grade Badge */}
                    <span className="mt-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full inline-block">
                      {student.grade || "No Grade"}
                    </span>

                    {/* Username or Phone info if present */}
                    {(student.phone || student.username) && (
                      <p className="text-[11px] text-slate-400 mt-1 truncate max-w-full">
                        {student.phone ? `📱 ${student.phone}` : `@${student.username}`}
                      </p>
                    )}

                    {/* Subjects Badge */}
                    {student.subjects && sanitizeSubjectList(student.subjects).length > 0 && (
                      <div className="mt-2 text-[11px] font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 w-full truncate" title={sanitizeSubjectList(student.subjects).join(", ")}>
                        📚 <span className="font-bold text-indigo-600">{sanitizeSubjectList(student.subjects).length}</span> Subjects
                      </div>
                    )}
                  </div>

                  <div className="w-full mt-3 pt-3 border-t border-slate-100">
                    {/* Zoom Status Toggle */}
                    <button 
                      onClick={() => handleToggleZoomBlock(student)}
                      className={`text-[11px] font-bold px-2 py-1 rounded-lg w-full transition-all flex items-center justify-center gap-1 ${
                        student.zoomBlocked 
                          ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100' 
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                      title={student.zoomBlocked ? "Click to Unblock Zoom" : "Click to Block Zoom (Unpaid Fee)"}
                    >
                      {student.zoomBlocked ? (
                        <>
                          <ShieldAlert size={12} /> Zoom Blocked
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={12} /> Zoom Active
                        </>
                      )}
                    </button>

                    {/* Action Toolbar */}
                    <div className="flex items-center justify-center gap-1 mt-2.5 pt-2 border-t border-slate-100">
                      <button 
                        onClick={() => setDocModal({ type: "idcard", student })}
                        className="px-2 py-1 hover:bg-indigo-50 text-indigo-700 rounded-md text-[11px] font-bold border border-indigo-100 transition-colors" 
                        title="Generate ID Card"
                      >
                        ID
                      </button>
                      <button 
                        onClick={() => setDocModal({ type: "certificate", student })}
                        className="px-2 py-1 hover:bg-purple-50 text-purple-700 rounded-md text-[11px] font-bold border border-purple-100 transition-colors" 
                        title="Generate Certificate"
                      >
                        Cert
                      </button>
                      <button 
                        onClick={() => setDocModal({ type: "details", student })}
                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-md transition-colors" 
                        title="View Full Profile"
                      >
                        <Eye size={15} />
                      </button>
                      <button 
                        onClick={() => handleEditClick(student)}
                        className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-md transition-colors" 
                        title="Edit Student"
                      >
                        <Edit size={15} />
                      </button>
                      <button 
                        onClick={() => handleDelete(student.id)}
                        className="p-1.5 hover:bg-red-50 text-red-600 rounded-md transition-colors" 
                        title="Delete Student"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Table View Mode */
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 text-xs font-bold uppercase tracking-wider">
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Roll No</th>
                    <th className="px-4 py-3">Class / Grade</th>
                    <th className="px-4 py-3">Phone / Username</th>
                    <th className="px-4 py-3">Subjects</th>
                    <th className="px-4 py-3">Zoom Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold flex items-center justify-center overflow-hidden shrink-0">
                            {student.image ? (
                              <img src={student.image} alt={student.name} className="w-full h-full object-cover" />
                            ) : (
                              <span>{student.name ? student.name.charAt(0).toUpperCase() : 'S'}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 uppercase text-xs sm:text-sm">{student.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{student.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700 text-xs whitespace-nowrap">
                        {student.rollNo || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                          {student.grade || "Unassigned"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                        {student.phone || `@${student.username}` || "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px] truncate" title={sanitizeSubjectList(student.subjects)?.join(", ")}>
                        {student.subjects && sanitizeSubjectList(student.subjects).length > 0 ? (
                          <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded border border-slate-200">
                            {sanitizeSubjectList(student.subjects).length} subjects
                          </span>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button 
                          onClick={() => handleToggleZoomBlock(student)}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all inline-flex items-center gap-1 ${
                            student.zoomBlocked 
                              ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {student.zoomBlocked ? <ShieldAlert size={12} /> : <ShieldCheck size={12} />}
                          {student.zoomBlocked ? "Blocked" : "Active"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button 
                            onClick={() => setDocModal({ type: "idcard", student })}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-bold border border-indigo-100 transition-colors"
                            title="ID Card"
                          >
                            ID
                          </button>
                          <button 
                            onClick={() => setDocModal({ type: "certificate", student })}
                            className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded text-xs font-bold border border-purple-100 transition-colors"
                            title="Certificate"
                          >
                            Cert
                          </button>
                          <button 
                            onClick={() => setDocModal({ type: "details", student })}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                            title="View Profile"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={() => handleEditClick(student)}
                            className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(student.id)}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Document Modal */}
        {docModal.type && docModal.student && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                <h3 className="font-bold text-gray-800 capitalize">
                  {docModal.type === 'idcard' ? 'Student ID Card' : docModal.type === 'certificate' ? 'Course Certificate' : 'Student Details'}
                </h3>
                <div className="flex gap-2 items-center flex-wrap">
                  {(docModal.type === 'idcard' || docModal.type === 'certificate') && (
                    <>
                      <button 
                        onClick={handleCopyDocImage} 
                        className={`flex items-center gap-1.5 px-3 py-2 text-white rounded-lg transition-all text-xs font-semibold cursor-pointer
                          ${copiedIdAdmin ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-800 hover:bg-slate-900'}`}
                      >
                        {copiedIdAdmin ? (
                          <>
                            <Check size={14} /> Copied! (நகலெடுக்கப்பட்டது)
                          </>
                        ) : (
                          <>
                            <Copy size={14} /> Copy Image (படமாக நகலெடு)
                          </>
                        )}
                      </button>
                      <button onClick={() => handleDownloadDoc('png')} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-xs font-semibold cursor-pointer shadow-sm">
                        <Download size={14} /> PNG (பதிவிறக்கு)
                      </button>
                      <button onClick={() => handleDownloadDoc('pdf')} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-xs font-semibold cursor-pointer shadow-sm">
                        <FileText size={14} /> PDF
                      </button>
                    </>
                  )}
                  <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs font-semibold cursor-pointer shadow-sm">
                    <Printer size={14} /> Print
                  </button>
                  <button onClick={() => setDocModal({ type: null, student: null })} className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>
              
              <div className="p-8 flex justify-center bg-gray-100 flex-1 overflow-auto">
                <div ref={printRef} className="bg-white shadow-lg">
                  {docModal.type === 'idcard' ? (
                    /* ID Card Template */
                    <div className="w-[480px] h-[300px] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-2xl p-4 relative overflow-hidden text-white shadow-2xl shrink-0 flex flex-col justify-between">
                      {/* Subtle background glow accents */}
                      <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-sky-400/20 rounded-full blur-xl pointer-events-none"></div>

                      {/* Top Header Row */}
                      <div className="flex items-center justify-between gap-2 border-b border-white/20 pb-2 z-10">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-12 h-12 bg-white rounded-full p-0.5 shadow-md border border-amber-300 shrink-0 flex items-center justify-center overflow-hidden">
                            <img 
                              src={adminSettings?.profileImage || "/logo.png"} 
                              alt="AGARAM DHINES ONLINE ACADEMY" 
                              crossOrigin="anonymous"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/logo.png";
                              }}
                              className="w-full h-full object-cover rounded-full" 
                            />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-black uppercase tracking-wider text-white leading-tight drop-shadow-xs truncate">
                              {adminSettings?.instituteName || "AGARAM DHINES ONLINE ACADEMY"}
                            </h3>
                            <p className="text-[10px] font-extrabold text-amber-200 leading-tight drop-shadow-xs truncate">
                              அகரம் தினேஷ் ஆன்லைன் அகாடமி
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[9px] font-black bg-amber-400 text-indigo-950 px-2 py-0.5 rounded shadow-xs uppercase tracking-wider">
                            OFFICIAL ID
                          </span>
                          <span className="text-[10px] font-extrabold text-sky-100 block mt-0.5 whitespace-nowrap">
                            📞 778054232
                          </span>
                        </div>
                      </div>

                      {/* Student Main Info Row */}
                      <div className="flex items-center gap-3 my-1 z-10">
                        <div className="w-13 h-13 rounded-full border-2 border-white/90 overflow-hidden shrink-0 bg-white/20 flex items-center justify-center shadow-md">
                          {docModal.student.image ? (
                            <img src={docModal.student.image} alt={docModal.student.name} className="w-full h-full object-cover" />
                          ) : (
                            <User size={26} className="text-white" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h2 className="text-base font-extrabold text-white truncate leading-tight drop-shadow-xs">
                            {docModal.student.name}
                          </h2>
                          <div className="flex items-center gap-3 text-xs text-sky-100 mt-0.5">
                            <span>Grade: <strong className="text-amber-200">{docModal.student.grade}</strong></span>
                            <span className="text-white/40">•</span>
                            <span>Roll No: <strong className="text-white">{docModal.student.rollNo || 'N/A'}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Enrolled Subjects List - Colorful Badges */}
                      <div className="z-10 bg-black/20 backdrop-blur-xs p-1.5 rounded-md border border-white/15">
                        <span className="text-[9px] font-black uppercase tracking-wider text-sky-200 block mb-1">
                          Subjects / பாடங்கள்:
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-[38px] overflow-hidden">
                          {(() => {
                            const subs = docModal.student.subjects || docModal.student.enrolledClasses;
                            const badgeColors = [
                              'bg-amber-400 text-indigo-950',
                              'bg-emerald-400 text-indigo-950',
                              'bg-sky-300 text-indigo-950',
                              'bg-pink-300 text-indigo-950',
                              'bg-purple-300 text-indigo-950',
                              'bg-yellow-300 text-indigo-950',
                            ];
                            if (Array.isArray(subs) && subs.length > 0) {
                              return subs.map((s: string, idx: number) => (
                                <span 
                                  key={idx} 
                                  className={`text-[9.5px] font-black px-2 py-0.5 rounded shadow-xs whitespace-nowrap ${badgeColors[idx % badgeColors.length]}`}
                                >
                                  {s}
                                </span>
                              ));
                            }
                            return (
                              <span className="text-[9.5px] font-bold px-2 py-0.5 rounded bg-amber-400 text-indigo-950">
                                All Registered Courses
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Footer Credentials & QR Code */}
                      <div className="flex items-end justify-between gap-2 mt-1 z-10">
                        <div className="bg-black/25 backdrop-blur-xs px-2 py-1 rounded border border-white/20 text-[10px] font-mono leading-tight flex-1">
                          <p className="text-white/80 flex justify-between"><span>User:</span> <span className="text-white font-bold">{docModal.student.username}</span></p>
                          <p className="text-white/80 flex justify-between"><span>Pass:</span> <span className="text-amber-200 font-bold">{docModal.student.password}</span></p>
                        </div>
                        <div className="bg-white p-1 rounded shrink-0 shadow-md">
                          <QRCodeSVG value={docModal.student.id} size={42} level="H" includeMargin={false} />
                        </div>
                      </div>
                    </div>
                  ) : docModal.type === 'certificate' ? (
                    /* Certificate Template */
                    <div className="w-[800px] h-[565px] bg-gradient-to-br from-amber-50/60 via-white to-indigo-50/40 p-6 relative overflow-hidden flex flex-col justify-between items-center text-center shadow-2xl">
                      {/* Ornate Gold & Royal Blue Borders */}
                      <div className="absolute inset-3 border-[8px] border-double border-indigo-900 rounded-2xl pointer-events-none"></div>
                      <div className="absolute inset-5 border border-amber-400/80 rounded-xl pointer-events-none"></div>
                      
                      {/* Ornate Corner Accents */}
                      <div className="absolute top-4 left-4 w-10 h-10 border-t-4 border-l-4 border-amber-500 pointer-events-none"></div>
                      <div className="absolute top-4 right-4 w-10 h-10 border-t-4 border-r-4 border-amber-500 pointer-events-none"></div>
                      <div className="absolute bottom-4 left-4 w-10 h-10 border-b-4 border-l-4 border-amber-500 pointer-events-none"></div>
                      <div className="absolute bottom-4 right-4 w-10 h-10 border-b-4 border-r-4 border-amber-500 pointer-events-none"></div>

                      <div className="relative z-10 w-full h-full flex flex-col items-center justify-between py-2 px-6">
                        {/* Top Academy Logo & Branding Header */}
                        <div className="flex flex-col items-center">
                          <div className="w-14 h-14 bg-white rounded-full p-0.5 shadow-md border-2 border-amber-400 mb-1 overflow-hidden flex items-center justify-center">
                            <img 
                              src={adminSettings?.profileImage || "/logo.png"} 
                              alt="AGARAM DHINES ONLINE ACADEMY" 
                              crossOrigin="anonymous"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/logo.png";
                              }}
                              className="w-full h-full object-cover rounded-full" 
                            />
                          </div>
                          <h3 className="text-lg font-black uppercase tracking-wider text-indigo-950 leading-tight">
                            {adminSettings?.instituteName || "AGARAM DHINES ONLINE ACADEMY"}
                          </h3>
                          <p className="text-xs font-extrabold text-amber-600 tracking-wide mt-0.5">
                            அகரம் தினேஷ் ஆன்லைன் அகாடமி <span className="text-indigo-800 text-[11px] ml-1 font-bold">| 📞 778054232</span>
                          </p>
                        </div>

                        {/* Certificate Main Title */}
                        <div>
                          <h1 className="text-3xl font-serif font-black text-indigo-900 tracking-wide uppercase drop-shadow-xs">
                            Certificate of Excellence
                          </h1>
                          <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.25em]">
                            Official Academic Award
                          </p>
                        </div>

                        {/* Presentation Line & Name */}
                        <div className="w-full">
                          <p className="text-xs text-gray-500 font-medium tracking-widest uppercase mb-0.5">
                            This is proudly presented to
                          </p>
                          <h2 className="text-2xl font-extrabold text-indigo-950 border-b-2 border-amber-400 pb-1 px-8 inline-block font-serif drop-shadow-xs">
                            {docModal.student.name}
                          </h2>
                        </div>

                        {/* Citation */}
                        <p className="text-sm text-gray-700 max-w-xl leading-relaxed font-serif my-1">
                          For outstanding academic performance, dedication, and active participation in <span className="font-bold text-indigo-900">Grade {docModal.student.grade}</span> at AGARAM DHINES ONLINE ACADEMY.
                        </p>

                        {/* Footer with Signatures, Seal & Student Credentials + QR */}
                        <div className="flex justify-between items-end w-full mt-auto pt-2 px-4">
                          {/* Date */}
                          <div className="text-center w-32">
                            <p className="font-bold text-gray-900 text-xs mb-0.5">{new Date().toLocaleDateString()}</p>
                            <div className="w-full border-b border-indigo-900 mb-0.5"></div>
                            <p className="font-bold text-indigo-900 text-[10px] uppercase tracking-widest">Date / தேதி</p>
                          </div>

                          {/* Center Stamp & Credentials Badge */}
                          <div className="flex items-center gap-3 bg-white/90 px-3 py-1.5 rounded-xl border border-amber-300 shadow-sm backdrop-blur-sm">
                            <div className="bg-white p-0.5 rounded border border-indigo-100 shadow-2xs">
                              <QRCodeSVG value={docModal.student.id} size={48} level="H" includeMargin={false} />
                            </div>
                            <div className="text-left text-[10px] font-medium text-slate-800 space-y-0.5">
                              <p><span className="font-bold text-indigo-900 w-12 inline-block">Roll No:</span> <strong>{docModal.student.rollNo || 'N/A'}</strong></p>
                              <p><span className="font-bold text-indigo-900 w-12 inline-block">User:</span> <span className="font-mono font-bold text-indigo-700">{docModal.student.username}</span></p>
                              <p><span className="font-bold text-indigo-900 w-12 inline-block">Pass:</span> <span className="font-mono font-bold text-amber-600">{docModal.student.password}</span></p>
                            </div>
                          </div>

                          {/* Director Signature */}
                          <div className="text-center w-32">
                            <div className="font-serif italic text-base text-indigo-900 font-bold mb-0.5">Dhines Nivas</div>
                            <div className="w-full border-b border-indigo-900 mb-0.5"></div>
                            <p className="font-bold text-indigo-900 text-[10px] uppercase tracking-widest">Director / இயக்குனர்</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Details Template */
                    <div className="w-full max-w-2xl bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="bg-indigo-600 p-6 flex items-center gap-6">
                        <div className="w-24 h-24 bg-white rounded-full p-1 shadow-md">
                          {docModal.student.image ? (
                            <img src={docModal.student.image} alt={docModal.student.name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center text-3xl font-bold text-gray-500">
                              {docModal.student.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="text-white">
                          <h2 className="text-2xl font-bold">{docModal.student.name}</h2>
                          <p className="opacity-90">{docModal.student.grade}</p>
                        </div>
                      </div>
                      
                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h4 className="font-bold text-gray-900 border-b pb-1 text-sm uppercase tracking-wider text-indigo-600">Personal Info</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <span className="text-gray-500 font-medium">Roll No:</span>
                            <span className="text-gray-900 font-bold">{docModal.student.rollNo || 'N/A'}</span>
                            
                            <span className="text-gray-500 font-medium">Date of Birth:</span>
                            <span className="text-gray-900">{docModal.student.dob || 'N/A'}</span>
                            
                            <span className="text-gray-500 font-medium">Gender:</span>
                            <span className="text-gray-900 capitalize">{docModal.student.gender || 'N/A'}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <h4 className="font-bold text-gray-900 border-b pb-1 text-sm uppercase tracking-wider text-indigo-600">Account Details</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <span className="text-gray-500 font-medium">Username:</span>
                            <span className="text-gray-900 font-mono font-bold">{docModal.student.username}</span>
                            
                            <span className="text-gray-500 font-medium">Password:</span>
                            <span className="text-gray-900 font-mono font-bold">{docModal.student.password}</span>
                            
                            <span className="text-gray-500 font-medium">Guardian:</span>
                            <span className="text-gray-900">{docModal.student.guardianName || 'N/A'}</span>
                            
                            <span className="text-gray-500 font-medium">Admission:</span>
                            <span className="text-gray-900">{docModal.student.admissionDate || 'N/A'}</span>
                          </div>
                        </div>

                        <div className="col-span-1 md:col-span-2 space-y-2">
                          <h4 className="font-bold text-gray-900 border-b pb-1 text-sm uppercase tracking-wider text-indigo-600">Address</h4>
                          <p className="text-sm text-gray-800 leading-relaxed bg-gray-50 p-3 rounded border border-gray-100 italic">
                            {docModal.student.address || 'No address provided.'}
                          </p>
                        </div>

                        <div className="col-span-1 md:col-span-2 space-y-2">
                          <h4 className="font-bold text-gray-900 border-b pb-1 text-sm uppercase tracking-wider text-indigo-600">Subjects</h4>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {docModal.student.subjects && docModal.student.subjects.length > 0 ? (
                                docModal.student.subjects.map((sub: string, i: number) => (
                                  <span key={i} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-semibold border border-indigo-100">
                                    {sub}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-400 italic">No subjects assigned.</span>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      {showBulkSubjectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col my-8">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h3 className="text-xl font-bold text-gray-800">Bulk Subject Assignment</h3>
              <button 
                onClick={() => setShowBulkSubjectModal(false)} 
                className="text-gray-500 hover:bg-gray-200 p-1.5 rounded-full transition-colors"
                disabled={loading}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Grade / Class</label>
                  <select
                    value={bulkSubjectData.grade}
                    onChange={(e) => {
                      setBulkSubjectData(prev => ({ ...prev, grade: e.target.value, studentIds: [] }));
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Grade</option>
                    {unifiedGrades.map((grade) => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Subject</label>
                  <select
                    value={bulkSubjectData.subject}
                    onChange={(e) => setBulkSubjectData(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a subject...</option>
                    {allSubjects.map(sub => (
                      <option key={sub.name} value={sub.name}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Action to Perform</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-md border-emerald-200 bg-emerald-50 hover:bg-emerald-100 flex-1">
                    <input 
                      type="radio" 
                      name="bulkAction" 
                      value="add"
                      checked={bulkSubjectData.action === 'add'}
                      onChange={() => setBulkSubjectData(prev => ({ ...prev, action: 'add' }))}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-emerald-800">Add Subject to Students</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-md border-red-200 bg-red-50 hover:bg-red-100 flex-1">
                    <input 
                      type="radio" 
                      name="bulkAction" 
                      value="remove"
                      checked={bulkSubjectData.action === 'remove'}
                      onChange={() => setBulkSubjectData(prev => ({ ...prev, action: 'remove' }))}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span className="font-semibold text-red-800">Remove Subject from Students</span>
                  </label>
                </div>
              </div>

              <div className="border border-gray-200 rounded-md overflow-hidden">
                <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-3">
                  <span className="font-medium text-sm text-gray-700">
                    Select Students {bulkSubjectData.grade && `in ${bulkSubjectData.grade}`}
                  </span>
                  
                  {bulkSubjectData.grade && (
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <input
                        type="text"
                        placeholder="Search By Name/RollNo/User..."
                        value={bulkSearchQuery}
                        onChange={(e) => setBulkSearchQuery(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-blue-500 focus:border-blue-500 flex-1 sm:w-56"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const query = bulkSearchQuery.toLowerCase();
                          const gradeStudents = students.filter(s => {
                            if (s.grade !== bulkSubjectData.grade) return false;
                            if (!query) return true;
                            const isNumericSearch = /^\d+$/.test(query);
                            return (
                              s.name?.toLowerCase().includes(query) ||
                              s.rollNo?.toString().toLowerCase().includes(query) ||
                              (isNumericSearch && s.rollNo?.toString().endsWith(query)) ||
                              (isNumericSearch && s.id?.toString().endsWith(query)) ||
                              s.username?.toLowerCase().includes(query)
                            );
                          });
                          
                          const allFilteredSelected = gradeStudents.length > 0 && gradeStudents.every(s => bulkSubjectData.studentIds.includes(s.id));
                          
                          if (allFilteredSelected) {
                            // deselect all filtered
                            const filteredIds = gradeStudents.map(s => s.id);
                            setBulkSubjectData(prev => ({
                              ...prev, 
                              studentIds: prev.studentIds.filter(id => !filteredIds.includes(id))
                            }));
                          } else {
                            // select all filtered
                            const filteredIds = gradeStudents.map(s => s.id);
                            setBulkSubjectData(prev => {
                              const newIds = new Set([...prev.studentIds, ...filteredIds]);
                              return { ...prev, studentIds: Array.from(newIds) };
                            });
                          }
                        }}
                        className="text-sm text-indigo-600 font-semibold hover:underline whitespace-nowrap"
                      >
                        {(() => {
                           const query = bulkSearchQuery.toLowerCase();
                           const gradeStudents = students.filter(s => {
                             if (s.grade !== bulkSubjectData.grade) return false;
                             if (!query) return true;
                             return (
                               s.name?.toLowerCase().includes(query) ||
                               s.rollNo?.toLowerCase().includes(query) ||
                               s.username?.toLowerCase().includes(query)
                             );
                           });
                           const allFilteredSelected = gradeStudents.length > 0 && gradeStudents.every(s => bulkSubjectData.studentIds.includes(s.id));
                           return allFilteredSelected ? "Deselect All" : "Select All";
                        })()}
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="max-h-[30vh] overflow-y-auto p-2">
                  {!bulkSubjectData.grade ? (
                    <div className="p-4 text-center text-gray-500 text-sm">Please select a grade first.</div>
                  ) : (() => {
                      const query = bulkSearchQuery.toLowerCase();
                      const filteredInBulk = students.filter(s => {
                        if (s.grade !== bulkSubjectData.grade) return false;
                        if (!query) return true;
                        return (
                          s.name?.toLowerCase().includes(query) ||
                          s.rollNo?.toLowerCase().includes(query) ||
                          s.username?.toLowerCase().includes(query)
                        );
                      });
                      
                      if (filteredInBulk.length === 0) {
                        return <div className="p-4 text-center text-gray-500 text-sm">No students found matching your search.</div>;
                      }
                      
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {filteredInBulk.map(student => {
                            const isSelected = bulkSubjectData.studentIds.includes(student.id);
                            const hasSubject = (student.subjects || []).includes(bulkSubjectData.subject);
                            
                            return (
                              <label 
                                key={student.id} 
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                  isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                <input 
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    setBulkSubjectData(prev => {
                                      const ids = new Set(prev.studentIds);
                                      if (e.target.checked) ids.add(student.id);
                                      else ids.delete(student.id);
                                      return { ...prev, studentIds: Array.from(ids) };
                                    });
                                  }}
                                  className="w-4 h-4 text-indigo-600 rounded"
                                />
                                <div className="flex-1 truncate">
                                  <div className="text-sm font-semibold truncate">{student.name}</div>
                                  <div className="text-xs text-gray-500 flex gap-2">
                                    <span>{student.rollNo || student.id}</span>
                                    {bulkSubjectData.subject && (
                                      hasSubject ? (
                                        <span className="text-emerald-600 font-medium">· Has Subject</span>
                                      ) : (
                                        <span className="text-gray-400">· Pending</span>
                                      )
                                    )}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      );
                  })()}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl shrink-0">
              <button 
                onClick={() => setShowBulkSubjectModal(false)}
                className="px-5 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 font-medium"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkSubjectSubmit}
                disabled={loading || !bulkSubjectData.subject || bulkSubjectData.studentIds.length === 0}
                className="px-5 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-bold disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? "Applying..." : "Apply Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
    );
  }

  if (view === "view-id-pin") {
    const filteredStudents = students.filter(s => {
      const matchesClass = filterClass === "unassigned" 
        ? (!s.grade || s.grade === "")
        : (filterClass ? s.grade === filterClass : true);

      const studentSubs = (s.subjects || s.enrolledClasses || []).map((sub: any) => sub?.toString().trim().toLowerCase());
      const matchesSubject = !filterSubject
        ? true
        : studentSubs.some((sub: string) => sub === filterSubject.toLowerCase());

      const searchLow = searchQuery.toLowerCase().trim();
      const isNumericSearch = /^\d+$/.test(searchLow);

      const matchesSearch = searchQuery 
        ? s.name?.toLowerCase().includes(searchLow) || 
          s.id?.toString().toLowerCase().includes(searchLow) ||
          s.rollNo?.toString().toLowerCase().includes(searchLow) ||
          (isNumericSearch && s.rollNo?.toString().endsWith(searchLow)) ||
          (isNumericSearch && s.id?.toString().endsWith(searchLow)) ||
          s.username?.toString().toLowerCase().includes(searchLow) ||
          s.phone?.toString().includes(searchLow)
        : true;
      return matchesClass && matchesSubject && matchesSearch;
    });

    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={() => setView("menu")}
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
            <h2 className="text-xl font-bold text-gray-800">Student IDs & PINs</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="bg-emerald-600 text-white rounded-md px-3 py-1.5 text-sm whitespace-nowrap hover:bg-emerald-700 flex items-center gap-2"
              title="Export CSV (Excel)"
            >
              <Download size={16} /> CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="bg-red-600 text-white rounded-md px-3 py-1.5 text-sm whitespace-nowrap hover:bg-red-700 flex items-center gap-2"
              title="Export PDF"
            >
              <FileText size={16} /> PDF
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
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
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
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
