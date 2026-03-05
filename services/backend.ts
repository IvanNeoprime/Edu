
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { User, UserRole, Institution, Subject, Questionnaire, StudentResponse, CombinedScore, Question, SelfEvaluation, QualitativeEval, TeacherCategory, Course, SubjectScoreDetail, SelfEvalTemplate } from '../types';

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
    url: getEnv('SUPABASE_URL'), 
    key: getEnv('SUPABASE_ANON_KEY')
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
  COURSES: 'ad_courses', 
  RESPONSES: 'ad_responses',
  INST_EVALS: 'ad_inst_evals', 
  SELF_EVALS: 'ad_self_evals',
  SCORES: 'ad_scores',
  QUAL_EVALS: 'ad_qual_evals', 
  VOTES_TRACKER: 'ad_votes_tracker',
  SESSION: 'ad_current_session'
};

// ATUALIZADO CONFORME FICHA DE AVALIAÇÃO DO DESEMPENHO DO DOCENTE PELO ESTUDANTE
export const PDF_STANDARD_QUESTIONS: Question[] = [
    // Grupo 65: Organização da disciplina
    { id: "651", text: "O docente apresentou o programa temático ou analítico da disciplina?", type: "binary", weight: 4 },
    { id: "652", text: "O docente apresentou os objetivos da disciplina?", type: "binary", weight: 3 },
    { id: "653", text: "O docente apresentou a metodologia de ensino da disciplina?", type: "binary", weight: 2 },
    { id: "654", text: "O docente cumpriu com o programa temático ou analítico apresentado?", type: "binary", weight: 6 },
    
    // Grupo 70: Interação do docente com os estudantes
    { id: "701", text: "O docente foi acessível aos estudantes?", type: "binary", weight: 1 },
    { id: "702", text: "O docente disponibilizou-se para esclarecer dúvidas?", type: "binary", weight: 1 },
    { id: "703", text: "O docente encorajou ao uso de métodos participativos na sala de aula?", type: "binary", weight: 1 },
    
    // Grupo 75: Avaliação do estudante pelo docente
    { id: "751", text: "O docente avaliou os estudantes dentro dos prazos?", type: "binary", weight: 5 },
    { id: "752", text: "O estudante teve oportunidade de ver seus resultados depois de corrigidos?", type: "binary", weight: 3 },
    { id: "753", text: "O docente publicou os resultados da avaliação dentro dos prazos estabelecidos?", type: "binary", weight: 4 },
    
    // Campo de texto livre para feedback qualitativo
    { id: "comments_open", text: "Comentários, elogios ou sugestões para o docente:", type: "text", weight: 0 }
];

export const TEACHER_STANDARD_QUESTIONS: Question[] = [
    { id: "inst_01", text: "As condições das salas de aula são adequadas?", type: "binary", weight: 1 },
    { id: "inst_02", text: "Os recursos didáticos atendem às necessidades?", type: "binary", weight: 1 },
    { id: "inst_03", text: "A comunicação com a direção é eficiente?", type: "binary", weight: 1 },
    { id: "inst_04", text: "Existe apoio para investigação?", type: "binary", weight: 1 }
];

export const DEFAULT_SELF_EVAL_TEMPLATE: SelfEvalTemplate = {
    groups: [
        {
            id: 'g1', title: '1. Actividade Docente', maxPoints: 20, items: [
                { key: 'g1_gradSubjects', label: 'Disciplinas de Graduação', description: 'Nº Disciplinas', scoreValue: 15 },
                { key: 'g1_postGradSubjects', label: 'Disciplinas de Pós-Graduação', description: 'Nº Disciplinas', scoreValue: 5 }
            ]
        },
        {
            id: 'g2', title: '2. Supervisão Pedagógica', maxPoints: 20, exclusiveTo: ['assistente'], items: [
                { key: 'g2_gradSupervision', label: 'Supervisão Graduação', description: 'Nº Dissertações', scoreValue: 6 },
                { key: 'g2_postGradSupervision', label: 'Supervisão Pós-Grad', description: 'Nº Teses', scoreValue: 6 },
                { key: 'g2_regencySubjects', label: 'Regências', description: 'Nº Regências', scoreValue: 8 }
            ]
        },
        {
            id: 'g3', title: '3. Carga Horária', maxPoints: 35, items: [
                { key: 'g3_theoryHours', label: 'Aulas Teóricas', description: 'Horas Totais', scoreValue: 1 },
                { key: 'g3_practicalHours', label: 'Aulas Práticas', description: 'Horas Totais', scoreValue: 1 },
                { key: 'g3_consultationHours', label: 'Consultas', description: 'Horas Totais', scoreValue: 1 }
            ]
        },
        {
            id: 'g4', title: '4. Rendimento Pedagógico', maxPoints: 35, items: [
                { key: 'g4_gradStudents', label: 'Aprovados Graduação', description: 'Nº Estudantes', scoreValue: 1 }, // Lógica complexa simulada com 1
                { key: 'g4_postGradStudents', label: 'Aprovados Pós-Grad', description: 'Nº Estudantes', scoreValue: 1 },
                { key: 'g4_passRate', label: 'Taxa Aprovação (%)', description: 'Percentagem Global', scoreValue: 0.05 }
            ]
        },
        {
            id: 'g5', title: '5. Produção de Material', maxPoints: 30, items: [
                { key: 'g5_manuals', label: 'Manuais Didáticos', description: 'Quantidade', scoreValue: 15 },
                { key: 'g5_supportTexts', label: 'Textos de Apoio', description: 'Quantidade', scoreValue: 5 }
            ]
        },
        {
            id: 'g6', title: '6. Investigação', maxPoints: 35, items: [
                { key: 'g6_publishedArticles', label: 'Artigos Publicados', description: 'Quantidade', scoreValue: 7 },
                { key: 'g6_eventsComms', label: 'Comunicações em Eventos', description: 'Quantidade', scoreValue: 3 },
                { key: 'g6_individualProjects', label: 'Projetos Individuais', description: 'Quantidade', scoreValue: 4 },
                { key: 'g6_collectiveProjects', label: 'Projetos Coletivos', description: 'Quantidade', scoreValue: 4 }
            ]
        },
        {
            id: 'g7', title: '7. Extensão', maxPoints: 40, items: [
                { key: 'g7_collaboration', label: 'Colaboração com Comunidade', description: 'Nº Atividades', scoreValue: 5 },
                { key: 'g7_institutionalTeams', label: 'Equipas Institucionais', description: 'Nº Equipas', scoreValue: 5 }
            ]
        },
        {
            id: 'g8', title: '8. Administração', maxPoints: 45, items: [
                { key: 'g8_adminHours', label: 'Cargos de Administração', description: 'Nº Cargos', scoreValue: 10 }
            ]
        }
    ]
};

export interface SubjectWithTeacher extends Subject {
    teacherName: string;
}

export interface GroupedComments {
    subjectName: string;
    classGroup: string;
    shift: string;
    comments: string[];
}

const getTable = <T>(key: string): T[] => {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
};
const setTable = <T>(key: string, data: T[]) => localStorage.setItem(key, JSON.stringify(data));

// Cálculo robusto que suporta chaves dinâmicas, mas tenta respeitar lógica padrão se disponível
const calculateSelfEvalScoreInternal = (evalData: SelfEvaluation): number => {
    if (!evalData || !evalData.answers) return 0;
    
    // Simplificação para backend: soma valores brutos (idealmente deveria ter o template aqui)
    // Assumimos uma média ponderada segura caso o template não esteja acessível neste contexto
    const values = Object.values(evalData.answers);
    const sum = values.reduce((acc, val) => acc + (val || 0), 0);
    
    // Heurística para evitar notas absurdas se o template mudou
    return Math.min(sum * 2, 175); 
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
        // LOCAL MODE
        if (!supabase) {
            let users = getTable<any>(DB_KEYS.USERS); // Use any to access password
            
            // Auto-seed Super Admin if no users exist
            if (users.length === 0) {
                const hashedAdminPwd = await bcrypt.hash('admin', 10);
                const adminUser = {
                    id: 'admin_01',
                    email: 'admin@sistema.mz',
                    name: 'Super Administrador',
                    role: UserRole.SUPER_ADMIN,
                    password: hashedAdminPwd,
                    approved: true
                };
                users = [adminUser];
                setTable(DB_KEYS.USERS, users);
                console.log("Super Admin seeded locally.");
            }

            const user = users.find(u => u.email === email);
            if (!user) return null;

            const isMatch = await bcrypt.compare(password || '', user.password);
            if (!isMatch) return null;

            // Remove password before returning/storing session
            const { password: _, ...safeUser } = user;
            
            localStorage.setItem(DB_KEYS.SESSION, JSON.stringify({ user: safeUser, token: 'local_token' }));
            return { user: safeUser as User, token: 'local_token' };
        }

        // SUPABASE MODE
        // Fetch user by email only first
        const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
        if (error || !data) return null;

        // Verify password
        const isMatch = await bcrypt.compare(password || '', data.password);
        if (!isMatch) return null;
        
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

    async getInstitutionSelfEvalTemplate(institutionId: string): Promise<SelfEvalTemplate> {
        const inst = await this.getInstitution(institutionId);
        return (inst && inst.selfEvalTemplate) ? inst.selfEvalTemplate : DEFAULT_SELF_EVAL_TEMPLATE;
    },

    async saveInstitutionSelfEvalTemplate(institutionId: string, template: SelfEvalTemplate) {
        await this.updateInstitution(institutionId, { selfEvalTemplate: template });
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
        const hashedPassword = await bcrypt.hash(password || '123456', 10);
        const newUser = { id: `u_${Date.now()}`, email, name, role: UserRole.INSTITUTION_MANAGER, institutionId, approved: true, password: hashedPassword, mustChangePassword: !!password };
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

    async addCourse(institutionId: string, name: string, code: string, duration?: number, semester?: string, modality?: 'Presencial' | 'Online', classGroups?: string[], subjects?: Partial<Subject>[]): Promise<Course> {
        const newCourse: Course = { id: `c_${Date.now()}`, institutionId, name, code, duration, semester, modality, classGroups };
        if (!supabase) {
            const courses = getTable<Course>(DB_KEYS.COURSES);
            setTable(DB_KEYS.COURSES, [...courses, newCourse]);
            
            if (subjects && subjects.length > 0) {
                 const allSubjects = getTable<Subject>(DB_KEYS.SUBJECTS);
                 const newSubjects = subjects.map(s => ({
                     ...s,
                     id: `s_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                     course: newCourse.name,
                     institutionId,
                     academicYear: new Date().getFullYear().toString(),
                     teacherId: '', // No teacher initially
                     modality: newCourse.modality,
                     teacherCategory: 'assistente'
                 } as Subject));
                 setTable(DB_KEYS.SUBJECTS, [...allSubjects, ...newSubjects]);
            }
            return newCourse;
        }
        
        // Supabase Transaction Simulation
        const { data, error } = await supabase.from('courses').insert([newCourse]).select().single();
        if (error || !data) {
            throw new Error(error?.message || "Erro ao adicionar curso");
        }

        if (subjects && subjects.length > 0) {
            try {
                const subjectsToInsert: any[] = [];
                
                // If classGroups are defined, create subjects for EACH class group.
                // If not, default to 'A'.
                const groupsToCreate = (classGroups && classGroups.length > 0) ? classGroups : ['A'];

                groupsToCreate.forEach(group => {
                    subjects.forEach(s => {
                        subjectsToInsert.push({
                            name: s.name,
                            code: s.code || `${newCourse.code}-${s.level}-${s.semester}`,
                            teacherId: null,
                            institutionId,
                            academicYear: new Date().getFullYear().toString(),
                            level: s.level,
                            semester: s.semester,
                            course: newCourse.name,
                            classGroup: group,
                            shift: 'Diurno', // Default, can be changed later
                            modality: newCourse.modality,
                            teacherCategory: 'assistente'
                        });
                    });
                });
                
                const { error: subError } = await supabase.from('subjects').insert(subjectsToInsert);
                if (subError) throw subError;
                
            } catch (subErr: any) {
                // Rollback: Delete the course
                await supabase.from('courses').delete().eq('id', data.id);
                throw new Error("Erro ao adicionar disciplinas do curso. O curso foi removido. Detalhes: " + subErr.message);
            }
        }

        return data as Course;
    },

    async deleteCourse(id: string) {
        if (!supabase) {
            const courses = getTable<Course>(DB_KEYS.COURSES);
            const courseToDelete = courses.find(c => c.id === id);
            
            if (courseToDelete) {
                // Cascade Delete: Remover disciplinas associadas ao curso
                const subjects = getTable<Subject>(DB_KEYS.SUBJECTS);
                const remainingSubjects = subjects.filter(s => s.course !== courseToDelete.name);
                setTable(DB_KEYS.SUBJECTS, remainingSubjects);
                
                // Remover o curso
                setTable(DB_KEYS.COURSES, courses.filter(c => c.id !== id));
            }
            return;
        }
        
        // Supabase Cascade (Simulado via código pois não temos acesso a triggers/FKs do banco real aqui)
        const { data: course } = await supabase.from('courses').select('name').eq('id', id).single();
        if (course) {
            await supabase.from('subjects').delete().eq('course', course.name);
        }
        await supabase.from('courses').delete().eq('id', id);
    },
    // --------------

    async addTeacher(institutionId: string, name: string, email: string, password?: string, avatar?: string, category?: TeacherCategory, courses?: string[]) {
        // Validação de Duplicidade de Email
        const existingUsers = await this.getUsers();
        if (existingUsers.some(u => u.email === email)) {
            throw new Error("Este email já está cadastrado no sistema.");
        }

        const hashedPassword = await bcrypt.hash(password || '123456', 10);
        const newUser = { id: `u_${Date.now()}`, email, name, role: UserRole.TEACHER, institutionId, approved: true, password: hashedPassword, avatar, category, mustChangePassword: !!password, jobTitle: 'Docente' };
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
        // Validação de Duplicidade de Email
        const existingUsers = await this.getUsers();
        if (existingUsers.some(u => u.email === email)) {
            throw new Error("Este email já está cadastrado no sistema.");
        }

        const hashedPassword = await bcrypt.hash(password || '123456', 10);
        const newUser = { 
            id: `s_${Date.now()}`, 
            email, 
            name, 
            role: UserRole.STUDENT, 
            institutionId, 
            approved: true, 
            password: hashedPassword, 
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
        // Se ID for fornecido e não for temporário, tenta atualizar diretamente
        if (data.id && !data.id.startsWith('temp_') && !data.id.startsWith('sub_')) {
             // Nota: 'sub_' é prefixo de ID real gerado por nós no mock, mas 'temp_' é front-end.
             // Se vier do banco, já tem ID.
             if (!supabase) {
                 const allSubs = getTable<Subject>(DB_KEYS.SUBJECTS);
                 const existing = allSubs.find(s => s.id === data.id);
                 if (existing) {
                     const updated = { ...existing, teacherId: data.teacherId, teacherCategory: data.teacherCategory, shift: data.shift || existing.shift };
                     setTable(DB_KEYS.SUBJECTS, allSubs.map(s => s.id === data.id ? updated : s));
                     return updated;
                 }
             } else {
                 const { data: res, error } = await supabase.from('subjects')
                     .update({ teacherId: data.teacherId, teacherCategory: data.teacherCategory, shift: data.shift }) // Update shift too if changed
                     .eq('id', data.id)
                     .select()
                     .single();
                 if (!error && res) return res;
             }
        }

        // Validação de Duplicidade (Mesmo código, turma e ano)
        const subjects = await this.getInstitutionSubjects(data.institutionId);
        const existingSubject = subjects.find(s => 
            (s.code === data.code || s.name === data.name) && 
            s.classGroup === data.classGroup && 
            s.course === data.course &&
            s.academicYear === data.academicYear
        );
        
        if (existingSubject) {
            // Se já existe e tem professor, avisa (ou sobrescreve se for a intenção, mas por segurança vamos avisar)
            if (existingSubject.teacherId && existingSubject.teacherId !== data.teacherId) {
                // Opcional: Permitir sobrescrever? Por enquanto vamos lançar erro para evitar acidentes
                // throw new Error(`A disciplina ${existingSubject.name} (${existingSubject.classGroup}) já está atribuída a outro docente.`);
                
                // ALTERNATIVA: Atualizar mesmo assim (re-atribuição)
                console.log(`Reatribuindo disciplina ${existingSubject.name} para novo docente.`);
            }

            // Update existing
            if (!supabase) {
                const allSubs = getTable<Subject>(DB_KEYS.SUBJECTS);
                const updated = { ...existingSubject, teacherId: data.teacherId, teacherCategory: data.teacherCategory, shift: data.shift || existingSubject.shift };
                setTable(DB_KEYS.SUBJECTS, allSubs.map(s => s.id === existingSubject.id ? updated : s));
                return updated;
            } else {
                const { data: res, error } = await supabase.from('subjects')
                    .update({ teacherId: data.teacherId, teacherCategory: data.teacherCategory, shift: data.shift || existingSubject.shift })
                    .eq('id', existingSubject.id)
                    .select()
                    .single();
                if (error) throw error;
                return res;
            }
        }

        const newItem = { ...data, id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` };
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
            const users = getTable<User>(DB_KEYS.USERS);
            const teacherIds = users.filter(u => u.institutionId === institutionId && u.role === UserRole.TEACHER).map(u => u.id);
            const scores = getTable<CombinedScore>(DB_KEYS.SCORES);
            return scores.filter(s => teacherIds.includes(s.teacherId));
        }
        const { data } = await supabase.from('scores').select('*');
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
        // Validação de Voto Duplicado (Integridade)
        // Verifica se já existe uma resposta deste aluno para esta disciplina
        if (!supabase) {
            const resps = getTable<any>(DB_KEYS.RESPONSES);
            const alreadyVoted = resps.some(r => r._local_userId === userId && r.subjectId === response.subjectId);
            if (alreadyVoted) {
                throw new Error("Você já avaliou esta disciplina.");
            }

            // Em modo local, armazenamos o userId dentro da resposta para rastreamento (simulação)
            setTable(DB_KEYS.RESPONSES, [...resps, { ...response, _local_userId: userId }]);
            return;
        }
        
        // Em Supabase, tentamos verificar duplicidade se possível
        // Como a tabela responses é anônima, confiamos no client-side ou numa tabela auxiliar se existisse.
        // Para reforçar, vamos inserir.
        const cleanResponse = { ...response, answers: response.answers };
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

    // =========================================================================
    //  Função para obter comentários textuais agrupados por Disciplina
    // =========================================================================
    async getTeacherComments(teacherId: string, institutionId: string): Promise<GroupedComments[]> {
        let allResponses: any[] = [];
        let subjects: Subject[] = [];

        if (!supabase) {
            allResponses = getTable<StudentResponse>(DB_KEYS.RESPONSES).filter(r => r.teacherId === teacherId);
            subjects = getTable<Subject>(DB_KEYS.SUBJECTS).filter(s => s.institutionId === institutionId);
        } else {
             const { data: r } = await supabase.from('responses').select('*').eq('teacherId', teacherId).eq('institutionId', institutionId);
             allResponses = r || [];
             const { data: s } = await supabase.from('subjects').select('*').eq('institutionId', institutionId);
             subjects = s || [];
        }

        const subjectGroups: Record<string, string[]> = {};
        
        allResponses.forEach(resp => {
            const sId = resp.subjectId || 'unknown';
            if (!subjectGroups[sId]) subjectGroups[sId] = [];
            
            const answers = resp.answers || [];
            answers.forEach((ans: any) => {
                if (typeof ans.value === 'string' && ans.value.length > 3 && isNaN(Number(ans.value))) {
                    subjectGroups[sId].push(ans.value);
                }
            });
        });

        const groupedComments: GroupedComments[] = Object.keys(subjectGroups).map(sId => {
            const subject = subjects.find(s => s.id === sId);
            return {
                subjectName: subject?.name || (sId === 'general' ? 'Geral' : 'Disciplina Desconhecida'),
                classGroup: subject?.classGroup || 'N/A',
                shift: subject?.shift || 'N/A',
                comments: subjectGroups[sId]
            };
        }).filter(group => group.comments.length > 0);

        return groupedComments;
    },

    async calculateScores(institutionId: string, teacherId?: string) {
        console.log(`Calculando scores para Instituição: ${institutionId}, Alvo: ${teacherId || 'TODOS'}`);
        
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
             
             let rQuery = supabase.from('responses').select('*').eq('institutionId', institutionId);
             if (teacherId) rQuery = rQuery.eq('teacherId', teacherId);
             const { data: r } = await rQuery;
             allResponses = r || [];

             let tQuery = supabase.from('users').select('*').eq('role', 'teacher').eq('institutionId', institutionId);
             if (teacherId) tQuery = tQuery.eq('id', teacherId);
             const { data: t } = await tQuery;
             teachers = (t || []) as User[];
        }

        // --- LÓGICA DE MÉDIA PONDERADA (WEIGHTED AVERAGE) ---
        const calculateWeightedAverage = (resps: any[]) => {
            if (resps.length === 0) return 0;
            
            // Mapa de pesos das perguntas padrão
            const questionWeights = new Map(PDF_STANDARD_QUESTIONS.map(q => [q.id, q.weight || 1]));
            
            // Soma total dos pesos possíveis (para normalização)
            // Ex: 4+3+2+6 + 1+1+1 + 5+3+4 = 30 pontos possíveis
            const maxPossibleWeight = PDF_STANDARD_QUESTIONS.reduce((acc, q) => acc + (q.weight || 1), 0);
            
            let totalNormalizedScore = 0;

            resps.forEach(resp => {
                let currentScore = 0;
                let currentMaxWeight = 0;

                const answers = resp.answers || [];
                answers.forEach((a: any) => {
                    const weight = questionWeights.get(a.questionId) || 1; // Default peso 1 se não encontrado
                    const val = Number(a.value) || 0; 
                    
                    // Se a pergunta for binária (0 ou 1), o valor é direto.
                    // Se for escala (ex: estrelas 1-5), precisaríamos normalizar o valor para 0-1 antes de multiplicar pelo peso?
                    // Assumindo que o frontend envia 1 para Sim (100%) e 0 para Não (0%).
                    // Se for estrelas (1-5), o valor deve ser normalizado (val/5).
                    // Para simplificar e manter compatibilidade com o sistema atual que usa binário majoritariamente:
                    
                    currentScore += val * weight;
                    currentMaxWeight += weight;
                });
                
                // Normaliza a resposta deste aluno para a escala de 0 a 20 valores
                // Ex: Obteve 15 pontos de 30 possíveis -> (15/30) * 20 = 10 valores.
                if (currentMaxWeight > 0) {
                     totalNormalizedScore += (currentScore / currentMaxWeight) * 20;
                }
            });

            // Retorna a média das notas normalizadas (0-20) de todos os alunos
            return totalNormalizedScore / resps.length;
        };

        for (const t of teachers) {
            // Obter template atualizado da instituição para cálculo preciso
            const template = await this.getInstitutionSelfEvalTemplate(institutionId);
            
            const selfEval = !supabase 
                ? getTable<SelfEvaluation>(DB_KEYS.SELF_EVALS).find(s => s.teacherId === t.id)
                : (await supabase.from('self_evals').select('*').eq('teacherId', t.id).maybeSingle()).data;
            
            // CÁLCULO DINÂMICO BASEADO NO TEMPLATE DA INSTITUIÇÃO
            let selfScore = 0;
            if (selfEval && selfEval.answers) {
                // Itera sobre os grupos e itens do template
                template.groups.forEach(group => {
                    // Check exclusion
                    if (group.exclusiveTo && group.exclusiveTo.length > 0 && t.category && !group.exclusiveTo.includes(t.category)) return;

                    group.items.forEach(item => {
                        // Check exclusion
                        if (item.exclusiveTo && item.exclusiveTo.length > 0 && t.category && !item.exclusiveTo.includes(t.category)) return;

                        const answerValue = selfEval.answers[item.key] || 0;
                        const scoreValue = item.scoreValue || 0;
                        
                        // Calcula pontos para este item
                        let itemPoints = answerValue * scoreValue;
                        
                        // Se for taxa de aprovação (percentagem), o scoreValue já deve ser o fator (ex: 0.05)
                        if (item.key === 'g4_passRate') {
                            itemPoints = (answerValue) * scoreValue; 
                        }
                        
                        selfScore += itemPoints;
                    });
                });
                // Cap no limite máximo (ex: 175)
                const maxScore = t.category === 'assistente_estagiario' ? 125 : 175;
                selfScore = Math.min(selfScore, maxScore);
            }

            const qualEval = !supabase
                ? getTable<QualitativeEval>(DB_KEYS.QUAL_EVALS).find(q => q.teacherId === t.id)
                : (await supabase.from('qualitative_evals').select('*').eq('teacherId', t.id).maybeSingle()).data;
            const instScore = qualEval ? ((qualEval.deadlineCompliance || 0) + (qualEval.workQuality || 0)) / 2 : 0;

            const teacherResponses = allResponses.filter(r => r.teacherId === t.id);
            
            const subjectGroups: Record<string, any[]> = {};
            teacherResponses.forEach(r => {
                const sId = r.subjectId || 'unknown';
                if (!subjectGroups[sId]) subjectGroups[sId] = [];
                subjectGroups[sId].push(r);
            });

            const subjectDetails: SubjectScoreDetail[] = Object.keys(subjectGroups).map(sId => {
                const subResps = subjectGroups[sId];
                const subjectInfo = subjects.find(s => s.id === sId);
                return {
                    subjectName: subjectInfo?.name || 'Disciplina Desconhecida',
                    classGroup: subjectInfo?.classGroup || 'N/A',
                    shift: subjectInfo?.shift || 'N/A',
                    course: subjectInfo?.course || 'Geral',
                    score: calculateWeightedAverage(subResps),
                    responseCount: subResps.length
                };
            });

            const studentAvg = calculateWeightedAverage(teacherResponses);
            const finalScore = selfScore + studentAvg + instScore;

            const newScore: CombinedScore = {
                teacherId: t.id,
                studentScore: studentAvg,
                institutionalScore: instScore,
                selfEvalScore: selfScore,
                finalScore: finalScore,
                lastCalculated: new Date().toISOString(),
                subjectDetails: subjectDetails
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

    async getStudentProgress(studentId: string): Promise<{ completed: number, pending: number, history: any[], evaluatedSubjectIds: string[] }> {
        let evaluatedSubjectIds: string[] = [];
        
        if (!supabase) {
             const resps = getTable<any>(DB_KEYS.RESPONSES);
             // No modo local, usamos a flag _local_userId inserida no submitAnonymousResponse
             evaluatedSubjectIds = resps.filter(r => r._local_userId === studentId).map(r => r.subjectId);
        } else {
            // Em modo Supabase, como a tabela 'responses' é anônima,
            // idealmente usaríamos uma tabela 'votes_tracker' (userId, subjectId).
            // Para manter compatibilidade com o schema atual sem migrações complexas,
            // vamos retornar vazio ou simular baseado em LocalStorage do lado do cliente se persistido.
            // *Solução Pragmática:* Assumimos que o frontend vai controlar isso visualmente por enquanto,
            // ou que não há persistência de "Visto" entre sessões em máquinas diferentes para anonimato total.
            // Contudo, se quisermos persistência:
            // const { data } = await supabase.from('votes_tracker').select('subjectId').eq('userId', studentId);
            // evaluatedSubjectIds = data?.map(d => d.subjectId) || [];
            
            // Como não temos 'votes_tracker' no schema, retornamos vazio para segurança.
            // O frontend pode usar localStorage 'my_votes' como fallback se desejar.
            evaluatedSubjectIds = [];
        }
        
        return { 
            completed: evaluatedSubjectIds.length, 
            pending: 0, 
            history: [],
            evaluatedSubjectIds
        };
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
