
import { createClient } from '@supabase/supabase-js';
import type { User, Class, AttendanceRecord, Notice, Complaint, TimetableEntry } from '../types';

const SUPABASE_URL: string = 'https://ohjhtucncgmhrbyapxjt.supabase.co';
const SUPABASE_ANON_KEY: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oamh0dWNuY2dtaHJieWFweGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyMjM5MjIsImV4cCI6MjA4NDc5OTkyMn0.SBGQX_sQOPl2MSa-xx0pMDhx5nXCIPuSD_OaEjPwDrQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const supabaseService = {
  // --- AUTH ---
  login: async (rollNo: string, password?: string): Promise<User | null> => {
    if (rollNo.toLowerCase() === 'au' && password === 'VMAU2025') {
       return { uid: 'admin-uid', rollNo: 'au', name: 'Admin User', classId: 'N/A', role: 'admin' };
    }
    const { data, error } = await supabase.from('users').select('*').eq('roll_no', rollNo).eq('password', password).single();
    if (error || !data) return null;
    return { 
      uid: data.uid, 
      rollNo: data.roll_no, 
      name: data.name, 
      classId: data.class_id, 
      role: data.role as any, 
      semester: data.semester
    };
  },

  // --- CR & STUDENT ACTIONS ---
  createCR: async (rollNo: string, name: string, classId: string, password: string, semester: string): Promise<User> => {
    const { data: existing } = await supabase.from('users').select('uid').eq('roll_no', rollNo).maybeSingle();
    if (existing) throw new Error(`Roll number ${rollNo} is already in use by another account.`);

    const uid = `cr-${Date.now()}`;
    const { data, error } = await supabase.from('users').insert([{ 
      uid, 
      roll_no: rollNo, 
      name, 
      class_id: classId, 
      role: 'cr', 
      password, 
      semester 
    }]).select().single();
    
    if (error) throw new Error(error.message);
    await supabase.from('classes').update({ cr_id: uid }).eq('id', classId);
    return { 
      uid: data.uid, 
      rollNo: data.roll_no, 
      name: data.name, 
      classId: data.class_id, 
      role: data.role as any, 
      semester: data.semester 
    };
  },

  createStudent: async (rollNo: string, name: string, cr: User, password: string, semester: string): Promise<User> => {
    const { data, error } = await supabase.from('users').insert([{ 
      uid: `student-${Date.now()}`, 
      roll_no: rollNo, 
      name, 
      class_id: cr.classId, 
      role: 'student', 
      password, 
      semester 
    }]).select().single();
    
    if (error) throw new Error(error.message);
    return { 
      uid: data.uid, 
      rollNo: data.roll_no, 
      name: data.name, 
      classId: data.class_id, 
      role: data.role as any, 
      semester: data.semester 
    };
  },

  updateUser: async (uid: string, updates: Partial<User & { password?: string }>): Promise<void> => {
    const payload: any = {};
    if (updates.name) payload.name = updates.name;
    if (updates.rollNo) payload.roll_no = updates.rollNo;
    if (updates.password) payload.password = updates.password;
    if (updates.semester) payload.semester = updates.semester;

    const { error } = await supabase.from('users').update(payload).eq('uid', uid);
    if (error) throw new Error(error.message);
  },

  broadcastTimetableUpdate: async (classId: string, subject: string, action: 'added' | 'updated' | 'removed') => {
    const title = `🚨 TIMETABLE_${action.toUpperCase()}`;
    const content = `The schedule for ${subject} was ${action}. Check your dashboard for the latest details.`;
    await supabase.from('notices').insert([{ 
      class_id: classId, 
      title, 
      content, 
      posted_at: new Date().toISOString() 
    }]);
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
    await supabaseService.broadcastTimetableUpdate(entry.classId, entry.subject, 'added');
    return { 
      id: data.id, 
      classId: data.class_id, 
      day: data.day, 
      subject: data.subject, 
      faculty: data.faculty, 
      startTime: data.start_time, 
      endTime: data.end_time 
    };
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
    if (entry.classId && entry.subject) {
        await supabaseService.broadcastTimetableUpdate(entry.classId, entry.subject, 'updated');
    }
  },

  deleteTimetableEntry: async (id: string): Promise<void> => {
    const { data } = await supabase.from('timetable').select('class_id, subject').eq('id', id).single();
    const { error } = await supabase.from('timetable').delete().eq('id', id);
    if (error) throw new Error(error.message);
    if (data) await supabaseService.broadcastTimetableUpdate(data.class_id, data.subject, 'removed');
  },

  getTimetableForClass: async (classId: string): Promise<TimetableEntry[]> => {
    const { data } = await supabase.from('timetable').select('*').eq('class_id', classId).order('start_time', { ascending: true });
    return (data || []).map(d => ({ 
      id: d.id, 
      classId: d.class_id, 
      day: d.day, 
      subject: d.subject, 
      faculty: d.faculty, 
      startTime: d.start_time, 
      endTime: d.end_time 
    }));
  },

  // --- GENERAL ACTIONS ---
  getClasses: async (): Promise<Class[]> => {
    const { data } = await supabase.from('classes').select('*');
    return (data || []).map(d => ({ id: d.id, name: d.name, crId: d.cr_id }));
  },

  getAllCRs: async (): Promise<(User & { className: string })[]> => {
    const { data: users } = await supabase.from('users').select('*').eq('role', 'cr');
    if (!users) return [];
    const { data: classes } = await supabase.from('classes').select('id, name');
    return users.map(u => ({
      uid: u.uid, 
      rollNo: u.roll_no, 
      name: u.name, 
      classId: u.class_id, 
      role: 'cr',
      semester: u.semester, 
      className: classes?.find(c => c.id === u.class_id)?.name || 'Unknown Class'
    }));
  },

  removeUser: async (uid: string): Promise<void> => {
    await supabase.from('attendance').delete().eq('student_id', uid);
    await supabase.from('complaints').delete().eq('student_id', uid);
    const { error } = await supabase.from('users').delete().eq('uid', uid);
    if (error) throw new Error(error.message);
  },

  removeCR: async (uid: string, classId: string): Promise<void> => {
    const { error: classError } = await supabase.from('classes').update({ cr_id: null }).eq('id', classId);
    if (classError) throw new Error(classError.message);
    await supabaseService.removeUser(uid);
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

  getComplaints: async (): Promise<Complaint[]> => {
    const { data } = await supabase.from('complaints').select('*').order('submitted_at', { ascending: false });
    return (data || []).map(d => ({ 
      id: d.id, 
      studentId: d.student_id, 
      studentName: d.student_name, 
      content: d.content, 
      submittedAt: d.submitted_at, 
      status: d.status as any 
    }));
  },

  updateComplaintStatus: async (complaintId: string, status: 'resolved' | 'pending'): Promise<void> => {
    await supabase.from('complaints').update({ status }).eq('id', complaintId);
  },

  getStudentsByClass: async (classId: string): Promise<User[]> => {
    const { data } = await supabase.from('users').select('*').eq('class_id', classId).in('role', ['student', 'cr']);
    return (data || []).map(d => ({ 
      uid: d.uid, 
      rollNo: d.roll_no, 
      name: d.name, 
      classId: d.class_id, 
      role: d.role as any, 
      semester: d.semester 
    }));
  },

  saveAttendance: async (records: {studentId: string, present: boolean}[], date: string, subject: string): Promise<void> => {
    const payload = records.map(r => ({ 
      student_id: r.studentId, 
      date, 
      subject, 
      present: r.present 
    }));
    await supabase.from('attendance').upsert(payload, { onConflict: 'student_id, date, subject' });
  },

  getAllAttendanceForClass: async (classId: string, startDate?: string, endDate?: string): Promise<(AttendanceRecord & { studentName: string, rollNo: string })[]> => {
    const { data: students } = await supabase.from('users').select('uid, name, roll_no').eq('class_id', classId);
    if (!students) return [];
    const studentIds = students.map(s => s.uid);
    let query = supabase.from('attendance').select('*').in('student_id', studentIds);
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    const { data: attData } = await query.order('date', { ascending: false });
    return (attData || []).map(a => {
      const student = students.find(s => s.uid === a.student_id);
      return { 
        studentId: a.student_id, 
        date: a.date, 
        subject: a.subject, 
        present: a.present, 
        studentName: student?.name || 'Unknown', 
        rollNo: student?.roll_no || 'N/A' 
      };
    });
  },

  createNotice: async (title: string, content: string, classId: string): Promise<Notice> => {
    const { data, error } = await supabase.from('notices').insert([{ 
      class_id: classId, 
      title, 
      content, 
      posted_at: new Date().toISOString() 
    }]).select().single();
    
    if (error) throw new Error(error.message);
    return { 
      id: data.id, 
      classId: data.class_id, 
      title: data.title, 
      content: data.content, 
      postedAt: data.posted_at 
    };
  },

  getAttendanceForStudent: async (studentId: string, startDate?: string, endDate?: string): Promise<AttendanceRecord[]> => {
    let query = supabase.from('attendance').select('*').eq('student_id', studentId);
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    const { data } = await query.order('date', { ascending: false });
    return (data || []).map(d => ({ 
      studentId: d.student_id, 
      date: d.date, 
      subject: d.subject, 
      present: d.present 
    }));
  },

  getNoticesForClass: async (classId: string): Promise<Notice[]> => {
    const { data } = await supabase.from('notices').select('*').eq('class_id', classId).order('posted_at', { ascending: false });
    return (data || []).map(d => ({ 
      id: d.id, 
      classId: d.class_id, 
      title: d.title, 
      content: d.content, 
      postedAt: d.posted_at 
    }));
  },
  
  submitComplaint: async(student: User, content: string): Promise<Complaint> => {
    const { data, error } = await supabase.from('complaints').insert([{ 
      student_id: student.uid, 
      student_name: student.name, 
      content, 
      submitted_at: new Date().toISOString(), 
      status: 'pending' 
    }]).select().single();
    
    if (error) throw new Error(error.message);
    return { 
      id: data.id, 
      studentId: data.student_id, 
      studentName: data.student_name, 
      content: data.content, 
      submittedAt: data.submitted_at, 
      status: data.status as any 
    };
  },

  getClassById: async(classId: string): Promise<Class | undefined> => {
    const { data } = await supabase.from('classes').select('*').eq('id', classId).single();
    return data ? { id: data.id, name: data.name, crId: data.cr_id } : undefined;
  },

  getAllStudents: async (): Promise<User[]> => {
    const { data } = await supabase.from('users').select('*').eq('role', 'student').order('name');
    return (data || []).map(d => ({
        uid: d.uid, rollNo: d.roll_no, name: d.name, classId: d.class_id, role: 'student', semester: d.semester
    }));
  },

  // --- ANALYTICS ---
  getDailyActivityStats: async (date: string): Promise<any[]> => {
    const { data: attendance } = await supabase.from('attendance').select('*').eq('date', date);
    const { data: classes } = await supabase.from('classes').select('id, name');
    const { data: users } = await supabase.from('users').select('uid, class_id').in('role', ['student', 'cr']);

    if (!classes) return [];

    return classes.map(cls => {
      const classStudents = users?.filter(u => u.class_id === cls.id) || [];
      const studentIds = new Set(classStudents.map(s => s.uid));
      
      const classAttendance = attendance?.filter(a => studentIds.has(a.student_id)) || [];
      const uniquePresentCount = new Set(classAttendance.filter(a => a.present).map(a => a.student_id)).size;
      const total = classStudents.length;

      return {
        id: cls.id,
        name: cls.name,
        total,
        present: uniquePresentCount,
        absent: total - uniquePresentCount,
        percentage: total > 0 ? (uniquePresentCount / total) * 100 : 0
      };
    });
  }
};

export default supabaseService;
