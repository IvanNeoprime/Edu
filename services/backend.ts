
import { User, UserRole, Institution, Subject, Questionnaire, StudentResponse, InstitutionalEval, CombinedScore, Question, SelfEvaluation, QualitativeEval } from '../types';

// ==================================================================================
// 🔥 CONFIGURAÇÃO DO FIREBASE (PARA DEPLOY)
// ==================================================================================
// Para usar o modo ONLINE (Cloud), cole suas chaves abaixo.
// Para usar o modo LOCAL (Teste), deixe como null.

const YOUR_FIREBASE_CONFIG = null; 

/* 
// CONFIGURAÇÃO DE PRODUÇÃO (COMENTADA PARA TESTES LOCAIS)
const YOUR_FIREBASE_CONFIG = {
  apiKey: "AIzaSyARmCDYuUxrrRtoZVZEUbipLZO2vMoVeC8",
  authDomain: "eduva-9d38a.firebaseapp.com",
  projectId: "eduva-9d38a",
  storageBucket: "eduva-9d38a.firebasestorage.app",
  messagingSenderId: "308016509556",
  appId: "1:308016509556:web:9284e3997467b69f489721",
  measurementId: "G-VYVW4QM3DE"
};
*/

let FIREBASE_CONFIG: any = YOUR_FIREBASE_CONFIG;

// --- PDF STANDARD QUESTIONNAIRE (APÊNDICE 1) ---
const PDF_STANDARD_QUESTIONS: Question[] = [
    // Grupo 65: Organização
    { id: "651", text: "O docente apresentou o programa temático ou analítico da disciplina?", type: "binary", weight: 4 },
    { id: "652", text: "O docente apresentou os objetivos da disciplina?", type: "binary", weight: 3 },
    { id: "653", text: "O docente apresentou a metodologia de ensino da disciplina?", type: "binary", weight: 2 },
    { id: "654", text: "O docente cumpriu com o programa temático ou analítico apresentado?", type: "binary", weight: 6 },
    // Grupo 70: Interação
    { id: "701", text: "O docente foi acessível aos estudantes?", type: "binary", weight: 1 },
    { id: "702", text: "O docente disponibilizou-se para esclarecer dúvidas?", type: "binary", weight: 1 },
    { id: "703", text: "O docente encorajou ao uso de métodos participativos na sala de aula?", type: "binary", weight: 1 },
    // Grupo 75: Avaliação
    { id: "751", text: "O docente avaliou os estudantes dentro dos prazos?", type: "binary", weight: 5 },
    { id: "752", text: "O estudante teve oportunidade de ver seus resultados depois de corrigidos?", type: "binary", weight: 3 },
    { id: "753", text: "O docente publicou os resultados da avaliação dentro dos prazos estabelecidos?", type: "binary", weight: 4 }
];

// --- Client Initialization ---
let db: any = null;
let auth: any = null;
let isUsingCloud = false;

// MOCK FIREBASE IMPORTS (To avoid build errors when not using cloud)
// In a real build, these would be imported at top level, but we keep structure clean.
// The logic below simply won't run if config is null.

const initFirebase = async () => {
    const savedConfig = localStorage.getItem('ad_firebase_config');
    const configToUse = FIREBASE_CONFIG || (savedConfig ? JSON.parse(savedConfig) : null);

    if (configToUse) {
        try {
            // Dynamic import to avoid loading heavy SDKs in Local Mode
            const { initializeApp } = await import('firebase/app');
            const { getFirestore, enableIndexedDbPersistence } = await import('firebase/firestore');
            const { getAuth } = await import('firebase/auth');

            const app = initializeApp(configToUse);
            db = getFirestore(app);
            auth = getAuth(app);
            FIREBASE_CONFIG = configToUse; 
            
            enableIndexedDbPersistence(db).catch((err) => {
                if (err.code == 'failed-precondition') {
                    console.warn('Firebase persistence failed: Multiple tabs open');
                } else if (err.code == 'unimplemented') {
                    console.warn('Firebase persistence not supported by this browser');
                }
            });

            isUsingCloud = true;
            console.log("✅ Firebase (Firestore + Auth) inicializado.");
            return true;
        } catch (e) {
            console.error("Erro ao conectar Firebase", e);
            return false;
        }
    }
    return false;
};

// Tenta iniciar imediatamente (se houver config)
if (typeof window !== 'undefined' && FIREBASE_CONFIG) {
    initFirebase();
}

// --- Constants for LocalStorage Keys (Fallback) ---
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

// Credenciais Oficiais
const SUPER_ADMIN_EMAIL = "ivandromaoze138@gmail.com"; 
const SUPER_ADMIN_PASS = "24191978a";

// Helpers de LocalStorage
const getTable = <T>(key: string): T[] => {
    try {
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {
        return [];
    }
};
const setTable = <T>(key: string, data: T[]) => localStorage.setItem(key, JSON.stringify(data));
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- SEED DATA (DADOS DE TESTE AUTOMÁTICOS) ---
const initializeSeedData = () => {
    const institutions = getTable<Institution>(DB_KEYS.INSTITUTIONS);
    
    // Só popula se não houver instituições (Evita sobrescrever dados novos)
    if (institutions.length === 0) {
        console.log("🌱 Inicializando dados de teste (Seed Data)...");
        
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
            // Super Admin (Garante que existe)
            { id: 'u_super_ivan', email: SUPER_ADMIN_EMAIL, name: 'Super Admin Ivan', role: UserRole.SUPER_ADMIN, approved: true },
            // Gestor
            { id: 'u_mgr_demo', email: 'gestor@demo.ac.mz', name: 'Gestor Modelo', role: UserRole.INSTITUTION_MANAGER, institutionId: demoInstId, approved: true },
            // Docente
            { id: 'u_tchr_demo', email: 'docente@demo.ac.mz', name: 'Prof. Carlos Teste', role: UserRole.TEACHER, institutionId: demoInstId, approved: true },
            // Aluno
            { id: 'u_std_demo', email: 'aluno@demo.ac.mz', name: 'Aluno Exemplo', role: UserRole.STUDENT, institutionId: demoInstId, approved: true }
        ];

        // Senhas para usuários de teste
        (demoUsers[1] as any).password = '123456'; // Gestor
        (demoUsers[2] as any).password = '123456'; // Docente
        (demoUsers[3] as any).password = '123456'; // Aluno

        const demoSubject: Subject = {
            id: 'sub_demo_1',
            name: 'Introdução à Informática',
            code: 'INF101',
            institutionId: demoInstId,
            teacherId: 'u_tchr_demo'
        };

        setTable(DB_KEYS.INSTITUTIONS, [demoInst]);
        // Mescla com usuários existentes
        const currentUsers = getTable<User>(DB_KEYS.USERS);
        const newUsers = [...currentUsers];
        demoUsers.forEach(du => {
            if (!newUsers.find(u => u.email === du.email)) newUsers.push(du);
        });
        setTable(DB_KEYS.USERS, newUsers);
        setTable(DB_KEYS.SUBJECTS, [demoSubject]);
        
        console.log("✅ Dados de teste criados com sucesso.");
    }
};

/**
 * MOCK BACKEND (Offline/LocalStorage Mode)
 */
const MockBackend = {
  async checkHealth(): Promise<{ ok: boolean; mode: string; error?: string }> { 
      // Inicializa dados de teste se o banco estiver vazio
      initializeSeedData();
      return { ok: true, mode: 'local' }; 
  },
  
  async login(email: string, password?: string): Promise<{ user: User; token: string } | null> {
    await delay(300); 
    
    // --- LOGIN DE SUPER ADMIN (ACESSO DE EMERGÊNCIA/MESTRE) ---
    if (email === SUPER_ADMIN_EMAIL) {
        if (password === SUPER_ADMIN_PASS) {
            const saUser: User = { 
                id: 'u_super_ivan', 
                email: SUPER_ADMIN_EMAIL, 
                name: 'Super Admin Ivan', 
                role: UserRole.SUPER_ADMIN, 
                approved: true 
            };
            
            // Tenta salvar no banco para consistência, mas não bloqueia se falhar
            try {
                const users = getTable<User>(DB_KEYS.USERS);
                if (!users.find(u => u.email === SUPER_ADMIN_EMAIL)) {
                    users.push(saUser);
                    setTable(DB_KEYS.USERS, users);
                }
            } catch (e) {
                console.warn("Aviso: Não foi possível persistir admin no storage, mas permitindo login.");
            }

            // RETORNO IMEDIATO - SUCESSO
            const sessionData = { user: saUser, token: 'sa_jwt_master_' + Date.now(), expiry: Date.now() + 86400000 };
            localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(sessionData));
            return sessionData;
        } else {
            throw new Error("Senha incorreta para Super Admin.");
        }
    }
    // -----------------------------------------------------------

    // Login normal para outros usuários
    const users = getTable<User>(DB_KEYS.USERS);
    const user = users.find(u => u.email === email);
    
    if (!user) return null; // Retorna null para disparar "Usuário não encontrado" na UI

    if (user.email !== SUPER_ADMIN_EMAIL) {
        const storedPass = (user as any).password;
        // Se não tiver senha salva (antigos mocks), aceita 123456
        const validPass = storedPass || '123456';
        
        if (password !== validPass) {
            throw new Error("Senha incorreta.");
        }
    }
    
    const sessionData = { user, token: 'mock_jwt_' + Date.now(), expiry: Date.now() + 86400000 };
    localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(sessionData));
    return { user, token: sessionData.token };
  },

  async logout(): Promise<void> { localStorage.removeItem(DB_KEYS.SESSION); },
  
  async getSession(): Promise<User | null> {
      const sessionStr = localStorage.getItem(DB_KEYS.SESSION);
      if (!sessionStr) return null;
      try {
          const session = JSON.parse(sessionStr);
          if (Date.now() > session.expiry) return null;
          return session.user;
      } catch { return null; }
  },

  async register(userData: Omit<User, 'id'> & { password?: string; inviteCode?: string }): Promise<User> {
    await delay(500);
    if (userData.role === UserRole.INSTITUTION_MANAGER) throw new Error("Gestores devem ser cadastrados pelo Super Admin.");
    
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
      if (users.find(u => u.email === email)) throw new Error("Este email já está cadastrado.");
      
      const newUser: User = { id: `user_tch_${Date.now()}`, email, name, role: UserRole.TEACHER, institutionId, approved: true };
      (newUser as any).password = password || '123456';
      
      users.push(newUser);
      setTable(DB_KEYS.USERS, users);
      return newUser;
  },

  async getInstitutions(): Promise<Institution[]> { return getTable<Institution>(DB_KEYS.INSTITUTIONS); },
  
  async createInstitution(data: any): Promise<Institution> {
      const list = getTable<Institution>(DB_KEYS.INSTITUTIONS);
      const newItem = { 
          ...data, 
          id: `inst_${Date.now()}`, 
          inviteCode: `${data.code}-${Math.floor(1000 + Math.random() * 9000)}`, 
          createdAt: new Date().toISOString() 
      };
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

  async getInstitutionQuestionnaire(institutionId: string): Promise<Questionnaire | null> {
      return getTable<Questionnaire>(DB_KEYS.QUESTIONNAIRES).find(q => q.institutionId === institutionId) || null;
  },

  async saveQuestionnaire(data: Questionnaire): Promise<void> {
      const quests = getTable<Questionnaire>(DB_KEYS.QUESTIONNAIRES);
      const idx = quests.findIndex(q => q.institutionId === data.institutionId);
      if (idx >= 0) quests[idx] = data; else quests.push(data);
      setTable(DB_KEYS.QUESTIONNAIRES, quests);
  },

  async getAvailableSurveys(institutionId: string): Promise<{questionnaire: Questionnaire, subjects: SubjectWithTeacher[]} | null> {
    let activeQ = getTable<Questionnaire>(DB_KEYS.QUESTIONNAIRES).find(q => q.institutionId === institutionId && q.active);
    if (!activeQ) {
        activeQ = { 
            id: `q_${institutionId}`, 
            institutionId, 
            title: 'Ficha de Avaliação de Desempenho (Padrão)', 
            active: true, 
            questions: PDF_STANDARD_QUESTIONS 
        };
    }
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
      if (tracker.includes(`${userId}_${response.subjectId}`)) throw new Error("Já votaste nesta disciplina.");
      
      const responses = getTable<StudentResponse>(DB_KEYS.RESPONSES);
      responses.push({ ...response, id: `resp_${Date.now()}`, timestamp: new Date().toISOString() });
      setTable(DB_KEYS.RESPONSES, responses);
      
      tracker.push(`${userId}_${response.subjectId}`);
      setTable(DB_KEYS.VOTES_TRACKER, tracker);
  },

  async calculateScores(institutionId: string): Promise<void> {
      const subjects = getTable<Subject>(DB_KEYS.SUBJECTS).filter(s => s.institutionId === institutionId);
      const teacherIds = Array.from(new Set(subjects.map(s => s.teacherId)));
      
      const responses = getTable<StudentResponse>(DB_KEYS.RESPONSES);
      const selfEvals = getTable<SelfEvaluation>(DB_KEYS.SELF_EVALS);
      const qualEvals = getTable<QualitativeEval>(DB_KEYS.INST_EVALS);
      
      const questionnaires = getTable<Questionnaire>(DB_KEYS.QUESTIONNAIRES);
      let activeQ = questionnaires.find(q => q.institutionId === institutionId);
      if (!activeQ) activeQ = { id: 'default', institutionId, title: 'Default', active: true, questions: PDF_STANDARD_QUESTIONS };

      const scores = getTable<CombinedScore>(DB_KEYS.SCORES);

      teacherIds.forEach(tid => {
          // 1. Cálculo Alunos (Peso 12%)
          const teacherResponses = responses.filter(r => r.teacherId === tid);
          let studentRawPercent = 0;

          if (teacherResponses.length > 0) {
              let totalStudentPercentages = 0;
              let validResponseCount = 0;

              teacherResponses.forEach(r => {
                  let sCurrentScore = 0;
                  let sMaxScore = 0;
                  
                  r.answers.forEach(a => {
                     const q = activeQ?.questions.find(qu => qu.id === a.questionId);
                     if (!q || q.type === 'text' || q.type === 'choice') return; // Textos não contam nota
                     
                     const weight = q.weight || 1;
                     const val = typeof a.value === 'number' ? a.value : 0;
                     
                     // Normalizar valor para escala 0 a 1
                     let norm = 0;
                     if (q.type === 'binary') norm = val; // 0 ou 1
                     else if (q.type === 'stars') norm = val / 5;
                     else if (q.type === 'scale_10') norm = val / 10;

                     sCurrentScore += (norm * weight);
                     sMaxScore += weight;
                  });

                  if (sMaxScore > 0) {
                      totalStudentPercentages += (sCurrentScore / sMaxScore);
                      validResponseCount++;
                  }
              });

              if (validResponseCount > 0) {
                  studentRawPercent = (totalStudentPercentages / validResponseCount) * 100;
              }
          }

          // 2. Cálculo Auto-Avaliação (Peso 80%)
          const self = selfEvals.find(s => s.teacherId === tid);
          let selfRawPercent = 0;
          if (self) {
              const total = (self.indicators.teachingLoad||0) + (self.indicators.supervision||0) + (self.indicators.research||0) + (self.indicators.extension||0) + (self.indicators.management||0);
              selfRawPercent = Math.min(total, 100);
          }

          // 3. Cálculo Institucional/Qualitativo (Peso 8%)
          const qual = qualEvals.find(q => q.teacherId === tid);
          let qualRawPercent = 0;
          if (qual) {
              const total = (qual.deadlineCompliance || 0) + (qual.workQuality || 0);
              qualRawPercent = (total / 20) * 100;
          }

          // 4. Fórmula Final
          const final = (selfRawPercent * 0.8) + (studentRawPercent * 0.12) + (qualRawPercent * 0.08);
          
          const newScore: CombinedScore = {
              teacherId: tid,
              studentScore: parseFloat(studentRawPercent.toFixed(1)),
              institutionalScore: parseFloat(qualRawPercent.toFixed(1)),
              finalScore: parseFloat(final.toFixed(1)),
              lastCalculated: new Date().toISOString()
          };

          const existingIdx = scores.findIndex(s => s.teacherId === tid);
          if (existingIdx >= 0) scores[existingIdx] = newScore; else scores.push(newScore);
      });
      setTable(DB_KEYS.SCORES, scores);
  },

  async getTeacherStats(teacherId: string): Promise<CombinedScore | undefined> { return getTable<CombinedScore>(DB_KEYS.SCORES).find(s => s.teacherId === teacherId); },
  async getUsers(): Promise<User[]> { return getTable<User>(DB_KEYS.USERS); },
  async resetSystem(): Promise<void> { localStorage.clear(); window.location.reload(); },
  async setFirebaseConfig(config: any) { console.log("Configuração ignorada em modo local."); }
};

/**
 * 🔥 FIREBASE BACKEND - (CÓDIGO MORTO QUANDO CONFIG É NULL)
 * Mantemos a estrutura para facilitar reativar o modo online.
 */
const FirebaseBackend = {
  // Este código só será executado se isUsingCloud for true,
  // o que é impossível com FIREBASE_CONFIG = null.
  // Mantemos aqui como placeholder.
  async checkHealth(): Promise<{ ok: boolean; mode: string; error?: string }> { return { ok: true, mode: 'cloud' }; },
  async login(): Promise<any> { return null; },
  async logout(): Promise<void> {},
  async getSession(): Promise<any> { return null; },
  async register(): Promise<any> { return null; },
  async getInstitutions(): Promise<any> { return []; },
  async createInstitution(): Promise<any> { return null; },
  async inviteManager(): Promise<any> { return { success: false }; },
  async getUnapprovedTeachers(): Promise<any> { return []; },
  async approveTeacher(): Promise<void> {},
  async addTeacher(): Promise<any> { return null; },
  async getInstitutionSubjects(): Promise<any> { return []; },
  async assignSubject(): Promise<any> { return null; },
  async saveQualitativeEval(): Promise<void> {},
  async getQualitativeEval(): Promise<any> { return undefined; },
  async saveSelfEval(): Promise<void> {},
  async getSelfEval(): Promise<any> { return undefined; },
  async getInstitutionQuestionnaire(): Promise<any> { return null; },
  async saveQuestionnaire(): Promise<void> {},
  async getAvailableSurveys(): Promise<any> { return null; },
  async submitAnonymousResponse(): Promise<void> {},
  async calculateScores(): Promise<void> {},
  async getTeacherStats(): Promise<any> { return undefined; },
  async getUsers(): Promise<any> { return []; },
  async resetSystem(): Promise<void> {},
  async setFirebaseConfig(): Promise<void> {}
};

export const BackendService = isUsingCloud ? FirebaseBackend : MockBackend;
