# HANDOFF — Instruções para Claude Sonnet 4.6

> **Data da auditoria**: 10 de abril de 2026
> **Auditor**: Claude Opus 4.6
> **Objetivo**: Fornecer ao Claude Sonnet 4.6 um retrato fiel do estado atual do projeto e instruções precisas para dar continuidade ao desenvolvimento com segurança.

---

## 1. ALERTA: O SESSION_CHECKPOINT.md está DESATUALIZADO

O `SESSION_CHECKPOINT.md` foi escrito em 09/04/2026 e **não reflete o estado atual do código**. **Use este documento como fonte de verdade.**

### O que o checkpoint diz que está pendente, mas JÁ FOI RESOLVIDO:

| Item do Checkpoint | Status Real |
|---|---|
| `entries.tsx` é placeholder | **RESOLVIDO** — SectionList completa com histórico, agrupamento por dia, delete por long-press |
| Onboarding não persiste no SQLite | **RESOLVIDO** — `AppSettingsRepository` grava `onboarding_completed` no SQLite |
| Perfil não grava no SQLite | **RESOLVIDO** — `UserProfileRepository.saveProfile()` persiste `full_name` e `activity_type` |
| Dashboard mostra "Motorista Parceiro" hardcoded | **RESOLVIDO** — Usa `userName` do Zustand com fallback |
| `app/_layout.tsx` não carrega estado do onboarding | **RESOLVIDO** — Chama `loadOnboardingState()` e `loadUserProfile()` no startup |

---

## 2. BUGS CORRIGIDOS NESTA SESSÃO (Opus 4.6, 10/04/2026)

Todos os bugs identificados durante a auditoria foram corrigidos:

| Bug | Correção | Arquivo(s) |
|---|---|---|
| `handleSave` sem try/catch nos modais de transação | Envolvido em try/catch com Alert.alert | `add-income.tsx`, `add-expense.tsx` |
| `typography` inexistente desestruturada do `useTheme()` | Removido da desestruturação | `manage-sources.tsx` |
| Import `Ionicons` não utilizado | Removido | `manage-sources.tsx` |
| `formatBRL` duplicada em 2 arquivos | Extraída para `src/lib/formatters/currency.ts` | `dashboard.tsx`, `entries.tsx` |
| Cores hardcoded nos botões de toggle | Substituídas por `colors.danger` / `colors.income` | `manage-sources.tsx`, `manage-categories.tsx` |

---

## 3. DÍVIDAS TÉCNICAS REMANESCENTES

Estas são questões de menor prioridade que NÃO precisam ser corrigidas agora, mas devem ser endereçadas quando oportuno:

### DT-1: Entidades de domínio nunca são usadas
Os arquivos em `src/domain/entities/` (`Income.ts`, `Expense.ts`, `UserProfile.ts`, `Goal.ts`) definem interfaces TypeScript que nenhum repositório utiliza. Os repos trabalham com tipos inline.
**Quando corrigir**: Ao implementar features complexas (relatórios, edição), começar a usar as interfaces como contratos de retorno.

### DT-2: Zod e react-hook-form instalados mas não utilizados
Ambos estão no `package.json` sem uso, adicionando peso ao bundle.
**Quando corrigir**: Adotar ao criar formulários mais complexos, ou remover se não forem necessários.

### DT-3: `schema.sql` pode divergir de `sqlite.ts`
O DDL existe em dois lugares. Ao alterar schema, sempre atualizar ambos.

### DT-4: SafeArea inconsistente
- `dashboard.tsx`: `marginTop: 40`
- `entries.tsx`: `paddingTop: 56`
- `settings.tsx`: sem padding top significativo
**Quando corrigir**: Padronizar usando `react-native-safe-area-context`.

### DT-5: Modais de gerenciamento usam `TextInput` cru
`manage-sources.tsx` e `manage-categories.tsx` usam `TextInput` direto em vez de `AppInput`. Funciona, mas é inconsistente com o design system.

---

## 4. ESTADO REAL DE CADA TELA

| Tela | Status | Funcionalidades |
|---|---|---|
| `app/_layout.tsx` | OK | Init DB, splash, carrega onboarding + perfil |
| `app/index.tsx` | OK | Redirect condicional: onboarding ou dashboard |
| `onboarding/welcome.tsx` | OK | Apresentação + "Começar Agora" |
| `onboarding/profile.tsx` | OK | Coleta nome/atividade, grava SQLite + Zustand |
| `(tabs)/dashboard.tsx` | OK | Cards receita/despesa/lucro, nome dinâmico, pull-to-refresh |
| `(tabs)/entries.tsx` | OK | SectionList agrupada por dia, cores, delete por long-press |
| `(tabs)/reports.tsx` | PLACEHOLDER | Texto estático "Relatórios e Gráficos" |
| `(tabs)/settings.tsx` | OK | Links para manage-sources e manage-categories |
| `(modals)/add-income.tsx` | OK | Máscara BRL, fonte, data picker, try/catch |
| `(modals)/add-expense.tsx` | OK | Máscara BRL, categoria, data picker, try/catch |
| `(modals)/manage-sources.tsx` | OK | CRUD fontes com soft-delete, cores do tema |
| `(modals)/manage-categories.tsx` | OK | CRUD categorias com soft-delete, cores do tema |

---

## 5. REPOSITÓRIOS — MAPA DE MÉTODOS

### `TransactionsRepository.ts`
| Método | O que faz |
|---|---|
| `getTodaySummary()` | Soma receitas/despesas do dia |
| `getIncomeSources()` | Fontes ativas para seleção |
| `getExpenseCategories()` | Categorias ativas para seleção |
| `addIncome(sourceId, amountCents, date?)` | Insere receita |
| `addExpense(categoryId, amountCents, date?)` | Insere despesa |
| `deleteTransaction(id, type)` | Hard-delete de transação |
| `getTransactionHistory(limit=50)` | Histórico agrupado por dia |

### `IncomeSourcesRepository.ts`
| Método | O que faz |
|---|---|
| `getAllSources()` | Todas as fontes (ativas + arquivadas) |
| `getActiveSources()` | Apenas fontes ativas |
| `addSource(name, color?, icon?)` | Nova fonte com UUID |
| `toggleSourceActive(id, isActive)` | Soft-delete/reativação |

### `ExpenseCategoriesRepository.ts`
| Método | O que faz |
|---|---|
| `getAllCategories()` | Todas categorias (ativas + arquivadas) |
| `getActiveCategories()` | Apenas categorias ativas |
| `addCategory(name, type?, color?, icon?)` | Nova categoria com UUID |
| `toggleCategoryActive(id, isActive)` | Soft-delete/reativação |

### `AppSettingsRepository.ts`
| Método | O que faz |
|---|---|
| `isOnboardingCompleted()` | Lê flag do SQLite |
| `completeOnboarding()` | Marca onboarding concluído |

### `UserProfileRepository.ts`
| Método | O que faz |
|---|---|
| `saveProfile(fullName, activityType)` | Insere ou atualiza perfil |
| `getProfile()` | Retorna perfil ou null |

---

## 6. ZUSTAND STORE

**Arquivo**: `src/stores/app-store.ts`

| Campo/Método | Propósito |
|---|---|
| `hasCompletedOnboarding` | Flag do onboarding |
| `isOnboardingLoaded` | Impede flash no redirect |
| `loadOnboardingState()` | Hidrata do SQLite na inicialização |
| `completeOnboarding()` | Grava SQLite + atualiza Zustand |
| `userName` | Nome do motorista (do SQLite) |
| `loadUserProfile()` | Hidrata do SQLite na inicialização |

---

## 7. PRÓXIMAS TAREFAS (em ordem de prioridade)

### Prioridade Alta
1. **`reports.tsx` — Relatórios financeiros**: Substituir placeholder. Criar `TransactionsRepository.getReportData(startDate, endDate)` com totais por fonte/categoria. Implementar filtro de período (Hoje, Semana, Mês). Mostrar resumo em cards + lista detalhada.

### Prioridade Média
2. **Edição de transações**: Criar modal `edit-transaction.tsx`. Adicionar `updateIncome()` e `updateExpense()` ao `TransactionsRepository`. No `entries.tsx`, tap abre edição, long-press mantém exclusão.

### Prioridade Baixa
3. **Metas financeiras**: Implementar UI para `financial_goals` (tabela já existe no SQLite).
4. **Testes unitários**: Nenhum teste escrito ainda. jest-expo e testing-library já instalados.
5. **Exportação de dados**: CSV/PDF dos relatórios.

---

## 8. REGRAS OBRIGATÓRIAS

1. **Singleton SQLite**: Sempre usar `getDatabase()` de `sqlite.ts`
2. **Soft-delete** para `income_sources` e `expense_categories` — NUNCA `DELETE FROM`
3. **Hard-delete** permitido para `incomes` e `expenses`
4. **Valores em centavos** (`amount_cents` como INTEGER)
5. **UUIDs** via `Crypto.randomUUID()` do `expo-crypto`
6. **Timestamps** via `new Date().toISOString()`
7. **Ordenação**: Alfabética com "Outros" sempre no final
8. **Tema**: Sempre usar `useTheme()` para cores, spacing, radius
9. **Componentes UI**: Usar `AppButton`, `AppCard`, `AppInput`
10. **Ícones**: Sempre `Ionicons` do `@expo/vector-icons`
11. **Moeda**: `pt-BR`, `BRL`, formato `R$ X.XXX,XX` — usar `formatBRL()` de `@/lib/formatters/currency`
12. **Path alias**: `@/` aponta para `./src/`
13. **Repositórios**: Classes com métodos estáticos
14. **IP da rede**: `192.168.15.95` (configurado no `.env`)
15. **Try/catch**: Todo `handleSave` que grava no SQLite DEVE ter try/catch com Alert.alert

---

## 9. ARQUIVOS-CHAVE

| Arquivo | O que tem |
|---|---|
| `src/infrastructure/db/sqlite.ts` | Singleton + DDL completo (7 tabelas) |
| `src/infrastructure/db/seed.ts` | Dados iniciais (6 fontes + 5 categorias) |
| `src/stores/app-store.ts` | Estado global Zustand |
| `src/theme/index.ts` | Hook useTheme |
| `src/constants/colors.ts` | Paleta light/dark |
| `src/lib/formatters/currency.ts` | `formatBRL()` compartilhado |
| `src/types/transaction.ts` | Tipos UnifiedTransaction e TransactionSection |
