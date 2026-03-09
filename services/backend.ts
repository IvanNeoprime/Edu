
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
    url: 'https://hpdyncnatkukovtflzwv.supabase.co', 
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwZHluY25hdGt1a292dGZsend2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MTQ3NjYsImV4cCI6MjA4ODI5MDc2Nn0.ToSUVFnWxV0mTSr6wTDw38ajBloaUJJCedWmIMH3-8U'
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
    subscribeToChanges(table: string, callback: (payload: any) => void) {
        if (!supabase) return { unsubscribe: () => {} };
        
        const channel = supabase
            .channel(`public:${table}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: table }, callback)
            .subscribe();

        return {
            unsubscribe: () => {
                supabase?.removeChannel(channel);
            }
        };
    },

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
        // Ensure default admin exists (Seed if missing, not just if table is empty)
        const { data: adminUser } = await supabase.from('users').select('id').eq('email', 'admin@sistema.mz').maybeSingle();
        
        if (!adminUser) {
            const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
            // Only seed if table is empty OR if we want to force-ensure admin (Let's force ensure for safety in this demo)
            if (count === 0 || true) { 
                const hashedAdminPwd = await bcrypt.hash('admin', 10);
                await supabase.from('users').insert([{
                    id: 'admin_default',
                    email: 'admin@sistema.mz',
                    name: 'Super Administrador',
                    role: UserRole.SUPER_ADMIN,
                    password: hashedAdminPwd,
                    approved: true
                }]);
                console.log("Default Admin (admin@sistema.mz) seeded in Supabase.");
            }
        }

        // Fetch user by email (Case Insensitive)
        const { data, error } = await supabase.from('users').select('*').ilike('email', email).maybeSingle();
        
        if (error) {
            console.error("Supabase Login Error:", error);
            throw new Error("Erro de conexão com o banco de dados.");
        }
        
        if (!data) {
            console.warn("Login: User not found via Supabase for", email);
            return null;
        }

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
        email = email.toLowerCase().trim();
        
        // Check duplicate
        const existing = await this.getUsers();
        if (existing.some(u => u.email.toLowerCase() === email)) throw new Error("Email já cadastrado.");

        const hashedPassword = await bcrypt.hash(password || '123456', 10);
        const newUser = { 
            id: `u_${Date.now()}`, 
            email, 
            name, 
            role: UserRole.INSTITUTION_MANAGER, 
            institutionId, 
            approved: true, 
            password: hashedPassword, 
            mustChangePassword: !!password,
            plainPassword: password || '123456' // Store plain password for admin view
        };
        if (!supabase) {
            const users = getTable<User>(DB_KEYS.USERS);
            setTable(DB_KEYS.USERS, [...users, newUser]);
            return newUser;
        }
        
        // Remove plainPassword before sending to Supabase if column doesn't exist yet
        // Or better, just don't send it if we can't guarantee the schema update ran.
        // However, the user requested to see passwords. 
        // The error "Could not find the 'plainPassword' column" means the migration didn't run on the remote DB.
        // We will try to insert it, but if it fails, we fallback to inserting without it.
        
        try {
             const { data, error } = await supabase.from('users').insert([newUser]).select().single();
             if (error) throw error;
             return data as User;
        } catch (e: any) {
            // If error is about missing column, try again without it
            if (e.message?.includes('plainPassword') || e.code === '42703') {
                console.warn("Column plainPassword missing in DB. Inserting without it.");
                const { plainPassword, ...userWithoutPlain } = newUser;
                const { data, error } = await supabase.from('users').insert([userWithoutPlain]).select().single();
                if (error) throw new Error(error.message);
                return data as User;
            }
            throw new Error(e.message);
        }
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
                    subjects.forEach((s, index) => {
                        subjectsToInsert.push({
                            id: `s_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID
                            name: s.name,
                            code: s.code || `${newCourse.code}-${s.level}-${s.semester}`,
                            teacherId: null,
                            institutionId,
                            academicYear: new Date().getFullYear().toString(),
                            level: s.level,
                            semester: s.semester,
                            course: newCourse.name,
                            courseId: newCourse.id, // Link to the course ID
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
        email = email.toLowerCase().trim();

        // Validação de Duplicidade de Email
        const existingUsers = await this.getUsers();
        if (existingUsers.some(u => u.email.toLowerCase() === email)) {
            throw new Error("Este email já está cadastrado no sistema.");
        }

        const hashedPassword = await bcrypt.hash(password || '123456', 10);
        const newUser = { 
            id: `u_${Date.now()}`, 
            email, 
            name, 
            role: UserRole.TEACHER, 
            institutionId, 
            approved: true, 
            password: hashedPassword, 
            avatar, 
            category, 
            mustChangePassword: !!password, 
            jobTitle: 'Docente',
            plainPassword: password || '123456' // Store plain password for admin view
        };
        if (!supabase) {
            const users = getTable<User>(DB_KEYS.USERS);
            setTable(DB_KEYS.USERS, [...users, newUser]);
            return newUser;
        }
        try {
            const { data, error } = await supabase.from('users').insert([newUser]).select().single();
            if (error) throw error;
            return data as User;
        } catch (e: any) {
            if (e.message?.includes('plainPassword') || e.code === '42703') {
                console.warn("Column plainPassword missing in DB. Inserting without it.");
                const { plainPassword, ...userWithoutPlain } = newUser;
                const { data, error } = await supabase.from('users').insert([userWithoutPlain]).select().single();
                if (error) throw new Error(error.message);
                return data as User;
            }
            throw new Error(e.message);
        }
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
        email = email.toLowerCase().trim();

        // Validação de Duplicidade de Email
        const existingUsers = await this.getUsers();
        if (existingUsers.some(u => u.email.toLowerCase() === email)) {
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
            mustChangePassword: !!password,
            plainPassword: password || '123456' // Store plain password for admin view
        };
        
        if (!supabase) {
            const users = getTable<User>(DB_KEYS.USERS);
            setTable(DB_KEYS.USERS, [...users, newUser]);
            return newUser;
        }
        try {
            const { data, error } = await supabase.from('users').insert([newUser]).select().single();
            if (error) throw error;
            return data as User;
        } catch (e: any) {
             if (e.message?.includes('plainPassword') || e.code === '42703') {
                console.warn("Column plainPassword missing in DB. Inserting without it.");
                const { plainPassword, ...userWithoutPlain } = newUser;
                const { data, error } = await supabase.from('users').insert([userWithoutPlain]).select().single();
                if (error) {
                    console.error("Supabase Error adding student (fallback):", error);
                    throw new Error(error.message);
                }
                return data as User;
            }
            console.error("Supabase Error adding student:", e);
            throw new Error(e.message);
        }
    },

    async deleteUser(id: string) {
        if (!supabase) {
            const users = getTable<User>(DB_KEYS.USERS);
            const userToDelete = users.find(u => u.id === id);
            
            if (userToDelete) {
                // Remove user
                setTable(DB_KEYS.USERS, users.filter(u => u.id !== id));

                if (userToDelete.role === UserRole.TEACHER) {
                    // Unassign subjects
                    const subjects = getTable<Subject>(DB_KEYS.SUBJECTS);
                    const updatedSubjects = subjects.map(s => {
                        if (s.teacherId === id) {
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            const { teacherId, ...rest } = s;
                            return { ...rest, teacherId: undefined };
                        }
                        return s;
                    });
                    setTable(DB_KEYS.SUBJECTS, updatedSubjects);

                    // Remove related data
                    const scores = getTable<CombinedScore>(DB_KEYS.SCORES);
                    setTable(DB_KEYS.SCORES, scores.filter(s => s.teacherId !== id));

                    const qualEvals = getTable<QualitativeEval>(DB_KEYS.QUAL_EVALS);
                    setTable(DB_KEYS.QUAL_EVALS, qualEvals.filter(e => e.teacherId !== id));

                    const selfEvals = getTable<SelfEvaluation>(DB_KEYS.SELF_EVALS);
                    setTable(DB_KEYS.SELF_EVALS, selfEvals.filter(e => e.teacherId !== id));
                }
            }
            return;
        }

        // Supabase Mode
        const { data: user } = await supabase.from('users').select('role').eq('id', id).single();
        
        if (user) {
            if (user.role === 'teacher') {
                // Unassign subjects
                await supabase.from('subjects').update({ teacherId: null }).eq('teacherId', id);
                
                // Remove related data
                await supabase.from('scores').delete().eq('teacherId', id);
                await supabase.from('qualitative_evals').delete().eq('teacherId', id);
                await supabase.from('self_evals').delete().eq('teacherId', id);
            }
            
            // Delete user
            await supabase.from('users').delete().eq('id', id);
        }
    },

    async getInstitutionSubjects(institutionId: string) {
        if (!supabase) return getTable<Subject>(DB_KEYS.SUBJECTS).filter(s => s.institutionId === institutionId);
        const { data } = await supabase.from('subjects').select('*').eq('institutionId', institutionId);
        return (data || []) as Subject[];
    },

    async unassignSubject(subjectId: string) {
        if (!supabase) {
            const allSubs = getTable<Subject>(DB_KEYS.SUBJECTS);
            const existing = allSubs.find(s => s.id === subjectId);
            if (existing) {
                const updated = { ...existing, teacherId: undefined, teacherCategory: undefined };
                setTable(DB_KEYS.SUBJECTS, allSubs.map(s => s.id === subjectId ? updated : s));
                return updated;
            }
            return null;
        }
        const { data, error } = await supabase.from('subjects')
            .update({ teacherId: null, teacherCategory: null })
            .eq('id', subjectId)
            .select()
            .single();
        if (error) throw error;
        return data;
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
             // Trigger Recalculation
             await this.calculateScores(data.institutionId || '', data.teacherId);
             return;
        }
        const cleanData = JSON.parse(JSON.stringify(data));
        await supabase.from('qualitative_evals').upsert(cleanData, { onConflict: 'teacherId' });
        // Trigger Recalculation
        if (data.institutionId) {
            await this.calculateScores(data.institutionId, data.teacherId);
        }
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
            // Trigger Recalculation
            await this.calculateScores(data.institutionId, data.teacherId);
            return;
        }
        const cleanData = JSON.parse(JSON.stringify(data));
        await supabase.from('self_evals').upsert(cleanData, { onConflict: 'teacherId' });
        // Trigger Recalculation
        await this.calculateScores(data.institutionId, data.teacherId);
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
            setTable(DB_KEYS.RESPONSES, [...resps, { 
                ...response, 
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                _local_userId: userId 
            }]);
            
            // Trigger Recalculation
            if (response.institutionId) {
                await this.calculateScores(response.institutionId, response.teacherId);
            }
            return;
        }
        
        // Em Supabase, tentamos verificar duplicidade se possível
        const { data: existingVote } = await supabase.from('votes_tracker')
            .select('id')
            .eq('userId', userId)
            .eq('subjectId', response.subjectId)
            .eq('evaluationPeriodName', response.evaluationPeriodName || 'default')
            .maybeSingle();
            
        if (existingVote) {
            throw new Error("Você já avaliou esta disciplina neste período.");
        }

        const cleanResponse = { 
            ...response, 
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            answers: response.answers,
            evaluationPeriodName: response.evaluationPeriodName || 'default'
        };
        
        // Remove undefined fields to prevent Supabase errors
        if (cleanResponse.teacherId === undefined) delete cleanResponse.teacherId;
        if (cleanResponse.subjectId === undefined) delete cleanResponse.subjectId;

        const { error } = await supabase.from('responses').insert([cleanResponse]);
        
        if (error) throw new Error(error.message);

        // Recalcular scores após nova resposta
        try {
            await this.calculateScores(response.institutionId, response.teacherId);
        } catch (e) {
            console.error("Erro ao recalcular scores:", e);
        }

        // Insert into votes_tracker
        const { error: voteError } = await supabase.from('votes_tracker').insert([{
            userId,
            subjectId: response.subjectId,
            institutionId: response.institutionId,
            evaluationPeriodName: response.evaluationPeriodName || 'default'
        }]);

        if (voteError) {
            console.error("Erro ao registrar voto:", voteError);
            throw new Error("Erro ao registrar voto: " + voteError.message);
        }

        // Trigger Recalculation
        if (response.institutionId) {
            await this.calculateScores(response.institutionId, response.teacherId);
        }
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
        let currentPeriod = 'default';

        if (!supabase) {
            const insts = getTable<Institution>(DB_KEYS.INSTITUTIONS);
            const inst = insts.find(i => i.id === institutionId);
            if (inst && inst.evaluationPeriodName) currentPeriod = inst.evaluationPeriodName;

            allResponses = getTable<StudentResponse>(DB_KEYS.RESPONSES).filter(r => r.teacherId === teacherId && (r.evaluationPeriodName === currentPeriod || !r.evaluationPeriodName));
            subjects = getTable<Subject>(DB_KEYS.SUBJECTS).filter(s => s.institutionId === institutionId);
        } else {
             const { data: instData } = await supabase.from('institutions').select('evaluationPeriodName').eq('id', institutionId).maybeSingle();
             if (instData && instData.evaluationPeriodName) currentPeriod = instData.evaluationPeriodName;

             const { data: r } = await supabase.from('responses').select('*').eq('teacherId', teacherId).eq('institutionId', institutionId).eq('evaluationPeriodName', currentPeriod);
             allResponses = r || [];
             const { data: s } = await supabase.from('subjects').select('*').eq('institutionId', institutionId);
             subjects = s || [];
        }

        const subjectGroups: Record<string, string[]> = {};
        
        allResponses.forEach(resp => {
            const sId = resp.subjectId || 'unknown';
            if (!subjectGroups[sId]) subjectGroups[sId] = [];
            
            let answers = resp.answers || [];
            if (typeof answers === 'string') {
                try { answers = JSON.parse(answers); } catch (e) { answers = []; }
            }
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
        let questionnaire: Questionnaire | null = null;
        let hasResponsesError = false;
        let currentPeriod = 'default';
        
        if (!supabase) {
             const insts = getTable<Institution>(DB_KEYS.INSTITUTIONS);
             const inst = insts.find(i => i.id === institutionId);
             if (inst && inst.evaluationPeriodName) currentPeriod = inst.evaluationPeriodName;

             subjects = getTable<Subject>(DB_KEYS.SUBJECTS);
             allResponses = getTable<StudentResponse>(DB_KEYS.RESPONSES).filter(r => r.evaluationPeriodName === currentPeriod || !r.evaluationPeriodName);
             const users = getTable<User>(DB_KEYS.USERS);
             teachers = teacherId 
                ? [users.find(u => u.id === teacherId)!].filter(Boolean)
                : users.filter(u => u.institutionId === institutionId && u.role === UserRole.TEACHER);
             
             // Load questionnaire locally
             const quests = getTable<Questionnaire>(DB_KEYS.QUESTIONNAIRES);
             questionnaire = quests.find(q => q.institutionId === institutionId && q.active) || null;

        } else {
             const { data: instData } = await supabase.from('institutions').select('evaluationPeriodName').eq('id', institutionId).maybeSingle();
             if (instData && instData.evaluationPeriodName) currentPeriod = instData.evaluationPeriodName;

             const { data: s } = await supabase.from('subjects').select('*').eq('institutionId', institutionId);
             subjects = s || [];
             
             let rQuery = supabase.from('responses').select('*').eq('institutionId', institutionId).eq('evaluationPeriodName', currentPeriod);
             // REMOVED teacherId filter here to allow fallback logic to work for all responses
             // if (teacherId) rQuery = rQuery.eq('teacherId', teacherId); 
             const { data: r, error: rError } = await rQuery;
             if (rError) {
                 console.error("Erro ao buscar respostas (possível bloqueio de RLS):", rError);
                 hasResponsesError = true;
             }
             allResponses = r || [];
             console.log("Total de respostas encontradas:", allResponses.length);

             let tQuery = supabase.from('users').select('*').eq('role', 'teacher').eq('institutionId', institutionId);
             if (teacherId) tQuery = tQuery.eq('id', teacherId);
             const { data: t } = await tQuery;
             teachers = (t || []) as User[];

             // Load questionnaire from Supabase
             const { data: q } = await supabase.from('questionnaires').select('*').eq('institutionId', institutionId).eq('active', true).maybeSingle();
             questionnaire = q;
        }

        // Use standard questions if no custom questionnaire found
        let questionsToUse = questionnaire?.questions || PDF_STANDARD_QUESTIONS;
        if (typeof questionsToUse === 'string') {
            try { questionsToUse = JSON.parse(questionsToUse); } catch (e) { questionsToUse = PDF_STANDARD_QUESTIONS; }
        }
        const questionMap = new Map(questionsToUse.map((q: any) => [q.id, q]));

        // --- LÓGICA DE MÉDIA PONDERADA (WEIGHTED AVERAGE) ---
        const calculateWeightedAverage = (resps: any[]) => {
            console.log("Calculando média para", resps.length, "respostas");
            if (resps.length === 0) return 0;
            
            let totalNormalizedScore = 0;

            resps.forEach((resp, index) => {
                let currentScore = 0;
                let currentMaxWeight = 0;

                let answers = resp.answers || [];
                if (typeof answers === 'string') {
                    try { answers = JSON.parse(answers); } catch (e) { answers = []; }
                }
                
                console.log(`Resposta ${index} tem ${answers.length} respostas`);
                
                answers.forEach((a: any) => {
                    const q = questionMap.get(a.questionId);
                    const weight = q?.weight || 1; 
                    let val = Number(a.value) || 0; 
                    
                    // Normalização baseada no tipo de pergunta
                    if (q?.type === 'stars') {
                        // Estrelas 1-5 -> Normaliza para 0-1
                        val = val / 5;
                    } else if (q?.type === 'scale_10') {
                        // Escala 0-10 -> Normaliza para 0-1
                        val = val / 10;
                    } else if (q?.type === 'binary') {
                        // Binary já é 0 ou 1, não precisa normalizar, mas garante que é número
                        val = val ? 1 : 0;
                    }
                    
                    currentScore += val * weight;
                    currentMaxWeight += weight;
                });
                
                // Normaliza a resposta deste aluno para a escala de 0 a 20 valores
                if (currentMaxWeight > 0) {
                     const studentScore = (currentScore / currentMaxWeight) * 20;
                     console.log(`Resposta ${index} score: ${studentScore}`);
                     totalNormalizedScore += studentScore;
                }
            });

            // Retorna a média das notas normalizadas (0-20) de todos os alunos
            const finalAvg = totalNormalizedScore / resps.length;
            console.log("Média final calculada:", finalAvg);
            return finalAvg;
        };

        for (const t of teachers) {
            // Obter template atualizado da instituição para cálculo preciso
            const template = await this.getInstitutionSelfEvalTemplate(institutionId);
            
            const selfEval = !supabase 
                ? getTable<SelfEvaluation>(DB_KEYS.SELF_EVALS).find(s => s.teacherId === t.id)
                : (await supabase.from('self_evals').select('*').eq('teacherId', t.id).maybeSingle()).data;
            
            // CÁLCULO DINÂMICO BASEADO NO TEMPLATE DA INSTITUIÇÃO
            const maxSelfScore = t.category === 'assistente_estagiario' ? 125 : 175;
            
            // As auto-avaliações dos docentes devem ser full mark (nota máxima) conforme solicitado.
            // Ignoramos o cálculo detalhado e atribuímos o teto estabelecido.
            let selfScoreRaw = maxSelfScore;

            const qualEval = !supabase
                ? getTable<QualitativeEval>(DB_KEYS.QUAL_EVALS).find(q => q.teacherId === t.id)
                : (await supabase.from('qualitative_evals').select('*').eq('teacherId', t.id).maybeSingle()).data;
            
            console.log(`QualEval para professor ${t.id}:`, qualEval);
            
            // Pontuação Institucional (0 a 10)
            const instScoreRaw = qualEval ? ((qualEval.deadlineCompliance || 0) + (qualEval.workQuality || 0)) / 2 : 0;

            // Filter responses for this teacher, with fallback for missing teacherId using subjectId
            const teacherResponses = allResponses.filter(r => {
                if (r.teacherId === t.id) return true;
                if (!r.teacherId && r.subjectId) {
                    const sub = subjects.find(s => s.id === r.subjectId);
                    return sub?.teacherId === t.id;
                }
                return false;
            });
            
            console.log(`Professor ${t.id} (${t.name}) tem ${teacherResponses.length} respostas filtradas.`);
            
            const subjectGroups: Record<string, any[]> = {};
            teacherResponses.forEach(r => {
                const sId = r.subjectId || 'unknown';
                if (!subjectGroups[sId]) subjectGroups[sId] = [];
                subjectGroups[sId].push(r);
            });
            
            console.log(`Professor ${t.id} tem ${Object.keys(subjectGroups).length} grupos de disciplinas.`);

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

            // Média dos estudantes (0 a 20)
            let studentAvgRaw = calculateWeightedAverage(teacherResponses);
            let finalSubjectDetails = subjectDetails;

            // Se houve erro de RLS ao buscar respostas, preservamos a nota de estudante anterior
            if (hasResponsesError && supabase) {
                const { data: existingScore } = await supabase.from('scores').select('studentScore, subjectDetails').eq('teacherId', t.id).maybeSingle();
                if (existingScore) {
                    studentAvgRaw = existingScore.studentScore || 0;
                    finalSubjectDetails = existingScore.subjectDetails || [];
                }
            }

            // --- NORMALIZAÇÃO PARA PESOS (80% / 12% / 8%) ---
            // Escala Final: 0 a 100% (ou 0 a 100 pontos)
            const selfWeight = 0.80;
            const studentWeight = 0.12;
            const instWeight = 0.08;

            const selfNormalized = (selfScoreRaw / maxSelfScore) * (selfWeight * 100);
            const studentNormalized = (studentAvgRaw / 20) * (studentWeight * 100);
            const instNormalized = (instScoreRaw / 10) * (instWeight * 100);

            const finalScore = selfNormalized + studentNormalized + instNormalized;

            const newScore: CombinedScore = {
                teacherId: t.id,
                studentScore: studentAvgRaw, // Mantemos o valor bruto (0-20) para o relatório
                institutionalScore: instScoreRaw, // Mantemos o valor bruto (0-10) para o relatório
                selfEvalScore: selfScoreRaw, // Mantemos o valor bruto (0-175) para o relatório
                finalScore: finalScore, // Nota final ponderada (0-100)
                lastCalculated: new Date().toISOString(),
                subjectDetails: finalSubjectDetails
            };

            if (!supabase) {
                const scores = getTable<CombinedScore>(DB_KEYS.SCORES);
                const idx = scores.findIndex(s => s.teacherId === t.id);
                if (idx >= 0) scores[idx] = newScore;
                else scores.push(newScore);
                setTable(DB_KEYS.SCORES, scores);
            } else {
                const { error } = await supabase.from('scores').upsert(newScore, { onConflict: 'teacherId' });
                if (error) {
                    console.error("Erro ao salvar pontuações no Supabase:", error);
                }
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
        const hashedPassword = await bcrypt.hash(newPassword || '', 10);
        
        if (!supabase) {
            const users = getTable<User>(DB_KEYS.USERS);
            setTable(DB_KEYS.USERS, users.map(u => u.id === userId ? { ...u, password: hashedPassword, mustChangePassword: false } : u));
            return;
        }
        const { error } = await supabase.from('users').update({ password: hashedPassword, mustChangePassword: false }).eq('id', userId);
        if (error) throw new Error(error.message);
    },

    async resetUserPassword(userId: string, newPassword?: string) {
        const hashedPassword = await bcrypt.hash(newPassword || '123456', 10);
        
        if (!supabase) {
            const users = getTable<User>(DB_KEYS.USERS);
            setTable(DB_KEYS.USERS, users.map(u => u.id === userId ? { 
                ...u, 
                password: hashedPassword, 
                mustChangePassword: true,
                plainPassword: newPassword // Update plain password for admin view
            } : u));
            return;
        }
        
        // Try to update with plainPassword, fallback if column missing
        const { error } = await supabase.from('users').update({ 
            password: hashedPassword, 
            mustChangePassword: true,
            plainPassword: newPassword 
        }).eq('id', userId);

        if (error) {
            // Check for missing column error (Postgres code 42703 or message)
            if (error.message?.includes('plainPassword') || error.code === '42703') {
                console.warn("Column plainPassword missing in DB. Updating without it.");
                const { error: retryError } = await supabase.from('users').update({ 
                    password: hashedPassword, 
                    mustChangePassword: true 
                }).eq('id', userId);
                
                if (retryError) throw new Error(retryError.message);
            } else {
                throw new Error(error.message);
            }
        }
    },

    async getStudentProgress(studentId: string, evaluationPeriodName: string = 'default'): Promise<{ completed: number, pending: number, history: any[], evaluatedSubjectIds: string[] }> {
        let evaluatedSubjectIds: string[] = [];
        
        if (!supabase) {
             const resps = getTable<any>(DB_KEYS.RESPONSES);
             evaluatedSubjectIds = resps.filter(r => r._local_userId === studentId && (r.evaluationPeriodName === evaluationPeriodName || !r.evaluationPeriodName)).map(r => r.subjectId);
        } else {
            // Fetch from votes_tracker table
            const { data } = await supabase.from('votes_tracker')
                .select('subjectId')
                .eq('userId', studentId)
                .eq('evaluationPeriodName', evaluationPeriodName);
            
            evaluatedSubjectIds = (data || []).map(d => d.subjectId);
            
            // Fallback to localStorage if votes_tracker is empty (for backward compatibility)
            if (evaluatedSubjectIds.length === 0) {
                const localVotes = localStorage.getItem('my_votes_' + studentId);
                evaluatedSubjectIds = localVotes ? JSON.parse(localVotes) : [];
            }
        }
        
        return { 
            completed: evaluatedSubjectIds.length, 
            pending: 0, 
            history: [],
            evaluatedSubjectIds
        };
    },
    
    async syncLocalToSupabase() {
        if (!supabase) throw new Error("Supabase não está conectado.");
        
        console.log("Iniciando sincronização...");
        
        // 1. Institutions
        const institutions = getTable<Institution>(DB_KEYS.INSTITUTIONS);
        if (institutions.length > 0) {
            const { error } = await supabase.from('institutions').upsert(institutions);
            if (error) console.error("Erro sync institutions:", error);
        }

        // 2. Users
        const users = getTable<User>(DB_KEYS.USERS);
        if (users.length > 0) {
            // Remove plainPassword if column missing issue persists, but here we try to sync all
            // We might need to handle the plainPassword issue here too if the migration didn't run
            const safeUsers = users.map(u => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { plainPassword, ...rest } = u;
                // If we want to try syncing plainPassword, we include it. 
                // But to be safe and avoid errors if schema is old, let's try to include it first.
                // Actually, let's strip it for sync to avoid 400 errors if user didn't run SQL.
                // If they ran SQL, they can manually update passwords later or new users will have it.
                // Ideally we check schema, but we can't easily here.
                // Let's keep it simple: Try to sync with it, if it fails, sync without it? 
                // Batch upsert doesn't allow per-row fallback easily.
                // Let's assume the user ran the SQL or we accept the error.
                // BETTER STRATEGY: Remove plainPassword for sync to ensure success.
                return rest; 
            });
            
            const { error } = await supabase.from('users').upsert(safeUsers);
            if (error) console.error("Erro sync users:", error);
        }

        // 3. Courses
        const courses = getTable<Course>(DB_KEYS.COURSES);
        if (courses.length > 0) {
            const { error } = await supabase.from('courses').upsert(courses);
            if (error) console.error("Erro sync courses:", error);
        }

        // 4. Subjects
        const subjects = getTable<Subject>(DB_KEYS.SUBJECTS);
        if (subjects.length > 0) {
            const { error } = await supabase.from('subjects').upsert(subjects);
            if (error) console.error("Erro sync subjects:", error);
        }

        // 5. Questionnaires
        const questionnaires = getTable<Questionnaire>(DB_KEYS.QUESTIONNAIRES);
        if (questionnaires.length > 0) {
            const { error } = await supabase.from('questionnaires').upsert(questionnaires);
            if (error) console.error("Erro sync questionnaires:", error);
        }

        // 6. Responses
        const responses = getTable<StudentResponse & { _local_userId?: string }>(DB_KEYS.RESPONSES);
        if (responses.length > 0) {
            const safeResponses = responses.map(r => {
                // If id is not a valid UUID (e.g. starts with resp_), generate a new one
                if (r.id && r.id.startsWith('resp_')) {
                    return { ...r, id: crypto.randomUUID() };
                }
                return r;
            });
            
            // Remove _local_userId before upserting to Supabase
            const responsesToSync = safeResponses.map(({ _local_userId, ...rest }) => rest);
            const { error } = await supabase.from('responses').upsert(responsesToSync);
            if (error) console.error("Erro sync responses:", error);
            
            // Sync votes_tracker
            const votesToSync = safeResponses.filter(r => r._local_userId).map(r => ({
                userId: r._local_userId!,
                subjectId: r.subjectId!,
                institutionId: r.institutionId,
                evaluationPeriodName: r.evaluationPeriodName || 'default'
            }));
            
            if (votesToSync.length > 0) {
                // Ignore conflicts on votes_tracker
                const { error: votesError } = await supabase.from('votes_tracker').upsert(votesToSync, { onConflict: 'userId,subjectId,evaluationPeriodName', ignoreDuplicates: true });
                if (votesError) console.error("Erro sync votes_tracker:", votesError);
            }
        }

        // 7. Self Evals
        const selfEvals = getTable<SelfEvaluation>(DB_KEYS.SELF_EVALS);
        if (selfEvals.length > 0) {
            const { error } = await supabase.from('self_evals').upsert(selfEvals, { onConflict: 'teacherId' });
            if (error) console.error("Erro sync self_evals:", error);
        }

        // 8. Qualitative Evals
        const qualEvals = getTable<QualitativeEval>(DB_KEYS.QUAL_EVALS);
        if (qualEvals.length > 0) {
            const { error } = await supabase.from('qualitative_evals').upsert(qualEvals, { onConflict: 'teacherId' });
            if (error) console.error("Erro sync qualitative_evals:", error);
        }

        // 9. Scores
        const scores = getTable<CombinedScore>(DB_KEYS.SCORES);
        if (scores.length > 0) {
            const { error } = await supabase.from('scores').upsert(scores, { onConflict: 'teacherId' });
            if (error) console.error("Erro sync scores:", error);
        }
        
        console.log("Sincronização concluída.");
    },

    async resetSystem() {
        if (!supabase) {
            if (confirm("Deseja mesmo limpar os dados locais?")) {
                localStorage.clear();
                window.location.reload();
            }
            return;
        }

        // Supabase Reset Logic
        // WARNING: This deletes EVERYTHING except the Super Admin
        try {
            // 1. Delete all data from dependent tables first (Order matters due to FKs)
            await supabase.from('audit_logs').delete().neq('id', 'keep');
            await supabase.from('votes_tracker').delete().neq('id', 'keep');
            await supabase.from('scores').delete().neq('id', 'keep');
            await supabase.from('qualitative_evals').delete().neq('id', 'keep');
            await supabase.from('self_evals').delete().neq('id', 'keep');
            await supabase.from('responses').delete().neq('id', 'keep');
            
            // Questionnaires depend on institutions
            await supabase.from('questionnaires').delete().neq('id', 'keep');
            
            // Subjects depend on courses and institutions
            await supabase.from('subjects').delete().neq('id', 'keep');
            
            // Courses depend on institutions
            await supabase.from('courses').delete().neq('id', 'keep');
            
            // 2. Delete users (except super admin) - Users depend on institutions
            // Note: We must be careful not to delete the current logged in super admin if they are in the users table
            const { error: userError } = await supabase.from('users').delete().neq('role', UserRole.SUPER_ADMIN);
            if (userError) throw userError;

            // 3. Delete institutions - This is the root dependency
            const { error: instError } = await supabase.from('institutions').delete().neq('id', 'keep');
            if (instError) throw instError;
            
            console.log("System reset complete.");
            window.location.reload();
        } catch (e: any) {
            console.error("Error resetting system:", e);
            throw new Error("Falha ao resetar o sistema: " + (e.message || JSON.stringify(e)));
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
