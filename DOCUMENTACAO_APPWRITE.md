
# 🐘 Guia de Banco de Dados: Supabase

> **Nota:** Este arquivo contém o esquema SQL completo para configurar o Supabase (PostgreSQL).

## 1. Configuração Inicial

1.  Crie um projeto em [supabase.com](https://supabase.com).
2.  Obtenha a `Project URL` e a `anon public key`.
3.  Configure-as no código ou variáveis de ambiente.

## 2. Schema SQL (Criação de Tabelas)

Copie e cole o seguinte código no **SQL Editor** do seu painel Supabase para criar toda a estrutura:

```sql
-- 1. Extensão para gerar IDs únicos
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Usuários (Metadados)
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'institution_manager', 'teacher', 'student')),
    "institutionId" TEXT,
    approved BOOLEAN DEFAULT FALSE,
    password TEXT,
    avatar TEXT,
    course TEXT, -- Curso principal (para Alunos)
    courses TEXT[], -- Array de Cursos (para Docentes)
    level TEXT, -- Ano curricular
    semester TEXT, -- Semestre de Frequência (NOVO)
    modality TEXT, -- Modalidade: Presencial, Online, Híbrido (NOVO)
    "mustChangePassword" BOOLEAN DEFAULT FALSE,
    category TEXT, -- 'assistente' ou 'assistente_estagiario'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tabela de Instituições
CREATE TABLE institutions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    "managerEmails" TEXT[],
    "inviteCode" TEXT,
    logo TEXT,
    "isEvaluationOpen" BOOLEAN DEFAULT TRUE,
    "evaluationPeriodName" TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Tabela de Disciplinas
CREATE TABLE subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    "institutionId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "teacherCategory" TEXT,
    "academicYear" TEXT,
    level TEXT,
    semester TEXT,
    course TEXT,
    "classGroup" TEXT,
    shift TEXT,
    modality TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Tabela de Cursos
CREATE TABLE courses (
    id TEXT PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    duration INTEGER,
    semester TEXT,
    modality TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Tabela de Questionários
CREATE TABLE questionnaires (
    id TEXT PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    title TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    questions JSONB,
    "targetRole" TEXT DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Tabela de Respostas (Estudantes)
CREATE TABLE responses (
    id TEXT PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "questionnaireId" TEXT NOT NULL,
    "teacherId" TEXT,
    "subjectId" TEXT,
    answers JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. Tabela de Auto-Avaliação (Docentes)
CREATE TABLE self_evals (
    "teacherId" TEXT PRIMARY KEY,
    "institutionId" TEXT,
    header JSONB,
    answers JSONB,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 9. Tabela de Avaliação Qualitativa (Gestores)
CREATE TABLE qualitative_evals (
    "teacherId" TEXT PRIMARY KEY,
    "institutionId" TEXT,
    "deadlineCompliance" INTEGER,
    "workQuality" INTEGER,
    score FLOAT,
    comments TEXT,
    "evaluatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 10. Tabela de Scores Finais (Relatórios)
CREATE TABLE scores (
    "teacherId" TEXT PRIMARY KEY,
    "studentScore" FLOAT,
    "institutionalScore" FLOAT,
    "selfEvalScore" FLOAT,
    "finalScore" FLOAT,
    "lastCalculated" TIMESTAMP WITH TIME ZONE
);
```

## 3. Segurança (Row Level Security - RLS)

É crucial ativar o RLS para permitir que o frontend interaja com as tabelas novas. Execute:

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_evals ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualitative_evals ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Políticas para tabela COURSES
CREATE POLICY "Permitir leitura pública de cursos" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Permitir criação de cursos" ON public.courses FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir exclusão de cursos" ON public.courses FOR DELETE USING (true);

-- Outras políticas (Exemplo permissivo para desenvolvimento)
CREATE POLICY "Acesso público a institutions" ON institutions FOR ALL USING (true);
CREATE POLICY "Acesso público a subjects" ON subjects FOR ALL USING (true);
CREATE POLICY "Acesso público a users" ON users FOR ALL USING (true);
-- Nota: Em produção, substitua (true) por verificações de auth.uid()
```
