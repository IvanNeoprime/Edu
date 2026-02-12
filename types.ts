
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
  approved?: boolean;
  avatar?: string;
  mustChangePassword?: boolean;
  password?: string;
  course?: string;
  level?: string; // 1 a 6
  studentCode?: string;
  semester?: '1' | '2';
  shifts?: ('Diurno' | 'Noturno')[];
  classGroups?: string[];
  category?: TeacherCategory;
}

export interface Institution {
  id: string;
  name: string;
  code: string;
  logo?: string;
  createdAt: string;
  managerEmails: string[];
  inviteCode?: string;
  isEvaluationOpen?: boolean;
  evaluationPeriodName?: string;
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
  institutionId: string;
  teacherId: string;
  academicYear?: string;
  level?: string;
  semester?: '1' | '2';
  course?: string;
  teacherCategory?: TeacherCategory;
  classGroup?: string;
  shift?: 'Diurno' | 'Noturno';
  modality?: 'Presencial' | 'Online';
}

export type QuestionType = 'binary' | 'scale_10' | 'stars' | 'text';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  weight?: number;
}

export interface Questionnaire {
  id: string;
  institutionId: string;
  title: string;
  questions: Question[];
  active: boolean;
  targetRole?: 'student' | 'teacher'; 
}

export interface StudentResponse {
  id: string;
  institutionId: string;
  questionnaireId: string;
  teacherId?: string;
  subjectId?: string;
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
  institutionId: string;
  header: {
    category: TeacherCategory;
    function: string;
    contractRegime: string;
    workPeriod: string;
    academicYear: string;
  };
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
  comments?: string; 
}

export interface QualitativeEval {
  teacherId: string;
  institutionId?: string;
  deadlineCompliance?: number;
  workQuality?: number;
  score?: number;
  evaluatedAt?: string;
  comments?: string;
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
