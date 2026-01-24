
export type UserRole = 'admin' | 'cr' | 'student';

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface User {
  uid: string;
  rollNo: string;
  name: string;
  classId: string;
  role: UserRole;
  semester?: string; // e.g., sem1-1, sem2-2
  password?: string;
}

export interface Class {
  id: string;
  name: string;
  crId?: string;
}

export interface TimetableEntry {
  id: string;
  classId: string;
  day: DayOfWeek;
  subject: string;
  faculty: string; // Faculty name label
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
}

export interface AttendanceRecord {
  studentId: string;
  date: string; // YYYY-MM-DD
  subject: string; 
  present: boolean;
}

export interface Notice {
  id: string;
  classId?: string; 
  title: string;
  content: string;
  postedAt: string;
}

export interface Complaint {
  id: string;
  studentId: string;
  studentName: string;
  content: string;
  submittedAt: string;
  status: 'pending' | 'resolved';
}
