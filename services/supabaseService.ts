
import { createClient } from '@supabase/supabase-js';
import type { User, Class, AttendanceRecord, Notice, Complaint, TimetableEntry } from '../types';

// IMPORTANT: Project credentials
const SUPABASE_URL: string = 'https://ohjhtucncgmhrbyapxjt.supabase.co';
const SUPABASE_ANON_KEY: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oamh0dWNuY2dtaHJieWFweGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyMjM5MjIsImV4cCI6MjA4NDc5OTkyMn0.SBGQX_sQOPl2MSa-xx0pMDhx5nXCIPuSD_OaEjPwDrQ';

const isConfigured = () => {
  const isUrlValid = SUPABASE_URL && SUPABASE_URL.includes('supabase.co');
  const isKeyValid = SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.length > 20;
  return isUrlValid && isKeyValid;
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const supabaseService = {
  // --- AUTH ---
  login: async (rollNo: string, password?: string): Promise<User | null> => {
    if (!isConfigured()) throw new Error("Supabase is not configured.");
    if (rollNo.toLowerCase() === 'au' && password === 'VMAU2025') {
       return { uid: 'admin-uid', rollNo: 'au', name: 'Admin User', classId: 'N/A', role: 'admin' };
    }
    const { data, error } = await supabase.from('users').select('*').eq('roll_no', rollNo).eq('password', password).single();
    if (error || !data) return null;
    return { uid: data.uid, rollNo: data.roll_no, name: data.name, classId: data.class_id, role: data.role as any };
  },

  // --- ADMIN ACTIONS ---
  getAllCRs: async (): Promise<(User & { className: string })[]> => {
    if (!isConfigured()) return [];
    const { data: users, error: userError } = await supabase.from('users').select('*').eq('role', 'cr');
    if (userError || !users) return [];
    const { data: classes } = await supabase.from('classes').select('id, name');
    return users.map(u => ({
      uid: u.uid,
      rollNo: u.roll_no,
      name: u.name,
      classId: u.class_id,
      role: u.role as any,
      className: classes?.find(c => c.id === u.class_id)?.name || 'Unknown Class'
    }));
  },

  removeCR: async (uid: string, classId: string): Promise<void> => {
    await supabase.from('classes').update({ cr_id: null }).eq('id', classId);
    await supabase.from('users').delete().eq('uid', uid);
  },

  createCR: async (rollNo: string, name: string, classId: string, password: string): Promise<User> => {
    const uid = `cr-${Date.now()}`;
    const { data, error } = await supabase.from('users').insert([{ uid, roll_no: rollNo, name, class_id: classId, role: 'cr', password }]).select().single();
    if (error) throw new Error(error.message);
    await supabase.from('classes').update({ cr_id: uid }).eq('id', classId);
    return { uid: data.uid, rollNo: data.roll_no, name: data.name, classId: data.class_id, role: data.role as any };
  },

  addClass: async (className: string): Promise<Class> => {
    const id = className.toLowerCase().replace(/\s/g, '-');
    const { data, error } = await supabase.from('classes').insert([{ id, name: className }]).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  deleteClass: async (classId: string): Promise<void> => {
    await supabase.from('classes').delete().eq('id', classId);
  },

  addTimetableEntry: async (entry: Omit<TimetableEntry, 'id'>): Promise<TimetableEntry> => {
    const { data, error } = await supabase.from('timetable').insert([{
        class_id: entry.classId,
        day: entry.day,
        subject: entry.subject,
        faculty: entry.faculty,
        start_time: entry.startTime,
        end_time: entry.endTime
      }]).select().single();
    if (error) throw new Error(error.message);
    return { id: data.id, classId: data.class_id, day: data.day, subject: data.subject, faculty: data.faculty, startTime: data.start_time, endTime: data.end_time };
  },

  updateTimetableEntry: async (id: string, entry: Partial<TimetableEntry>): Promise<void> => {
    const { error } = await supabase.from('timetable').update({
        day: entry.day,
        subject: entry.subject,
        faculty: entry.faculty,
        start_time: entry.startTime,
        end_time: entry.endTime
      }).eq('id', id);
    if (error) throw new Error(error.message);
  },

  deleteTimetableEntry: async (id: string): Promise<void> => {
    await supabase.from('timetable').delete().eq('id', id);
  },

  getTimetableForClass: async (classId: string): Promise<TimetableEntry[]> => {
    const { data, error } = await supabase.from('timetable').select('*').eq('class_id', classId).order('start_time', { ascending: true });
    if (error) return [];
    return data.map(d => ({ id: d.id, classId: d.class_id, day: d.day, subject: d.subject, faculty: d.faculty, startTime: d.start_time, endTime: d.end_time }));
  },

  getComplaints: async (): Promise<Complaint[]> => {
    const { data, error } = await supabase.from('complaints').select('*').order('submitted_at', { ascending: false });
    if (error) return [];
    return data.map(d => ({ id: d.id, studentId: d.student_id, studentName: d.student_name, content: d.content, submittedAt: d.submitted_at, status: d.status as any }));
  },

  updateComplaintStatus: async (complaintId: string, status: 'resolved' | 'pending'): Promise<void> => {
    await supabase.from('complaints').update({ status }).eq('id', complaintId);
  },

  createStudent: async (rollNo: string, name: string, cr: User, password: string): Promise<User> => {
    const { data, error } = await supabase.from('users').insert([{ uid: `student-${Date.now()}`, roll_no: rollNo, name, class_id: cr.classId, role: 'student', password }]).select().single();
    if (error) throw new Error(error.message);
    return { uid: data.uid, rollNo: data.roll_no, name: data.name, classId: data.class_id, role: data.role as any };
  },

  deleteStudent: async (studentId: string): Promise<void> => {
    await supabase.from('users').delete().eq('uid', studentId);
  },

  getStudentsByClass: async (classId: string): Promise<User[]> => {
    const { data, error } = await supabase.from('users').select('*').eq('class_id', classId).in('role', ['student', 'cr']);
    if (error) return [];
    return data.map(d => ({ uid: d.uid, rollNo: d.roll_no, name: d.name, classId: d.class_id, role: d.role as any }));
  },

  saveAttendance: async (records: {studentId: string, present: boolean}[], date: string, subject: string): Promise<void> => {
    const payload = records.map(r => ({ student_id: r.studentId, date, subject, present: r.present }));
    await supabase.from('attendance').upsert(payload, { onConflict: 'student_id, date, subject' });
  },

  getAllAttendanceForClass: async (classId: string): Promise<(AttendanceRecord & { studentName: string, rollNo: string })[]> => {
    const { data: students } = await supabase.from('users').select('uid, name, roll_no').eq('class_id', classId);
    if (!students) return [];
    const studentIds = students.map(s => s.uid);
    const { data: attData } = await supabase.from('attendance').select('*').in('student_id', studentIds).order('date', { ascending: false });
    if (!attData) return [];
    return attData.map(a => {
      const student = students.find(s => s.uid === a.student_id);
      return { studentId: a.student_id, date: a.date, subject: a.subject, present: a.present, studentName: student?.name || 'Unknown', rollNo: student?.roll_no || 'N/A' };
    });
  },

  createNotice: async (title: string, content: string, classId: string): Promise<Notice> => {
    const { data, error } = await supabase.from('notices').insert([{ class_id: classId, title, content, posted_at: new Date().toISOString() }]).select().single();
    if (error) throw new Error(error.message);
    return { id: data.id, classId: data.class_id, title: data.title, content: data.content, postedAt: data.posted_at };
  },

  getAttendanceForStudent: async (studentId: string): Promise<AttendanceRecord[]> => {
    const { data } = await supabase.from('attendance').select('*').eq('student_id', studentId);
    if (!data) return [];
    return data.map(d => ({ studentId: d.student_id, date: d.date, subject: d.subject, present: d.present }));
  },

  getNoticesForClass: async (classId: string): Promise<Notice[]> => {
    const { data } = await supabase.from('notices').select('*').eq('class_id', classId).order('posted_at', { ascending: false });
    if (!data) return [];
    return data.map(d => ({ id: d.id, classId: d.class_id, title: d.title, content: d.content, postedAt: d.posted_at }));
  },
  
  submitComplaint: async(student: User, content: string): Promise<Complaint> => {
    const { data, error } = await supabase.from('complaints').insert([{ student_id: student.uid, student_name: student.name, content, submitted_at: new Date().toISOString(), status: 'pending' }]).select().single();
    if (error) throw new Error(error.message);
    return { id: data.id, studentId: data.student_id, studentName: data.student_name, content: data.content, submittedAt: data.submitted_at, status: data.status as any };
  },

  getClasses: async (): Promise<Class[]> => {
    const { data } = await supabase.from('classes').select('*');
    if (!data) return [];
    return data.map(d => ({ id: d.id, name: d.name, crId: d.cr_id }));
  },

  getClassById: async(classId: string): Promise<Class | undefined> => {
    const { data } = await supabase.from('classes').select('*').eq('id', classId).single();
    if (!data) return undefined;
    return { id: data.id, name: data.name, crId: data.cr_id };
  }
};

export default supabaseService;
