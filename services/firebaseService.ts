
import type { User, Class, AttendanceRecord, Notice, Complaint, TimetableEntry, DayOfWeek } from '../types';

// ===================================================================================
// MOCK DATABASE 
// ===================================================================================
let users: User[] = [
  { uid: 'admin-uid', rollNo: 'au', name: 'Admin User', classId: 'N/A', role: 'admin' },
];

let classes: Class[] = [
  { id: 'cse-a', name: 'CSE-A' },
  { id: 'cse-b', name: 'CSE-B' },
  { id: 'ece-a', name: 'ECE-A' },
];

let attendance: AttendanceRecord[] = [];
let notices: Notice[] = [];
let complaints: Complaint[] = [];
let timetables: TimetableEntry[] = [];

// ===================================================================================
// MOCK FIREBASE AUTH & FIRESTORE API
// ===================================================================================

const mockApi = {
  // --- AUTH ---
  login: async (rollNo: string, password?: string): Promise<User | null> => {
    if (rollNo.toLowerCase() === 'au' && password === 'VMAU2025') {
       const { password: _, ...adminUser } = users[0];
       return adminUser as User;
    }
    const user = users.find(u => u.rollNo.toLowerCase() === rollNo.toLowerCase());
    if (user && user.password === password) {
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    }
    return null;
  },

  // --- ADMIN ACTIONS ---
  createCR: async (rollNo: string, name: string, classId: string, password: string): Promise<User> => {
    if (users.some(u => u.rollNo.toLowerCase() === rollNo.toLowerCase())) {
      throw new Error("A user with this Roll Number already exists.");
    }
    const newCR: User = {
      uid: `cr-${Date.now()}`,
      rollNo,
      name,
      classId,
      role: 'cr',
      password,
    };
    users.push(newCR);
    const targetClass = classes.find(c => c.id === classId);
    if (targetClass) {
        targetClass.crId = newCR.uid;
    }
    const { password: _, ...userToReturn } = newCR;
    return userToReturn as User;
  },

  addClass: async (className: string): Promise<Class> => {
     if (classes.some(c => c.name.toLowerCase() === className.toLowerCase())) {
      throw new Error("A class with this name already exists.");
    }
    const newClass: Class = {
      id: className.toLowerCase().replace(/\s/g, '-'),
      name: className,
    };
    classes.push(newClass);
    return newClass;
  },

  addTimetableEntry: async (entry: Omit<TimetableEntry, 'id'>): Promise<TimetableEntry> => {
    const newEntry: TimetableEntry = {
        ...entry,
        id: `tt-${Date.now()}`,
    };
    timetables.push(newEntry);
    return newEntry;
  },

  deleteTimetableEntry: async (id: string): Promise<void> => {
    timetables = timetables.filter(t => t.id !== id);
  },

  getTimetableForClass: async (classId: string): Promise<TimetableEntry[]> => {
    return timetables
        .filter(t => t.classId === classId)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
  },
  
  getComplaints: async (): Promise<Complaint[]> => {
    return [...complaints].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  },

  updateComplaintStatus: async (complaintId: string, status: 'resolved' | 'pending'): Promise<void> => {
      const complaint = complaints.find(c => c.id === complaintId);
      if (complaint) {
          complaint.status = status;
      } else {
          throw new Error("Complaint not found.");
      }
  },

  // --- CR ACTIONS ---
  createStudent: async (rollNo: string, name: string, cr: User, password: string): Promise<User> => {
     if (users.some(u => u.rollNo.toLowerCase() === rollNo.toLowerCase())) {
      throw new Error("A student with this Roll Number already exists.");
    }
    const newStudent: User = {
      uid: `student-${Date.now()}`,
      rollNo,
      name,
      classId: cr.classId,
      role: 'student',
      password,
    };
    users.push(newStudent);
    const { password: _, ...userToReturn } = newStudent;
    return userToReturn as User;
  },

  deleteStudent: async (studentId: string): Promise<void> => {
    users = users.filter(u => u.uid !== studentId);
  },

  getStudentsByClass: async (classId: string): Promise<User[]> => {
    return users.filter(u => u.classId === classId && u.role === 'student');
  },

  saveAttendance: async (records: {studentId: string, present: boolean}[], date: string, subject: string): Promise<void> => {
      records.forEach(record => {
          // Track by student, date, and SUBJECT
          const existingRecordIndex = attendance.findIndex(a => a.studentId === record.studentId && a.date === date && a.subject === subject);
          if (existingRecordIndex > -1) {
              attendance[existingRecordIndex].present = record.present;
          } else {
              attendance.push({ ...record, date, subject });
          }
      });
  },

  getAllAttendanceForClass: async (classId: string): Promise<(AttendanceRecord & { studentName: string, rollNo: string })[]> => {
      const classStudents = users.filter(u => u.classId === classId);
      const classStudentIds = new Set(classStudents.map(s => s.uid));
      
      return attendance
          .filter(a => classStudentIds.has(a.studentId))
          .map(a => {
              const student = classStudents.find(s => s.uid === a.studentId);
              return {
                  ...a,
                  studentName: student?.name || 'Unknown',
                  rollNo: student?.rollNo || 'N/A'
              };
          })
          .sort((a, b) => b.date.localeCompare(a.date));
  },

  createNotice: async (title: string, content: string, classId: string): Promise<Notice> => {
      const newNotice: Notice = {
          id: `notice-${Date.now()}`,
          classId,
          title,
          content,
          postedAt: new Date().toISOString()
      };
      notices.push(newNotice);
      return newNotice;
  },

  // --- STUDENT ACTIONS ---
  getAttendanceForStudent: async (studentId: string): Promise<AttendanceRecord[]> => {
      return attendance.filter(a => a.studentId === studentId);
  },

  getNoticesForClass: async (classId: string): Promise<Notice[]> => {
      return notices
          .filter(n => n.classId === classId)
          .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
  },
  
  submitComplaint: async(student: User, content: string): Promise<Complaint> => {
      const newComplaint: Complaint = {
          id: `comp-${Date.now()}`,
          studentId: student.uid,
          studentName: student.name,
          content,
          submittedAt: new Date().toISOString(),
          status: 'pending'
      };
      complaints.push(newComplaint);
      return newComplaint;
  },

  // --- SHARED ACTIONS ---
  getClasses: async (): Promise<Class[]> => {
    return [...classes];
  },

  getClassById: async(classId: string): Promise<Class | undefined> => {
      return classes.find(c => c.id === classId);
  }
};

export const firebaseService = mockApi;
