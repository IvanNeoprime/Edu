-- ==============================================================================
-- 🚀 SCHEMA COMPLETO DO SISTEMA DE AVALIAÇÃO DOCENTE (SUPABASE)
-- Execute este script no SQL Editor do Supabase para configurar todas as tabelas.
-- ==============================================================================

-- 1. Tabela de Instituições
CREATE TABLE IF NOT EXISTS public.institutions (
    id text PRIMARY KEY,
    name text NOT NULL,
    code text NOT NULL,
    logo text,
    "createdAt" timestamp with time zone DEFAULT now(),
    "managerEmails" text[] DEFAULT '{}',
    "inviteCode" text,
    "isEvaluationOpen" boolean DEFAULT false,
    "evaluationStartDate" text,
    "evaluationEndDate" text,
    "categoryWeights" jsonb DEFAULT '[]',
    "evaluationPeriodName" text,
    "selfEvalTemplate" jsonb
);

-- 2. Tabela de Utilizadores
CREATE TABLE IF NOT EXISTS public.users (
    id text PRIMARY KEY,
    email text UNIQUE NOT NULL,
    name text NOT NULL,
    role text NOT NULL, -- super_admin, institution_manager, teacher, student
    "institutionId" text REFERENCES public.institutions(id),
    approved boolean DEFAULT true,
    avatar text,
    password text DEFAULT '123456',
    "mustChangePassword" boolean DEFAULT false,
    "plainPassword" text, -- Armazena a senha em texto plano (Apenas para Super Admin/Debug)
    -- Campos para Alunos
    course text,
    "courseId" text,
    level text,
    semester text,
    modality text,
    shifts text[],
    "classGroups" text[],
    -- Campos para Docentes
    category text,
    "jobTitle" text,
    deleted boolean DEFAULT false,
    "createdAt" timestamp with time zone DEFAULT now()
);

-- 3. Tabela de Cursos
CREATE TABLE IF NOT EXISTS public.courses (
    id text PRIMARY KEY,
    "institutionId" text REFERENCES public.institutions(id),
    name text NOT NULL,
    code text NOT NULL,
    duration integer,
    semester text,
    modality text,
    "classGroups" text[],
    deleted boolean DEFAULT false,
    "createdAt" timestamp with time zone DEFAULT now()
);

-- 4. Tabela de Disciplinas (Subjects)
CREATE TABLE IF NOT EXISTS public.subjects (
    id text PRIMARY KEY,
    name text NOT NULL,
    code text,
    "institutionId" text REFERENCES public.institutions(id),
    "teacherId" text, -- Pode ser nulo se não houver professor atribuído
    "academicYear" text,
    level text,
    semester text,
    course text,
    "courseId" text REFERENCES public.courses(id),
    "teacherCategory" text,
    "classGroup" text,
    shift text,
    modality text,
    deleted boolean DEFAULT false,
    "createdAt" timestamp with time zone DEFAULT now()
);

-- 5. Tabela de Questionários
CREATE TABLE IF NOT EXISTS public.questionnaires (
    id text PRIMARY KEY,
    "institutionId" text REFERENCES public.institutions(id),
    title text NOT NULL,
    questions jsonb NOT NULL,
    active boolean DEFAULT true,
    "targetRole" text DEFAULT 'student' -- student ou teacher
);

-- 6. Tabela de Respostas (Responses)
CREATE TABLE IF NOT EXISTS public.responses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "institutionId" text NOT NULL,
    "questionnaireId" text,
    "teacherId" text,
    "subjectId" text,
    answers jsonb NOT NULL,
    timestamp timestamp with time zone DEFAULT now()
);

-- 7. Tabela de Auto-Avaliações (Self Evaluations)
CREATE TABLE IF NOT EXISTS public.self_evals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "teacherId" text NOT NULL UNIQUE,
    "institutionId" text,
    header jsonb,
    answers jsonb,
    comments text,
    "createdAt" timestamp with time zone DEFAULT now()
);

-- 8. Tabela de Avaliações Qualitativas (Qualitative Evaluations)
CREATE TABLE IF NOT EXISTS public.qualitative_evals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "teacherId" text NOT NULL UNIQUE,
    "institutionId" text,
    "deadlineCompliance" numeric DEFAULT 0,
    "workQuality" numeric DEFAULT 0,
    score numeric DEFAULT 0,
    comments text,
    "evaluatedAt" timestamp with time zone DEFAULT now()
);

-- 9. Tabela de Scores Finais (Calculated Scores)
CREATE TABLE IF NOT EXISTS public.scores (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "teacherId" text NOT NULL UNIQUE,
    "studentScore" numeric DEFAULT 0,
    "institutionalScore" numeric DEFAULT 0,
    "selfEvalScore" numeric DEFAULT 0,
    "finalScore" numeric DEFAULT 0,
    "lastCalculated" timestamp with time zone DEFAULT now(),
    "subjectDetails" jsonb DEFAULT '[]'
);

-- 10. Tabela de Rastreio de Votos (Prevent Duplicate Voting)
CREATE TABLE IF NOT EXISTS public.votes_tracker (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "userId" text NOT NULL,
    "subjectId" text NOT NULL,
    "institutionId" text,
    "createdAt" timestamp with time zone DEFAULT now(),
    UNIQUE("userId", "subjectId")
);

-- 11. Tabela de Logs de Auditoria
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id text PRIMARY KEY,
    "userId" text NOT NULL,
    "userName" text NOT NULL,
    "userRole" text NOT NULL,
    "institutionId" text NOT NULL,
    action text NOT NULL,
    "targetId" text,
    "targetType" text,
    "oldValues" jsonb,
    "newValues" jsonb,
    timestamp timestamp with time zone DEFAULT now()
);

-- 12. Tabela de Períodos Académicos
CREATE TABLE IF NOT EXISTS public.academic_periods (
    id text PRIMARY KEY,
    "institutionId" text NOT NULL,
    name text NOT NULL,
    "startDate" text,
    "endDate" text,
    "isCurrent" boolean DEFAULT false
);

-- ==============================================================================
-- 🔒 POLÍTICAS DE SEGURANÇA (RLS)
-- Nota: Estas políticas são permissivas para facilitar o desenvolvimento.
-- ==============================================================================

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.self_evals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualitative_evals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_periods ENABLE ROW LEVEL SECURITY;

-- Criar políticas genéricas de acesso total (Apenas para Prototipagem)
-- Em produção, estas políticas devem ser restritas por role e institutionId.

DO $$ 
DECLARE 
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow All" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Allow All" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

-- Forçar atualização do cache do esquema
NOTIFY pgrst, 'reload schema';
