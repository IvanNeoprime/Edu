
# 🐘 Guia de Banco de Dados: Supabase

> **IMPORTANTE:** Se você encontrar o erro `Could not find the 'modality' column`, execute o script abaixo no SQL Editor.

## Schema SQL Atualizado

```sql
-- Adicionar colunas faltantes na tabela users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "modality" text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "semester" text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "shifts" text[];
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "classGroups" text[];
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "jobTitle" text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "courses" text[];
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "course" text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "level" text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "mustChangePassword" boolean DEFAULT false;

-- Recarregar cache
NOTIFY pgrst, 'reload schema';
```

## Tabelas Principais

### Users
Tabela de usuários (Estudantes, Docentes, Gestores).
- `modality` (text): Modalidade de ensino (Presencial/Online).
- `shifts` (text[]): Turnos (Diurno/Noturno).
- `classGroups` (text[]): Turmas (A, B, C).

### Courses
Tabela de Cursos da instituição.
- `name`, `code`, `duration`, `semester`, `modality`.

### Scores
Tabela de notas finais calculadas.
- `finalScore`, `studentScore`, `selfEvalScore`, `institutionalScore`.
