import type { User, Class, AttendanceRecord, Material, Notice, Complaint } from '../types';

// ===================================================================================
// MOCK DATABASE - In a real app, this would be Firestore
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
let materials: Material[] = [];
let notices: Notice[] = [];
let complaints: Complaint[] = [];

// ===================================================================================
// MOCK FIREBASE AUTH & FIRESTORE API
// ===================================================================================

const mockApi = {
  // --- AUTH ---
  login: async (rollNo: string, password?: string): Promise<User | null> => {
    console.log(`Attempting login for rollNo: ${rollNo}`);
    // Special hardcoded admin login
    if (rollNo.toLowerCase() === 'au' && password === 'VMAU2025') {
       const { password: _, ...adminUser } = users[0];
       return adminUser as User;
    }
    // For others, we find the user by roll number and check password.
    const user = users.find(u => u.rollNo.toLowerCase() === rollNo.toLowerCase());
    if (user && user.password === password) {
      console.log('User found and password matches:', user);
      // IMPORTANT: Never send the password back to the client.
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    }
    console.log('User not found or password incorrect');
    return null;
  },

  // --- ADMIN ACTIONS ---
  createCR: async (rollNo: string, name: string, classId: string, password: string): Promise<User> => {
    // Check if user already exists
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
    console.log("Created new CR:", newCR);
    console.log("Current Users:", users);
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
  
  getComplaints: async (): Promise<Complaint[]> => {
    return [...complaints].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  },

  updateComplaintStatus: async (complaintId: string, status: 'resolved' | 'pending'): Promise<void> => {
      const complaint = complaints.find(c => c.id === complaintId);
      if (complaint) {
          complaint.status = status;
          console.log(`Complaint ${complaintId} status updated to ${status}`);
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
    console.log("Created new Student:", newStudent);
    console.log("Current Users:", users);
    const { password: _, ...userToReturn } = newStudent;
    return userToReturn as User;
  },

  deleteStudent: async (studentId: string): Promise<void> => {
    const initialLength = users.length;
    users = users.filter(u => u.uid !== studentId);
    if (users.length === initialLength) {
        console.warn(`Student with ID ${studentId} not found for deletion.`);
        throw new Error("Student not found.");
    }
    console.log(`Deleted student ${studentId}. Current users:`, users);
  },

  getStudentsByClass: async (classId: string): Promise<User[]> => {
    return users.filter(u => u.classId === classId && u.role === 'student');
  },

  saveAttendance: async (records: {studentId: string, present: boolean}[], date: string): Promise<void> => {
      records.forEach(record => {
          const existingRecordIndex = attendance.findIndex(a => a.studentId === record.studentId && a.date === date);
          if (existingRecordIndex > -1) {
              attendance[existingRecordIndex].present = record.present;
          } else {
              attendance.push({ ...record, date });
          }
      });
      console.log('Attendance saved for', date, attendance);
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
      console.log("New notice created:", newNotice);
      return newNotice;
  },
  
  uploadMaterial: async (title: string, classId: string): Promise<Material> => {
      const newMaterial: Material = {
          id: `mat-${Date.now()}`,
          classId,
          title,
          fileUrl: 'mock/path/to/file.pdf',
          uploadedAt: new Date().toISOString()
      };
      materials.push(newMaterial);
      return newMaterial;
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

  getMaterialsForClass: async (classId: string): Promise<Material[]> => {
      return materials.filter(m => m.classId === classId);
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
      console.log("New complaint submitted:", newComplaint);
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