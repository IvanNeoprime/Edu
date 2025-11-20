
# AvaliaDocente MZ - Sistema de Avaliação Académica

Plataforma multi-institucional para avaliação de desempenho docente em universidades moçambicanas. O sistema opera em **Modo Local**, garantindo privacidade, velocidade e funcionamento offline.

## 🚀 Funcionalidades Principais

1.  **Multi-Institucional:** Suporta múltiplas universidades isoladas.
2.  **Anonimato Garantido:** As respostas dos estudantes não são vinculadas aos seus perfis.
3.  **Cálculo Regulamentado:** Implementa a fórmula oficial:
    *   **80%** - Auto-Avaliação do Docente (Fichas Técnicas).
    *   **12%** - Avaliação pelos Estudantes (Questionário Binário).
    *   **8%** - Avaliação Qualitativa Institucional (Prazos e Qualidade).
4.  **Construtor de Formulários:** O gestor pode criar questionários personalizados (Estrelas, Escala 0-10, Sim/Não, Texto).
5.  **Seed Data Automático:** O sistema pré-carrega dados de teste se o banco estiver vazio.

## 🛠️ Stack Tecnológico

*   **Frontend:** React (Next.js style structure) + TypeScript
*   **Estilização:** Tailwind CSS v3.4 + Lucide React Icons
*   **Dados (Backend):** LocalStorage Mock Service (Persistência no Navegador)
*   **Visualização:** Recharts

## 🔑 Credenciais de Acesso (Super Admin)

Para a configuração total do sistema:

*   **Email:** `ivandromaoze138@gmai.com`
*   **Senha:** `24191978a`

## 🧪 Credenciais de Teste Rápido (Seed Data)

Se o sistema estiver vazio, use estas contas pré-criadas para testar imediatamente (senha `123456` para todos):

*   **Gestor:** `gestor@demo.ac.mz`
*   **Docente:** `docente@demo.ac.mz`
*   **Aluno:** `aluno@demo.ac.mz`

## 📖 Guia de Uso

### 1. Configuração Inicial (Super Admin)
1.  Faça login com as credenciais acima.
2.  Crie uma nova Instituição (ex: "UEM").
3.  Defina o Gestor Inicial (Nome, Email e Senha).

### 2. Gestão Institucional (Gestor)
1.  Faça login com a conta criada pelo Super Admin (ou a conta demo).
2.  **Cadastrar Docentes:** Adicione professores manualmente na aba "Visão Geral".
3.  **Personalizar Questionário:** Use a aba "Construtor" para criar perguntas (Estrelas, Escala, etc).
4.  **Criar Disciplinas:** Crie cadeiras e atribua aos docentes.
5.  **Avaliação Qualitativa:** Avalie o cumprimento de prazos e qualidade (vale 8% da nota).
6.  **Fecho:** Clique em "Calcular Scores Finais" para processar as notas.

### 3. Auto-Avaliação (Docente)
1.  O docente faz login.
2.  Acessa a aba **"Auto-Avaliação"**.
3.  Preenche os indicadores de produção (Ensino, Investigação, Supervisão...).
4.  Isso compõe **80%** da nota final.

### 4. Avaliação do Estudante
1.  O estudante se cadastra ou usa a conta demo.
2.  Escolhe a disciplina.
3.  Responde ao questionário (Sim/Não, Estrelas, Texto, etc).
4.  A resposta é salva anonimamente.

## ⚠️ Notas Técnicas

*   **Persistência:** Os dados são salvos no `localStorage`. Se limpar o cache, o sistema recria os dados "Seed" (Universidade Demo).
*   **Cálculo de Notas:**
    *   Perguntas "Texto" e "Múltipla Escolha" não contam para a nota numérica (são qualitativas).
    *   Estrelas e Escalas são normalizadas para porcentagem.
    *   A nota final é calculada apenas quando o Gestor clica no botão de cálculo.
