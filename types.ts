
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  INSTITUTION_MANAGER = 'institution_manager',
  TEACHER = 'teacher',
  STUDENT = 'student'
}

export type TeacherCategory = 'assistente' | 'assistente_estagiario';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  institutionId?: string;
  approved?: boolean; // For teachers
  avatar?: string; // Base64 ou URL da foto de perfil
  mustChangePassword?: boolean; // Adicionado para controle de troca de senha
  // Novos campos para alunos
  course?: string; // Mantido para Alunos (Curso Principal)
  courses?: string[]; // Novo campo para Docentes (Múltiplos Cursos)
  level?: string; // Ano curricular (ex: 1, 2, 3)
  semester?: string; // Semestre de Frequência (Novo)
  modality?: 'Presencial' | 'Online' | 'Híbrido'; // Modalidade de Ensino (Novo)
  shifts?: ('Diurno' | 'Noturno')[]; // Lista de turnos do aluno
  classGroups?: string[]; // Lista de turmas do aluno (ex: ['A', 'B'])
  // Novo campo para docentes
  category?: TeacherCategory;
  jobTitle?: string; // Nova Função/Cargo (Ex: Director, Docente)
}

export interface Course {
  id: string;
  institutionId: string;
  name: string;
  code: string; // Sigla (ex: LEI)
  duration?: number; // Anos
  semester?: string; // Novo: Semestre (ex: 1, 2, Anual)
  modality?: 'Presencial' | 'Online'; // Novo: Modalidade
  classGroups?: string[]; // Novo: Lista de Turmas do Curso (ex: A, B, C)
}

export interface Institution {
  id: string;
  name: string;
  code: string;
  logo?: string; // Base64 ou URL do logotipo
  createdAt: string;
  managerEmails: string[];
  inviteCode?: string;
  // Novos campos para gestão de período
  isEvaluationOpen?: boolean;
  evaluationPeriodName?: string;
  selfEvalTemplate?: SelfEvalTemplate; // Configuração personalizada da auto-avaliação
}

export interface Subject {
  id: string;
  name: string;
  code?: string; // Agora opcional
  institutionId: string;
  teacherId?: string; // Agora opcional (pode ser criada sem professor)
  // Novos campos solicitados para contexto
  academicYear?: string;
  level?: string;
  semester?: string;
  course?: string;
  teacherCategory?: TeacherCategory;
  classGroup?: string; // Identificador da Turma (ex: A, B)
  shift?: 'Diurno' | 'Noturno'; // Novo campo restrito
  modality?: 'Presencial' | 'Online'; // Novo campo de modalidade
}

export type QuestionType = 'binary' | 'scale_10' | 'stars' | 'text' | 'choice';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  weight?: number; // Pontos Obtidos
  options?: string[]; // For multiple choice
}

export interface Questionnaire {
  id: string;
  institutionId: string;
  title: string;
  questions: Question[];
  active: boolean;
  // Novo campo para definir público alvo
  targetRole?: 'student' | 'teacher'; 
}

export interface StudentResponse {
  id: string;
  institutionId: string; // Adicionado para validação de período
  questionnaireId: string;
  teacherId?: string; // Opcional se for um inquérito geral para docentes
  subjectId?: string; // Opcional se for um inquérito geral
  answers: { questionId: string; value: number | string }[];
  timestamp: string;
}

export interface InstitutionalEval {
  teacherId: string;
  institutionId: string;
  score: number;
  evaluatedAt: string;
}

// Configuração Dinâmica da Auto-Avaliação
export interface SelfEvalItemConfig {
    key: string;
    label: string;
    description: string;
    scoreValue: number; // Quantos pontos vale cada unidade deste item
    exclusiveTo?: TeacherCategory[]; // Array de categorias permitidas (se vazio/undefined = todas)
}

export interface SelfEvalGroupConfig {
    id: string;
    title: string;
    maxPoints: number;
    items: SelfEvalItemConfig[];
    exclusiveTo?: TeacherCategory[]; // Array de categorias permitidas para o grupo
}

export interface SelfEvalTemplate {
    groups: SelfEvalGroupConfig[];
}

export interface SelfEvaluation {
  teacherId: string;
  institutionId: string; // Adicionado para validação
  // Cabeçalho
  header: {
    category: TeacherCategory;
    function: string;
    contractRegime: string; // Tempo inteiro/parcial
    workPeriod: string; // Laboral/PL
    academicYear: string;
  };
  // Respostas agora são um Record dinâmico, pois as chaves podem mudar
  answers: Record<string, number>;
  // Novo campo: Avaliação Qualitativa descritiva do próprio docente
  comments?: string; 
}

export interface QualitativeEval {
  teacherId: string;
  institutionId?: string;
  deadlineCompliance?: number;
  workQuality?: number;
  score?: number;
  evaluatedAt?: string;
  comments?: string; // Adicionado para comentários do gestor
}

export interface SubjectScoreDetail {
    subjectName: string;
    classGroup: string;
    shift: string;
    course: string;
    score: number; // Média de 0 a 20
    responseCount: number;
}

export interface CombinedScore {
  teacherId: string;
  studentScore: number; // Pontos calculados (Coeficiente aplicado - Média Geral)
  institutionalScore: number; 
  selfEvalScore: number; // Pontos absolutos
  finalScore: number; // Soma total
  lastCalculated: string;
  subjectDetails?: SubjectScoreDetail[]; // Novo: Detalhamento por turma
}

export interface Session {
  user: User | null;
  token: string | null;
}
