
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  INSTITUTION_MANAGER = 'institution_manager',
  DEPARTMENT_MANAGER = 'department_manager',
  CLASS_HEAD = 'class_head',
  TEACHER = 'teacher',
  STUDENT = 'student'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  institutionId?: string;
  department?: string;
  turma?: string; // New field for Class Head
  classe?: string; // New field for Class Head (e.g., 1º Ano, 2º Ano)
  approved?: boolean;
}

export interface Institution {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  managerEmails: string[];
  inviteCode?: string;
}

export type TeacherCategory = 'assistente' | 'assistente_estagiario' | 'pleno';

export interface Subject {
  id: string;
  name: string;
  code?: string;
  institutionId: string;
  teacherId: string;
  academicYear?: string;
  level?: string;
  semester?: string;
  course?: string;
  teacherCategory?: TeacherCategory;
}

export type QuestionType = 'binary' | 'scale_10' | 'stars' | 'text' | 'choice' | 'quantity';

export type QuestionnaireTarget = 'student' | 'teacher_self' | 'manager_qual' | 'class_head'; // Added class_head

export interface Question {
  id: string;
  code?: string;
  category?: string;
  text: string;
  type: QuestionType;
  weight?: number;
  options?: string[];
}

export interface Questionnaire {
  id: string;
  institutionId: string;
  title: string;
  questions: Question[];
  active: boolean;
  target: QuestionnaireTarget;
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
  header: {
    department: string;
    category: TeacherCategory;
    function: string;
    contractRegime: string;
    workPeriod: string;
    academicYear: string;
  };
  answers: Record<string, number>; 
}

export interface QualitativeEval {
  teacherId: string;
  institutionId?: string;
  answers: Record<string, number>; 
  evaluatedAt?: string;
}

export interface CombinedScore {
  teacherId: string;
  studentScore: number;
  institutionalScore: number; 
  selfEvalScore: number;
  finalScore: number;
  lastCalculated: string;
}

export interface Session {
  user: User | null;
  token: string | null;
}
