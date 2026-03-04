import { User, UserRole, Institution, Subject, Questionnaire, StudentResponse, CombinedScore, Question, SelfEvaluation, QualitativeEval, TeacherCategory, Course, SubjectScoreDetail, SelfEvalTemplate, AuditLog, AcademicPeriod } from '../types';

export const PDF_STANDARD_QUESTIONS: Question[] = [
    { id: "651", text: "O docente apresentou o programa temático ou analítico da disciplina?", type: "binary", weight: 4 },
    { id: "652", text: "O docente apresentou os objetivos da disciplina?", type: "binary", weight: 3 },
    { id: "653", text: "O docente apresentou a metodologia de ensino da disciplina?", type: "binary", weight: 2 },
    { id: "654", text: "O docente cumpriu com o programa temático ou analítico apresentado?", type: "binary", weight: 6 },
    { id: "701", text: "O docente foi acessível aos estudantes?", type: "binary", weight: 1 },
    { id: "702", text: "O docente disponibilizou-se para esclarecer dúvidas?", type: "binary", weight: 1 },
    { id: "703", text: "O docente encorajou ao uso de métodos participativos na sala de aula?", type: "binary", weight: 1 },
    { id: "751", text: "O docente avaliou os estudantes dentro dos prazos?", type: "binary", weight: 5 },
    { id: "752", text: "O estudante teve oportunidade de ver seus resultados depois de corrigidos?", type: "binary", weight: 3 },
    { id: "753", text: "O docente publicou os resultados da avaliação dentro dos prazos estabelecidos?", type: "binary", weight: 4 },
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
                { key: 'g4_gradStudents', label: 'Aprovados Graduação', description: 'Nº Estudantes', scoreValue: 1 },
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

export interface SubjectWithTeacher extends Subject { teacherName: string; }
export interface GroupedComments { subjectName: string; classGroup: string; shift: string; comments: string[]; }

const API_URL = '/api';

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
    // Get token from localStorage
    const sessionStr = localStorage.getItem('ad_current_session');
    const session = sessionStr ? JSON.parse(sessionStr) : null;
    const token = session?.token;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (token) {
        (headers as any)['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (res.status === 401 || res.status === 403) {
        // Token expired or invalid
        localStorage.removeItem('ad_current_session');
        // Optional: Redirect to login or handle session expiry
        // window.location.href = '/'; 
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
    }

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro na requisição');
    }
    return res.json();
}

export const BackendService = {
    async checkHealth() {
        try {
            return await fetchAPI('/health');
        } catch {
            return { ok: false, mode: 'local' };
        }
    },
    async login(email: string, password?: string) {
        const data = await fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        localStorage.setItem('ad_current_session', JSON.stringify(data));
        return data;
    },
    async logout() { localStorage.removeItem('ad_current_session'); },
    async getSession() { const s = localStorage.getItem('ad_current_session'); return s ? JSON.parse(s).user : null; },
    async changePassword(userId: string, newPassword?: string) {
        return fetchAPI('/auth/change-password', { method: 'POST', body: JSON.stringify({ userId, newPassword }) });
    },
    async getUsers() { return fetchAPI('/users'); },
    async getTeachers(institutionId: string) { return fetchAPI(`/users/teachers/${institutionId}`); },
    async getStudents(institutionId: string) { return fetchAPI(`/users/students/${institutionId}`); },
    async deleteUser(id: string) { return fetchAPI(`/users/${id}`, { method: 'DELETE' }); },
    async updateUser(id: string, data: Partial<User>) { return fetchAPI(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
    async getInstitutions() { return fetchAPI('/institutions'); },
    async getInstitution(id: string) { return fetchAPI(`/institutions/${id}`); },
    async createInstitution(data: any) { return fetchAPI('/institutions', { method: 'POST', body: JSON.stringify(data) }); },
    async updateInstitution(id: string, data: Partial<Institution>) { return fetchAPI(`/institutions/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
    async deleteInstitution(id: string) { return fetchAPI(`/institutions/${id}`, { method: 'DELETE' }); },
    async inviteManager(institutionId: string, email: string, name: string, password?: string) {
        return fetchAPI('/users', { method: 'POST', body: JSON.stringify({ email, name, role: UserRole.INSTITUTION_MANAGER, institutionId, approved: true, password: password || '123456', mustChangePassword: !!password }) });
    },
    async getInstitutionCourses(institutionId: string) { return fetchAPI(`/courses/${institutionId}`); },
    async addCourse(institutionId: string, name: string, code: string, duration?: number, semester?: string, modality?: string, classGroups?: string[]) {
        return fetchAPI('/courses', { method: 'POST', body: JSON.stringify({ institutionId, name, code, duration, semester, modality, classGroups }) });
    },
    async updateCourse(id: string, data: Partial<Course>) { return fetchAPI(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
    async deleteCourse(id: string) { return fetchAPI(`/courses/${id}`, { method: 'DELETE' }); },
    async addTeacher(institutionId: string, name: string, email: string, password?: string, avatar?: string, category?: TeacherCategory) {
        return fetchAPI('/users', { method: 'POST', body: JSON.stringify({ email, name, role: UserRole.TEACHER, institutionId, approved: true, password: password || '123456', avatar, category, mustChangePassword: !!password, jobTitle: 'Docente' }) });
    },
    async addStudent(institutionId: string, name: string, email: string, password?: string, course?: string, courseId?: string, level?: string, avatar?: string, shifts?: string[], classGroups?: string[], semester?: string, modality?: string) {
        return fetchAPI('/users', { method: 'POST', body: JSON.stringify({ email, name, role: UserRole.STUDENT, institutionId, approved: true, password: password || '123456', course, courseId, level, avatar, shifts, classGroups, semester, modality, mustChangePassword: !!password }) });
    },
    async getInstitutionSubjects(institutionId: string) { return fetchAPI(`/subjects/${institutionId}`); },
    async assignSubject(data: any) { return fetchAPI('/subjects', { method: 'POST', body: JSON.stringify(data) }); },
    async updateSubject(id: string, data: Partial<Subject>) { return fetchAPI(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
    async deleteSubject(id: string) { return fetchAPI(`/subjects/${id}`, { method: 'DELETE' }); },
    async getInstitutionQuestionnaire(institutionId: string, role: 'student' | 'teacher' = 'student') { return fetchAPI(`/questionnaires/${institutionId}/${role}`); },
    async saveQuestionnaire(data: Questionnaire) { return fetchAPI('/questionnaires', { method: 'POST', body: JSON.stringify(data) }); },
    async getTeacherStats(teacherId: string) { return fetchAPI(`/scores/teacher/${teacherId}`); },
    async getAllScores(institutionId: string) { return fetchAPI(`/scores/${institutionId}`); },
    async saveQualitativeEval(data: QualitativeEval) { return fetchAPI('/evaluations/qualitative', { method: 'POST', body: JSON.stringify(data) }); },
    async getQualitativeEval(teacherId: string) { return fetchAPI(`/evaluations/qualitative/${teacherId}`); },
    async saveSelfEval(data: SelfEvaluation) { return fetchAPI('/evaluations/self', { method: 'POST', body: JSON.stringify(data) }); },
    async getSelfEval(teacherId: string) { return fetchAPI(`/evaluations/self/${teacherId}`); },
    async submitAnonymousResponse(userId: string, response: any) { return fetchAPI('/responses', { method: 'POST', body: JSON.stringify({ userId, response }) }); },
    async getAvailableSurveys(institutionId: string, userRole: UserRole = UserRole.STUDENT) {
        const target = userRole === UserRole.TEACHER ? 'teacher' : 'student';
        const q = await this.getInstitutionQuestionnaire(institutionId, target);
        const subjects = await this.getInstitutionSubjects(institutionId);
        const users = await this.getUsers();
        const subjectsWithTeachers = subjects.map((s: any) => {
            const t = users.find((u: any) => u.id === s.teacherId);
            return { ...s, teacherName: t ? t.name : 'Docente' } as SubjectWithTeacher;
        });
        return { questionnaire: q!, subjects: subjectsWithTeachers };
    },
    async getTeacherComments(teacherId: string, institutionId: string) { return fetchAPI(`/comments/${institutionId}/${teacherId}`); },
    async calculateScores(institutionId: string, teacherId?: string) { return fetchAPI('/scores/calculate', { method: 'POST', body: JSON.stringify({ institutionId, teacherId }) }); },
    isEvaluationOpen(institution: Institution | null) {
        if (!institution) return false;
        if (!institution.isEvaluationOpen) return false;
        const now = new Date();
        if (institution.evaluationStartDate) {
            const start = new Date(institution.evaluationStartDate);
            if (now < start) return false;
        }
        if (institution.evaluationEndDate) {
            const end = new Date(institution.evaluationEndDate);
            end.setHours(23, 59, 59, 999);
            if (now > end) return false;
        }
        return true;
    },
    async getStudentProgress(studentId: string) { return fetchAPI(`/progress/${studentId}`); },
    async logAction(log: Omit<AuditLog, 'id' | 'timestamp'>) { return fetchAPI('/audit', { method: 'POST', body: JSON.stringify(log) }); },
    async getAuditLogs(institutionId: string) { return fetchAPI(`/audit/${institutionId}`); },
    async getAcademicPeriods(institutionId: string) { return fetchAPI(`/academic-periods/${institutionId}`); },
    async addAcademicPeriod(institutionId: string, name: string, startDate: string, endDate: string) { return fetchAPI('/academic-periods', { method: 'POST', body: JSON.stringify({ institutionId, name, startDate, endDate, isCurrent: false }) }); },
    async setCurrentAcademicPeriod(institutionId: string, periodId: string) { return fetchAPI('/academic-periods/current', { method: 'PUT', body: JSON.stringify({ institutionId, periodId }) }); },
    async resetSystem() {
        if (confirm("Deseja mesmo limpar os dados locais?")) {
            localStorage.clear();
            window.location.reload();
        }
    },
    async getUnapprovedTeachers(institutionId: string) { return fetchAPI(`/users/unapproved/${institutionId}`); },
    async approveTeacher(teacherId: string) { return fetchAPI(`/users/${teacherId}`, { method: 'PUT', body: JSON.stringify({ approved: true }) }); },
    async getInstitutionSelfEvalTemplate(institutionId: string): Promise<SelfEvalTemplate> {
        const inst = await this.getInstitution(institutionId);
        return (inst && inst.selfEvalTemplate) ? inst.selfEvalTemplate : DEFAULT_SELF_EVAL_TEMPLATE;
    },
    async saveInstitutionSelfEvalTemplate(institutionId: string, template: SelfEvalTemplate) {
        await this.updateInstitution(institutionId, { selfEvalTemplate: template });
    },
};
