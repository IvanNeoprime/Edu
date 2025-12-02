
# 🚀 Guia de Configuração: Appwrite Backend

Para que o sistema funcione em modo Cloud com Appwrite, siga estes passos no console oficial.

## 1. Criar Projeto
1. Acesse [cloud.appwrite.io](https://cloud.appwrite.io).
2. Clique em **Create Project**.
3. Nome: `AvaliaDocente`.
4. Copie o **Project ID** (ex: `65d4...`). Você vai precisar dele.

## 2. Criar Banco de Dados
1. No menu lateral, vá em **Databases**.
2. Clique em **Create Database**.
3. Name: `AvaliaDocente DB`.
4. ID: `avaliadocente_db`.

## 3. Criar Coleções (Tabelas)
Dentro do banco `avaliadocente_db`, crie as seguintes Collections. Para cada uma, você deve definir os **Attributes** (Colunas).

### A. Users (`users`)
*   `email` (Email, required)
*   `name` (String, 128, required)
*   `role` (String, 32, required)
*   `institutionId` (String, 64, required)
*   `approved` (Boolean, required)

### B. Institutions (`institutions`)
*   `name` (String, 128, required)
*   `code` (String, 32, required)
*   `managerEmails` (String, Array, required)
*   `inviteCode` (String, 32, required)
*   `createdAt` (String, 64, required)

### C. Subjects (`subjects`)
*   `name` (String, 128, required)
*   `code` (String, 32, required)
*   `institutionId` (String, 64, required)
*   `teacherId` (String, 64, required)

### D. Questionnaires (`questionnaires`)
*   `institutionId` (String, 64, required)
*   `title` (String, 128, required)
*   `active` (Boolean, required)
*   `questions` (String, 10000, required) -> *Guardará JSON*

### E. Responses (`responses`)
*   `questionnaireId` (String, 64, required)
*   `teacherId` (String, 64, required)
*   `subjectId` (String, 64, required)
*   `answers` (String, 10000, required) -> *Guardará JSON*
*   `timestamp` (String, 64, required)

### F. Self Evaluations (`self_evals`)
*   `teacherId` (String, 64, required)
*   `indicators` (String, 5000, required) -> *Guardará JSON*

### G. Qualitative Evals (`qualitative_evals`)
*   `teacherId` (String, 64, required)
*   `institutionId` (String, 64, required)
*   `deadlineCompliance` (Integer, min 0, max 10)
*   `workQuality` (Integer, min 0, max 10)

### H. Scores (`scores`)
*   `teacherId` (String, 64, required)
*   `studentScore` (Float, required)
*   `institutionalScore` (Float, required)
*   `finalScore` (Float, required)
*   `lastCalculated` (String, 64, required)

---

## 4. Índices (Indexes)
Para permitir filtros (Queries), vá na aba **Indexes** de cada coleção e crie:

1.  **Collection `users`:**
    *   Key: `email_idx` | Type: `Key` | Attribute: `email`
    *   Key: `role_idx` | Type: `Key` | Attribute: `role`
    *   Key: `inst_idx` | Type: `Key` | Attribute: `institutionId`

2.  **Collection `subjects`:**
    *   Key: `inst_idx` | Type: `Key` | Attribute: `institutionId`

3.  **Collection `questionnaires`:**
    *   Key: `inst_idx` | Type: `Key` | Attribute: `institutionId`

4.  **Collection `responses`:**
    *   Key: `teacher_idx` | Type: `Key` | Attribute: `teacherId`

---

## 5. Permissões (Settings)
Para testes rápidos (Modo Desenvolvimento):
1. Em cada Coleção, vá em **Settings**.
2. Em **Permissions**, adicione o Role `Any`.
3. Marque: `Create`, `Read`, `Update`, `Delete`.
4. *Nota: Em produção real, você deve restringir isso.*

## 6. Atualizar Código
Vá no arquivo `services/backend.ts` e preencha o objeto `YOUR_APPWRITE_CONFIG` com seu Project ID e Database ID.
