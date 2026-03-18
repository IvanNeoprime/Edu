
# AvaliaDocente MZ - Sistema de Avaliação Académica

Plataforma multi-institucional para avaliação de desempenho docente em universidades moçambicanas, focada em robustez, escalabilidade e anonimato.

## 📚 Documentação

*   **[DOCUMENTACAO.md](./DOCUMENTACAO.md):** Documentação Completa do Sistema (Recomendado).
*   **[DOCUMENTACAO_DO_SISTEMA.md](./DOCUMENTACAO_DO_SISTEMA.md):** Guia Técnico e Arquitetura.
*   **[MANUAL_DE_TESTES.md](./MANUAL_DE_TESTES.md):** Roteiro de testes.

---

## 🔑 Credenciais de Acesso (Super Admin)

*   **Utilizador:** `Admin`
*   **Palavra-passe:** `123`

---

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
