import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import type { User, UserRole, Class, Complaint, AttendanceRecord, Notice } from './types';
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
    // This effect simulates checking for a logged-in user on component mount
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
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        {children}
    </div>
);

const Button: React.FC<{ onClick?: () => void, children: React.ReactNode, type?: 'button' | 'submit', className?: string, disabled?: boolean }> = ({ onClick, children, type = 'button', className, disabled }) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed ${className}`}
    >
        {children}
    </button>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input
        {...props}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${props.className}`}
    />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
    <select
        {...props}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${props.className}`}
    >
        {props.children}
    </select>
);

const PageLayout: React.FC<{ title: string; user: User; onLogout: () => void; children: React.ReactNode }> = ({ title, user, onLogout, children }) => {
    const getRoleBadgeColor = (role: UserRole) => {
        switch (role) {
            case 'admin': return 'bg-red-500';
            case 'cr': return 'bg-yellow-500';
            case 'student': return 'bg-green-500';
        }
    };
    return (
        <div className="min-h-screen bg-slate-100 text-gray-800">
            <header className="bg-white shadow-md">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-blue-700">Vidhyardhi Portal</h1>
                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                           <p className="font-semibold">{user.name}</p>
                           <span className={`text-xs text-white px-2 py-0.5 rounded-full ${getRoleBadgeColor(user.role)}`}>{user.role.toUpperCase()}</span>
                        </div>
                        <Button onClick={onLogout} className="bg-red-500 hover:bg-red-600">
                           <i className="fas fa-sign-out-alt mr-2"></i> Logout
                        </Button>
                    </div>
                </div>
            </header>
            <main className="container mx-auto p-4 md:p-6">
                <h2 className="text-3xl font-bold mb-6">{title}</h2>
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
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-lg">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-blue-700">Vidhyardhi</h1>
                    <p className="mt-2 text-gray-600">Your College Portal</p>
                </div>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    {error && <p className="text-red-500 bg-red-100 p-3 rounded-lg text-center">{error}</p>}
                    <div>
                        <label htmlFor="rollNo" className="text-sm font-medium text-gray-700">Roll Number / Admin ID</label>
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
                        <label htmlFor="password-login" className="text-sm font-medium text-gray-700">Password</label>
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
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Logging in...' : 'Login'}
                        </Button>
                    </div>
                </form>
                 <p className="text-center text-xs text-gray-500">Only Admins and CRs can create accounts. Students must be added by their CR.</p>
            </div>
        </div>
    );
};

// --------------------------------- ADMIN DASHBOARD ---------------------------------
const AdminDashboard = () => {
    const { user, logout } = useAuth();
    const [classes, setClasses] = useState<Class[]>([]);

    const fetchClasses = useCallback(async () => {
        const classList = await firebaseService.getClasses();
        setClasses(classList);
    }, []);

    useEffect(() => {
        fetchClasses();
    }, [fetchClasses]);

    if (!user) return null;

    return (
        <PageLayout title="Admin Dashboard" user={user} onLogout={logout}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ManageCRs classes={classes} onCRAdded={() => {}}/>
                <ManageClasses classes={classes} onClassAdded={fetchClasses} />
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
            setMessage({type: 'error', text: 'Please select a class.'});
            return;
        }
        try {
            await firebaseService.createCR(rollNo, name, classId, password);
            setMessage({type: 'success', text: `CR '${name}' created successfully.`});
            setRollNo('');
            setName('');
            setClassId('');
            setPassword('');
            onCRAdded();
        } catch (err) {
            setMessage({type: 'error', text: err instanceof Error ? err.message : 'Failed to create CR.'});
        }
    };

    return (
        <Card>
            <h3 className="text-xl font-bold mb-4">Create CR/LR Account</h3>
             {message && <p className={`p-2 rounded-md mb-4 ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{message.text}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input placeholder="Roll Number" value={rollNo} onChange={e => setRollNo(e.target.value)} required/>
                <Input placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} required/>
                <Input type="password" placeholder="Set Password" value={password} onChange={e => setPassword(e.target.value)} required />
                <Select value={classId} onChange={e => setClassId(e.target.value)} required>
                    <option value="">-- Select Class --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                <Button type="submit">Create CR</Button>
            </form>
        </Card>
    );
};


const ManageClasses: React.FC<{ classes: Class[], onClassAdded: () => void }> = ({ classes, onClassAdded }) => {
    const [newClassName, setNewClassName] = useState('');
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    const handleAddClass = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        try {
            await firebaseService.addClass(newClassName);
            setMessage({type: 'success', text: `Class '${newClassName}' added.`});
            setNewClassName('');
            onClassAdded();
        } catch(err) {
            setMessage({type: 'error', text: err instanceof Error ? err.message : 'Failed to add class.'});
        }
    }

    return (
        <Card>
            <h3 className="text-xl font-bold mb-4">Manage Classes</h3>
             <form onSubmit={handleAddClass} className="flex gap-2 mb-4">
                <Input placeholder="New Class Name (e.g., MECH-A)" value={newClassName} onChange={e => setNewClassName(e.target.value)} required/>
                <Button type="submit">Add</Button>
            </form>
            {message && <p className={`p-2 rounded-md my-2 ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{message.text}</p>}
            <ul className="space-y-2 max-h-48 overflow-y-auto">
                {classes.map(c => <li key={c.id} className="bg-gray-100 p-2 rounded">{c.name}</li>)}
            </ul>
        </Card>
    );
}

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
            fetchComplaints(); // Re-fetch to update the UI
        } catch (error) {
            console.error("Failed to resolve complaint:", error);
            alert("Could not update complaint status.");
        }
    };

    return (
        <Card className="lg:col-span-2">
            <h3 className="text-xl font-bold mb-4">Submitted Complaints</h3>
            {loading ? <p>Loading complaints...</p> : (
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {complaints.length > 0 ? (
                        complaints.map(c => (
                            <div key={c.id} className={`p-4 rounded-lg border-l-4 ${c.status === 'pending' ? 'bg-yellow-50 border-yellow-400' : 'bg-green-50 border-green-400'}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm text-gray-600">From: <span className="font-semibold">{c.studentName}</span> ({c.studentId})</p>
                                        <p className="mt-2 text-gray-800">{c.content}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-4">
                                         <span className={`px-2 py-1 text-xs font-semibold rounded-full ${c.status === 'pending' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>{c.status}</span>
                                        <p className="text-xs text-gray-500 mt-1">{new Date(c.submittedAt).toLocaleString()}</p>
                                    </div>
                                </div>
                                {c.status === 'pending' && (
                                    <div className="text-right mt-3">
                                        <Button onClick={() => handleResolve(c.id)} className="bg-green-500 hover:bg-green-600 text-sm">
                                            <i className="fas fa-check mr-2"></i>Mark as Resolved
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                         <div className="text-center text-gray-500 py-8">
                            <i className="fas fa-inbox fa-2x mb-2"></i>
                            <p>No complaints have been submitted yet.</p>
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
        if (window.confirm('Are you sure you want to remove this student? This action cannot be undone.')) {
            try {
                await firebaseService.deleteStudent(studentId);
                fetchStudents(); // Refresh the roster
            } catch (error) {
                console.error("Failed to delete student:", error);
                alert("Could not remove student. Please try again.");
            }
        }
    };

    if (!user) return null;

    return (
        <PageLayout title={`CR Dashboard - ${className}`} user={user} onLogout={logout}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-6">
                    <ManageStudents cr={user} onStudentAdded={fetchStudents} />
                    <StudentRoster students={students} onDelete={handleDeleteStudent} />
                </div>
                 <div className="space-y-6">
                    <AttendanceModule students={students} />
                    <ManageNotices classId={user.classId} />
                </div>
            </div>
        </PageLayout>
    );
};

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
            setMessage({type: 'success', text: `Student '${name}' added successfully.`});
            setRollNo('');
            setName('');
            setPassword('');
            onStudentAdded();
        } catch (err) {
            setMessage({type: 'error', text: err instanceof Error ? err.message : 'Failed to add student.'});
        }
    };

    return (
        <Card>
            <h3 className="text-xl font-bold mb-4">Add Student to Roster</h3>
            {message && <p className={`p-2 rounded-md mb-4 ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{message.text}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input placeholder="Roll Number" value={rollNo} onChange={e => setRollNo(e.target.value)} required/>
                <Input placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} required/>
                <Input type="password" placeholder="Set Password" value={password} onChange={e => setPassword(e.target.value)} required />
                <Button type="submit">Add Student</Button>
            </form>
        </Card>
    );
};

const StudentRoster: React.FC<{ students: User[], onDelete: (studentId: string) => void }> = ({ students, onDelete }) => {
    return (
        <Card>
            <h3 className="text-xl font-bold mb-4">Class Roster ({students.length})</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {students.length > 0 ? (
                    students.sort((a, b) => a.rollNo.localeCompare(b.rollNo)).map(student => (
                        <div key={student.uid} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg hover:bg-gray-100">
                            <div>
                                <p className="font-semibold">{student.name}</p>
                                <p className="text-xs text-gray-500">{student.rollNo}</p>
                            </div>
                            <button
                                onClick={() => onDelete(student.uid)}
                                className="text-red-500 hover:text-red-700 transition-colors px-3 py-1 rounded-md hover:bg-red-100"
                                aria-label={`Remove ${student.name}`}
                            >
                                <i className="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    ))
                ) : (
                     <div className="text-center text-gray-500 py-8">
                        <i className="fas fa-users fa-2x mb-2"></i>
                        <p>No students have been added yet.</p>
                    </div>
                )}
            </div>
        </Card>
    );
};


const AttendanceModule: React.FC<{ students: User[] }> = ({ students }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceStatus, setAttendanceStatus] = useState<{ [key: string]: boolean }>({});
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // When students or date changes, initialize all students to absent.
        // In a real app, you might fetch existing records for the selected date here.
        const initialStatus = students.reduce((acc, student) => {
            acc[student.uid] = false;
            return acc;
        }, {} as { [key: string]: boolean });
        setAttendanceStatus(initialStatus);
        setMessage(null); // Clear previous messages
    }, [students, selectedDate]);

    const handleStatusChange = (studentId: string, isPresent: boolean) => {
        setAttendanceStatus(prev => ({ ...prev, [studentId]: isPresent }));
    };

    const markAll = (present: boolean) => {
        const newStatus = students.reduce((acc, student) => {
            acc[student.uid] = present;
            return acc;
        }, {} as { [key: string]: boolean });
        setAttendanceStatus(newStatus);
    };

    const handleSave = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const records = Object.entries(attendanceStatus).map(([studentId, present]) => ({
                studentId,
                present,
            }));
            await firebaseService.saveAttendance(records, selectedDate);
            setMessage({ type: 'success', text: `Attendance for ${selectedDate} saved successfully.` });
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to save attendance.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <h3 className="text-xl font-bold mb-4">Take Attendance</h3>
            <div className="mb-4">
                <label htmlFor="attendance-date" className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
                <Input
                    type="date"
                    id="attendance-date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]} // Cannot select future dates
                />
            </div>

            {students.length > 0 && (
                 <div className="flex flex-wrap gap-2 mb-4">
                    <Button onClick={() => markAll(true)} className="bg-green-500 hover:bg-green-600 text-sm flex-grow sm:flex-grow-0">Mark All Present</Button>
                    <Button onClick={() => markAll(false)} className="bg-red-500 hover:bg-red-600 text-sm flex-grow sm:flex-grow-0">Mark All Absent</Button>
                </div>
            )}

            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 border-t border-b py-2">
                {students.length > 0 ? (
                    students.map(student => (
                        <div key={student.uid} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg hover:bg-gray-100">
                            <div>
                                <p className="font-semibold">{student.name}</p>
                                <p className="text-xs text-gray-500">{student.rollNo}</p>
                            </div>
                            <label className="flex items-center cursor-pointer">
                                <span className={`mr-3 font-medium text-sm ${attendanceStatus[student.uid] ? 'text-green-600' : 'text-red-600'}`}>
                                    {attendanceStatus[student.uid] ? 'Present' : 'Absent'}
                                </span>
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={attendanceStatus[student.uid] || false}
                                        onChange={(e) => handleStatusChange(student.uid, e.target.checked)}
                                        id={`toggle-${student.uid}`}
                                    />
                                    <div className="w-12 h-6 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-colors"></div>
                                    <div className="absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-transform duration-300 peer-checked:translate-x-6"></div>
                                </div>
                            </label>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-gray-500 py-8">
                        <i className="fas fa-users fa-2x mb-2"></i>
                        <p>No students in this class yet. Add students to take attendance.</p>
                    </div>
                )}
            </div>

             {students.length > 0 && (
                <div className="mt-6">
                    {message && <p className={`p-2 rounded-md mb-4 text-sm text-center ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{message.text}</p>}
                    <Button onClick={handleSave} disabled={loading || students.length === 0} className="w-full">
                        {loading ? 'Saving...' : `Save Attendance for ${selectedDate}`}
                    </Button>
                </div>
            )}
        </Card>
    );
}

const ManageNotices: React.FC<{ classId: string }> = ({ classId }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchNotices = useCallback(async () => {
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
            setMessage({ type: 'success', text: 'Notice posted successfully.' });
            setTitle('');
            setContent('');
            fetchNotices(); // Refresh list
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to post notice.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <h3 className="text-xl font-bold mb-4">Post a Class Notice</h3>
            {message && <p className={`p-2 rounded-md mb-4 text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{message.text}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    placeholder="Notice Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Write your notice content here..."
                    required
                ></textarea>
                <Button type="submit" disabled={loading}>
                    {loading ? 'Posting...' : 'Post Notice'}
                </Button>
            </form>
            <div className="mt-6 border-t pt-4">
                <h4 className="font-semibold mb-2">Posted Notices</h4>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                    {notices.length > 0 ? (
                        notices.map(notice => (
                            <div key={notice.id} className="bg-gray-50 p-3 rounded-lg">
                                <p className="font-bold">{notice.title}</p>
                                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{notice.content}</p>
                                <p className="text-xs text-gray-400 mt-2 text-right">{new Date(notice.postedAt).toLocaleString()}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-500 text-center py-4">No notices posted yet.</p>
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

     useEffect(() => {
        if(user) {
            firebaseService.getClassById(user.classId).then(c => {
                if(c) setClassName(c.name);
            });
        }
    }, [user]);

    if (!user) return null;

    return (
        <PageLayout title={`Student Dashboard - ${className}`} user={user} onLogout={logout}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AttendanceTracker student={user} />
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
        if (p >= 75) return 'bg-green-500';
        if (p >= 50) return 'bg-yellow-500';
        return 'bg-red-500';
    };
    
    const getTextColor = (p: number) => {
        if (p >= 75) return 'text-green-600';
        if (p >= 50) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <Card>
            <h3 className="text-xl font-bold mb-4">My Attendance</h3>
            {loading ? (
                 <div className="text-center text-gray-500 py-8">
                    <i className="fas fa-spinner fa-spin fa-2x mb-2"></i>
                    <p>Loading analytics...</p>
                </div>
            ) : totalDays === 0 ? (
                <div className="text-center text-gray-500 py-8">
                    <i className="fas fa-chart-pie fa-2x mb-2"></i>
                    <p>No attendance has been marked yet.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className={`text-5xl font-bold text-center ${getTextColor(percentage)}`}>
                        {percentage}%
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                            className={`h-4 rounded-full transition-all duration-500 ${getBarColor(percentage)}`}
                            style={{ width: `${percentage}%` }}
                        ></div>
                    </div>
                    <div className="text-center font-semibold text-gray-600">
                        Attended: {presentDays} / {totalDays} Days
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
            <h3 className="text-xl font-bold mb-4">Class Materials & Notices</h3>
            {loading ? (
                <div className="text-center text-gray-500 py-8">
                    <i className="fas fa-spinner fa-spin fa-2x mb-2"></i>
                    <p>Loading content...</p>
                </div>
            ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {/* Section for Notices */}
                    <h4 className="font-semibold text-gray-700">Notices</h4>
                    {notices.length > 0 ? (
                        notices.map(notice => (
                            <div key={notice.id} className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                                <p className="font-bold text-blue-800">{notice.title}</p>
                                <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{notice.content}</p>
                                <p className="text-xs text-gray-500 mt-2 text-right">{new Date(notice.postedAt).toLocaleString()}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-500 text-center py-4">No notices have been posted for your class yet.</p>
                    )}
                    
                     <div className="mt-6 border-t pt-4">
                         <h4 className="font-semibold text-gray-700">Materials</h4>
                        <p className="text-sm text-gray-500 text-center py-4">Materials section coming soon.</p>
                     </div>
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
            setMessage({ type: 'success', text: 'Your complaint has been submitted successfully.' });
            setContent('');
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to submit complaint. Please try again.' });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card>
            <h3 className="text-xl font-bold mb-4">Submit a Complaint</h3>
            {message && <p className={`p-2 rounded-md mb-4 text-sm text-center ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{message.text}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
                 <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Please describe your issue in detail..."
                    required
                ></textarea>
                <Button type="submit" disabled={loading || !content.trim()} className="w-full">
                    {loading ? 'Submitting...' : 'Submit Complaint'}
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
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
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