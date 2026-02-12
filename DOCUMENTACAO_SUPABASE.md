
# 📘 Guia de Integração Supabase - AvaliaDocente MZ

Para ativar o banco de dados real em seu projeto, siga estes passos:

### 1. Variáveis de Ambiente
Configure as seguintes variáveis em seu serviço de hospedagem (Vercel, Netlify, etc.) ou no seu arquivo local `.env`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

### 2. Schema do Banco de Dados
Execute o script SQL abaixo no **SQL Editor** do seu painel Supabase para criar a estrutura necessária:

```sql
-- 1. Instituições
CREATE TABLE institutions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    "managerEmails" TEXT[],
    logo TEXT,
    "isEvaluationOpen" BOOLEAN DEFAULT TRUE,
    "evaluationPeriodName" TEXT DEFAULT 'Semestre 1 - 2024',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Usuários
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    "institutionId" TEXT REFERENCES institutions(id),
    approved BOOLEAN DEFAULT FALSE,
    password TEXT NOT NULL,
    avatar TEXT,
    course TEXT,
    level TEXT,
    shifts TEXT[],
    "classGroups" TEXT[],
    category TEXT,
    "mustChangePassword" BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Disciplinas
CREATE TABLE subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    "institutionId" TEXT REFERENCES institutions(id),
    "teacherId" TEXT REFERENCES users(id),
    "teacherCategory" TEXT,
    course TEXT,
    level TEXT,
    "classGroup" TEXT,
    shift TEXT,
    modality TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Questionários
CREATE TABLE questionnaires (
    id TEXT PRIMARY KEY,
    "institutionId" TEXT REFERENCES institutions(id),
    title TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    questions JSONB,
    "targetRole" TEXT DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Respostas
CREATE TABLE responses (
    id TEXT PRIMARY KEY,
    "institutionId" TEXT REFERENCES institutions(id),
    "questionnaireId" TEXT,
    "teacherId" TEXT REFERENCES users(id),
    "subjectId" TEXT REFERENCES subjects(id),
    answers JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Auto-Avaliações
CREATE TABLE self_evals (
    "teacherId" TEXT PRIMARY KEY REFERENCES users(id),
    "institutionId" TEXT REFERENCES institutions(id),
    header JSONB,
    answers JSONB,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. Avaliações Qualitativas (Gestor)
CREATE TABLE qualitative_evals (
    "teacherId" TEXT PRIMARY KEY REFERENCES users(id),
    "institutionId" TEXT REFERENCES institutions(id),
    "deadlineCompliance" INTEGER,
    "workQuality" INTEGER,
    comments TEXT,
    score FLOAT,
    "evaluatedAt" TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. Scores Finais
CREATE TABLE scores (
    "teacherId" TEXT PRIMARY KEY REFERENCES users(id),
    "studentScore" FLOAT,
    "institutionalScore" FLOAT,
    "selfEvalScore" FLOAT,
    "finalScore" FLOAT,
    "lastCalculated" TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```
