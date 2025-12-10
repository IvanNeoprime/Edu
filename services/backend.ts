
import { Client, Account, Databases, ID, Query, Models } from 'appwrite';
import { User, UserRole, Institution, Subject, Questionnaire, StudentResponse, InstitutionalEval, CombinedScore, Question, SelfEvaluation, QualitativeEval, TeacherCategory, QuestionnaireTarget } from '../types';

// ==================================================================================
// 🚀 CONFIGURAÇÃO DO APPWRITE
// ==================================================================================
const YOUR_APPWRITE_CONFIG = {
    endpoint: 'https://cloud.appwrite.io/v1',
    projectId: 'avaliadocente', 
    databaseId: 'avaliadocente_db', 
    collections: {
        users: 'users',
        institutions: 'institutions',
        subjects: 'subjects',
        questionnaires: 'questionnaires',
        responses: 'responses',
        self_evals: 'self_evals',
        qualitative_evals: 'qualitative_evals',
        scores: 'scores'
    }
};

let APPWRITE_CONFIG: any = YOUR_APPWRITE_CONFIG;

// --- APPWRITE CLIENT INIT ---
let client: Client | null = null;
let account: Account | null = null;
let databases: Databases | null = null;
let isUsingCloud = false;

const initAppwrite = () => {
    const savedConfig = localStorage.getItem('ad_appwrite_config');
    const configToUse = savedConfig ? JSON.parse(savedConfig) : APPWRITE_CONFIG;

    if (configToUse.projectId === 'avaliadocente') {
        return false;
    }

    if (configToUse && configToUse.projectId) {
        try {
            client = new Client();
            client
                .setEndpoint(configToUse.endpoint)
                .setProject(configToUse.projectId);

            account = new Account(client);
            databases = new Databases(client);
            
            APPWRITE_CONFIG = configToUse;
            isUsingCloud = true;
            console.log("✅ Appwrite conectado.");
            return true;
        } catch (e) {
            console.error("Erro ao conectar Appwrite", e);
            return false;
        }
    }
    return false;
};

if (typeof window !== 'undefined') {
    initAppwrite();
}

// --- STANDARD QUESTIONNAIRES (REGULAMENTO) ---

const PDF_STUDENT_QUESTIONS: Question[] = [
    { id: "651", code: "651", category: "Organização da disciplina", text: "O docente apresentou o programa temático ou analítico da disciplina?", type: "binary", weight: 4 },
    { id: "652", code: "652", category: "Organização da disciplina", text: "O docente apresentou os objetivos da disciplina?", type: "binary", weight: 3 },
    { id: "653", code: "653", category: "Organização da disciplina", text: "O docente apresentou a metodologia de ensino da disciplina?", type: "binary", weight: 2 },
    { id: "654", code: "654", category: "Organização da disciplina", text: "O docente cumpriu com o programa temático ou analítico apresentado?", type: "binary", weight: 6 },
    { id: "701", code: "701", category: "Interação", text: "O docente foi acessível aos estudantes?", type: "binary", weight: 1 },
    { id: "702", code: "702", category: "Interação", text: "O docente disponibilizou-se para esclarecer dúvidas?", type: "binary", weight: 1 },
    { id: "703", code: "703", category: "Interação", text: "O docente encorajou ao uso de métodos participativos na sala de aula?", type: "binary", weight: 1 },
    { id: "751", code: "751", category: "Avaliação", text: "O docente avaliou os estudantes dentro dos prazos?", type: "binary", weight: 5 },
    { id: "752", code: "752", category: "Avaliação", text: "O estudante teve oportunidade de ver seus resultados depois de corrigidos?", type: "binary", weight: 3 },
    { id: "753", code: "753", category: "Avaliação", text: "O docente publicou os resultados da avaliação dentro dos prazos estabelecidos?", type: "binary", weight: 4 }
];

const PDF_SELF_QUESTIONS: Question[] = [
    { id: "self_1", category: "Nº de disciplinas por ano", text: "Disciplinas de Graduação Leccionadas", type: "quantity", weight: 15 },
    { id: "self_2", category: "Nº de disciplinas por ano", text: "Disciplinas de Pós-Graduação Leccionadas", type: "quantity", weight: 5 },
    { id: "self_3", category: "Horas de docência por semana", text: "Aulas Teóricas leccionadas por semana", type: "quantity", weight: 16 },
    { id: "self_4", category: "Horas de docência por semana", text: "Aulas Práticas leccionadas por semana", type: "quantity", weight: 14 },
    { id: "self_5", category: "Horas de docência por semana", text: "Consultas para estudantes", type: "quantity", weight: 5 },
    { id: "self_6", category: "Supervisão e coordenação", text: "Dissertações orientadas de graduação", type: "quantity", weight: 6 },
    { id: "self_7", category: "Supervisão e coordenação", text: "Teses orientadas de pós-graduação", type: "quantity", weight: 6 },
    { id: "self_8", category: "Supervisão e coordenação", text: "Disciplinas de regência", type: "quantity", weight: 8 },
];

const PDF_QUAL_QUESTIONS: Question[] = [
    { id: "qual_1", category: "Desempenho Profissional", text: "Cumprimento de Prazos", type: "scale_10", weight: 1 },
    { id: "qual_2", category: "Desempenho Profissional", text: "Qualidade do Trabalho", type: "scale_10", weight: 1 }
];

const PDF_CLASS_HEAD_QUESTIONS: Question[] = [
    { id: "ch_1", category: "Pedagógico", text: "O docente cumpre com a assiduidade nas aulas?", type: "binary", weight: 5 },
    { id: "ch_2", category: "Pedagógico", text: "O docente inicia e termina as aulas pontualmente?", type: "binary", weight: 5 },
    { id: "ch_3", category: "Material", text: "O docente disponibiliza o material de apoio acordado?", type: "binary", weight: 5 },
    { id: "ch_4", category: "Relação", text: "O docente mantém respeito mútuo com a turma?", type: "binary", weight: 5 }
];

// --- CONSTANTS & HELPERS ---
const DB_KEYS = {
  USERS: 'ad_users',
  INSTITUTIONS: 'ad_institutions',
  SUBJECTS: 'ad_subjects',
  QUESTIONNAIRES: 'ad_questionnaires',
  RESPONSES: 'ad_responses',
  INST_EVALS: 'ad_inst_evals', 
  SELF_EVALS: 'ad_self_evals',
  SCORES: 'ad_scores',
  VOTES_TRACKER: 'ad_votes_tracker',
  SESSION: 'ad_current_session'
};

export interface SubjectWithTeacher extends Subject {
    teacherName: string;
}

const SUPER_ADMIN_EMAIL = "ivandromaoze138@gmail.com"; 
const SUPER_ADMIN_PASS = "24191978a";

const getTable = <T>(key: string): T[] => {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
};
const setTable = <T>(key: string, data: T[]) => localStorage.setItem(key, JSON.stringify(data));
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- SEED DATA (LOCAL ONLY) ---
const initializeSeedData = () => {
    const institutions = getTable<Institution>(DB_KEYS.INSTITUTIONS);
    if (institutions.length === 0) {
        const demoInstId = 'inst_demo';
        const demoInst: Institution = {
            id: demoInstId,
            name: 'Universidade Demo (Teste)',
            code: 'DEMO',
            createdAt: new Date().toISOString(),
            managerEmails: ['gestor@demo.ac.mz'],
            inviteCode: 'DEMO-123'
        };
        const demoUsers: User[] = [
            { id: 'u_super_ivan', email: SUPER_ADMIN_EMAIL, name: 'Super Admin Ivan', role: UserRole.SUPER_ADMIN, approved: true },
            { id: 'u_mgr_demo', email: 'gestor@demo.ac.mz', name: 'Gestor Modelo', role: UserRole.INSTITUTION_MANAGER, institutionId: demoInstId, approved: true },
            { id: 'u_tchr_demo', email: 'docente@demo.ac.mz', name: 'Prof. Carlos Teste', role: UserRole.TEACHER, institutionId: demoInstId, approved: true },
            { id: 'u_dept_demo', email: 'chefe@demo.ac.mz', name: 'Chefe Departamento', role: UserRole.DEPARTMENT_MANAGER, institutionId: demoInstId, department: 'Engenharia', approved: true },
            { id: 'u_std_demo', email: 'aluno@demo.ac.mz', name: 'Aluno Exemplo', role: UserRole.STUDENT, institutionId: demoInstId, department: 'Engenharia', approved: true }
        ];
        (demoUsers[1] as any).password = '123456';
        (demoUsers[2] as any).password = '123456';
        (demoUsers[3] as any).password = '123456';
        (demoUsers[4] as any).password = '123456';
        const demoSubject: Subject = {
            id: 'sub_demo_1', name: 'Introdução à Informática', code: 'INF101', institutionId: demoInstId, teacherId: 'u_tchr_demo', teacherCategory: 'assistente'
        };
        setTable(DB_KEYS.INSTITUTIONS, [demoInst]);
        const currentUsers = getTable<User>(DB_KEYS.USERS);
        const newUsers = [...currentUsers];
        demoUsers.forEach(du => { if (!newUsers.find(u => u.email === du.email)) newUsers.push(du); });
        setTable(DB_KEYS.USERS, newUsers);
        setTable(DB_KEYS.SUBJECTS, [demoSubject]);
    }
};

/**
 * MOCK BACKEND (Offline/LocalStorage Mode)
 */
const MockBackend = {
  async checkHealth(): Promise<{ ok: boolean; mode: string; error?: string }> { 
      initializeSeedData();
      return { ok: true, mode: 'local' }; 
  },
  async login(email: string, password?: string): Promise<{ user: User; token: string } | null> {
    await delay(300); 
    if (email === SUPER_ADMIN_EMAIL) {
        if (password === SUPER_ADMIN_PASS) {
            const saUser: User = { id: 'u_super_ivan', email: SUPER_ADMIN_EMAIL, name: 'Super Admin Ivan', role: UserRole.SUPER_ADMIN, approved: true };
            try {
                const users = getTable<User>(DB_KEYS.USERS);
                if (!users.find(u => u.email === SUPER_ADMIN_EMAIL)) { users.push(saUser); setTable(DB_KEYS.USERS, users); }
            } catch (e) {}
            const sessionData = { user: saUser, token: 'sa_jwt_' + Date.now(), expiry: Date.now() + 86400000 };
            localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(sessionData));
            return sessionData;
        } else { throw new Error("Senha incorreta para Super Admin."); }
    }
    const users = getTable<User>(DB_KEYS.USERS);
    const user = users.find(u => u.email === email);
    if (!user) return null;
    const storedPass = (user as any).password || '123456';
    if (password && password !== storedPass) throw new Error("Senha incorreta.");
    const sessionData = { user, token: 'mock_jwt_' + Date.now(), expiry: Date.now() + 86400000 };
    localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(sessionData));
    return { user, token: sessionData.token };
  },
  async logout(): Promise<void> { localStorage.removeItem(DB_KEYS.SESSION); },
  async getSession(): Promise<User | null> {
      const sessionStr = localStorage.getItem(DB_KEYS.SESSION);
      if (!sessionStr) return null;
      try { return JSON.parse(sessionStr).user; } catch { return null; }
  },
  async register(userData: Omit<User, 'id'> & { password?: string; inviteCode?: string }): Promise<User> {
    await delay(500);
    const users = getTable<User>(DB_KEYS.USERS);
    if (users.find(u => u.email === userData.email)) throw new Error("Email já registado.");
    const newUser: User = { ...userData, id: `user_${Date.now()}`, approved: userData.role !== UserRole.TEACHER };
    if (userData.password) (newUser as any).password = userData.password;
    users.push(newUser);
    setTable(DB_KEYS.USERS, users);
    if (newUser.approved) {
        const sessionData = { user: newUser, token: 'mock_jwt_' + Date.now(), expiry: Date.now() + 86400000 };
        localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(sessionData));
    }
    return newUser;
  },
  async addTeacher(institutionId: string, name: string, email: string, password?: string): Promise<User> {
      const users = getTable<User>(DB_KEYS.USERS);
      const existingUser = users.find(u => u.email === email);
      
      if (existingUser) {
          if ([UserRole.INSTITUTION_MANAGER, UserRole.SUPER_ADMIN, UserRole.DEPARTMENT_MANAGER].includes(existingUser.role)) {
              return existingUser; 
          } else if (existingUser.role === UserRole.TEACHER) {
             throw new Error("Este email já está cadastrado como docente.");
          } else {
             throw new Error("Email já cadastrado como aluno.");
          }
      }

      const newUser: User = { id: `user_tch_${Date.now()}`, email, name, role: UserRole.TEACHER, institutionId, approved: true };
      (newUser as any).password = password || '123456';
      users.push(newUser);
      setTable(DB_KEYS.USERS, users);
      return newUser;
  },
  async addDepartmentManager(institutionId: string, name: string, email: string, department: string, password?: string): Promise<User> {
      const users = getTable<User>(DB_KEYS.USERS);
      if (users.find(u => u.email === email)) throw new Error("Email já cadastrado.");
      
      const newUser: User = { 
          id: `user_dept_${Date.now()}`, 
          email, 
          name, 
          role: UserRole.DEPARTMENT_MANAGER, 
          institutionId, 
          department,
          approved: true 
      };
      (newUser as any).password = password || '123456';
      users.push(newUser);
      setTable(DB_KEYS.USERS, users);
      return newUser;
  },
  async addStudent(institutionId: string, department: string, name: string, email: string, password?: string): Promise<User> {
      const users = getTable<User>(DB_KEYS.USERS);
      if (users.find(u => u.email === email)) throw new Error("Email já cadastrado.");

      const newUser: User = { 
          id: `user_std_${Date.now()}`, 
          email, 
          name, 
          role: UserRole.STUDENT, 
          institutionId, 
          department,
          approved: true 
      };
      (newUser as any).password = password || '123456';
      users.push(newUser);
      setTable(DB_KEYS.USERS, users);
      return newUser;
  },
  async addClassHead(institutionId: string, department: string, name: string, email: string, turma: string, classe: string, password?: string): Promise<User> {
      const users = getTable<User>(DB_KEYS.USERS);
      if (users.find(u => u.email === email)) throw new Error("Email já cadastrado.");

      const newUser: User = { 
          id: `user_ch_${Date.now()}`, 
          email, 
          name, 
          role: UserRole.CLASS_HEAD, 
          institutionId, 
          department,
          turma,
          classe,
          approved: true 
      };
      (newUser as any).password = password || '123456';
      users.push(newUser);
      setTable(DB_KEYS.USERS, users);
      return newUser;
  },
  async promoteToClassHead(studentId: string, turma: string, classe: string): Promise<void> {
      const users = getTable<User>(DB_KEYS.USERS);
      const idx = users.findIndex(u => u.id === studentId);
      if (idx === -1) throw new Error("Estudante não encontrado.");
      
      users[idx].role = UserRole.CLASS_HEAD;
      users[idx].turma = turma;
      users[idx].classe = classe;
      
      setTable(DB_KEYS.USERS, users);
  },
  async getInstitutions(): Promise<Institution[]> { return getTable<Institution>(DB_KEYS.INSTITUTIONS); },
  async createInstitution(data: any): Promise<Institution> {
      const list = getTable<Institution>(DB_KEYS.INSTITUTIONS);
      const newItem = { ...data, id: `inst_${Date.now()}`, inviteCode: `${data.code}-${Math.floor(1000 + Math.random() * 9000)}`, createdAt: new Date().toISOString() };
      list.push(newItem); setTable(DB_KEYS.INSTITUTIONS, list); return newItem;
  },
  async inviteManager(institutionId: string, email: string, name: string, password?: string) {
      const users = getTable<User>(DB_KEYS.USERS);
      const newManager: User = { id: `user_mgr_${Date.now()}`, email, name, role: UserRole.INSTITUTION_MANAGER, institutionId, approved: true };
      if (password) (newManager as any).password = password;
      users.push(newManager); setTable(DB_KEYS.USERS, users); return { success: true };
  },
  async getUnapprovedTeachers(institutionId: string): Promise<User[]> {
      const users = getTable<User>(DB_KEYS.USERS);
      return users.filter(u => u.institutionId === institutionId && u.role === UserRole.TEACHER && !u.approved);
  },
  async approveTeacher(teacherId: string): Promise<void> {
      const users = getTable<User>(DB_KEYS.USERS);
      const idx = users.findIndex(u => u.id === teacherId);
      if (idx !== -1) { users[idx].approved = true; setTable(DB_KEYS.USERS, users); }
  },
  async getInstitutionSubjects(institutionId: string): Promise<Subject[]> {
    return getTable<Subject>(DB_KEYS.SUBJECTS).filter(s => s.institutionId === institutionId);
  },
  async assignSubject(data: any): Promise<Subject> {
      const list = getTable<Subject>(DB_KEYS.SUBJECTS);
      const newItem = { ...data, id: `sub_${Date.now()}` };
      list.push(newItem); setTable(DB_KEYS.SUBJECTS, list); return newItem;
  },
  async saveQualitativeEval(data: QualitativeEval): Promise<void> {
      const list = getTable<QualitativeEval>(DB_KEYS.INST_EVALS);
      const filtered = list.filter(i => i.teacherId !== data.teacherId);
      filtered.push(data); setTable(DB_KEYS.INST_EVALS, filtered);
  },
  async getQualitativeEval(teacherId: string): Promise<QualitativeEval | undefined> {
      return getTable<QualitativeEval>(DB_KEYS.INST_EVALS).find(e => e.teacherId === teacherId);
  },
  async saveSelfEval(data: SelfEvaluation): Promise<void> {
      const list = getTable<SelfEvaluation>(DB_KEYS.SELF_EVALS);
      const filtered = list.filter(s => s.teacherId !== data.teacherId);
      filtered.push(data); setTable(DB_KEYS.SELF_EVALS, filtered);
  },
  async getSelfEval(teacherId: string): Promise<SelfEvaluation | undefined> {
      return getTable<SelfEvaluation>(DB_KEYS.SELF_EVALS).find(s => s.teacherId === teacherId);
  },
  async getQuestionnaire(institutionId: string, target: QuestionnaireTarget): Promise<Questionnaire> {
      const questionnaires = getTable<Questionnaire>(DB_KEYS.QUESTIONNAIRES);
      let q = questionnaires.find(x => x.institutionId === institutionId && x.target === target);
      if (!q) {
          // Return default based on target if not found
          let defaultQuestions: Question[] = [];
          let defaultTitle = '';
          if (target === 'student') {
              defaultQuestions = PDF_STUDENT_QUESTIONS;
              defaultTitle = 'Ficha de Avaliação de Desempenho';
          } else if (target === 'teacher_self') {
              defaultQuestions = PDF_SELF_QUESTIONS;
              defaultTitle = 'Auto-Avaliação';
          } else if (target === 'manager_qual') {
              defaultQuestions = PDF_QUAL_QUESTIONS;
              defaultTitle = 'Avaliação Qualitativa';
          } else if (target === 'class_head') {
              defaultQuestions = PDF_CLASS_HEAD_QUESTIONS;
              defaultTitle = 'Avaliação do Chefe de Turma';
          }
          q = {
              id: `q_${target}_${institutionId}`,
              institutionId,
              title: defaultTitle,
              active: true,
              questions: defaultQuestions,
              target
          };
      } else if (q.questions.length === 0) {
          // Fallback if empty
          if (target === 'student') q.questions = PDF_STUDENT_QUESTIONS;
          if (target === 'teacher_self') q.questions = PDF_SELF_QUESTIONS;
          if (target === 'manager_qual') q.questions = PDF_QUAL_QUESTIONS;
          if (target === 'class_head') q.questions = PDF_CLASS_HEAD_QUESTIONS;
      }
      return q;
  },
  // Legacy support alias
  async getInstitutionQuestionnaire(institutionId: string): Promise<Questionnaire | null> {
      return this.getQuestionnaire(institutionId, 'student');
  },
  async saveQuestionnaire(data: Questionnaire): Promise<void> {
      const quests = getTable<Questionnaire>(DB_KEYS.QUESTIONNAIRES);
      // Remove existing for same target/inst
      const filtered = quests.filter(q => !(q.institutionId === data.institutionId && q.target === data.target));
      filtered.push(data);
      setTable(DB_KEYS.QUESTIONNAIRES, filtered);
  },
  async getAvailableSurveys(institutionId: string, role: UserRole = UserRole.STUDENT): Promise<{questionnaire: Questionnaire, subjects: SubjectWithTeacher[]} | null> {
    const target = role === UserRole.CLASS_HEAD ? 'class_head' : 'student';
    const activeQ = await this.getQuestionnaire(institutionId, target);
    const subjects = getTable<Subject>(DB_KEYS.SUBJECTS).filter(s => s.institutionId === institutionId);
    const users = getTable<User>(DB_KEYS.USERS);
    const subjectsWithTeachers = subjects.map(s => {
        const teacher = users.find(u => u.id === s.teacherId);
        return { ...s, teacherName: teacher ? teacher.name : 'Docente' };
    });
    return { questionnaire: activeQ, subjects: subjectsWithTeachers };
  },
  async submitAnonymousResponse(userId: string, response: any): Promise<void> {
      const tracker = getTable<string>(DB_KEYS.VOTES_TRACKER);
      // Allows both student and class_head to vote. Tracking key includes questionaire type effectively via subject for now.
      // Ideally should track by questionnaire ID too, but current unique key is user+subject.
      // Since Class Head is a different User ID from Student, this is safe.
      if (tracker.includes(`${userId}_${response.subjectId}`)) throw new Error("Já votaste nesta disciplina.");
      const responses = getTable<StudentResponse>(DB_KEYS.RESPONSES);
      responses.push({ ...response, id: `resp_${Date.now()}`, timestamp: new Date().toISOString() });
      setTable(DB_KEYS.RESPONSES, responses);
      tracker.push(`${userId}_${response.subjectId}`);
      setTable(DB_KEYS.VOTES_TRACKER, tracker);
  },
  
  // CORE CALCULATION ENGINE
  async calculateScores(institutionId: string): Promise<void> {
      const subjects = getTable<Subject>(DB_KEYS.SUBJECTS).filter(s => s.institutionId === institutionId);
      const teacherIds = Array.from(new Set(subjects.map(s => s.teacherId)));
      const responses = getTable<StudentResponse>(DB_KEYS.RESPONSES);
      const selfEvals = getTable<SelfEvaluation>(DB_KEYS.SELF_EVALS);
      const qualEvals = getTable<QualitativeEval>(DB_KEYS.INST_EVALS);
      
      const studentQ = await this.getQuestionnaire(institutionId, 'student');
      const classHeadQ = await this.getQuestionnaire(institutionId, 'class_head');
      const selfQ = await this.getQuestionnaire(institutionId, 'teacher_self');
      const qualQ = await this.getQuestionnaire(institutionId, 'manager_qual');

      const scores = getTable<CombinedScore>(DB_KEYS.SCORES);

      teacherIds.forEach(tid => {
          // 1. STUDENT (AND CLASS HEAD) SCORE
          // Currently we treat Class Head responses into the "Student" bucket for the calculation, 
          // or we can weight them differently.
          // For simplicity in this iteration, we treat any response for the teacher that matches either questionnaire.
          
          const teacherResponses = responses.filter(r => r.teacherId === tid);
          let studentPoints = 0;
          
          const teacherSubjects = subjects.filter(s => s.teacherId === tid);
          const self = selfEvals.find(s => s.teacherId === tid);
          const category: TeacherCategory = self?.header.category || teacherSubjects[0]?.teacherCategory || 'assistente';
          const multiplier = category === 'assistente_estagiario' ? 0.46 : 0.88;

          if (teacherResponses.length > 0) {
              let totalRawPoints = 0;
              let validResponseCount = 0;
              
              teacherResponses.forEach(r => {
                  let rPoints = 0;
                  
                  // Detect which questionnaire was used for this response
                  const targetQ = r.questionnaireId === classHeadQ.id ? classHeadQ : studentQ;

                  r.answers.forEach(a => {
                     let q = targetQ.questions.find(qu => qu.id === a.questionId);
                     if (!q) return;
                     if (q.type === 'text' || q.type === 'choice') return;
                     
                     const weight = q.weight || 0; 
                     const val = typeof a.value === 'number' ? a.value : parseFloat(a.value as string) || 0;
                     
                     if (q.type === 'binary') {
                         if (val === 1) rPoints += weight;
                     } else if (q.type === 'stars') {
                         rPoints += (val / 5) * weight;
                     } else if (q.type === 'scale_10') {
                         rPoints += (val / 10) * weight;
                     }
                  });
                  totalRawPoints += rPoints;
                  validResponseCount++;
              });

              if (validResponseCount > 0) {
                  const avgRawPoints = totalRawPoints / validResponseCount;
                  studentPoints = avgRawPoints * multiplier;
              }
          }

          // 2. SELF EVAL SCORE
          let selfPoints = 0;
          if (self && self.answers) {
              Object.entries(self.answers).forEach(([qId, val]) => {
                  const q = selfQ.questions.find(qu => qu.id === qId);
                  if (q && q.weight) {
                      selfPoints += val * q.weight;
                  }
              });
          }

          // 3. QUALITATIVE SCORE
          const qual = qualEvals.find(q => q.teacherId === tid);
          let qualPoints = 0;
          if (qual && qual.answers) {
              Object.entries(qual.answers).forEach(([qId, val]) => {
                  const q = qualQ.questions.find(qu => qu.id === qId);
                  if (q && q.weight) {
                      qualPoints += val * (q.weight || 1);
                  }
              });
               // Fallback for old data structure
               if (Object.keys(qual.answers).length === 0 && (qual as any).deadlineCompliance) {
                   qualPoints = ((qual as any).deadlineCompliance || 0) + ((qual as any).workQuality || 0);
               }
          }

          const final = studentPoints + selfPoints + qualPoints;

          const newScore: CombinedScore = {
              teacherId: tid,
              studentScore: parseFloat(studentPoints.toFixed(2)),
              institutionalScore: parseFloat(qualPoints.toFixed(2)),
              selfEvalScore: parseFloat(selfPoints.toFixed(2)),
              finalScore: parseFloat(final.toFixed(2)),
              lastCalculated: new Date().toISOString()
          };
          
          const existingIdx = scores.findIndex(s => s.teacherId === tid);
          if (existingIdx >= 0) scores[existingIdx] = newScore; else scores.push(newScore);
      });
      setTable(DB_KEYS.SCORES, scores);
  },
  async getTeacherStats(teacherId: string): Promise<CombinedScore | undefined> { return getTable<CombinedScore>(DB_KEYS.SCORES).find(s => s.teacherId === teacherId); },
  async getInstitutionScores(institutionId: string): Promise<CombinedScore[]> {
      const users = getTable<User>(DB_KEYS.USERS);
      const scores = getTable<CombinedScore>(DB_KEYS.SCORES);
      const instTeachers = users.filter(u => (u.role === UserRole.TEACHER || u.role === UserRole.INSTITUTION_MANAGER) && u.institutionId === institutionId);
      const teacherIds = instTeachers.map(t => t.id);
      return scores.filter(s => teacherIds.includes(s.teacherId));
  },
  async getUsers(): Promise<User[]> { return getTable<User>(DB_KEYS.USERS); },
  async resetSystem(): Promise<void> { localStorage.clear(); window.location.reload(); },
  async setFirebaseConfig(config: any) { console.log("Use setAppwriteConfig instead"); }
};

const AppwriteBackend = MockBackend; 

export const BackendService = isUsingCloud ? AppwriteBackend : MockBackend;
