
# AvaliaDocente MZ - Sistema de Avaliação Académica

Plataforma multi-institucional para avaliação de desempenho docente em universidades moçambicanas, focada em robustez, escalabilidade e anonimato.

## 📚 Documentação

*   **[DOCUMENTACAO_DO_SISTEMA.md](./DOCUMENTACAO_DO_SISTEMA.md):** Guia Técnico, Arquitetura Robusta e Variáveis de Ambiente.
*   **[DOCUMENTACAO_APPWRITE.md](./DOCUMENTACAO_APPWRITE.md):** (Recomendado renomear para `DOCUMENTACAO_SUPABASE.md`) Guia de Banco de Dados, Schema SQL e Configuração do Supabase.
*   **[MANUAL_DE_TESTES.md](./MANUAL_DE_TESTES.md):** Roteiro passo-a-passo para testar as funcionalidades e regras de negócio.

## 🚀 Funcionalidades Principais

1.  **Backend Híbrido Robusto:**
    *   **Modo Nuvem (Supabase):** PostgreSQL escalável para produção.
    *   **Modo Local (Mock):** Fallback automático para LocalStorage em desenvolvimento ou offline.
2.  **Anonimato Garantido:** As respostas dos estudantes são dissociadas dos perfis, garantindo confidencialidade.
3.  **Algoritmo de Avaliação (80/12/8):**
    *   80%: Auto-avaliação do docente.
    *   12%: Avaliação pelos estudantes.
    *   08%: Avaliação institucional (Gestor).
4.  **Escalabilidade:** Consultas otimizadas para suportar milhares de alunos e docentes simultaneamente.

## 🔑 Credenciais de Acesso (Super Admin)

*   **Email:** `ivandromaoze138@gmail.com`
*   **Senha:** `24191978a`

## 🧪 Credenciais de Teste (Modo Local)

O sistema gera automaticamente estes usuários se o banco estiver vazio (Modo Mock):

*   **Gestor:** `gestor@demo.ac.mz` / `123456`
*   **Docente:** `docente@demo.ac.mz` / `123456`
*   **Aluno:** `aluno@demo.ac.mz` / `123456`

## 🛠️ Instalação e Execução

1.  **Instalar Dependências:**
    ```bash
    npm install
    ```

2.  **Configurar Ambiente (Opcional para Modo Online):**
    Crie um arquivo `.env` na raiz com:
    ```env
    SUPABASE_URL=sua_url_supabase
    SUPABASE_ANON_KEY=sua_chave_anonima
    ```

3.  **Rodar Aplicação:**
    ```bash
    npm run dev
    ```

Para detalhes sobre como criar as tabelas no Supabase, consulte **[DOCUMENTACAO_APPWRITE.md](./DOCUMENTACAO_APPWRITE.md)**.
