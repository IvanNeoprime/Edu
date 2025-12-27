
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  INSTITUTION_MANAGER = 'institution_manager',
  TEACHER = 'teacher',
  STUDENT = 'student'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  institutionId?: string;
  approved?: boolean; // For teachers
  // Novos campos para alunos
  course?: string;
  level?: string; // Ano curricular (ex: 1, 2, 3)
}

export interface Institution {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  managerEmails: string[];
  inviteCode?: string;
}

export type TeacherCategory = 'assistente' | 'assistente_estagiario';

export interface Subject {
  id: string;
  name: string;
  code?: string; // Agora opcional
  institutionId: string;
  teacherId: string;
  // Novos campos solicitados
  academicYear?: string;
  level?: string;
  semester?: string;
  course?: string;
  teacherCategory?: TeacherCategory;
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
  // Novos campos para upload
  attachmentUrl?: string; // Base64 ou Link
  attachmentName?: string;
}

export interface StudentResponse {
  id: string;
  questionnaireId: string;
  teacherId: string;
  subjectId: string;
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
