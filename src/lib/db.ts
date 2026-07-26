import { db, isFirebaseConfigured } from './firebase';
import { collection, doc, getDocs, getDoc, setDoc, writeBatch, query, where } from 'firebase/firestore';

const memoryCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL_MS = 5000; // 5 seconds cache to balance performance and freshness

// --- Database Health & Usage Tracking ---
export interface DbMetrics {
  date: string;
  readsToday: number;
  writesToday: number;
  cachedReadsToday: number;
  totalReadsAllTime: number;
  totalWritesAllTime: number;
  lastWriteTime: string | null;
  lastReadTime: string | null;
  isFirebaseConnected?: boolean;
  healthStatus?: string;
  healthScore?: number;
}

const getStoredMetrics = (): DbMetrics => {
  const todayStr = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem('dbMetricsStats');
    if (raw) {
      const parsed: DbMetrics = JSON.parse(raw);
      if (parsed.date !== todayStr) {
        return {
          date: todayStr,
          readsToday: 0,
          writesToday: 0,
          cachedReadsToday: 0,
          totalReadsAllTime: parsed.totalReadsAllTime || 0,
          totalWritesAllTime: parsed.totalWritesAllTime || 0,
          lastWriteTime: parsed.lastWriteTime || null,
          lastReadTime: parsed.lastReadTime || null,
        };
      }
      return parsed;
    }
  } catch (e) {}

  return {
    date: todayStr,
    readsToday: 0,
    writesToday: 0,
    cachedReadsToday: 0,
    totalReadsAllTime: 0,
    totalWritesAllTime: 0,
    lastWriteTime: null,
    lastReadTime: null,
  };
};

const recordReadOperation = (count: number = 1, isCacheHit: boolean = false) => {
  if (count <= 0) return;
  const metrics = getStoredMetrics();
  const now = new Date().toLocaleTimeString();
  
  if (isCacheHit) {
    metrics.cachedReadsToday += count;
  } else {
    metrics.readsToday += count;
    metrics.totalReadsAllTime += count;
  }
  metrics.lastReadTime = now;
  try {
    localStorage.setItem('dbMetricsStats', JSON.stringify(metrics));
  } catch (e) {}
};

const recordWriteOperation = (count: number = 1) => {
  if (count <= 0) return;
  const metrics = getStoredMetrics();
  const now = new Date().toLocaleTimeString();
  
  metrics.writesToday += count;
  metrics.totalWritesAllTime += count;
  metrics.lastWriteTime = now;
  try {
    localStorage.setItem('dbMetricsStats', JSON.stringify(metrics));
  } catch (e) {}
};

export const getDbHealthMetrics = (): DbMetrics => {
  const metrics = getStoredMetrics();
  return {
    ...metrics,
    isFirebaseConnected: isFirebaseConfigured,
    healthStatus: isFirebaseConfigured ? "Healthy (Synced with Cloud)" : "Good (Local Storage Sync)",
    healthScore: isFirebaseConfigured ? 100 : 95
  };
};

export const resetDbHealthMetrics = () => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const reset: DbMetrics = {
    date: todayStr,
    readsToday: 0,
    writesToday: 0,
    cachedReadsToday: 0,
    totalReadsAllTime: 0,
    totalWritesAllTime: 0,
    lastWriteTime: null,
    lastReadTime: null,
  };
  localStorage.setItem('dbMetricsStats', JSON.stringify(reset));
  return reset;
};

// Helper to get data from Firebase with localStorage fallback and memory caching
const getData = async (key: string, defaultValue: any) => {
  // Check memory cache first
  const cached = memoryCache[key];
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    const itemCount = Array.isArray(cached.data) ? Math.max(1, cached.data.length) : 1;
    recordReadOperation(itemCount, true);
    return cached.data;
  }

  // Read local storage data first for immediate system availability
  let localData: any = null;
  try {
    const rawValue = localStorage.getItem(key);
    if (rawValue && rawValue !== 'undefined') {
      localData = JSON.parse(rawValue);
      memoryCache[key] = { data: localData, timestamp: Date.now() };
    }
  } catch (e) {
    console.warn(`Error reading localStorage for ${key}:`, e);
  }

  if (isFirebaseConfigured) {
    try {
      const fetchFirebase = async () => {
        // 1. Try singletons document FIRST as it contains the authoritative complete array state
        try {
          const singletonRef = doc(db, 'singletons', key);
          const singletonSnap = await getDoc(singletonRef);
          if (singletonSnap.exists() && singletonSnap.data()?.data !== undefined) {
            return singletonSnap.data().data;
          }
        } catch (singErr) {
          console.warn(`Error fetching singleton ${key}:`, singErr);
        }

        // 2. For array collections, fall back to collection query if singleton is not present
        if (Array.isArray(defaultValue)) {
          try {
            const querySnapshot = await getDocs(collection(db, key));
            if (!querySnapshot.empty) {
              const fbData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
              return fbData;
            }
          } catch (colErr) {
            console.warn(`Error fetching collection ${key}:`, colErr);
          }
        }

        return null;
      };

      const fbData = await Promise.race([
        fetchFirebase(),
        new Promise<null>(resolve => setTimeout(() => resolve(null), 8000))
      ]);

      if (fbData !== null && fbData !== undefined) {
        memoryCache[key] = { data: fbData, timestamp: Date.now() };
        try {
          localStorage.setItem(key, JSON.stringify(fbData));
        } catch (e) {}
        const itemCount = Array.isArray(fbData) ? Math.max(1, fbData.length) : 1;
        recordReadOperation(itemCount, false);
        return fbData;
      }
    } catch (error: any) {
      console.warn(`Firebase error fetching ${key}. Using local storage.`, error);
    }
  }

  if (localData !== null && localData !== undefined) {
    const itemCount = Array.isArray(localData) ? Math.max(1, localData.length) : 1;
    recordReadOperation(itemCount, false);
    return localData;
  }

  memoryCache[key] = { data: defaultValue, timestamp: Date.now() };
  recordReadOperation(1, false);
  return defaultValue;
};

// Helper to save data to Firebase and localStorage simultaneously
const saveData = async (key: string, data: any) => {
  // Deep clean to remove any undefined fields or functions that break Firestore SDK
  const cleanData = JSON.parse(JSON.stringify(data ?? null));

  // Record write metric
  const writeCount = Array.isArray(cleanData) ? Math.max(1, cleanData.length) : 1;
  recordWriteOperation(writeCount);

  // 1. Save to local system storage & memory cache immediately
  memoryCache[key] = { data: cleanData, timestamp: Date.now() };

  try {
    localStorage.setItem(key, JSON.stringify(cleanData));
  } catch (e) {
    console.warn(`Failed to save ${key} to localStorage. It might be full.`, e);
    if (key === 'chatMessages' && Array.isArray(cleanData) && cleanData.length > 100) {
      try {
        const reducedData = cleanData.slice(-100);
        localStorage.setItem(key, JSON.stringify(reducedData));
      } catch (e2) {
        console.warn(`Still failed to save reduced ${key} to localStorage.`, e2);
      }
    }
  }

  // 2. Save to Firebase Firestore simultaneously
  if (isFirebaseConfigured) {
    const firebaseSaveTask = async () => {
      // 1. Always write as a single document under 'singletons' first
      try {
        const singletonRef = doc(db, 'singletons', key);
        await setDoc(singletonRef, { data: cleanData, updatedAt: Date.now() });
      } catch (singErr) {
        console.warn(`Singleton write for ${key} failed:`, singErr);
      }

      // 2. If data is an array, sync items to individual collection docs in Firestore
      if (Array.isArray(cleanData)) {
        try {
          const CHUNK_SIZE = 400;
          for (let i = 0; i < cleanData.length; i += CHUNK_SIZE) {
            const chunk = cleanData.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch(db);
            chunk.forEach((item: any, idx: number) => {
              const docId = String(item.id || item.code || item.rollNo || `item_${idx}`);
              const itemRef = doc(db, key, docId);
              batch.set(itemRef, item);
            });
            await batch.commit();
          }
        } catch (colErr) {
          console.warn(`Collection write for ${key} failed:`, colErr);
        }
      }

      memoryCache[key] = { data: cleanData, timestamp: Date.now() };
    };

    try {
      await Promise.race([
        firebaseSaveTask(),
        new Promise(resolve => setTimeout(resolve, 6000))
      ]);
    } catch (error: any) {
      console.error(`Firebase error saving ${key}:`, error);
    }
  }
};

export const getAdminSettings = () => getData('adminSettings', {
  username: "agaramdhines",
  password: "0756452527Dd",
  email: "Ddhinesnivas111@gmail.com",
  profileImage: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSUXk2g5YJOQDHiOYn-CwQrBzvNqPuok_bdUA&s",
  instituteName: "Agaram Dhines Online Academy"
});
export const saveAdminSettings = (settings: any) => saveData('adminSettings', settings);

export const getChatbotSettings = () => getData('chatbotSettings', {
  grade06: {
    title: "தரம் 06",
    subjects: [
      {
        id: "g06_tamil",
        name: "தமிழ்",
        teacher: "Mr. Dhines",
        fee: "Rs. 1300",
        startDate: "புதிய வகுப்புகள் ஆரம்பம்! நவீன தொழில்நுட்பத்துடன் தமிழை எளிதாகக் கற்க இணையுங்கள்.",
        time: "திங்கள், ஞாயிறு (Mon, Sun): 5.30 PM - 6.30 PM",
        features: "AI தொழில்நுட்பம் & தனிப்பட்ட கவனம்!",
        contact: "0778054232",
        whatsappLink: "https://chat.whatsapp.com/I0u8we2kPKO5SrQRBpk3CN",
        registrationLink: "",
        imageLink: ""
      }
    ]
  },
  grade07: {
    title: "தரம் 07",
    subjects: [
      {
        id: "g07_tamil",
        name: "தமிழ்",
        teacher: "Mr. Dhines",
        fee: "Rs. 1300",
        startDate: "புதிய வகுப்புகள் ஆரம்பம்! நவீன தொழில்நுட்பத்துடன் தமிழை கற்க இணையுங்கள்.",
        time: "புதன் (Wednesday): 5.30 PM - 6.30 PM",
        features: "AI தொழில்நுட்பம் & தனிப்பட்ட கவனம்!",
        contact: "0778054232",
        whatsappLink: "https://chat.whatsapp.com/LxJ5QcqOAXaFtpHdf2YoTD",
        registrationLink: "",
        imageLink: ""
      }
    ]
  },
  grade08: {
    title: "தரம் 08",
    subjects: [
      {
        id: "g08_tamil",
        name: "தமிழ்",
        teacher: "Mr. Dhines",
        fee: "Rs. 1300",
        startDate: "புதிய வகுப்புகள் ஆரம்பம்! நவீன தொழில்நுட்பத்துடன் தமிழை கற்க இணையுங்கள்.",
        time: "வியாழன் (Thursday): 5.30 PM - 7.30 PM",
        features: "AI தொழில்நுட்பம் & தனிப்பட்ட கவனம்!",
        contact: "0778054232",
        whatsappLink: "https://chat.whatsapp.com/Hyd9B73RaLj1H3GU2jCJKa",
        registrationLink: "",
        imageLink: ""
      }
    ]
  },
  grade09: {
    title: "தரம் 09",
    subjects: [
      {
        id: "g09_tamil",
        name: "தமிழ்",
        teacher: "Mr. Dhines",
        fee: "Rs. 1300",
        startDate: "புதிய வகுப்புகள் ஆரம்பம்! நவீன தொழில்நுட்பத்துடன் தமிழை கற்க இணையுங்கள்.",
        time: "ஞாயிறு (Sunday): 6.30 PM - 8.30 PM",
        features: "AI தொழில்நுட்பம் & தனிப்பட்ட கவனம்!",
        contact: "0778054232",
        whatsappLink: "https://chat.whatsapp.com/Lv4GRdFdggdKPel8Cvf1DC",
        registrationLink: "",
        imageLink: ""
      }
    ]
  },
  grade10: {
    title: "தரம் 10",
    subjects: [
      {
        id: "g10_tamil",
        name: "தமிழ்",
        teacher: "Mr. Dhines",
        fee: "Rs. 1500",
        startDate: "புதிய வகுப்புகள் ஆரம்பம். சிறந்த பெறுபேறுகளைப் பெற இப்போதே இணையுங்கள்!",
        time: "Theory: வெள்ளி & சனி (6.30 PM - 7.30 PM) | Paper Class: செவ்வாய் (9.00 PM - 10.30 PM)",
        features: "பாடவிளக்கம் + PDF Notes + Recordings அனைத்தும் உண்டு!",
        contact: "0778054232",
        whatsappLink: "https://chat.whatsapp.com/LAlOco0VwbvDtpoONNjdIC",
        registrationLink: "",
        imageLink: ""
      }
    ]
  },
  grade11: {
    title: "தரம் 11",
    subjects: [
      {
        id: "g11_tamil",
        name: "தமிழ்",
        teacher: "Mr. Dhines",
        fee: "Rs. 1500",
        startDate: "புதிய வகுப்புகள் ஆரம்பம். சிறந்த பெறுபேறுகளைப் பெற இப்போதே இணையுங்கள்!",
        time: "Theory: வெள்ளி & சனி (6.30 PM - 7.30 PM) | Paper Class: செவ்வாய் (9.00 PM - 10.30 PM)",
        features: "பாடவிளக்கம் + PDF Notes + Recordings அனைத்தும் உண்டு!",
        contact: "0778054232",
        whatsappLink: "https://chat.whatsapp.com/LAlOco0VwbvDtpoONNjdIC",
        registrationLink: "",
        imageLink: ""
      }
    ]
  },
    fees: {
    items: [
      { label: "தரம் 06 - 09 வரை", amount: "Rs. 1300" },
      { label: "தரம் 10 - 11", amount: "Rs. 1500" },
      { label: "வினா விடை வகுப்பு", amount: "Rs. 1500" },
      { label: "30 நாள் பாடநெறி", amount: "Rs. 6000" },
      { label: "வினா விடை பாடநெறி", amount: "Rs. 6000" }
    ],
    noteTitle: "கட்டண விபரங்கள்",
    noteDescription: "அகரம் தினேஸ் Online Academy வழங்கும் 2026 ஆம் கல்வி ஆண்டிற்கான முதலாம் தவணை தமிழ் வகுப்புகள். தமிழ் மற்றும் ஆங்கில மொழிமூல (Tamil & English Medium) மாணவர்களுக்கானது.",
    noteFooter: "குறிப்பு: முற்பதிவு கட்டணம் செலுத்தி வகுப்பில் இணைய முடியும்."
  },
  contact: {
    whatsapp: "0778054232",
    phone: "0778054232",
    message: "எந்தவொரு சந்தேகங்களுக்கும் எங்களை தொடர்பு கொள்ளவும்:"
  }
});
export const saveChatbotSettings = (settings: any) => saveData('chatbotSettings', settings);

export const getPasswordRequests = () => getData('passwordRequests', []);
export const savePasswordRequests = (requests: any) => saveData('passwordRequests', requests);

export const getStudents = () => getData('students', []);
export const saveStudents = async (students: any) => {
  const sanitized = (Array.isArray(students) ? students : []).map((student: any) => ({
    ...student,
    id: String(student.id || "STU" + Math.floor(100000 + Math.random() * 900000))
  }));
  return saveData('students', sanitized);
};

export const getZoomLinks = async () => {
  const links = await getData('zoomLinks', []);
  const now = new Date().getTime();
  const fiveHours = 5 * 60 * 60 * 1000;
  
  const validLinks = links.filter((link: any) => {
    if (!link.datetime) return true;
    const linkTime = new Date(link.datetime).getTime();
    return (now - linkTime) < fiveHours;
  });
  
  if (validLinks.length !== links.length) {
    await saveZoomLinks(validLinks);
  }
  
  return validLinks;
};
export const saveZoomLinks = (links: any) => saveData('zoomLinks', links);

export const getCourses = () => getData('courses', []);
export const saveCourses = (courses: any) => saveData('courses', courses);

export const getCourseMaterials = () => getData('courseMaterials', []);
export const saveCourseMaterials = (materials: any) => saveData('courseMaterials', materials);

export const getYoutubeLinks = () => getData('youtubeLinks', []);
export const saveYoutubeLinks = (links: any) => saveData('youtubeLinks', links);

export const getFees = () => getData('fees', []);
export const saveFees = (fees: any) => saveData('fees', fees);

export const getAttendance = () => getData('attendance', []);
export const saveAttendance = (attendance: any) => saveData('attendance', attendance);

export const getSchedule = () => getData('schedule', []);
export const saveSchedule = (schedule: any) => saveData('schedule', schedule);

export const getClassLinks = () => getData('classLinks', {});
export const saveClassLinks = (links: any) => saveData('classLinks', links);

export const getCourseWebsiteLinks = async () => {
  const links = await getData('courseWebsiteLinks', {});
  const defaultLinks = {
    "30 DAY'S TAMIL COURSE": "https://www.agaramdhines.lk/courses/30-%e0%ae%a8%e0%ae%be%e0%ae%9f%e0%af%8d%e0%ae%95%e0%ae%b3%e0%ae%bf%e0%ae%b2%e0%af%8d-o-l-%e0%ae%a4%e0%ae%ae%e0%ae%bf%e0%ae%b4%e0%af%8d-2026-dec/",
    "தரம் 06": "https://www.agaramdhines.lk/courses/",
    "தரம் 07": "https://www.agaramdhines.lk/courses/",
    "தரம் 08": "https://www.agaramdhines.lk/courses/",
    "தரம் 09": "https://www.agaramdhines.lk/courses/",
    "தரம் 10": "https://www.agaramdhines.lk/courses/",
    "தரம் 11": "https://www.agaramdhines.lk/courses/"
  };
  const merged = { ...defaultLinks, ...(links || {}) };
  if (!links || !links["30 DAY'S TAMIL COURSE"]) {
    saveData('courseWebsiteLinks', merged);
  }
  return merged;
};
export const saveCourseWebsiteLinks = (links: any) => saveData('courseWebsiteLinks', links);

export const getClasses = () => getData('classes', []);
export const saveClasses = (classes: any) => saveData('classes', classes);

export const getHomework = () => getData('homework', []);
export const saveHomework = (homework: any) => saveData('homework', homework);

export const getStaffs = () => getData('staffs', []);
export const saveStaffs = (staffs: any) => saveData('staffs', staffs);

export const getStaffAttendance = () => getData('staffAttendance', []);
export const saveStaffAttendance = (attendance: any) => saveData('staffAttendance', attendance);

export const getSubjects = async () => {
  const list = await getData('subjects', []);
  const defaults = [
    { id: "seed_tamil_quiz", name: "தமிழ் வினா விடை", category: "Sub", fee: "500" },
    { id: "seed_30day_tamil", name: "30 நாள் தமிழ் பாடநெறி (தரம் 11)", category: "Sub", fee: "6000" },
    { id: "seed_tamil_main", name: "tamil", category: "Main", fee: "0" }
  ];
  let changed = false;
  const listArray = Array.isArray(list) ? list : [];
  defaults.forEach(def => {
    if (!listArray.some((s: any) => s && s.name && s.name.toLowerCase().trim() === def.name.toLowerCase().trim())) {
      listArray.push(def);
      changed = true;
    }
  });
  if (changed) {
    saveData('subjects', listArray);
  }
  return listArray;
};
export const saveSubjects = (subjects: any) => saveData('subjects', subjects);

export const getIncomeExpense = () => getData('incomeExpense', []);
export const saveIncomeExpense = (data: any) => saveData('incomeExpense', data);

export const getGrades = () => getData('grades', []);
export const saveGrades = (grades: any) => saveData('grades', grades);

export const getTimeTable = () => getData('timetable', []);
export const saveTimeTable = (timetable: any) => saveData('timetable', timetable);

export const getExamMarks = () => getData('examMarks', []);
export const saveExamMarks = (marks: any) => saveData('examMarks', marks);

export const getWebPosts = () => getData('webPosts', []);
export const saveWebPosts = (posts: any) => saveData('webPosts', posts);

export const getExamSettings = () => getData('examSettings', []);
export const saveExamSettings = (settings: any) => saveData('examSettings', settings);

export const getAnnouncements = () => getData('announcements', []);
export const saveAnnouncements = (announcements: any) => saveData('announcements', announcements);

export const getBehaviourRecords = () => getData('behaviourRecords', []);
export const saveBehaviourRecords = (records: any) => saveData('behaviourRecords', records);

export const getQuestionPapers = () => getData('questionPapers', []);
export const saveQuestionPapers = (papers: any) => saveData('questionPapers', papers);

export const getNotifications = (grade: string) => {
  if (isFirebaseConfigured) {
    // We return a query that can be used with onSnapshot
    return query(collection(db, 'notifications'), where('grade', '==', grade));
  }
  return null;
};

export const addNotification = async (notification: { grade: string, title: string, message: string, type: string, createdAt: string }) => {
  if (isFirebaseConfigured) {
    const docRef = doc(collection(db, 'notifications'));
    await setDoc(docRef, { ...notification, id: docRef.id });
  } else {
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    notifications.push({ ...notification, id: Date.now().toString() });
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }
};

export const getChatMessages = () => getData('chatMessages', []);
export const saveChatMessages = (messages: any) => saveData('chatMessages', messages);

export const initDB = async () => {
  const students = await getStudents();
  if (!students || students.length === 0) {
    await saveStudents([]);
  }
  
  const zoomLinks = await getZoomLinks();
  if (!zoomLinks || zoomLinks.length === 0) {
    await saveZoomLinks([
      { id: "1", grade: "தரம் 10", title: "Tamil Live Class", link: "https://zoom.us/j/123456789", datetime: "2026-03-05T10:00" }
    ]);
  }
  
  const courses = await getCourses();
  if (!courses || courses.length === 0) {
    await saveCourses([
      { id: "1", grade: "தரம் 10", title: "Science", link: "https://www.agaramdhines.lk/courses/g10-science" }
    ]);
  }
  
  const youtubeLinks = await getYoutubeLinks();
  if (!youtubeLinks || youtubeLinks.length === 0) {
    await saveYoutubeLinks([
      { id: "1", title: "Tamil Chapter 1", link: "https://www.youtube.com/watch?v=12345", folder: "General", grade: "தரம் 10", date: new Date().toISOString() },
      { id: "new-folder-y-sample", title: "Welcome to New Folder Y", link: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", folder: "New Folder Y", grade: "தரம் 10", date: new Date().toISOString() }
    ]);
  } else if (!youtubeLinks.find((l: any) => l.folder === "New Folder Y")) {
    // If it exists but doesn't have the new folder, add it
    const updatedLinks = [
      ...youtubeLinks,
      { id: `new-folder-y-${Date.now()}`, title: "Folder Initialization", link: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", folder: "New Folder Y", grade: "தரம் 10", date: new Date().toISOString() }
    ];
    await saveYoutubeLinks(updatedLinks);
  }
  
  const schedule = await getSchedule();
  if (!schedule || schedule.length === 0) {
    await saveSchedule([
      { id: "1", grade: "தரம் 10", day: "Monday", time: "08:00 AM", subject: "Tamil", link: "https://zoom.us/j/123" }
    ]);
  }
  
  const classLinks = await getClassLinks();
  if (!classLinks || Object.keys(classLinks).length === 0) {
    await saveClassLinks({});
  }
  
  const homework = await getHomework();
  if (!homework || homework.length === 0) {
    await saveHomework([
      {
        id: "1",
        grade: "தரம் 10",
        title: "Tamil Chapter 1 Exercise",
        description: "Complete all exercises at the end of Chapter 1.",
        date: new Date().toISOString().split('T')[0]
      }
    ]);
  }
};

// மாணவரின் கட்டண விபரத்தைப் பெற
export const getStudentPayments = async (studentId: string) => {
  if (isFirebaseConfigured) {
    try {
      const q = query(collection(db, "payments"), where("student_id", "==", studentId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.warn("Firebase error fetching student payments:", error);
    }
  }
  return [];
};
