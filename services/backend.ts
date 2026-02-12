
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, UserRole, Institution, Subject, Questionnaire, StudentResponse, CombinedScore, Question, TeacherCategory, SelfEvaluation, QualitativeEval } from '../types';

export type SubjectWithTeacher = Subject & { teacherName: string };

const HARDCODED_ADMIN_EMAIL = 'admin@avaliadocente.ac.mz';
const HARDCODED_ADMIN_PASS = 'admin';

const getEnv = (key: string) => {
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            // @ts-ignore
            return import.meta.env[key] || import.meta.env[`VITE_${key}`];
        }
    } catch (e) { return ''; }
    return '';
};

const SUPABASE_CONFIG = {
    url: getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL') || 'https://qvovlhjolredlylqjdmc.supabase.co', 
    key: getEnv('SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2b3ZsaGpvbHJlZGx5bHFqZG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDQ2NzUsImV4cCI6MjA4NjQ4MDY3NX0.Qhfsa_6F2HjXOU0Ql0ZaMezVx6Xz4bnn1NWgqOmKUkw'
};

let supabase: SupabaseClient | null = null;
let isUsingSupabase = false;

if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.key) {
    try {
        supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
        isUsingSupabase = true;
    } catch (e) {
        console.error("Supabase Error:", e);
    }
}

const DB_KEYS = { SESSION: 'ad_current_session', USERS: 'ad_users' };

const getTable = <T>(key: string): T[] => {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
};
const setTable = <T>(key: string, data: T[]) => localStorage.setItem(key, JSON.stringify(data));

const SupabaseBackend = {
    async checkHealth() {
        if (!supabase) return { ok: false, mode: 'supabase (uninitialized)' };
        try {
            const { error } = await supabase.from('users').select('id').limit(1);
            if (error) return { ok: false, mode: 'supabase', error: error.message };
            return { ok: true, mode: 'supabase' };
        } catch (e: any) { return { ok: false, mode: 'supabase', error: e.message }; }
    },

    async getUserCount() {
        if (!supabase) return 0;
        const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
        return count || 0;
    },

    async login(email: string, password?: string) {
        if (email === HARDCODED_ADMIN_EMAIL && password === HARDCODED_ADMIN_PASS) {
            const admin = { id: 'admin', email, name: 'Super Admin', role: UserRole.SUPER_ADMIN, approved: true };
            localStorage.setItem(DB_KEYS.SESSION, JSON.stringify({ user: admin, token: 'hardcoded' }));
            return { user: admin as User, token: 'hardcoded' };
        }
        if (!supabase) return null;
        const { data, error } = await supabase.from('users').select('*').eq('email', email).eq('password', password).single();
        if (error || !data) return null;
        localStorage.setItem(DB_KEYS.SESSION, JSON.stringify({ user: data, token: 'supa' }));
        return { user: data as User, token: 'supa' };
    },

    async logout() { localStorage.removeItem(DB_KEYS.SESSION); },
    async getSession() { const s = localStorage.getItem(DB_KEYS.SESSION); return s ? JSON.parse(s).user : null; },
    async getUsers() { if (!supabase) return getTable<User>(DB_KEYS.USERS); const { data } = await supabase.from('users').select('*'); return (data || []) as User[]; },
    async getInstitutions() { if (!supabase) return getTable<Institution>('ad_institutions'); const { data } = await supabase.from('institutions').select('*'); return (data || []) as Institution[]; },
    async getInstitution(id: string) { if (!supabase) return getTable<Institution>('ad_institutions').find(i => i.id === id); const { data } = await supabase.from('institutions').select('*').eq('id', id).single(); return data as Institution; },
    
    async addStudent(instId: string, name: string, email: string, pwd?: string, course?: string, level?: string, studentCode?: string, semester?: '1' | '2', groups?: string[], shift?: 'Diurno' | 'Noturno', modality?: 'Presencial' | 'Online') {
        const newUser = { 
            id: 's_' + Date.now(), email, name, role: UserRole.STUDENT, institutionId: instId, 
            approved: true, course, level, studentCode, semester, classGroups: groups, 
            shifts: shift ? [shift] : [], modality, password: pwd || '123456', mustChangePassword: true 
        };
        if (!supabase) { const t = getTable<any>(DB_KEYS.USERS); t.push(newUser); setTable(DB_KEYS.USERS, t); return newUser; }
        const { data } = await supabase.from('users').insert([newUser]).select().single();
        return data as User;
    },

    async addTeacher(instId: string, name: string, email: string, pwd?: string, cat?: TeacherCategory) {
        const newUser = { id: 'u_' + Date.now(), email, name, role: UserRole.TEACHER, institutionId: instId, approved: true, category: cat || 'assistente', password: pwd || '123456', mustChangePassword: true };
        if (!supabase) { const t = getTable<any>(DB_KEYS.USERS); t.push(newUser); setTable(DB_KEYS.USERS, t); return newUser; }
        const { data } = await supabase.from('users').insert([newUser]).select().single();
        return data as User;
    },

    // Fix: Added createInstitution method
    async createInstitution(data: any) {
        const payload = { id: 'inst_' + Date.now(), ...data, createdAt: new Date().toISOString() };
        if (!supabase) { const t = getTable<Institution>('ad_institutions'); t.push(payload); setTable('ad_institutions', t); return payload; }
        const { data: res } = await supabase.from('institutions').insert([payload]).select().single();
        return res as Institution;
    },

    // Fix: Added inviteManager method
    async inviteManager(instId: string, email: string, name: string, password?: string) {
        const newUser = { id: 'u_' + Date.now(), email, name, role: UserRole.INSTITUTION_MANAGER, institutionId: instId, approved: true, password: password || '123456', mustChangePassword: true };
        if (!supabase) { const t = getTable<any>(DB_KEYS.USERS); t.push(newUser); setTable(DB_KEYS.USERS, t); return newUser; }
        const { data } = await supabase.from('users').insert([newUser]).select().single();
        return data as User;
    },

    // Fix: Added deleteInstitution method
    async deleteInstitution(id: string) {
        if (!supabase) setTable('ad_institutions', getTable<Institution>('ad_institutions').filter(i => i.id !== id));
        else await supabase.from('institutions').delete().eq('id', id);
    },

    // Fix: Added getTeacherStats method
    async getTeacherStats(teacherId: string) {
        if (!supabase) return { teacherId, studentScore: 15, institutionalScore: 16, selfEvalScore: 14, finalScore: 15.5, lastCalculated: new Date().toISOString() };
        const { data } = await supabase.from('scores').select('*').eq('teacherId', teacherId).maybeSingle();
        return (data || { teacherId, studentScore: 0, institutionalScore: 0, selfEvalScore: 0, finalScore: 0, lastCalculated: new Date().toISOString() }) as CombinedScore;
    },

    // Fix: Added getQualitativeEval method
    async getQualitativeEval(teacherId: string) {
        if (!supabase) return { teacherId, recommendations: 'Continuar o bom trabalho.', strengths: ['Pontualidade', 'Domínio da matéria'] };
        const { data } = await supabase.from('qualitative_evals').select('*').eq('teacherId', teacherId).maybeSingle();
        return (data || { teacherId, recommendations: '', strengths: [] }) as QualitativeEval;
    },

    // Fix: Added saveQualitativeEval method to support management scores and qualitative data
    async saveQualitativeEval(data: any) {
        if (!supabase) {
            console.log("Mock: Saving qualitative eval", data);
            return;
        }
        await supabase.from('qualitative_evals').upsert(data);
    },

    // Fix: Added getSelfEval method
    async getSelfEval(teacherId: string) {
        if (!supabase) return null;
        const { data } = await supabase.from('self_evaluations').select('*').eq('teacherId', teacherId).maybeSingle();
        return data as SelfEvaluation;
    },

    // Fix: Added saveSelfEval method
    async saveSelfEval(data: any) {
        if (!supabase) return;
        await supabase.from('self_evaluations').upsert(data);
    },

    // Fix: Added createInitialAdmin method for system setup
    async createInitialAdmin(email: string, pass: string, name: string) {
        const admin = { id: 'admin_' + Date.now(), email, name, role: UserRole.SUPER_ADMIN, approved: true, password: pass };
        if (!supabase) { const t = getTable<any>(DB_KEYS.USERS); t.push(admin); setTable(DB_KEYS.USERS, t); return admin; }
        const { data } = await supabase.from('users').insert([admin]).select().single();
        return data;
    },

    async getInstitutionSubjects(instId: string) {
        if (!supabase) return getTable<Subject>('ad_subjects').filter(s => s.institutionId === instId);
        const { data } = await supabase.from('subjects').select('*').eq('institutionId', instId);
        return (data || []) as Subject[];
    },

    async assignSubject(data: any) {
        const payload = { id: 'sub_' + Date.now(), ...data };
        if (!supabase) { const t = getTable<Subject>('ad_subjects'); t.push(payload); setTable('ad_subjects', t); return payload; }
        const { data: res } = await supabase.from('subjects').insert([payload]).select().single();
        return res;
    },

    async deleteUser(id: string) { if (!supabase) setTable(DB_KEYS.USERS, getTable<User>(DB_KEYS.USERS).filter(u => u.id !== id)); else await supabase.from('users').delete().eq('id', id); },
    async updateInstitution(id: string, data: any) { if (!supabase) return; await supabase.from('institutions').update(data).eq('id', id); },
    async getInstitutionQuestionnaire(instId: string, role: string) { if (!supabase) return null; const { data } = await supabase.from('questionnaires').select('*').eq('institutionId', instId).eq('targetRole', role).maybeSingle(); return data as Questionnaire; },
    async saveQuestionnaire(data: any) { if (!supabase) return; await supabase.from('questionnaires').upsert(data); },
    async calculateScores(instId: string) { console.log("Calculating scores for institution:", instId); },
    async getAllScores(instId: string) { if (!supabase) return []; const { data } = await supabase.from('scores').select('*'); return (data || []) as CombinedScore[]; },
    async changePassword(id: string, pwd: string) { if (!supabase) return; await supabase.from('users').update({ password: pwd, mustChangePassword: false }).eq('id', id); },
    
    async getAvailableSurveys(instId: string): Promise<{ questionnaire: Questionnaire, subjects: SubjectWithTeacher[] } | null> {
        if (!supabase) return null;
        const { data: q } = await supabase.from('questionnaires').select('*').eq('institutionId', instId).eq('targetRole', 'student').maybeSingle();
        const { data: s } = await supabase.from('subjects').select('*').eq('institutionId', instId);
        const users = await this.getUsers();
        const subjectsWithTeacher = (s || []).map((item: any) => ({ ...item, teacherName: users.find(u => u.id === item.teacherId)?.name || 'Docente' }));
        return { questionnaire: q || { id: 'def', institutionId: instId, questions: [], title: 'Padrão', active: true, targetRole: 'student' }, subjects: subjectsWithTeacher };
    },
    
    async submitAnonymousResponse(userId: string, response: any) { if (!supabase) return; await supabase.from('responses').insert([response]); },
    async getStudentProgress(sid: string) { return { completed: 0, pending: 0 }; }
};

const MockBackend = {
    ...SupabaseBackend, // Reaproveita lógica local implementada acima
};

export const BackendService = isUsingSupabase ? SupabaseBackend : MockBackend;
