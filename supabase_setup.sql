
-- ==============================================================================
-- 🚨 SCRIPT DE CORREÇÃO URGENTE (Execute no SQL Editor do Supabase)
-- Este script adiciona as colunas 'modality' e outras que estão faltando na tabela 'users'
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
    duration integer,
    semester text,
    modality text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Habilita Segurança (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- 4. Atualizar Políticas de Segurança (Para evitar erros 403 Forbidden)
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

-- 5. Importante: Força a atualização do cache do esquema da API
NOTIFY pgrst, 'reload schema';
