
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, UserRole, Institution, Subject, Questionnaire, StudentResponse, CombinedScore, Question, SelfEvaluation, QualitativeEval, TeacherCategory, Course, SubjectScoreDetail } from '../types';

// ==================================================================================
// 🚀 CONFIGURAÇÃO GERAL (SUPABASE vs LOCAL)
// ==================================================================================

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
    url: getEnv('SUPABASE_URL') || 'https://qvovlhjolredlylqjdmc.supabase.co', 
    key: getEnv('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2b3ZsaGpvbHJlZGx5bHFqZG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDQ2NzUsImV4cCI6MjA4NjQ4MDY3NX0.Qhfsa_6F2HjXOU0Ql0ZaMezVx6Xz4bnn1NWgqOmKUkw'
};

let supabase: SupabaseClient | null = null;
let isUsingSupabase = false;

if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.key) {
    try {
        supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
        isUsingSupabase = true;
    } catch (e) {
        console.error("Supabase Init Error:", e);
    }
}

const DB_KEYS = {
  USERS: 'ad_users',
  INSTITUTIONS: 'ad_institutions',
  SUBJECTS: 'ad_subjects',
  QUESTIONNAIRES: 'ad_questionnaires',
  COURSES: 'ad_courses', // Nova chave
  RESPONSES: 'ad_responses',
  INST_EVALS: 'ad_inst_evals', 
  SELF_EVALS: 'ad_self_evals',
  SCORES: 'ad_scores',
  QUAL_EVALS: 'ad_qual_evals', // Corrigido chave
  VOTES_TRACKER: 'ad_votes_tracker',
  SESSION: 'ad_current_session'
};

// ATUALIZADO CONFORME FICHA DE AVALIAÇÃO DO DESEMPENHO DO DOCENTE PELO ESTUDANTE
// Total: 30 Pontos
export const PDF_STANDARD_QUESTIONS: Question[] = [
    // Grupo 65: Organização da disciplina (15 pontos)
    { id: "651", text: "O docente apresentou o programa temático ou analítico da disciplina?", type: "binary", weight: 4 },
    { id: "652", text: "O docente apresentou os objetivos da disciplina?", type: "binary", weight: 3 },
    { id: "653", text: "O docente apresentou a metodologia de ensino da disciplina?", type: "binary", weight: 2 },
    { id: "654", text: "O docente cumpriu com o programa temático ou analítico apresentado?", type: "binary", weight: 6 },
    
    // Grupo 70: Interação do docente com os estudantes (3 pontos)
    { id: "701", text: "O docente foi acessível aos estudantes?", type: "binary", weight: 1 },
    { id: "702", text: "O docente disponibilizou-se para esclarecer dúvidas?", type: "binary", weight: 1 },
    { id: "703", text: "O docente encorajou ao uso de métodos participativos na sala de aula?", type: "binary", weight: 1 },
    
    // Grupo 75: Avaliação do estudante pelo docente (12 pontos)
    { id: "751", text: "O docente avaliou os estudantes dentro dos prazos?", type: "binary", weight: 5 },
    { id: "752", text: "O estudante teve oportunidade de ver seus resultados depois de corrigidos?", type: "binary", weight: 3 },
    { id: "753", text: "O docente publicou os resultados da avaliação dentro dos prazos estabelecidos?", type: "binary", weight: 4 }
];

export const TEACHER_STANDARD_QUESTIONS: Question[] = [
    { id: "inst_01", text: "As condições das salas de aula são adequadas?", type: "binary", weight: 1 },
    { id: "inst_02", text: "Os recursos didáticos atendem às necessidades?", type: "binary", weight: 1 },
    { id: "inst_03", text: "A comunicação com a direção é eficiente?", type: "binary", weight: 1 },
    { id: "inst_04", text: "Existe apoio para investigação?", type: "binary", weight: 1 }
];

export interface SubjectWithTeacher extends Subject {
    teacherName: string;
}

const getTable = <T>(key: string): T[] => {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
};
const setTable = <T>(key: string, data: T[]) => localStorage.setItem(key, JSON.stringify(data));

// Helper para calcular auto-avaliação (lógica simplificada para backend)
const calculateSelfEvalScoreInternal = (evalData: SelfEvaluation): number => {
    // Implementação simplificada da soma. 
    // Em um cenário real, replicaríamos a lógica exata do frontend aqui.
    // Usamos uma heurística baseada nos campos preenchidos.
    if (!evalData || !evalData.answers) return 0;
    
    const a = evalData.answers;
    // Soma simples dos valores brutos multiplicados por um fator médio para estimar o score
    // G1 (Max 20)
    let score = Math.min(((a.g1_gradSubjects||0)*15) + ((a.g1_postGradSubjects||0)*5), 20);
    // G3 (Max 35)
    score += Math.min((a.g3_theoryHours||0) + (a.g3_practicalHours||0), 35);
    // G4 (Max 35)
    score += Math.min(((a.g4_gradStudents||0)/10 * 18) + (a.g4_passRate||0)/100 * 5, 35);
    
    // Adiciona o restante de forma genérica
    const otherPoints = 
        (a.g5_manuals||0)*5 + 
        (a.g6_publishedArticles||0)*7 + 
        (a.g7_collaboration||0)*5 +
        (a.g8_adminHours||0);
        
    score += otherPoints;

    return Math.min(score, 175); 
};

/**
 * 🟢 SUPABASE BACKEND
 */
const SupabaseBackend = {
    async checkHealth() {
        if (!supabase) return { ok: false, mode: 'local' };
        try {
            const { error } = await supabase.from('institutions').select('id').limit(1);
            if (error) return { ok: false, mode: 'local', error: error.message };
            return { ok: true, mode: 'supabase' };
        } catch (e: any) { return { ok: false, mode: 'local', error: e.message }; }
    },

    async login(email: string, password?: string) {
        if (!supabase) return null;
        const { data, error } = await supabase.from('users').select('*').eq('email', email).eq('password', password).single();
        if (error || !data) return null;
        
        const user: User = {
            id: data.id,
            email: data.email,
            name: data.name,
            role: data.role as UserRole,
            institutionId: data.institutionId,
            approved: data.approved,
            avatar: data.avatar,
            category: data.category as TeacherCategory,
            mustChangePassword: data.mustChangePassword,
            course: data.course,
            courses: data.courses,
            semester: data.semester,
            modality: data.modality,
            jobTitle: data.jobTitle,
            shifts: data.shifts,
            classGroups: data.classGroups
        };
        localStorage.setItem(DB_KEYS.SESSION, JSON.stringify({ user, token: 'supa' }));
        return { user, token: 'supa' };
    },

    async logout() { localStorage.removeItem(DB_KEYS.SESSION); },
    async getSession() { const s = localStorage.getItem(DB_KEYS.SESSION); return s ? JSON.parse(s).user : null; },
    
    async getUsers() {
        if (!supabase) return getTable<User>(DB_KEYS.USERS);
        const { data } = await supabase.from('users').select('*');
        return (data || []) as User[];
    },

    async getInstitutions() {
        if (!supabase) return getTable<Institution>(DB_KEYS.INSTITUTIONS);
        const { data } = await supabase.from('institutions').select('*');
        return (data || []) as Institution[];
    },

    async getInstitution(id: string) {
        if (!supabase) return getTable<Institution>(DB_KEYS.INSTITUTIONS).find(i => i.id === id);
        const { data } = await supabase.from('institutions').select('*').eq('id', id).single();
        return data as Institution;
    },

    async updateInstitution(id: string, data: Partial<Institution>) {
        if (!supabase) {
            const insts = getTable<Institution>(DB_KEYS.INSTITUTIONS);
            setTable(DB_KEYS.INSTITUTIONS, insts.map(i => i.id === id ? { ...i, ...data } : i));
            return;
        }
        await supabase.from('institutions').update(data).eq('id', id);
    },

    async createInstitution(data: any) {
        const newItem = { ...data, id: `inst_${Date.now()}`, createdAt: new Date().toISOString() };
        if (!supabase) {
            const insts = getTable<Institution>(DB_KEYS.INSTITUTIONS);
            setTable(DB_KEYS.INSTITUTIONS, [...insts, newItem]);
            return newItem;
        }
        const { data: res } = await supabase.from('institutions').insert([newItem]).select().single();
        return res as Institution;
    },

    async deleteInstitution(id: string) {
        if (!supabase) {
            const insts = getTable<Institution>(DB_KEYS.INSTITUTIONS);
            setTable(DB_KEYS.INSTITUTIONS, insts.filter(i => i.id !== id));
            return;
        }
        await supabase.from('institutions').delete().eq('id', id);
    },

    async inviteManager(institutionId: string, email: string, name: string, password?: string) {
        const newUser = { id: `u_${Date.now()}`, email, name, role: UserRole.INSTITUTION_MANAGER, institutionId, approved: true, password: password || '123456', mustChangePassword: !!password };
        if (!supabase) {
            const users = getTable<User>(DB_KEYS.USERS);
            setTable(DB_KEYS.USERS, [...users, newUser]);
            return newUser;
        }
        const { data, error } = await supabase.from('users').insert([newUser]).select().single();
        if (error) throw new Error(error.message);
        return data as User;
    },

    // --- CURSOS ---
    async getInstitutionCourses(institutionId: string): Promise<Course[]> {
        if (!supabase) {
            return getTable<Course>(DB_KEYS.COURSES).filter(c => c.institutionId === institutionId);
        }
        const { data } = await supabase.from('courses').select('*').eq('institutionId', institutionId);
        return (data || []) as Course[];
    },

    async addCourse(institutionId: string, name: string, code: string, duration?: number, semester?: string, modality?: 'Presencial' | 'Online'): Promise<Course> {
        const newCourse: Course = { id: `c_${Date.now()}`, institutionId, name, code, duration, semester, modality };
        if (!supabase) {
            const courses = getTable<Course>(DB_KEYS.COURSES);
            setTable(DB_KEYS.COURSES, [...courses, newCourse]);
            return newCourse;
        }
        const { data, error } = await supabase.from('courses').insert([newCourse]).select().single();
        if (error || !data) {
            throw new Error(error?.message || "Erro ao adicionar curso");
        }
        return data as Course;
    },

    async deleteCourse(id: string) {
        if (!supabase) {
            const courses = getTable<Course>(DB_KEYS.COURSES);
            setTable(DB_KEYS.COURSES, courses.filter(c => c.id !== id));
            return;
        }
        await supabase.from('courses').delete().eq('id', id);
    },
    // --------------

    async addTeacher(institutionId: string, name: string, email: string, password?: string, avatar?: string, category?: TeacherCategory, courses?: string[]) {
        const newUser = { id: `u_${Date.now()}`, email, name, role: UserRole.TEACHER, institutionId, approved: true, password: password || '123456', avatar, category, courses, mustChangePassword: !!password, jobTitle: 'Docente' };
        if (!supabase) {
            const users = getTable<User>(DB_KEYS.USERS);
            setTable(DB_KEYS.USERS, [...users, newUser]);
            return newUser;
        }
        const { data, error } = await supabase.from('users').insert([newUser]).select().single();
        if (error) throw new Error(error.message);
        return data as User;
    },

    async addStudent(
        institutionId: string, 
        name: string, 
        email: string, 
        password?: string, 
        course?: string, 
        level?: string, 
        avatar?: string, 
        shifts?: string[], 
        classGroups?: string[],
        semester?: string,
        modality?: 'Presencial' | 'Online' | 'Híbrido'
    ) {
        const newUser = { 
            id: `s_${Date.now()}`, 
            email, 
            name, 
            role: UserRole.STUDENT, 
            institutionId, 
            approved: true, 
            password: password || '123456', 
            course, 
            level, 
            avatar, 
            shifts, 
            classGroups,
            semester,
            modality,
            mustChangePassword: !!password 
        };
        
        if (!supabase) {
            const users = getTable<User>(DB_KEYS.USERS);
            setTable(DB_KEYS.USERS, [...users, newUser]);
            return newUser;
        }
        const { data, error } = await supabase.from('users').insert([newUser]).select().single();
        if (error) {
            console.error("Supabase Error adding student:", error);
            throw new Error(error.message);
        }
        return data as User;
    },

    async getInstitutionSubjects(institutionId: string) {
        if (!supabase) return getTable<Subject>(DB_KEYS.SUBJECTS).filter(s => s.institutionId === institutionId);
        const { data } = await supabase.from('subjects').select('*').eq('institutionId', institutionId);
        return (data || []) as Subject[];
    },

    async assignSubject(data: any) {
        const newItem = { ...data, id: `sub_${Date.now()}` };
        if (!supabase) {
            const subs = getTable<Subject>(DB_KEYS.SUBJECTS);
            setTable(DB_KEYS.SUBJECTS, [...subs, newItem]);
            return newItem;
        }
        const { data: res } = await supabase.from('subjects').insert([newItem]).select().single();
        return res as Subject;
    },

    async getInstitutionQuestionnaire(institutionId: string, role: 'student' | 'teacher' = 'student') {
        if (!supabase) {
            const qs = getTable<Questionnaire>(DB_KEYS.QUESTIONNAIRES);
            const found = qs.find(q => q.institutionId === institutionId && q.targetRole === role);
            if(found) return found;
        } else {
             const { data } = await supabase.from('questionnaires').select('*').eq('institutionId', institutionId).eq('targetRole', role).maybeSingle();
             if (data) return data as Questionnaire;
        }
        
        return {
            id: `def_${role}_${institutionId}`,
            institutionId,
            title: role === 'student' ? 'Avaliação de Desempenho Docente' : 'Inquérito Institucional',
            questions: role === 'student' ? PDF_STANDARD_QUESTIONS : TEACHER_STANDARD_QUESTIONS,
            active: true,
            targetRole: role
        } as Questionnaire;
    },

    async saveQuestionnaire(data: Questionnaire) {
        if (!supabase) {
            const qs = getTable<Questionnaire>(DB_KEYS.QUESTIONNAIRES);
            const filtered = qs.filter(q => q.id !== data.id);
            setTable(DB_KEYS.QUESTIONNAIRES, [...filtered, data]);
            return;
        }
        await supabase.from('questionnaires').upsert(data);
    },

    async getTeacherStats(teacherId: string) {
        if (!supabase) {
            const scores = getTable<CombinedScore>(DB_KEYS.SCORES);
            return scores.find(s => s.teacherId === teacherId);
        }
        const { data } = await supabase.from('scores').select('*').eq('teacherId', teacherId).maybeSingle();
        return data as CombinedScore;
    },

    async getAllScores(institutionId: string) {
        if (!supabase) {
            // Em modo local, filtramos pelos docentes da instituição
            const users = getTable<User>(DB_KEYS.USERS);
            const teacherIds = users.filter(u => u.institutionId === institutionId && u.role === UserRole.TEACHER).map(u => u.id);
            const scores = getTable<CombinedScore>(DB_KEYS.SCORES);
            return scores.filter(s => teacherIds.includes(s.teacherId));
        }
        // No modo Supabase, buscamos scores de professores que pertencem a esta instituição
        const { data } = await supabase.from('scores').select('*'); // Otimização ideal: join com users
        return (data || []) as CombinedScore[];
    },

    async saveQualitativeEval(data: QualitativeEval) {
        if (!supabase) {
             const evals = getTable<QualitativeEval>(DB_KEYS.QUAL_EVALS);
             const idx = evals.findIndex(e => e.teacherId === data.teacherId);
             if (idx >= 0) evals[idx] = { ...evals[idx], ...data };
             else evals.push(data);
             setTable(DB_KEYS.QUAL_EVALS, evals);
             return;
        }
        // Remove undefined fields to avoid DB errors if columns missing
        const cleanData = JSON.parse(JSON.stringify(data));
        await supabase.from('qualitative_evals').upsert(cleanData);
    },

    async getQualitativeEval(teacherId: string) {
        if (!supabase) {
             const evals = getTable<QualitativeEval>(DB_KEYS.QUAL_EVALS);
             return evals.find(e => e.teacherId === teacherId);
        }
        const { data } = await supabase.from('qualitative_evals').select('*').eq('teacherId', teacherId).maybeSingle();
        return data as QualitativeEval;
    },

    async saveSelfEval(data: SelfEvaluation) {
        if (!supabase) {
            const evals = getTable<SelfEvaluation>(DB_KEYS.SELF_EVALS);
            const filtered = evals.filter(e => e.teacherId !== data.teacherId);
            setTable(DB_KEYS.SELF_EVALS, [...filtered, data]);
            return;
        }
        const cleanData = JSON.parse(JSON.stringify(data));
        await supabase.from('self_evals').upsert(cleanData);
    },

    async getSelfEval(teacherId: string) {
        if (!supabase) {
            const evals = getTable<SelfEvaluation>(DB_KEYS.SELF_EVALS);
            return evals.find(e => e.teacherId === teacherId);
        }
        const { data } = await supabase.from('self_evals').select('*').eq('teacherId', teacherId).maybeSingle();
        return data as SelfEvaluation;
    },

    async submitAnonymousResponse(userId: string, response: any) {
        if (!supabase) {
            const resps = getTable<StudentResponse>(DB_KEYS.RESPONSES);
            setTable(DB_KEYS.RESPONSES, [...resps, response]);
            return;
        }
        // Ensure answers are stored as JSONB
        const cleanResponse = {
            ...response,
            answers: response.answers // Supabase handles JSON array automatically
        };
        const { error } = await supabase.from('responses').insert([cleanResponse]);
        if (error) throw new Error(error.message);
    },

    async getAvailableSurveys(institutionId: string, userRole: UserRole = UserRole.STUDENT) {
        const target = userRole === UserRole.TEACHER ? 'teacher' : 'student';
        const q = await this.getInstitutionQuestionnaire(institutionId, target);
        const subjects = await this.getInstitutionSubjects(institutionId);
        const users = await this.getUsers();
        
        const subjectsWithTeachers = subjects.map(s => {
            const t = users.find(u => u.id === s.teacherId);
            return { ...s, teacherName: t ? t.name : 'Docente' } as SubjectWithTeacher;
        });

        return { questionnaire: q!, subjects: subjectsWithTeachers };
    },

    async calculateScores(institutionId: string, teacherId?: string) {
        console.log(`Calculando scores para Instituição: ${institutionId}, Alvo: ${teacherId || 'TODOS'}`);
        
        // 1. Obter todos os dados necessários (Independente do backend, a lógica de agrupamento será JS)
        let subjects: Subject[] = [];
        let allResponses: any[] = [];
        let teachers: User[] = [];
        
        if (!supabase) {
             subjects = getTable<Subject>(DB_KEYS.SUBJECTS);
             allResponses = getTable<StudentResponse>(DB_KEYS.RESPONSES);
             const users = getTable<User>(DB_KEYS.USERS);
             teachers = teacherId 
                ? [users.find(u => u.id === teacherId)!].filter(Boolean)
                : users.filter(u => u.institutionId === institutionId && u.role === UserRole.TEACHER);
        } else {
             const { data: s } = await supabase.from('subjects').select('*').eq('institutionId', institutionId);
             subjects = s || [];
             
             // Buscar respostas pode ser pesado, melhor filtrar
             let rQuery = supabase.from('responses').select('*').eq('institutionId', institutionId);
             if (teacherId) rQuery = rQuery.eq('teacherId', teacherId);
             const { data: r } = await rQuery;
             allResponses = r || [];

             let tQuery = supabase.from('users').select('*').eq('role', 'teacher').eq('institutionId', institutionId);
             if (teacherId) tQuery = tQuery.eq('id', teacherId);
             const { data: t } = await tQuery;
             teachers = (t || []) as User[];
        }

        // Helper para calcular média de um array de respostas
        const calculateAverage = (resps: any[]) => {
            if (resps.length === 0) return 0;
            const totalPoints = resps.reduce((acc, resp) => {
                const answers = resp.answers || []; // Pode ser JSONB ou Array
                if (!Array.isArray(answers) || answers.length === 0) return acc;
                const sum = answers.reduce((s: number, a: any) => s + (Number(a.value) || 0), 0);
                return acc + (sum / answers.length); 
            }, 0);
            // Normaliza média (escala 0-5 para 0-20)
            return Math.min((totalPoints / resps.length) * 4, 20); 
        };

        // Iterar sobre cada docente para calcular notas
        for (const t of teachers) {
            // A. Auto-Avaliação
            const selfEval = !supabase 
                ? getTable<SelfEvaluation>(DB_KEYS.SELF_EVALS).find(s => s.teacherId === t.id)
                : (await supabase.from('self_evals').select('*').eq('teacherId', t.id).maybeSingle()).data;
            const selfScore = selfEval ? calculateSelfEvalScoreInternal(selfEval) : 0;

            // B. Avaliação Institucional (Gestor)
            const qualEval = !supabase
                ? getTable<QualitativeEval>(DB_KEYS.QUAL_EVALS).find(q => q.teacherId === t.id)
                : (await supabase.from('qualitative_evals').select('*').eq('teacherId', t.id).maybeSingle()).data;
            const instScore = qualEval ? ((qualEval.deadlineCompliance || 0) + (qualEval.workQuality || 0)) / 2 : 0;

            // C. Avaliação dos Estudantes (Com detalhamento por Turma/Cadeira)
            const teacherResponses = allResponses.filter(r => r.teacherId === t.id);
            
            // Agrupar respostas por DisciplineID
            const subjectGroups: Record<string, any[]> = {};
            teacherResponses.forEach(r => {
                const sId = r.subjectId || 'unknown';
                if (!subjectGroups[sId]) subjectGroups[sId] = [];
                subjectGroups[sId].push(r);
            });

            // Gerar detalhes por disciplina
            const subjectDetails: SubjectScoreDetail[] = Object.keys(subjectGroups).map(sId => {
                const subResps = subjectGroups[sId];
                const subjectInfo = subjects.find(s => s.id === sId);
                return {
                    subjectName: subjectInfo?.name || 'Disciplina Desconhecida',
                    classGroup: subjectInfo?.classGroup || 'N/A',
                    shift: subjectInfo?.shift || 'N/A',
                    course: subjectInfo?.course || 'Geral',
                    score: calculateAverage(subResps),
                    responseCount: subResps.length
                };
            });

            // Média Geral dos Estudantes (Média das médias das turmas ou média global?)
            // Padrão: Média global de todas as respostas para evitar distorção por turmas pequenas
            const studentAvg = calculateAverage(teacherResponses);

            // D. Nota Final
            const finalScore = selfScore + studentAvg + instScore;

            const newScore: CombinedScore = {
                teacherId: t.id,
                studentScore: studentAvg,
                institutionalScore: instScore,
                selfEvalScore: selfScore,
                finalScore: finalScore,
                lastCalculated: new Date().toISOString(),
                subjectDetails: subjectDetails // Salva o array detalhado
            };

            if (!supabase) {
                const scores = getTable<CombinedScore>(DB_KEYS.SCORES);
                const idx = scores.findIndex(s => s.teacherId === t.id);
                if (idx >= 0) scores[idx] = newScore;
                else scores.push(newScore);
                setTable(DB_KEYS.SCORES, scores);
            } else {
                await supabase.from('scores').upsert(newScore, { onConflict: 'teacherId' });
            }
        }
    },

    async updateUser(id: string, data: Partial<User>) {
        if (!supabase) {
            const users = getTable<User>(DB_KEYS.USERS);
            setTable(DB_KEYS.USERS, users.map(u => u.id === id ? { ...u, ...data } : u));
            return;
        }
        await supabase.from('users').update(data).eq('id', id);
    },

    async changePassword(userId: string, newPassword?: string) {
        if (!supabase) {
            const users = getTable<User>(DB_KEYS.USERS);
            setTable(DB_KEYS.USERS, users.map(u => u.id === userId ? { ...u, password: newPassword, mustChangePassword: false } : u));
            return;
        }
        await supabase.from('users').update({ password: newPassword, mustChangePassword: false }).eq('id', userId);
    },

    async getStudentProgress(studentId: string) {
        if (!supabase) {
             const resps = getTable<StudentResponse>(DB_KEYS.RESPONSES);
             return { completed: 0, pending: 5, history: [] }; 
        }
        // Contar respostas submetidas por este aluno (usando filtro se tivermos ID na resposta, ou lógica de sessão)
        // Como o anonimato é chave, o 'studentId' na tabela response pode não existir.
        // Assumimos aqui uma contagem simples baseada em algum rastro permitido ou local storage.
        return { completed: 0, pending: 0, history: [] };
    },
    
    async resetSystem() {
        if (confirm("Deseja mesmo limpar os dados locais?")) {
            localStorage.clear();
            window.location.reload();
        }
    },

    async getUnapprovedTeachers(institutionId: string) {
        if (!supabase) return [];
        const { data } = await supabase.from('users').select('*').eq('institutionId', institutionId).eq('role', UserRole.TEACHER).eq('approved', false);
        return (data || []) as User[];
    },

    async approveTeacher(teacherId: string) {
        if (!supabase) return;
        await supabase.from('users').update({ approved: true }).eq('id', teacherId);
    }
};

export const BackendService = SupabaseBackend;
