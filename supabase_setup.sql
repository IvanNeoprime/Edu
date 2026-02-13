
-- ==============================================================================
-- 🛠️ CORREÇÃO DE ERRO: TABELA 'COURSES' COM NOVOS CAMPOS
-- Execute este script no SQL Editor do Supabase.
-- ==============================================================================

-- 1. Cria a tabela de Cursos se ela não existir
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

-- 2. Atualiza a tabela de Usuários para suportar lista de cursos (para docentes)
--    E novos campos para Alunos (Semestre e Modalidade)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS courses text[];
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS semester text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS modality text;

-- 3. Habilita Segurança (RLS)
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- 4. Cria políticas de acesso
DROP POLICY IF EXISTS "Permitir leitura pública de cursos" ON public.courses;
CREATE POLICY "Permitir leitura pública de cursos" 
ON public.courses FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Permitir criação de cursos" ON public.courses;
CREATE POLICY "Permitir criação de cursos" 
ON public.courses FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir exclusão de cursos" ON public.courses;
CREATE POLICY "Permitir exclusão de cursos" 
ON public.courses FOR DELETE 
USING (true);

-- ==============================================================================
-- ✅ FIM DO SCRIPT
-- ==============================================================================
