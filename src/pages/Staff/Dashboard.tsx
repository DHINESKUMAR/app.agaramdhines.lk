import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  LogOut, 
  Globe, 
  Video, 
  BookOpen, 
  Calendar, 
  UserCheck, 
  Menu, 
  X,
  DollarSign,
  Download,
  FileText,
  Bell,
  User,
  Award
} from "lucide-react";
import WhatsAppIcon from "../../components/WhatsAppIcon";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { getAttendance, getZoomLinks, saveZoomLinks, getHomework, saveHomework, getStaffAttendance, saveStaffAttendance, getTimeTable, saveTimeTable, getStudents, getAdminSettings } from "../../lib/db";
import CountdownTimer from "../../components/CountdownTimer";
import PopupAnnouncement from "../../components/PopupAnnouncement";
import LiveChat from "../../components/LiveChat";
import { useChatNotifications } from "../../hooks/useChatNotifications";
import { useHomeworkNotifications } from "../../hooks/useHomeworkNotifications";
import { motion, AnimatePresence } from "motion/react";

export default function StaffDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("website");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [adminSettings, setAdminSettings] = useState<any>(null);
  
  const [staff, setStaff] = useState<any>(location.state);

  const isChatOpen = activeTab === "chat";
  const { unreadCount, markAsRead } = useChatNotifications(staff ? { id: staff.id, name: staff.name, role: "Staff" } : null, isChatOpen);

  const { notifications } = useHomeworkNotifications('staff');
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

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
    let data = staff;
    if (!data) {
      const session = localStorage.getItem('userSession');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          if (parsed.role === 'Staff') {
            data = parsed;
            setStaff(parsed);
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

    getAdminSettings().then(data => {
      if (data) setAdminSettings(data);
    });
  }, [navigate, location.state]);

  if (!staff) return null;

  const handleLogout = () => {
    localStorage.removeItem('userSession');
    navigate("/");
  };

  const navItems = [
    { id: "website", name: "Agaram Website", icon: <Globe size={20} /> },
    { id: "timetable", name: "My Timetable", icon: <Calendar size={20} /> },
    { id: "zoom", name: "Add Zoom Links", icon: <Video size={20} /> },
    { id: "homework", name: "Assign Homework", icon: <BookOpen size={20} /> },
    { id: "student-attendance", name: "Student Attendance", icon: <UserCheck size={20} /> },
    { id: "my-attendance", name: "My Classes (Attendance)", icon: <Calendar size={20} /> },
    { id: "salary", name: "Salary Details", icon: <DollarSign size={20} /> },
    { id: "chat", name: "Live Chat", icon: <WhatsAppIcon size={20} /> },
    { id: "profile", name: "Profile", icon: <User size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row font-sans">
      <PopupAnnouncement userRole="Staff" />
      {/* Mobile Header */}
      <div className="md:hidden bg-blue-800 text-white p-4 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="mr-4">
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-semibold">Staff Panel</h1>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 transition duration-200 ease-in-out z-30 w-64 bg-blue-900 text-white flex flex-col shadow-xl`}>
        <div className="p-6 flex items-center justify-between bg-blue-950">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {adminSettings?.profileImage ? (
                <img src={adminSettings.profileImage} alt="Logo" className="w-8 h-8 object-cover rounded-lg shadow-inner" />
              ) : (
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow-inner transform -rotate-3">
                  <BookOpen size={18} className="text-white" />
                </div>
              )}
              <h2 className="text-xl font-bold text-white">{adminSettings?.instituteName || "Staff Panel"}</h2>
            </div>
            <p className="text-blue-300 text-sm mt-1">Welcome, {staff.name}</p>
            <p className="text-blue-400 text-xs mt-0.5">{staff.role}</p>
          </div>
          <button className="md:hidden text-white" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { 
                setActiveTab(item.id); 
                if (item.id === "chat") markAsRead();
                setIsSidebarOpen(false); 
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === item.id ? "bg-blue-600 text-white shadow-md" : "text-blue-100 hover:bg-blue-800 hover:text-white"
              }`}
            >
              <div className="flex items-center">
                <span className="mr-3">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </div>
              {item.id === "chat" && unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-blue-800">
          <button onClick={handleLogout} className="w-full flex items-center px-4 py-3 text-blue-100 hover:bg-red-600 hover:text-white rounded-xl transition-all duration-200">
            <LogOut size={20} className="mr-3" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50">
        <header className="bg-white shadow-sm px-8 py-4 hidden md:flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            {navItems.find(i => i.id === activeTab)?.name}
          </h2>
          <div className="flex items-center gap-4">
            <div className="relative" ref={notificationsRef}>
              <button 
                className="relative p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden text-gray-800"
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
            <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-medium text-sm flex items-center gap-2">
              <span>{staff.name}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              <span className="text-blue-600">{staff.role}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {activeTab === "website" && <WebsiteView />}
          {activeTab === "timetable" && <TimetableManager staff={staff} />}
          {activeTab === "zoom" && <ZoomManager staff={staff} />}
          {activeTab === "homework" && <HomeworkManager staff={staff} />}
          {activeTab === "student-attendance" && <StudentAttendanceView staff={staff} />}
          {activeTab === "my-attendance" && <StaffAttendanceView staff={staff} />}
          {activeTab === "salary" && <SalaryView staff={staff} />}
          {activeTab === "profile" && <ProfileView staff={staff} adminSettings={adminSettings} />}
          {activeTab === "chat" && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center shrink-0">
                <WhatsAppIcon className="mr-3 text-purple-500" size={28} />
                Live Chat
              </h2>
              <div className="flex-1 overflow-hidden">
                <LiveChat currentUser={{ id: staff.id, name: staff.name, role: "Staff" }} />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function ProfileView({ staff, adminSettings }: { staff: any, adminSettings: any }) {
  const handleDownloadIdCard = async (format: 'png' | 'pdf') => {
    const element = document.getElementById('staff-id-card-template');
    if (!element) return;
    
    try {
      const imgData = await toPng(element, { pixelRatio: 3, backgroundColor: 'transparent' });
      
      if (format === 'png') {
        const link = document.createElement('a');
        link.download = `${staff.name}_ID_Card.png`;
        link.href = imgData;
        link.click();
      } else {
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'in',
          format: [3.375, 2.125]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, 3.375, 2.125);
        pdf.save(`${staff.name}_ID_Card.pdf`);
      }
    } catch (error) {
      console.error("Error generating ID card:", error);
      alert("Failed to generate ID card. Please try again.");
    }
  };

  const handleDownloadCertificate = async (format: 'png' | 'pdf') => {
    const element = document.getElementById('staff-certificate-template');
    if (!element) return;
    
    try {
      const imgData = await toPng(element, { pixelRatio: 3, backgroundColor: 'transparent' });
      
      if (format === 'png') {
        const link = document.createElement('a');
        link.download = `${staff.name}_Certificate.png`;
        link.href = imgData;
        link.click();
      } else {
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'in',
          format: [11, 8.5]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, 11, 8.5);
        pdf.save(`${staff.name}_Certificate.pdf`);
      }
    } catch (error) {
      console.error("Error generating Certificate:", error);
      alert("Failed to generate Certificate. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Account Details</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <span className="text-gray-500 font-medium">Name</span>
            <span className="font-bold text-gray-800">{staff.name}</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <span className="text-gray-500 font-medium">Username</span>
            <span className="font-bold text-gray-800">{staff.username}</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <span className="text-gray-500 font-medium">Role</span>
            <span className="font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">{staff.role}</span>
          </div>
          <div className="flex justify-between items-center pb-1">
            <span className="text-gray-500 font-medium">Staff ID</span>
            <span className="font-bold text-gray-800 font-mono bg-gray-100 px-2 py-0.5 rounded">{staff.id}</span>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 mt-6">
        <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Download size={18} /> Downloads
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <User size={24} />
            </div>
            <div>
              <h4 className="font-bold text-gray-800">Staff ID Card</h4>
              <p className="text-xs text-gray-500 mt-1">Download your official ID card</p>
            </div>
            <div className="flex gap-2 w-full mt-2">
              <button onClick={() => handleDownloadIdCard('pdf')} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors">PDF</button>
              <button onClick={() => handleDownloadIdCard('png')} className="flex-1 bg-blue-100 text-blue-700 py-2 rounded-lg text-xs font-bold hover:bg-blue-200 transition-colors">PNG</button>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
              <Award size={24} />
            </div>
            <div>
              <h4 className="font-bold text-gray-800">Certificate</h4>
              <p className="text-xs text-gray-500 mt-1">Download your certificate</p>
            </div>
            <div className="flex gap-2 w-full mt-2">
              <button onClick={() => handleDownloadCertificate('pdf')} className="flex-1 bg-amber-500 text-white py-2 rounded-lg text-xs font-bold hover:bg-amber-600 transition-colors">PDF</button>
              <button onClick={() => handleDownloadCertificate('png')} className="flex-1 bg-amber-100 text-amber-700 py-2 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors">PNG</button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Templates for Download */}
      <div className="fixed top-0 left-0 z-[-50] pointer-events-none opacity-0">
        {/* ID Card Template */}
        <div 
          id="staff-id-card-template" 
          className="w-[3.375in] h-[2.125in] bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 rounded-xl p-0 relative overflow-hidden text-white shadow-lg shrink-0 flex"
        >
          {/* Background patterns */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-10 -mb-10"></div>

          <div className="flex h-full w-full">
            {/* Left side - Photo & QR */}
            <div className="w-[35%] bg-white/10 backdrop-blur-sm p-2 flex flex-col items-center justify-center border-r border-white/20">
              <div className="w-14 h-14 bg-white rounded-full mb-2 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                <User size={28} className="text-blue-600" />
              </div>
              <div className="bg-white p-1 rounded shadow-sm">
                <QRCodeSVG value={staff.id} size={55} level="H" includeMargin={false} />
              </div>
            </div>

            {/* Right side - Details */}
            <div className="w-[65%] p-3 flex flex-col justify-between">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-100 mb-1 border-b border-white/20 pb-1">{adminSettings?.instituteName || "Agaram Academy"}</h3>
                <h2 className="text-sm font-bold leading-tight mb-1 truncate">{staff.name}</h2>
                <div className="text-[9px] space-y-0.5 opacity-90">
                  <p>Role: <span className="font-semibold">{staff.role}</span></p>
                  <p>Staff ID: <span className="font-semibold">{staff.id}</span></p>
                </div>
              </div>
              
              <div className="mt-auto bg-black/25 p-1.5 rounded text-[8px] font-mono leading-tight">
                <p className="flex justify-between"><span>User:</span> <span className="font-bold">{staff.username}</span></p>
                <p className="flex justify-between"><span>Pass:</span> <span className="font-bold">{staff.password}</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Certificate Template */}
        <div 
          id="staff-certificate-template" 
          className="w-[11in] h-[8.5in] bg-white p-8 relative shrink-0 flex items-center justify-center"
        >
          {/* Colorful Border */}
          <div className="absolute inset-4 border-[12px] border-double border-blue-900 rounded-2xl"></div>
          <div className="absolute inset-8 border-2 border-yellow-500 rounded-xl opacity-50"></div>

          {/* Background Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03]">
            <Award size={500} />
          </div>

          <div className="relative h-full w-full flex flex-col items-center justify-center text-center px-20">
            <h1 className="text-6xl font-serif font-black text-blue-900 mb-2 tracking-wide">Certificate of Appreciation</h1>
            <p className="text-2xl text-yellow-600 font-serif italic mb-12 font-semibold">{adminSettings?.instituteName || "Agaram Dhines Academy"}</p>

            <p className="text-xl text-gray-600 mb-4 font-medium tracking-wide uppercase">This is proudly presented to</p>
            <h2 className="text-5xl font-bold text-gray-900 mb-8 border-b-4 border-blue-200 pb-4 inline-block px-12">{staff.name}</h2>

            <p className="text-2xl text-gray-700 mb-12 max-w-4xl leading-relaxed font-serif">
              For outstanding dedication and service as a <span className="font-bold text-blue-800">{staff.role}</span>.
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
                  <QRCodeSVG value={staff.id} size={90} level="H" includeMargin={false} />
                </div>
                <div className="text-sm text-gray-700 space-y-1.5 font-medium">
                  <p><span className="font-bold text-blue-900 w-16 inline-block">Staff ID:</span> {staff.id}</p>
                  <p><span className="font-bold text-blue-900 w-16 inline-block">User:</span> <span className="font-mono">{staff.username}</span></p>
                  <p><span className="font-bold text-blue-900 w-16 inline-block">Pass:</span> <span className="font-mono">{staff.password}</span></p>
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
    </div>
  );
}

function WebsiteView() {
  return (
    <div className="h-full w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
      <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-bold text-gray-700">Agaram Dhines Academy Website</h3>
        <a href="https://www.agaramdhines.lk" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm font-medium">Open in new tab</a>
      </div>
      <iframe src="https://www.agaramdhines.lk" className="w-full flex-1 border-0" title="Agaram Website" />
    </div>
  );
}

function ZoomManager({ staff }: { staff: any }) {
  const [links, setLinks] = useState<any[]>([]);
  const [formData, setFormData] = useState({ grade: "", subject: "", title: "", link: "", datetime: "", hostKey: "", meetingId: "", passcode: "" });

  useEffect(() => {
    getZoomLinks().then(setLinks);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newLink = { ...formData, id: Date.now().toString(), staffId: staff.id, staffName: staff.name };
    const updated = [...links, newLink];
    await saveZoomLinks(updated);
    setLinks(updated);
    setFormData({ grade: "", subject: "", title: "", link: "", datetime: "", hostKey: "", meetingId: "", passcode: "" });
    
    // Also log this as a class conducted by the staff
    const staffAtt = await getStaffAttendance() || [];
    await saveStaffAttendance([...staffAtt, {
      id: Date.now().toString(),
      staffId: staff.id,
      staffName: staff.name,
      type: "Zoom Class Added",
      date: new Date().toISOString(),
      details: `${formData.title} (${formData.grade} - ${formData.subject})`
    }]);
    
    alert("Zoom link added successfully!");
  };

  const handleClassSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = staff.assignedClasses?.[parseInt(e.target.value)];
    if (selected) {
      setFormData({ ...formData, grade: selected.grade, subject: selected.subject });
    } else {
      setFormData({ ...formData, grade: "", subject: "" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Add New Zoom Link</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select 
            required 
            onChange={handleClassSelect} 
            className="border p-2 rounded"
            defaultValue=""
          >
            <option value="" disabled>Select Assigned Class</option>
            {staff.assignedClasses?.map((cls: any, idx: number) => (
              <option key={idx} value={idx}>{cls.grade} - {cls.subject}</option>
            ))}
            {(!staff.assignedClasses || staff.assignedClasses.length === 0) && (
              <option value="" disabled>No classes assigned to you.</option>
            )}
          </select>
          <input required placeholder="Topic / Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="border p-2 rounded" />
          <input required placeholder="Zoom Link" type="url" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} className="border p-2 rounded" />
          <input placeholder="Meeting ID" value={formData.meetingId} onChange={e => setFormData({...formData, meetingId: e.target.value})} className="border p-2 rounded" />
          <input placeholder="Passcode" value={formData.passcode} onChange={e => setFormData({...formData, passcode: e.target.value})} className="border p-2 rounded" />
          <input placeholder="Host Key" value={formData.hostKey} onChange={e => setFormData({...formData, hostKey: e.target.value})} className="border p-2 rounded" />
          <input required type="datetime-local" value={formData.datetime} onChange={e => setFormData({...formData, datetime: e.target.value})} className="border p-2 rounded" />
          <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-medium" disabled={!formData.grade}>Add Link</button>
        </form>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Your Recent Zoom Links</h3>
        <div className="space-y-3">
          {links.filter(l => l.staffId === staff.id).map(link => (
            <div key={link.id} className="p-4 border rounded-lg flex justify-between items-center">
              <div>
                <p className="font-bold">{link.title} <span className="text-sm text-gray-500 font-normal">({link.grade} - {link.subject})</span></p>
                <div className="flex items-center gap-3 mt-1 mb-1">
                  <p className="text-sm text-gray-600">Time: {new Date(link.datetime).toLocaleString()}</p>
                  <CountdownTimer targetDate={link.datetime} />
                </div>
                <p className="text-sm text-gray-600">Host Key: <span className="font-mono bg-gray-100 px-1 rounded">{link.hostKey || 'N/A'}</span></p>
                {link.meetingId && <p className="text-sm text-gray-600">Meeting ID: <span className="font-mono bg-gray-100 px-1 rounded">{link.meetingId}</span></p>}
                {link.passcode && <p className="text-sm text-gray-600">Passcode: <span className="font-mono bg-gray-100 px-1 rounded">{link.passcode}</span></p>}
              </div>
              <a href={link.link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Join</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TimetableManager({ staff }: { staff: any }) {
  const [timetable, setTimetable] = useState<any[]>([]);
  const [formData, setFormData] = useState({ grade: "", subject: "", day: "Monday", startTime: "", endTime: "" });

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  useEffect(() => {
    getTimeTable().then(setTimetable);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry = { 
      ...formData, 
      id: Date.now().toString(), 
      staffId: staff.id, 
      staffName: staff.name 
    };
    const updated = [...timetable, newEntry];
    await saveTimeTable(updated);
    setTimetable(updated);
    setFormData({ ...formData, startTime: "", endTime: "" });
    alert("Timetable entry added successfully!");
  };

  const handleClassSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = staff.assignedClasses?.[parseInt(e.target.value)];
    if (selected) {
      setFormData({ ...formData, grade: selected.grade, subject: selected.subject });
    } else {
      setFormData({ ...formData, grade: "", subject: "" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Add Timetable Entry</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class & Subject</label>
            <select 
              required 
              onChange={handleClassSelect} 
              className="border p-2 rounded w-full"
              defaultValue=""
            >
              <option value="" disabled>Select Assigned Class</option>
              {staff.assignedClasses?.map((cls: any, idx: number) => (
                <option key={idx} value={idx}>{cls.grade} - {cls.subject}</option>
              ))}
              {(!staff.assignedClasses || staff.assignedClasses.length === 0) && (
                <option value="" disabled>No classes assigned to you.</option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
            <select 
              required 
              value={formData.day} 
              onChange={e => setFormData({...formData, day: e.target.value})} 
              className="border p-2 rounded w-full"
            >
              {days.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <input required type="time" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="border p-2 rounded w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <input required type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="border p-2 rounded w-full" />
          </div>
          <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-medium md:col-span-2" disabled={!formData.grade}>Add to Timetable</button>
        </form>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Your Timetable</h3>
        <div className="space-y-3">
          {timetable.filter(t => t.staffId === staff.id).sort((a, b) => days.indexOf(a.day) - days.indexOf(b.day)).map(entry => (
            <div key={entry.id} className="p-4 border rounded-lg flex justify-between items-center bg-gray-50">
              <div>
                <p className="font-bold text-gray-800">{entry.subject} <span className="text-sm text-gray-500 font-normal">({entry.grade})</span></p>
                <p className="text-sm text-blue-600 font-medium">{entry.day}: {entry.startTime} - {entry.endTime}</p>
              </div>
              <button onClick={async () => {
                if(window.confirm("Delete this entry?")) {
                  const updated = timetable.filter(t => t.id !== entry.id);
                  setTimetable(updated);
                  await saveTimeTable(updated);
                }
              }} className="text-red-500 hover:text-red-700 p-2">
                <X size={18} />
              </button>
            </div>
          ))}
          {timetable.filter(t => t.staffId === staff.id).length === 0 && (
            <p className="text-gray-500 italic">No timetable entries found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function HomeworkManager({ staff }: { staff: any }) {
  const [homework, setHomework] = useState<any[]>([]);
  const [formData, setFormData] = useState({ grade: "", subject: "", title: "", description: "", date: "" });

  useEffect(() => {
    getHomework().then(setHomework);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newHw = { ...formData, id: Date.now().toString(), staffId: staff.id, staffName: staff.name };
    const updated = [...homework, newHw];
    await saveHomework(updated);
    setHomework(updated);
    setFormData({ grade: "", subject: "", title: "", description: "", date: "" });
    alert("Homework assigned successfully!");
  };

  const handleClassSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = staff.assignedClasses?.[parseInt(e.target.value)];
    if (selected) {
      setFormData({ ...formData, grade: selected.grade, subject: selected.subject });
    } else {
      setFormData({ ...formData, grade: "", subject: "" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Assign Homework</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select 
              required 
              onChange={handleClassSelect} 
              className="border p-2 rounded"
              defaultValue=""
            >
              <option value="" disabled>Select Assigned Class</option>
              {staff.assignedClasses?.map((cls: any, idx: number) => (
                <option key={idx} value={idx}>{cls.grade} - {cls.subject}</option>
              ))}
              {(!staff.assignedClasses || staff.assignedClasses.length === 0) && (
                <option value="" disabled>No classes assigned to you.</option>
              )}
            </select>
            <input required placeholder="Topic / Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="border p-2 rounded" />
            <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="border p-2 rounded md:col-span-2" />
          </div>
          <textarea required placeholder="Homework Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="border p-2 rounded h-24" />
          <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-medium w-full md:w-auto md:px-8" disabled={!formData.grade}>Assign</button>
        </form>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Your Recent Homework</h3>
        <div className="space-y-3">
          {homework.filter(h => h.staffId === staff.id).map(hw => (
            <div key={hw.id} className="p-4 border rounded-lg bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-gray-800">{hw.title} <span className="text-sm font-normal text-gray-500">({hw.grade} - {hw.subject})</span></h4>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">Due: {hw.date}</span>
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{hw.description}</p>
            </div>
          ))}
          {homework.filter(h => h.staffId === staff.id).length === 0 && (
            <p className="text-gray-500 italic">No homework assigned yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StudentAttendanceView({ staff }: { staff: any }) {
  const [attendance, setAttendance] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const allAttendance = await getAttendance();
      const allStudents = await getStudents();
      
      const assignedGrades = staff.assignedClasses?.map((c: any) => c.grade) || [];
      
      // Map student data to attendance records
      const enrichedAttendance = allAttendance.map((record: any) => {
        const student = allStudents.find((s: any) => s.id === record.studentId);
        return {
          ...record,
          studentName: student?.name || 'Unknown',
          grade: student?.grade || 'Unknown'
        };
      });

      // Filter attendance to only show records for students in the staff's assigned classes
      const filtered = enrichedAttendance.filter((record: any) => assignedGrades.includes(record.grade));
      setAttendance(filtered);
    };
    loadData();
  }, [staff]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Student Attendance Records</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {attendance.map((record: any) => (
              <tr key={record.id}>
                <td className="px-6 py-4 whitespace-nowrap">{new Date(record.date).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">{record.studentName}</td>
                <td className="px-6 py-4 whitespace-nowrap">{record.grade}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    record.status === 'Present' ? 'bg-green-100 text-green-800' : 
                    record.status === 'Absent' ? 'bg-red-100 text-red-800' : 
                    record.status === 'Leave' ? 'bg-yellow-100 text-yellow-800' : 
                    record.status === 'Late' ? 'bg-orange-100 text-orange-800' : 
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {record.status}
                  </span>
                </td>
              </tr>
            ))}
            {attendance.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">No attendance records found for your assigned classes.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StaffAttendanceView({ staff }: { staff: any }) {
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    getStaffAttendance().then(data => {
      const myRecords = (data || []).filter((r: any) => r.staffId === staff.id);
      setRecords(myRecords);
    });
  }, [staff.id]);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const classesThisMonth = records.filter(r => {
    const d = new Date(r.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center">
          <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Classes This Month</p>
          <p className="text-4xl font-bold text-blue-600 mt-2">{classesThisMonth}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center">
          <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Classes</p>
          <p className="text-4xl font-bold text-green-600 mt-2">{records.length}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Your Activity Log</h3>
        <div className="space-y-3">
          {records.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(record => (
            <div key={record.id} className="p-4 border rounded-lg flex justify-between items-center">
              <div>
                <p className="font-bold text-gray-800">{record.type}</p>
                <p className="text-sm text-gray-600">{record.details}</p>
              </div>
              <p className="text-sm text-gray-500">{new Date(record.date).toLocaleString()}</p>
            </div>
          ))}
          {records.length === 0 && <p className="text-gray-500 text-center py-4">No activity recorded yet.</p>}
        </div>
      </div>
    </div>
  );
}


function SalaryView({ staff }: { staff: any }) {
  const handleDownload = (month: string) => {
    const subjects = staff.assignedClasses?.map((c: any) => c.subject).join(', ') || 'N/A';
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(30, 58, 138); // #1e3a8a
    doc.text("AGARAM DHINES ACADEMY", 105, 20, { align: "center" });
    
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text(`SALARY SLIP: ${month}`, 105, 30, { align: "center" });
    
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);
    
    // Staff Details
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Staff Name: ${staff.name}`, 20, 50);
    doc.text(`Role: ${staff.role || 'Teacher'}`, 20, 60);
    doc.text(`Subjects: ${subjects}`, 20, 70);
    
    // Salary Details
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Salary Details", 20, 90);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Basic Salary:`, 20, 105);
    doc.text(`Rs. ${staff.salary || "0"}`, 150, 105);
    
    doc.line(20, 115, 190, 115);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Total Payable:`, 20, 125);
    doc.text(`Rs. ${staff.salary || "0"}`, 150, 125);
    
    // Footer
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 270, { align: "center" });
    doc.text("This is a computer generated document.", 105, 280, { align: "center" });
    
    doc.save(`Payslip_${staff.name.replace(/\s+/g, '_')}_${month.replace(/\s+/g, '_')}.pdf`);
  };

  const months = [
    new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
    new Date(new Date().setMonth(new Date().getMonth() - 1)).toLocaleString('default', { month: 'long', year: 'numeric' }),
    new Date(new Date().setMonth(new Date().getMonth() - 2)).toLocaleString('default', { month: 'long', year: 'numeric' })
  ];

  const subjects = staff.assignedClasses?.map((c: any) => c.subject).join(', ') || 'N/A';

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Salary Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 flex flex-col justify-center">
            <p className="text-sm text-blue-600 font-medium mb-1 uppercase tracking-wider">Current Basic Salary</p>
            <p className="text-4xl font-bold text-blue-900">Rs. {staff.salary || "0"}</p>
          </div>
          <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="flex justify-between border-b border-gray-200 pb-2"><span className="text-gray-500 font-medium">Name:</span> <span className="font-bold text-gray-800">{staff.name}</span></p>
            <p className="flex justify-between border-b border-gray-200 pb-2"><span className="text-gray-500 font-medium">Role:</span> <span className="font-bold text-gray-800">{staff.role || "Teacher"}</span></p>
            <p className="flex justify-between pb-1"><span className="text-gray-500 font-medium">Subjects:</span> <span className="font-bold text-gray-800">{subjects}</span></p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Payslips</h3>
        <div className="space-y-3">
          {months.map((month, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-green-100 text-green-600 p-3 rounded-lg">
                  <FileText size={24} />
                </div>
                <div>
                  <p className="font-bold text-gray-800">Salary Slip - {month}</p>
                  <p className="text-sm text-gray-500">Amount: Rs. {staff.salary || "0"}</p>
                </div>
              </div>
              <button 
                onClick={() => handleDownload(month)}
                className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 hover:text-blue-600 font-medium text-sm transition-colors shadow-sm"
              >
                <Download size={16} />
                <span>Download Sheet</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
