
# AvaliaDocente MZ - Sistema de Avaliação Académica

Plataforma multi-institucional para avaliação de desempenho docente em universidades moçambicanas, com suporte a múltiplos perfis e garantia de anonimato.

## 📚 Documentação Técnica

*   **[DOCUMENTACAO_DO_SISTEMA.md](./DOCUMENTACAO_DO_SISTEMA.md):** Guia Técnico, Setup do Backend (Firebase/Appwrite) e Deploy.
*   **[MANUAL_DE_TESTES.md](./MANUAL_DE_TESTES.md):** Roteiro de teste rápido.

---

## 👥 Guia de Uso por Perfil (Roles)

O sistema opera com hierarquia de acesso. Abaixo explicamos o fluxo de trabalho para cada utilizador.

### 1. 🛡️ Super Admin (Dono do Sistema)
Responsável por criar Universidades e entregar as chaves ao primeiro Gestor.
*   **Acesso:** `ivandromaoze138@gmail.com` / `24191978a`
*   **Ações:**
    1.  Acessar o Painel Super Admin.
    2.  Preencher "Nova Instituição" (Nome e Sigla).
    3.  Preencher "Gestor Inicial" (Email e Senha).
    4.  Clicar em **Criar Instituição**.

### 2. 🏛️ Gestor Institucional (Reitor/Pedagógico)
Gerencia a estrutura académica, docentes e questionários.
*   **Ações:**
    1.  **Departamentos:** Cadastrar os "Chefes de Departamento" (que gerirão os alunos).
    2.  **Docentes:** Cadastrar novos docentes na aba "Visão Geral".
    3.  **Disciplinas:** Criar disciplinas e associá-las aos docentes respectivos.
    4.  **Construtor de Fichas:** Personalizar as perguntas para Estudantes, Chefes de Turma e Auto-Avaliação.
    5.  **Avaliação Qualitativa:** Atribuir nota institucional (Prazos/Qualidade) aos docentes.
    6.  **Fecho:** Clicar em "Calcular Scores" no fim do semestre para processar as notas.

### 3. 📂 Chefe de Departamento
Responsável pela gestão dos estudantes e turmas.
*   **Ações:**
    1.  **Cadastrar Estudantes:** Criar contas para os alunos do seu departamento.
    2.  **Gerir Chefes de Turma (Novo):**
        *   *Opção A (Promover):* Selecionar um estudante já existente na lista e clicar em "Promover a Chefe", definindo a Turma e Classe.
        *   *Opção B (Criar):* Criar um Chefe de Turma do zero caso ele não exista no sistema.

### 4. 👨‍🏫 Docente
O avaliado. Sua participação é crucial para a nota final (vale 80%).
*   **Ações:**
    1.  Fazer Login.
    2.  Acessar a aba **Auto-Avaliação**.
    3.  Preencher o formulário de indicadores (Aulas dadas, Investigação, Supervisão).
    4.  Salvar.
    5.  Acessar a aba **Resultados** para ver o gráfico de desempenho e exportar o relatório PDF/CSV.

### 5. 🎓 Estudante
O avaliador padrão.
*   **Ações:**
    1.  Fazer Login com as credenciais fornecidas pelo Departamento.
    2.  Selecionar a Disciplina/Docente que deseja avaliar.
    3.  Responder ao questionário padrão ("Ficha de Avaliação de Desempenho").
    4.  Enviar (O voto é anónimo e único por disciplina).

### 6. 👑 Chefe de Turma (Class Head)
Um estudante com responsabilidades de avaliação estendidas.
*   **Diferença:** Ao fazer login, o sistema detecta o papel de `CLASS_HEAD`.
*   **Ações:**
    1.  O fluxo é idêntico ao do estudante.
    2.  Porém, ao abrir o questionário, ele verá a **"Avaliação do Chefe de Turma"** (focada em Assiduidade, Pontualidade e Material), diferente da ficha dos colegas.
    3.  O painel exibe uma insígnia "Perfil de Responsável".

---

## 🧪 Credenciais de Teste (Modo Local)

O sistema gera automaticamente estes usuários na "Universidade Demo":

| Perfil | Email | Senha |
| :--- | :--- | :--- |
| **Super Admin** | `ivandromaoze138@gmail.com` | `24191978a` |
| **Gestor** | `gestor@demo.ac.mz` | `123456` |
| **Chefe Dept.** | `chefe@demo.ac.mz` | `123456` |
| **Docente** | `docente@demo.ac.mz` | `123456` |
| **Aluno** | `aluno@demo.ac.mz` | `123456` |

## 🛠️ Instalação

```bash
npm install
npm run dev
```
