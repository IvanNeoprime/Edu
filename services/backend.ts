
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, UserRole, Institution, Subject, Questionnaire, StudentResponse, InstitutionalEval, CombinedScore, Question, SelfEvaluation, QualitativeEval, TeacherCategory } from '../types';

// ==================================================================================
// 🚀 CONFIGURAÇÃO GERAL (SUPABASE vs LOCAL)
// ==================================================================================

// Helper seguro para obter variáveis de ambiente (Node ou Vite)
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
    } catch (e) {
        return '';
    }
    return '';
};

// SUPABASE CONFIG
const YOUR_SUPABASE_CONFIG = {
    url: getEnv('SUPABASE_URL'), 
    key: getEnv('SUPABASE_ANON_KEY')
};

// ==================================================================================
// 📡 SUPABASE CLIENT INIT
// ==================================================================================
let supabase: SupabaseClient | null = null;
let isUsingSupabase = false;

if (YOUR_SUPABASE_CONFIG.url && YOUR_SUPABASE_CONFIG.key) {
    try {
        supabase = createClient(YOUR_SUPABASE_CONFIG.url, YOUR_SUPABASE_CONFIG.key);
        isUsingSupabase = true;
        console.log("✅ Supabase conectado. Modo Online.");
    } catch (e) {
        console.error("❌ Erro ao inicializar Supabase. Alternando para modo LOCAL:", e);
    }
} else {
    console.warn("⚠️ Credenciais do Supabase não encontradas. O sistema rodará em modo LOCAL (LocalStorage).");
}

// --- PDF STANDARD QUESTIONNAIRE (STUDENTS) ---
const PDF_STANDARD_QUESTIONS: Question[] = [
    { id: "651", text: "O docente apresentou o programa temático ou analítico da disciplina?", type: "binary", weight: 4 },
    { id: "652", text: "O docente apresentou os objetivos da disciplina?", type: "binary", weight: 3 },
    { id: "653", text: "O docente apresentou a metodologia de ensino da disciplina?", type: "binary", weight: 2 },
    { id: "654", text: "O docente cumpriu com o programa temático ou analítico apresentado?", type: "binary", weight: 4 }, 
    { id: "701", text: "O docente foi acessível aos estudantes?", type: "binary", weight: 3 },
    { id: "702", text: "O docente disponibilizou-se para esclarecer dúvidas?", type: "binary", weight: 3 },
    { id: "703", text: "O docente encorajou ao uso de métodos participativos na sala de aula?", type: "binary", weight: 3 },
    { id: "751", text: "O docente avaliou os estudantes dentro dos prazos?", type: "binary", weight: 4 },
    { id: "752", text: "O estudante teve oportunidade de ver seus resultados depois de corrigidos?", type: "binary", weight: 2 },
    { id: "753", text: "O docente publicou os resultados da avaliação dentro dos prazos estabelecidos?", type: "binary", weight: 2 }
];

// --- STANDARD SURVEY (TEACHERS - INSTITUTIONAL) ---
const TEACHER_STANDARD_QUESTIONS: Question[] = [
    { id: "inst_01", text: "As condições das salas de aula (iluminação, ventilação, mobiliário) são adequadas?", type: "scale_10", weight: 0 },
    { id: "inst_02", text: "Os recursos didáticos e tecnológicos disponíveis atendem às necessidades de ensino?", type: "scale_10", weight: 0 },
    { id: "inst_03", text: "A comunicação com a direção pedagógica/administrativa é eficiente?", type: "stars", weight: 0 },
    { id: "inst_04", text: "Existe apoio institucional para atividades de investigação e extensão?", type: "binary", weight: 0 },
    { id: "inst_05", text: "O calendário académico foi cumprido rigorosamente pela instituição?", type: "binary", weight: 0 }
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
            { id: 'u_tchr_demo', email: 'docente@demo.ac.mz', name: 'Prof. Carlos Teste', role: UserRole.TEACHER, institutionId: demoInstId, approved: true, category: 'assistente' },
            { id: 'u_std_demo', email: 'aluno@demo.ac.mz', name: 'Aluno Exemplo', role: UserRole.STUDENT, institutionId: demoInstId, approved: true, course: 'Eng. Informática', level: '1', shifts: ['Diurno', 'Noturno'], classGroups: ['A', 'B'] }
        ];
        (demoUsers[1] as any).password = '123456';
        (demoUsers[2] as any).password = '123456';
        (demoUsers[3] as any).password = '123456';
        const demoSubject: Subject = {
            id: 'sub_demo_1', 
            name: 'Introdução à Informática', 
            code: 'INF101', 
            institutionId: demoInstId, 
            teacherId: 'u_tchr_demo', 
            teacherCategory: 'assistente', 
            course: 'Eng. Informática', 
            level: '1', 
            classGroup: 'A',
            shift: 'Diurno',
            modality: 'Presencial'
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
 * 🟡 MOCK BACKEND (Offline/LocalStorage Mode)
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
  async addTeacher(institutionId: string, name: string, email: string, password?: string, avatar?: string, category?: TeacherCategory): Promise<User> {
      const users = getTable<User>(DB_KEYS.USERS);
      const existingUser = users.find(u => u.email === email);
      
      if (existingUser) {
          if (existingUser.role === UserRole.INSTITUTION_MANAGER || existingUser.role === UserRole.SUPER_ADMIN) {
              return existingUser; 
          } else if (existingUser.role === UserRole.TEACHER) {
             throw new Error("Este email já está cadastrado como docente.");
          } else {
             throw new Error("Email já cadastrado como aluno.");
          }
      }

      const newUser: User = { 
          id: `user_tch_${Date.now()}`, 
          email, 
          name, 
          role: UserRole.TEACHER, 
          institutionId, 
          approved: true,
          avatar,
          category
      };
      (newUser as any).password = password || '123456';
      
      users.push(newUser);
      setTable(DB_KEYS.USERS, users);
      
      return newUser;
  },
  async addStudent(institutionId: string, name: string, email: string, password?: string, course?: string, level?: string, avatar?: string, shifts?: string[], classGroups?: string[]): Promise<User> {
      const users = getTable<User>(DB_KEYS.USERS);
      const existingUser = users.find(u => u.email === email);
      if (existingUser) throw new Error("Email já cadastrado.");

      const newUser: User = { 
          id: `user_std_${Date.now()}`, 
          email, 
          name, 
          role: UserRole.STUDENT, 
          institutionId, 
          approved: true,
          course: course || '',
          level: level || '',
          avatar,
          shifts: shifts as ('Diurno'|'Noturno')[] || [],
          classGroups: classGroups || []
      };
      (newUser as any).password = password || '123456';
      
      users.push(newUser);
      setTable(DB_KEYS.USERS, users);
      
      return newUser;
  },
  async getInstitutions(): Promise<Institution[]> { return getTable<Institution>(DB_KEYS.INSTITUTIONS); },
  async getInstitution(id: string): Promise<Institution | undefined> {
      return getTable<Institution>(DB_KEYS.INSTITUTIONS).find(i => i.id === id);
  },
  async updateInstitution(id: string, data: Partial<Institution>): Promise<void> {
      const list = getTable<Institution>(DB_KEYS.INSTITUTIONS);
      const idx = list.findIndex(i => i.id === id);
      if (idx !== -1) {
          list[idx] = { ...list[idx], ...data };
          setTable(DB_KEYS.INSTITUTIONS, list);
      }
  },
  async createInstitution(data: { name: string, code: string, managerEmails: string[], logo?: string }): Promise<Institution> {
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
  async getInstitutionQuestionnaire(institutionId: string, role: 'student' | 'teacher' = 'student'): Promise<Questionnaire | null> {
      const found = getTable<Questionnaire>(DB_KEYS.QUESTIONNAIRES).find(q => q.institutionId === institutionId && (q.targetRole === role || (!q.targetRole && role === 'student')));
      
      if (found) return found;

      // Se não encontrar:
      if (role === 'student') {
          return {
              id: `default_std_${institutionId}`,
              institutionId,
              title: 'Ficha de Avaliação de Desempenho (Padrão)',
              active: true,
              questions: PDF_STANDARD_QUESTIONS,
              targetRole: 'student'
          };
      } else if (role === 'teacher') {
          return {
              id: `default_tchr_${institutionId}`,
              institutionId,
              title: 'Inquérito Institucional ao Docente (Padrão)',
              active: true,
              questions: TEACHER_STANDARD_QUESTIONS,
              targetRole: 'teacher'
          };
      }
      return null;
  },
  async saveQuestionnaire(data: Questionnaire): Promise<void> {
      const quests = getTable<Questionnaire>(DB_KEYS.QUESTIONNAIRES);
      // Remove anterior do mesmo tipo
      const idx = quests.findIndex(q => q.institutionId === data.institutionId && (q.targetRole === data.targetRole || (!q.targetRole && !data.targetRole)));
      if (idx >= 0) quests[idx] = data; else quests.push(data);
      setTable(DB_KEYS.QUESTIONNAIRES, quests);
  },
  async getAvailableSurveys(institutionId: string, userRole: UserRole = UserRole.STUDENT): Promise<{questionnaire: Questionnaire, subjects: SubjectWithTeacher[]} | null> {
    const target = userRole === UserRole.TEACHER ? 'teacher' : 'student';
    let activeQ = getTable<Questionnaire>(DB_KEYS.QUESTIONNAIRES).find(q => q.institutionId === institutionId && q.active && (q.targetRole === target || (!q.targetRole && target === 'student')));
    
    // Default se não existir para aluno
    if (!activeQ && target === 'student') { 
        activeQ = { id: `q_def_std_${institutionId}`, institutionId, title: 'Ficha de Avaliação de Desempenho (Padrão)', active: true, questions: PDF_STANDARD_QUESTIONS, targetRole: 'student' }; 
    }
    // Default se não existir para docente
    if (!activeQ && target === 'teacher') {
        activeQ = { id: `q_def_tchr_${institutionId}`, institutionId, title: 'Inquérito Institucional ao Docente (Padrão)', active: true, questions: TEACHER_STANDARD_QUESTIONS, targetRole: 'teacher' };
    }

    if (!activeQ) return null;

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
      // Permitir que professores respondam múltiplas vezes se for questionário geral (subjectId pode ser 'general')
      const trackKey = `${userId}_${response.subjectId || response.questionnaireId}`;
      
      if (tracker.includes(trackKey)) throw new Error("Já submeteu esta avaliação.");
      
      const responses = getTable<StudentResponse>(DB_KEYS.RESPONSES);
      responses.push({ ...response, id: `resp_${Date.now()}`, timestamp: new Date().toISOString() });
      setTable(DB_KEYS.RESPONSES, responses);
      tracker.push(trackKey);
      setTable(DB_KEYS.VOTES_TRACKER, tracker);
  },
  async calculateScores(institutionId: string): Promise<void> {
      const subjects = getTable<Subject>(DB_KEYS.SUBJECTS).filter(s => s.institutionId === institutionId);
      const teacherIds = Array.from(new Set(subjects.map(s => s.teacherId)));
      const responses = getTable<StudentResponse>(DB_KEYS.RESPONSES);
      const selfEvals = getTable<SelfEvaluation>(DB_KEYS.SELF_EVALS);
      const qualEvals = getTable<QualitativeEval>(DB_KEYS.INST_EVALS);
      const questionnaires = getTable<Questionnaire>(DB_KEYS.QUESTIONNAIRES);
      let activeQ = questionnaires.find(q => q.institutionId === institutionId && (q.targetRole === 'student' || !q.targetRole));
      if (!activeQ) activeQ = { id: 'default', institutionId, title: 'Default', active: true, questions: PDF_STANDARD_QUESTIONS };
      const scores = getTable<CombinedScore>(DB_KEYS.SCORES);

      teacherIds.forEach(tid => {
          // Determine Category from Subjects (Last defined) or SelfEval
          const teacherSubjects = subjects.filter(s => s.teacherId === tid);
          const self = selfEvals.find(s => s.teacherId === tid);
          
          // Fallback category if not set
          const category: TeacherCategory = self?.header.category || teacherSubjects[0]?.teacherCategory || 'assistente';
          const multiplier = category === 'assistente_estagiario' ? 0.46 : 0.88;

          // 1. STUDENT SCORE CALCULATION
          const teacherResponses = responses.filter(r => r.teacherId === tid);
          let studentPoints = 0;

          if (teacherResponses.length > 0) {
              let totalRawPoints = 0;
              let validResponseCount = 0;
              teacherResponses.forEach(r => {
                  let rPoints = 0;
                  r.answers.forEach(a => {
                     const q = activeQ?.questions.find(qu => qu.id === a.questionId);
                     if (!q || q.type === 'text' || q.type === 'choice') return;
                     const weight = q.weight || 1; // "Pontos Obtidos" se SIM
                     const val = typeof a.value === 'number' ? a.value : 0;
                     
                     // Logic: If Binary (Sim/Não), value 1 = Sim, 0 = Não.
                     // Sim gets 'weight' points. Não gets 0.
                     if (q.type === 'binary') {
                         if (val === 1) rPoints += weight;
                     } else {
                         // Fallback for Stars/Scale: Normalize to weight
                         // ex: 5 stars = full weight. 
                         let ratio = 0;
                         if (q.type === 'stars') ratio = val / 5;
                         if (q.type === 'scale_10') ratio = val / 10;
                         rPoints += (ratio * weight);
                     }
                  });
                  totalRawPoints += rPoints;
                  validResponseCount++;
              });
              if (validResponseCount > 0) {
                  const avgPoints = totalRawPoints / validResponseCount;
                  // Apply multiplier to student score as well (implied by total score calculation)
                  studentPoints = avgPoints * multiplier;
              }
          }

          // 2. SELF EVAL CALCULATION (Points Sum)
          let selfPoints = 0;
          if (self && self.answers) {
              const a = self.answers;
              // Pontuação baseada nas respostas específicas
              selfPoints += (a.gradSubjects || 0) * 15;
              selfPoints += (a.postGradSubjects || 0) * 5;
              selfPoints += (a.theoryHours || 0) * 16;
              selfPoints += (a.practicalHours || 0) * 14;
              selfPoints += (a.consultationHours || 0) * 5;
              
              // CRITICAL: Only calculate Supervision and Regency if Full Assistant (Pleno)
              if (category === 'assistente') {
                  selfPoints += (a.gradSupervision || 0) * 6;
                  selfPoints += (a.postGradSupervision || 0) * 6;
                  selfPoints += (a.regencySubjects || 0) * 8;
              }
          }

          // 3. QUALITATIVE / INSTITUTIONAL
          const qual = qualEvals.find(q => q.teacherId === tid);
          let qualPoints = 0;
          if (qual) {
              const rawQual = (qual.deadlineCompliance || 0) + (qual.workQuality || 0);
              // Apply multiplier as per document instruction
              qualPoints = rawQual * multiplier;
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
  async getAllScores(institutionId: string): Promise<CombinedScore[]> {
      const subjects = getTable<Subject>(DB_KEYS.SUBJECTS).filter(s => s.institutionId === institutionId);
      const teacherIds = new Set(subjects.map(s => s.teacherId));
      return getTable<CombinedScore>(DB_KEYS.SCORES).filter(s => teacherIds.has(s.teacherId));
  },
  async getStudentProgress(studentId: string): Promise<{completed: number, pending: number, history: any[]}> {
      const votes = getTable<string>(DB_KEYS.VOTES_TRACKER);
      const myVotes = votes.filter(v => v.startsWith(studentId));
      return { completed: myVotes.length, pending: 0, history: [] };
  },
  async getUsers(): Promise<User[]> { return getTable<User>(DB_KEYS.USERS); },
  async resetSystem(): Promise<void> { localStorage.clear(); window.location.reload(); },
  async setFirebaseConfig(config: any) { console.log("Use setAppwriteConfig instead"); }
};

/**
 * 🟢 SUPABASE BACKEND (Robust & Scalable Implementation)
 * Preparado para conexão direta com tabelas: 'users', 'institutions', 'subjects', etc.
 * Nota de Escalabilidade: Evita-se 'select *' em tabelas grandes. Filtra-se por InstitutionID sempre que possível.
 */
const SupabaseBackend = {
    async checkHealth(): Promise<{ ok: boolean; mode: string; error?: string }> {
        if (!supabase) return { ok: false, mode: 'supabase', error: 'Supabase client not initialized' };
        // Test connection
        const { error } = await supabase.from('institutions').select('id').limit(1);
        if (error) return { ok: false, mode: 'supabase', error: error.message };
        return { ok: true, mode: 'supabase' };
    },
    async login(email: string, password?: string): Promise<{ user: User; token: string } | null> {
        if (!supabase) return null;
        
        // ⚠️ Nota: Em produção, usar Supabase Auth (GoTrue).
        // Aqui usamos uma tabela 'users' customizada para manter consistência com o frontend existente.
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('password', password) // Comparação direta (Migrar para hash em prod)
            .single();

        if (error || !data) {
            console.error("Login falhou:", error?.message);
            return null;
        }
        
        const user: User = {
            id: data.id,
            email: data.email,
            name: data.name,
            role: data.role,
            institutionId: data.institutionId || data.institution_id,
            approved: data.approved,
            avatar: data.avatar,
            course: data.course,
            level: data.level,
            category: data.category,
            shifts: data.shifts || (data.shift ? [data.shift] : []),
            classGroups: data.classGroups || (data.classGroup ? [data.classGroup] : [])
        };

        const sessionData = { user, token: 'supa_jwt_' + Date.now(), expiry: Date.now() + 86400000 };
        localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(sessionData));
        return sessionData;
    },
    async logout(): Promise<void> { 
        if (supabase) await supabase.auth.signOut();
        localStorage.removeItem(DB_KEYS.SESSION); 
    },
    async getSession(): Promise<User | null> {
        const sessionStr = localStorage.getItem(DB_KEYS.SESSION);
        if (!sessionStr) return null;
        try { return JSON.parse(sessionStr).user; } catch { return null; }
    },
    async addTeacher(institutionId: string, name: string, email: string, password?: string, avatar?: string, category?: TeacherCategory): Promise<User> {
        if (!supabase) throw new Error("Supabase não iniciado");
        
        const newUser = {
            id: `user_tch_${Date.now()}_${Math.floor(Math.random()*1000)}`,
            email,
            name,
            role: UserRole.TEACHER,
            institutionId,
            approved: true,
            avatar,
            password: password || '123456',
            category
        };

        const { data, error } = await supabase.from('users').insert([newUser]).select().single();
        if (error) throw new Error(`Erro ao adicionar docente: ${error.message}`);
        return data as User;
    },
    async addStudent(institutionId: string, name: string, email: string, password?: string, course?: string, level?: string, avatar?: string, shifts?: string[], classGroups?: string[]): Promise<User> {
        if (!supabase) throw new Error("Supabase não iniciado");

        const newUser = {
            id: `user_std_${Date.now()}_${Math.floor(Math.random()*1000)}`,
            email,
            name,
            role: UserRole.STUDENT,
            institutionId,
            approved: true,
            course,
            level,
            avatar,
            password: password || '123456',
            shifts,
            classGroups
        };

        const { data, error } = await supabase.from('users').insert([newUser]).select().single();
        if (error) throw new Error(`Erro ao adicionar estudante: ${error.message}`);
        return data as User;
    },
    async getInstitutions(): Promise<Institution[]> {
        if (!supabase) return [];
        const { data, error } = await supabase.from('institutions').select('*');
        if (error) { console.error(error); return []; }
        return (data || []).map((i: any) => ({
            ...i,
            managerEmails: i.managerEmails || i.manager_emails || []
        }));
    },
    async getInstitution(id: string): Promise<Institution | undefined> {
        if (!supabase) return undefined;
        const { data, error } = await supabase.from('institutions').select('*').eq('id', id).single();
        if (error || !data) return undefined;
        return { ...data, managerEmails: data.managerEmails || data.manager_emails || [] };
    },
    async createInstitution(data: { name: string, code: string, managerEmails: string[], logo?: string }): Promise<Institution> {
        if (!supabase) throw new Error("No client");
        const newItem = { 
            ...data, 
            id: `inst_${Date.now()}`, 
            inviteCode: `${data.code}-${Math.floor(1000 + Math.random() * 9000)}`, 
            createdAt: new Date().toISOString() 
        };
        const { data: res, error } = await supabase.from('institutions').insert([newItem]).select().single();
        if (error) throw new Error(`Erro ao criar instituição: ${error.message}`);
        return res as Institution;
    },
    async updateInstitution(id: string, data: Partial<Institution>): Promise<void> {
        if (!supabase) return;
        const { error } = await supabase.from('institutions').update(data).eq('id', id);
        if (error) throw new Error(error.message);
    },
    async inviteManager(institutionId: string, email: string, name: string, password?: string) {
        if (!supabase) return { success: false };
        const newManager = { 
            id: `user_mgr_${Date.now()}`, 
            email, 
            name, 
            role: UserRole.INSTITUTION_MANAGER, 
            institutionId, 
            approved: true, 
            password: password 
        };
        const { error } = await supabase.from('users').insert([newManager]);
        if (error) throw new Error(error.message);
        return { success: true };
    },
    async getUnapprovedTeachers(institutionId: string): Promise<User[]> {
        if (!supabase) return [];
        const { data, error } = await supabase.from('users')
            .select('*')
            .eq('institutionId', institutionId)
            .eq('role', UserRole.TEACHER)
            .eq('approved', false);
        
        if (error) console.error(error);
        return (data as User[]) || [];
    },
    async approveTeacher(teacherId: string): Promise<void> {
        if (!supabase) return;
        await supabase.from('users').update({ approved: true }).eq('id', teacherId);
    },
    async getInstitutionSubjects(institutionId: string): Promise<Subject[]> {
        if (!supabase) return [];
        const { data, error } = await supabase.from('subjects').select('*').eq('institutionId', institutionId);
        if (error) console.error(error);
        return (data as Subject[]) || [];
    },
    async assignSubject(data: any): Promise<Subject> {
        if (!supabase) throw new Error("No client");
        const newItem = { ...data, id: `sub_${Date.now()}` };
        const { data: res, error } = await supabase.from('subjects').insert([newItem]).select().single();
        if (error) throw new Error(error.message);
        return res as Subject;
    },
    // Otimizado: Busca apenas usuários da instituição ou filtra no banco se a tabela for muito grande
    async getUsers(): Promise<User[]> {
        if (!supabase) return [];
        // TODO: Em produção, nunca fazer select * sem filtro de instituição.
        // Limitado a 1000 para segurança.
        const { data, error } = await supabase.from('users').select('*').limit(1000); 
        if(error) console.error(error);
        return (data as User[]) || [];
    },
    async getInstitutionQuestionnaire(institutionId: string, role: 'student' | 'teacher' = 'student'): Promise<Questionnaire | null> {
        if (!supabase) return null;
        const { data, error } = await supabase.from('questionnaires')
            .select('*')
            .eq('institutionId', institutionId)
            .eq('targetRole', role)
            .single();
        
        if (data) return data as Questionnaire;

        // Preview Padrão se não existir
        if (role === 'student') {
             return {
                id: `default_std_${institutionId}`,
                institutionId,
                title: 'Ficha de Avaliação de Desempenho (Padrão)',
                active: true,
                questions: PDF_STANDARD_QUESTIONS,
                targetRole: 'student'
            };
        } else if (role === 'teacher') {
            return {
                id: `default_tchr_${institutionId}`,
                institutionId,
                title: 'Inquérito Institucional ao Docente (Padrão)',
                active: true,
                questions: TEACHER_STANDARD_QUESTIONS,
                targetRole: 'teacher'
            };
        }
        return null;
    },
    async saveQuestionnaire(data: Questionnaire): Promise<void> {
        if (!supabase) return;
        const { error } = await supabase.from('questionnaires').upsert(data);
        if (error) throw new Error(error.message);
    },
    // OTIMIZADO: Não busca todos os usuários do banco.
    async getAvailableSurveys(institutionId: string, userRole: UserRole = UserRole.STUDENT): Promise<{questionnaire: Questionnaire, subjects: SubjectWithTeacher[]} | null> {
        if (!supabase) return null;
        const target = userRole === UserRole.TEACHER ? 'teacher' : 'student';
        
        let { data: activeQ } = await supabase.from('questionnaires')
            .select('*')
            .eq('institutionId', institutionId)
            .eq('active', true)
            .eq('targetRole', target)
            .single();

        if (!activeQ && target === 'student') {
             activeQ = { id: `q_def_std_${institutionId}`, institutionId, title: 'Ficha Padrão', active: true, questions: PDF_STANDARD_QUESTIONS, targetRole: 'student' };
        }
        if (!activeQ && target === 'teacher') {
            activeQ = { id: `q_def_tchr_${institutionId}`, institutionId, title: 'Inquérito Padrão', active: true, questions: TEACHER_STANDARD_QUESTIONS, targetRole: 'teacher' };
        }

        if (!activeQ) return null;

        // 1. Buscar disciplinas da instituição
        const { data: subjects } = await supabase.from('subjects').select('*').eq('institutionId', institutionId);
        
        if (!subjects || subjects.length === 0) return { questionnaire: activeQ, subjects: [] };

        // 2. Extrair IDs únicos dos professores dessas disciplinas
        const teacherIds = Array.from(new Set(subjects.map((s: any) => s.teacherId)));

        // 3. Buscar APENAS os nomes dos professores envolvidos (Scalable Query)
        let teachersMap: Record<string, string> = {};
        if (teacherIds.length > 0) {
            const { data: teachers, error } = await supabase.from('users')
                .select('id, name')
                .in('id', teacherIds);
            
            if (!error && teachers) {
                teachers.forEach((t: any) => teachersMap[t.id] = t.name);
            }
        }

        const subjectsWithTeachers = subjects.map((s: any) => {
            return { ...s, teacherName: teachersMap[s.teacherId] || 'Docente' };
        });

        return { questionnaire: activeQ, subjects: subjectsWithTeachers };
    },
    async submitAnonymousResponse(userId: string, response: any): Promise<void> {
        if (!supabase) return;
        
        // Em produção, deve-se usar RLS ou uma tabela de logs para evitar votos duplicados.
        // Aqui, inserimos diretamente.
        const newResponse = { ...response, id: `resp_${Date.now()}_${Math.random().toString(36).substr(2,9)}`, timestamp: new Date().toISOString() };
        const { error } = await supabase.from('responses').insert([newResponse]);
        if (error) throw new Error(error.message);
    },
    async saveSelfEval(data: SelfEvaluation): Promise<void> {
        if (!supabase) return;
        const { error } = await supabase.from('self_evals').upsert(data, { onConflict: 'teacherId' });
        if (error) throw new Error(error.message);
    },
    async getSelfEval(teacherId: string): Promise<SelfEvaluation | undefined> {
        if (!supabase) return undefined;
        const { data, error } = await supabase.from('self_evals').select('*').eq('teacherId', teacherId).single();
        if (error || !data) return undefined;
        return data as SelfEvaluation;
    },
    async saveQualitativeEval(data: QualitativeEval): Promise<void> {
        if (!supabase) return;
        const { error } = await supabase.from('qualitative_evals').upsert(data, { onConflict: 'teacherId' });
        if (error) throw new Error(error.message);
    },
    async getQualitativeEval(teacherId: string): Promise<QualitativeEval | undefined> {
        if (!supabase) return undefined;
        const { data, error } = await supabase.from('qualitative_evals').select('*').eq('teacherId', teacherId).single();
        if (error || !data) return undefined;
        return data as QualitativeEval;
    },
    // REIMPLEMENTADO PARA SUPABASE (Client-side Heavy Lifting for now)
    // Em produção real, migrar lógica para Supabase Edge Functions.
    async calculateScores(institutionId: string): Promise<void> {
        if (!supabase) return;

        // 1. Fetch Subjects & Teachers IDs for this Institution
        const { data: subjects } = await supabase.from('subjects').select('id, teacherId, teacherCategory').eq('institutionId', institutionId);
        if (!subjects || subjects.length === 0) return;
        
        const teacherIds = Array.from(new Set(subjects.map((s: any) => s.teacherId)));

        // 2. Fetch Active Questionnaire ID for Students
        const { data: activeQ } = await supabase.from('questionnaires')
            .select('*')
            .eq('institutionId', institutionId)
            .eq('targetRole', 'student')
            .eq('active', true)
            .single();
        
        const questionnaireToUse = activeQ || { id: 'default', questions: PDF_STANDARD_QUESTIONS };

        // 3. Fetch ALL Data needed (Filtered by Teacher IDs where possible to be slightly more scalable)
        // Note: Supabase 'in' limit is usually around 65k parameters, safe for now.
        const { data: responses } = await supabase.from('responses').select('*').in('teacherId', teacherIds);
        const { data: selfEvals } = await supabase.from('self_evals').select('*').in('teacherId', teacherIds);
        const { data: qualEvals } = await supabase.from('qualitative_evals').select('*').in('teacherId', teacherIds);

        const scoresToUpsert: CombinedScore[] = [];

        teacherIds.forEach(tid => {
            
            const teacherSubjects = subjects.filter((s: any) => s.teacherId === tid);
            const self = selfEvals?.find((s: any) => s.teacherId === tid);
            
            const category: TeacherCategory = self?.header?.category || teacherSubjects[0]?.teacherCategory || 'assistente';
            const multiplier = category === 'assistente_estagiario' ? 0.46 : 0.88;

            // A. Student Score
            const teacherResponses = responses?.filter((r: any) => r.teacherId === tid) || [];
            let studentPoints = 0;
            
            if (teacherResponses.length > 0) {
                let totalRawPoints = 0;
                let validResponseCount = 0;
                
                teacherResponses.forEach((r: any) => {
                    let rPoints = 0;
                    if (r.answers && Array.isArray(r.answers)) {
                        r.answers.forEach((a: any) => {
                           const q = questionnaireToUse.questions?.find((qu: any) => qu.id === a.questionId) || PDF_STANDARD_QUESTIONS.find(pq => pq.id === a.questionId);
                           if (!q || q.type === 'text' || q.type === 'choice') return;
                           
                           const weight = q.weight || 1;
                           const val = typeof a.value === 'number' ? a.value : 0;
                           
                           if (q.type === 'binary') {
                               if (val === 1) rPoints += weight;
                           } else {
                               let ratio = 0;
                               if (q.type === 'stars') ratio = val / 5;
                               if (q.type === 'scale_10') ratio = val / 10;
                               rPoints += (ratio * weight);
                           }
                        });
                        totalRawPoints += rPoints;
                        validResponseCount++;
                    }
                });

                if (validResponseCount > 0) {
                    const avgPoints = totalRawPoints / validResponseCount;
                    // Apply multiplier to Student Score as well
                    studentPoints = avgPoints * multiplier;
                }
            }

            // B. Self Eval
            let selfPoints = 0;
            if (self && self.answers) {
                const a = self.answers;
                selfPoints += (a.gradSubjects || 0) * 15;
                selfPoints += (a.postGradSubjects || 0) * 5;
                selfPoints += (a.theoryHours || 0) * 16;
                selfPoints += (a.practicalHours || 0) * 14;
                selfPoints += (a.consultationHours || 0) * 5;
                
                // CRITICAL: Only calculate Supervision and Regency if Full Assistant (Pleno)
                if (category === 'assistente') {
                    selfPoints += (a.gradSupervision || 0) * 6;
                    selfPoints += (a.postGradSupervision || 0) * 6;
                    selfPoints += (a.regencySubjects || 0) * 8;
                }
            }

            // C. Institutional
            const qual = qualEvals?.find((q: any) => q.teacherId === tid);
            let qualPoints = 0;
            if (qual) {
                const rawQual = (qual.deadlineCompliance || 0) + (qual.workQuality || 0);
                qualPoints = rawQual * multiplier;
            }

            const final = studentPoints + selfPoints + qualPoints;

            scoresToUpsert.push({
                teacherId: tid as string,
                studentScore: parseFloat(studentPoints.toFixed(2)),
                institutionalScore: parseFloat(qualPoints.toFixed(2)),
                selfEvalScore: parseFloat(selfPoints.toFixed(2)),
                finalScore: parseFloat(final.toFixed(2)),
                lastCalculated: new Date().toISOString()
            });
        });

        // Batch Upsert
        if (scoresToUpsert.length > 0) {
            const { error } = await supabase.from('scores').upsert(scoresToUpsert);
            if (error) console.error("Erro ao salvar scores:", error);
        }
    },
    async getAllScores(institutionId: string): Promise<CombinedScore[]> {
        if (!supabase) return [];
        // First get teachers of this institution to filter scores
        const { data: subjects } = await supabase.from('subjects').select('teacherId').eq('institutionId', institutionId);
        if (!subjects) return [];
        const teacherIds = Array.from(new Set(subjects.map((s: any) => s.teacherId)));
        
        if (teacherIds.length === 0) return [];

        const { data, error } = await supabase.from('scores').select('*').in('teacherId', teacherIds);
        if (error) console.error(error);
        return (data as CombinedScore[]) || [];
    },
    async getTeacherStats(teacherId: string): Promise<CombinedScore | undefined> {
        if (!supabase) return undefined;
        const { data, error } = await supabase.from('scores').select('*').eq('teacherId', teacherId).single();
        if (error || !data) return undefined;
        return data as CombinedScore;
    },
    async getStudentProgress(studentId: string): Promise<{completed: number, pending: number, history: any[]}> {
        // Implementação simplificada: contar respostas deste usuário
        // Em um sistema real, faríamos um 'count' e compararíamos com total de disciplinas matriculadas
        if (!supabase) return { completed: 0, pending: 0, history: [] };
        
        // Esta query não é ideal para performance em massa, mas serve para o painel individual
        // O Supabase filtra 'responses' pelo usuário se RLS estiver ativo, mas aqui não temos a coluna userId explícita na tabela responses do mock?
        // No create table do doc anterior não tinha userId, apenas 'student' implícito? 
        // Ah, submitAnonymousResponse não salva o ID do aluno para garantir anonimato. 
        // Logo, não dá para saber o progresso exato sem um log de "votou".
        // Para o MVP, retornamos 0 ou usamos LocalStorage para trackear progresso localmente mesmo usando Supabase.
        
        // Fallback para LocalStorage tracker para UX do aluno, já que o anonimato impede query no banco
        const votes = getTable<string>(DB_KEYS.VOTES_TRACKER);
        const myVotes = votes.filter(v => v.startsWith(studentId));
        return { completed: myVotes.length, pending: 0, history: [] }; 
    },
    async resetSystem(): Promise<void> {
        alert("Reset não suportado em modo Supabase (Requer Admin Access no Console)");
    },
    async setFirebaseConfig(config: any) {}
};

// ==================================================================================
// 🎮 EXPORT SERVICE
// ==================================================================================
// Prioridade: Supabase > Mock (Local)

export const BackendService = isUsingSupabase ? SupabaseBackend : MockBackend;
