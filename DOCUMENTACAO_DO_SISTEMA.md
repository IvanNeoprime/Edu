
# 📘 Documentação Técnica: AvaliaDocente MZ

## 1. Arquitetura do Sistema

O **AvaliaDocente MZ** adota uma arquitetura de **Camada de Serviço Abstrata** (`BackendService`) que permite ao frontend operar independentemente da fonte de dados.

### 1.1 Camada de Serviço (`services/backend.ts`)
O sistema decide dinamicamente qual implementação de backend utilizar no momento da inicialização:

1.  **SupabaseBackend (Produção/Online):**
    *   Utiliza a SDK `@supabase/supabase-js`.
    *   Conecta-se a um banco PostgreSQL hospedado.
    *   Implementa estratégias de **Selective Fetching** e **Batch Processing** para performance.
    
2.  **MockBackend (Desenvolvimento/Offline):**
    *   Utiliza `LocalStorage` do navegador.
    *   Simula latência de rede.
    *   Ideal para testes rápidos e demonstrações sem infraestrutura.

---

## 2. Robustez e Escalabilidade

O sistema foi refatorado para garantir alta disponibilidade e integridade de dados. As seguintes decisões técnicas foram tomadas:

### 2.1 Otimização de Consultas (Performance)
*   **Problema:** Em sistemas universitários, tabelas de `users` (alunos) e `responses` (avaliações) crescem exponencialmente.
*   **Solução:**
    *   **Evitamos `SELECT *`:** O backend busca apenas colunas necessárias (ex: `select('id, name')`) ao listar docentes para os alunos.
    *   **Filtros no Banco:** Toda filtragem é feita via SQL (`.eq()`, `.in()`) e não no JavaScript do cliente, economizando memória e banda.
    *   **Batch Fetching:** Ao calcular notas, buscamos dados apenas dos IDs relevantes daquela instituição, usando cláusulas `.in('id', [ids])`, limitando o escopo de busca.

### 2.2 Tratamento de Erros (Confiabilidade)
*   Todas as chamadas externas são encapsuladas em blocos `try/catch`.
*   O cliente Supabase verifica a conexão (`checkHealth`) antes de tentar operações complexas.
*   Falhas na inicialização do Supabase degradam graciosamente para o Modo Local ou exibem alertas claros, impedindo a "Tela Branca da Morte".

### 2.3 Integridade de Dados
*   O sistema utiliza UUIDs para chaves primárias, prevenindo colisões em sistemas distribuídos.
*   O cálculo de notas (`calculateScores`) é realizado em batch e utiliza `upsert` (inserir ou atualizar) para garantir que re-cálculos não dupliquem registros.

---

## 3. Variáveis de Ambiente

Para ativar o modo de produção (Supabase), configure as seguintes variáveis no seu ambiente de hospedagem (Vercel/Netlify) ou arquivo `.env`:

| Variável | Descrição | Obrigatório? |
| :--- | :--- | :--- |
| `SUPABASE_URL` | URL do projeto (ex: `https://xyz.supabase.co`) | Sim (Prod) |
| `SUPABASE_ANON_KEY` | Chave pública anônima do Supabase | Sim (Prod) |

Se `SUPABASE_URL` não for fornecida, o sistema iniciará automaticamente em modo **Mock (Local)**.

---

## 4. Estrutura de Pastas

*   `src/components/`: Componentes React (Dashboards por perfil).
*   `src/components/ui.tsx`: Biblioteca de componentes reutilizáveis (Design System minimalista).
*   `src/services/backend.ts`: Lógica de negócios e abstração do banco de dados.
*   `src/types.ts`: Definições de tipagem TypeScript compartilhadas.

---

## 5. Deploy

O projeto é compatível com qualquer host de arquivos estáticos (Vercel, Netlify, Cloudflare Pages).

**Comando de Build:**
```bash
npm run build
```
O resultado será gerado na pasta `dist/`.
