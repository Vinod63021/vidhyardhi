
export type UserRole = 'admin' | 'cr' | 'student';

export interface User {
  uid: string;
  rollNo: string;
  name: string;
  classId: string;
  role: UserRole;
  password?: string;
}

export interface Class {
  id: string;
  name: string;
  crId?: string;
}

export interface AttendanceRecord {
  studentId: string;
  date: string; // YYYY-MM-DD
  present: boolean;
}

export interface Material {
  id: string;
  classId: string;
  title: string;
  fileUrl: string; // In a real app, this would be a Firebase Storage URL
  uploadedAt: string;
}

export interface Notice {
  id: string;
  classId?: string; // Optional: for global notices
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