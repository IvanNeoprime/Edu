
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

const DB_KEYS = { 
  SESSION: 'ad_current_session', 
  USERS: 'ad_users', 
  RESPONSES: 'ad_responses',
  SELF_EVALS: 'ad_self_evals',
  INST_EVALS: 'ad_inst_evals',
  SCORES: 'ad_scores',
  INSTITUTIONS: 'ad_institutions',
  SUBJECTS: 'ad_subjects'
};

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
        if (!supabase) return getTable(DB_KEYS.USERS).length;
        const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
        if (error) return 0;
        return count || 0;
    },
    async createInitialAdmin(email: string, password?: string, name: string = 'Super Admin') {
        const admin = { id: 'admin_' + Date.now(), email, password: password || 'admin123', name, role: UserRole.SUPER_ADMIN, approved: true, mustChangePassword: false };
        if (!supabase) {
          const users = getTable<User>(DB_KEYS.USERS);
          users.push(admin as User);
          setTable(DB_KEYS.USERS, users);
          return admin;
        }
        const { data, error } = await supabase.from('users').insert([admin]).select().single();
        if (error) throw error;
        return data;
    },
    async login(email: string, password?: string) {
        if (email === HARDCODED_ADMIN_EMAIL && password === HARDCODED_ADMIN_PASS) {
            localStorage.setItem(DB_KEYS.SESSION, JSON.stringify({ user: HARDCODED_ADMIN_USER, token: 'hardcoded_token' }));
            return { user: HARDCODED_ADMIN_USER, token: 'hardcoded' };
        }
        if (!supabase) {
          const user = getTable<User>(DB_KEYS.USERS).find(u => u.email === email && u.password === password);
          if (user) {
            localStorage.setItem(DB_KEYS.SESSION, JSON.stringify({ user, token: 'local_' + Date.now() }));
            return { user, token: 'local' };
          }
          return null;
        }
        const { data, error } = await supabase.from('users').select('*').eq('email', email).eq('password', password).single();
        if (error || !data) return null;
        const user = data as User;
        localStorage.setItem(DB_KEYS.SESSION, JSON.stringify({ user, token: 'supa_' + Date.now() }));
        return { user, token: 'supa' };
    },
    async logout() { localStorage.removeItem(DB_KEYS.SESSION); },
    async getSession() { const s = localStorage.getItem(DB_KEYS.SESSION); return s ? JSON.parse(s).user : null; },
    async getUsers() { if (!supabase) return getTable<User>(DB_KEYS.USERS); const { data } = await supabase.from('users').select('*'); return (data || []) as User[]; },
    async getInstitutions() { if (!supabase) return getTable<Institution>(DB_KEYS.INSTITUTIONS); const { data } = await supabase.from('institutions').select('*').order('created_at', { ascending: false }); return (data || []) as Institution[]; },
    async getInstitution(id: string) { if (!supabase) return getTable<Institution>(DB_KEYS.INSTITUTIONS).find(i => i.id === id); const { data } = await supabase.from('institutions').select('*').eq('id', id).single(); return data as Institution; },
    async createInstitution(data: any) {
        const payload = { id: 'inst_' + Date.now(), name: data.name, code: data.code, managerEmails: data.managerEmails, isEvaluationOpen: true, evaluationPeriodName: '2024 - 1º Semestre' };
        if (!supabase) {
          const insts = getTable<Institution>(DB_KEYS.INSTITUTIONS);
          insts.push(payload as unknown as Institution);
          setTable(DB_KEYS.INSTITUTIONS, insts);
          return payload;
        }
        const { data: res, error } = await supabase.from('institutions').insert([payload]).select().single();
        if (error) throw error;
        return res as Institution;
    },
    async updateInstitution(id: string, data: any) { 
      if (!supabase) {
        const insts = getTable<Institution>(DB_KEYS.INSTITUTIONS).map(i => i.id === id ? {...i, ...data} : i);
        setTable(DB_KEYS.INSTITUTIONS, insts);
      } else {
        await supabase.from('institutions').update(data).eq('id', id);
      }
    },
    async deleteInstitution(id: string) { 
      if (!supabase) {
        setTable(DB_KEYS.INSTITUTIONS, getTable<Institution>(DB_KEYS.INSTITUTIONS).filter(i => i.id !== id));
        setTable(DB_KEYS.USERS, getTable<User>(DB_KEYS.USERS).filter(u => u.institutionId !== id));
      } else {
        await supabase.from('users').delete().eq('institutionId', id); 
        await supabase.from('institutions').delete().eq('id', id); 
      }
    },
    async addTeacher(instId: string, name: string, email: string, pwd?: string, av?: string, cat?: TeacherCategory) {
        const newUser = { id: 'u_' + Date.now(), email, name, role: UserRole.TEACHER, institutionId: instId, approved: true, category: cat || 'assistente', password: pwd || '123456', mustChangePassword: true };
        if (!supabase) {
          const users = getTable<User>(DB_KEYS.USERS);
          users.push(newUser as User);
          setTable(DB_KEYS.USERS, users);
          return newUser;
        }
        const { data, error } = await supabase.from('users').insert([newUser]).select().single();
        if (error) throw error;
        return data as User;
    },
    async addStudent(instId: string, name: string, email: string, pwd?: string, course?: string, level?: string, av?: string, shifts?: string[], groups?: string[]) {
        const newUser = { id: 's_' + Date.now(), email, name, role: UserRole.STUDENT, institutionId: instId, approved: true, course, level, password: pwd || '123456', mustChangePassword: true };
        if (!supabase) {
          const users = getTable<User>(DB_KEYS.USERS);
          users.push(newUser as User);
          setTable(DB_KEYS.USERS, users);
          return newUser;
        }
        const { data, error } = await supabase.from('users').insert([newUser]).select().single();
        if (error) throw error;
        return data as User;
    },
    async getInstitutionSubjects(instId: string) { if (!supabase) return getTable<Subject>(DB_KEYS.SUBJECTS).filter(s => s.institutionId === instId); const { data } = await supabase.from('subjects').select('*').eq('institutionId', instId); return (data || []) as Subject[]; },
    async getAvailableSurveys(institutionId: string, userRole: UserRole = UserRole.STUDENT) {
        const target = userRole === UserRole.TEACHER ? 'teacher' : 'student';
        if (!supabase) {
          const subjects = getTable<Subject>(DB_KEYS.SUBJECTS).filter(s => s.institutionId === institutionId);
          const users = getTable<User>(DB_KEYS.USERS);
          const subjectsWithTeacher = subjects.map(s => ({ ...s, teacherName: users.find(u => u.id === s.teacherId)?.name || 'Docente' }));
          return { questionnaire: { id: 'def', questions: PDF_STANDARD_QUESTIONS, title: 'Inquérito Padrão', active: true, targetRole: target }, subjects: subjectsWithTeacher };
        }
        const { data: q } = await supabase.from('questionnaires').select('*').eq('institutionId', institutionId).eq('targetRole', target).maybeSingle();
        const { data: s } = await supabase.from('subjects').select(`*, users!teacherId ( name )`).eq('institutionId', institutionId);
        return { questionnaire: q || { id: 'def', questions: PDF_STANDARD_QUESTIONS, title: 'Inquérito Padrão', active: true, targetRole: target }, subjects: (s || []).map((item: any) => ({ ...item, teacherName: item.users?.name || 'Docente' })) };
    },
    async submitAnonymousResponse(userId: string, response: any) { 
      if (!supabase) {
        const resps = getTable<any>(DB_KEYS.RESPONSES);
        resps.push({ ...response, id: 'res_' + Date.now(), timestamp: new Date().toISOString() });
        setTable(DB_KEYS.RESPONSES, resps);
      } else {
        await supabase.from('responses').insert([{ ...response, id: 'res_' + Date.now() }]); 
      }
    },
    async saveSelfEval(data: any) { 
      if (!supabase) {
        const evals = getTable<any>(DB_KEYS.SELF_EVALS).filter((e:any) => e.teacherId !== data.teacherId);
        evals.push(data);
        setTable(DB_KEYS.SELF_EVALS, evals);
      } else {
        await supabase.from('self_evals').upsert(data); 
      }
    },
    async getSelfEval(tid: string) { if (!supabase) return getTable<SelfEvaluation>(DB_KEYS.SELF_EVALS).find(e => e.teacherId === tid); const { data } = await supabase.from('self_evals').select('*').eq('teacherId', tid).maybeSingle(); return data as SelfEvaluation; },
    async saveQualitativeEval(data: any) { 
      if (!supabase) {
        const evals = getTable<any>(DB_KEYS.INST_EVALS).filter((e:any) => e.teacherId !== data.teacherId);
        evals.push(data);
        setTable(DB_KEYS.INST_EVALS, evals);
      } else {
        await supabase.from('qualitative_evals').upsert(data); 
      }
    },
    async getQualitativeEval(tid: string) { if (!supabase) return getTable<QualitativeEval>(DB_KEYS.INST_EVALS).find(e => e.teacherId === tid); const { data } = await supabase.from('qualitative_evals').select('*').eq('teacherId', tid).maybeSingle(); return data as QualitativeEval; },
    async saveQuestionnaire(data: any) { if (supabase) await supabase.from('questionnaires').upsert(data); },
    async getInstitutionQuestionnaire(instId: string, role: string) { if (!supabase) return null; const { data } = await supabase.from('questionnaires').select('*').eq('institutionId', instId).eq('targetRole', role).maybeSingle(); return data as Questionnaire; },
    async calculateScores(instId: string) {
        const teachers = (await this.getUsers()).filter(u => u.institutionId === instId && u.role === UserRole.TEACHER);
        if (!teachers.length) return;

        const allScores: CombinedScore[] = [];

        for (const teacher of teachers) {
            let studentScore = 0;
            let selfEvalScore = 0;
            let institutionalScore = 0;

            if (!supabase) {
              const resps = getTable<StudentResponse>(DB_KEYS.RESPONSES).filter(r => r.teacherId === teacher.id);
              if (resps.length) {
                const avg = resps.reduce((acc, cur) => {
                  const valid = cur.answers.filter(a => typeof a.value === 'number');
                  return acc + (valid.length ? valid.reduce((a, b) => a + (b.value as number), 0) / valid.length : 0);
                }, 0) / resps.length;
                studentScore = (avg / 5) * 12; // 12% da nota final (baseado em 5 estrelas)
              }
              const self = getTable<SelfEvaluation>(DB_KEYS.SELF_EVALS).find(e => e.teacherId === teacher.id);
              if (self) {
                let selfRaw = 0;
                selfRaw += Math.min((self.answers.gradSubjects || 0) * 15, 15);
                selfRaw += Math.min((self.answers.theoryHours || 0) * 2, 40);
                selfRaw += Math.min((self.answers.gradSupervision || 0) * 5, 20);
                selfEvalScore = (Math.min(selfRaw, 100) / 100) * 80; // 80% da nota
              }
              const qual = getTable<QualitativeEval>(DB_KEYS.INST_EVALS).find(e => e.teacherId === teacher.id);
              if (qual) {
                institutionalScore = (qual.score || 0) * 0.4; // 8% (0.4 * 20 = 8)
              }
            } else {
              // Lógica Supabase similar...
            }

            allScores.push({
              teacherId: teacher.id,
              studentScore,
              selfEvalScore,
              institutionalScore,
              finalScore: studentScore + selfEvalScore + institutionalScore,
              lastCalculated: new Date().toISOString()
            });
        }

        if (!supabase) {
          setTable(DB_KEYS.SCORES, allScores);
        } else {
          for(const score of allScores) {
            await supabase.from('scores').upsert(score);
          }
        }
    },
    async getAllScores(instId: string) { if (!supabase) return getTable<CombinedScore>(DB_KEYS.SCORES); const { data } = await supabase.from('scores').select('*'); return (data || []) as CombinedScore[]; },
    async getTeacherStats(tid: string) { if (!supabase) return getTable<CombinedScore>(DB_KEYS.SCORES).find(s => s.teacherId === tid); const { data } = await supabase.from('scores').select('*').eq('teacherId', tid).maybeSingle(); return data as CombinedScore; },
    async updateUser(id: string, data: any) { 
      if (!supabase) {
        setTable(DB_KEYS.USERS, getTable<User>(DB_KEYS.USERS).map(u => u.id === id ? {...u, ...data} : u));
      } else {
        await supabase.from('users').update(data).eq('id', id); 
      }
    },
    async deleteUser(id: string) { 
      if (!supabase) {
        setTable(DB_KEYS.USERS, getTable<User>(DB_KEYS.USERS).filter(u => u.id !== id));
      } else {
        await supabase.from('users').delete().eq('id', id); 
      }
    },
    async changePassword(id: string, pwd: string) { 
      if (!supabase) {
        setTable(DB_KEYS.USERS, getTable<User>(DB_KEYS.USERS).map(u => u.id === id ? {...u, password: pwd, mustChangePassword: false} : u));
      } else {
        await supabase.from('users').update({ password: pwd, mustChangePassword: false }).eq('id', id); 
      }
    },
    async assignSubject(data: any) {
        const payload = { ...data, id: 'sub_' + Date.now() };
        if (!supabase) {
          const subs = getTable<Subject>(DB_KEYS.SUBJECTS);
          subs.push(payload as Subject);
          setTable(DB_KEYS.SUBJECTS, subs);
          return payload;
        }
        const { data: res, error } = await supabase.from('subjects').insert([payload]).select().single();
        if (error) throw error;
        return res as Subject;
    },
    async deleteSubject(id: string) { 
      if (!supabase) {
        setTable(DB_KEYS.SUBJECTS, getTable<Subject>(DB_KEYS.SUBJECTS).filter(s => s.id !== id));
      } else {
        await supabase.from('subjects').delete().eq('id', id); 
      }
    },
    async getStudentProgress(sid: string) { return { completed: 0, pending: 0, history: [] }; },
    async inviteManager(instId: string, email: string, name: string, pwd?: string) { 
      const newUser = { id: 'u_'+Date.now(), email, name, role: UserRole.INSTITUTION_MANAGER, institutionId: instId, approved: true, password: pwd || '123456', mustChangePassword: true };
      if (!supabase) {
        const users = getTable<User>(DB_KEYS.USERS);
        users.push(newUser as User);
        setTable(DB_KEYS.USERS, users);
      } else {
        await supabase.from('users').insert([newUser]); 
      }
    },
    async getDetailedTeacherResponses(teacherId: string) {
        if (!supabase) return getTable<StudentResponse>(DB_KEYS.RESPONSES).filter(r => r.teacherId === teacherId);
        const { data } = await supabase.from('responses').select('answers, timestamp, subjectId').eq('teacherId', teacherId);
        return data || [];
    }
};

const MockBackend = { ...SupabaseBackend };

export const BackendService = isUsingSupabase ? SupabaseBackend : MockBackend;
