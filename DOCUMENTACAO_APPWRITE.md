
# 🐘 Guia de Banco de Dados: Supabase

> **Nota:** Este arquivo substitui a antiga documentação do Appwrite. Recomendamos renomear este arquivo para `DOCUMENTACAO_SUPABASE.md`.

O **AvaliaDocente MZ** utiliza o Supabase (PostgreSQL) para persistência de dados em produção. Abaixo está o esquema completo necessário para o funcionamento do sistema.

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
-- Nota: Em produção, recomenda-se sincronizar esta tabela com auth.users via Triggers
CREATE TABLE users (
    id TEXT PRIMARY KEY, -- Pode ser UUID ou String customizada
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'institution_manager', 'teacher', 'student')),
    "institutionId" TEXT,
    approved BOOLEAN DEFAULT FALSE,
    password TEXT, -- ⚠️ Hashing deve ser tratado na aplicação ou usar Supabase Auth
    avatar TEXT,
    course TEXT,
    level TEXT,
    "mustChangePassword" BOOLEAN DEFAULT FALSE, -- NOVO CAMPO
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tabela de Instituições
CREATE TABLE institutions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    "managerEmails" TEXT[], -- Array de strings
    "inviteCode" TEXT,
    logo TEXT,
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

-- 5. Tabela de Questionários
CREATE TABLE questionnaires (
    id TEXT PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    title TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    questions JSONB, -- Armazena a estrutura das perguntas
    "targetRole" TEXT DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Tabela de Respostas (Estudantes)
CREATE TABLE responses (
    id TEXT PRIMARY KEY,
    "questionnaireId" TEXT NOT NULL,
    "teacherId" TEXT,
    "subjectId" TEXT,
    answers JSONB, -- Armazena array de {questionId, value}
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Tabela de Auto-Avaliação (Docentes)
CREATE TABLE self_evals (
    "teacherId" TEXT PRIMARY KEY,
    header JSONB,
    answers JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. Tabela de Avaliação Qualitativa (Gestores)
CREATE TABLE qualitative_evals (
    "teacherId" TEXT PRIMARY KEY,
    "institutionId" TEXT,
    "deadlineCompliance" INTEGER,
    "workQuality" INTEGER,
    score FLOAT,
    "evaluatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 9. Tabela de Scores Finais (Relatórios)
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

Para proteger os dados em produção, você deve habilitar o RLS. Abaixo estão exemplos de políticas sugeridas:

1.  **Habilitar RLS:**
    Execute `ALTER TABLE users ENABLE ROW LEVEL SECURITY;` (e para todas as outras tabelas).

2.  **Políticas Básicas (Exemplos):**

    *   *Leitura Pública de Instituições:*
        `CREATE POLICY "Instituições são públicas" ON institutions FOR SELECT USING (true);`

    *   *Docentes veem apenas seus próprios dados:*
        `CREATE POLICY "Docente vê seus dados" ON self_evals FOR ALL USING (auth.uid()::text = "teacherId");`

    *   *Gestores veem tudo da sua instituição:*
        `CREATE POLICY "Gestor vê dados da inst" ON users FOR SELECT USING ("institutionId" IN (SELECT "institutionId" FROM users WHERE id = auth.uid()::text AND role = 'institution_manager'));`

> **Aviso:** O código atual utiliza uma tabela `users` personalizada para facilitar a migração do sistema legado. Em uma implementação definitiva, recomenda-se integrar a tabela `auth.users` nativa do Supabase com a tabela `public.users` através de Triggers PostgreSQL.
