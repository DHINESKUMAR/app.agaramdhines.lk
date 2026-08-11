import { db, isFirebaseConfigured } from './firebase';
import { collection, doc, getDocs, getDoc, setDoc, writeBatch, query, where, onSnapshot } from 'firebase/firestore';

const memoryCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL_MS = 2000; // 2 seconds short cache to prevent duplicate calls during single render

// Real-time listener registry for Firebase singletons
const activeListeners: Record<string, () => void> = {};

const mergeArraysById = (primary: any[], secondary: any[]) => {
  if (!Array.isArray(primary)) return Array.isArray(secondary) ? secondary : [];
  if (!Array.isArray(secondary)) return primary;

  const map = new Map<string, any>();
  primary.forEach(item => {
    if (!item) return;
    const key = String(item.id || item.rollNo || item.username || item.phone || JSON.stringify(item)).trim().toLowerCase();
    if (key) map.set(key, item);
  });

  secondary.forEach(item => {
    if (!item) return;
    const key = String(item.id || item.rollNo || item.username || item.phone || JSON.stringify(item)).trim().toLowerCase();
    if (key && !map.has(key)) {
      map.set(key, item);
    }
  });

  return Array.from(map.values());
};

const setupRealtimeListener = (key: string) => {
  if (!isFirebaseConfigured || activeListeners[key]) return;
  try {
    const singletonRef = doc(db, 'singletons', key);
    const unsub = onSnapshot(singletonRef, (snapshot) => {
      if (snapshot.exists() && snapshot.data()?.data !== undefined) {
        const freshData = snapshot.data().data;
        memoryCache[key] = { data: freshData, timestamp: Date.now() };
        try {
          localStorage.setItem(key, JSON.stringify(freshData));
        } catch (e) {}

        window.dispatchEvent(new CustomEvent('db_updated', { detail: { key, data: freshData } }));
      }
    }, (err) => {
      console.warn(`Realtime snapshot error for ${key}:`, err);
    });
    activeListeners[key] = unsub;
  } catch (e) {
    console.warn(`Failed to setup realtime listener for ${key}:`, e);
  }
};

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
  // Start realtime listener for instant cloud sync across all devices
  setupRealtimeListener(key);

  // Check memory cache first
  const cached = memoryCache[key];
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    recordReadOperation(1, true);
    return cached.data;
  }

  // Read local storage data first
  let localData: any = null;
  try {
    const rawValue = localStorage.getItem(key);
    if (rawValue && rawValue !== 'undefined') {
      localData = JSON.parse(rawValue);
    }
  } catch (e) {
    console.warn(`Error reading localStorage for ${key}:`, e);
  }

  if (isFirebaseConfigured) {
    try {
      const fetchFirebase = async () => {
        // 1. Try singletons document FIRST
        try {
          const singletonRef = doc(db, 'singletons', key);
          const singletonSnap = await getDoc(singletonRef);
          if (singletonSnap.exists() && singletonSnap.data()?.data !== undefined) {
            const fbData = singletonSnap.data().data;
            
            // If local storage has more entries than cloud, merge and update cloud
            if (Array.isArray(fbData) && Array.isArray(localData) && localData.length > fbData.length) {
              const merged = mergeArraysById(fbData, localData);
              if (merged.length > fbData.length) {
                setDoc(singletonRef, { data: merged, updatedAt: Date.now() }).catch(() => {});
                return merged;
              }
            }
            return fbData;
          }
        } catch (singErr) {
          console.warn(`Error fetching singleton ${key}:`, singErr);
        }

        // 2. Legacy fallback: query collection once
        if (Array.isArray(defaultValue)) {
          try {
            const querySnapshot = await getDocs(collection(db, key));
            if (!querySnapshot.empty) {
              const colData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
              if (colData.length > 0) {
                setDoc(doc(db, 'singletons', key), { data: colData, updatedAt: Date.now() }).catch(() => {});
                return colData;
              }
            }
          } catch (colErr) {
            console.warn(`Error fetching collection ${key}:`, colErr);
          }
        }

        // Seed Firebase if singleton does not exist yet but local data exists
        if (localData !== null && localData !== undefined) {
          setDoc(doc(db, 'singletons', key), { data: localData, updatedAt: Date.now() }).catch(() => {});
          return localData;
        }

        return localData;
      };

      const timeoutMs = 10000; // Allow 10s for mobile networks
      const fbData = await Promise.race([
        fetchFirebase(),
        new Promise<null>(resolve => setTimeout(() => resolve(null), timeoutMs))
      ]);

      if (fbData !== null && fbData !== undefined) {
        memoryCache[key] = { data: fbData, timestamp: Date.now() };
        try {
          localStorage.setItem(key, JSON.stringify(fbData));
        } catch (e) {}
        recordReadOperation(1, false);
        return fbData;
      }
    } catch (error: any) {
      console.warn(`Firebase error fetching ${key}. Using local storage.`, error);
    }
  }

  if (localData !== null && localData !== undefined) {
    memoryCache[key] = { data: localData, timestamp: Date.now() };
    recordReadOperation(1, true);
    return localData;
  }

  memoryCache[key] = { data: defaultValue, timestamp: Date.now() };
  recordReadOperation(1, false);
  return defaultValue;
};

// Helper to save data to Firebase and localStorage simultaneously
const saveData = async (key: string, data: any) => {
  const cleanData = JSON.parse(JSON.stringify(data ?? null));

  recordWriteOperation(1);

  memoryCache[key] = { data: cleanData, timestamp: Date.now() };

  try {
    localStorage.setItem(key, JSON.stringify(cleanData));
  } catch (e) {
    console.warn(`Failed to save ${key} to localStorage.`, e);
  }

  // Dispatch custom event for real-time local updates
  window.dispatchEvent(new CustomEvent('db_updated', { detail: { key, data: cleanData } }));

  if (isFirebaseConfigured) {
    try {
      const singletonRef = doc(db, 'singletons', key);
      await Promise.race([
        setDoc(singletonRef, { data: cleanData, updatedAt: Date.now() }),
        new Promise(resolve => setTimeout(resolve, 8000))
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
  profileImage: "/logo.png",
  instituteName: "Agaram Dhines Online Academy"
});
export const saveAdminSettings = (settings: any) => saveData('adminSettings', settings);

export const getHomePageContent = () => getData('homePageContent', {
  heroTagText: "New Version 2.0 Released",
  heroTitle: "WELCOME TO AGARAM DHINES ONLINE ACADEMY",
  button1Text: "வகுப்புகள் பற்றி அறிந்து கொள்ள",
  button1Url: "https://www.agaramdhines.lk/courses/",
  button2Text: "Visit agaramdhines.lk",
  button2Url: "https://www.agaramdhines.lk",
  button3Text: "Login Portal",
  slides: [
    {
      id: "default-1",
      image: "https://img.freepik.com/free-vector/flat-design-e-learning-concept-with-laptop_23-2148593003.jpg",
      title: "Welcome to Agaram Dhines Academy",
      subtitle: "Learn from anywhere, anytime.",
      isActive: true
    },
    {
      id: "default-2",
      image: "https://img.freepik.com/free-vector/online-education-banner-template_23-2149005626.jpg",
      title: "New Classes Starting Soon!",
      subtitle: "Enroll now for the upcoming semester.",
      isActive: true
    },
    {
      id: "default-3",
      image: "https://img.freepik.com/free-vector/gradient-back-school-sale-banner-template_23-2149045028.jpg",
      title: "Special Discount on Zoom Classes",
      subtitle: "Get up to 20% off on early registration.",
      isActive: true
    }
  ],
  navItems: [
    { id: 'Home', name: 'Home', link: '#' },
    { id: 'WEBSITE', name: 'WEBSITE', link: 'https://www.agaramdhines.lk/' },
    { id: 'COURSES', name: 'COURSES', link: 'https://www.agaramdhines.lk/courses/' },
    { id: 'ZOOM CLASS', name: 'ZOOM CLASS', link: 'https://www.agaramdhines.lk/category/%e0%ae%a4%e0%ae%ae%e0%ae%bf%e0%ae%b4%e0%af%8d-zoom-class-06-to-11/' },
    { id: 'REGISTRATION', name: 'REGISTRATION', link: 'https://www.agaramdhines.lk/lp-profile/' },
    { id: 'YOUTUBE', name: 'YOUTUBE', link: 'https://www.youtube.com/@agaramdhines' },
    { id: 'Login', name: 'Login', link: '#login' }
  ],
  noticeBanner: "",
  showNoticeBanner: false,
  noticeBoardTitle: "புதிய அறிவிப்புகள் / Notice Board",
  notices: [
    {
      id: "notice-1",
      title: "தரம் 06 - 11 புதிய தமிழ் Zoom வகுப்புகள் ஆரம்பம்",
      date: "2026-07-27",
      type: "Important",
      content: "புதிய தவணைக்கான தமிழ் ஆன்லைன் நேரலை Zoom வகுப்புகள் வெற்றிகரமாக ஆரம்பமாகியுள்ளது. மாணவர்கள் உடனே இணையலாம்.",
      link: "https://www.agaramdhines.lk/courses/",
      isPinned: true
    },
    {
      id: "notice-2",
      title: "தரம் 11 சிறப்பு வினா விடை கருத்தரங்கு",
      date: "2026-07-25",
      type: "Event",
      content: "வரவிருக்கும் சாதாரண தரப் பரீட்சைக்கான மாதிரி வினாத்தாள் கலந்துரையாடல் வெள்ளி மற்றும் சனிக்கிழமைகளில் நடைபெறும்.",
      link: "",
      isPinned: false
    }
  ],
  footerDescription: "The ultimate education management ERP with all advance features to run your institution smoothly.",
  facebookUrl: "https://facebook.com",
  twitterUrl: "https://twitter.com",
  instagramUrl: "https://instagram.com",
  playStoreUrl: "https://play.google.com",
  appStoreUrl: "https://apple.com",
  contactPhone: "0778054232",
  contactWhatsapp: "94778054232",
  contactEmail: "Ddhinesnivas111@gmail.com"
});

export const saveHomePageContent = (content: any) => saveData('homePageContent', content);

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

export const normalizeSub = (str: string) => {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/\(தரம்\s*\d+\)/gi, '')
    .replace(/\(grade\s*\d+\)/gi, '')
    .replace(/தரம்\s*\d+/gi, '')
    .replace(/grade\s*\d+/gi, '')
    .replace(/[\(\)\-\:\,\.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const getCanonicalSubject = (s: string): string => {
  if (!s) return "";
  const raw = normalizeSub(s);

  if (raw === "tamil" || raw === "தமிழ்") {
    return "tamil";
  }
  if (raw.includes("நயம்") || raw.includes("nayam") || (raw.includes("இலக்கிய") && raw.includes("நயம்"))) {
    return "tamil_ilakkia_nayam";
  }
  if (raw.includes("மொழி") && raw.includes("இலக்கிய")) {
    return "tamil_mozhi_ilakkiam";
  }
  if (raw.includes("30 நாள்") || raw.includes("30 day")) {
    if (raw.includes("15") || raw.includes("30 வது")) return "tamil_30_days_part2";
    return "tamil_30_days";
  }
  if (raw.includes("வினா") || raw.includes("vina") || raw.includes("q&a") || raw.includes("question")) {
    return "tamil_vina_vidai";
  }
  if (raw.includes("வளம்") || raw.includes("game")) {
    return "tamil_mozhi_valam";
  }

  return raw;
};

export const areSubjectsMatching = (itemSub: string, studentSub: string): boolean => {
  if (!itemSub || !studentSub) return false;
  const rawItem = itemSub.trim().toLowerCase();
  const rawSt = studentSub.trim().toLowerCase();

  if (rawItem === rawSt) return true;

  const wildcards = ["all", "general", "public", "e-learning", "uncategorized", "அனைத்து", "அனைத்து பாடங்களும்", "all subjects"];
  if (wildcards.includes(rawItem) || wildcards.includes(rawSt)) return true;

  const normItem = normalizeSub(itemSub);
  const normSt = normalizeSub(studentSub);

  if (normItem && normSt && normItem === normSt) return true;

  const canonItem = getCanonicalSubject(itemSub);
  const canonSt = getCanonicalSubject(studentSub);

  if (canonItem && canonSt && canonItem === canonSt) return true;

  return false;
};

export const sanitizeSubjectList = (subs: any[]): string[] => {
  if (!Array.isArray(subs)) return [];
  const map = new Map<string, string>();
  subs.forEach((s: any) => {
    if (!s) return;
    const name = String(s).trim();
    if (!name) return;
    const lowerKey = name.toLowerCase();
    if (!map.has(lowerKey)) {
      map.set(lowerKey, name);
    }
  });
  return Array.from(map.values());
};

export const getStudents = async () => {
  const raw = await getData('students', []);
  if (!Array.isArray(raw)) return [];
  return raw.map((student: any) => {
    if (!student) return student;
    const subjects = sanitizeSubjectList(student.subjects || student.enrolledClasses || []);
    return {
      ...student,
      subjects
    };
  });
};

export const saveStudents = async (students: any) => {
  const sanitized = (Array.isArray(students) ? students : []).map((student: any) => ({
    ...student,
    subjects: sanitizeSubjectList(student.subjects || student.enrolledClasses || []),
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

export const getCourseMaterials = async () => {
  const raw = await getData('courseMaterials', []);
  return Array.isArray(raw) ? raw : [];
};
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

export const getClasses = async () => {
  const rawClasses = await getData('classes', []);
  if (!Array.isArray(rawClasses)) return [];
  const classMap = new Map<string, any>();
  let hasDuplicates = false;
  rawClasses.forEach((item: any) => {
    if (!item) return;
    const key = (item.name || item.id || '').toString().trim().toLowerCase();
    if (!key) return;
    if (classMap.has(key)) {
      hasDuplicates = true;
      const existing = classMap.get(key);
      classMap.set(key, { ...existing, ...item, id: existing.id || item.id });
    } else {
      classMap.set(key, item);
    }
  });
  const deduped = Array.from(classMap.values());
  if (hasDuplicates) {
    saveData('classes', deduped).catch(() => {});
  }
  return deduped;
};
export const saveClasses = (classes: any) => saveData('classes', classes);

export const getHomework = () => getData('homework', []);
export const saveHomework = (homework: any) => saveData('homework', homework);

export const getStaffs = () => getData('staffs', []);
export const saveStaffs = (staffs: any) => saveData('staffs', staffs);

export const getStaffAttendance = () => getData('staffAttendance', []);
export const saveStaffAttendance = (attendance: any) => saveData('staffAttendance', attendance);

export const getSubjects = async () => {
  const rawList = await getData('subjects', null);
  
  const defaultSubjects = [
    { id: "sub_1", name: "தமிழ் வினா விடை", category: "Sub", fee: "500", grade: "தரம் 11" },
    { id: "sub_2", name: "30 நாள் தமிழ் பாடநெறி (தரம் 11)", category: "Sub", fee: "6000", grade: "தரம் 11" },
    { id: "sub_3", name: "தமிழ் மொழி இலக்கியம்", category: "Main", fee: "0", grade: "தரம் 11" },
    { id: "sub_4", name: "தமிழ் மொழி வளம் (GAME)", category: "Main", fee: "0" },
    { id: "sub_5", name: "30 நாள் (15 - 30) வது நாள்", category: "Sub", fee: "3000", grade: "தரம் 11" },
    { id: "sub_6", name: "தமிழ் இலக்கிய நயம்", category: "Sub", fee: "4000", grade: "தரம் 11" },
    { id: "sub_7", name: "தமிழ்", category: "Main", fee: "0" }
  ];

  if (rawList === null || rawList === undefined) {
    await saveData('subjects', defaultSubjects);
    return defaultSubjects;
  }

  const listArray = Array.isArray(rawList) ? rawList : [];

  // Deduplicate and sanitize list array
  const map = new Map<string, any>();
  
  // Known variants of "இலக்கிய நயம்" to consolidate into a single "தமிழ் இலக்கிய நயம்"
  const redundantIlakkiaNayamVariants = new Set([
    "இலக்கிய நயம்",
    "இலக்கிய நயம் (தரம் 11)",
    "தமிழ் இலக்கிய நயம் (தரம் 11)"
  ]);

  for (const item of listArray) {
    if (!item || !item.name) continue;
    let rawName = String(item.name).replace(/\s+/g, ' ').trim();
    if (!rawName) continue;

    // Consolidate redundant variants into single "தமிழ் இலக்கிய நயம்"
    if (redundantIlakkiaNayamVariants.has(rawName)) {
      rawName = "தமிழ் இலக்கிய நயம்";
      item.name = "தமிழ் இலக்கிய நயம்";
    }

    const nameKey = rawName.toLowerCase();

    if (!map.has(nameKey)) {
      map.set(nameKey, item);
    } else {
      const existing = map.get(nameKey);
      if ((!existing.fee || existing.fee === "0") && item.fee && item.fee !== "0") {
        map.set(nameKey, item);
      }
    }
  }

  // Ensure default main subjects exist
  defaultSubjects.forEach(def => {
    const key = def.name.toLowerCase();
    if (!map.has(key)) {
      map.set(key, def);
    }
  });

  const deduplicated = Array.from(map.values());

  // If cleanup or addition changed the stored list, persist the cleaned list
  if (deduplicated.length !== listArray.length) {
    saveData('subjects', deduplicated);
  }

  return deduplicated;
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
  await getStudents();
  await getStaffs();
  
  if (!isFirebaseConfigured) {
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
        { id: "1", title: "Tamil Chapter 1", link: "https://www.youtube.com/watch?v=12345", folder: "General", grade: "தரம் 10", date: new Date().toISOString() }
      ]);
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

const ALL_BACKUP_COLLECTIONS = [
  'adminSettings', 'homePageContent', 'chatbotSettings', 'passwordRequests',
  'students', 'zoomLinks', 'courses', 'courseMaterials', 'youtubeLinks',
  'fees', 'attendance', 'schedule', 'classLinks', 'courseWebsiteLinks',
  'classes', 'homework', 'staffs', 'staffAttendance', 'subjects',
  'incomeExpense', 'grades', 'timetable', 'examMarks', 'webPosts',
  'examSettings', 'announcements', 'behaviourRecords', 'questionPapers',
  'chatMessages'
];

export const exportFullSystemBackup = async () => {
  const backupData: Record<string, any> = {};
  for (const key of ALL_BACKUP_COLLECTIONS) {
    try {
      backupData[key] = await getData(key, null);
    } catch (e) {
      console.error(`Error backing up collection ${key}:`, e);
    }
  }
  const now = new Date();
  const dateFormatted = now.toLocaleDateString("en-GB") + " " + now.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true });
  return {
    system: "Agaram Dhines Online Academy",
    version: "1.0",
    exportDate: now.toISOString(),
    exportDateFormatted: dateFormatted,
    data: backupData
  };
};

export const restoreFullSystemBackup = async (backupPayload: any) => {
  if (!backupPayload || typeof backupPayload !== 'object' || !backupPayload.data) {
    throw new Error('செல்லுபடியற்ற காப்புப்பிரதி கோப்பு (Invalid backup file format)');
  }
  const dataMap = backupPayload.data;
  for (const key of Object.keys(dataMap)) {
    if (ALL_BACKUP_COLLECTIONS.includes(key) && dataMap[key] !== null && dataMap[key] !== undefined) {
      await saveData(key, dataMap[key]);
    }
  }
  return true;
};

export const getSystemBackups = async () => {
  return getData('systemBackups', []);
};

export const saveSystemBackupSnapshot = async (note: string = "Manual Backup") => {
  const fullBackup = await exportFullSystemBackup();
  const existingBackups = await getData('systemBackups', []);
  const newSnapshot = {
    id: "backup_" + Date.now(),
    dateStr: fullBackup.exportDate,
    formattedDate: fullBackup.exportDateFormatted,
    note,
    data: fullBackup.data
  };
  const updatedList = [newSnapshot, ...(Array.isArray(existingBackups) ? existingBackups : [])].slice(0, 20); // keep last 20 date backups
  await saveData('systemBackups', updatedList);
  return newSnapshot;
};

export const deleteSystemBackupSnapshot = async (id: string) => {
  const existingBackups = await getData('systemBackups', []);
  if (Array.isArray(existingBackups)) {
    const updated = existingBackups.filter((b: any) => b.id !== id);
    await saveData('systemBackups', updated);
  }
};

