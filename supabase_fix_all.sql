-- ==============================================================================
-- 🚨 SCRIPT DE CORREÇÃO MESTRE (Execute no SQL Editor do Supabase)
-- Este script garante que todas as tabelas e colunas necessárias para a aplicação
-- existam e estejam atualizadas.
-- ==============================================================================

-- 1. Garantir colunas na tabela 'users'
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "modality" text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "semester" text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "shifts" text[];
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "classGroups" text[];
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "jobTitle" text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "courses" text[];
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "course" text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "level" text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "mustChangePassword" boolean DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "plainPassword" text;

-- 2. Garantir colunas na tabela 'courses'
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS "modality" text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS "semester" text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS "duration" integer;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS "classGroups" text[];

-- 3. Garantir colunas na tabela 'subjects'
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS "academicYear" text;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS "level" text;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS "semester" text;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS "course" text;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS "teacherCategory" text;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS "classGroup" text;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS "shift" text;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS "modality" text;

-- 4. Garantir colunas na tabela 'responses'
ALTER TABLE public.responses ADD COLUMN IF NOT EXISTS "evaluationPeriodName" text DEFAULT 'default';
ALTER TABLE public.responses ADD COLUMN IF NOT EXISTS "subjectId" text;

-- 5. Garantir colunas na tabela 'votes_tracker'
ALTER TABLE public.votes_tracker ADD COLUMN IF NOT EXISTS "evaluationPeriodName" text DEFAULT 'default';

-- 6. Forçar a atualização do cache do esquema da API do Supabase
NOTIFY pgrst, 'reload schema';

SELECT 'Script executado com sucesso. O esquema foi atualizado.' AS status;
