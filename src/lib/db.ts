import { db, isFirebaseConfigured } from './firebase';
import { collection, doc, getDocs, getDoc, setDoc, writeBatch, query, where, deleteDoc } from 'firebase/firestore';

// Helper to get data from Firebase with localStorage fallback
const getData = async (key: string, defaultValue: any) => {
  if (isFirebaseConfigured) {
    try {
      if (Array.isArray(defaultValue)) {
        const querySnapshot = await getDocs(collection(db, key));
        if (!querySnapshot.empty) {
          const data = querySnapshot.docs.map(doc => doc.data());
          try {
            localStorage.setItem(key, JSON.stringify(data));
          } catch (e) {
            console.warn(`Failed to cache ${key} to localStorage.`, e);
          }
          return data;
        }
      } else {
        const docRef = doc(db, 'singletons', key);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data().data;
          try {
            localStorage.setItem(key, JSON.stringify(data));
          } catch (e) {
            console.warn(`Failed to cache ${key} to localStorage.`, e);
          }
          return data;
        }
      }
    } catch (error) {
      console.warn(`Firebase error fetching ${key}. Using local storage.`, error);
    }
  }
  return JSON.parse(localStorage.getItem(key) || JSON.stringify(defaultValue));
};

// Helper to save data to Firebase and localStorage
const saveData = async (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Failed to save ${key} to localStorage. It might be full.`, e);
    // If it's chat messages and it's full, we might want to keep only the last 100 messages
    if (key === 'chatMessages' && Array.isArray(data) && data.length > 100) {
      try {
        const reducedData = data.slice(-100);
        localStorage.setItem(key, JSON.stringify(reducedData));
      } catch (e2) {
        console.warn(`Still failed to save reduced ${key} to localStorage.`, e2);
      }
    }
  }
  
  if (isFirebaseConfigured) {
    try {
      if (Array.isArray(data)) {
        // Query existing documents beforehand to calculate deletions
        const snapshot = await getDocs(collection(db, key));
        const existingIds = new Set(snapshot.docs.map((d: any) => d.id));

        // Use individual setDoc calls instead of batch to avoid size limits
        const promises = data.map(item => {
          const id = item.id || Math.random().toString();
          existingIds.delete(id); // remove from deletion list
          const docRef = doc(collection(db, key), id);
          return setDoc(docRef, item);
        });

        // Delete any documents that are no longer in the provided array
        existingIds.forEach(idToRemove => {
          promises.push(deleteDoc(doc(db, key, idToRemove)));
        });

        await Promise.all(promises);
      } else {
        const docRef = doc(db, 'singletons', key);
        await setDoc(docRef, { data });
      }
    } catch (error) {
      console.warn(`Firebase error saving ${key}. Saved to local storage only.`, error);
    }
  }
};

export const getAdminSettings = () => getData('adminSettings', {
  username: "agaramdhines",
  password: "0756452527Dd",
  email: "Ddhinesnivas111@gmail.com",
  profileImage: "https://picsum.photos/seed/admin/100/100",
  instituteName: "DINESHKUMAR AGARAM DHINES",
  websiteViews: "15,243"
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
  await saveData('students', students);
  if (isFirebaseConfigured) {
    try {
      // Save each student individually to avoid batch size limits
      const promises = students.map((student: any) => {
        const docRef = doc(collection(db, 'students'), student.id);
        return setDoc(docRef, student);
      });
      await Promise.all(promises);
    } catch (error) {
      console.error("Firebase error saving students individually:", error);
    }
  }
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

export const getClasses = () => getData('classes', []);
export const saveClasses = (classes: any) => saveData('classes', classes);

export const getHomework = () => getData('homework', []);
export const saveHomework = (homework: any) => saveData('homework', homework);

export const getStaffs = () => getData('staffs', []);
export const saveStaffs = (staffs: any) => saveData('staffs', staffs);

export const getStaffAttendance = () => getData('staffAttendance', []);
export const saveStaffAttendance = (attendance: any) => saveData('staffAttendance', attendance);

export const getSubjects = () => getData('subjects', []);
export const saveSubjects = (subjects: any) => saveData('subjects', subjects);

export const getIncomeExpense = () => getData('incomeExpense', []);
export const saveIncomeExpense = (data: any) => saveData('incomeExpense', data);

export const getGrades = () => getData('grades', []);
export const saveGrades = (grades: any) => saveData('grades', grades);

export const getTimeTable = () => getData('timetable', []);
export const saveTimeTable = (timetable: any) => saveData('timetable', timetable);

export const getExamMarks = () => getData('examMarks', []);
export const saveExamMarks = (marks: any) => saveData('examMarks', marks);

export const getExamSettings = () => getData('examSettings', []);
export const saveExamSettings = (settings: any) => saveData('examSettings', settings);

export const getAnnouncements = () => getData('announcements', []);
export const saveAnnouncements = (announcements: any) => saveData('announcements', announcements);

export const getBehaviourRecords = () => getData('behaviourRecords', []);
export const saveBehaviourRecords = (records: any) => saveData('behaviourRecords', records);

export const getQuestionPapers = () => getData('questionPapers', []);
export const saveQuestionPapers = (papers: any) => saveData('questionPapers', papers);

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
      { id: "1", grade: "Grade 10", title: "Tamil Live Class", link: "https://zoom.us/j/123456789", datetime: "2026-03-05T10:00" }
    ]);
  }
  
  const courses = await getCourses();
  if (!courses || courses.length === 0) {
    await saveCourses([
      { id: "1", grade: "Grade 10", title: "Science", link: "https://www.agaramdhines.lk/courses/g10-science" }
    ]);
  }
  
  const youtubeLinks = await getYoutubeLinks();
  if (!youtubeLinks || youtubeLinks.length === 0) {
    await saveYoutubeLinks([
      { id: "1", title: "Tamil Chapter 1", link: "https://www.youtube.com/watch?v=12345" }
    ]);
  }
  
  const schedule = await getSchedule();
  if (!schedule || schedule.length === 0) {
    await saveSchedule([
      { id: "1", grade: "Grade 10", day: "Monday", time: "08:00 AM", subject: "Tamil", link: "https://zoom.us/j/123" }
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
        grade: "Grade 10",
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
