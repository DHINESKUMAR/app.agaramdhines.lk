import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Globe, Code, Play, ExternalLink, Share2, 
  Search, Users, Gamepad2, Image as ImageIcon, FileText, 
  ChevronDown, CheckCircle, Copy, Check, RotateCcw, 
  Maximize2, Minimize2, Monitor, Tablet, Smartphone, Sparkles,
  Trophy, Award, RefreshCw, Eye, Flame, Heart, ArrowLeft,
  CheckCircle2, Star, Layers, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface RecordingItem {
  id: string;
  grade?: string;
  grades?: string[];
  subject?: string;
  subjects?: string[];
  title: string;
  type?: 'recording' | 'webpost' | 'html_code' | 'mobile_game' | 'student_box' | 'image_post';
  link?: string;
  content?: string;
  code?: string;
  codeLanguage?: string;
  imageUrl?: string;
  studentNames?: string[];
  gameType?: 'word_quiz' | 'math_game' | 'memory_match' | 'flappy' | 'custom_url';
  folder?: string;
  createdAt?: string | number;
  author?: string;
}

export const GRADES_LIST = [
  "தரம் 01", "தரம் 02", "தரம் 03", "தரம் 04", "தரம் 05", 
  "தரம் 06", "தரம் 07", "தரம் 08", "தரம் 09", "தரம் 10", 
  "தரம் 11", "தரம் 12", "தரம் 13"
];

export const GRADE_COLOR_CONFIG: Record<string, {
  name: string;
  gradeNum: number;
  bg: string;
  bgGradient: string;
  border: string;
  text: string;
  accent: string;
  badge: string;
  iconBg: string;
  shadow: string;
}> = {
  "தரம் 01": {
    name: "தரம் 01",
    gradeNum: 1,
    bg: "bg-rose-50/70 hover:bg-rose-50",
    bgGradient: "from-rose-500 to-pink-600",
    border: "border-rose-200 hover:border-rose-400",
    text: "text-rose-700",
    accent: "bg-rose-600",
    badge: "bg-rose-100 text-rose-800",
    iconBg: "bg-rose-500 text-white",
    shadow: "hover:shadow-rose-100"
  },
  "தரம் 02": {
    name: "தரம் 02",
    gradeNum: 2,
    bg: "bg-amber-50/70 hover:bg-amber-50",
    bgGradient: "from-amber-500 to-orange-600",
    border: "border-amber-200 hover:border-amber-400",
    text: "text-amber-700",
    accent: "bg-amber-600",
    badge: "bg-amber-100 text-amber-800",
    iconBg: "bg-amber-500 text-white",
    shadow: "hover:shadow-amber-100"
  },
  "தரம் 03": {
    name: "தரம் 03",
    gradeNum: 3,
    bg: "bg-yellow-50/70 hover:bg-yellow-50",
    bgGradient: "from-yellow-500 to-amber-600",
    border: "border-yellow-200 hover:border-yellow-400",
    text: "text-yellow-800",
    accent: "bg-yellow-600",
    badge: "bg-yellow-100 text-yellow-900",
    iconBg: "bg-yellow-500 text-white",
    shadow: "hover:shadow-yellow-100"
  },
  "தரம் 04": {
    name: "தரம் 04",
    gradeNum: 4,
    bg: "bg-lime-50/70 hover:bg-lime-50",
    bgGradient: "from-lime-500 to-green-600",
    border: "border-lime-200 hover:border-lime-400",
    text: "text-lime-800",
    accent: "bg-lime-600",
    badge: "bg-lime-100 text-lime-900",
    iconBg: "bg-lime-600 text-white",
    shadow: "hover:shadow-lime-100"
  },
  "தரம் 05": {
    name: "தரம் 05",
    gradeNum: 5,
    bg: "bg-emerald-50/70 hover:bg-emerald-50",
    bgGradient: "from-emerald-500 to-teal-600",
    border: "border-emerald-200 hover:border-emerald-400",
    text: "text-emerald-700",
    accent: "bg-emerald-600",
    badge: "bg-emerald-100 text-emerald-800",
    iconBg: "bg-emerald-600 text-white",
    shadow: "hover:shadow-emerald-100"
  },
  "தரம் 06": {
    name: "தரம் 06",
    gradeNum: 6,
    bg: "bg-teal-50/70 hover:bg-teal-50",
    bgGradient: "from-teal-500 to-cyan-600",
    border: "border-teal-200 hover:border-teal-400",
    text: "text-teal-700",
    accent: "bg-teal-600",
    badge: "bg-teal-100 text-teal-800",
    iconBg: "bg-teal-600 text-white",
    shadow: "hover:shadow-teal-100"
  },
  "தரம் 07": {
    name: "தரம் 07",
    gradeNum: 7,
    bg: "bg-sky-50/70 hover:bg-sky-50",
    bgGradient: "from-sky-500 to-blue-600",
    border: "border-sky-200 hover:border-sky-400",
    text: "text-sky-700",
    accent: "bg-sky-600",
    badge: "bg-sky-100 text-sky-800",
    iconBg: "bg-sky-600 text-white",
    shadow: "hover:shadow-sky-100"
  },
  "தரம் 08": {
    name: "தரம் 08",
    gradeNum: 8,
    bg: "bg-blue-50/70 hover:bg-blue-50",
    bgGradient: "from-blue-600 to-indigo-700",
    border: "border-blue-200 hover:border-blue-400",
    text: "text-blue-700",
    accent: "bg-blue-600",
    badge: "bg-blue-100 text-blue-800",
    iconBg: "bg-blue-600 text-white",
    shadow: "hover:shadow-blue-100"
  },
  "தரம் 09": {
    name: "தரம் 09",
    gradeNum: 9,
    bg: "bg-indigo-50/70 hover:bg-indigo-50",
    bgGradient: "from-indigo-600 to-violet-700",
    border: "border-indigo-200 hover:border-indigo-400",
    text: "text-indigo-700",
    accent: "bg-indigo-600",
    badge: "bg-indigo-100 text-indigo-800",
    iconBg: "bg-indigo-600 text-white",
    shadow: "hover:shadow-indigo-100"
  },
  "தரம் 10": {
    name: "தரம் 10",
    gradeNum: 10,
    bg: "bg-purple-50/70 hover:bg-purple-50",
    bgGradient: "from-purple-600 to-fuchsia-700",
    border: "border-purple-200 hover:border-purple-400",
    text: "text-purple-700",
    accent: "bg-purple-600",
    badge: "bg-purple-100 text-purple-800",
    iconBg: "bg-purple-600 text-white",
    shadow: "hover:shadow-purple-100"
  },
  "தரம் 11": {
    name: "தரம் 11",
    gradeNum: 11,
    bg: "bg-fuchsia-50/70 hover:bg-fuchsia-50",
    bgGradient: "from-fuchsia-600 to-pink-700",
    border: "border-fuchsia-200 hover:border-fuchsia-400",
    text: "text-fuchsia-700",
    accent: "bg-fuchsia-600",
    badge: "bg-fuchsia-100 text-fuchsia-800",
    iconBg: "bg-fuchsia-600 text-white",
    shadow: "hover:shadow-fuchsia-100"
  },
  "தரம் 12": {
    name: "தரம் 12",
    gradeNum: 12,
    bg: "bg-violet-50/70 hover:bg-violet-50",
    bgGradient: "from-violet-600 to-purple-800",
    border: "border-violet-200 hover:border-violet-400",
    text: "text-violet-700",
    accent: "bg-violet-600",
    badge: "bg-violet-100 text-violet-800",
    iconBg: "bg-violet-600 text-white",
    shadow: "hover:shadow-violet-100"
  },
  "தரம் 13": {
    name: "தரம் 13",
    gradeNum: 13,
    bg: "bg-slate-100/80 hover:bg-slate-100",
    bgGradient: "from-slate-700 to-slate-900",
    border: "border-slate-300 hover:border-slate-500",
    text: "text-slate-800",
    accent: "bg-slate-800",
    badge: "bg-slate-200 text-slate-900",
    iconBg: "bg-slate-800 text-white",
    shadow: "hover:shadow-slate-200"
  }
};

export const normalizeGradeString = (g?: string): string => {
  if (!g) return "";
  const num = g.toString().replace(/[^0-9]/g, '');
  if (num) {
    const padNum = num.padStart(2, '0');
    return `தரம் ${padNum}`;
  }
  return g.trim();
};

export const doesItemMatchGrade = (item: RecordingItem, targetGrade: string): boolean => {
  const normTarget = normalizeGradeString(targetGrade);
  const targetNum = targetGrade.replace(/[^0-9]/g, '');

  if (item.grade) {
    const normGrade = normalizeGradeString(item.grade);
    const itemNum = item.grade.replace(/[^0-9]/g, '');
    if (normGrade === normTarget || (targetNum && itemNum === targetNum)) return true;
  }

  if (Array.isArray(item.grades)) {
    for (const g of item.grades) {
      const normG = normalizeGradeString(g);
      const gNum = g.replace(/[^0-9]/g, '');
      if (normG === normTarget || (targetNum && gNum === targetNum)) return true;
    }
  }

  return false;
};

// Rectangular Card Color Palettes for Diverse Colorful Posts
export const POST_COLOR_THEMES = [
  {
    bg: 'bg-indigo-50/70 hover:bg-indigo-50/90',
    border: 'border-indigo-200 hover:border-indigo-400',
    tagBg: 'bg-indigo-100 text-indigo-800',
    btnBg: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    titleColor: 'text-indigo-950',
    accentBorder: 'border-l-4 border-l-indigo-600',
    glow: 'shadow-indigo-100'
  },
  {
    bg: 'bg-emerald-50/70 hover:bg-emerald-50/90',
    border: 'border-emerald-200 hover:border-emerald-400',
    tagBg: 'bg-emerald-100 text-emerald-800',
    btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    titleColor: 'text-emerald-950',
    accentBorder: 'border-l-4 border-l-emerald-600',
    glow: 'shadow-emerald-100'
  },
  {
    bg: 'bg-rose-50/70 hover:bg-rose-50/90',
    border: 'border-rose-200 hover:border-rose-400',
    tagBg: 'bg-rose-100 text-rose-800',
    btnBg: 'bg-rose-600 hover:bg-rose-700 text-white',
    titleColor: 'text-rose-950',
    accentBorder: 'border-l-4 border-l-rose-600',
    glow: 'shadow-rose-100'
  },
  {
    bg: 'bg-amber-50/70 hover:bg-amber-50/90',
    border: 'border-amber-200 hover:border-amber-400',
    tagBg: 'bg-amber-100 text-amber-800',
    btnBg: 'bg-amber-600 hover:bg-amber-700 text-white',
    titleColor: 'text-amber-950',
    accentBorder: 'border-l-4 border-l-amber-600',
    glow: 'shadow-amber-100'
  },
  {
    bg: 'bg-sky-50/70 hover:bg-sky-50/90',
    border: 'border-sky-200 hover:border-sky-400',
    tagBg: 'bg-sky-100 text-sky-800',
    btnBg: 'bg-sky-600 hover:bg-sky-700 text-white',
    titleColor: 'text-sky-950',
    accentBorder: 'border-l-4 border-l-sky-600',
    glow: 'shadow-sky-100'
  },
  {
    bg: 'bg-purple-50/70 hover:bg-purple-50/90',
    border: 'border-purple-200 hover:border-purple-400',
    tagBg: 'bg-purple-100 text-purple-800',
    btnBg: 'bg-purple-600 hover:bg-purple-700 text-white',
    titleColor: 'text-purple-950',
    accentBorder: 'border-l-4 border-l-purple-600',
    glow: 'shadow-purple-100'
  },
  {
    bg: 'bg-teal-50/70 hover:bg-teal-50/90',
    border: 'border-teal-200 hover:border-teal-400',
    tagBg: 'bg-teal-100 text-teal-800',
    btnBg: 'bg-teal-600 hover:bg-teal-700 text-white',
    titleColor: 'text-teal-950',
    accentBorder: 'border-l-4 border-l-teal-600',
    glow: 'shadow-teal-100'
  },
  {
    bg: 'bg-fuchsia-50/70 hover:bg-fuchsia-50/90',
    border: 'border-fuchsia-200 hover:border-fuchsia-400',
    tagBg: 'bg-fuchsia-100 text-fuchsia-800',
    btnBg: 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white',
    titleColor: 'text-fuchsia-950',
    accentBorder: 'border-l-4 border-l-fuchsia-600',
    glow: 'shadow-fuchsia-100'
  }
];

export const getPostTheme = (item: RecordingItem, index: number) => {
  let hash = index;
  if (item.id) {
    for (let i = 0; i < item.id.length; i++) {
      hash = item.id.charCodeAt(i) + ((hash << 5) - hash);
    }
  }
  return POST_COLOR_THEMES[Math.abs(hash) % POST_COLOR_THEMES.length];
};

interface RecordingSectionProps {
  courses: RecordingItem[];
  webPosts?: any[];
  courseWebsiteLinks?: Record<string, string>;
  studentGrade?: string;
  studentSubjects?: string[];
  onOpenWebsite?: (url: string) => void;
  expandedFolders?: Record<string, boolean>;
  setExpandedFolders?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  getFolderColor?: (folder: string) => any;
}

export default function RecordingSection({
  courses = [],
  webPosts = [],
  studentGrade = "தரம் 10",
  studentSubjects = [],
}: RecordingSectionProps) {
  // Navigation State: null = Grade Grid (1-13), or "தரம் 01", "தரம் 02", etc.
  const [selectedGrade, setSelectedGrade] = useState<string | null>(() => {
    // If student has a matching grade, default to their grade
    const norm = normalizeGradeString(studentGrade);
    return GRADES_LIST.includes(norm) ? norm : null;
  });

  // Filter States inside Grade Page
  const [selectedSubject, setSelectedSubject] = useState<string>("All");
  const [activeContentType, setActiveContentType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal / Reader States
  const [readingPost, setReadingPost] = useState<RecordingItem | null>(null);
  const [viewingImage, setViewingImage] = useState<RecordingItem | null>(null);
  const [activeCodePost, setActiveCodePost] = useState<RecordingItem | null>(null);
  const [activeGame, setActiveGame] = useState<RecordingItem | null>(null);

  // Combine user-created courses & webPosts into unified items list (ONLY real items, no 400+ fake records)
  const unifiedItems: RecordingItem[] = React.useMemo(() => {
    const list: RecordingItem[] = [];

    // Add courses
    if (Array.isArray(courses)) {
      courses.forEach(c => {
        if (c && c.title) {
          list.push({
            ...c,
            type: c.type || (c.code ? 'html_code' : c.studentNames ? 'student_box' : c.gameType ? 'mobile_game' : c.imageUrl ? 'image_post' : 'webpost')
          });
        }
      });
    }

    // Add webPosts if not already present
    if (Array.isArray(webPosts)) {
      webPosts.forEach(wp => {
        if (wp && wp.title && !list.some(item => item.id === wp.id || item.title === wp.title)) {
          list.push({
            id: wp.id || `wp-${Math.random()}`,
            grade: wp.grade || "தரம் 10",
            grades: wp.grades || (wp.grade ? [wp.grade] : ["தரம் 10"]),
            subject: wp.subject || (wp.subjects?.[0]) || "General",
            subjects: wp.subjects || (wp.subject ? [wp.subject] : ["General"]),
            title: wp.title || "Web Post",
            type: 'webpost',
            content: wp.content || "",
            imageUrl: wp.imageUrl || wp.image,
            link: wp.link,
            createdAt: wp.date || wp.createdAt,
            folder: wp.folder || "Web Posts"
          });
        }
      });
    }

    return list;
  }, [courses, webPosts]);

  // Extract count of posts for each grade
  const gradeCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    GRADES_LIST.forEach(g => {
      counts[g] = unifiedItems.filter(item => doesItemMatchGrade(item, g)).length;
    });
    return counts;
  }, [unifiedItems]);

  // Items filtered for the selected grade
  const gradeItems = React.useMemo(() => {
    if (!selectedGrade) return [];
    return unifiedItems.filter(item => doesItemMatchGrade(item, selectedGrade));
  }, [unifiedItems, selectedGrade]);

  // Available subjects for the active grade
  const gradeSubjects = React.useMemo(() => {
    const subs = new Set<string>();
    gradeItems.forEach(item => {
      if (item.subject && item.subject !== 'All') subs.add(item.subject.trim());
      if (Array.isArray(item.subjects)) {
        item.subjects.forEach(s => s && s !== 'All' && subs.add(s.trim()));
      }
    });
    return Array.from(subs).filter(Boolean);
  }, [gradeItems]);

  // Final filtered items in the grade page
  const filteredGradeItems = React.useMemo(() => {
    return gradeItems.filter(item => {
      // Subject filter
      if (selectedSubject !== "All") {
        const itemSubs = [item.subject, ...(item.subjects || [])].filter(Boolean);
        const matchesSub = itemSubs.some(s => s?.toLowerCase().includes(selectedSubject.toLowerCase()) || selectedSubject.toLowerCase().includes(s?.toLowerCase() || ''));
        if (!matchesSub) return false;
      }

      // Content Type filter
      if (activeContentType !== "all") {
        if (activeContentType === "webpost" && item.type !== "webpost") return false;
        if (activeContentType === "html_code" && item.type !== "html_code") return false;
        if (activeContentType === "student_box" && item.type !== "student_box") return false;
        if (activeContentType === "mobile_game" && item.type !== "mobile_game") return false;
        if (activeContentType === "image_post" && item.type !== "image_post") return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = item.title?.toLowerCase().includes(q);
        const inContent = item.content?.toLowerCase().includes(q);
        const inCode = item.code?.toLowerCase().includes(q);
        const inStudents = item.studentNames?.some(name => name.toLowerCase().includes(q));
        if (!inTitle && !inContent && !inCode && !inStudents) return false;
      }

      return true;
    });
  }, [gradeItems, selectedSubject, activeContentType, searchQuery]);

  const currentGradeConfig = selectedGrade ? (GRADE_COLOR_CONFIG[selectedGrade] || GRADE_COLOR_CONFIG["தரம் 10"]) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. GRADE SELECTION SCREEN (13 SQUARES IN VIBRANT COLORS) */}
      {!selectedGrade ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Select Your Grade / தரம் தெரிவுசெய்க
                  </h2>
                  <p className="text-slate-500 text-xs sm:text-sm font-medium mt-0.5">
                    தரம் 01 முதல் தரம் 13 வரையிலான பாடப் பதிவுகள், கல்வி விளையாட்டுகள் மற்றும் இணையப் பக்கங்கள்.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-xs font-black text-indigo-700 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100 self-start sm:self-auto">
              Total {unifiedItems.length} Posts Available
            </div>
          </div>

          {/* 13 Square Cards Grid with Distinct Colors */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4 sm:gap-5 pt-2">
            {GRADES_LIST.map((gradeName) => {
              const cfg = GRADE_COLOR_CONFIG[gradeName] || GRADE_COLOR_CONFIG["தரம் 10"];
              const count = gradeCounts[gradeName] || 0;
              const isStudentGrade = normalizeGradeString(studentGrade) === gradeName;

              return (
                <button
                  key={gradeName}
                  onClick={() => {
                    setSelectedGrade(gradeName);
                    setSelectedSubject("All");
                    setActiveContentType("all");
                    setSearchQuery("");
                  }}
                  className={`group relative p-5 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center justify-between text-center aspect-square shadow-sm hover:shadow-xl hover:-translate-y-1.5 overflow-hidden ${cfg.bg} ${cfg.border} ${cfg.shadow}`}
                >
                  {/* Subtle Top Indicator for Student's current grade */}
                  {isStudentGrade && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/90 text-slate-800 text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">
                      <Star size={10} className="fill-amber-400 text-amber-500" />
                      My Grade
                    </div>
                  )}

                  {/* Icon Circle */}
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${cfg.bgGradient} text-white font-black text-xl flex items-center justify-center shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 mt-2`}>
                    {cfg.gradeNum < 10 ? `0${cfg.gradeNum}` : cfg.gradeNum}
                  </div>

                  {/* Title & Badge */}
                  <div className="w-full">
                    <h3 className={`font-black text-base sm:text-lg ${cfg.text} leading-tight group-hover:scale-105 transition-transform`}>
                      {gradeName}
                    </h3>
                    
                    <span className={`inline-block text-[11px] font-black px-2.5 py-0.5 rounded-full mt-2 border ${cfg.badge} border-white/60 shadow-xs`}>
                      {count} {count === 1 ? 'Post' : 'Posts'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* 2. DEDICATED GRADE POSTS HUB PAGE */
        <div className="space-y-6">
          {/* Header Banner with Back Button */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedGrade(null)}
                  className="flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-all font-black shrink-0 border border-slate-200"
                  title="Back to All Grades"
                >
                  <ArrowLeft size={22} />
                </button>

                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${currentGradeConfig?.bgGradient} text-white flex items-center justify-center shadow-lg text-xl font-black shrink-0`}>
                    {currentGradeConfig?.gradeNum ? (currentGradeConfig.gradeNum < 10 ? `0${currentGradeConfig.gradeNum}` : currentGradeConfig.gradeNum) : 'G'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        {selectedGrade} Posts & Activities
                      </h2>
                      <span className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${currentGradeConfig?.badge}`}>
                        {filteredGradeItems.length} Items
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs sm:text-sm font-medium mt-0.5">
                      இணையப் பதிவுகள், நேரலை HTML கோட், விளையாட்டுகள் மற்றும் மாணவர் கௌரவப் பெட்டிகள்.
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Search & Grade switcher */}
              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search posts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setSelectedGrade(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-2xl whitespace-nowrap transition-all border border-slate-200"
                >
                  Change Grade ⇄
                </button>
              </div>
            </div>

            {/* Subject Filters within this Grade */}
            {gradeSubjects.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Filter by Subject / பாடவாரியாக:
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    onClick={() => setSelectedSubject("All")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      selectedSubject === "All"
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <Sparkles size={13} /> All Subjects ({gradeItems.length})
                  </button>

                  {gradeSubjects.map(sub => {
                    const isSelected = selectedSubject === sub;
                    return (
                      <button
                        key={sub}
                        onClick={() => setSelectedSubject(sub)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                          isSelected
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60"
                        }`}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Content Type Filter Pills */}
            <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100 mt-4">
              {[
                { id: 'all', label: 'All Items (அனைத்தும்)', icon: <Layers size={13} /> },
                { id: 'webpost', label: 'Web Posts & Articles', icon: <FileText size={13} /> },
                { id: 'html_code', label: 'HTML Live Web View', icon: <Code size={13} /> },
                { id: 'student_box', label: 'Student Recognition Boxes', icon: <Users size={13} /> },
                { id: 'mobile_game', label: 'Educational Games', icon: <Gamepad2 size={13} /> },
                { id: 'image_post', label: 'Image Posts', icon: <ImageIcon size={13} /> },
              ].map(type => (
                <button
                  key={type.id}
                  onClick={() => setActiveContentType(type.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeContentType === type.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
                  }`}
                >
                  {type.icon}
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rectangular Colorful Post Cards */}
          <div className="space-y-4">
            {filteredGradeItems.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
                <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto">
                  <BookOpen size={30} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">
                    {selectedGrade} பிரிவில் பதிவுகள் எதுவும் இல்லை
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    இந்த வகுப்பிற்கு இன்னும் புதிய பதிவுகள் சேர்க்கப்படவில்லை. Admin பகுதியில் "Add New Post Item" மூலம் புதிய பதிவுகளை உடனே சேர்க்கலாம்.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedGrade(null)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-indigo-100 transition-all"
                >
                  ← மற்ற வகுப்புகளைப் பார்வையிடுக (View Other Grades)
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredGradeItems.map((item, idx) => {
                  const theme = getPostTheme(item, idx);
                  return (
                    <ColorfulPostCard
                      key={item.id || idx}
                      item={item}
                      theme={theme}
                      onReadPost={() => setReadingPost(item)}
                      onViewImage={() => setViewingImage(item)}
                      onOpenCode={() => setActiveCodePost(item)}
                      onPlayGame={() => setActiveGame(item)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Dedicated HTML Code & Live Web View Runner */}
      <AnimatePresence>
        {activeCodePost && (
          <CodeLiveViewModal
            item={activeCodePost}
            onClose={() => setActiveCodePost(null)}
          />
        )}
      </AnimatePresence>

      {/* MODAL 2: Full Web Post Reader */}
      <AnimatePresence>
        {readingPost && (
          <WebPostModal
            post={readingPost}
            onClose={() => setReadingPost(null)}
          />
        )}
      </AnimatePresence>

      {/* MODAL 3: Image Lightbox Preview */}
      <AnimatePresence>
        {viewingImage && (
          <ImageLightboxModal
            item={viewingImage}
            onClose={() => setViewingImage(null)}
          />
        )}
      </AnimatePresence>

      {/* MODAL 4: Interactive Mobile Game Modal */}
      <AnimatePresence>
        {activeGame && (
          <MobileGameModal
            game={activeGame}
            onClose={() => setActiveGame(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// -------------------------------------------------------------
// RECTANGULAR COLORFUL POST CARD
// -------------------------------------------------------------
interface ColorfulPostCardProps {
  key?: React.Key;
  item: RecordingItem;
  theme: typeof POST_COLOR_THEMES[0];
  onReadPost: () => void;
  onViewImage: () => void;
  onOpenCode: () => void;
  onPlayGame: () => void;
}

function ColorfulPostCard({
  item,
  theme,
  onReadPost,
  onViewImage,
  onOpenCode,
  onPlayGame
}: ColorfulPostCardProps) {
  const [copied, setCopied] = useState(false);

  // 1. HTML / CODE LIVE WEB VIEW CARD
  if (item.type === 'html_code') {
    const rawCode = item.code || '';
    return (
      <div className={`p-6 rounded-3xl border-2 transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-xl ${theme.bg} ${theme.border} ${theme.accentBorder}`}>
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-white/60 flex items-center gap-1 ${theme.tagBg}`}>
              <Code size={12} />
              HTML Live Web View
            </span>
            <span className="text-xs font-bold text-slate-500">{item.subject || 'Web / Code'}</span>
          </div>

          <h3 className={`text-lg sm:text-xl font-black ${theme.titleColor} leading-snug mb-3`}>
            {item.title}
          </h3>

          {/* Embedded Mini Live Web View Preview */}
          <div className="rounded-2xl border border-slate-300 overflow-hidden bg-slate-900 shadow-inner my-2">
            <div className="bg-slate-800 px-3 py-1.5 flex items-center justify-between text-xs text-slate-300 border-b border-slate-700">
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Live Web View Sandbox
              </span>
              <button
                onClick={onOpenCode}
                className="text-xs text-indigo-300 hover:text-white flex items-center gap-1 font-bold"
              >
                <Maximize2 size={12} /> Fullscreen
              </button>
            </div>
            <iframe
              title={item.title}
              srcDoc={rawCode}
              sandbox="allow-scripts allow-modals"
              className="w-full h-44 bg-white border-0"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200/60 flex items-center justify-between gap-2 mt-4">
          <button
            onClick={() => {
              navigator.clipboard.writeText(rawCode);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1 transition-all"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy Code'}
          </button>

          <button
            onClick={onOpenCode}
            className={`px-5 py-2 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all ${theme.btnBg}`}
          >
            <Play size={13} fill="currentColor" />
            Open Web View Runner
          </button>
        </div>
      </div>
    );
  }

  // 2. STUDENT RECOGNITION BOX CARD
  if (item.type === 'student_box') {
    const studentList = item.studentNames || [];
    return (
      <div className={`p-6 rounded-3xl border-2 transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-xl ${theme.bg} ${theme.border} ${theme.accentBorder}`}>
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-white/60 flex items-center gap-1 ${theme.tagBg}`}>
              <Users size={12} />
              Student Recognition
            </span>
            <span className="text-xs font-bold text-slate-500">{studentList.length} Students</span>
          </div>

          <h3 className={`text-lg sm:text-xl font-black ${theme.titleColor} leading-snug mb-1`}>
            {item.title}
          </h3>

          {item.content && (
            <p className="text-xs text-slate-600 mb-3 line-clamp-2">{item.content}</p>
          )}

          {/* Student Square Badges Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-3 max-h-56 overflow-y-auto pr-1">
            {studentList.map((name, sIdx) => {
              const initial = name.trim().charAt(0).toUpperCase();
              return (
                <div
                  key={sIdx}
                  className="bg-white/80 hover:bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col items-center justify-center text-center group aspect-square transition-all"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-xs flex items-center justify-center shadow-xs mb-1.5 group-hover:scale-105">
                    {initial}
                  </div>
                  <span className="text-xs font-black text-slate-800 line-clamp-2 leading-tight">
                    {name}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase">
                    Rank #{sIdx + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500 font-bold mt-3">
          <span>{item.subject || 'All Subjects'}</span>
          <span className="text-indigo-600 font-black flex items-center gap-1">
            <Trophy size={14} /> Certified Excellence
          </span>
        </div>
      </div>
    );
  }

  // 3. MOBILE GAME CARD
  if (item.type === 'mobile_game') {
    return (
      <div className={`p-6 rounded-3xl border-2 transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white border-indigo-700/60 relative overflow-hidden group`}>
        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
        
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/20 px-2.5 py-1 rounded-lg border border-amber-400/30 flex items-center gap-1">
              <Gamepad2 size={12} />
              Educational Game
            </span>
            <span className="text-xs font-bold text-indigo-300">{item.subject || 'Interactive'}</span>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-white leading-snug mb-2 group-hover:text-amber-300 transition-colors">
            {item.title}
          </h3>

          <p className="text-xs text-indigo-200/80 mb-4 leading-relaxed line-clamp-3">
            {item.content || 'Play this interactive educational mini-game to test your knowledge and earn high scores!'}
          </p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
          <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
            <Flame size={14} className="text-amber-400" /> Touch Ready
          </span>
          <button
            onClick={onPlayGame}
            className="px-5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all hover:scale-105"
          >
            <Play size={13} fill="currentColor" />
            விளையாடுக (Play Now)
          </button>
        </div>
      </div>
    );
  }

  // 4. IMAGE POST OR ARTICLE / WRITTEN CONTENT CARD
  return (
    <div className={`p-6 rounded-3xl border-2 transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-xl ${theme.bg} ${theme.border} ${theme.accentBorder}`}>
      <div>
        {item.imageUrl && (
          <div
            onClick={onViewImage}
            className="aspect-video relative overflow-hidden rounded-2xl bg-slate-200/70 mb-4 cursor-pointer group/img border border-slate-200"
          >
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
              <span className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <Eye size={14} /> பெரிதாக்கு (Zoom Image)
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 mb-2">
          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-white/60 ${theme.tagBg}`}>
            {item.subject || 'Study Post'}
          </span>
          <span className="text-xs font-bold text-slate-500">{item.grade || 'All'}</span>
        </div>

        <h3 className={`text-lg sm:text-xl font-black ${theme.titleColor} leading-snug mb-2`}>
          {item.title}
        </h3>

        {item.content && (
          <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-3 font-medium">
            {item.content}
          </p>
        )}
      </div>

      <div className="pt-4 border-t border-slate-200/60 flex items-center justify-between gap-3 mt-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const shareUrl = item.link || window.location.href;
              if (navigator.share) {
                navigator.share({ title: item.title, text: item.content, url: shareUrl });
              } else {
                navigator.clipboard.writeText(shareUrl);
                alert("இணைப்பு நகலெடுக்கப்பட்டது! (Link copied)");
              }
            }}
            className="p-2 bg-white text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-xl border border-slate-200 transition-all"
            title="Share"
          >
            <Share2 size={15} />
          </button>

          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-white text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-xl border border-slate-200 transition-all flex items-center gap-1 text-xs font-bold"
              title="Open Link"
            >
              <ExternalLink size={15} />
            </a>
          )}
        </div>

        <button
          onClick={onReadPost}
          className={`px-5 py-2 font-black text-xs rounded-xl transition-all shadow-sm ${theme.btnBg}`}
        >
          வாசிக்க (Read Full Post)
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// MODALS
// -------------------------------------------------------------

function CodeLiveViewModal({ item, onClose }: { item: RecordingItem; onClose: () => void }) {
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [key, setKey] = useState(0);

  const containerWidths = {
    desktop: 'w-full',
    tablet: 'max-w-2xl',
    mobile: 'max-w-sm'
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 rounded-[2rem] border border-slate-700 w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Modal Topbar */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <Code size={20} />
            </div>
            <div>
              <h3 className="font-black text-white text-base leading-snug">{item.title}</h3>
              <p className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Interactive Sandbox Runner
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
              <button
                onClick={() => setDeviceMode('desktop')}
                className={`p-1.5 rounded-lg text-xs font-bold ${deviceMode === 'desktop' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <Monitor size={14} />
              </button>
              <button
                onClick={() => setDeviceMode('tablet')}
                className={`p-1.5 rounded-lg text-xs font-bold ${deviceMode === 'tablet' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <Tablet size={14} />
              </button>
              <button
                onClick={() => setDeviceMode('mobile')}
                className={`p-1.5 rounded-lg text-xs font-bold ${deviceMode === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <Smartphone size={14} />
              </button>
            </div>

            <button
              onClick={() => setKey(prev => prev + 1)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all"
              title="Reload Sandbox"
            >
              <RefreshCw size={16} />
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition-all"
            >
              Close
            </button>
          </div>
        </div>

        {/* Live Runner iframe */}
        <div className="flex-1 bg-slate-950 flex items-center justify-center p-4 overflow-hidden">
          <div className={`h-full transition-all duration-300 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 bg-white ${containerWidths[deviceMode]}`}>
            <iframe
              key={key}
              title={item.title}
              srcDoc={item.code || ''}
              sandbox="allow-scripts allow-modals allow-same-origin"
              className="w-full h-full border-0 bg-white"
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function WebPostModal({ post, onClose }: { post: RecordingItem; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-[2.5rem] border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100">
              {post.subject || 'Study Post'}
            </span>
            <button
              onClick={onClose}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-all text-xs font-black"
            >
              ✕
            </button>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
            {post.title}
          </h2>

          {post.imageUrl && (
            <div className="rounded-3xl overflow-hidden max-h-80 border border-slate-200 shadow-sm">
              <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          )}

          <div className="prose prose-slate max-w-none text-slate-700 text-sm sm:text-base leading-relaxed whitespace-pre-line font-medium bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
            {post.content}
          </div>

          {post.link && (
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">External Attachment / Link</span>
              <a
                href={post.link}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-100"
              >
                <ExternalLink size={14} /> Open Link
              </a>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ImageLightboxModal({ item, onClose }: { item: RecordingItem; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md p-4 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center">
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white text-sm font-black bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-full backdrop-blur-md"
        >
          ✕ Close
        </button>
        <img
          src={item.imageUrl}
          alt={item.title}
          className="max-w-full max-h-[80vh] rounded-3xl object-contain shadow-2xl"
          referrerPolicy="no-referrer"
        />
        <p className="text-white text-center mt-3 font-bold text-sm bg-black/50 px-4 py-2 rounded-xl backdrop-blur-md">
          {item.title}
        </p>
      </div>
    </motion.div>
  );
}

// -------------------------------------------------------------
// INTERACTIVE GAME MODAL (Tamil Word challenge, Math Speed, Memory, Flappy)
// -------------------------------------------------------------
function MobileGameModal({ game, onClose }: { game: RecordingItem; onClose: () => void }) {
  const [score, setScore] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const tamilQuizData = [
    { q: "தமிழ் மொழியின் முதல் இலக்கண நூல் எது?", options: ["தொல்காப்பியம்", "நன்னூல்", "திருக்குறள்", "சிலப்பதிகாரம்"], ans: 0 },
    { q: "ஐம்பெருங் காப்பியங்களில் முதலாவது எது?", options: ["மணிமேகலை", "சீவக சிந்தாமணி", "சிலப்பதிகாரம்", "குண்டலகேசி"], ans: 2 },
    { q: "முத்தமிழ் என்பது யாது?", options: ["இயல், இசை, நாடகம்", "அறம், பொருள், இன்பம்", "எழுத்து, சொல், பொருள்", "நன்மை, தீமை, நடுநிலை"], ans: 0 },
    { q: "திருக்குறளில் உள்ள மொத்த அதிகாரங்கள் எத்தனை?", options: ["133", "1330", "100", "120"], ans: 0 },
  ];

  const mathQuizData = [
    { q: "12 × 12 = ?", options: ["124", "144", "134", "154"], ans: 1 },
    { q: "150 + 275 = ?", options: ["425", "415", "435", "395"], ans: 0 },
    { q: "√169 = ?", options: ["11", "12", "13", "14"], ans: 2 },
    { q: "45 ÷ 5 × 2 = ?", options: ["18", "9", "12", "15"], ans: 0 },
  ];

  const activeQuestions = game.gameType === 'math_game' ? mathQuizData : tamilQuizData;

  const handleAnswer = (index: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);

    if (index === activeQuestions[currentQuestion].ans) {
      setScore(prev => prev + 10);
    }

    setTimeout(() => {
      setSelectedAnswer(null);
      if (currentQuestion + 1 < activeQuestions.length) {
        setCurrentQuestion(prev => prev + 1);
      } else {
        setGameOver(true);
      }
    }, 1200);
  };

  const resetGame = () => {
    setScore(0);
    setCurrentQuestion(0);
    setGameOver(false);
    setSelectedAnswer(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md p-4 flex items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 text-white rounded-[2.5rem] border border-indigo-700/50 w-full max-w-lg overflow-hidden shadow-2xl p-6 sm:p-8"
      >
        <div className="flex items-center justify-between pb-4 border-b border-indigo-800/40 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎮</span>
            <h3 className="font-black text-lg text-amber-300">{game.title}</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-xl text-xs font-black">
              🏆 Score: {score}
            </span>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-xs font-black">✕</button>
          </div>
        </div>

        {!gameOver ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-xs text-indigo-300 font-bold">
              <span>Question {currentQuestion + 1} of {activeQuestions.length}</span>
              <span>Agaram Scholar Quiz</span>
            </div>

            <div className="bg-white/10 p-6 rounded-3xl border border-white/10 text-center">
              <h4 className="text-xl font-black text-white leading-relaxed">
                {activeQuestions[currentQuestion].q}
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeQuestions[currentQuestion].options.map((opt, oIdx) => {
                const isSelected = selectedAnswer === oIdx;
                const isCorrect = oIdx === activeQuestions[currentQuestion].ans;

                let btnClass = "bg-white/10 hover:bg-white/20 border-white/10 text-white";
                if (selectedAnswer !== null) {
                  if (isCorrect) btnClass = "bg-emerald-500 border-emerald-400 text-white animate-bounce";
                  else if (isSelected) btnClass = "bg-rose-500 border-rose-400 text-white";
                }

                return (
                  <button
                    key={oIdx}
                    onClick={() => handleAnswer(oIdx)}
                    disabled={selectedAnswer !== null}
                    className={`p-4 rounded-2xl border font-bold text-sm transition-all text-center ${btnClass}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 space-y-4">
            <div className="text-6xl animate-bounce">🏆</div>
            <h3 className="text-2xl font-black text-white">விளையாட்டு நிறைவடைந்தது!</h3>
            <p className="text-amber-300 font-black text-xl">உங்களது மொத்தப் புள்ளிகள்: {score} / {activeQuestions.length * 10}</p>
            <div className="pt-4 flex items-center justify-center gap-3">
              <button
                onClick={resetGame}
                className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-900 font-black text-xs rounded-2xl shadow-lg"
              >
                மீண்டும் விளையாடுக (Play Again)
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-black text-xs rounded-2xl"
              >
                வெளியேறுக (Exit)
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
