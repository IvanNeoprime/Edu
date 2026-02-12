
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, UserRole, Institution, Subject, Questionnaire, StudentResponse, InstitutionalEval, CombinedScore, Question, SelfEvaluation, QualitativeEval, TeacherCategory } from '../types';

// Tipo auxiliar para joins do Supabase
export type SubjectWithTeacher = Subject & { teacherName: string };

// ==================================================================================
// 🚀 CONFIGURAÇÃO E CREDENCIAIS HARDCODED
// ==================================================================================

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

// ==================================================================================
// 🐘 SUPABASE IMPLEMENTATION (REAL DB)
// ==================================================================================

const SupabaseBackend = {
    async checkHealth() {
        if (!supabase) return { ok: false, mode: 'supabase (uninitialized)' };
        try {
            const { error } = await supabase.from('users').select('id').limit(1);
            if (error) {
                if (error.code === '42P01') return { ok: false, mode: 'supabase', error: 'TABELAS_NAO_EXISTEM' };
                return { ok: false, mode: 'supabase', error: error.message };
            }
            return { ok: true, mode: 'supabase' };
        } catch (e: any) {
            return { ok: false, mode: 'supabase', error: e.message };
        }
    },

    async getUserCount() {
        if (!supabase) return 0;
        const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
        if (error) {
            if (error.code === '42P01') return -1;
            return 0;
        }
        return count || 0;
    },

    async createInitialAdmin(email: string, password?: string, name: string = 'Super Admin') {
        if (!supabase) return null;
        const count = await this.getUserCount();
        if (count > 0) throw new Error("O sistema já possui usuários cadastrados.");

        const admin = {
            id: 'admin_' + Date.now(),
            email,
            password: password || 'admin123',
            name,
            role: UserRole.SUPER_ADMIN,
            approved: true,
            mustChangePassword: false
        };

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
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .eq('password', password)
                .single();

            if (error || !data) return null;
            
            const user = data as User;
            localStorage.setItem(DB_KEYS.SESSION, JSON.stringify({ user, token: 'supa_' + Date.now() }));
            return { user, token: 'supa' };
        } catch (e) {
            return null;
        }
    },

    async logout() {
        localStorage.removeItem(DB_KEYS.SESSION);
    },

    async getSession() {
        const s = localStorage.getItem(DB_KEYS.SESSION);
        return s ? JSON.parse(s).user : null;
    },

    async getUsers() {
        if (!supabase) return [];
        try {
            const { data } = await supabase.from('users').select('*');
            return (data || []) as User[];
        } catch (e) { return [HARDCODED_ADMIN_USER]; }
    },

    async getInstitutions() {
        if (!supabase) return [];
        try {
            // Buscamos colunas explícitas para evitar que o cliente tente buscar 'createdAt'
            const { data } = await supabase
                .from('institutions')
                .select('id, name, code, managerEmails, logo, isEvaluationOpen, evaluationPeriodName, created_at')
                .order('created_at', { ascending: false });
                
            return (data || []).map((i: any) => ({
                id: i.id,
                name: i.name,
                code: i.code,
                managerEmails: i.managerEmails,
                logo: i.logo,
                isEvaluationOpen: i.isEvaluationOpen,
                evaluationPeriodName: i.evaluationPeriodName,
                createdAt: i.created_at // Mapeamos snake_case para camelCase aqui
            })) as Institution[];
        } catch (e) { return []; }
    },

    async getInstitution(id: string) {
        if (!supabase) return undefined;
        try {
            const { data } = await supabase
                .from('institutions')
                .select('id, name, code, managerEmails, logo, isEvaluationOpen, evaluationPeriodName, created_at')
                .eq('id', id)
                .single();
                
            if (!data) return undefined;
            return {
                id: data.id,
                name: data.name,
                code: data.code,
                managerEmails: data.managerEmails,
                logo: data.logo,
                isEvaluationOpen: data.isEvaluationOpen,
                evaluationPeriodName: data.evaluationPeriodName,
                createdAt: data.created_at
            } as Institution;
        } catch (e) { return undefined; }
    },

    async createInstitution(data: any) {
        if (!supabase) return null as any;
        
        // Criamos o payload apenas com o que o banco espera (sem 'createdAt')
        const payload = {
            id: 'inst_' + Date.now(),
            name: data.name,
            code: data.code,
            managerEmails: data.managerEmails,
            logo: data.logo,
            isEvaluationOpen: true,
            evaluationPeriodName: 'Semestre 1 - 2024'
        };
        
        // Especificamos explicitamente o select para não vir 'createdAt' inexistente
        const { data: res, error } = await supabase
            .from('institutions')
            .insert([payload])
            .select('id, name, code, managerEmails, logo, isEvaluationOpen, evaluationPeriodName, created_at')
            .single();
            
        if (error) throw error;
        
        return {
            id: res.id,
            name: res.name,
            code: res.code,
            managerEmails: res.managerEmails,
            logo: res.logo,
            isEvaluationOpen: res.isEvaluationOpen,
            evaluationPeriodName: res.evaluationPeriodName,
            createdAt: res.created_at
        } as Institution;
    },

    async deleteInstitution(id: string) {
        if (!supabase) return;
        await supabase.from('users').delete().eq('institutionId', id);
        await supabase.from('subjects').delete().eq('institutionId', id);
        await supabase.from('institutions').delete().eq('id', id);
    },

    async updateInstitution(id: string, data: any) {
        if (!supabase) return;
        // Filtramos campos para garantir que nada estranho vá para o banco
        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.isEvaluationOpen !== undefined) updateData.isEvaluationOpen = data.isEvaluationOpen;
        if (data.evaluationPeriodName !== undefined) updateData.evaluationPeriodName = data.evaluationPeriodName;
        
        await supabase.from('institutions').update(updateData).eq('id', id);
    },

    async addTeacher(instId: string, name: string, email: string, pwd?: string, av?: string, cat?: TeacherCategory) {
        if (!supabase) return null as any;
        const newUser = { 
            id: 'u_' + Date.now(), 
            email, 
            name, 
            role: UserRole.TEACHER, 
            institutionId: instId, 
            approved: true, 
            avatar: av, 
            category: cat || 'assistente', 
            password: pwd || '123456',
            mustChangePassword: true 
        };
        const { data, error } = await supabase.from('users').insert([newUser]).select().single();
        if (error) throw error;
        return data as User;
    },

    async addStudent(instId: string, name: string, email: string, pwd?: string, course?: string, level?: string, av?: string, shifts?: string[], groups?: string[]) {
        if (!supabase) return null as any;
        const newUser = { 
            id: 's_' + Date.now(), 
            email, 
            name, 
            role: UserRole.STUDENT, 
            institutionId: instId, 
            approved: true, 
            course, 
            level, 
            avatar: av, 
            shifts, 
            classGroups: groups, 
            password: pwd || '123456',
            mustChangePassword: true
        };
        const { data, error } = await supabase.from('users').insert([newUser]).select().single();
        if (error) throw error;
        return data as User;
    },

    async inviteManager(instId: string, email: string, name: string, pwd?: string) {
        if (!supabase) return;
        const newUser = { 
            id: 'u_' + Date.now(), 
            email, 
            name, 
            role: UserRole.INSTITUTION_MANAGER, 
            institutionId: instId, 
            approved: true, 
            password: pwd || '123456',
            mustChangePassword: true 
        };
        await supabase.from('users').insert([newUser]);
    },

    async getInstitutionSubjects(instId: string) {
        if (!supabase) return [];
        try {
            const { data } = await supabase.from('subjects').select('*').eq('institutionId', instId);
            return (data || []) as Subject[];
        } catch (e) { return []; }
    },

    async getUnapprovedTeachers(instId: string) {
        if (!supabase) return [];
        try {
            const { data } = await supabase.from('users').select('*').eq('institutionId', instId).eq('role', UserRole.TEACHER).eq('approved', false);
            return (data || []) as User[];
        } catch (e) { return []; }
    },

    async getAvailableSurveys(institutionId: string, userRole: UserRole = UserRole.STUDENT): Promise<{ questionnaire: Questionnaire, subjects: SubjectWithTeacher[] } | null> {
        if (!supabase) return null;
        const target = userRole === UserRole.TEACHER ? 'teacher' : 'student';
        
        try {
            const { data: q } = await supabase.from('questionnaires').select('*').eq('institutionId', institutionId).eq('targetRole', target).maybeSingle();
            
            const { data: s } = await supabase.from('subjects').select(`
                *,
                users!teacherId ( name )
            `).eq('institutionId', institutionId);
            
            const subjectsWithTeacher: SubjectWithTeacher[] = (s || []).map((item: any) => ({
                ...item,
                teacherName: item.users?.name || 'Docente'
            }));

            return { 
                questionnaire: q || { 
                    id: 'def', 
                    institutionId,
                    questions: PDF_STANDARD_QUESTIONS, 
                    title: 'Questionário Padrão',
                    active: true,
                    targetRole: target
                }, 
                subjects: subjectsWithTeacher 
            };
        } catch (e) { return null; }
    },

    async submitAnonymousResponse(userId: string, response: any) {
        if (!supabase) return;
        const { data: inst } = await supabase.from('institutions').select('isEvaluationOpen').eq('id', response.institutionId).single();
        if (inst && inst.isEvaluationOpen === false) throw new Error("O período de avaliação desta instituição está encerrado.");
        
        const { error } = await supabase.from('responses').insert([{ ...response, id: 'res_' + Date.now() }]);
        if (error) throw error;
    },

    async saveSelfEval(data: any) {
        if (!supabase) return;
        const { error } = await supabase.from('self_evals').upsert(data);
        if (error) throw error;
    },

    async getSelfEval(tid: string) {
        if (!supabase) return undefined;
        try {
            const { data } = await supabase.from('self_evals').select('*').eq('teacherId', tid).maybeSingle();
            return data as SelfEvaluation | undefined;
        } catch (e) { return undefined; }
    },

    async saveQualitativeEval(data: any) {
        if (!supabase) return;
        const { error } = await supabase.from('qualitative_evals').upsert(data);
        if (error) throw error;
    },

    async getQualitativeEval(tid: string) {
        if (!supabase) return undefined;
        try {
            const { data } = await supabase.from('qualitative_evals').select('*').eq('teacherId', tid).maybeSingle();
            return data as QualitativeEval | undefined;
        } catch (e) { return undefined; }
    },

    async saveQuestionnaire(data: any) {
        if (!supabase) return;
        const { error } = await supabase.from('questionnaires').upsert(data);
        if (error) throw error;
    },

    async getInstitutionQuestionnaire(instId: string, role: string) {
        if (!supabase) return null;
        try {
            const { data } = await supabase.from('questionnaires').select('*').eq('institutionId', instId).eq('targetRole', role).maybeSingle();
            return data as Questionnaire | null;
        } catch (e) { return null; }
    },

    async calculateScores(instId: string) {
        if (!supabase) return;
        try {
            const { data: teachers } = await supabase.from('users').select('*').eq('institutionId', instId).eq('role', UserRole.TEACHER);
            if (!teachers) return;

            for (const teacher of teachers) {
                const { data: resps } = await supabase.from('responses').select('answers').eq('teacherId', teacher.id);
                let avgStudentRaw = 0;
                if (resps && resps.length > 0) {
                    const totals = resps.map(r => {
                        const validAnswers = r.answers.filter((a: any) => typeof a.value === 'number');
                        if (validAnswers.length === 0) return 0;
                        return validAnswers.reduce((acc: number, cur: any) => acc + cur.value, 0) / validAnswers.length;
                    });
                    avgStudentRaw = (totals.reduce((a, b) => a + b, 0) / totals.length) / 5; 
                }
                const studentScore = avgStudentRaw * 12;

                const { data: self } = await supabase.from('self_evals').select('answers').eq('teacherId', teacher.id).maybeSingle();
                let selfRaw = 0;
                if (self) {
                    const a = self.answers;
                    selfRaw += Math.min((a.gradSubjects || 0) * 15, 15);
                    selfRaw += Math.min((a.postGradSubjects || 0) * 5, 5);
                    selfRaw += Math.min((a.theoryHours || 0) * 1, 16);
                    selfRaw += Math.min((a.practicalHours || 0) * 1, 14);
                    selfRaw += Math.min((a.consultationHours || 0) * 1, 5);
                    selfRaw = Math.min(selfRaw, 100);
                }
                const selfEvalScore = (selfRaw / 100) * 80;

                const { data: qual } = await supabase.from('qualitative_evals').select('score').eq('teacherId', teacher.id).maybeSingle();
                const institutionalScore = (qual?.score || 0) * 0.8;

                const finalScore = studentScore + selfEvalScore + institutionalScore;

                await supabase.from('scores').upsert({
                    teacherId: teacher.id,
                    studentScore,
                    institutionalScore,
                    selfEvalScore,
                    finalScore,
                    lastCalculated: new Date().toISOString()
                });
            }
        } catch (e) { console.error("Erro no calculo:", e); }
    },

    async getAllScores(instId: string) {
        if (!supabase) return [];
        try {
            const { data } = await supabase.from('scores').select('*');
            return (data || []) as CombinedScore[];
        } catch (e) { return []; }
    },

    async getTeacherStats(tid: string) {
        if (!supabase) return undefined;
        try {
            const { data } = await supabase.from('scores').select('*').eq('teacherId', tid).maybeSingle();
            return data as CombinedScore | undefined;
        } catch (e) { return undefined; }
    },

    async updateUser(id: string, data: any) {
        if (!supabase) return;
        await supabase.from('users').update(data).eq('id', id);
    },

    async deleteUser(userId: string) {
        if (!supabase) return;
        await supabase.from('users').delete().eq('id', userId);
    },

    async changePassword(id: string, pwd: string) {
        if (!supabase) return;
        await supabase.from('users').update({ password: pwd, mustChangePassword: false }).eq('id', id);
    },

    async assignSubject(data: any) {
        if (!supabase) return null as any;
        const newSub = { ...data, id: 'sub_' + Date.now() };
        const { data: res } = await supabase.from('subjects').insert([newSub]).select().single();
        return res as Subject;
    },

    async getStudentProgress(sid: string) {
        if (!supabase) return { completed: 0, pending: 0, history: [] };
        try {
            const { count } = await supabase.from('responses').select('*', { count: 'exact', head: true }).eq('id', sid);
            return { completed: count || 0, pending: 0, history: [] };
        } catch (e) { return { completed: 0, pending: 0, history: [] }; }
    },

    async resetSystem() {
        alert("O reset de sistema real deve ser feito via painel do Supabase por segurança.");
    }
};

// ==================================================================================
// 📦 MOCK IMPLEMENTATION (LOCAL STORAGE FALLBACK)
// ==================================================================================

const getTable = <T>(key: string): T[] => {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
};
const setTable = <T>(key: string, data: T[]) => localStorage.setItem(key, JSON.stringify(data));

const MockBackend = {
  async checkHealth() { return { ok: true, mode: 'local' }; },
  async getUserCount() { 
      const users = getTable<User>(DB_KEYS.USERS || 'ad_users');
      return users.length; 
  },
  async createInitialAdmin(email: string, password?: string, name: string = 'Super Admin') {
      const ukey = 'ad_users';
      const users = getTable<User>(ukey);
      const newUser = { id: 'admin_'+Date.now(), email, name, role: UserRole.SUPER_ADMIN, approved: true, password: password || 'admin123' };
      users.push(newUser as any); setTable(ukey, users); return newUser as any;
  },
  async login(email: string, password?: string) {
    if (email === HARDCODED_ADMIN_EMAIL && password === HARDCODED_ADMIN_PASS) {
        const sessionData = { user: HARDCODED_ADMIN_USER, token: 'hardcoded_' + Date.now() };
        localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(sessionData));
        return sessionData;
    }

    const users = getTable<User>(DB_KEYS.USERS || 'ad_users');
    const user = users.find(u => u.email === email && (password ? u.password === password : true));
    if (!user) return null;
    const sessionData = { user, token: 'mock_' + Date.now() };
    localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(sessionData));
    return sessionData;
  },
  async logout() { localStorage.removeItem(DB_KEYS.SESSION); },
  async getSession() {
      const s = localStorage.getItem(DB_KEYS.SESSION);
      return s ? JSON.parse(s).user : null;
  },
  async deleteUser(userId: string) {
    const ukey = 'ad_users';
    setTable(ukey, getTable<User>(ukey).filter(u => u.id !== userId));
  },
  async deleteInstitution(id: string) {
    const ikey = 'ad_institutions';
    setTable(ikey, getTable<Institution>(ikey).filter(i => i.id !== id));
  },
  async addTeacher(instId: string, name: string, email: string, pwd?: string, av?: string, cat?: TeacherCategory) {
      const ukey = 'ad_users';
      const users = getTable<User>(ukey);
      const newUser = { id: 'u_'+Date.now(), email, name, role: UserRole.TEACHER, institutionId: instId, approved: true, avatar: av, category: cat, password: pwd || '123456' };
      users.push(newUser as any); setTable(ukey, users); return newUser as any;
  },
  async addStudent(instId: string, name: string, email: string, pwd?: string, course?: string, level?: string, av?: string, shifts?: string[], groups?: string[]) {
      const ukey = 'ad_users';
      const users = getTable<User>(ukey);
      const newUser = { id: 's_'+Date.now(), email, name, role: UserRole.STUDENT, institutionId: instId, approved: true, course, level, avatar: av, shifts, classGroups: groups, password: pwd || '123456' };
      users.push(newUser as any); setTable(ukey, users); return newUser as any;
  },
  async getInstitutions() { return getTable<Institution>('ad_institutions'); },
  async getInstitution(id: string) { return getTable<Institution>('ad_institutions').find(i => i.id === id); },
  async updateInstitution(id: string, data: any) {
    const list = getTable<Institution>('ad_institutions');
    const idx = list.findIndex(i => i.id === id);
    if (idx !== -1) { list[idx] = { ...list[idx], ...data }; setTable('ad_institutions', list); }
  },
  async submitAnonymousResponse(userId: string, response: any) {
    const resps = getTable<StudentResponse>('ad_responses');
    resps.push(response); setTable('ad_responses', resps);
  },
  async saveSelfEval(data: any) {
    const evals = getTable<SelfEvaluation>('ad_self_evals');
    const filtered = evals.filter(e => e.teacherId !== data.teacherId);
    filtered.push(data); setTable('ad_self_evals', filtered);
  },
  async getAvailableSurveys(institutionId: string, role: UserRole = UserRole.STUDENT): Promise<{ questionnaire: Questionnaire, subjects: SubjectWithTeacher[] }> {
    const q = getTable<Questionnaire>('ad_questionnaires').find(q => q.institutionId === institutionId && q.targetRole === (role === UserRole.TEACHER ? 'teacher' : 'student'));
    const subjects = getTable<Subject>('ad_subjects').filter(s => s.institutionId === institutionId);
    const users = getTable<User>('ad_users');
    const subjectsWithTeacher: SubjectWithTeacher[] = subjects.map(s => {
        const teacher = users.find(u => u.id === s.teacherId);
        return { ...s, teacherName: teacher ? teacher.name : 'Docente' };
    });
    return { 
        questionnaire: q || { id: 'def', institutionId, questions: PDF_STANDARD_QUESTIONS, title: 'Padrão', active: true, targetRole: role === UserRole.TEACHER ? 'teacher' : 'student' }, 
        subjects: subjectsWithTeacher 
    };
  },
  async getUsers() { 
      const users = getTable<User>('ad_users');
      if (users.length === 0) return [HARDCODED_ADMIN_USER];
      return users;
  },
  async getInstitutionSubjects(instId: string) { return getTable<Subject>('ad_subjects').filter(s => s.institutionId === instId); },
  async getUnapprovedTeachers(instId: string) { return getTable<User>('ad_users').filter(u => u.institutionId === instId && u.role === UserRole.TEACHER && !u.approved); },
  async getQualitativeEval(tid: string) { return getTable<QualitativeEval>('ad_inst_evals').find(e => e.teacherId === tid); },
  async getSelfEval(tid: string) { return getTable<SelfEvaluation>('ad_self_evals').find(e => e.teacherId === tid); },
  async getAllScores(instId: string) { return getTable<CombinedScore>('ad_scores'); },
  async getTeacherStats(tid: string) { return getTable<CombinedScore>('ad_scores').find(s => s.teacherId === tid); },
  async getStudentProgress(sid: string) { return { completed: 0, pending: 0, history: [] }; },
  async calculateScores(instId: string) {},
  async createInstitution(data: any) { 
      const insts = getTable<Institution>('ad_institutions');
      const newInst = { ...data, id: 'inst_'+Date.now(), createdAt: new Date().toISOString() };
      insts.push(newInst); setTable('ad_institutions', insts); return newInst;
  },
  async inviteManager(instId: string, email: string, name: string, pwd?: string) {
      const users = getTable<User>('ad_users');
      users.push({ id: 'u_'+Date.now(), email, name, role: UserRole.INSTITUTION_MANAGER, institutionId: instId, approved: true, password: pwd || '123456', mustChangePassword: true } as any);
      setTable('ad_users', users);
  },
  async saveQualitativeEval(data: any) {
    const evals = getTable<QualitativeEval>('ad_inst_evals');
    const filtered = evals.filter(e => e.teacherId !== data.teacherId);
    filtered.push(data); setTable('ad_inst_evals', filtered);
  },
  async getInstitutionQuestionnaire(instId: string, role: string) { return null; },
  async saveQuestionnaire(data: any) {
      const qs = getTable<Questionnaire>('ad_questionnaires');
      const filtered = qs.filter(q => !(q.institutionId === data.institutionId && q.targetRole === data.targetRole));
      filtered.push(data); setTable('ad_questionnaires', filtered);
  },
  async resetSystem() { localStorage.clear(); window.location.reload(); },
  async updateUser(id: string, data: any) {
    const users = getTable<User>('ad_users');
    const idx = users.findIndex(u => u.id === id);
    if (idx !== -1) { users[idx] = { ...users[idx], ...data }; setTable('ad_users', users); }
  },
  async changePassword(id: string, pwd: string) {
    const users = getTable<User>('ad_users');
    const idx = users.findIndex(u => u.id === id);
    if (idx !== -1) { users[idx].password = pwd; users[idx].mustChangePassword = false; setTable('ad_users', users); }
  },
  async assignSubject(data: any) {
      const subs = getTable<Subject>('ad_subjects');
      const newSub = { ...data, id: 'sub_'+Date.now() };
      subs.push(newSub); setTable('ad_subjects', subs); return newSub;
  }
};

export const BackendService = isUsingSupabase ? SupabaseBackend : MockBackend;
