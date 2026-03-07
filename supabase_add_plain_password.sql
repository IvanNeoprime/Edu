-- Adicionar coluna para armazenar senha em texto plano (Apenas para Super Admin/Debug)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "plainPassword" text;
