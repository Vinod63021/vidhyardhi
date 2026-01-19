
import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import type { User, UserRole, Class, Complaint, AttendanceRecord, Notice, TimetableEntry, DayOfWeek } from './types';
import { firebaseService } from './services/firebaseService';

// ===================================================================================
// 1. AUTHENTICATION CONTEXT & HOOK
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
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loggedInUser = sessionStorage.getItem('vidhyardhi-user');
    if (loggedInUser) {
      setUser(JSON.parse(loggedInUser));
    }
    setLoading(false);
  }, []);

  const login = async (rollNo: string, password?: string) => {
    const loggedInUser = await firebaseService.login(rollNo, password);
    if (loggedInUser) {
      setUser(loggedInUser);
      sessionStorage.setItem('vidhyardhi-user', JSON.stringify(loggedInUser));
    } else {
      throw new Error('Invalid credentials');
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('vidhyardhi-user');
  };

  const value = { user, loading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


// ===================================================================================
// 2. HELPER & LAYOUT COMPONENTS
// ===================================================================================

const Card: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 ${className}`}>
        {children}
    </div>
);

const Button: React.FC<{ onClick?: () => void, children: React.ReactNode, type?: 'button' | 'submit', className?: string, disabled?: boolean }> = ({ onClick, children, type = 'button', className, disabled }) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`bg-indigo-600 text-white font-bold py-2.5 px-5 rounded-lg hover:bg-indigo-700 active:scale-[0.98] transition duration-200 disabled:bg-slate-300 disabled:cursor-not-allowed disabled:transform-none shadow-sm ${className}`}
    >
        {children}
    </button>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input
        {...props}
        className={`w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900 placeholder:text-slate-400 transition-all ${props.className}`}
    />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
    <select
        {...props}
        className={`w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900 transition-all ${props.className}`}
    >
        {props.children}
    </select>
);

const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
    <textarea
        {...props}
        className={`w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900 placeholder:text-slate-400 transition-all ${props.className}`}
    />
);

const PageLayout: React.FC<{ title: string; user: User; onLogout: () => void; children: React.ReactNode }> = ({ title, user, onLogout, children }) => {
    const getRoleBadgeColor = (role: UserRole) => {
        switch (role) {
            case 'admin': return 'bg-rose-500';
            case 'cr': return 'bg-amber-500';
            case 'student': return 'bg-emerald-500';
        }
    };
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                         <i className="fas fa-graduation-cap text-indigo-600 text-2xl"></i>
                         <h1 className="text-2xl font-black text-indigo-700 tracking-tight">Vidhyardhi</h1>
                    </div>
                    <div className="flex items-center space-x-6">
                        <div className="hidden sm:block text-right">
                           <p className="font-bold text-slate-800 leading-tight">{user.name}</p>
                           <span className={`text-[10px] font-black uppercase tracking-wider text-white px-2 py-0.5 rounded-full ${getRoleBadgeColor(user.role)}`}>{user.role}</span>
                        </div>
                        <button 
                            onClick={onLogout} 
                            className="flex items-center space-x-2 text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-lg font-bold transition duration-200"
                        >
                           <i className="fas fa-sign-out-alt"></i> 
                           <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </div>
            </header>
            <main className="container mx-auto p-4 md:p-8">
                <div className="flex flex-col mb-8">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2">{title}</h2>
                    <div className="h-1.5 w-24 bg-indigo-600 rounded-full"></div>
                </div>
                {children}
            </main>
        </div>
    );
};


// ===================================================================================
// 3. PAGE & DASHBOARD COMPONENTS
// ===================================================================================

// --------------------------------- LOGIN PAGE ------------------------------------
const LoginPage = () => {
    const [rollNo, setRollNo] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(rollNo, password);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4">
            <div className="w-full max-w-md p-10 space-y-8 bg-white rounded-2xl shadow-xl border border-slate-200">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-100 mb-4">
                         <i className="fas fa-graduation-cap text-indigo-600 text-3xl"></i>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Vidhyardhi</h1>
                    <p className="mt-2 text-slate-500 font-medium italic">Your Academic Journey, Simplified.</p>
                </div>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    {error && <div className="text-rose-600 bg-rose-50 border border-rose-200 p-4 rounded-xl text-sm font-semibold text-center animate-pulse">{error}</div>}
                    <div>
                        <label htmlFor="rollNo" className="text-sm font-bold text-slate-700 block mb-2">Roll Number / ID</label>
                        <Input
                            id="rollNo"
                            type="text"
                            value={rollNo}
                            onChange={(e) => setRollNo(e.target.value)}
                            placeholder="e.g., 21CSD001 or au"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="password-login" className="text-sm font-bold text-slate-700 block mb-2">Password</label>
                        <Input
                            id="password-login"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <div>
                        <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-lg py-4" disabled={loading}>
                            {loading ? <i className="fas fa-circle-notch fa-spin mr-2"></i> : 'Login to Dashboard'}
                        </Button>
                    </div>
                </form>
                 <div className="text-center">
                    <p className="text-xs text-slate-400 font-medium px-6">Students are added by Class Representatives. Contact your CR if you don't have an account.</p>
                 </div>
            </div>
        </div>
    );
};

// --------------------------------- ADMIN DASHBOARD ---------------------------------
const AdminDashboard = () => {
    const { user, logout } = useAuth();
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedClassForSchedule, setSelectedClassForSchedule] = useState<Class | null>(null);

    const fetchClasses = useCallback(async () => {
        const classList = await firebaseService.getClasses();
        setClasses(classList);
    }, []);

    useEffect(() => {
        fetchClasses();
    }, [fetchClasses]);

    if (!user) return null;

    return (
        <PageLayout title="Admin Command Center" user={user} onLogout={logout}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ManageCRs classes={classes} onCRAdded={() => {}}/>
                <ManageClasses 
                    classes={classes} 
                    onClassAdded={fetchClasses} 
                    onManageSchedule={(c) => setSelectedClassForSchedule(c)}
                />
                {selectedClassForSchedule && (
                    <div className="lg:col-span-2">
                        <ManageSchedule 
                            selectedClass={selectedClassForSchedule} 
                            onClose={() => setSelectedClassForSchedule(null)}
                        />
                    </div>
                )}
                <ViewComplaints/>
            </div>
        </PageLayout>
    );
};

const ManageCRs: React.FC<{ classes: Class[], onCRAdded: () => void }> = ({ classes, onCRAdded }) => {
    const [rollNo, setRollNo] = useState('');
    const [name, setName] = useState('');
    const [classId, setClassId] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        if (!classId) {
            setMessage({type: 'error', text: 'Please select a target class.'});
            return;
        }
        try {
            await firebaseService.createCR(rollNo, name, classId, password);
            setMessage({type: 'success', text: `Success: Representative '${name}' registered.`});
            setRollNo('');
            setName('');
            setClassId('');
            setPassword('');
            onCRAdded();
        } catch (err) {
            setMessage({type: 'error', text: err instanceof Error ? err.message : 'Registry Failed.'});
        }
    };

    return (
        <Card>
            <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                    <i className="fas fa-user-shield text-xl"></i>
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Onboard Class Representatives</h3>
            </div>
             {message && <div className={`p-4 rounded-xl mb-6 text-sm font-bold border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>{message.text}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input placeholder="Registry Roll Number" value={rollNo} onChange={e => setRollNo(e.target.value)} required/>
                <Input placeholder="Full Legal Name" value={name} onChange={e => setName(e.target.value)} required/>
                <Input type="password" placeholder="System Access Password" value={password} onChange={e => setPassword(e.target.value)} required />
                <Select value={classId} onChange={e => setClassId(e.target.value)} required>
                    <option value="" className="text-slate-400">-- Select Class/Section --</option>
                    {classes.map(c => <option key={c.id} value={c.id} className="text-slate-900">{c.name}</option>)}
                </Select>
                <Button type="submit" className="w-full mt-2">Create Representative Account</Button>
            </form>
        </Card>
    );
};


const ManageClasses: React.FC<{ classes: Class[], onClassAdded: () => void, onManageSchedule: (c: Class) => void }> = ({ classes, onClassAdded, onManageSchedule }) => {
    const [newClassName, setNewClassName] = useState('');
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    const handleAddClass = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        try {
            await firebaseService.addClass(newClassName);
            setMessage({type: 'success', text: `Class '${newClassName}' created.`});
            setNewClassName('');
            onClassAdded();
        } catch(err) {
            setMessage({type: 'error', text: err instanceof Error ? err.message : 'Creation failed.'});
        }
    }

    return (
        <Card>
            <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                    <i className="fas fa-layer-group text-xl"></i>
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Classes & Sections</h3>
            </div>
             <form onSubmit={handleAddClass} className="flex gap-3 mb-6">
                <Input placeholder="Class Name (e.g., EEE-A)" value={newClassName} onChange={e => setNewClassName(e.target.value)} required/>
                <Button type="submit" className="whitespace-nowrap">Register</Button>
            </form>
            {message && <p className={`p-3 rounded-xl mb-4 text-xs font-bold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>{message.text}</p>}
            <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto pr-1">
                {classes.map(c => (
                    <div key={c.id} className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl flex items-center justify-between group hover:border-indigo-300 transition-colors">
                        <span className="font-bold text-slate-700">{c.name}</span>
                        <button 
                            onClick={() => onManageSchedule(c)}
                            className="bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg hover:bg-indigo-600 hover:text-white transition"
                        >
                            <i className="fas fa-calendar-alt mr-1"></i> Schedule
                        </button>
                    </div>
                ))}
            </div>
        </Card>
    );
}

const ManageSchedule: React.FC<{ selectedClass: Class, onClose: () => void }> = ({ selectedClass, onClose }) => {
    const [entries, setEntries] = useState<TimetableEntry[]>([]);
    const [day, setDay] = useState<DayOfWeek>('Monday');
    const [subject, setSubject] = useState('');
    const [faculty, setFaculty] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');
    const [loading, setLoading] = useState(false);

    const fetchSchedule = useCallback(async () => {
        const data = await firebaseService.getTimetableForClass(selectedClass.id);
        setEntries(data);
    }, [selectedClass.id]);

    useEffect(() => {
        fetchSchedule();
    }, [fetchSchedule]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await firebaseService.addTimetableEntry({
                classId: selectedClass.id,
                day,
                subject,
                faculty,
                startTime,
                endTime
            });
            setSubject('');
            setFaculty('');
            fetchSchedule();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if(confirm("Delete this session?")) {
            await firebaseService.deleteTimetableEntry(id);
            fetchSchedule();
        }
    };

    const days: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return (
        <Card className="border-t-4 border-t-indigo-600">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                        <i className="fas fa-clock text-xl"></i>
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">Time Table: {selectedClass.name}</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Assign Faculty & Timings</p>
                    </div>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-rose-600 transition">
                    <i className="fas fa-times-circle text-2xl"></i>
                </button>
            </div>

            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Day</label>
                    <Select value={day} onChange={e => setDay(e.target.value as DayOfWeek)}>
                        {days.map(d => <option key={d} value={d}>{d}</option>)}
                    </Select>
                </div>
                <div className="space-y-1 lg:col-span-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Subject</label>
                    <Input placeholder="e.g., Mathematics" value={subject} onChange={e => setSubject(e.target.value)} required />
                </div>
                <div className="space-y-1 lg:col-span-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Faculty</label>
                    <Input placeholder="e.g., Prof. Sharma" value={faculty} onChange={e => setFaculty(e.target.value)} required />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">From</label>
                    <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">To</label>
                    <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                </div>
                <div className="md:col-span-3 lg:col-span-6 flex justify-end pt-2">
                    <Button type="submit" disabled={loading} className="w-full md:w-auto px-10">Add Session</Button>
                </div>
            </form>

            <div className="space-y-8">
                {days.map(d => {
                    const dayEntries = entries.filter(e => e.day === d);
                    if(dayEntries.length === 0) return null;
                    return (
                        <div key={d}>
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4 flex items-center">
                                <i className="far fa-calendar-check mr-2 text-indigo-500"></i> {d}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {dayEntries.map(entry => (
                                    <div key={entry.id} className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition group">
                                        <div className="flex items-start space-x-3">
                                            <div className="bg-indigo-50 text-indigo-600 p-2 rounded-xl text-xs font-black">
                                                {entry.startTime}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800 text-sm leading-tight">{entry.subject}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{entry.faculty}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDelete(entry.id)} className="text-rose-400 opacity-0 group-hover:opacity-100 transition hover:text-rose-600 p-2">
                                            <i className="fas fa-trash-alt"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};

const ViewComplaints: React.FC = () => {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchComplaints = useCallback(async () => {
        setLoading(true);
        const data = await firebaseService.getComplaints();
        setComplaints(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchComplaints();
    }, [fetchComplaints]);

    const handleResolve = async (complaintId: string) => {
        try {
            await firebaseService.updateComplaintStatus(complaintId, 'resolved');
            fetchComplaints();
        } catch (error) {
            console.error("Failed to resolve complaint:", error);
            alert("Could not update complaint status.");
        }
    };

    return (
        <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                        <i className="fas fa-exclamation-circle text-xl"></i>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Grievance Portal</h3>
                </div>
                <button onClick={fetchComplaints} className="text-indigo-600 font-bold text-sm hover:underline">
                    <i className="fas fa-sync-alt mr-1"></i> Refresh
                </button>
            </div>
            {loading ? <p className="text-slate-500 italic">Processing grievances...</p> : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-3">
                    {complaints.length > 0 ? (
                        complaints.map(c => (
                            <div key={c.id} className={`p-6 rounded-2xl border transition-all duration-300 ${c.status === 'pending' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                <div className="flex flex-col md:flex-row md:justify-between items-start">
                                    <div className="mb-4 md:mb-0">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <span className="font-black text-slate-800 text-lg uppercase">{c.studentName}</span>
                                            <span className="text-slate-400 text-sm font-medium">({c.studentId})</span>
                                        </div>
                                        <p className="text-slate-700 leading-relaxed font-medium bg-white/50 p-4 rounded-xl border border-black/5">{c.content}</p>
                                    </div>
                                    <div className="flex flex-col items-end space-y-2 flex-shrink-0 ml-0 md:ml-6">
                                         <span className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-full shadow-sm ${c.status === 'pending' ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-900'}`}>{c.status}</span>
                                        <p className="text-xs text-slate-400 font-bold mt-1"><i className="far fa-clock mr-1"></i> {new Date(c.submittedAt).toLocaleString()}</p>
                                    </div>
                                </div>
                                {c.status === 'pending' && (
                                    <div className="mt-6 flex justify-end">
                                        <button 
                                            onClick={() => handleResolve(c.id)} 
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2 rounded-xl text-sm transition shadow-sm hover:scale-105"
                                        >
                                            <i className="fas fa-check-circle mr-2"></i>Mark Resolved
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                         <div className="text-center text-slate-300 py-16 flex flex-col items-center">
                            <i className="fas fa-check-double fa-4x mb-4 opacity-20"></i>
                            <p className="text-xl font-bold">Zero Pending Grievances</p>
                            <p className="text-sm font-medium">The college is running smoothly.</p>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
}

// --------------------------------- CR DASHBOARD ------------------------------------
const CRDashboard = () => {
    const { user, logout } = useAuth();
    const [className, setClassName] = useState('');
    const [students, setStudents] = useState<User[]>([]);

    const fetchStudents = useCallback(async () => {
        if(user) {
            const studentList = await firebaseService.getStudentsByClass(user.classId);
            setStudents(studentList);
        }
    }, [user]);

    useEffect(() => {
        if(user) {
            firebaseService.getClassById(user.classId).then(c => {
                if(c) setClassName(c.name);
            });
            fetchStudents();
        }
    }, [user, fetchStudents]);

    const handleDeleteStudent = async (studentId: string) => {
        if (window.confirm('Delete Student Record? This action is permanent.')) {
            try {
                await firebaseService.deleteStudent(studentId);
                fetchStudents();
            } catch (error) {
                console.error("Failed to delete student:", error);
                alert("Operation failed.");
            }
        }
    };

    if (!user) return null;

    return (
        <PageLayout title={`Control: ${className}`} user={user} onLogout={logout}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="space-y-8">
                    <ManageStudents cr={user} onStudentAdded={fetchStudents} />
                    <StudentRoster students={students} onDelete={handleDeleteStudent} />
                    <TimetableView classId={user.classId} />
                </div>
                 <div className="space-y-8">
                    <AttendanceModule students={students} classId={user.classId} />
                    <ManageNotices classId={user.classId} />
                </div>
            </div>
        </PageLayout>
    );
};

const TimetableView: React.FC<{ classId: string }> = ({ classId }) => {
    const [entries, setEntries] = useState<TimetableEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        firebaseService.getTimetableForClass(classId).then(data => {
            setEntries(data);
            setLoading(false);
        });
    }, [classId]);

    const days: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[new Date().getDay() - 1] || 'Monday';

    return (
        <Card>
            <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                    <i className="fas fa-calendar-day text-xl"></i>
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Class Schedule</h3>
            </div>
            {loading ? <p className="text-slate-400 italic">Syncing schedule...</p> : (
                <div className="space-y-4">
                    {days.map(d => {
                        const dayEntries = entries.filter(e => e.day === d);
                        if(dayEntries.length === 0) return null;
                        const isToday = d === currentDay;
                        return (
                            <div key={d} className={`p-4 rounded-2xl border transition-all ${isToday ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}>
                                <h4 className={`text-[10px] font-black uppercase tracking-widest mb-3 flex items-center ${isToday ? 'text-indigo-600' : 'text-slate-400'}`}>
                                    {d} {isToday && <span className="ml-2 bg-indigo-600 text-white px-2 py-0.5 rounded-full text-[8px]">Today</span>}
                                </h4>
                                <div className="space-y-2">
                                    {dayEntries.map(e => (
                                        <div key={e.id} className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-black/5">
                                            <div className="flex items-center space-x-3">
                                                <span className="text-[10px] font-black text-slate-400">{e.startTime}</span>
                                                <div className="h-6 w-px bg-slate-200"></div>
                                                <div>
                                                    <p className="font-black text-slate-800 text-xs leading-none mb-1">{e.subject}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase">{e.faculty}</p>
                                                </div>
                                            </div>
                                            <span className="text-[9px] font-black text-slate-300">{e.endTime}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                    {entries.length === 0 && (
                        <div className="text-center py-8 opacity-40">
                            <i className="far fa-calendar-times fa-3x mb-2"></i>
                            <p className="text-sm font-bold">No schedule uploaded.</p>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
}

const AttendanceModule: React.FC<{ students: User[], classId: string }> = ({ students, classId }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
    const [attendanceStatus, setAttendanceStatus] = useState<{ [key: string]: boolean }>({});
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [isTimingValid, setIsTimingValid] = useState(true);

    useEffect(() => {
        firebaseService.getTimetableForClass(classId).then(data => {
            setTimetableEntries(data);
        });
    }, [classId]);

    // Validation logic for timing constraints
    useEffect(() => {
        if (!selectedSubject) {
            setIsTimingValid(true);
            return;
        }

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const days: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDay = days[now.getDay() - 1];

        // 1. Must be the current date
        if (selectedDate !== todayStr) {
            setIsTimingValid(false);
            return;
        }

        // 2. Must find subject on current day in timetable
        const dayEntry = timetableEntries.find(e => e.day === currentDay && e.subject === selectedSubject);
        if (!dayEntry) {
            setIsTimingValid(false);
            return;
        }

        // 3. Current time check
        const currentTimeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
        if (currentTimeStr < dayEntry.startTime || currentTimeStr > dayEntry.endTime) {
            setIsTimingValid(false);
            return;
        }

        setIsTimingValid(true);
    }, [selectedSubject, selectedDate, timetableEntries]);

    useEffect(() => {
        const initialStatus = students.reduce((acc, student) => {
            acc[student.uid] = false;
            return acc;
        }, {} as { [key: string]: boolean });
        setAttendanceStatus(initialStatus);
        setMessage(null);
    }, [students, selectedDate, selectedSubject]);

    const handleStatusChange = (studentId: string, isPresent: boolean) => {
        if (!isTimingValid) return;
        setAttendanceStatus(prev => ({ ...prev, [studentId]: isPresent }));
    };

    const markAll = (present: boolean) => {
        if (!isTimingValid) return;
        const newStatus = students.reduce((acc, student) => {
            acc[student.uid] = present;
            return acc;
        }, {} as { [key: string]: boolean });
        setAttendanceStatus(newStatus);
    };

    const handleSave = async () => {
        if (!selectedSubject) {
            setMessage({ type: 'error', text: 'Select a subject first.' });
            return;
        }
        if (!isTimingValid) {
            setMessage({ type: 'error', text: 'Attendance can only be marked during the scheduled class time.' });
            return;
        }

        setLoading(true);
        setMessage(null);
        try {
            const records = Object.entries(attendanceStatus).map(([studentId, present]) => ({
                studentId,
                present: present as boolean,
            }));
            await firebaseService.saveAttendance(records, selectedDate, selectedSubject);
            setMessage({ type: 'success', text: `Success: Logs for ${selectedSubject} finalized.` });
        } catch (err) {
            setMessage({ type: 'error', text: 'Logging error.' });
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = async () => {
        const data = await firebaseService.getAllAttendanceForClass(classId);
        if (data.length === 0) {
            alert("No attendance data to export.");
            return;
        }

        const csvContent = [
            ["Date", "Roll Number", "Student Name", "Subject", "Status"],
            ...data.map(a => [a.date, a.rollNo, a.studentName, a.subject, a.present ? "Present" : "Absent"])
        ].map(e => e.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Attendance_Export_${classId}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const availableSubjects = Array.from(new Set(timetableEntries.map(item => item.subject)));

    return (
        <Card>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                        <i className="fas fa-clipboard-check text-xl"></i>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Subject Attendance</h3>
                </div>
                <button 
                    onClick={handleExportExcel}
                    className="text-indigo-600 hover:text-indigo-800 transition p-2 bg-indigo-50 rounded-xl flex items-center space-x-2"
                    title="Export All to Excel"
                >
                    <i className="fas fa-file-excel text-lg"></i>
                    <span className="text-[10px] font-black uppercase">Export</span>
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                    <label htmlFor="attendance-date" className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Session Date</label>
                    <Input
                        type="date"
                        id="attendance-date"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                    />
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                    <label htmlFor="attendance-subject" className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Target Subject</label>
                    <Select 
                        id="attendance-subject" 
                        value={selectedSubject} 
                        onChange={e => setSelectedSubject(e.target.value)}
                        required
                    >
                        <option value="">-- Select Subject --</option>
                        {availableSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                        {availableSubjects.length === 0 && <option disabled>Update Timetable First</option>}
                    </Select>
                </div>
            </div>

            {!isTimingValid && selectedSubject && (
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl mb-6 text-rose-700 flex items-start space-x-3 animate-pulse">
                    <i className="fas fa-exclamation-triangle mt-1"></i>
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest">Timing Violation</p>
                        <p className="text-xs font-medium">You can only mark attendance during the scheduled class hours today.</p>
                    </div>
                </div>
            )}

            {students.length > 0 && selectedSubject && isTimingValid && (
                 <div className="grid grid-cols-2 gap-3 mb-6">
                    <button 
                        onClick={() => markAll(true)} 
                        className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold py-2 rounded-xl text-xs hover:bg-emerald-100 transition"
                    >
                        Mark All Present
                    </button>
                    <button 
                        onClick={() => markAll(false)} 
                        className="bg-rose-50 text-rose-600 border border-rose-100 font-bold py-2 rounded-xl text-xs hover:bg-rose-100 transition"
                    >
                        Mark All Absent
                    </button>
                </div>
            )}

            {!selectedSubject ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <i className="fas fa-hand-pointer text-slate-300 text-3xl mb-2"></i>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pick a subject to start roll call</p>
                </div>
            ) : (
                <div className={`space-y-2 max-h-72 overflow-y-auto pr-2 border-t border-slate-100 py-4 ${!isTimingValid ? 'opacity-50 pointer-events-none' : ''}`}>
                    {students.length > 0 ? (
                        students.sort((a,b) => a.rollNo.localeCompare(b.rollNo)).map(student => (
                            <div key={student.uid} className={`flex items-center justify-between p-4 rounded-2xl transition-colors border ${attendanceStatus[student.uid] ? 'bg-emerald-50/30 border-emerald-100' : 'bg-slate-50 border-slate-200'}`}>
                                <div className="flex items-center space-x-3">
                                    <div className={`w-2 h-2 rounded-full ${attendanceStatus[student.uid] ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-400'}`}></div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">{student.name}</p>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{student.rollNo}</p>
                                    </div>
                                </div>
                                <label className="flex items-center cursor-pointer">
                                    <span className={`mr-3 font-black text-[10px] uppercase tracking-widest transition-colors ${attendanceStatus[student.uid] ? 'text-emerald-600' : 'text-rose-400'}`}>
                                        {attendanceStatus[student.uid] ? 'Present' : 'Absent'}
                                    </span>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={attendanceStatus[student.uid] || false}
                                            onChange={(e) => handleStatusChange(student.uid, e.target.checked)}
                                            id={`toggle-${student.uid}`}
                                            disabled={!isTimingValid}
                                        />
                                        <div className="w-12 h-6 bg-slate-200 rounded-full peer-checked:bg-emerald-500 transition-colors border border-slate-300"></div>
                                        <div className="absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-transform duration-300 shadow-sm peer-checked:translate-x-6"></div>
                                    </div>
                                </label>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-slate-300 py-10 italic text-sm">
                            Class roster empty.
                        </div>
                    )}
                </div>
            )}

             {students.length > 0 && selectedSubject && (
                <div className="mt-6">
                    {message && <div className={`p-3 rounded-xl mb-4 text-xs font-black text-center border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>{message.text}</div>}
                    <Button 
                        onClick={handleSave} 
                        disabled={loading || students.length === 0 || !isTimingValid} 
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                    >
                        {loading ? 'Processing...' : `Save ${selectedSubject} Attendance`}
                    </Button>
                </div>
            )}
        </Card>
    );
}

const ManageStudents: React.FC<{ cr: User, onStudentAdded: () => void }> = ({ cr, onStudentAdded }) => {
    const [rollNo, setRollNo] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        try {
            await firebaseService.createStudent(rollNo, name, cr, password);
            setMessage({type: 'success', text: `Student '${name}' enrolled.`});
            setRollNo('');
            setName('');
            setPassword('');
            onStudentAdded();
        } catch (err) {
            setMessage({type: 'error', text: err instanceof Error ? err.message : 'Enrollment error.'});
        }
    };

    return (
        <Card>
            <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                    <i className="fas fa-user-plus text-xl"></i>
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Enroll Student</h3>
            </div>
            {message && <div className={`p-3 rounded-xl mb-4 text-xs font-bold border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>{message.text}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input placeholder="Official Roll Number" value={rollNo} onChange={e => setRollNo(e.target.value)} required/>
                <Input placeholder="Student Full Name" value={name} onChange={e => setName(e.target.value)} required/>
                <Input type="password" placeholder="Assigned Default Password" value={password} onChange={e => setPassword(e.target.value)} required />
                <Button type="submit" className="w-full">Register Student</Button>
            </form>
        </Card>
    );
};

const StudentRoster: React.FC<{ students: User[], onDelete: (studentId: string) => void }> = ({ students, onDelete }) => {
    return (
        <Card>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                        <i className="fas fa-id-card text-xl"></i>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Class Roster</h3>
                </div>
                <span className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">{students.length} Total</span>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {students.length > 0 ? (
                    students.sort((a, b) => a.rollNo.localeCompare(b.rollNo)).map(student => (
                        <div key={student.uid} className="flex items-center justify-between bg-slate-50 border border-slate-200 p-4 rounded-2xl hover:border-indigo-200 transition-colors group">
                            <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black">
                                    {student.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-black text-slate-800 leading-none mb-1">{student.name}</p>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{student.rollNo}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => onDelete(student.uid)}
                                className="text-rose-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                                aria-label={`Remove ${student.name}`}
                            >
                                <i className="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    ))
                ) : (
                     <div className="text-center text-slate-300 py-12 flex flex-col items-center">
                        <i className="fas fa-users-slash fa-3x mb-3 opacity-20"></i>
                        <p className="font-bold">No Records Found</p>
                    </div>
                )}
            </div>
        </Card>
    );
};


const ManageNotices: React.FC<{ classId: string }> = ({ classId }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchNotices = useCallback(async ( ) => {
        const classNotices = await firebaseService.getNoticesForClass(classId);
        setNotices(classNotices);
    }, [classId]);

    useEffect(() => {
        fetchNotices();
    }, [fetchNotices]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            await firebaseService.createNotice(title, content, classId);
            setMessage({ type: 'success', text: 'Bulletin updated successfully.' });
            setTitle('');
            setContent('');
            fetchNotices();
        } catch (error) {
            setMessage({ type: 'error', text: 'Publication error.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                    <i className="fas fa-bullhorn text-xl"></i>
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Post Announcement</h3>
            </div>
            {message && <p className={`p-3 rounded-xl mb-4 text-xs font-bold border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>{message.text}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    placeholder="Announcement Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />
                <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={3}
                    placeholder="Brief description of the notice..."
                    required
                />
                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? 'Publishing...' : 'Publish Announcement'}
                </Button>
            </form>
            <div className="mt-8 border-t border-slate-100 pt-6">
                <h4 className="font-black text-slate-800 text-sm mb-4 tracking-tight">Recent Activity</h4>
                <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                    {notices.length > 0 ? (
                        notices.map(notice => (
                            <div key={notice.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                                <p className="font-black text-slate-800 mb-1">{notice.title}</p>
                                <p className="text-xs text-slate-600 leading-relaxed font-medium line-clamp-2">{notice.content}</p>
                                <p className="text-[9px] text-slate-400 font-black mt-3 text-right uppercase tracking-widest">{new Date(notice.postedAt).toLocaleDateString()}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-slate-400 font-bold text-center italic py-4">Bulletin board empty.</p>
                    )}
                </div>
            </div>
        </Card>
    );
};


// --------------------------------- STUDENT DASHBOARD -------------------------------
const StudentDashboard = () => {
    const { user, logout } = useAuth();
    const [className, setClassName] = useState('');
    const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
    const [activeAlert, setActiveAlert] = useState<TimetableEntry | null>(null);
    const notifiedRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if(user) {
            firebaseService.getClassById(user.classId).then(c => {
                if(c) setClassName(c.name);
            });
            firebaseService.getTimetableForClass(user.classId).then(data => {
                setTimetable(data);
            });
        }
    }, [user]);

    // Background Scheduler for notifications
    useEffect(() => {
        if (!timetable.length) return;

        const checkSchedule = () => {
            const now = new Date();
            const days: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const todayName = days[now.getDay() - 1];
            
            if (!todayName) return; // Sunday check

            const todayClasses = timetable.filter(e => e.day === todayName);
            const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
            const dateStr = now.toISOString().split('T')[0];

            todayClasses.forEach(session => {
                const [h, m] = session.startTime.split(':').map(Number);
                const sessionStartMinutes = h * 60 + m;
                const minutesUntilStart = sessionStartMinutes - currentTotalMinutes;
                
                const uniqueKey = `${dateStr}-${session.id}`;

                // Trigger exactly at 15 minutes before
                if (minutesUntilStart === 15 && !notifiedRef.current.has(uniqueKey)) {
                    setActiveAlert(session);
                    notifiedRef.current.add(uniqueKey);
                    
                    // Auto-hide alert after 30 seconds to avoid clutter
                    setTimeout(() => setActiveAlert(prev => prev?.id === session.id ? null : prev), 30000);
                }
            });
        };

        const interval = setInterval(checkSchedule, 60000); // Check every minute
        checkSchedule(); // Immediate initial check

        return () => clearInterval(interval);
    }, [timetable]);

    if (!user) return null;

    return (
        <PageLayout title={`Student: ${className}`} user={user} onLogout={logout}>
            {/* Real-time Notification Overlay */}
            {activeAlert && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4 animate-in fade-in zoom-in slide-in-from-top-10 duration-500">
                    <div className="bg-indigo-600 text-white rounded-2xl shadow-2xl p-5 border border-indigo-400 flex items-start space-x-4">
                        <div className="bg-white/20 p-3 rounded-xl animate-pulse">
                            <i className="fas fa-clock text-xl"></i>
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Upcoming Class (In 15m)</p>
                            <h4 className="font-black text-lg leading-tight mb-1">{activeAlert.subject}</h4>
                            <p className="text-xs font-bold opacity-90">{activeAlert.faculty} • Starts {activeAlert.startTime}</p>
                        </div>
                        <button onClick={() => setActiveAlert(null)} className="text-white/50 hover:text-white transition">
                            <i className="fas fa-times-circle text-lg"></i>
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="space-y-8 lg:col-span-1">
                    <AttendanceTracker student={user} />
                    <TimetableView classId={user.classId} />
                </div>
                <ViewClassContent classId={user.classId} />
                <SubmitComplaint student={user} />
            </div>
        </PageLayout>
    );
};

const AttendanceTracker: React.FC<{ student: User }> = ({ student }) => {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAttendance = async () => {
            setLoading(true);
            try {
                const data = await firebaseService.getAttendanceForStudent(student.uid);
                setRecords(data);
            } catch (error) {
                console.error("Failed to fetch attendance:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAttendance();
    }, [student.uid]);

    const totalDays = records.length;
    const presentDays = records.filter(r => r.present).length;
    const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    const getBarColor = (p: number) => {
        if (p >= 75) return 'bg-emerald-500';
        if (p >= 50) return 'bg-amber-500';
        return 'bg-rose-500';
    };
    
    const getTextColor = (p: number) => {
        if (p >= 75) return 'text-emerald-600';
        if (p >= 50) return 'text-amber-600';
        return 'text-rose-600';
    };

    return (
        <Card>
            <div className="flex items-center space-x-3 mb-8">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                    <i className="fas fa-chart-line text-xl"></i>
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Attendance Summary</h3>
            </div>
            {loading ? (
                 <div className="text-center text-slate-400 py-12">
                    <i className="fas fa-circle-notch fa-spin fa-2x mb-3 text-indigo-200"></i>
                    <p className="font-bold text-sm uppercase tracking-widest">Calculating Stats</p>
                </div>
            ) : totalDays === 0 ? (
                <div className="text-center text-slate-300 py-12 italic">
                    <i className="fas fa-calendar-minus fa-3x mb-3 opacity-20"></i>
                    <p className="font-bold">No Records Yet</p>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex flex-col items-center">
                        <div className={`text-6xl font-black mb-2 ${getTextColor(percentage)} tracking-tighter`}>
                            {percentage}%
                        </div>
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Total Progress</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden border border-slate-200 shadow-inner">
                        <div
                            className={`h-4 rounded-full transition-all duration-700 ease-out ${getBarColor(percentage)} shadow-[0_0_15px_rgba(0,0,0,0.1)]`}
                            style={{ width: `${percentage}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                        <div className="text-center flex-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Attended</p>
                            <p className="text-2xl font-black text-slate-800">{presentDays}</p>
                        </div>
                        <div className="w-px h-8 bg-slate-200 mx-4"></div>
                        <div className="text-center flex-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Days</p>
                            <p className="text-2xl font-black text-slate-800">{totalDays}</p>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
};
const ViewClassContent: React.FC<{ classId: string }> = ({ classId }) => {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContent = async () => {
            setLoading(true);
            try {
                const noticeData = await firebaseService.getNoticesForClass(classId);
                setNotices(noticeData);
            } catch (error) {
                console.error("Failed to fetch class content:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchContent();
    }, [classId]);

    return (
        <Card>
            <div className="flex items-center space-x-3 mb-8">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                    <i className="fas fa-bullhorn text-xl"></i>
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Class Bulletins</h3>
            </div>
            {loading ? (
                <div className="text-center py-12">
                    <i className="fas fa-spinner fa-spin fa-2x mb-3 text-indigo-300"></i>
                </div>
            ) : (
                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-3 scrollbar-thin">
                    {notices.length > 0 ? (
                        notices.map(notice => (
                            <div key={notice.id} className="bg-white p-5 rounded-2xl border-l-4 border-indigo-500 shadow-sm border border-slate-100 hover:shadow-md transition">
                                <h4 className="font-black text-slate-900 mb-2 leading-tight uppercase text-sm tracking-tight">{notice.title}</h4>
                                <p className="text-sm text-slate-600 leading-relaxed font-medium bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">{notice.content}</p>
                                <div className="flex justify-between items-center mt-4">
                                     <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Notice from CR</span>
                                     <p className="text-[9px] text-slate-400 font-bold italic">{new Date(notice.postedAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-slate-300 py-16 flex flex-col items-center">
                            <i className="far fa-bell-slash fa-3x mb-4 opacity-20"></i>
                            <p className="font-bold text-slate-400">No active notices.</p>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
};

const SubmitComplaint: React.FC<{student: User}> = ({student}) => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            await firebaseService.submitComplaint(student, content);
            setMessage({ type: 'success', text: 'Grievance recorded successfully.' });
            setContent('');
        } catch (error) {
            setMessage({ type: 'error', text: 'Transmission failed.' });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card>
            <div className="flex items-center space-x-3 mb-8">
                <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                    <i className="fas fa-comment-dots text-xl"></i>
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Report Issue</h3>
            </div>
            {message && <div className={`p-4 rounded-2xl mb-6 text-xs font-black text-center border animate-in fade-in slide-in-from-top-4 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>{message.text}</div>}
            <form onSubmit={handleSubmit} className="space-y-6">
                 <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">Incident Description</label>
                    <Textarea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        rows={5}
                        placeholder="Detail your academic or facility concerns..."
                        required
                    />
                 </div>
                <Button type="submit" disabled={loading || !content.trim()} className="w-full bg-rose-600 hover:bg-rose-700 py-4 shadow-rose-200 shadow-lg">
                    {loading ? 'Submitting...' : 'Submit Grievance'}
                </Button>
            </form>
        </Card>
    )
}


// ===================================================================================
// 4. MAIN APP COMPONENT
// ===================================================================================

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
        <div className="flex flex-col justify-center items-center min-h-screen bg-slate-50">
            <i className="fas fa-graduation-cap text-indigo-600 text-5xl mb-4 animate-bounce"></i>
            <div className="text-2xl font-black text-slate-900 animate-pulse tracking-tight">Vidhyardhi</div>
        </div>
    );
  }
  
  if (!user) {
    return <LoginPage />;
  }

  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'cr':
      return <CRDashboard />;
    case 'student':
      return <StudentDashboard />;
    default:
      return <LoginPage />;
  }
};


export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
