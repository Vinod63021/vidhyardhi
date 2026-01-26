
import React, { useState, useEffect, createContext, useContext, useCallback, useRef, useMemo } from 'react';
import type { User, UserRole, Class, Complaint, AttendanceRecord, Notice, TimetableEntry, DayOfWeek } from './types';
import supabaseService from './services/supabaseService';

// ===================================================================================
// 1. HELPERS & CONSTANTS
// ===================================================================================

const DAYS_OF_WEEK: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SEM_DRIVE_MAP: Record<string, string> = {
    'sem1-1': '1UL34mHpHa_Jd9gMdgXBffEI5Iaei5Lkw',
    'sem1-2': '1t0e-gcX2yRDnx388CpqbAzs3__qhIlBx',
    'sem2-1': '1C7vCx6k-FERME8lX0_8QraZHpYXBhRLf',
    'sem2-2': '16jLug89dk4DOtLcf7v-NaRxdmO-huWQe',
    'sem3-1': '1-S3jKp2AC_QueKsus5eVO7oklITHD0qM',
    'sem3-2': '1gQqdF6DN9jBVWyVXA1Nqnsrs9czQDNn3',
    'sem4-1': '1EgOSeKvGzC7jsMxR0OQhumoAylwy-HWr',
    'sem4-2': '1OVscyls-E8Fib-yX6Ozp8X4d8CJcXkDu',
};

const SEMESTER_OPTIONS = [
    { value: 'sem1-1', label: '1st Year - Sem 1', short: 'Y1 S1' },
    { value: 'sem1-2', label: '1st Year - Sem 2', short: 'Y1 S2' },
    { value: 'sem2-1', label: '2nd Year - Sem 1', short: 'Y2 S1' },
    { value: 'sem2-2', label: '2nd Year - Sem 2', short: 'Y2 S2' },
    { value: 'sem3-1', label: '3rd Year - Sem 1', short: 'Y3 S1' },
    { value: 'sem3-2', label: '3rd Year - Sem 2', short: 'Y3 S2' },
    { value: 'sem4-1', label: '4th Year - Sem 1', short: 'Y4 S1' },
    { value: 'sem4-2', label: '4th Year - Sem 2', short: 'Y4 S2' },
];

const isCurrentlyHappening = (startTime: string, endTime: string, day: DayOfWeek) => {
    const now = new Date();
    const currentDayIndex = now.getDay() - 1; // Monday is 1, Sunday is 0
    if (currentDayIndex < 0 || currentDayIndex >= DAYS_OF_WEEK.length) return false;
    
    const currentDay = DAYS_OF_WEEK[currentDayIndex];
    if (currentDay !== day) return false;

    const [hStart, mStart] = startTime.split(':').map(Number);
    const [hEnd, mEnd] = endTime.split(':').map(Number);
    
    const start = new Date(); start.setHours(hStart, mStart, 0);
    const end = new Date(); end.setHours(hEnd, mEnd, 0);
    
    return now >= start && now <= end;
};

const getSubjectColor = (subject: string) => {
    const variants = [
        { bg: 'bg-blue-500', text: 'text-blue-500', light: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
        { bg: 'bg-indigo-500', text: 'text-indigo-500', light: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800' },
        { bg: 'bg-purple-500', text: 'text-purple-500', light: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' },
        { bg: 'bg-pink-500', text: 'text-pink-500', light: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-200 dark:border-pink-800' },
        { bg: 'bg-rose-500', text: 'text-rose-500', light: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-800' },
        { bg: 'bg-orange-500', text: 'text-orange-500', light: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800' },
        { bg: 'bg-teal-500', text: 'text-teal-500', light: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-teal-200 dark:border-teal-800' },
        { bg: 'bg-emerald-500', text: 'text-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800' },
        { bg: 'bg-cyan-500', text: 'text-cyan-500', light: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-200 dark:border-cyan-800' },
    ];
    let hash = 0;
    const cleanSub = subject.toUpperCase().trim();
    for (let i = 0; i < cleanSub.length; i++) {
        hash = cleanSub.charCodeAt(i) + ((hash << 5) - hash);
    }
    return variants[Math.abs(hash) % variants.length];
};

// CSV Export Utility
const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// ===================================================================================
// 2. AUTHENTICATION CONTEXT
// ===================================================================================
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (rollNo: string, password?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loggedInUser = sessionStorage.getItem('vidhyardhi-user');
    if (loggedInUser) setUser(JSON.parse(loggedInUser));
    setLoading(false);
  }, []);

  const login = async (rollNo: string, password?: string) => {
    const loggedInUser = await supabaseService.login(rollNo, password);
    if (loggedInUser) {
      setUser(loggedInUser);
      sessionStorage.setItem('vidhyardhi-user', JSON.stringify(loggedInUser));
    } else throw new Error('Invalid credentials');
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('vidhyardhi-user');
  };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
};

// ===================================================================================
// 3. ATOMIC UI COMPONENTS
// ===================================================================================

const ThemeToggle = () => {
    const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

    const toggle = () => {
        const next = !isDark;
        setIsDark(next);
        if (next) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    return (
        <button 
            onClick={toggle}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-all hover:scale-110 active:scale-95 border border-slate-200 dark:border-slate-700"
            aria-label="Toggle Theme"
        >
            {isDark ? <i className="fas fa-sun text-amber-400"></i> : <i className="fas fa-moon text-indigo-500"></i>}
        </button>
    );
};

const Card: React.FC<{ children: React.ReactNode, className?: string, header?: React.ReactNode }> = ({ children, className, header }) => (
    <div className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/50 dark:border-slate-800 p-6 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] ${className}`}>
        {header && <div className="mb-6">{header}</div>}
        {children}
    </div>
);

const Button: React.FC<{ onClick?: () => void, children: React.ReactNode, type?: 'button' | 'submit', className?: string, variant?: 'primary' | 'secondary' | 'danger' | 'ghost', disabled?: boolean }> = ({ onClick, children, type = 'button', className, variant = 'primary', disabled }) => {
    const variants = {
        primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none',
        secondary: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 dark:shadow-none',
        danger: 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-200 dark:shadow-none',
        ghost: 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
    };
    return (
        <button 
            type={type} 
            onClick={onClick} 
            disabled={disabled} 
            className={`font-bold py-3 px-6 rounded-2xl active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 ${variants[variant]} ${className}`}
        >
            {children}
        </button>
    );
};

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input 
        {...props} 
        className={`w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/5 focus:border-indigo-500/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-all ${props.className}`} 
    />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
    <select 
        {...props} 
        className={`w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 text-slate-900 dark:text-slate-100 font-bold transition-all ${props.className}`} 
    />
);

const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
    <textarea 
        {...props} 
        className={`w-full px-5 py-3.5 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-all ${props.className}`} 
    />
);

const PageLayout: React.FC<{ title: string; user: User; onLogout: () => void; children: React.ReactNode }> = ({ title, user, onLogout, children }) => {
    const roleConfig = {
        admin: { color: 'bg-rose-500', icon: 'fa-user-gear' },
        cr: { color: 'bg-amber-500', icon: 'fa-user-shield' },
        student: { color: 'bg-emerald-500', icon: 'fa-user-graduate' }
    };
    const config = roleConfig[user.role as keyof typeof roleConfig] || roleConfig.student;

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-indigo-100 dark:selection:bg-indigo-900 transition-colors duration-300">
            <header className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-white/50 dark:border-slate-800 sticky top-0 z-50 print:hidden">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4 group cursor-default">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:rotate-6 transition-transform">
                             <i className="fas fa-graduation-cap text-white text-xl"></i>
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 leading-none tracking-tight">Vidhyardhi</h1>
                            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.2em]">Student Portal</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 sm:gap-6">
                        <ThemeToggle />
                        <div className="hidden md:flex items-center gap-4 border-r border-slate-200 dark:border-slate-800 pr-6">
                           <div className="text-right">
                               <p className="font-bold text-sm text-slate-800 dark:text-slate-200 leading-none mb-1">{user.name}</p>
                               <div className="flex items-center justify-end gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${config.color} animate-pulse`}></span>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{user.role}</span>
                               </div>
                           </div>
                           <div className={`w-10 h-10 rounded-xl ${config.color} flex items-center justify-center text-white shadow-md`}>
                               <i className={`fas ${config.icon} text-sm`}></i>
                           </div>
                        </div>
                        <button 
                            onClick={onLogout} 
                            className="flex items-center gap-2 text-rose-500 hover:text-rose-600 font-bold transition-colors text-sm px-4 py-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl"
                        >
                           <i className="fas fa-power-off"></i><span className="hidden sm:inline">Sign Out</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8 md:py-12">
                <div className="mb-10 animate-in fade-in slide-in-from-left-4 duration-500 print:hidden">
                    <div className="inline-flex items-center gap-2 mb-2">
                        <div className="h-px w-8 bg-indigo-600"></div>
                        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-600">Dashboard Overview</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{title}</h2>
                </div>
                {children}
            </main>
        </div>
    );
};

// ===================================================================================
// 4. RESOURCE VAULT (ENHANCED FILE EXPLORER)
// ===================================================================================

const ResourceExplorer: React.FC<{ initialSemester?: string }> = ({ initialSemester }) => {
    const [activeSem, setActiveSem] = useState(initialSemester || 'sem1-1');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    
    const folderId = SEM_DRIVE_MAP[activeSem as keyof typeof SEM_DRIVE_MAP];
    const currentSemData = SEMESTER_OPTIONS.find(o => o.value === activeSem);

    return (
        <div className="bg-white/90 dark:bg-slate-900/90 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 transition-all duration-300">
            {/* WINDOW TOP BAR */}
            <div className="bg-slate-100 dark:bg-slate-800/80 px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700/50">
                <div className="flex items-center gap-6">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-rose-500 shadow-inner"></div>
                        <div className="w-3 h-3 rounded-full bg-amber-500 shadow-inner"></div>
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-inner"></div>
                    </div>
                    <button 
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                        <i className={`fas ${sidebarOpen ? 'fa-indent' : 'fa-outdent'} text-lg`}></i>
                    </button>
                    <div className="h-4 w-px bg-slate-300 dark:bg-slate-700"></div>
                    <div className="flex items-center gap-3">
                         <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <i className="fas fa-desktop text-xs"></i>
                            Academic Cloud
                         </div>
                         <i className="fas fa-chevron-right text-[8px] text-slate-300"></i>
                         <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                            <i className="fas fa-folder-open text-xs"></i>
                            {currentSemData?.short}
                         </div>
                    </div>
                </div>
                
                <div className="hidden md:flex items-center gap-4 bg-white/50 dark:bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                    <i className="fas fa-search text-slate-400 text-xs"></i>
                    <input 
                        type="text" 
                        placeholder="Search resources..." 
                        className="bg-transparent border-none outline-none text-[10px] font-bold text-slate-600 dark:text-slate-300 w-40"
                    />
                </div>
            </div>

            <div className="flex h-[600px] relative">
                {/* SIDEBAR */}
                <aside 
                    className={`bg-slate-50/50 dark:bg-slate-950/20 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ${
                        sidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 overflow-hidden'
                    }`}
                >
                    <div className="p-4 space-y-1">
                        <p className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Semesters</p>
                        {SEMESTER_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setActiveSem(opt.value)}
                                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${
                                    activeSem === opt.value 
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none translate-x-1' 
                                    : 'text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                            >
                                <i className={`fas ${activeSem === opt.value ? 'fa-folder-open' : 'fa-folder'} text-xs`}></i>
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </aside>

                {/* CONTENT AREA */}
                <main className="flex-1 bg-white dark:bg-slate-900 relative overflow-hidden">
                    {folderId ? (
                        <div className="w-full h-full p-4">
                            <iframe 
                                src={`https://drive.google.com/embeddedfolderview?id=${folderId}#grid`} 
                                className="w-full h-full border-0 rounded-2xl shadow-inner bg-slate-50 dark:bg-slate-950"
                                title="Resource Viewer"
                                loading="lazy"
                            ></iframe>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-12">
                            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-slate-200 dark:border-slate-700">
                                <i className="fas fa-box-open text-4xl text-slate-300"></i>
                            </div>
                            <h4 className="text-xl font-black text-slate-800 dark:text-slate-100">No Records Found</h4>
                            <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs mt-2 font-medium">
                                We couldn't locate any synchronized study materials for this semester yet.
                            </p>
                            <Button variant="ghost" className="mt-8" onClick={() => setActiveSem('sem1-1')}>
                                Return to Root
                            </Button>
                        </div>
                    )}
                    
                    {/* OVERLAY INDICATOR (Subtle) */}
                    <div className="absolute bottom-6 right-8 pointer-events-none">
                        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 flex items-center gap-3 shadow-lg">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">Cloud Connected</span>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

// ===================================================================================
// 5. TIMETABLE DISPLAY COMPONENTS (ENHANCED)
// ===================================================================================

const TimetableWidget: React.FC<{ schedule: TimetableEntry[] }> = ({ schedule }) => {
    const todayIndex = new Date().getDay();
    const todayName = todayIndex === 0 ? null : DAYS_OF_WEEK[todayIndex - 1];

    const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => {
        return todayName || 'Monday';
    });

    const daySchedule = useMemo(() => 
        schedule
            .filter(s => s.day === selectedDay)
            .sort((a, b) => a.startTime.localeCompare(b.startTime)),
        [schedule, selectedDay]
    );

    return (
        <Card header={
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className={`text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-4`}>
                        <i className={`fas fa-calendar-check text-indigo-600`}></i>
                        Academic Schedule
                    </h3>
                </div>
                
                <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {DAYS_OF_WEEK.map(day => {
                        const isToday = day === todayName;
                        return (
                            <button
                                key={day}
                                onClick={() => setSelectedDay(day)}
                                className={`relative px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border ${
                                    selectedDay === day 
                                    ? `bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200` 
                                    : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 hover:border-slate-300'
                                }`}
                            >
                                {day.substring(0, 3)}
                                {isToday && (
                                    <span className={`absolute -top-1.5 -right-1 px-1.5 py-0.5 rounded-md text-[7px] font-black tracking-tight leading-none ${selectedDay === day ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'}`}>
                                        TODAY
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        }>
            <div className="space-y-4">
                {daySchedule.map((slot) => {
                    const isLive = isCurrentlyHappening(slot.startTime, slot.endTime, slot.day);
                    const color = getSubjectColor(slot.subject);
                    
                    return (
                        <div 
                            key={slot.id} 
                            className={`relative group p-6 rounded-[2rem] border transition-all duration-300 flex items-center justify-between ${
                                isLive 
                                ? `bg-gradient-to-r from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/50 border-l-[12px] ${color.border} shadow-2xl shadow-indigo-100/50 scale-[1.03] z-10` 
                                : `bg-white dark:bg-slate-800/50 border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-l-[12px] ${color.border}`
                            } overflow-hidden`}
                        >
                            {isLive && (
                                <div className={`absolute -top-3 left-12 ${color.bg} text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg z-20`}>
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-2"></span>
                                    Live Session
                                </div>
                            )}

                            <div className="flex items-center gap-6 relative z-10">
                                <div className="flex flex-col items-center justify-center min-w-[75px]">
                                    <span className={`text-sm font-black tracking-tighter leading-none ${isLive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>{slot.startTime}</span>
                                    <div className={`h-4 w-px my-1 ${isLive ? 'bg-indigo-200' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                    <span className="text-[10px] font-bold text-slate-400 tracking-tighter leading-none">{slot.endTime}</span>
                                </div>

                                <div className={`h-10 w-px ${isLive ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-slate-100 dark:bg-slate-800'} hidden sm:block`}></div>

                                <div>
                                    <h5 className={`font-black text-xl mb-1 ${isLive ? `text-indigo-900 dark:text-indigo-300` : 'text-slate-800 dark:text-slate-200'}`}>
                                        {slot.subject}
                                    </h5>
                                    <div className="flex items-center gap-3">
                                        <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${isLive ? 'text-indigo-500' : 'text-slate-400'}`}>
                                            <i className="fas fa-chalkboard-user text-[9px]"></i>
                                            {slot.faculty}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm ${
                                isLive 
                                ? `${color.bg} text-white rotate-3` 
                                : `${color.light} ${color.text} group-hover:rotate-12`
                            }`}>
                                <i className={`fas ${isLive ? 'fa-hourglass-half' : 'fa-book-open-reader'} text-lg`}></i>
                            </div>

                            {/* Background Subject Initial for extra flair */}
                            <div className={`absolute -right-4 -bottom-6 text-9xl font-black opacity-[0.03] dark:opacity-[0.05] pointer-events-none select-none ${isLive ? color.text : 'text-slate-400'}`}>
                                {slot.subject.charAt(0)}
                            </div>
                        </div>
                    );
                })}

                {daySchedule.length === 0 && (
                    <div className="py-24 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                         <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200 dark:text-slate-700">
                             <i className="fas fa-bed text-4xl"></i>
                         </div>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">No academic activities scheduled for {selectedDay}</p>
                    </div>
                )}
            </div>
        </Card>
    );
};

// ===================================================================================
// 6. BANNER COMPONENTS
// ===================================================================================

const AlertBanner: React.FC<{ icon: string, title: string, content: string, onDismiss: () => void, variant: 'primary' | 'warning' | 'danger' }> = ({ icon, title, content, onDismiss, variant }) => {
    const styles = {
        primary: 'from-indigo-600 to-violet-700',
        warning: 'from-amber-500 to-orange-600',
        danger: 'from-rose-500 to-red-600'
    };
    return (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-4 animate-in fade-in slide-in-from-top-10 duration-300 print:hidden">
            <div className={`bg-gradient-to-br ${styles[variant]} text-white p-5 rounded-[2.5rem] shadow-2xl border border-white/20 flex items-center gap-6`}>
                <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center animate-pulse">
                    <i className={`fas ${icon} text-xl`}></i>
                </div>
                <div className="flex-1">
                    <h4 className="font-black text-[10px] uppercase tracking-[0.2em] opacity-70 mb-1">{title}</h4>
                    <p className="text-sm font-bold leading-snug">{content}</p>
                </div>
                <button onClick={onDismiss} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
                    <i className="fas fa-times text-xs"></i>
                </button>
            </div>
        </div>
    );
};

// ===================================================================================
// 7. CUSTOM HOOKS
// ===================================================================================

const useTimetableChangeNotification = (classId: string) => {
    const [alert, setAlert] = useState<{ content: string; id: string } | null>(null);

    useEffect(() => {
        if (!classId) return;
        const check = async () => {
            try {
                const notices = await supabaseService.getNoticesForClass(classId);
                const latestTT = notices.find(n => n.title.startsWith('🚨 TIMETABLE_'));
                if (latestTT) {
                    const dismissed = localStorage.getItem(`dismissed-notice-${latestTT.id}`);
                    if (!dismissed) {
                        setAlert({ content: latestTT.content, id: latestTT.id });
                    }
                }
            } catch (e) { console.error(e); }
        };
        check();
        const interval = setInterval(check, 30000); 
        return () => clearInterval(interval);
    }, [classId]);

    const dismissAlert = () => {
        if (alert) {
            localStorage.setItem(`dismissed-notice-${alert.id}`, 'true');
            setAlert(null);
        }
    };

    return { alert, dismissAlert };
};

const useAttendanceNotification = (studentId: string) => {
    const [alert, setAlert] = useState<{ type: 'warning' | 'info'; message: string } | null>(null);

    useEffect(() => {
        if (!studentId) return;
        const check = async () => {
            try {
                const recs = await supabaseService.getAttendanceForStudent(studentId);
                if (recs.length > 0) {
                    const perc = Math.round((recs.filter(r => r.present).length / recs.length) * 100);
                    if (perc < 75) {
                        setAlert({ type: 'warning', message: `Critically low attendance: ${perc}%.` });
                    }
                }
            } catch (e) { console.error(e); }
        };
        check();
    }, [studentId]);

    const dismissAlert = () => setAlert(null);

    return { alert, dismissAlert };
};

// ===================================================================================
// 8. DASHBOARDS
// ===================================================================================

const LoginPage = () => {
    const [rollNo, setRollNo] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); setLoading(true);
        try { await login(rollNo, password); } 
        catch (err) { setError(err instanceof Error ? err.message : 'Login failed'); } 
        finally { setLoading(false); }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#F1F5F9] dark:bg-slate-950 relative overflow-hidden transition-colors duration-300">
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-50 dark:opacity-20">
                <div className="absolute top-[10%] left-[10%] w-[30%] h-[40%] bg-indigo-200/40 dark:bg-indigo-600/20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[30%] bg-violet-200/40 dark:bg-violet-600/20 rounded-full blur-[120px]"></div>
            </div>
            <div className="w-full max-w-md p-8 sm:p-12 relative z-10 animate-in fade-in zoom-in-95 duration-700">
                <Card className="border-none shadow-2xl p-10 bg-white/90 dark:bg-slate-900/90">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-200 dark:shadow-none mb-6">
                            <i className="fas fa-graduation-cap text-4xl"></i>
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-2">Vidhyardhi</h1>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Digital Learning Ecosystem</p>
                    </div>
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && <div className="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 p-4 rounded-2xl text-xs font-bold text-center">{error}</div>}
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Username</label>
                            <Input value={rollNo} onChange={(e) => setRollNo(e.target.value)} placeholder="Roll Number" required />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Passkey</label>
                            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                        </div>
                        <Button type="submit" className="w-full py-4 text-base" disabled={loading}>{loading ? <i className="fas fa-circle-notch fa-spin"></i> : 'Log In'}</Button>
                    </form>
                </Card>
            </div>
        </div>
    );
};

// --------------------------------- ADMIN ANALYTICS MODULE ---------------------------------

const PieChart: React.FC<{ data: { label: string, value: number, color: string }[] }> = ({ data }) => {
    const total = data.reduce((acc, curr) => acc + curr.value, 0);
    let cumulativePercent = 0;

    const getCoordinatesForPercent = (percent: number) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    if (total === 0) return <div className="text-center text-slate-400 py-10 font-bold uppercase tracking-widest text-xs">No Data to Display</div>;

    return (
        <div className="relative flex flex-col items-center">
            <svg viewBox="-1 -1 2 2" className="w-48 h-48 -rotate-90">
                {data.map((slice, i) => {
                    const percent = slice.value / total;
                    const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
                    cumulativePercent += percent;
                    const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
                    const largeArcFlag = percent > 0.5 ? 1 : 0;
                    const pathData = `M ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} L 0 0`;
                    return <path key={i} d={pathData} fill={slice.color} className="transition-all hover:opacity-80" />;
                })}
                <circle r="0.6" fill="currentColor" className="text-white dark:text-slate-900" cx="0" cy="0" />
            </svg>
            <div className="grid grid-cols-2 gap-4 mt-8 w-full">
                {data.map((slice, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: slice.color }}></div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-slate-400 leading-none">{slice.label}</span>
                            <span className="text-sm font-black text-slate-800 dark:text-slate-100">{slice.value} ({((slice.value / total) * 100).toFixed(0)}%)</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const BarChart: React.FC<{ data: { label: string, present: number, absent: number }[] }> = ({ data }) => {
    const maxVal = Math.max(...data.map(d => d.present + d.absent), 1);

    return (
        <div className="w-full space-y-6">
            {data.map((item, i) => {
                const total = item.present + item.absent;
                const presentPerc = (item.present / maxVal) * 100;
                const absentPerc = (item.absent / maxVal) * 100;
                const activityPerc = total > 0 ? (item.present / total) * 100 : 0;

                return (
                    <div key={i} className="space-y-2">
                        <div className="flex justify-between items-end">
                            <div>
                                <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{item.label}</span>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Active Rate: {activityPerc.toFixed(1)}%</p>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-black text-emerald-500 uppercase">{item.present} Present</span>
                                <span className="mx-2 text-slate-300">/</span>
                                <span className="text-[10px] font-black text-rose-500 uppercase">{item.absent} Absent</span>
                            </div>
                        </div>
                        <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                            <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${presentPerc}%` }}></div>
                            <div className="h-full bg-rose-500 transition-all duration-1000" style={{ width: `${absentPerc}%` }}></div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const AdminAnalyticsModule = () => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [stats, setStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const data = await supabaseService.getDailyActivityStats(date);
            setStats(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    const totalAttendance = useMemo(() => {
        const present = stats.reduce((acc, curr) => acc + curr.present, 0);
        const absent = stats.reduce((acc, curr) => acc + curr.absent, 0);
        return { present, absent };
    }, [stats]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <Card header={
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-4">
                        <i className="fas fa-chart-line text-indigo-600"></i>
                        Live Activity Matrix
                    </h3>
                    <div className="w-full sm:w-auto">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Snapshot Date</label>
                        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="!py-2 !px-4" />
                    </div>
                </div>
            }>
                {loading ? (
                    <div className="py-20 text-center"><i className="fas fa-circle-notch fa-spin text-indigo-600 text-3xl"></i></div>
                ) : stats.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 p-4">
                        <div>
                            <div className="mb-8">
                                <span className="text-[11px] font-black uppercase text-indigo-600 tracking-[0.2em] block mb-2">College-Wide Distribution</span>
                                <h4 className="text-xl font-black text-slate-800 dark:text-slate-100">Attendance Pulse</h4>
                            </div>
                            <PieChart data={[
                                { label: 'Present', value: totalAttendance.present, color: '#10b981' },
                                { label: 'Absent', value: totalAttendance.absent, color: '#f43f5e' }
                            ]} />
                        </div>
                        <div>
                            <div className="mb-8">
                                <span className="text-[11px] font-black uppercase text-indigo-600 tracking-[0.2em] block mb-2">Class-wise Comparison</span>
                                <h4 className="text-xl font-black text-slate-800 dark:text-slate-100">Section Engagement</h4>
                            </div>
                            <BarChart data={stats.map(s => ({ label: s.name, present: s.present, absent: s.absent }))} />
                        </div>
                    </div>
                ) : (
                    <div className="py-20 text-center">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-dashed border-slate-200 dark:border-slate-700">
                             <i className="fas fa-ghost text-3xl text-slate-300"></i>
                        </div>
                        <h5 className="text-xl font-black text-slate-800 dark:text-slate-100">No Activity Logged</h5>
                        <p className="text-sm text-slate-400 max-w-xs mx-auto mt-2">No attendance records found for the selected date across any sections.</p>
                    </div>
                )}
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon="fa-users" label="Enrolled Students" value={stats.reduce((a, c) => a + c.total, 0)} color="text-indigo-600" />
                <StatCard icon="fa-check-circle" label="Today's Presentees" value={totalAttendance.present} color="text-emerald-500" />
                <StatCard icon="fa-times-circle" label="Today's Absentees" value={totalAttendance.absent} color="text-rose-500" />
                <StatCard icon="fa-bolt" label="Global Active Rate" value={stats.length > 0 ? (totalAttendance.present / (totalAttendance.present + totalAttendance.absent || 1) * 100).toFixed(1) + '%' : '0%'} color="text-amber-500" />
            </div>
        </div>
    );
};

const StatCard: React.FC<{ icon: string, label: string, value: string | number, color: string }> = ({ icon, label, value, color }) => (
    <Card className="hover:translate-y-[-4px]">
        <div className="flex items-center gap-5">
            <div className={`w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center ${color}`}>
                <i className={`fas ${icon} text-xl`}></i>
            </div>
            <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1.5">{label}</p>
                <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-none">{value}</h4>
            </div>
        </div>
    </Card>
);

// --------------------------------- ADMIN DASHBOARD ---------------------------------

const AdminReportsModule = () => {
    const [reportType, setReportType] = useState<'class' | 'student' | 'subject'>('class');
    const [classes, setClasses] = useState<Class[]>([]);
    const [students, setStudents] = useState<User[]>([]);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        supabaseService.getClasses().then(setClasses);
        supabaseService.getAllStudents().then(setStudents);
    }, []);

    const summaryStats = useMemo(() => {
        if (attendanceData.length === 0) return null;
        
        if (reportType === 'subject') {
            const totalPerc = attendanceData.reduce((acc, curr) => acc + parseFloat(curr.percentage), 0);
            return {
                average: (totalPerc / attendanceData.length).toFixed(1) + '%',
                totalItems: attendanceData.length,
                label: 'Tracked Subjects'
            };
        }
        
        const total = attendanceData.length;
        const present = attendanceData.filter(d => d.present).length;
        return {
            average: total > 0 ? ((present / total) * 100).toFixed(1) + '%' : '0%',
            totalItems: total,
            presentCount: present,
            absentCount: total - present,
            label: 'Total Sessions Recorded'
        };
    }, [attendanceData, reportType]);

    const fetchReport = async () => {
        setLoading(true);
        try {
            if (reportType === 'class' && selectedClassId) {
                const data = await supabaseService.getAllAttendanceForClass(selectedClassId, startDate, endDate);
                setAttendanceData(data);
            } else if (reportType === 'student' && selectedStudentId) {
                const data = await supabaseService.getAttendanceForStudent(selectedStudentId, startDate, endDate);
                const student = students.find(s => s.uid === selectedStudentId);
                setAttendanceData(data.map(d => ({ ...d, studentName: student?.name, rollNo: student?.rollNo })));
            } else if (reportType === 'subject' && selectedClassId) {
                const data = await supabaseService.getAllAttendanceForClass(selectedClassId, startDate, endDate);
                const subjects = [...new Set(data.map(d => d.subject))];
                const aggregated = subjects.map(sub => {
                    const subAtt = data.filter(d => d.subject === sub);
                    const total = subAtt.length;
                    const present = subAtt.filter(d => d.present).length;
                    return {
                        subject: sub,
                        totalSessions: total,
                        presentSessions: present,
                        percentage: total > 0 ? ((present / total) * 100).toFixed(1) + '%' : '0%'
                    };
                });
                setAttendanceData(aggregated);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCSVExport = () => {
        const filename = `Vidhyardhi_Report_${reportType}_${new Date().toLocaleDateString()}`;
        exportToCSV(attendanceData, filename);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <Card header={<h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-4"><i className="fas fa-file-invoice text-indigo-600"></i>Academic Intelligence Reporting</h3>} className="print:hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Report Type</label>
                        <Select value={reportType} onChange={e => { setReportType(e.target.value as any); setAttendanceData([]); }}>
                            <option value="class">Class-wise Ledger</option>
                            <option value="student">Student Performance</option>
                            <option value="subject">Subject Analytics</option>
                        </Select>
                    </div>

                    {(reportType === 'class' || reportType === 'subject') && (
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Section</label>
                            <Select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}>
                                <option value="">Select Section</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </Select>
                        </div>
                    )}

                    {reportType === 'student' && (
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Student</label>
                            <Select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}>
                                <option value="">Select Student</option>
                                {students.map(s => <option key={s.uid} value={s.uid}>{s.name} ({s.rollNo})</option>)}
                            </Select>
                        </div>
                    )}

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">From Date</label>
                        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">To Date</label>
                        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>

                    <div className="flex items-end">
                        <Button onClick={fetchReport} className="w-full" disabled={loading}>
                            {loading ? <i className="fas fa-circle-notch fa-spin"></i> : 'Sync Report'}
                        </Button>
                    </div>
                </div>

                {attendanceData.length > 0 && (
                    <div className="flex gap-3 border-t border-slate-100 dark:border-slate-800 pt-6">
                        <Button variant="secondary" onClick={handleCSVExport} className="!py-2.5 !text-xs"><i className="fas fa-file-excel"></i> Export Excel (CSV)</Button>
                        <Button variant="ghost" onClick={() => window.print()} className="!py-2.5 !text-xs !bg-indigo-50 dark:!bg-indigo-900/20 !text-indigo-600 border-none"><i className="fas fa-file-pdf"></i> Official PDF Print</Button>
                    </div>
                )}
            </Card>

            {attendanceData.length > 0 && (
                <div className="space-y-8 print:m-0 print:p-0 print:shadow-none print:border-none">
                    {/* Official Header for Print */}
                    <div className="text-center hidden print:block mb-10 border-b-2 border-slate-900 pb-8">
                        <h1 className="text-4xl font-black tracking-tighter mb-2">VIDHYARDHI ACADEMIC PORTAL</h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-6">Autonomous Learning Management Matrix</p>
                        <div className="flex justify-between items-end px-10">
                            <div className="text-left">
                                <p className="text-[10px] font-black uppercase text-slate-400">Report Reference</p>
                                <h2 className="text-xl font-bold uppercase">{reportType} Attendance Analysis</h2>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase text-slate-400">Generation Timestamp</p>
                                <p className="text-sm font-bold">{new Date().toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Summary Intelligence Tiles */}
                    {summaryStats && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="!bg-indigo-600 text-white border-none shadow-xl print:bg-white print:text-black print:border print:border-slate-200">
                                <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Consistency Index</p>
                                <div className="flex items-end gap-3">
                                    <h4 className="text-4xl font-black">{summaryStats.average}</h4>
                                    <span className="text-[10px] font-bold opacity-60 mb-1">AGGREGATE</span>
                                </div>
                            </Card>
                            <Card className="print:border print:border-slate-200">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{summaryStats.label}</p>
                                <h4 className="text-3xl font-black text-slate-800 dark:text-slate-100">{summaryStats.totalItems}</h4>
                            </Card>
                            {reportType !== 'subject' && (
                                <Card className="print:border print:border-slate-200">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Presence Distribution</p>
                                    <div className="flex gap-6">
                                        <div>
                                            <span className="text-[10px] font-black text-emerald-500 uppercase block">Present</span>
                                            <b className="text-2xl">{summaryStats.presentCount}</b>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black text-rose-500 uppercase block">Absent</span>
                                            <b className="text-2xl">{summaryStats.absentCount}</b>
                                        </div>
                                    </div>
                                </Card>
                            )}
                        </div>
                    )}

                    <Card className="!rounded-[2.5rem] print:rounded-none overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800/50">
                                    <tr>
                                        {reportType !== 'subject' && <th className="py-4 px-6 font-black uppercase text-[10px] text-slate-500 tracking-widest">Date</th>}
                                        {reportType === 'class' && <th className="py-4 px-6 font-black uppercase text-[10px] text-slate-500 tracking-widest">Student Roster</th>}
                                        {reportType !== 'subject' && <th className="py-4 px-6 font-black uppercase text-[10px] text-slate-500 tracking-widest">Subject Domain</th>}
                                        
                                        {reportType === 'subject' && <th className="py-4 px-6 font-black uppercase text-[10px] text-slate-500 tracking-widest">Module Name</th>}
                                        {reportType === 'subject' && <th className="py-4 px-6 font-black uppercase text-[10px] text-slate-500 tracking-widest text-center">Sessions</th>}
                                        {reportType === 'subject' && <th className="py-4 px-6 font-black uppercase text-[10px] text-slate-500 tracking-widest text-center">Presence</th>}
                                        
                                        <th className="py-4 px-6 font-black uppercase text-[10px] text-slate-500 tracking-widest text-right">Status Index</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {attendanceData.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                            {reportType !== 'subject' && <td className="py-4 px-6 text-sm font-bold text-slate-500">{row.date}</td>}
                                            {reportType === 'class' && (
                                                <td className="py-4 px-6">
                                                    <div className="text-sm font-black text-indigo-600 dark:text-indigo-400">{row.rollNo}</div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase">{row.studentName}</div>
                                                </td>
                                            )}
                                            {reportType !== 'subject' && <td className="py-4 px-6 text-sm font-black text-slate-800 dark:text-slate-100">{row.subject}</td>}
                                            
                                            {reportType === 'subject' && <td className="py-4 px-6 text-sm font-black text-slate-800 dark:text-slate-100 uppercase">{row.subject}</td>}
                                            {reportType === 'subject' && <td className="py-4 px-6 text-sm font-bold text-center">{row.totalSessions}</td>}
                                            {reportType === 'subject' && <td className="py-4 px-6 text-sm font-bold text-center text-emerald-500">{row.presentSessions}</td>}
                                            
                                            <td className="py-4 px-6 text-right">
                                                {reportType === 'subject' ? (
                                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${parseFloat(row.percentage) < 75 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                        {row.percentage} Rate
                                                    </span>
                                                ) : (
                                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${row.present ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                        {row.present ? 'VERIFIED PRESENT' : 'RECORDED ABSENT'}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Official Footer for Print */}
                    <div className="hidden print:flex justify-between items-center mt-20 pt-10 border-t border-slate-200 px-10">
                        <div className="text-center">
                            <div className="w-40 h-px bg-slate-900 mb-2"></div>
                            <p className="text-[8px] font-black uppercase">System Administrator Signature</p>
                        </div>
                        <div className="text-center">
                            <div className="w-40 h-px bg-slate-900 mb-2"></div>
                            <p className="text-[8px] font-black uppercase">College Academic Seal</p>
                        </div>
                    </div>
                </div>
            )}

            {attendanceData.length === 0 && !loading && (
                <div className="py-32 text-center bg-white dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                        <i className="fas fa-search-plus text-3xl"></i>
                    </div>
                    <h5 className="text-xl font-black text-slate-800 dark:text-slate-100">No Intelligence Records Found</h5>
                    <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto mt-2">Adjust your filters or section selection to query the academic attendance matrix.</p>
                </div>
            )}
        </div>
    );
};

const AdminDashboard = () => {
    const { user, logout } = useAuth();
    const [classes, setClasses] = useState<Class[]>([]);
    const [crs, setCrs] = useState<(User & { className: string })[]>([]);
    const [selectedClassForSchedule, setSelectedClassForSchedule] = useState<Class | null>(null);
    const [activeTab, setActiveTab] = useState('overview');

    const fetchData = useCallback(async () => {
        const [cl, crList] = await Promise.all([supabaseService.getClasses(), supabaseService.getAllCRs()]);
        setClasses(cl); setCrs(crList);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const nav = [
        { id: 'overview', label: 'Management', icon: 'fa-gauge-high' },
        { id: 'analytics', label: 'Analytics', icon: 'fa-chart-line' },
        { id: 'reports', label: 'Reports', icon: 'fa-chart-pie' },
    ];

    if (!user) return null;

    return (
        <PageLayout title="System Administration" user={user} onLogout={logout}>
            <div className="flex gap-4 mb-10 print:hidden overflow-x-auto pb-2">
                {nav.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`px-8 py-4 rounded-3xl font-black text-sm uppercase tracking-widest flex items-center gap-4 transition-all whitespace-nowrap ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'bg-white dark:bg-slate-900 text-slate-400 hover:text-slate-600'}`}
                    >
                        <i className={`fas ${item.icon}`}></i> {item.label}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
                    <div className="lg:col-span-4 space-y-8">
                        <ManageCRs classes={classes} onCRAdded={fetchData} />
                        <Card header={<h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Section CR Roster</h3>}>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {crs.map(item => (
                                    <div key={item.uid} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        <div>
                                            <p className="text-sm font-black text-slate-800 dark:text-slate-200">{item.name}</p>
                                            <p className={`text-[10px] font-bold uppercase tracking-widest text-indigo-500`}>{item.className}</p>
                                        </div>
                                        <button onClick={async () => { if(confirm("Revoke CR?")) { await supabaseService.removeCR(item.uid, item.classId); fetchData(); }}} className="text-rose-400 hover:text-rose-600 transition-colors"><i className="fas fa-trash-alt"></i></button>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                    <div className="lg:col-span-8 space-y-8">
                        <ManageClasses classes={classes} onClassAdded={fetchData} onManageSchedule={setSelectedClassForSchedule} />
                    </div>
                    {selectedClassForSchedule && (
                        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
                            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
                                <ManageSchedule selectedClass={selectedClassForSchedule} onClose={() => setSelectedClassForSchedule(null)} />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'analytics' && <AdminAnalyticsModule />}
            {activeTab === 'reports' && <AdminReportsModule />}
        </PageLayout>
    );
};

// --------------------------------- CR DASHBOARD ------------------------------------
const CRDashboard = () => {
    const { user, logout } = useAuth();
    const [className, setClassName] = useState('');
    const [students, setStudents] = useState<User[]>([]);
    const [schedule, setSchedule] = useState<TimetableEntry[]>([]);
    const [editingStudent, setEditingStudent] = useState<User | null>(null);
    const { alert: ttAlert, dismissAlert } = useTimetableChangeNotification(user?.classId || '');

    const fetchStudents = useCallback(async () => {
        if(user) setStudents(await supabaseService.getStudentsByClass(user.classId));
    }, [user]);

    const fetchSchedule = useCallback(async () => {
        if(user) setSchedule(await supabaseService.getTimetableForClass(user.classId));
    }, [user]);

    useEffect(() => {
        if(user) {
            supabaseService.getClassById(user.classId).then(c => c && setClassName(c.name));
            fetchStudents();
            fetchSchedule();
        }
    }, [user, fetchStudents, fetchSchedule]);

    if (!user) return null;

    return (
        <PageLayout title={`Section Management: ${className}`} user={user} onLogout={logout}>
            {ttAlert && <AlertBanner variant="primary" icon="fa-bell" title="Schedule Update" content={ttAlert.content} onDismiss={dismissAlert} />}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5 space-y-8">
                    <ManageStudents cr={user} onStudentAdded={fetchStudents} />
                    <StudentRosterWidget students={students} currentUserId={user.uid} onDelete={fetchStudents} onEdit={setEditingStudent} />
                </div>
                <div className="lg:col-span-7 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <AttendanceModule students={students} classId={user.classId} />
                        <ManageNoticesWidget classId={user.classId} />
                    </div>
                    <TimetableWidget schedule={schedule} />
                    <ManageSchedule selectedClass={{ id: user.classId, name: className }} />
                    <ResourceExplorer initialSemester={user.semester} />
                </div>
            </div>

            {editingStudent && (
                <EditStudentModal 
                    student={editingStudent} 
                    onClose={() => setEditingStudent(null)} 
                    onUpdated={() => { fetchStudents(); setEditingStudent(null); }}
                />
            )}
        </PageLayout>
    );
};

// --------------------------------- STUDENT DASHBOARD -------------------------------
const StudentDashboard = () => {
    const { user, logout } = useAuth();
    const [schedule, setSchedule] = useState<TimetableEntry[]>([]);
    const [notices, setNotices] = useState<Notice[]>([]);
    const [complaint, setComplaint] = useState('');
    
    const { alert: ttAlert, dismissAlert: dismissTT } = useTimetableChangeNotification(user?.classId || '');
    const { alert: attAlert, dismissAlert: dismissAtt } = useAttendanceNotification(user?.uid || '');

    useEffect(() => {
        if(user) {
            supabaseService.getTimetableForClass(user.classId).then(setSchedule);
            supabaseService.getNoticesForClass(user.classId).then(setNotices);
        }
    }, [user]);

    const handleComplaint = async (e: React.FormEvent) => {
        e.preventDefault(); if(!user || !complaint) return;
        await supabaseService.submitComplaint(user, complaint); setComplaint(''); alert("Report submitted.");
    };

    if (!user) return null;

    return (
        <PageLayout title="Academic Dashboard" user={user} onLogout={logout}>
            {ttAlert && <AlertBanner variant="primary" icon="fa-bell" title="Schedule Alert" content={ttAlert.content} onDismiss={dismissTT} />}
            {attAlert && <AlertBanner variant="danger" icon="fa-triangle-exclamation" title="Attendance Alert" content={attAlert.message} onDismiss={dismissAtt} />}
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">
                    <TimetableWidget schedule={schedule} />
                    <Card header={<h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-4"><i className="fas fa-bullhorn text-indigo-600"></i>Notices</h3>}>
                        <div className="space-y-6">
                            {notices.map(n => (
                                <div key={n.id} className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border-l-[12px] border-indigo-500">
                                    <h4 className="font-black text-slate-900 dark:text-slate-100 text-xl mb-3">{n.title}</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{n.content}</p>
                                </div>
                            ))}
                        </div>
                    </Card>
                    <div className="py-4">
                        <ResourceExplorer initialSemester={user.semester} />
                    </div>
                </div>
                <div className="lg:col-span-4 space-y-8">
                    <StudentConsistencyWidget student={user} />
                    <Card header={<h3 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-3"><i className="fas fa-file-signature text-rose-500"></i>Submit Grievance</h3>}>
                        <form onSubmit={handleComplaint} className="space-y-4">
                            <Textarea placeholder="Describe your issue..." value={complaint} onChange={e => setComplaint(e.target.value)} rows={4} required />
                            <Button type="submit" className="w-full !bg-rose-500/10 !text-rose-500 !shadow-none hover:!bg-rose-500/20">Submit Report</Button>
                        </form>
                    </Card>
                </div>
            </div>
        </PageLayout>
    );
};

// ===================================================================================
// 9. WIDGETS
// ===================================================================================

const EditStudentModal: React.FC<{ student: User, onClose: () => void, onUpdated: () => void }> = ({ student, onClose, onUpdated }) => {
    const [n, setN] = useState(student.name);
    const [r, setR] = useState(student.rollNo);
    const [p, setP] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await supabaseService.updateUser(student.uid, { name: n, rollNo: r, password: p || undefined });
            onUpdated();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Update failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
            <div className="w-full max-w-md animate-in zoom-in-95 duration-300">
                <Card header={
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Edit Student Record</h3>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><i className="fas fa-times"></i></button>
                    </div>
                }>
                    <form onSubmit={handleUpdate} className="space-y-5">
                        {error && <p className="text-xs font-bold text-rose-500">{error}</p>}
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Full Name</label>
                            <Input value={n} onChange={e => setN(e.target.value)} required />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Roll Number</label>
                            <Input value={r} onChange={e => setR(e.target.value)} required />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Reset Password (Optional)</label>
                            <Input type="password" placeholder="Leave blank to keep current" value={p} onChange={e => setP(e.target.value)} />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
                            <Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
};

const ManageClasses: React.FC<{ classes: Class[], onClassAdded: () => void, onManageSchedule: (c: Class) => void }> = ({ classes, onClassAdded, onManageSchedule }) => {
    const [name, setName] = useState('');
    const handleAdd = async (e: React.FormEvent) => { e.preventDefault(); await supabaseService.addClass(name); setName(''); onClassAdded(); };
    return (
        <Card header={<h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Departmental Sections</h3>}>
            <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 mb-8">
                <Input placeholder="Section Name (e.g., EEE-A)" value={name} onChange={e => setName(e.target.value)} required />
                <Button type="submit" className="whitespace-nowrap">Add Section</Button>
            </form>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {classes.map(c => (
                    <div key={c.id} className="p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                        <b className="text-lg font-black text-slate-800 dark:text-slate-200 block mb-4">{c.name}</b>
                        <Button onClick={() => onManageSchedule(c)} variant="ghost" className="w-full">Schedule</Button>
                    </div>
                ))}
            </div>
        </Card>
    );
};

const ManageSchedule: React.FC<{ selectedClass: { id: string, name: string }, onClose?: () => void }> = ({ selectedClass, onClose }) => {
    const [entries, setEntries] = useState<TimetableEntry[]>([]); 
    const [day, setDay] = useState<DayOfWeek>('Monday'); 
    const [sub, setSub] = useState(''); 
    const [instructor, setInstructor] = useState(''); 
    const [st, setSt] = useState('09:00'); 
    const [et, setEt] = useState('10:00');
    const [editingId, setEditingId] = useState<string | null>(null);
    
    const refresh = useCallback(async () => setEntries(await supabaseService.getTimetableForClass(selectedClass.id)), [selectedClass.id]);
    useEffect(() => { refresh(); }, [refresh]);

    const handleEdit = (e: TimetableEntry) => {
        setEditingId(e.id);
        setDay(e.day);
        setSub(e.subject);
        setInstructor(e.faculty);
        setSt(e.startTime);
        setEt(e.endTime);
    };

    const resetForm = () => {
        setEditingId(null);
        setSub('');
        setInstructor('');
        setSt('09:00');
        setEt('10:00');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await supabaseService.updateTimetableEntry(editingId, {
                    classId: selectedClass.id,
                    day,
                    subject: sub,
                    faculty: instructor,
                    startTime: st,
                    endTime: et
                });
            } else {
                await supabaseService.addTimetableEntry({
                    classId: selectedClass.id,
                    day,
                    subject: sub,
                    faculty: instructor,
                    startTime: st,
                    endTime: et
                });
            }
            resetForm();
            refresh();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Scheduling failed');
        }
    };

    return (
        <Card header={
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">Design Schedule: {selectedClass.name}</h3>
                {onClose && <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"><i className="fas fa-times"></i></button>}
            </div>
        }>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-10 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2.5rem]">
                <Select value={day} onChange={e => setDay(e.target.value as any)}>{DAYS_OF_WEEK.map(d => <option key={d}>{d}</option>)}</Select>
                <Input placeholder="Subject" value={sub} onChange={e => setSub(e.target.value)} required />
                <Input placeholder="Instructor" value={instructor} onChange={e => setInstructor(e.target.value)} required />
                <Input type="time" value={st} onChange={e => setSt(e.target.value)} required />
                <Input type="time" value={et} onChange={e => setEt(e.target.value)} required />
                <div className="flex flex-col gap-2">
                    <Button type="submit">{editingId ? 'Update' : 'Add Slot'}</Button>
                    {editingId && <Button variant="ghost" onClick={resetForm}>Cancel</Button>}
                </div>
            </form>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {entries.map(e => (
                    <div key={e.id} className={`flex justify-between items-center p-6 border rounded-3xl transition-all hover:scale-[1.01] ${editingId === e.id ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-900/10' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm'}`}>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">{e.day} | {e.startTime}-{e.endTime}</p>
                            <b className="text-lg text-slate-800 dark:text-slate-200">{e.subject}</b>
                            <p className="text-xs text-indigo-500 dark:text-indigo-400 font-bold">{e.faculty}</p>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => handleEdit(e)} className="text-indigo-400 hover:text-indigo-600 transition-colors"><i className="fas fa-edit"></i></button>
                            <button onClick={async () => { await supabaseService.deleteTimetableEntry(e.id); refresh(); }} className="text-rose-400 hover:text-rose-600 transition-colors"><i className="fas fa-trash"></i></button>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

const StudentConsistencyWidget: React.FC<{ student: User }> = ({ student }) => {
    const [recs, setRecs] = useState<AttendanceRecord[]>([]);
    useEffect(() => { supabaseService.getAttendanceForStudent(student.uid).then(setRecs); }, [student.uid]);
    const perc = recs.length > 0 ? Math.round((recs.filter(r => r.present).length / recs.length) * 100) : 0;
    const strokeDash = 2 * Math.PI * 45;
    const offset = strokeDash - (perc / 100) * strokeDash;
    return (
        <Card>
            <div className="flex flex-col items-center">
                <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-8 tracking-widest">Consistency Score</p>
                <div className="relative w-40 h-40 flex items-center justify-center mb-6">
                    <svg className="w-full h-full -rotate-90">
                        <circle cx="50%" cy="50%" r="45" className="fill-none stroke-slate-100 dark:stroke-slate-800 stroke-[10]" />
                        <circle cx="50%" cy="50%" r="45" className={`fill-none stroke-[10] transition-all duration-1000 ease-out ${perc >= 75 ? 'stroke-emerald-500' : 'stroke-rose-500'}`} style={{ strokeDasharray: strokeDash, strokeDashoffset: offset, strokeLinecap: 'round' }} />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                        <span className={`text-4xl font-black ${perc >= 75 ? 'text-emerald-500' : 'text-rose-500'}`}>{perc}%</span>
                    </div>
                </div>
            </div>
        </Card>
    );
};

const StudentRosterWidget: React.FC<{ students: User[], currentUserId: string, onDelete: () => void, onEdit: (s: User) => void }> = ({ students, currentUserId, onDelete, onEdit }) => (
    <Card header={<h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Enrolled Students</h3>}>
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {students.filter(s => s.uid !== currentUserId).map(s => (
                <div key={s.uid} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all">
                    <div>
                        <p className="text-sm font-black text-slate-800 dark:text-slate-200 leading-tight">{s.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{s.rollNo}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => onEdit(s)} className="text-indigo-400 hover:text-indigo-600 transition-colors">
                            <i className="fas fa-edit"></i>
                        </button>
                        <button onClick={async () => { if(confirm("Permanently remove this student?")) { await supabaseService.removeUser(s.uid); onDelete(); }}} className="text-rose-300 hover:text-rose-500 transition-colors">
                            <i className="fas fa-user-minus"></i>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    </Card>
);

const ManageCRs: React.FC<{ classes: Class[], onCRAdded: () => void }> = ({ classes, onCRAdded }) => {
    const [rollNo, setRollNo] = useState('');
    const [name, setName] = useState('');
    const [classId, setClassId] = useState('');
    const [semester, setSemester] = useState('sem1-1');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            await supabaseService.createCR(rollNo, name, classId, password, semester);
            setRollNo(''); setName(''); setClassId(''); setPassword(''); onCRAdded();
        } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); } 
        finally { setLoading(false); }
    };

    return (
        <Card header={<h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Appoint Section CR</h3>}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <p className="text-xs font-bold text-rose-500 dark:text-rose-400">{error}</p>}
                <Input placeholder="Roll Number" value={rollNo} onChange={e => setRollNo(e.target.value)} required />
                <Input placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
                <div className="grid grid-cols-2 gap-4">
                    <Select value={classId} onChange={e => setClassId(e.target.value)} required>
                        <option value="">Section</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                    <Select value={semester} onChange={e => setSemester(e.target.value)} required>
                        {SEMESTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                </div>
                <Input type="password" placeholder="Passphrase" value={password} onChange={e => setPassword(e.target.value)} required />
                <Button type="submit" className="w-full">Confirm Appointment</Button>
            </form>
        </Card>
    );
};

const ManageStudents: React.FC<{ cr: User, onStudentAdded: () => void }> = ({ cr, onStudentAdded }) => {
    const [id, setId] = useState(''); const [n, setN] = useState(''); const [p, setP] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleEnroll = async (e: React.FormEvent) => {
        e.preventDefault(); setError(''); setLoading(true);
        try {
            await supabaseService.createStudent(id, n, cr, p, cr.semester || 'sem1-1');
            setId(''); setN(''); setP(''); onStudentAdded();
        } catch (err) { setError(err instanceof Error ? err.message : 'Enrollment failed'); } 
        finally { setLoading(false); }
    };

    return (
        <Card header={<h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Enroll Student</h3>}>
            <form onSubmit={handleEnroll} className="space-y-4">
                {error && <p className="text-xs font-bold text-rose-500 dark:text-rose-400">{error}</p>}
                <Input placeholder="Roll Number" value={id} onChange={e => setId(e.target.value)} required />
                <Input placeholder="Name" value={n} onChange={e => setN(e.target.value)} required />
                <Input type="password" placeholder="Passphrase" value={p} onChange={e => setP(e.target.value)} required />
                <Button type="submit" className="w-full">Enroll</Button>
            </form>
        </Card>
    );
};

const AttendanceModule: React.FC<{ students: User[], classId: string }> = ({ students, classId }) => {
    const [schedule, setSchedule] = useState<TimetableEntry[]>([]);
    const [activeEntry, setActiveEntry] = useState<TimetableEntry | null>(null);
    const [recs, setRecs] = useState<{[k: string]: boolean}>({});
    const [loading, setLoading] = useState(true);

    const refreshActiveSession = useCallback(() => {
        const found = schedule.find(s => isCurrentlyHappening(s.startTime, s.endTime, s.day));
        setActiveEntry(found || null);
    }, [schedule]);

    useEffect(() => {
        supabaseService.getTimetableForClass(classId).then(data => {
            setSchedule(data);
            setLoading(false);
        });
    }, [classId]);

    useEffect(() => {
        if (!loading) {
            refreshActiveSession();
            const interval = setInterval(refreshActiveSession, 10000); // Check every 10s
            return () => clearInterval(interval);
        }
    }, [loading, refreshActiveSession]);

    const handleCommit = async () => {
        if (!activeEntry) return;
        if (confirm(`Submit attendance for ${activeEntry.subject}?`)) {
            await supabaseService.saveAttendance(
                students.map(s => ({ studentId: s.uid, present: !!recs[s.uid] })),
                new Date().toISOString().split('T')[0],
                activeEntry.subject
            );
            alert("Attendance successfully recorded.");
            setRecs({});
        }
    };

    return (
        <Card header={<h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Mark Attendance</h3>}>
            {loading ? (
                <div className="py-10 text-center"><i className="fas fa-circle-notch fa-spin text-indigo-500"></i></div>
            ) : activeEntry ? (
                <>
                    <div className="mb-6 p-5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-3xl animate-in fade-in duration-500">
                        <div className="flex items-center gap-3 mb-1">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Live Session Active</span>
                        </div>
                        <h4 className="text-xl font-black text-slate-800 dark:text-slate-100 leading-tight">{activeEntry.subject}</h4>
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-tight">
                            <i className="fas fa-clock mr-1.5"></i>{activeEntry.startTime} — {activeEntry.endTime}
                        </p>
                    </div>

                    <div className="space-y-2 max-h-80 overflow-y-auto mb-6 pr-2 custom-scrollbar">
                        {students.map(s => (
                            <div 
                                key={s.uid} 
                                onClick={() => setRecs(p => ({...p, [s.uid]: !p[s.uid]}))} 
                                className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between transition-all active:scale-95 ${
                                    recs[s.uid] 
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 shadow-sm' 
                                    : 'bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 hover:border-slate-300'
                                }`}
                            >
                                <div>
                                    <p className="text-xs font-black text-slate-800 dark:text-slate-200">{s.name}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{s.rollNo}</p>
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    recs[s.uid] ? 'bg-emerald-500 border-emerald-500' : 'border-slate-200 dark:border-slate-600'
                                }`}>
                                    {recs[s.uid] && <i className="fas fa-check text-[10px] text-white"></i>}
                                </div>
                            </div>
                        ))}
                    </div>
                    <Button onClick={handleCommit} className="w-full !bg-emerald-600 !shadow-emerald-100">
                        <i className="fas fa-cloud-upload-alt"></i> Commit Session Records
                    </Button>
                </>
            ) : (
                <div className="py-12 px-6 text-center bg-slate-50 dark:bg-slate-900/40 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-500">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                        <i className="fas fa-clock text-2xl"></i>
                    </div>
                    <h5 className="font-black text-slate-800 dark:text-slate-200 text-lg mb-1">No Active Session</h5>
                    <p className="text-sm text-slate-400 dark:text-slate-500 leading-relaxed font-medium">
                        Attendance can only be marked during ongoing lecture hours. Please check the timetable.
                    </p>
                </div>
            )}
        </Card>
    );
};

const ManageNoticesWidget: React.FC<{ classId: string }> = ({ classId }) => {
    const [t, setT] = useState(''); const [c, setC] = useState('');
    return (
        <Card header={<h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Post Notice</h3>}>
            <form onSubmit={async e => { e.preventDefault(); await supabaseService.createNotice(t, c, classId); setT(''); setC(''); alert("Posted."); }} className="space-y-4">
                <Input placeholder="Headline" value={t} onChange={e => setT(e.target.value)} required />
                <Textarea placeholder="Details..." value={c} onChange={e => setC(e.target.value)} rows={3} required />
                <Button type="submit" className="w-full">Broadcast</Button>
            </form>
        </Card>
    );
};

// ===================================================================================
// 10. APP ROOT
// ===================================================================================

const AppContent = () => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#F8FAFC] dark:bg-slate-950 transition-colors">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center animate-bounce shadow-xl shadow-indigo-500/20">
            <i className="fas fa-graduation-cap text-white text-4xl"></i>
        </div>
    </div>
  );
  if (!user) return <LoginPage />;
  switch (user.role) {
    case 'admin': return <AdminDashboard />;
    case 'cr': return <CRDashboard />;
    case 'student': return <StudentDashboard />;
    default: return <LoginPage />;
  }
};

export default function App() { return (<AuthProvider><AppContent /></AuthProvider>); }

// CUSTOM CSS
const style = document.createElement('style');
style.innerHTML = `
    @media print {
        body { background: white !important; color: black !important; }
        .print\\:hidden { display: none !important; }
        .print\\:block { display: block !important; }
        .print\\:m-0 { margin: 0 !important; }
        .print\\:p-0 { padding: 0 !important; }
        .print\\:shadow-none { shadow: none !important; }
        .print\\:border-none { border: none !important; }
        table { width: 100% !important; border-collapse: collapse !important; border: 1px solid #e2e8f0 !important; }
        th, td { border: 1px solid #e2e8f0 !important; padding: 12px !important; }
        header, aside, .btn, button { display: none !important; }
    }
    .custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
    .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; }
    select {
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 1rem center;
        background-size: 1.25rem;
        padding-right: 2.5rem !important;
        width: 100%;
        padding: 0.875rem 1.25rem;
        background-color: rgb(248 250 252 / 0.5);
        border: 1px solid rgb(226 232 240);
        border-radius: 1rem;
        font-weight: 700;
        font-size: 0.875rem;
    }
    .dark select {
        background-color: rgb(30 41 59 / 0.5);
        border-color: rgb(51 65 85);
        color: rgb(241 245 249);
    }
`;
document.head.appendChild(style);
