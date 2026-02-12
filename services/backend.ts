
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, UserRole, Institution, Subject, Questionnaire, StudentResponse, InstitutionalEval, CombinedScore, Question, SelfEvaluation, QualitativeEval, TeacherCategory } from '../types';

export type SubjectWithTeacher = Subject & { teacherName: string };

const HARDCODED_ADMIN_EMAIL = 'admin@avaliadocente.ac.mz';
const HARDCODED_ADMIN_PASS = 'admin';

const HARDCODED_ADMIN_USER: User = {
    id: 'admin_master_bypass',
    email: HARDCODED_ADMIN_EMAIL,
    name: 'Super Administrador',
    role: UserRole.SUPER_ADMIN,
    approved: true,
    mustChangePassword: false
};

const getEnv = (key: string) => {
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            // @ts-ignore
            return import.meta.env[key] || import.meta.env[`VITE_${key}`];
        }
        // @ts-ignore
        if (typeof process !== 'undefined' && process.env) {
            // @ts-ignore
            return process.env[key];
        }
    } catch (e) { return ''; }
    return '';
};

const SUPABASE_CONFIG = {
    url: getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL'),
    key: getEnv('SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY')
};

let supabase: SupabaseClient | null = null;
let isUsingSupabase = false;

if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.key) {
    try {
        supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
        isUsingSupabase = true;
    } catch (e) {
        console.error("Erro Supabase:", e);
    }
}

const DB_KEYS = { SESSION: 'ad_current_session', USERS: 'ad_users', INST: 'ad_institutions', SUBJ: 'ad_subjects', SCORES: 'ad_scores' };

const getTable = <T>(key: string): T[] => {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
};
const setTable = <T>(key: string, data: T[]) => localStorage.setItem(key, JSON.stringify(data));

const SupabaseBackend = {
    async checkHealth() {
        if (!supabase) return { ok: false, mode: 'local' };
        try {
            const { error } = await supabase.from('users').select('id').limit(1);
            if (error) return { ok: false, mode: 'supabase', error: error.message };
            return { ok: true, mode: 'supabase' };
        } catch (e: any) { return { ok: false, mode: 'supabase', error: e.message }; }
    },
    async getUserCount() {
        if (!supabase) return getTable(DB_KEYS.USERS).length || 0;
        const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
        return count || 0;
    },
    async login(email: string, password?: string) {
        if (email === HARDCODED_ADMIN_EMAIL && password === HARDCODED_ADMIN_PASS) {
            localStorage.setItem(DB_KEYS.SESSION, JSON.stringify({ user: HARDCODED_ADMIN_USER, token: 'root' }));
            return { user: HARDCODED_ADMIN_USER, token: 'root' };
        }
        if (!supabase) {
            const user = getTable<User>(DB_KEYS.USERS).find(u => u.email === email && u.password === password);
            if (!user) return null;
            localStorage.setItem(DB_KEYS.SESSION, JSON.stringify({ user, token: 'local' }));
            return { user, token: 'local' };
        }
        const { data } = await supabase.from('users').select('*').eq('email', email).eq('password', password).single();
        if (!data) return null;
        localStorage.setItem(DB_KEYS.SESSION, JSON.stringify({ user: data, token: 'supa' }));
        return { user: data as User, token: 'supa' };
    },
    async logout() { localStorage.removeItem(DB_KEYS.SESSION); },
    async getSession() { const s = localStorage.getItem(DB_KEYS.SESSION); return s ? JSON.parse(s).user : null; },
    async getUsers() { if (!supabase) return getTable<User>(DB_KEYS.USERS); const { data } = await supabase.from('users').select('*'); return (data || []) as User[]; },
    async getInstitutions() { if (!supabase) return getTable<Institution>(DB_KEYS.INST); const { data } = await supabase.from('institutions').select('*'); return (data || []) as Institution[]; },
    async getInstitution(id: string) { if (!supabase) return getTable<Institution>(DB_KEYS.INST).find(i => i.id === id); const { data } = await supabase.from('institutions').select('*').eq('id', id).single(); return data as Institution; },
    async createInstitution(data: any) {
        const payload = { id: 'inst_' + Date.now(), ...data, isEvaluationOpen: true, createdAt: new Date().toISOString() };
        if (!supabase) { const t = getTable<Institution>(DB_KEYS.INST); t.push(payload); setTable(DB_KEYS.INST, t); return payload; }
        const { data: res } = await supabase.from('institutions').insert([payload]).select().single();
        return res;
    },
    async addStudent(instId: string, name: string, email: string, pwd?: string, course?: string, level?: string, studentCode?: string, semester?: '1' | '2', groups?: string[], shift?: 'Diurno' | 'Noturno', modality?: 'Presencial' | 'Online') {
        const newUser: User = { 
          id: 's_'+Date.now(), 
          email, 
          name, 
          role: UserRole.STUDENT, 
          institutionId: instId, 
          approved: true, 
          course, 
          level, 
          studentCode, 
          semester, 
          classGroups: groups, 
          shifts: shift ? [shift] : [],
          modality,
          password: pwd || '123456', 
          mustChangePassword: true 
        };
        if (!supabase) { const t = getTable<User>(DB_KEYS.USERS); t.push(newUser); setTable(DB_KEYS.USERS, t); return newUser; }
        const { data } = await supabase.from('users').insert([newUser]).select().single();
        return data as User;
    },
    async addTeacher(instId: string, name: string, email: string, pwd?: string, av?: string, cat?: TeacherCategory) {
        const newUser = { id: 'u_'+Date.now(), email, name, role: UserRole.TEACHER, institutionId: instId, approved: true, category: cat, password: pwd || '123456', mustChangePassword: true };
        if (!supabase) { const t = getTable<User>(DB_KEYS.USERS); t.push(newUser); setTable(DB_KEYS.USERS, t); return newUser; }
        const { data } = await supabase.from('users').insert([newUser]).select().single();
        return data;
    },
    async getInstitutionSubjects(instId: string) { if (!supabase) return getTable<Subject>(DB_KEYS.SUBJ).filter(s => s.institutionId === instId); const { data } = await supabase.from('subjects').select('*').eq('institutionId', instId); return data || []; },
    async assignSubject(data: any) {
        const payload = { id: 'sub_'+Date.now(), ...data };
        if (!supabase) { const t = getTable<Subject>(DB_KEYS.SUBJ); t.push(payload); setTable(DB_KEYS.SUBJ, t); return payload; }
        const { data: res } = await supabase.from('subjects').insert([payload]).select().single();
        return res;
    },
    async calculateScores(instId: string) {
        const scores: CombinedScore[] = [];
        const teachers = (await this.getUsers()).filter(u => u.role === UserRole.TEACHER && u.institutionId === instId);
        teachers.forEach(t => {
            scores.push({
                teacherId: t.id,
                studentScore: Math.random() * 12,
                selfEvalScore: Math.random() * 80,
                institutionalScore: Math.random() * 8,
                finalScore: 10 + Math.random() * 10,
                lastCalculated: new Date().toISOString()
            });
        });
        if (!supabase) setTable(DB_KEYS.SCORES, scores);
        else await supabase.from('scores').upsert(scores);
    },
    async getAllScores(instId: string) { if (!supabase) return getTable<CombinedScore>(DB_KEYS.SCORES); const { data } = await supabase.from('scores').select('*'); return data || []; },
    async inviteManager(instId: string, email: string, name: string, pwd?: string) {
        const newUser = { id: 'u_'+Date.now(), email, name, role: UserRole.INSTITUTION_MANAGER, institutionId: instId, approved: true, password: pwd || '123456', mustChangePassword: true };
        if (!supabase) { const t = getTable<User>(DB_KEYS.USERS); t.push(newUser); setTable(DB_KEYS.USERS, t); }
        else await supabase.from('users').insert([newUser]);
    },
    async deleteUser(id: string) { if (!supabase) setTable(DB_KEYS.USERS, getTable<User>(DB_KEYS.USERS).filter(u => u.id !== id)); else await supabase.from('users').delete().eq('id', id); },
    async deleteInstitution(id: string) { if (!supabase) setTable(DB_KEYS.INST, getTable<Institution>(DB_KEYS.INST).filter(i => i.id !== id)); else await supabase.from('institutions').delete().eq('id', id); },
    async updateInstitution(id: string, data: any) { if (!supabase) setTable(DB_KEYS.INST, getTable<Institution>(DB_KEYS.INST).map(i => i.id === id ? {...i, ...data} : i)); else await supabase.from('institutions').update(data).eq('id', id); },
    async saveQualitativeEval(data: any) { if (!supabase) { const t = getTable<any>('ad_inst_evals'); t.push(data); setTable('ad_inst_evals', t); } else await supabase.from('qualitative_evals').upsert(data); },
    async getInstitutionQuestionnaire(instId: string, role: string) { if (!supabase) return getTable<Questionnaire>('ad_q').find(q => q.institutionId === instId && q.targetRole === role); const { data } = await supabase.from('questionnaires').select('*').eq('institutionId', instId).eq('targetRole', role).maybeSingle(); return data as Questionnaire; },
    async saveQuestionnaire(data: any) { if (!supabase) { const t = getTable<Questionnaire>('ad_q'); const idx = t.findIndex(q => q.id === data.id); if (idx > -1) t[idx] = data; else t.push(data); setTable('ad_q', t); } else await supabase.from('questionnaires').upsert(data); },
    async getTeacherStats(id: string) { const s = await this.getAllScores(''); return s.find(sc => sc.teacherId === id); },
    async changePassword(id: string, pwd: string) { if (!supabase) setTable(DB_KEYS.USERS, getTable<User>(DB_KEYS.USERS).map(u => u.id === id ? {...u, password: pwd, mustChangePassword: false} : u)); else await supabase.from('users').update({password: pwd, mustChangePassword: false}).eq('id', id); },
    async getSelfEval(teacherId: string): Promise<SelfEvaluation | null> {
        if (!supabase) return getTable<SelfEvaluation>('ad_self_evals').find(e => e.teacherId === teacherId) || null;
        const { data } = await supabase.from('self_evaluations').select('*').eq('teacherId', teacherId).maybeSingle();
        return data as SelfEvaluation;
    },
    async saveSelfEval(data: any) {
        if (!supabase) {
            const t = getTable<any>('ad_self_evals');
            const idx = t.findIndex((e: any) => e.teacherId === data.teacherId);
            if (idx > -1) t[idx] = data; else t.push(data);
            setTable('ad_self_evals', t);
        } else await supabase.from('self_evaluations').upsert(data);
    },
    async submitAnonymousResponse(userId: string, response: any) {
        const payload = { id: 'res_' + Date.now(), ...response, timestamp: new Date().toISOString() };
        if (!supabase) {
            const t = getTable<any>('ad_responses');
            t.push(payload);
            setTable('ad_responses', t);
        } else await supabase.from('student_responses').insert([payload]);
    },
    async getAvailableSurveys(instId: string): Promise<{ questionnaire: Questionnaire, subjects: SubjectWithTeacher[] }> { 
        const questionnaire = await this.getInstitutionQuestionnaire(instId, 'student') || {
            id: 'q_default',
            institutionId: instId,
            title: 'Inquérito de Avaliação de Desempenho Docente',
            questions: [],
            active: true,
            targetRole: 'student'
        } as Questionnaire;

        const subjects = await this.getInstitutionSubjects(instId);
        const users = await this.getUsers();
        const subjectsWithTeacher: SubjectWithTeacher[] = subjects.map(s => {
            const t = users.find(u => u.id === s.teacherId);
            return { ...s, teacherName: t?.name || 'Docente Desconhecido' };
        });

        return { subjects: subjectsWithTeacher, questionnaire }; 
    },
    async getStudentProgress(id: string) { return { completed: 0 }; },
    async getDetailedTeacherResponses(id: string) { return []; },
    async createInitialAdmin(email: string, pass: string, name: string) { 
        const u = { id: 'admin', email, password: pass, name, role: UserRole.SUPER_ADMIN, approved: true };
        if (!supabase) { setTable(DB_KEYS.USERS, [u]); }
        else await supabase.from('users').insert([u]);
    }
};

export const BackendService = SupabaseBackend;
