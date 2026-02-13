
-- =========================================================
-- 🛠️ SCRIPT DE PREPARAÇÃO DA BASE DE DADOS (SUPABASE)
-- Execute este script no SQL Editor do Supabase para corrigir
-- o erro de "sistema não está a calcular".
-- =========================================================

-- 1. Tabela de Avaliações Qualitativas (Gestor)
CREATE TABLE IF NOT EXISTS public.qualitative_evals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "teacherId" text NOT NULL,
    "institutionId" text,
    "deadlineCompliance" numeric DEFAULT 0,
    "workQuality" numeric DEFAULT 0,
    comments text,
    "evaluatedAt" timestamp with time zone DEFAULT now(),
    UNIQUE("teacherId")
);

-- 2. Tabela de Auto-Avaliações (Docente)
CREATE TABLE IF NOT EXISTS public.self_evals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "teacherId" text NOT NULL,
    "institutionId" text,
    header jsonb, -- Guarda categoria, regime, etc
    answers jsonb, -- Guarda as respostas dos grupos G1 a G8
    comments text,
    "createdAt" timestamp with time zone DEFAULT now(),
    UNIQUE("teacherId")
);

-- 3. Tabela de Respostas dos Alunos (Inquéritos)
CREATE TABLE IF NOT EXISTS public.responses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "institutionId" text NOT NULL,
    "questionnaireId" text,
    "teacherId" text, -- Docente avaliado
    "subjectId" text, -- Disciplina
    answers jsonb, -- Array de { questionId, value }
    timestamp timestamp with time zone DEFAULT now()
);

-- 4. Tabela de Scores Finais (Resultados)
CREATE TABLE IF NOT EXISTS public.scores (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "teacherId" text NOT NULL,
    "studentScore" numeric DEFAULT 0,
    "institutionalScore" numeric DEFAULT 0,
    "selfEvalScore" numeric DEFAULT 0,
    "finalScore" numeric DEFAULT 0,
    "lastCalculated" timestamp with time zone DEFAULT now(),
    UNIQUE("teacherId")
);

-- 5. Habilitar RLS (Segurança) mas permitir acesso público por enquanto para evitar bloqueios
ALTER TABLE public.qualitative_evals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.self_evals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- Criar políticas permissivas (Para fins de protótipo/demonstração)
CREATE POLICY "Public Read Qual" ON public.qualitative_evals FOR SELECT USING (true);
CREATE POLICY "Public Write Qual" ON public.qualitative_evals FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Qual" ON public.qualitative_evals FOR UPDATE USING (true);

CREATE POLICY "Public Read Self" ON public.self_evals FOR SELECT USING (true);
CREATE POLICY "Public Write Self" ON public.self_evals FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Self" ON public.self_evals FOR UPDATE USING (true);

CREATE POLICY "Public Read Resp" ON public.responses FOR SELECT USING (true);
CREATE POLICY "Public Write Resp" ON public.responses FOR INSERT WITH CHECK (true);

CREATE POLICY "Public Read Score" ON public.scores FOR SELECT USING (true);
CREATE POLICY "Public Write Score" ON public.scores FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Score" ON public.scores FOR UPDATE USING (true);

-- Notificar recarregamento do schema
NOTIFY pgrst, 'reload schema';
