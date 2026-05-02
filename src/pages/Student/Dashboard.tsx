import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CursorTrail } from "../../components/CursorTrail";
import {
  Home,
  Book,
  BookOpen,
  DollarSign,
  User,
  Link,
  Video,
  Globe,
  Bell,
  LogOut,
  Calendar,
  Youtube,
  Edit2,
  Check,
  FileText,
  Download,
  Phone,
  Clock,
  Camera,
  Info,
  X,
  CheckCircle,
  XCircle,
  Play,
  ExternalLink,
  Award,
  QrCode,
  RotateCw,
  MessageCircle,
  ShieldAlert,
  Share2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import WhatsAppIcon from "../../components/WhatsAppIcon";
import QrScanner from "../../components/QrScanner";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

import { getCourses, getZoomLinks, getYoutubeLinks, getFees, getAttendance, saveAttendance, getClassLinks, getHomework, getStaffs, getTimeTable, getStudents, saveStudents, getAdminSettings, getClasses, getExamMarks, getWebPosts } from "../../lib/db";
import CountdownTimer from "../../components/CountdownTimer";
import PopupAnnouncement from "../../components/PopupAnnouncement";
import LiveChat from "../../components/LiveChat";
import { useChatNotifications } from "../../hooks/useChatNotifications";
import { useHomeworkNotifications } from "../../hooks/useHomeworkNotifications";
import { useRealtimeNotifications } from "../../hooks/useRealtimeNotifications";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("home");
  
  const [courses, setCourses] = useState<any[]>([]);
  const [zoomLinks, setZoomLinks] = useState<any[]>([]);
  const [youtubeLinks, setYoutubeLinks] = useState<any[]>([]);
  const [webPosts, setWebPosts] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [classLinks, setClassLinks] = useState<Record<string, string>>({});
  const [homework, setHomework] = useState<any[]>([]);
  const [staffs, setStaffs] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [examMarks, setExamMarks] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [eLearningType, setELearningType] = useState<"videos" | "posts">("videos");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [adminSettings, setAdminSettings] = useState<any>(null);
  const [activeMeetingUrl, setActiveMeetingUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<{subject: string, day: number} | null>(null);

  // Helper to get a color based on subject name
  const getSubjectColorClasses = (subjectName: string) => {
    const themes: Record<string, { bg: string, text: string, border: string, dot: string, tooltip: string }> = {
      indigo: { bg: 'bg-indigo-50', text: 'text-indigo-900', border: 'border-indigo-200', dot: 'bg-indigo-500', tooltip: 'text-indigo-300' },
      blue: { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200', dot: 'bg-blue-500', tooltip: 'text-blue-300' },
      emerald: { bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-200', dot: 'bg-emerald-500', tooltip: 'text-emerald-300' },
      rose: { bg: 'bg-rose-50', text: 'text-rose-900', border: 'border-rose-200', dot: 'bg-rose-500', tooltip: 'text-rose-300' },
      amber: { bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200', dot: 'bg-amber-500', tooltip: 'text-amber-300' },
      violet: { bg: 'bg-violet-50', text: 'text-violet-900', border: 'border-violet-200', dot: 'bg-violet-500', tooltip: 'text-violet-300' },
      cyan: { bg: 'bg-cyan-50', text: 'text-cyan-900', border: 'border-cyan-200', dot: 'bg-cyan-500', tooltip: 'text-cyan-300' },
      pink: { bg: 'bg-pink-50', text: 'text-pink-900', border: 'border-pink-200', dot: 'bg-pink-500', tooltip: 'text-pink-300' },
    };
    
    const colors = ["indigo", "blue", "emerald", "rose", "amber", "violet", "cyan", "pink"];
    let hash = 0;
    for (let i = 0; i < subjectName.length; i++) {
      hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = colors[Math.abs(hash) % colors.length];
    return themes[color];
  };
  const [filterSubject, setFilterSubject] = useState<string>("All");
  const [filterTeacher, setFilterTeacher] = useState<string>("All");
  const [hasPendingFees, setHasPendingFees] = useState(false);
  const [pendingMonthName, setPendingMonthName] = useState("");

  // Get student data from login or localStorage
  const [studentData, setStudentData] = useState<any>(location.state);
  const [enrolledClasses, setEnrolledClasses] = useState<string[]>([]);

  // Refresh student data to get latest zoomBlocked status
  const [currentStudentData, setCurrentStudentData] = useState<any>(null);

  const isChatOpen = activeTab === "chat";
  const { unreadCount, markAsRead } = useChatNotifications(studentData ? { id: studentData.id, name: studentData.name, role: "Student", grade: studentData.grade } : null, isChatOpen);

  const { notifications } = useHomeworkNotifications('student', studentData?.grade);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Real-time notifications for Zoom classes, etc.
  useRealtimeNotifications(studentData?.grade);

  useEffect(() => {
    // Clear app badge when dashboard is active
    if ('navigator' in window && 'clearAppBadge' in navigator) {
      (navigator as any).clearAppBadge().catch((err: any) => console.log('Badge not supported', err));
    }
  }, []);

  const handleQrScan = async (decodedText: string) => {
    setShowQrScanner(false);
    try {
      let data;
      try {
        data = JSON.parse(decodedText);
      } catch (e) {
        data = { id: decodedText };
      }

      if (data.type === 'student' || !data.type) {
        const students = await getStudents();
        const student = students.find((s: any) => s.id === data.id);
        if (student) {
          if (student.zoomBlocked) {
            alert("zoom வகுப்பிற்கான கட்டணம் செலுத்தியப் பின் இணைக்கப்படுவீர்கள்");
            return;
          }
          const newStudentData = {
            id: student.id,
            username: student.username,
            name: student.name,
            grade: student.grade,
            rollNo: student.rollNo,
            enrolledClasses: student.enrolledClasses || [],
            role: 'Student'
          };
          localStorage.setItem('userSession', JSON.stringify(newStudentData));
          setStudentData(newStudentData);
          setCurrentStudentData(student);
          alert(`Successfully logged in as ${student.name}`);
          return;
        }
      }
      alert("Invalid Student QR Code");
    } catch (error) {
      console.error("QR Login Error:", error);
      alert("QR Login failed");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let data = studentData;
    if (!data) {
      const session = localStorage.getItem('userSession');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          if (parsed.role === 'Student') {
            data = parsed;
            setStudentData(parsed);
          }
        } catch (e) {
          console.error("Invalid session data");
        }
      }
    }

    if (!data) {
      navigate("/");
      return;
    }

    setEnrolledClasses(data.subjects || data.enrolledClasses || []);
    setCurrentStudentData(data);

    const loadData = async () => {
      const allStudents = await getStudents();
      const freshStudentData = allStudents.find((s: any) => s.id === data.id);
      if (freshStudentData) {
        setCurrentStudentData(freshStudentData);
        setDisplayName(freshStudentData.name);
        setProfileImage(freshStudentData.image || null);
      }

      const allCourses = await getCourses();
      const allZoomLinks = await getZoomLinks();
      const allFees = await getFees();
      const allAttendance = await getAttendance();
      const allStaffs = await getStaffs();
      const allTimetable = await getTimeTable();
      const allExamMarks = await getExamMarks();
      const allClasses = await getClasses();
      const settings = await getAdminSettings();
      const allYoutubeLinks = await getYoutubeLinks();
      const allWebPosts = await getWebPosts();
      
      setCourses(allCourses.filter((c: any) => 
        c.grade?.toString().trim().toLowerCase() === data.grade?.toString().trim().toLowerCase()
      ));
      setZoomLinks(allZoomLinks.filter((z: any) => 
        z.grade?.toString().trim().toLowerCase() === data.grade?.toString().trim().toLowerCase()
      ));
      
      // Filter YouTube links and Web Posts by grade or isPublic
      setYoutubeLinks(allYoutubeLinks.filter((l: any) => 
        l.isPublic || 
        l.grade?.toString().trim().toLowerCase() === data.grade?.toString().trim().toLowerCase() || 
        l.grade?.toString().trim().toLowerCase() === "public"
      ));
      setWebPosts(allWebPosts.filter((p: any) => 
        p.isPublic || 
        p.grade?.toString().trim().toLowerCase() === data.grade?.toString().trim().toLowerCase() || 
        p.grade?.toString().trim().toLowerCase() === "public"
      ));

      const studentFees = allFees.filter((f: any) => f.studentId === data.id || f.studentName === data.name);
      setFees(studentFees);
      
      // Check for pending fees for current month
      const currentMonthStr = new Date().toISOString().slice(0, 7);
      const hasPaidCurrentMonth = studentFees.some((f: any) => f.month === currentMonthStr);
      if (!hasPaidCurrentMonth) {
        setHasPendingFees(true);
        const date = new Date();
        setPendingMonthName(date.toLocaleString('default', { month: 'long', year: 'numeric' }));
      }

      setAttendance(allAttendance.filter((a: any) => a.studentId === data.id));
      setClassLinks(await getClassLinks());
      setStaffs(allStaffs);
      setTimetable(allTimetable.filter((t: any) => 
        t.grade?.toString().trim().toLowerCase() === data.grade?.toString().trim().toLowerCase()
      ));
      setExamMarks(allExamMarks.filter((m: any) => m.studentId === data.id || m.studentName === data.name));
      setClasses(allClasses);
      setAdminSettings(settings);
      
      const allHomework = await getHomework();
      
      // Filter homework to only show assignments from the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      
      setHomework(allHomework.filter((h: any) => {
        if (h.grade?.toString().trim().toLowerCase() !== data.grade?.toString().trim().toLowerCase()) return false;
        const hwDate = new Date(h.date);
        return hwDate >= sevenDaysAgo;
      }));
    };
    loadData();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [navigate, location.state]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const [displayName, setDisplayName] = useState(studentData?.name || "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(displayName);
  const [profileImage, setProfileImage] = useState(studentData?.image || null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const students = await getStudents();
        const updatedStudents = students.map((s: any) => 
          s.id === studentData.id ? { ...s, image: base64String } : s
        );
        await saveStudents(updatedStudents);
        setProfileImage(base64String);
        studentData.image = base64String;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveName = () => {
    setDisplayName(tempName);
    setIsEditingName(false);
  };

  const handleDownloadIdCard = async (format: 'png' | 'pdf') => {
    const element = document.getElementById('student-id-card-template');
    if (!element) return;
    
    try {
      const imgData = await toPng(element, { pixelRatio: 3, backgroundColor: 'transparent' });
      
      if (format === 'png') {
        const link = document.createElement('a');
        link.download = `${studentData.name}_ID_Card.png`;
        link.href = imgData;
        link.click();
      } else {
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'in',
          format: [3.375, 2.125]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, 3.375, 2.125);
        pdf.save(`${studentData.name}_ID_Card.pdf`);
      }
    } catch (error) {
      console.error("Error generating ID card:", error);
      alert("Failed to generate ID card. Please try again.");
    }
  };

  const handleDownloadCertificate = async (format: 'png' | 'pdf') => {
    const element = document.getElementById('student-certificate-template');
    if (!element) return;
    
    try {
      const imgData = await toPng(element, { pixelRatio: 3, backgroundColor: 'transparent' });
      
      if (format === 'png') {
        const link = document.createElement('a');
        link.download = `${studentData.name}_Certificate.png`;
        link.href = imgData;
        link.click();
      } else {
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'in',
          format: [11, 8.5]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, 11, 8.5);
        pdf.save(`${studentData.name}_Certificate.pdf`);
      }
    } catch (error) {
      console.error("Error generating Certificate:", error);
      alert("Failed to generate Certificate. Please try again.");
    }
  };

  const formatMonth = (monthStr: string) => {
    if (!monthStr) return "";
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const handleJoinClass = async (linkUrl: string | null) => {
    // Check if zoom is blocked due to unpaid fees
    if (currentStudentData?.zoomBlocked) {
      alert("கட்டணம் செலுத்திய பின் தொடரவும் (Please pay the fee to continue)");
      return;
    }

    // Mark attendance automatically
    const today = new Date().toISOString().split('T')[0];
    const allAttendance = await getAttendance();
    const existing = allAttendance.find((a: any) => a.studentId === studentData.id && a.date === today);
    
    if (!existing) {
      allAttendance.push({
        id: Date.now().toString() + studentData.id,
        studentId: studentData.id,
        date: today,
        status: "Present"
      });
      await saveAttendance(allAttendance);
      // Update local state to reflect immediately
      setAttendance([...attendance, { id: Date.now().toString() + studentData.id, studentId: studentData.id, date: today, status: "Present" }]);
    }
    
    if (linkUrl) {
      // Try to format standard zoom links for web client to work in iframe
      let finalUrl = linkUrl;
      try {
        if (linkUrl.includes('zoom.us/j/')) {
          const urlParts = new URL(linkUrl);
          const meetingId = urlParts.pathname.split('/j/')[1];
          const pwd = urlParts.searchParams.get('pwd');
          // Base64 encode the student name to auto-fill the "Your Name" field in Zoom Web Client
          const encodedName = btoa(unescape(encodeURIComponent(studentData.name)));
          // Use the standard wc/join path which handles passcodes better
          finalUrl = `https://zoom.us/wc/join/${meetingId}?prefer=1&un=${encodedName}${pwd ? '&pwd=' + pwd : ''}`;
        } else if (linkUrl.includes('zoom.us/wc/join/')) {
          // If it's already a wc/join link, try to append the name
          const urlParts = new URL(linkUrl);
          const encodedName = btoa(unescape(encodeURIComponent(studentData.name)));
          if (!urlParts.searchParams.has('un')) {
            finalUrl = `${linkUrl}${linkUrl.includes('?') ? '&' : '?'}un=${encodedName}&prefer=1`;
          }
        } else if (linkUrl.includes('zoom.us/wc/')) {
          // Handle other wc formats
          const urlParts = new URL(linkUrl);
          const meetingId = urlParts.pathname.split('/wc/')[1].split('/')[0];
          const pwd = urlParts.searchParams.get('pwd');
          const encodedName = btoa(unescape(encodeURIComponent(studentData.name)));
          finalUrl = `https://zoom.us/wc/join/${meetingId}?prefer=1&un=${encodedName}${pwd ? '&pwd=' + pwd : ''}`;
        }
      } catch (e) {
        console.error("Error formatting zoom link", e);
      }
      
      // In-app zoom using iframe
      setActiveMeetingUrl(finalUrl);
    } else {
      alert("Attendance Marked Successfully!");
    }
  };

  const navItems = [
    { id: "profile", name: "Profile", icon: <User size={24} /> },
    { id: "home", name: "Home", icon: <Home size={24} /> },
    { id: "subjects", name: "My Subjects", icon: <Book size={24} /> },
    { id: "timetable", name: "Timetable", icon: <Calendar size={24} /> },
    { id: "homework", name: "Homework", icon: <BookOpen size={24} /> },
    { id: "fees", name: "Fees", icon: <DollarSign size={24} /> },
    { id: "website", name: "Website", icon: <Globe size={24} /> },
  ];

  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.error("Wake Lock error:", err);
      }
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && activeMeetingUrl) {
        requestWakeLock();
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    if (activeMeetingUrl) {
      requestWakeLock();
      handleResize(); // initial check
      window.addEventListener('resize', handleResize);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    }
    
    return () => {
      if (wakeLock) {
        wakeLock.release().catch(console.error);
      }
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [activeMeetingUrl]);

  if (!studentData) {
    return null;
  }

  if (activeMeetingUrl) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col" id="zoom-container">
        {(!isFullscreen && !isLandscape) && (
          <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
            <h2 className="text-lg font-bold flex items-center">
              <Video size={20} className="mr-2 text-blue-400" />
              Live Class
            </h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={async () => {
                  try {
                    const elem = document.getElementById('zoom-container');
                    if (elem) {
                      if (!document.fullscreenElement) {
                        // User gesture needed
                        if (elem.requestFullscreen) {
                          await elem.requestFullscreen({ navigationUI: "hide" });
                        } else if ((elem as any).webkitRequestFullscreen) {
                          await (elem as any).webkitRequestFullscreen();
                        }
                      }
                    }
                    
                    const screenOrientation: any = window.screen && window.screen.orientation;
                    if (screenOrientation && screenOrientation.lock) {
                      if (!document.fullscreenElement) {
                        await screenOrientation.lock('landscape');
                      }
                    }
                  } catch (err) {
                    console.error("Rotation/Fullscreen failed:", err);
                    alert("Please rotate your device physically to view in landscape mode.");
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md font-medium flex items-center gap-1.5"
                title="Fullscreen & Rotate"
              >
                <RotateCw size={18} />
                <span className="hidden sm:inline">Fullscreen</span>
              </button>
              <button 
                onClick={() => {
                  if (document.fullscreenElement) {
                    if (document.exitFullscreen) {
                      document.exitFullscreen().catch(err => console.error(err));
                    } else if ((document as any).webkitExitFullscreen) {
                      (document as any).webkitExitFullscreen().catch((err: any) => console.error(err));
                    }
                  }
                  if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
                    window.screen.orientation.unlock();
                  }
                  setActiveMeetingUrl(null);
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium flex items-center"
              >
                <LogOut size={18} className="mr-2" />
                Leave Class
              </button>
            </div>
          </div>
        )}

        {(isFullscreen || isLandscape) && (
          <button 
            onClick={() => {
              if (document.fullscreenElement) {
                if (document.exitFullscreen) {
                  document.exitFullscreen().catch(err => console.error(err));
                } else if ((document as any).webkitExitFullscreen) {
                  (document as any).webkitExitFullscreen().catch((err: any) => console.error(err));
                }
              }
              if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
                window.screen.orientation.unlock();
              }
              // If only in landscape (not fullscreen via API), just leave class when clicking X
              if (!document.fullscreenElement) {
                setActiveMeetingUrl(null);
              }
            }}
            className="absolute top-4 right-4 z-[10000] bg-black/50 hover:bg-red-600/90 text-white p-3 rounded-full backdrop-blur-sm transition-all"
            title={document.fullscreenElement ? "Exit Fullscreen" : "Leave Class"}
          >
            {document.fullscreenElement ? <X size={24} /> : <LogOut size={24} />}
          </button>
        )}

        {/* Added pb-12 only when not in fullscreen/landscape to push the Zoom toolbar up */}
        <div className={`flex-1 w-full h-full ${(!isFullscreen && !isLandscape) ? 'pb-12' : ''} bg-black relative`}>
          <iframe 
            src={activeMeetingUrl} 
            className="w-full h-full border-none"
            allow="camera *; microphone *; display-capture *; autoplay *; fullscreen *; clipboard-read; clipboard-write; speaker *"
            allowFullScreen
            title="Zoom Class"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative">
      <CursorTrail />
      <PopupAnnouncement userRole="Students" />
      
      {/* Pending Fees Reminder Banner */}
      {hasPendingFees && (
        <div className="bg-rose-500 text-white px-4 py-3 shadow-md flex items-center justify-between z-50 animate-pulse">
          <div className="flex items-center gap-2">
            <DollarSign size={20} className="shrink-0" />
            <p className="text-sm font-medium">
              Reminder: Your fees for <span className="font-bold">{pendingMonthName}</span> are pending. Please pay to avoid access restrictions.
            </p>
          </div>
          <button 
            onClick={() => setActiveTab("fees")}
            className="bg-white text-rose-600 px-3 py-1 rounded-full text-xs font-bold shadow-sm hover:bg-rose-50 transition-colors whitespace-nowrap ml-4"
          >
            Pay Now
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 text-slate-800 p-4 flex items-center justify-between shadow-sm sticky top-0 z-40">
        <div className="flex items-center">
          {profileImage ? (
            <img src={profileImage} alt="Profile" className="w-10 h-10 object-cover rounded-full shadow-sm mr-3 border-2 border-indigo-100" />
          ) : (
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3 shadow-sm border-2 border-indigo-50">
              <User size={22} className="text-indigo-600" />
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">
              {displayName}
            </h1>
            <p className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-0.5">{studentData.grade}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {isInstallable && (
            <button
              onClick={handleInstallClick}
              className="flex items-center space-x-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Install App</span>
            </button>
          )}
          <div className="relative" ref={notificationsRef}>
            <button 
              className="relative p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
              )}
            </button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
                >
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800">Notifications</h3>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                      {notifications.length} New
                    </span>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        <Bell className="mx-auto mb-2 text-gray-300" size={24} />
                        <p>No new notifications</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div key={notif.id} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => { setActiveTab('homework'); setShowNotifications(false); }}>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                              <BookOpen size={16} className="text-blue-600" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-gray-800">{notif.title}</h4>
                              <p className="text-xs text-gray-600 mt-1">{notif.message}</p>
                              <span className="text-[10px] text-gray-400 mt-2 block">{notif.date}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={() => setShowQrScanner(true)}
            className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-full transition-colors"
            title="Scan ID Card to Login"
          >
            <QrCode size={20} />
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('userSession');
              navigate("/");
            }}
            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-full transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className={`flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-transparent pb-32 ${activeTab === 'chat' ? 'flex flex-col p-0 md:p-0 lg:p-0' : 'max-w-7xl mx-auto w-full'}`}>
        {currentStudentData?.zoomBlocked && (
          <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-4 rounded-lg shadow-sm mb-6 flex items-start gap-3">
            <Bell className="shrink-0 mt-0.5 text-rose-500" size={20} />
            <div>
              <h3 className="font-bold text-lg">கட்டண அறிவிப்பு (Fee Notice)</h3>
              <p className="text-sm mt-1 text-rose-700">
                மாதக் கட்டணம் செலுத்தப்படவில்லை. தயவுசெய்து கட்டணத்தைச் செலுத்தி வகுப்புகளில் தொடரவும். (Monthly fee not paid. Please pay the fee to continue joining live classes.)
              </p>
            </div>
          </div>
        )}

        {activeTab !== "home" && activeTab !== "chat" && (
          <button 
            onClick={() => setActiveTab("home")}
            className="mb-6 text-slate-500 font-medium flex items-center hover:text-slate-800 transition-colors bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200 w-fit"
          >
            ← Back to Home
          </button>
        )}

        {activeTab === "home" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-6 sm:p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
              <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-pink-500 opacity-20 rounded-full blur-xl"></div>
              <div className="relative z-10">
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                  Welcome back, {displayName.split(' ')[0]}! 👋
                </h2>
                <p className="text-indigo-100 max-w-lg text-sm sm:text-base">
                  Ready to learn? Access your subjects, homework, and live classes from your personal dashboard.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
              <div
                onClick={() => setActiveTab("subjects")}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group"
              >
                <div className="w-14 h-14 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-pink-100 transition-colors">
                  <Book size={28} />
                </div>
                <span className="font-bold text-slate-700 text-sm sm:text-base">My Subjects</span>
              </div>

              <div
                onClick={() => setActiveTab("courses")}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group"
              >
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-indigo-100 transition-colors">
                  <Link size={28} />
                </div>
                <span className="font-bold text-slate-700 text-sm sm:text-base">Recording</span>
              </div>

              <div
                onClick={() => setActiveTab("homework")}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group"
              >
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                  <BookOpen size={28} />
                </div>
                <span className="font-bold text-slate-700 text-sm sm:text-base">Homework</span>
              </div>

              <div
                onClick={() => setActiveTab("attendance")}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group"
              >
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-emerald-100 transition-colors">
                  <Calendar size={28} />
                </div>
                <span className="font-bold text-slate-700 text-sm sm:text-base">Attendance</span>
              </div>

              <div
                onClick={() => setActiveTab("youtube")}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group"
              >
                <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-rose-100 transition-colors">
                  <Youtube size={28} />
                </div>
                <span className="font-bold text-slate-700 text-sm sm:text-base">E-Learning</span>
              </div>

              <div
                onClick={() => setActiveTab("marks")}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group"
              >
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-emerald-100 transition-colors">
                  <Award size={28} />
                </div>
                <span className="font-bold text-slate-700 text-sm sm:text-base">Marks</span>
              </div>

              <div
                onClick={() => setActiveTab("rules")}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group"
              >
                <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-rose-100 transition-colors">
                  <ShieldAlert size={28} />
                </div>
                <span className="font-bold text-slate-700 text-sm sm:text-base text-center line-clamp-1">Rules</span>
              </div>

              <div
                onClick={() => setActiveTab("fees")}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group"
              >
                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-amber-100 transition-colors">
                  <DollarSign size={28} />
                </div>
                <span className="font-bold text-slate-700 text-sm sm:text-base">Fees</span>
              </div>

              <div
                onClick={() => {
                  setActiveTab("chat");
                  markAsRead();
                }}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group relative sm:col-span-1 md:col-span-1"
              >
                {unreadCount > 0 && (
                  <span className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white shadow-sm border-2 border-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-purple-100 transition-colors">
                  <MessageCircle size={28} />
                </div>
                <span className="font-bold text-slate-700 text-sm sm:text-base text-center">Live Chat</span>
              </div>

              <a
                href={`https://wa.me/94778054232?text=${encodeURIComponent(`வணக்கம் அகரம் தினேஸ் ஐயா அவர்களே! எனது பிள்ளை பெயர்: ${studentData.name}, தரம்: ${studentData.grade}, மாவட்டம்: ${studentData.district || 'N/A'}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group relative sm:col-span-1 md:col-span-1"
              >
                <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-green-100 transition-colors">
                  <WhatsAppIcon size={28} />
                </div>
                <span className="font-bold text-slate-700 text-sm sm:text-base text-center">WhatsApp</span>
              </a>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upcoming Subject Classes */}
              {enrolledClasses.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mr-3">
                      <Video size={16} />
                    </div>
                    Upcoming Classes
                  </h3>
                  <div className="space-y-3">
                    {zoomLinks
                      .filter(z => enrolledClasses.includes(z.subject))
                      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
                      .slice(0, 3) // Show next 3
                      .map(z => (
                        <div key={z.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 bg-slate-50 rounded-xl border border-slate-100 gap-3">
                          <div>
                            <p className="font-bold text-slate-800">{z.title}</p>
                            <p className="text-sm font-medium text-indigo-600 mb-1">{z.subject}</p>
                            <div className="flex items-center gap-2">
                              <Clock size={14} className="text-slate-400" />
                              <p className="text-xs text-slate-500">{new Date(z.datetime).toLocaleString()}</p>
                            </div>
                            <div className="mt-2 inline-block">
                              <CountdownTimer targetDate={z.datetime} />
                            </div>
                          </div>
                          <button 
                            onClick={() => handleJoinClass(z.link)}
                            className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 text-sm shadow-sm transition-colors w-full sm:w-auto text-center"
                          >
                            Join Class
                          </button>
                        </div>
                      ))}
                    {zoomLinks.filter(z => enrolledClasses.includes(z.subject)).length === 0 && (
                      <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                        <Calendar className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                        <p className="text-slate-500 text-sm">No upcoming classes scheduled.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Main Class Link Section */}
              {classLinks[studentData.grade] && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm border border-blue-100 p-6 flex flex-col justify-center">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                      <Video size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">
                      Live Zoom Class
                    </h3>
                    <p className="text-slate-600">Join your regular class sessions for <span className="font-bold text-indigo-600">{studentData.grade}</span></p>
                  </div>
                  <button 
                    onClick={() => handleJoinClass(classLinks[studentData.grade])}
                    className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md flex items-center justify-center gap-2 text-lg"
                  >
                    <Video size={20} />
                    Join & Mark Attendance
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "subjects" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <h2 className="text-2xl font-bold mb-2 text-slate-800 flex items-center">
                <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center mr-3">
                  <Book size={20} />
                </div>
                My Subjects
              </h2>
              <p className="text-slate-500 mb-8 ml-13">View your class details and schedules.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Find all unique subjects offered for this grade from classes */}
                {(classes.find(c => c.name === studentData.grade)?.subjects || []).map((subjectName: any) => {
                  const isEnrolled = enrolledClasses.includes(subjectName);
                  const staffForSubject = staffs.filter((s: any) => s.assignedClasses?.some((c: any) => c.grade === studentData.grade && c.subject === subjectName));
                  const subjectTimetable = timetable.filter(t => t.subject === subjectName);
                  const subjectZoomLinks = zoomLinks.filter(z => z.subject === subjectName);
                  
                  // Only display subjects the student is enrolled in, or if enrolledClasses is completely empty (fallback for older students)
                  if (!isEnrolled && enrolledClasses.length > 0) return null;

                  return (
                    <div key={subjectName} className={`p-5 rounded-2xl shadow-sm border transition-all duration-200 bg-indigo-50/50 border-indigo-200`}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-slate-800">{subjectName}</h3>
                          <p className="text-sm text-slate-500 font-medium mt-1 flex items-center gap-1">
                            <User size={14} /> <span className="text-indigo-600">{staffForSubject.map((s: any) => s.name).join(', ') || 'TBA'}</span>
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-4 text-sm text-slate-600">
                          <>
                            <div className="mt-4 pt-4 border-t border-slate-200/60">
                              <p className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Calendar size={16} className="text-indigo-500"/> Timetable</p>
                              {subjectTimetable.length > 0 ? (
                                <div className="space-y-2">
                                  {subjectTimetable.map(t => (
                                    <div key={t.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                      <div className="flex flex-col">
                                        <span className="font-bold text-slate-700">{t.day}</span>
                                        {t.zoomLinkUrl && (
                                          <a 
                                            href={t.zoomLinkUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-bold mt-1 transition-colors"
                                          >
                                            <Video size={12} /> Join Class
                                          </a>
                                        )}
                                      </div>
                                      <span className="text-indigo-700 font-bold text-xs bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                                        {t.startTime} - {t.endTime}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-slate-400 italic text-sm bg-slate-50 p-3 rounded-lg border border-slate-100 border-dashed text-center">No timetable set.</p>
                              )}
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-slate-200/60">
                              <p className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Video size={16} className="text-pink-500"/> Upcoming Zoom Classes</p>
                              {subjectZoomLinks.length > 0 ? (
                                <div className="space-y-3">
                                  {subjectZoomLinks.map(z => (
                                    <div key={z.id} className="bg-white p-4 rounded-xl border border-pink-100 shadow-sm">
                                      <p className="font-bold text-slate-800 mb-1">{z.title}</p>
                                      <div className="flex items-center gap-2 mb-3">
                                        <Clock size={14} className="text-slate-400" />
                                        <p className="text-xs font-medium text-slate-500">{new Date(z.datetime).toLocaleString()}</p>
                                      </div>
                                      <div className="flex flex-col gap-1 mb-3">
                                        {z.meetingId && <p className="text-xs text-slate-600 flex justify-between"><span>Meeting ID:</span> <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{z.meetingId}</span></p>}
                                        {z.passcode && <p className="text-xs text-slate-600 flex justify-between"><span>Passcode:</span> <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{z.passcode}</span></p>}
                                      </div>
                                      <div className="flex items-center gap-2 mt-2">
                                        <button 
                                          onClick={() => handleJoinClass(z.link)} 
                                          className="flex-1 text-xs font-bold bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-center"
                                        >
                                          Join Link
                                        </button>
                                        <button 
                                          onClick={() => handleJoinClass(null)} 
                                          className="flex-1 text-xs font-bold bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-center"
                                        >
                                          Attendance
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-slate-400 italic text-sm bg-slate-50 p-3 rounded-lg border border-slate-100 border-dashed text-center">No upcoming classes.</p>
                              )}
                            </div>

                            {courses.filter(c => c.subject === subjectName).length > 0 && (
                              <div className="mt-4 pt-4 border-t border-slate-200/60">
                                <p className="font-bold text-slate-800 mb-3 flex items-center gap-2"><FileText size={16} className="text-blue-500"/> Course Materials</p>
                                <div className="space-y-2">
                                  {courses.filter(c => c.subject === subjectName).map(course => (
                                    <a 
                                      key={course.id} 
                                      href={course.link} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="flex items-center justify-between bg-blue-50 hover:bg-blue-100 p-3 rounded-xl border border-blue-100 transition-colors group"
                                    >
                                      <span className="font-bold text-blue-900 text-sm">{course.title}</span>
                                      <Link size={16} className="text-blue-500 group-hover:text-blue-700 transition-colors" />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                      </div>
                    </div>
                  );
                })}
                
                {staffs.flatMap(s => s.assignedClasses?.filter((c: any) => c.grade === studentData.grade) || []).length === 0 && (
                  <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-200 border-dashed">
                    <Book className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    <p>No subjects currently available for {studentData.grade}.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "timetable" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2 text-slate-800 flex items-center">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mr-3">
                      <Calendar size={20} />
                    </div>
                    My Timetable
                  </h2>
                  <p className="text-slate-500 ml-13">Schedule for your subjects.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <select
                    className="border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                    value={filterSubject}
                    onChange={(e) => setFilterSubject(e.target.value)}
                  >
                    <option value="All">All Subjects</option>
                    {Array.from(new Set(timetable.map(t => t.subject))).map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                  <select
                    className="border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                    value={filterTeacher}
                    onChange={(e) => setFilterTeacher(e.target.value)}
                  >
                    <option value="All">All Teachers</option>
                    {Array.from(new Set(timetable.map(t => t.staffName))).map(teacher => (
                      <option key={teacher} value={teacher}>{teacher}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {(() => {
                let filteredTimetable = enrolledClasses.length > 0 
                  ? timetable.filter(t => enrolledClasses.includes(t.subject))
                  : timetable;
                  
                if (filterSubject !== "All") {
                  filteredTimetable = filteredTimetable.filter(t => t.subject === filterSubject);
                }
                if (filterTeacher !== "All") {
                  filteredTimetable = filteredTimetable.filter(t => t.staffName === filterTeacher);
                }

                const displaySubjects = Array.from(new Set(filteredTimetable.map(t => t.subject)));

                if (displaySubjects.length === 0) {
                  return (
                    <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                      <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                      <p>No timetable entries available for your filters.</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {displaySubjects.map((subject: any) => {
                      const subjectStr = String(subject);
                      const subjectTimetable = filteredTimetable.filter(t => t.subject === subjectStr);

                      const scheduledDays = subjectTimetable.map(t => t.day?.trim());
                    
                    // Calendar logic
                    const currentDate = new Date();
                    const currentMonth = currentDate.getMonth();
                    const currentYear = currentDate.getFullYear();
                    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 (Sun) to 6 (Sat)
                    
                    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
                    const blanksArray = Array.from({ length: firstDayOfMonth }, (_, i) => i);
                    
                    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                    const shortDayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                    const monthName = currentDate.toLocaleString('default', { month: 'long' });

                    return (
                      <div key={subjectStr} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
                          <h3 className="font-bold text-slate-800 text-lg">{subjectStr}</h3>
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">{monthName} {currentYear}</span>
                        </div>
                        <div className="p-5">
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {shortDayNames.map(day => (
                              <div key={day} className="text-center text-[10px] uppercase tracking-wider font-bold text-slate-400 py-1">
                                {day}
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {blanksArray.map(blank => (
                              <div key={`blank-${blank}`} className="p-2"></div>
                            ))}
                            {daysArray.map(day => {
                              const date = new Date(currentYear, currentMonth, day);
                              const dayOfWeekName = dayNames[date.getDay()];
                              const isScheduled = scheduledDays.includes(dayOfWeekName);
                              const classDetails = subjectTimetable.find(t => t.day?.trim() === dayOfWeekName);
                              const theme = getSubjectColorClasses(subjectStr);
                              
                              return (
                                <div 
                                  key={day} 
                                  className={`relative flex flex-col items-center justify-center p-2 rounded-xl text-sm transition-all duration-200 ${
                                    isScheduled 
                                      ? `${theme.bg} ${theme.text} font-bold border ${theme.border} shadow-sm` 
                                      : 'text-slate-500 hover:bg-slate-50'
                                  }`}
                                  onMouseEnter={() => isScheduled && setHoveredDay({ subject: subjectStr, day })}
                                  onMouseLeave={() => setHoveredDay(null)}
                                >
                                  <span>{day}</span>
                                  {isScheduled && (
                                    <div className={`w-1.5 h-1.5 ${theme.dot} rounded-full mt-1`}></div>
                                  )}

                                  <AnimatePresence>
                                    {hoveredDay?.subject === subject && hoveredDay?.day === day && classDetails && (
                                      <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 bg-slate-800 text-white p-4 rounded-xl shadow-xl text-xs pointer-events-none border border-slate-700"
                                      >
                                        <div className="font-bold border-b border-slate-600 pb-2 mb-2 flex items-center gap-2 text-sm">
                                          <Clock size={14} className="text-indigo-400" /> {classDetails.startTime} - {classDetails.endTime}
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-300 mb-1">
                                          <User size={12} /> {classDetails.staffName}
                                        </div>
                                        <div className="flex items-center gap-2 text-indigo-300 font-medium">
                                          <Info size={12} /> Scheduled Class
                                        </div>
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* Legend / Details */}
                          {subjectTimetable.length > 0 ? (
                            <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
                              {subjectTimetable.map(cls => {
                                const hasZoomLink = zoomLinks.some(z => z.grade === cls.grade && z.subject === cls.subject);
                                return (
                                <div key={cls.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                  <span className="font-bold text-slate-700 flex items-center gap-2">
                                    {cls.day}s
                                    {hasZoomLink && <Video size={16} className="text-blue-500" title="Zoom Link Available" />}
                                  </span>
                                  <div className="text-right flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-indigo-700 font-bold bg-indigo-50 px-2 py-1 rounded-md text-xs border border-indigo-100">{cls.startTime} - {cls.endTime}</span>
                                      {cls.zoomLinkUrl && (
                                        <a 
                                          href={cls.zoomLinkUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="bg-blue-600 text-white text-[10px] px-2.5 py-1 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1 font-bold shadow-sm"
                                        >
                                          <Video size={10} /> Join
                                        </a>
                                      )}
                                    </div>
                                    <span className="text-slate-500 text-xs font-medium flex items-center gap-1"><User size={10}/> {cls.staffName}</span>
                                  </div>
                                </div>
                              )})}
                            </div>
                          ) : (
                            <div className="mt-6 pt-4 border-t border-slate-100 text-center text-sm text-slate-400 italic">
                              No schedule set yet.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                    {displaySubjects.length > 0 && filteredTimetable.filter(t => displaySubjects.includes(t.subject)).length === 0 && (
                      <div className="col-span-full text-center py-6 text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 border-dashed mt-4">
                        <p>No timetable entries have been added by the admin for your subjects yet.</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "courses" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
              <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <FileText size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Recording</h2>
                    <p className="text-indigo-100 text-xs font-medium">Access your learning materials</p>
                  </div>
                </div>
                <button 
                  onClick={() => window.open("https://www.agaramdhines.lk/courses/", "_blank")}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 backdrop-blur-sm"
                >
                  <span>Open in New Tab</span>
                  <ExternalLink size={14} />
                </button>
              </div>
              <div className="flex-1 bg-slate-50 relative">
                {/* Loading state could go here if needed, but iframe handles its own loading usually */}
                <iframe 
                  src="https://www.agaramdhines.lk/courses/" 
                  className="absolute inset-0 w-full h-full border-0" 
                  title="Recording"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "youtube" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                  <h2 className="text-2xl font-bold mb-1 text-slate-800 flex items-center">
                    <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mr-3">
                      <Youtube size={20} />
                    </div>
                    E-Learning Center
                  </h2>
                  <p className="text-slate-500 ml-13">Everything you need to learn at home.</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                  <button 
                    onClick={() => setELearningType("videos")}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${eLearningType === 'videos' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Videos
                  </button>
                  <button 
                    onClick={() => setELearningType("posts")}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${eLearningType === 'posts' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Web Posts
                  </button>
                </div>
              </div>
              
              {eLearningType === 'videos' ? (
                <div className="space-y-12">
                  {youtubeLinks.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                      <Youtube className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                      <p>No videos found.</p>
                    </div>
                  ) : (
                    <div className="space-y-12">
                      {Object.entries(youtubeLinks.reduce((acc: any, link: any) => {
                        const folder = link.folder || "Uncategorized";
                        if (!acc[folder]) acc[folder] = [];
                        acc[folder].push(link);
                        return acc;
                      }, {})).map(([folder, folderLinks]: [string, any]) => (
                        <div key={folder} className="space-y-4">
                          <div className="flex items-center justify-between px-1">
                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                               <div className="w-2 h-6 bg-red-600 rounded-full"></div>
                               {folder}
                            </h3>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                              {folderLinks.length} Videos
                            </span>
                          </div>
                          
                          <div className="relative group">
                            <div className="flex overflow-x-auto gap-6 pb-6 pt-2 px-1 snap-x scrollbar-hide no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                              {folderLinks.map((link: any) => (
                                <motion.a 
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  key={link.id} 
                                  href={link.link} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="flex-shrink-0 w-[280px] sm:w-[320px] bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:border-red-200 transition-all group/item snap-start"
                                >
                                  <div className="aspect-video bg-slate-100 relative overflow-hidden">
                                    {link.link.includes('youtube.com/watch?v=') || link.link.includes('youtu.be/') ? (
                                      <img 
                                        src={`https://img.youtube.com/vi/${link.link.includes('youtu.be/') ? link.link.split('youtu.be/')[1].split('?')[0] : link.link.split('v=')[1].split('&')[0]}/mqdefault.jpg`} 
                                        alt={link.title}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-110"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <Youtube size={48} />
                                      </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/20 group-hover/item:bg-transparent transition-colors flex items-center justify-center">
                                      <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white opacity-90 group-hover/item:scale-110 transition-transform shadow-lg">
                                        <Play size={24} className="ml-1" />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                        {link.subject}
                                      </span>
                                    </div>
                                    <h3 className="font-bold text-slate-800 line-clamp-2 group-hover/item:text-red-600 transition-colors leading-tight min-h-[2.5rem]">{link.title}</h3>
                                    <div className="mt-4 flex items-center justify-between">
                                      <p className="text-[10px] text-slate-500 flex items-center gap-1 font-black uppercase tracking-wider">
                                        <Youtube size={12} className="text-red-500" /> Watch Now
                                      </p>
                                      {link.date && (
                                        <span className="text-[10px] font-bold text-slate-400">
                                          {new Date(link.date).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </motion.a>
                              ))}
                            </div>
                            
                            {/* Horizontal Scroll Hint Overlay */}
                            <div className="absolute right-0 top-0 bottom-6 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-12">
                  {webPosts.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                      <FileText className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                      <p>No web posts found.</p>
                    </div>
                  ) : (
                    <div className="space-y-12">
                      {Object.entries(webPosts.reduce((acc: any, post: any) => {
                        const folder = post.folder || "General Materials";
                        if (!acc[folder]) acc[folder] = [];
                        acc[folder].push(post);
                        return acc;
                      }, {})).map(([folder, folderPosts]: [string, any]) => (
                        <div key={folder} className="space-y-4">
                          <div className="flex items-center justify-between px-1">
                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                               <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
                               {folder}
                            </h3>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                              {folderPosts.length} Posts
                            </span>
                          </div>

                          <div className="relative group">
                            <div className="flex overflow-x-auto gap-6 pb-6 pt-2 px-1 snap-x no-scrollbar scroll-smooth" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                              {folderPosts.map((post: any) => (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  key={post.id} 
                                  className="flex-shrink-0 w-[290px] sm:w-[350px] bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all group/post snap-start flex flex-col h-full"
                                >
                                  <div className="flex justify-between items-start gap-3 mb-4">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                          {post.subject}
                                        </span>
                                      </div>
                                      <h3 className="text-base font-black text-slate-800 leading-tight group-hover/post:text-indigo-600 transition-colors line-clamp-2 min-h-[2.5rem]">{post.title}</h3>
                                    </div>
                                    <button 
                                      onClick={() => {
                                        const shareUrl = post.link || window.location.href;
                                        if (navigator.share) {
                                          navigator.share({ title: post.title, text: post.content, url: shareUrl });
                                        } else {
                                          navigator.clipboard.writeText(shareUrl);
                                          alert("Link copied to clipboard!");
                                        }
                                      }}
                                      className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-sm border border-slate-100 rounded-xl transition-all shrink-0"
                                    >
                                      <Share2 size={16} />
                                    </button>
                                  </div>

                                  {post.imageUrl && (
                                    <div className="mb-4 aspect-[16/10] rounded-xl overflow-hidden border border-slate-100 shadow-inner">
                                       <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover group-hover/post:scale-110 transition-transform duration-700" />
                                    </div>
                                  )}

                                  <div className="prose prose-slate prose-xs max-w-none text-slate-600 bg-slate-50/50 p-4 rounded-xl border border-slate-100/50 mb-4 flex-1 line-clamp-4">
                                     {post.content.split('\n').slice(0, 3).map((line: string, i: number) => (
                                       <p key={i} className="mb-2 last:mb-0 text-xs leading-relaxed font-medium">
                                         {line}
                                       </p>
                                     ))}
                                  </div>

                                  <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-auto">
                                    <div className="flex flex-col">
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">PUBLISHED ON</span>
                                      <span className="text-[10px] font-bold text-slate-500">
                                        {post.date ? new Date(post.date).toLocaleDateString() : 'N/A'}
                                      </span>
                                    </div>
                                    {post.link && (
                                      <a 
                                        href={post.link} 
                                        target="_blank" 
                                        rel="noopener" 
                                        className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:gap-2 transition-all p-2 bg-indigo-50 rounded-lg"
                                      >
                                        READ <ExternalLink size={12} />
                                      </a>
                                    )}
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                            {/* Horizontal Scroll Hint Overlay */}
                            <div className="absolute right-0 top-0 bottom-6 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}
        {activeTab === "homework" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <h2 className="text-2xl font-bold mb-2 text-slate-800 flex items-center">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mr-3">
                  <FileText size={20} />
                </div>
                Recent Homework
              </h2>
              <p className="text-slate-500 mb-8 ml-13">View your assigned homework.</p>
              
              <div className="space-y-4">
                {homework.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                    <CheckCircle className="mx-auto h-12 w-12 text-emerald-400 mb-3" />
                    <p className="font-medium text-slate-700">All caught up!</p>
                    <p className="text-sm mt-1">No homework assigned yet for your grade.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {homework.map((hw: any) => (
                      <div key={hw.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-amber-200 transition-all">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-bold text-slate-800 text-lg">{hw.title}</h3>
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 mt-1 inline-block">{hw.subject}</span>
                          </div>
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg flex items-center gap-1">
                            <Calendar size={12} /> Assigned: {hw.date}
                          </span>
                        </div>
                        <p className="text-slate-600 text-sm whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100">{hw.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "attendance" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <h2 className="text-2xl font-bold mb-2 text-slate-800 flex items-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mr-3">
                  <CheckCircle size={20} />
                </div>
                Attendance Record
              </h2>
              <p className="text-slate-500 mb-8 ml-13">Track your class attendance history.</p>
              
              <div className="space-y-4">
                {attendance.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                    <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    <p>No attendance records found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {attendance.map((record: any) => (
                      <div key={record.id} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 flex flex-col items-center justify-center border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">{new Date(record.date).toLocaleString('default', { month: 'short' })}</span>
                            <span className="text-sm font-bold text-slate-700 leading-none mt-0.5">{new Date(record.date).getDate()}</span>
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 text-sm">{new Date(record.date).toLocaleDateString(undefined, { weekday: 'long' })}</h3>
                            <p className="text-xs text-slate-500">{new Date(record.date).getFullYear()}</p>
                          </div>
                        </div>
                        <div>
                          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                            record.status === "Present" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : 
                            record.status === "Absent" ? "bg-rose-100 text-rose-700 border border-rose-200" : 
                            record.status === "Leave" ? "bg-amber-100 text-amber-700 border border-amber-200" : 
                            record.status === "Late" ? "bg-orange-100 text-orange-700 border border-orange-200" : 
                            "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}>
                            {record.status === "Present" && <CheckCircle size={12} />}
                            {record.status === "Absent" && <XCircle size={12} />}
                            {record.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "marks" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <h2 className="text-2xl font-bold mb-2 text-slate-800 flex items-center">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mr-3">
                  <Award size={20} />
                </div>
                Exam Marks / Results
              </h2>
              <p className="text-slate-500 mb-8 ml-13">View your academic performance and exam results.</p>
              
              <div className="space-y-6">
                {examMarks.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                    <Award className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    <p>No exam marks found yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {examMarks.map((mark: any) => {
                      const obtained = Number(mark.obtained) || 0;
                      const total = Number(mark.total) || 100;
                      const percentage = (obtained / total) * 100;
                      
                      const getGrade = (p: number) => {
                        if (p >= 75) return { text: 'A', color: 'text-emerald-600' };
                        if (p >= 65) return { text: 'B', color: 'text-blue-600' };
                        if (p >= 50) return { text: 'C', color: 'text-indigo-600' };
                        if (p >= 35) return { text: 'S', color: 'text-amber-600' };
                        return { text: 'W', color: 'text-rose-600' };
                      };
                      
                      const grade = getGrade(percentage);

                      return (
                        <div key={mark.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                          <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">{mark.exam || "Term Exam"}</h3>
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                              {mark.subject}
                            </span>
                          </div>
                          <div className="p-5">
                            <div className="flex justify-between items-center mb-4">
                              <div>
                                <p className="text-sm font-bold text-slate-900">{mark.subject}</p>
                                <p className="text-xs text-slate-500">{mark.date || new Date().toLocaleDateString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-black text-indigo-600">{obtained}<span className="text-sm text-slate-400 font-normal">/{total}</span></p>
                                <p className={`text-xs font-bold ${grade.color}`}>
                                  Grade: {grade.text} ({percentage.toFixed(1)}%)
                                </p>
                              </div>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                className={`h-full rounded-full ${
                                  percentage >= 75 ? 'bg-emerald-500' : 
                                  percentage >= 50 ? 'bg-indigo-500' :
                                  'bg-rose-500'
                                }`}
                              />
                            </div>
                            {mark.remarks && (
                              <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 italic text-xs text-slate-600">
                                " {mark.remarks} "
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "rules" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <h2 className="text-2xl font-bold mb-2 text-slate-800 flex items-center">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mr-3">
                  <ShieldAlert size={20} />
                </div>
                விதிமுறைகள் மற்றும் நிபந்தனைகள் (Rules & Regulations)
              </h2>
              <p className="text-slate-500 mb-8 ml-13">மாணவர்கள் தங்கள் கற்றல் சூழலை மரியாதையுடனும், ஒழுக்கத்துடனும் பேணுவதற்கு இது உதவும்.</p>
              
              <div className="grid grid-cols-1 gap-4">
                {[
                  { id: "01", text: "நிர்ணயிக்கப்பட்ட வருகைப்பதிவு: மாணவர்களின் சிறந்த கற்றல் செயல்பாடுகளுக்காக வருகைப்பதிவு கட்டாயமாகும்.", color: "indigo" },
                  { id: "02", text: "தவறான தகவல் தடை: மாணவர்கள் மற்ற மாணவர்களின் தொலைபேசி எண்களை எந்த காரணத்திற்காகவும் தவறாகப் பயன்படுத்தக் கூடாது.", color: "rose" },
                  { id: "03", text: "கட்டண ஒழுங்கு: குறிப்பிட்ட தேதியில் கட்டணத்தை செலுத்தாவிடில், வகுப்பிலிருந்து நீக்கப்படுவர்.", color: "amber" },
                  { id: "04", text: "வீட்டுப்பாடம் (Homework): வீட்டுப்பாடங்கள் செய்வது கட்டாயமாகும்.", color: "emerald" },
                  { id: "05", text: "நன்னடத்தை: வகுப்பிற்கு இடையூறு விளைவிக்கும் மாணவர்கள் உடனடியாக வெளியேற்றப்படுவார்கள்.", color: "slate" }
                ].map((rule) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={rule.id} 
                    className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-sm transition-all"
                  >
                    <div className={`w-8 h-8 rounded-lg bg-${rule.color}-100 text-${rule.color}-600 flex items-center justify-center font-bold text-sm shrink-0 border border-${rule.color}-200`}>
                      {rule.id}
                    </div>
                    <p className="text-slate-700 font-medium leading-relaxed">{rule.text}</p>
                  </motion.div>
                ))}
              </div>

              <div className="mt-8 p-6 bg-slate-900 rounded-2xl text-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center">
                    <Info size={16} />
                  </div>
                  <h3 className="font-bold">முக்கிய குறிப்பு (Important Note)</h3>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  மாணவர்களின் கல்வி முன்னேற்றத்திற்காகவும், அகாடமியின் ஒழுக்கத்தைப் பேணுவதற்காகவும் இந்த விதிமுறைகள் கடுமையாகப் பின்பற்றப்படுகின்றன. 
                  அகரம் தினேஷ் அகாடமி (Agaram Dhines Academy) உடன் இணைந்திருக்கும் ஒவ்வொரு மாணவரும் இந்த விதிமுறைகளுக்குக் கட்டுப்பட வேண்டும்.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "fees" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <h2 className="text-2xl font-bold mb-2 text-slate-800 flex items-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mr-3">
                  <span className="font-bold text-lg">₨</span>
                </div>
                Fee Status
              </h2>
              <p className="text-slate-500 mb-8 ml-13">View your payment history.</p>
              
              <div className="space-y-4">
                {fees.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <span className="font-bold text-xl text-slate-300">₨</span>
                    </div>
                    <p>No fee records found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.values(fees.reduce((acc: any, fee: any) => {
                      if (!acc[fee.month]) {
                        acc[fee.month] = { ...fee };
                      } else {
                        acc[fee.month].amount = Number(acc[fee.month].amount) + Number(fee.amount);
                      }
                      return acc;
                    }, {})).map((fee: any) => (
                      <div key={fee.id} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-bold text-slate-800 text-lg">{fee.month}</h3>
                          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                            {new Date(fee.date).getFullYear()}
                          </span>
                        </div>
                        <div className="flex justify-between items-end mt-auto">
                          <p className="text-xs text-slate-500 font-medium">Paid on: <br/><span className="text-slate-700">{new Date(fee.date).toLocaleDateString()}</span></p>
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 text-sm">
                            Rs. {fee.amount}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "chat" && (
          <div className="flex-1 flex flex-col -mx-4 -mt-4 h-[calc(100vh-140px)]">
            <div className="bg-white shadow-sm border-b border-slate-200 p-4 z-10 flex items-center">
              <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-3">
                <WhatsAppIcon size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-800">
                Live Chat Support
              </h2>
            </div>
            <div className="flex-1 overflow-hidden bg-slate-50">
              <LiveChat currentUser={{ id: studentData.id, name: studentData.name, role: "Student", grade: studentData.grade }} />
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <div className="flex flex-col items-center justify-center mb-8">
                <div className="relative group">
                  <div className="w-28 h-28 bg-slate-100 rounded-full flex items-center justify-center border-4 border-white shadow-lg overflow-hidden transition-transform group-hover:scale-105">
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User size={48} className="text-slate-300" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2.5 rounded-full cursor-pointer hover:bg-indigo-700 shadow-lg transition-colors border-2 border-white">
                    <Camera size={16} />
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg, image/jpg" 
                      className="hidden" 
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>
                
                <div className="text-center mt-5">
                  {isEditingName ? (
                    <div className="flex items-center justify-center space-x-2">
                      <input 
                        type="text" 
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="border-b-2 border-indigo-500 bg-transparent px-2 py-1 text-center font-bold text-2xl text-slate-800 focus:outline-none"
                        autoFocus
                      />
                      <button onClick={handleSaveName} className="text-emerald-600 hover:text-emerald-700 bg-emerald-50 p-1.5 rounded-lg transition-colors">
                        <Check size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2 group">
                      <h2 className="text-2xl font-bold text-slate-800">
                        {displayName}
                      </h2>
                      <button onClick={() => setIsEditingName(true)} className="text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50 p-1.5 rounded-lg">
                        <Edit2 size={16} />
                      </button>
                    </div>
                  )}
                  <p className="text-sm font-medium text-slate-500 mt-1">Display Name</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Account Details</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
                    <span className="text-slate-500 font-medium flex items-center gap-2"><User size={16} className="text-slate-400"/> Admin Given Name</span>
                    <span className="font-bold text-slate-800">{studentData.name}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
                    <span className="text-slate-500 font-medium flex items-center gap-2"><User size={16} className="text-slate-400"/> Username</span>
                    <span className="font-bold text-slate-800">{studentData.username}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
                    <span className="text-slate-500 font-medium flex items-center gap-2"><Book size={16} className="text-slate-400"/> Grade</span>
                    <span className="font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">{studentData.grade}</span>
                  </div>
                  <div className="flex justify-between items-center pb-1">
                    <span className="text-slate-500 font-medium flex items-center gap-2"><FileText size={16} className="text-slate-400"/> Roll No</span>
                    <span className="font-bold text-slate-800 font-mono bg-slate-100 px-2 py-0.5 rounded">{studentData.rollNo}</span>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 mt-6">
                <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Download size={18} /> Downloads
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                      <User size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">Student ID Card</h4>
                      <p className="text-xs text-slate-500 mt-1">Download your official ID card</p>
                    </div>
                    <div className="flex gap-2 w-full mt-2">
                      <button onClick={() => handleDownloadIdCard('pdf')} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors">PDF</button>
                      <button onClick={() => handleDownloadIdCard('png')} className="flex-1 bg-indigo-100 text-indigo-700 py-2 rounded-lg text-xs font-bold hover:bg-indigo-200 transition-colors">PNG</button>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                      <Award size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">Certificate</h4>
                      <p className="text-xs text-slate-500 mt-1">Download your certificate</p>
                    </div>
                    <div className="flex gap-2 w-full mt-2">
                      <button onClick={() => handleDownloadCertificate('pdf')} className="flex-1 bg-amber-500 text-white py-2 rounded-lg text-xs font-bold hover:bg-amber-600 transition-colors">PDF</button>
                      <button onClick={() => handleDownloadCertificate('png')} className="flex-1 bg-amber-100 text-amber-700 py-2 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors">PNG</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => window.open("https://www.agaramdhines.lk/lp-profile/", "_blank")}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3.5 rounded-xl font-bold hover:opacity-90 transition-opacity shadow-md flex items-center justify-center gap-2"
                >
                  <User size={20} />
                  Manage External Profile
                </button>
              </div>
            </div>

            {/* Zoom Class Link Section in Profile */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
              <h3 className="text-xl font-bold mb-2 text-slate-800 flex items-center">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mr-3">
                  <Video size={16} />
                </div>
                Class Links
              </h3>
              <p className="text-sm text-slate-500 mb-6 ml-11">Your registered live class links for {studentData.grade}</p>
              
              <div className="space-y-4">
                {classLinks[studentData.grade] && (
                  <div className="bg-indigo-50 p-4 rounded-xl flex justify-between items-center border border-indigo-100 shadow-sm">
                    <span className="font-bold text-indigo-800 truncate mr-2 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                      CLASS
                    </span>
                    <button 
                      onClick={() => handleJoinClass(classLinks[studentData.grade])}
                      className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 whitespace-nowrap shadow-sm transition-colors"
                    >
                      Join Now
                    </button>
                  </div>
                )}
                
                {zoomLinks.map(link => (
                  <div key={link.id} className="bg-white p-5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center border border-slate-200 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all gap-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-lg truncate mr-2">{link.title}</span>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">{new Date(link.datetime).toLocaleString()}</span>
                        <CountdownTimer targetDate={link.datetime} />
                      </div>
                      <div className="flex flex-wrap gap-3 mt-3">
                        {link.meetingId && <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">Meeting ID: <span className="font-mono font-bold text-slate-700 ml-1">{link.meetingId}</span></span>}
                        {link.passcode && <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">Passcode: <span className="font-mono font-bold text-slate-700 ml-1">{link.passcode}</span></span>}
                      </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                      <button 
                        onClick={() => handleJoinClass(null)}
                        className="flex-1 sm:flex-none bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-100 whitespace-nowrap transition-colors"
                      >
                        Mark Attendance
                      </button>
                      <button 
                        onClick={() => handleJoinClass(link.link)}
                        className="flex-1 sm:flex-none bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 whitespace-nowrap shadow-sm transition-colors"
                      >
                        Join Now
                      </button>
                    </div>
                  </div>
                ))}

                {!classLinks[studentData.grade] && zoomLinks.length === 0 && (
                  <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                    <Video className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p>No class links available.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Fee History Section in Profile */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <h3 className="text-xl font-bold mb-6 text-slate-800 flex items-center">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mr-3">
                  <DollarSign size={16} />
                </div>
                Monthly Fee History
              </h3>
              <div className="space-y-3">
                {fees.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                    <DollarSign className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p>No fee history found.</p>
                  </div>
                ) : (
                  Object.values(fees.reduce((acc: any, fee: any) => {
                    if (!acc[fee.month]) {
                      acc[fee.month] = { ...fee };
                    } else {
                      acc[fee.month].amount = Number(acc[fee.month].amount) + Number(fee.amount);
                    }
                    return acc;
                  }, {})).map((fee: any) => (
                    <div key={fee.id} className="flex justify-between items-center border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                      <span className="text-slate-700 font-bold">{formatMonth(fee.month)}</span>
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 text-sm">Paid (Rs. {fee.amount})</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[96%] max-w-lg">
        <div className="bg-[#1e1e24] rounded-full flex justify-between items-center px-3 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === "website") {
                    window.open("https://agaramdhines.lk", "_blank");
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                className="relative flex flex-col items-center justify-center w-10 h-10 sm:w-12 sm:h-12 z-10"
              >
                {/* Lifted Active Icon */}
                <div 
                  className={`absolute transition-all duration-500 ease-out flex flex-col items-center
                    ${isActive ? '-translate-y-8' : 'translate-y-0 opacity-0 pointer-events-none'}`}
                >
                  {/* The Green Circle with Icon */}
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-500 rounded-full border-[4px] border-slate-50 flex items-center justify-center text-white shadow-[0_0_15px_rgba(34,197,94,0.5)]">
                    {React.cloneElement(item.icon as React.ReactElement, { size: 20 })}
                  </div>
                  {/* The Label */}
                  <span className="bg-white text-gray-900 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 shadow-md whitespace-nowrap">
                    {item.name}
                  </span>
                  {/* The Glowing Dot */}
                  <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] mt-1"></div>
                </div>

                {/* Inactive Icon */}
                <div 
                  className={`transition-all duration-300 text-gray-400 hover:text-gray-200
                    ${isActive ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}
                >
                  {React.cloneElement(item.icon as React.ReactElement, { size: 22 })}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hidden Templates for Download */}
      <div className="fixed top-0 left-0 z-[-50] pointer-events-none opacity-0">
        {/* ID Card Template */}
        <div 
          id="student-id-card-template" 
          className="w-[3.375in] h-[2.125in] bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-xl p-0 relative overflow-hidden text-white shadow-lg shrink-0 flex"
        >
          {/* Background patterns */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-10 -mb-10"></div>

          <div className="flex h-full w-full">
            {/* Left side - Photo & QR */}
            <div className="w-[35%] bg-white/10 backdrop-blur-sm p-2 flex flex-col items-center justify-center border-r border-white/20">
              <div className="w-14 h-14 bg-white rounded-full mb-2 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                {profileImage ? (
                  <img src={profileImage} alt={studentData.name} className="w-full h-full object-cover" />
                ) : (
                  <User size={28} className="text-indigo-600" />
                )}
              </div>
              <div className="bg-white p-1 rounded shadow-sm">
                <QRCodeSVG value={studentData.id} size={55} level="H" includeMargin={false} />
              </div>
            </div>

            {/* Right side - Details */}
            <div className="w-[65%] p-3 flex flex-col justify-between">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-100 mb-1 border-b border-white/20 pb-1">Agaram Academy</h3>
                <h2 className="text-sm font-bold leading-tight mb-1 truncate">{studentData.name}</h2>
                <div className="text-[9px] space-y-0.5 opacity-90">
                  <p>Grade: <span className="font-semibold">{studentData.grade}</span></p>
                  <p>Roll No: <span className="font-semibold">{studentData.rollNo || 'N/A'}</span></p>
                  <p>Phone: <span className="font-semibold">{studentData.phone || 'N/A'}</span></p>
                </div>
              </div>
              
              <div className="mt-auto bg-black/25 p-1.5 rounded text-[8px] font-mono leading-tight">
                <p className="flex justify-between"><span>User:</span> <span className="font-bold">{studentData.username}</span></p>
                <p className="flex justify-between"><span>Pass:</span> <span className="font-bold">{studentData.password}</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Certificate Template */}
        <div 
          id="student-certificate-template" 
          className="w-[11in] h-[8.5in] bg-white p-8 relative shrink-0 flex items-center justify-center"
        >
          {/* Colorful Border */}
          <div className="absolute inset-4 border-[12px] border-double border-indigo-900 rounded-2xl"></div>
          <div className="absolute inset-8 border-2 border-yellow-500 rounded-xl opacity-50"></div>

          {/* Background Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03]">
            <Award size={500} />
          </div>

          <div className="relative h-full w-full flex flex-col items-center justify-center text-center px-20">
            <h1 className="text-6xl font-serif font-black text-indigo-900 mb-2 tracking-wide">Certificate of Excellence</h1>
            <p className="text-2xl text-yellow-600 font-serif italic mb-12 font-semibold">Agaram Dhines Academy</p>

            <p className="text-xl text-gray-600 mb-4 font-medium tracking-wide uppercase">This is proudly presented to</p>
            <h2 className="text-5xl font-bold text-gray-900 mb-8 border-b-4 border-indigo-200 pb-4 inline-block px-12">{studentData.name}</h2>

            <p className="text-2xl text-gray-700 mb-12 max-w-4xl leading-relaxed font-serif">
              For outstanding academic performance and dedication in <span className="font-bold text-indigo-800">Grade {studentData.grade}</span>.
              Your commitment to excellence is truly commendable.
            </p>

            <div className="flex justify-between items-end w-full mt-auto pt-10 px-10">
              <div className="text-center">
                <div className="w-56 border-b-2 border-gray-800 mb-3"></div>
                <p className="font-bold text-gray-800 text-lg uppercase tracking-widest">Director</p>
              </div>

              {/* QR and Details */}
              <div className="flex items-center gap-5 text-left bg-gray-50/80 p-5 rounded-xl border border-gray-200 shadow-sm backdrop-blur-sm z-10">
                <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                  <QRCodeSVG value={studentData.id} size={90} level="H" includeMargin={false} />
                </div>
                <div className="text-sm text-gray-700 space-y-1.5 font-medium">
                  <p><span className="font-bold text-indigo-900 w-16 inline-block">Roll No:</span> {studentData.rollNo || 'N/A'}</p>
                  <p><span className="font-bold text-indigo-900 w-16 inline-block">Phone:</span> {studentData.phone || 'N/A'}</p>
                  <p><span className="font-bold text-indigo-900 w-16 inline-block">User:</span> <span className="font-mono">{studentData.username}</span></p>
                  <p><span className="font-bold text-indigo-900 w-16 inline-block">Pass:</span> <span className="font-mono">{studentData.password}</span></p>
                </div>
              </div>

              <div className="text-center">
                <div className="w-56 border-b-2 border-gray-800 mb-3"></div>
                <p className="font-bold text-gray-800 text-lg uppercase tracking-widest">Date</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showQrScanner && (
        <QrScanner 
          onScan={handleQrScan} 
          onClose={() => setShowQrScanner(false)} 
        />
      )}
    </div>
  );
}
