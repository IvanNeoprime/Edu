
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, UserRole, Institution, Subject, Questionnaire, StudentResponse, InstitutionalEval, CombinedScore, Question, SelfEvaluation, QualitativeEval, TeacherCategory } from '../types';

export type SubjectWithTeacher = Subject & { teacherName: string };

const HARDCODED_ADMIN_EMAIL = 'admin@avaliadocente.ac.mz';
const HARDCODED_ADMIN_PASS = 'admin';

const HARDCODED_ADMIN_USER: User = {
    id: 'admin_master_bypass',
    email: HARDCODED_ADMIN_EMAIL,
    name: 'Super Administrador (Acesso Direto)',
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
        console.error("Erro ao inicializar Supabase:", e);
    }
}

const PDF_STANDARD_QUESTIONS: Question[] = [
    { id: "651", text: "O docente apresentou o programa temático ou analítico da disciplina?", type: "binary", weight: 4 },
    { id: "652", text: "O docente apresentou os objetivos da disciplina?", type: "binary", weight: 3 },
    { id: "701", text: "O docente foi acessível aos estudantes?", type: "stars", weight: 3 },
    { id: "751", text: "O docente avaliou os estudantes dentro dos prazos?", type: "binary", weight: 4 }
];

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
        const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
        if (error) return 0;
        return count || 0;
    },
    async createInitialAdmin(email: string, password?: string, name: string = 'Super Admin') {
        if (!supabase) return null;
        const admin = { id: 'admin_' + Date.now(), email, password: password || 'admin123', name, role: UserRole.SUPER_ADMIN, approved: true, mustChangePassword: false };
        const { data, error } = await supabase.from('users').insert([admin]).select().single();
        if (error) throw error;
        return data;
    },
    async login(email: string, password?: string) {
        if (email === HARDCODED_ADMIN_EMAIL && password === HARDCODED_ADMIN_PASS) {
            localStorage.setItem(DB_KEYS.SESSION, JSON.stringify({ user: HARDCODED_ADMIN_USER, token: 'hardcoded_token' }));
            return { user: HARDCODED_ADMIN_USER, token: 'hardcoded' };
        }
        if (!supabase) return null;
        const { data, error } = await supabase.from('users').select('*').eq('email', email).eq('password', password).single();
        if (error || !data) return null;
        const user = data as User;
        localStorage.setItem(DB_KEYS.SESSION, JSON.stringify({ user, token: 'supa_' + Date.now() }));
        return { user, token: 'supa' };
    },
    async logout() { localStorage.removeItem(DB_KEYS.SESSION); },
    async getSession() { const s = localStorage.getItem(DB_KEYS.SESSION); return s ? JSON.parse(s).user : null; },
    async getUsers() { if (!supabase) return []; const { data } = await supabase.from('users').select('*'); return (data || []) as User[]; },
    async getInstitutions() { if (!supabase) return []; const { data } = await supabase.from('institutions').select('*').order('created_at', { ascending: false }); return (data || []) as Institution[]; },
    async getInstitution(id: string) { if (!supabase) return undefined; const { data } = await supabase.from('institutions').select('*').eq('id', id).single(); return data as Institution; },
    async createInstitution(data: any) {
        if (!supabase) return null as any;
        const payload = { id: 'inst_' + Date.now(), name: data.name, code: data.code, managerEmails: data.managerEmails, isEvaluationOpen: true, evaluationPeriodName: '2024 - 1º Semestre' };
        const { data: res, error } = await supabase.from('institutions').insert([payload]).select().single();
        if (error) throw error;
        return res as Institution;
    },
    async updateInstitution(id: string, data: any) { if (supabase) await supabase.from('institutions').update(data).eq('id', id); },
    async deleteInstitution(id: string) { if (supabase) { await supabase.from('users').delete().eq('institutionId', id); await supabase.from('institutions').delete().eq('id', id); } },
    async addTeacher(instId: string, name: string, email: string, pwd?: string, av?: string, cat?: TeacherCategory) {
        if (!supabase) return null as any;
        const newUser = { id: 'u_' + Date.now(), email, name, role: UserRole.TEACHER, institutionId: instId, approved: true, category: cat || 'assistente', password: pwd || '123456', mustChangePassword: true };
        const { data, error } = await supabase.from('users').insert([newUser]).select().single();
        if (error) throw error;
        return data as User;
    },
    async addStudent(instId: string, name: string, email: string, pwd?: string, course?: string, level?: string, av?: string, shifts?: string[], groups?: string[]) {
        if (!supabase) return null as any;
        const newUser = { id: 's_' + Date.now(), email, name, role: UserRole.STUDENT, institutionId: instId, approved: true, course, level, password: pwd || '123456', mustChangePassword: true };
        const { data, error } = await supabase.from('users').insert([newUser]).select().single();
        if (error) throw error;
        return data as User;
    },
    async getInstitutionSubjects(instId: string) { if (!supabase) return []; const { data } = await supabase.from('subjects').select('*').eq('institutionId', instId); return (data || []) as Subject[]; },
    async getAvailableSurveys(institutionId: string, userRole: UserRole = UserRole.STUDENT) {
        if (!supabase) return null;
        const target = userRole === UserRole.TEACHER ? 'teacher' : 'student';
        const { data: q } = await supabase.from('questionnaires').select('*').eq('institutionId', institutionId).eq('targetRole', target).maybeSingle();
        const { data: s } = await supabase.from('subjects').select(`*, users!teacherId ( name )`).eq('institutionId', institutionId);
        return { questionnaire: q || { id: 'def', questions: PDF_STANDARD_QUESTIONS, title: 'Inquérito Padrão', active: true, targetRole: target }, subjects: (s || []).map((item: any) => ({ ...item, teacherName: item.users?.name || 'Docente' })) };
    },
    async submitAnonymousResponse(userId: string, response: any) { if (supabase) await supabase.from('responses').insert([{ ...response, id: 'res_' + Date.now() }]); },
    async saveSelfEval(data: any) { if (supabase) await supabase.from('self_evals').upsert(data); },
    async getSelfEval(tid: string) { if (!supabase) return undefined; const { data } = await supabase.from('self_evals').select('*').eq('teacherId', tid).maybeSingle(); return data as SelfEvaluation; },
    async saveQualitativeEval(data: any) { if (supabase) await supabase.from('qualitative_evals').upsert(data); },
    async getQualitativeEval(tid: string) { if (!supabase) return undefined; const { data } = await supabase.from('qualitative_evals').select('*').eq('teacherId', tid).maybeSingle(); return data as QualitativeEval; },
    async saveQuestionnaire(data: any) { if (supabase) await supabase.from('questionnaires').upsert(data); },
    async getInstitutionQuestionnaire(instId: string, role: string) { if (!supabase) return null; const { data } = await supabase.from('questionnaires').select('*').eq('institutionId', instId).eq('targetRole', role).maybeSingle(); return data as Questionnaire; },
    async calculateScores(instId: string) {
        if (!supabase) return;
        const { data: teachers } = await supabase.from('users').select('*').eq('institutionId', instId).eq('role', UserRole.TEACHER);
        if (!teachers) return;
        for (const teacher of teachers) {
            const { data: resps } = await supabase.from('responses').select('answers').eq('teacherId', teacher.id);
            let avgStudentRaw = 0;
            if (resps && resps.length > 0) {
                const totals = resps.map(r => {
                    const valid = r.answers.filter((a: any) => typeof a.value === 'number');
                    return valid.length ? valid.reduce((acc: number, cur: any) => acc + cur.value, 0) / valid.length : 0;
                });
                avgStudentRaw = (totals.reduce((a, b) => a + b, 0) / totals.length) / 5; 
            }
            const studentScore = avgStudentRaw * 12;
            const { data: self } = await supabase.from('self_evals').select('answers').eq('teacherId', teacher.id).maybeSingle();
            let selfRaw = 0;
            if (self) {
                const a = self.answers;
                selfRaw += Math.min((a.gradSubjects || 0) * 15, 15);
                selfRaw += Math.min((a.theoryHours || 0) * 2, 40);
                selfRaw += Math.min((a.gradSupervision || 0) * 5, 20);
                selfRaw = Math.min(selfRaw, 100);
            }
            const selfEvalScore = (selfRaw / 100) * 80;
            const { data: qual } = await supabase.from('qualitative_evals').select('score').eq('teacherId', teacher.id).maybeSingle();
            const institutionalScore = (qual?.score || 0) * 0.4; // 8% de 20 é 0.4
            await supabase.from('scores').upsert({ teacherId: teacher.id, studentScore, institutionalScore, selfEvalScore, finalScore: studentScore + selfEvalScore + institutionalScore, lastCalculated: new Date().toISOString() });
        }
    },
    async getAllScores(instId: string) { if (!supabase) return []; const { data } = await supabase.from('scores').select('*'); return (data || []) as CombinedScore[]; },
    async getTeacherStats(tid: string) { if (!supabase) return undefined; const { data } = await supabase.from('scores').select('*').eq('teacherId', tid).maybeSingle(); return data as CombinedScore; },
    async updateUser(id: string, data: any) { if (supabase) await supabase.from('users').update(data).eq('id', id); },
    async deleteUser(id: string) { if (supabase) await supabase.from('users').delete().eq('id', id); },
    async changePassword(id: string, pwd: string) { if (supabase) await supabase.from('users').update({ password: pwd, mustChangePassword: false }).eq('id', id); },
    async assignSubject(data: any) {
        if (!supabase) return null as any;
        const payload = { ...data, id: 'sub_' + Date.now() };
        const { data: res, error } = await supabase.from('subjects').insert([payload]).select().single();
        if (error) throw error;
        return res as Subject;
    },
    async deleteSubject(id: string) { if (supabase) await supabase.from('subjects').delete().eq('id', id); },
    async getStudentProgress(sid: string) { return { completed: 0, pending: 0, history: [] }; },
    async inviteManager(instId: string, email: string, name: string, pwd?: string) { if (supabase) await supabase.from('users').insert([{ id: 'u_'+Date.now(), email, name, role: UserRole.INSTITUTION_MANAGER, institutionId: instId, approved: true, password: pwd || '123456', mustChangePassword: true }]); },
    async getDetailedTeacherResponses(teacherId: string) {
        if (!supabase) return [];
        const { data } = await supabase.from('responses').select('answers, timestamp, subjectId').eq('teacherId', teacherId);
        return data || [];
    }
};

const MockBackend = {
    ...SupabaseBackend,
    async calculateScores(instId: string) {
        const teachers = getTable<User>('ad_users').filter(u => u.institutionId === instId && u.role === UserRole.TEACHER);
        const resps = getTable<StudentResponse>('ad_responses');
        const selfs = getTable<SelfEvaluation>('ad_self_evals');
        const quals = getTable<QualitativeEval>('ad_inst_evals');
        const currentScores: CombinedScore[] = [];

        for (const t of teachers) {
            const tResps = resps.filter(r => r.teacherId === t.id);
            let avgStudent = 0;
            if (tResps.length > 0) {
                const totals = tResps.map(r => {
                    const valid = r.answers.filter((a: any) => typeof a.value === 'number');
                    return valid.length ? valid.reduce((acc: number, cur: any) => acc + (cur.value as number), 0) / valid.length : 0;
                });
                avgStudent = (totals.reduce((a, b) => a + b, 0) / totals.length) / 5;
            }
            const sScore = avgStudent * 12;

            const tSelf = selfs.find(s => s.teacherId === t.id);
            let sRaw = 0;
            if (tSelf) {
                const a = tSelf.answers;
                sRaw += Math.min((a.gradSubjects || 0) * 15, 15);
                sRaw += Math.min((a.theoryHours || 0) * 2, 40);
                sRaw += Math.min((a.gradSupervision || 0) * 5, 20);
                sRaw = Math.min(sRaw, 100);
            }
            const seScore = (sRaw / 100) * 80;

            const tQual = quals.find(q => q.teacherId === t.id);
            const iScore = (tQual?.score || 0) * 0.4;

            currentScores.push({
                teacherId: t.id,
                studentScore: sScore,
                institutionalScore: iScore,
                selfEvalScore: seScore,
                finalScore: sScore + seScore + iScore,
                lastCalculated: new Date().toISOString()
            });
        }
        setTable('ad_scores', currentScores);
    },
    async getDetailedTeacherResponses(teacherId: string) {
        return getTable<StudentResponse>('ad_responses').filter(r => r.teacherId === teacherId);
    }
};

export const BackendService = isUsingSupabase ? SupabaseBackend : MockBackend;
