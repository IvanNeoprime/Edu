
# 📘 Documentação Técnica: AvaliaDocente MZ

## 1. Visão Geral do Sistema

O **AvaliaDocente MZ** é uma plataforma web progressiva (PWA) desenvolvida para gerir a avaliação de desempenho docente em universidades de Moçambique. O sistema foi desenhado para ser resiliente, funcionando tanto em modo offline (Local) quanto conectado à nuvem (Firebase).

### Arquitetura
*   **Frontend:** React 18 + TypeScript + Vite.
*   **UI Framework:** Tailwind CSS + Shadcn/UI (Conceito) + Lucide Icons.
*   **Backend (Híbrido):**
    *   **Modo Local (Padrão):** Utiliza `LocalStorage` para simular um banco de dados completo. Ideal para testes, demonstrações e ambientes sem internet.
    *   **Modo Nuvem (Produção):** Integração nativa com **Google Firebase** (Firestore + Authentication).

---

## 2. Configuração do Ambiente de Desenvolvimento (Local)

Para rodar o projeto no seu computador:

### Pré-requisitos
*   Node.js (Versão 18 ou superior).
*   NPM (Gerenciador de pacotes).

### Passo a Passo
1.  **Baixar o Código:**
    Extraia os arquivos do projeto para uma pasta.

2.  **Instalar Dependências:**
    Abra o terminal na pasta do projeto e execute:
    ```bash
    npm install
    ```

3.  **Rodar o Servidor:**
    Inicie o ambiente de desenvolvimento:
    ```bash
    npm run dev
    ```
    O site estará disponível em `http://localhost:5173`.

---

## 3. Setup do Backend (Configurando o Firebase)

Por padrão, o sistema roda no modo "Local". Para ativar a sincronização em nuvem real, siga este guia para configurar o Firebase.

### Passo 1: Criar Projeto no Firebase
1.  Acesse [console.firebase.google.com](https://console.firebase.google.com).
2.  Clique em **"Adicionar projeto"**.
3.  Nomeie como `AvaliaDocente` e continue (pode desativar o Google Analytics).

### Passo 2: Ativar Autenticação
1.  No menu lateral, clique em **Criação** > **Authentication**.
2.  Clique em **"Vamos começar"**.
3.  Na aba "Sign-in method", selecione **Email/Senha**.
4.  Ative a opção **"Ativar"** e clique em **Salvar**.

### Passo 3: Criar Banco de Dados (Firestore)
1.  No menu lateral, clique em **Criação** > **Firestore Database**.
2.  Clique em **"Criar banco de dados"**.
3.  Escolha a localização (pode manter a padrão).
4.  **Importante:** Escolha **"Iniciar no modo de teste"** (permite leitura/escrita inicial sem bloqueios complexos de segurança).
5.  Clique em **Criar**.

### Passo 4: Obter as Chaves de Acesso
1.  No painel do Firebase, clique na **Engrenagem** (Configurações do Projeto) no topo esquerdo.
2.  Role a página até o final, na seção **"Seus aplicativos"**.
3.  Clique no ícone **Web (</>)**.
4.  Dê um nome (ex: "Web App") e clique em "Registrar app".
5.  O Firebase mostrará um código chamado `firebaseConfig`. Copie o objeto que se parece com isso:
    ```javascript
    const firebaseConfig = {
      apiKey: "AIzaSy...",
      authDomain: "...",
      projectId: "...",
      // ... outros campos
    };
    ```

### Passo 5: Conectar o Código
1.  Abra o arquivo do projeto: `services/backend.ts`.
2.  Localize a constante `YOUR_FIREBASE_CONFIG` (nas primeiras linhas).
3.  Cole o objeto copiado do Firebase ali.

**Exemplo:**
```typescript
const YOUR_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDsf...",
  authDomain: "avaliadocente.firebaseapp.com",
  projectId: "avaliadocente",
  storageBucket: "avaliadocente.appspot.com",
  messagingSenderId: "832...",
  appId: "1:832...",
  measurementId: "G-..."
};
```
4.  Salve o arquivo. O sistema detectará a configuração e passará a usar a nuvem automaticamente.

---

## 4. Regras de Negócio e Algoritmo de Cálculo

O sistema implementa rigorosamente o Regulamento Acadêmico fornecido (PDF).

### Fórmula de Score Combinado
A nota final do docente (0 a 100) é composta por três pilares:

1.  **Auto-Avaliação (Peso 80%)**
    *   Preenchida pelo próprio docente na aba "Auto-Avaliação".
    *   Soma de indicadores: Volume de Docência (35) + Supervisão (30) + Investigação (30) + Extensão (10) + Gestão (10).
    *   Valor máximo: 100 pontos (limitado matematicamente).

2.  **Avaliação dos Estudantes (Peso 12%)**
    *   Questionário preenchido pelos alunos.
    *   Perguntas do tipo "Binário" (Sim/Não), "Estrelas" ou "Escala".
    *   Perguntas de Texto ou Múltipla Escolha **não** somam pontos (são apenas feedback).
    *   Cálculo: `(Soma dos Pontos Obtidos / Soma dos Pesos Possíveis) * 100`.

3.  **Avaliação Qualitativa / Institucional (Peso 8%)**
    *   Preenchida pelo Gestor Institucional.
    *   Critérios: Cumprimento de Prazos (0-10) + Qualidade do Trabalho (0-10).
    *   Cálculo: `(Soma / 20) * 100`.

**Fórmula Final no Código (`calculateScores`):**
```typescript
FinalScore = (AutoEval * 0.80) + (StudentEval * 0.12) + (QualitativeEval * 0.08)
```

---

## 5. Guia de Deploy (Publicação)

Recomendamos o uso do **Vercel** pela facilidade e compatibilidade com Vite.

1.  Crie uma conta em [vercel.com](https://vercel.com).
2.  Instale a CLI do Vercel ou conecte seu GitHub.
3.  Se usar GitHub:
    *   Suba este código para um repositório.
    *   No Vercel, clique em "New Project" e importe o repositório.
    *   O Vercel detectará `Vite` automaticamente.
    *   Clique em **Deploy**.
4.  Se usar CLI:
    *   No terminal, rode `npm install -g vercel`.
    *   Rode `vercel`.
    *   Responda "Yes" para as configurações padrão.

**Nota sobre Deploy:** Certifique-se de que a configuração do Firebase (`YOUR_FIREBASE_CONFIG`) está preenchida no arquivo `backend.ts` antes de fazer o deploy, caso queira usar o banco de dados online em produção.

## 🔑 Credenciais de Acesso (Super Admin)

*   **Email:** `ivandromaoze138@gmail.com`
*   **Senha:** `24191978a`
