# 📘 DOCUMENTAÇÃO COMPLETA: AvaliaDocente MZ

Este documento fornece uma visão detalhada e técnica sobre o sistema **AvaliaDocente MZ**, uma plataforma robusta para a gestão e avaliação do desempenho docente em instituições de ensino superior em Moçambique.

---

## 🚀 1. Visão Geral do Projeto

O **AvaliaDocente MZ** foi concebido para digitalizar e automatizar o processo de avaliação de professores por parte dos estudantes, auto-avaliação e avaliação institucional/gestão. O sistema suporta múltiplas instituições, cursos, disciplinas e períodos de avaliação.

### 🔑 Credenciais de Acesso (Super Admin)
Para o primeiro acesso e gestão global do sistema:
- **Utilizador/Email:** `Admin`
- **Palavra-passe:** `123`

---

## 🏗️ 2. Arquitetura Técnica

O sistema utiliza uma arquitetura moderna de **Single Page Application (SPA)** com uma camada de abstração de dados inteligente.

- **Frontend:** React 18+ com TypeScript.
- **Estilização:** Tailwind CSS (Design System minimalista e responsivo).
- **Ícones:** Lucide React.
- **Persistência de Dados:**
  - **Modo Online (Supabase):** PostgreSQL em nuvem com sincronização em tempo real.
  - **Modo Offline (Local):** `LocalStorage` do navegador (ativado automaticamente quando as credenciais do Supabase estão ausentes).
- **Segurança:** Encriptação de palavras-passe com `bcryptjs`.

---

## 👥 3. Perfis de Utilizador e Funcionalidades

O sistema possui quatro níveis de acesso distintos:

### 3.1 Super Administrador (Global)
- Gestão de Instituições (Criar, Editar, Eliminar).
- Monitorização global do sistema.
- Configuração de credenciais mestras.

### 3.2 Gestor de Instituição (Manager)
- Gestão de Cursos e Disciplinas.
- Gestão de Docentes e Estudantes.
- Configuração de Inquéritos (Questionários).
- Abertura/Fecho de períodos de avaliação.
- Visualização de relatórios e pontuações combinadas.
- Avaliação qualitativa dos docentes.

### 3.3 Docente (Teacher)
- Visualização das disciplinas atribuídas.
- Realização da **Auto-Avaliação** (baseada em grelhas de pontuação).
- Consulta de resultados e feedback dos estudantes.

### 3.4 Estudante (Student)
- Avaliação dos docentes das suas disciplinas.
- Interface simplificada e anónima para garantia de integridade.

---

## 📊 4. Modelo de Dados e Avaliação

O sistema calcula uma **Pontuação Combinada (Combined Score)** baseada em três pilares:

1.  **Avaliação dos Estudantes (Peso ~40%):** Média das respostas aos inquéritos.
2.  **Auto-Avaliação (Peso ~30%):** Pontuação baseada em atividades científicas, pedagógicas e de extensão.
3.  **Avaliação Institucional/Gestor (Peso ~30%):** Avaliação qualitativa realizada pela direção.

### Entidades Principais:
- `Institution`: Dados da universidade/faculdade.
- `Course`: Cursos lecionados.
- `Subject`: Disciplinas específicas com vínculo a turmas e turnos.
- `Questionnaire`: Conjunto de perguntas configuráveis.
- `Response`: Votos individuais dos alunos.
- `Score`: Resultados finais calculados e persistidos.

---

## 🛠️ 5. Configuração e Instalação

### Pré-requisitos
- Node.js (v18 ou superior)
- NPM ou Yarn

### Instalação
1. Clone o repositório.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

### Configuração da Base de Dados (Supabase)
Para conectar a uma base de dados real, edite o ficheiro `services/backend.ts` e preencha o objeto `SUPABASE_CONFIG`:
```typescript
const SUPABASE_CONFIG = {
    url: 'SUA_URL_DO_SUPABASE',
    key: 'SUA_CHAVE_ANON_DO_SUPABASE'
};
```
*Nota: Se deixado vazio, o sistema operará em **Modo Local**.*

---

## 📝 6. Manutenção e Scripts

- **`seed_admin.ts`**: Script para criar o utilizador Super Admin inicial na base de dados.
- **`types.ts`**: Contém todas as interfaces e enums do sistema.
- **`services/backend.ts`**: Contém toda a lógica de negócio e comunicação com a base de dados.

---

## 🔒 7. Segurança e Privacidade

- As avaliações dos estudantes são **anónimas**. O sistema utiliza um `votes_tracker` para garantir que um aluno não vota duas vezes na mesma disciplina, sem guardar a ligação direta entre o aluno e o seu voto.
- Todas as palavras-passe são guardadas como hashes `bcrypt`.

---
*Documentação gerada em 18 de Março de 2026.*
