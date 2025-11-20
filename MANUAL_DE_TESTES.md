# Manual de Testes e Configuração - AvaliaDocente MZ

Este documento serve como guia passo-a-passo para configurar, operar e testar o sistema **AvaliaDocente MZ** em ambiente local. O sistema foi projetado para garantir persistência de dados durante os testes, desde que o cache do navegador não seja limpo.

---

## 1. Visão Geral da Persistência de Dados

O sistema utiliza o **LocalStorage** do navegador como banco de dados.
*   **O que isso significa:** Você pode fechar a aba, fechar o navegador ou reiniciar o computador. Ao voltar, os dados (docentes, notas, instituições) estarão lá.
*   **O que evitar:** Não use "Janela Anônima" se quiser manter os dados por longo prazo. Não limpe o "Cache/Dados de Navegação".
*   **Seed Data (Dados Semente):** Se por acaso você limpar os dados, o sistema detectará o banco vazio e recriará automaticamente a "Universidade Demo" para você não começar do zero.

---

## 2. Credenciais de Acesso

### Super Administrador (Acesso Total)
Use esta conta para criar novas faculdades e gestores.
*   **Email:** `ivandromaoze138@gmai.com`
*   **Senha:** `24191978a`

### Contas de Teste Rápido (Já configuradas)
O sistema já vem com estes usuários criados na "Universidade Demo":
*   **Gestor:** `gestor@demo.ac.mz` / Senha: `123456`
*   **Docente:** `docente@demo.ac.mz` / Senha: `123456`
*   **Aluno:** `aluno@demo.ac.mz` / Senha: `123456`

---

## 3. Roteiro de Teste: Ciclo Completo (Passo a Passo)

Para validar o funcionamento correto da fórmula **80% (Auto) + 12% (Aluno) + 8% (Gestor)**, siga este roteiro:

### PASSO A: Configuração Institucional (Gestor)
1.  Faça logout (se estiver logado) e entre como **Gestor** (`gestor@demo.ac.mz`).
2.  **Cadastrar Docente:**
    *   Vá na aba "Visão Geral".
    *   No cartão "Cadastrar Novo Docente", insira:
        *   Nome: `Prof. Teste Novo`
        *   Email: `teste@demo.ac.mz`
    *   Clique em "Adicionar Docente".
3.  **Criar Disciplina:**
    *   No cartão "Gestão de Disciplinas", crie:
        *   Disciplina: `Matemática Aplicada`
        *   Código: `MAT200`
        *   Docente: Selecione `Prof. Teste Novo`.
4.  **Personalizar Questionário (Opcional):**
    *   Vá na aba "Construtor de Questionário".
    *   Adicione uma pergunta do tipo "Estrelas" (peso 5) e uma do tipo "Texto".
    *   Isso validará se o sistema de formulários dinâmicos funciona.

### PASSO B: O Docente (Peso 80%)
1.  Faça logout e entre como o docente criado:
    *   Email: `teste@demo.ac.mz`
    *   Senha: `123456` (Senha padrão criada pelo gestor).
2.  **Auto-Avaliação:**
    *   Vá na aba **"Auto-Avaliação"**.
    *   Preencha os campos (ex: Volume de Docência: 30, Investigação: 20, etc).
    *   Clique em "Salvar".
    *   *Nota:* Se não fizer isso, a nota final será muito baixa, pois esta parte vale 80%.

### PASSO C: O Estudante (Peso 12%)
1.  Faça logout.
2.  Clique em **"Não tem conta? Cadastre-se"**.
3.  Crie uma conta de **Estudante**:
    *   Selecione "Universidade Demo".
4.  No Dashboard do Aluno:
    *   Selecione a disciplina `Matemática Aplicada`.
    *   Responda ao questionário.
    *   Clique em "Enviar Avaliação".

### PASSO D: Fecho e Cálculo (Gestor - Peso 8%)
1.  Volte para a conta do **Gestor** (`gestor@demo.ac.mz`).
2.  **Avaliação Qualitativa:**
    *   Na "Visão Geral", encontre o cartão "Avaliação Qualitativa".
    *   Clique no nome `Prof. Teste Novo`.
    *   Dê notas para "Prazos" (0-10) e "Qualidade" (0-10).
    *   Clique em "Salvar".
3.  **Cálculo Final:**
    *   No canto direito, localize o cartão escuro "Fecho do Semestre".
    *   Clique em **"Calcular Scores"**.
    *   O sistema processará todas as notas.

### PASSO E: Verificação de Resultados
1.  Entre novamente como o **Docente** (`teste@demo.ac.mz`).
2.  Na aba "Resultados", verifique:
    *   O Gráfico de barras.
    *   O Score Final.
    *   Clique em **"Exportar CSV"** para gerar o relatório físico.

---

## 4. Resetando o Sistema

Se você quiser apagar tudo e começar a bateria de testes do zero:

1.  Entre como **Super Admin** (`ivandromaoze138@gmai.com`).
2.  Clique no botão vermelho **"Resetar Sistema Completo"** no topo direito.
3.  Confirme as duas janelas de aviso.
4.  O sistema será limpo e recarregará com os dados de semente (Demo) novamente.

---

## 5. Solução de Problemas Comuns

**1. "A nota do aluno não mudou o score final."**
*   Verifique se o Gestor clicou em "Calcular Scores" *após* o aluno responder. O cálculo não é em tempo real, é sob demanda (fecho).

**2. "O docente não aparece na lista para criar disciplina."**
*   Certifique-se de que cadastrou o docente na mesma instituição que está tentando criar a disciplina.

**3. "Não consigo logar com o docente que criei."**
*   A senha padrão para docentes criados manualmente pelo gestor é `123456`.

**4. "Os dados sumiram."**
*   Você provavelmente limpou o cache do navegador ou estava usando uma aba anônima que foi fechada. O sistema recriou a Universidade Demo automaticamente.
