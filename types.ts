
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
}

export interface Institution {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  managerEmails: string[];
  inviteCode?: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  institutionId: string;
  teacherId: string;
}

export type QuestionType = 'binary' | 'scale_10' | 'stars' | 'text' | 'choice';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  weight?: number; // Used for scoring (0 for text/feedback questions)
  options?: string[]; // For multiple choice
}

export interface Questionnaire {
  id: string;
  institutionId: string;
  title: string;
  questions: Question[];
  active: boolean;
}

// Anonymity Guarantee: This interface intentionally lacks a userId or studentId
export interface StudentResponse {
  id: string;
  questionnaireId: string;
  teacherId: string;
  subjectId: string;
  answers: { questionId: string; value: number | string }[]; // Value can now be text
  timestamp: string;
}

export interface InstitutionalEval {
  teacherId: string;
  institutionId: string;
  score: number; // 0-100
  evaluatedAt: string;
}

export interface SelfEvaluation {
  teacherId: string;
  indicators: {
    teachingLoad: number;
    supervision: number;
    research: number;
    extension: number;
    management: number;
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
  studentScore: number; // 0-100
  institutionalScore: number; // 0-100
  finalScore: number; // (Student * 0.7) + (Inst * 0.3)
  lastCalculated: string;
}

export interface Session {
  user: User | null;
  token: string | null;
}
