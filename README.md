
# AvaliaDocente MZ - Sistema de Avaliação Académica

Plataforma multi-institucional para avaliação de desempenho docente em universidades moçambicanas.

## 📚 Documentação

*   **[DOCUMENTACAO_DO_SISTEMA.md](./DOCUMENTACAO_DO_SISTEMA.md):** Guia Técnico Completo, Setup do Backend (Firebase) e Deploy.
*   **[MANUAL_DE_TESTES.md](./MANUAL_DE_TESTES.md):** Roteiro passo-a-passo para testar as funcionalidades e regras de negócio.

## 🚀 Funcionalidades Principais

1.  **Multi-Institucional:** Suporta múltiplas universidades isoladas.
2.  **Anonimato Garantido:** As respostas dos estudantes não são vinculadas aos seus perfis.
3.  **Cálculo Regulamentado (80/12/8):** Implementa a fórmula oficial do regulamento académico.
4.  **Construtor de Formulários:** O gestor pode criar questionários personalizados.
5.  **Modo Híbrido:** Funciona Localmente (Offline) ou em Nuvem (Firebase).

## 🔑 Credenciais de Acesso (Super Admin)

*   **Email:** `ivandromaoze138@gmail.com`
*   **Senha:** `24191978a`

## 🧪 Credenciais de Teste (Modo Local)

O sistema gera automaticamente estes usuários se o banco estiver vazio:

*   **Gestor:** `gestor@demo.ac.mz` / `123456`
*   **Docente:** `docente@demo.ac.mz` / `123456`
*   **Aluno:** `aluno@demo.ac.mz` / `123456`

## 🛠️ Instalação Local

```bash
npm install
npm run dev
```

Para mais detalhes sobre como conectar ao Firebase, consulte a **[Documentação do Sistema](./DOCUMENTACAO_DO_SISTEMA.md)**.
