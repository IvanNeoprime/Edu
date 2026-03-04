
-- ==============================================================================
-- 🚨 SCRIPT DE CORREÇÃO URGENTE (Execute no SQL Editor do Supabase)
-- Este script garante que todas as colunas necessárias existam, mesmo se a tabela já foi criada antes.
-- ==============================================================================

-- 1. Adicionar colunas faltantes na tabela 'users'
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "modality" text;          -- Presencial, Online, Híbrido
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "semester" text;          -- 1, 2, Anual
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "shifts" text[];          -- Array: ['Diurno', 'Noturno']
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "classGroups" text[];     -- Array: ['A', 'B']
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "jobTitle" text;          -- Cargo do Docente
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "courses" text[];         -- Array de cursos para docentes
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "course" text;            -- Curso único para alunos
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "level" text;             -- Ano curricular
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "mustChangePassword" boolean DEFAULT false;

-- 2. Garantir que a tabela 'courses' existe
CREATE TABLE IF NOT EXISTS public.courses (
    id text NOT NULL PRIMARY KEY,
    "institutionId" text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. ADICIONAR COLUNAS FALTANTES NA TABELA 'COURSES' (Correção do Erro)
-- Usamos ALTER TABLE para garantir a criação mesmo se a tabela já existir
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS "modality" text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS "semester" text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS "duration" integer;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS "classGroups" text[];

-- 4. Garantir que a tabela 'subjects' existe
CREATE TABLE IF NOT EXISTS public.subjects (
    id text NOT NULL PRIMARY KEY,
    name text NOT NULL,
    code text,
    "institutionId" text NOT NULL,
    "teacherId" text,
    "academicYear" text,
    level text,
    semester text,
    course text,
    "teacherCategory" text,
    "classGroup" text,
    shift text,
    modality text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. ADICIONAR COLUNAS FALTANTES NA TABELA 'SUBJECTS'
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS "academicYear" text;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS level text;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS semester text;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS course text;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS "teacherCategory" text;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS "classGroup" text;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS shift text;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS modality text;

-- 6. Habilita Segurança (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- 7. Atualizar Políticas de Segurança (Para evitar erros 403 Forbidden)
-- Removemos políticas antigas conflitantes se existirem e recriamos

DROP POLICY IF EXISTS "Permitir leitura pública de users" ON public.users;
CREATE POLICY "Permitir leitura pública de users" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção de users" ON public.users;
CREATE POLICY "Permitir inserção de users" ON public.users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização de users" ON public.users;
CREATE POLICY "Permitir atualização de users" ON public.users FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir leitura pública de courses" ON public.courses;
CREATE POLICY "Permitir leitura pública de courses" ON public.courses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir criação de cursos" ON public.courses;
CREATE POLICY "Permitir criação de cursos" ON public.courses FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir exclusão de cursos" ON public.courses;
CREATE POLICY "Permitir exclusão de cursos" ON public.courses FOR DELETE USING (true);

DROP POLICY IF EXISTS "Permitir leitura pública de subjects" ON public.subjects;
CREATE POLICY "Permitir leitura pública de subjects" ON public.subjects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção de subjects" ON public.subjects;
CREATE POLICY "Permitir inserção de subjects" ON public.subjects FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização de subjects" ON public.subjects;
CREATE POLICY "Permitir atualização de subjects" ON public.subjects FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir exclusão de subjects" ON public.subjects;
CREATE POLICY "Permitir exclusão de subjects" ON public.subjects FOR DELETE USING (true);

-- 8. Importante: Força a atualização do cache do esquema da API
NOTIFY pgrst, 'reload schema';
