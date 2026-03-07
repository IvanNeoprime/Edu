-- ==============================================================================
-- 🚨 SCRIPT DE CORREÇÃO (Execute no SQL Editor do Supabase)
-- Este script aplica as correções necessárias para o rastreio de votos e respostas.
-- ==============================================================================

-- 1. Garantir que a tabela votes_tracker existe
CREATE TABLE IF NOT EXISTS public.votes_tracker (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "userId" text NOT NULL,
    "subjectId" text NOT NULL,
    "institutionId" text,
    "createdAt" timestamp with time zone DEFAULT now(),
    UNIQUE("userId", "subjectId")
);

-- 2. Habilitar RLS para votes_tracker e criar política de acesso total
ALTER TABLE public.votes_tracker ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON public.votes_tracker;
CREATE POLICY "Allow All" ON public.votes_tracker FOR ALL USING (true) WITH CHECK (true);

-- 3. Alterar o tipo da coluna 'id' na tabela 'responses' para texto (se necessário)
-- Como o frontend gera IDs no formato 'resp_123456_abc', o tipo uuid falha.
-- Nota: Se a tabela já tiver dados com UUIDs, esta conversão funcionará sem problemas.
DO $$
BEGIN
    -- Verifica se a coluna id é do tipo uuid
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='responses' AND column_name='id' AND data_type='uuid'
    ) THEN
        -- Remove o default gen_random_uuid() temporariamente
        ALTER TABLE public.responses ALTER COLUMN id DROP DEFAULT;
        -- Altera o tipo para text
        ALTER TABLE public.responses ALTER COLUMN id TYPE text USING id::text;
    END IF;
END $$;

-- 4. Garantir que as tabelas de avaliação têm as colunas corretas e RLS
ALTER TABLE public.self_evals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON public.self_evals;
CREATE POLICY "Allow All" ON public.self_evals FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.qualitative_evals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON public.qualitative_evals;
CREATE POLICY "Allow All" ON public.qualitative_evals FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON public.scores;
CREATE POLICY "Allow All" ON public.scores FOR ALL USING (true) WITH CHECK (true);

-- Forçar atualização do cache do esquema
NOTIFY pgrst, 'reload schema';
