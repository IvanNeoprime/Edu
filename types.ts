
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
  // Novos campos para alunos
  course?: string;
  level?: string; // Ano curricular (ex: 1, 2, 3)
  shifts?: ('Diurno' | 'Noturno')[]; // Lista de turnos do aluno
  classGroups?: string[]; // Lista de turmas do aluno (ex: ['A', 'B'])
  // Novo campo para docentes
  category?: TeacherCategory;
}

export interface Institution {
  id: string;
  name: string;
  code: string;
  logo?: string; // Base64 ou URL do logotipo
  createdAt: string;
  managerEmails: string[];
  inviteCode?: string;
}

export interface Subject {
  id: string;
  name: string;
  code?: string; // Agora opcional
  institutionId: string;
  teacherId: string;
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

export interface SelfEvaluation {
  teacherId: string;
  // Cabeçalho
  header: {
    category: TeacherCategory;
    function: string;
    contractRegime: string; // Tempo inteiro/parcial
    workPeriod: string; // Laboral/PL
    academicYear: string;
  };
  // Respostas específicas (Quantidades que serão multiplicadas pelos pontos)
  answers: {
    gradSubjects?: number;
    postGradSubjects?: number;
    theoryHours?: number;
    practicalHours?: number;
    consultationHours?: number;
    gradSupervision?: number;
    postGradSupervision?: number;
    regencySubjects?: number;
  };
}

export interface QualitativeEval {
  teacherId: string;
  institutionId?: string;
  deadlineCompliance?: number;
  workQuality?: number;
  score?: number;
  evaluatedAt?: string;
}

export interface CombinedScore {
  teacherId: string;
  studentScore: number; // Pontos calculados (Coeficiente aplicado)
  institutionalScore: number; 
  selfEvalScore: number; // Pontos absolutos
  finalScore: number; // Soma total
  lastCalculated: string;
}

export interface Session {
  user: User | null;
  token: string | null;
}
