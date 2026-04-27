# MotoFinance Mobile — Session Checkpoint

> **Última atualização**: 27 de abril de 2026 (sessão 5)
> **Status geral**: App funcionalmente completo. Sprint 3 encerrado. Polimentos de UX/UI aplicados: identidade visual, padronização de layout, campo activityType removido, bugs corrigidos.

---

## 1. Visão do Projeto

**MotoFinance** é um app mobile **offline-first** de controle financeiro para trabalhadores independentes (motoristas de Uber, 99, iFood, motoboys etc.). O objetivo central é permitir que o motorista registre receitas e despesas rapidamente e veja o **lucro líquido real** do dia em tempo real.

**Princípios**:
- Offline-first: todos os dados ficam em SQLite local, sem necessidade de internet
- Registro rápido: transação em 2–3 toques
- Integridade: soft-delete para entidades referenciadas, hard-delete permitido apenas para transações

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Versão |
|---|---|---|
| Runtime | React Native | 0.81.5 |
| Framework | Expo | ~54.0.33 |
| Linguagem | TypeScript | ~5.9.2 |
| Navegação | Expo Router (file-based) | ~6.0.23 |
| Banco de Dados | expo-sqlite | ~16.0.10 |
| Estado Global | Zustand | ^5.0.12 |
| Validação de Forms | Zod ^4.3.6 + react-hook-form ^7.72.1 + @hookform/resolvers | ✅ Em uso |
| Testes | jest-expo + ts-jest | ✅ 74 testes passando |
| Exportação | expo-file-system + expo-sharing + expo-print | ✅ CSV (BOM UTF-8) e PDF implementados |
| Gestos | react-native-gesture-handler | — |
| Animações | react-native-reanimated | — |
| UUID | expo-crypto | ~15.0.8 |
| Ícones | @expo/vector-icons (Ionicons) | ^15.0.3 |
| Data Picker | @react-native-community/datetimepicker | — |

**Configurações importantes**:
- `app.json`: `newArchEnabled: true`, `typedRoutes: true`, `reactCompiler: true`
- `tsconfig.json`: `strict: true`, path alias `@/*` → `./src/*`
- `package.json` scripts: `start`, `lint`, `test`, `test:coverage`
- `jest.config.js`: dois projetos — `unit` (ts-jest, sem Expo) e `expo` (jest-expo, componentes)
- `.claude/settings.json`: `Bash(git *)` negado — git só quando o usuário pedir explicitamente

---

## 3. Estrutura de Diretórios

```
d:\MotoFinance\motofinance-mobile\
├── app/
│   ├── _layout.tsx               # Root Stack + AppErrorBoundary global
│   ├── index.tsx                 # Redirect condicional: onboarding OU /(tabs)/dashboard
│   ├── onboarding/
│   │   ├── welcome.tsx           # Tela de boas-vindas
│   │   └── profile.tsx           # ✅ Zod + RHF — coleta nome/atividade
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Bottom tabs
│   │   ├── dashboard.tsx         # ✅ Usa useDashboardData hook; testIDs nos cards
│   │   ├── entries.tsx           # ✅ FlatList + paginação cursor-based (loadMore)
│   │   ├── reports.tsx           # Evolução Diária em ordem decrescente; exportação CSV/PDF
│   │   └── settings.tsx          # Links para gerenciamento (goals em modal próprio)
│   └── (modals)/
│       ├── add-income.tsx        # ✅ Zod + RHF — modal de receita (modo edição)
│       ├── add-expense.tsx       # ✅ Zod + RHF — modal de despesa (modo edição)
│       ├── manage-sources.tsx    # CRUD fontes de receita
│       ├── manage-categories.tsx # CRUD categorias de despesa
│       └── manage-goals.tsx      # Metas mensais (receita + lucro líquido)
├── jest.config.js
└── src/
    ├── hooks/
    │   └── useDashboardData.ts   # ✅ NOVO — hook com toda lógica de fetch do dashboard
    ├── infrastructure/
    │   ├── db/
    │   │   ├── sqlite.ts         # 7 índices SQLite idempotentes
    │   │   └── seed.ts           # Auto-seed: 6 fontes + 5 categorias
    │   └── repositories/
    │       ├── TransactionsRepository.ts       # ✅ getTransactionHistory com paginação cursor
    │       ├── __tests__/
    │       │   └── TransactionsRepository.test.ts  # 15 casos
    │       └── ...demais repositórios
    ├── lib/
    │   ├── formatters/
    │   │   ├── currency.ts       # formatBRL + centsToMaskedBRL + applyBRLMask + parseBRLToCents
    │   │   │                     # MAX_CENTS = 999_999_999_999 (R$ 9.999.999.999,99), slice 12
    │   │   └── __tests__/
    │   │       └── currency.test.ts  # 18 casos
    │   ├── validation/
    │   │   ├── transaction.schema.ts
    │   │   ├── goals.schema.ts
    │   │   ├── profile.schema.ts
    │   │   ├── index.ts
    │   │   └── __tests__/        # 32 casos (16 + 7 + 9)
    │   ├── dates.ts
    │   └── exportReport.ts       # ✅ CSV com BOM UTF-8 (\uFEFF) + PDF
    └── components/
        └── ui/
            └── AppButton.tsx     # ✅ Prop testID adicionada
```

---

## 4. O que foi feito na sessão de 24/04/2026

### Sonnet Médio
1. **Paginação cursor-based em `getTransactionHistory`**
   - Assinatura: `getTransactionHistory(start?, end?, opts?: { limit?, before? })`
   - Retorna `PagedTransactionResult { sections, hasMore, nextCursor }`
   - SQL: LIMIT+1 para detectar hasMore sem query extra; cursor via `WHERE date < :before`
   - `ORDER BY date DESC` (sem `id` — causa erro SQLite em UNION ALL)

2. **`entries.tsx`: ScrollView → FlatList**
   - `ListItem` discriminado: `{ kind: 'month' | 'day' | 'flat' }`
   - `loadMore()` busca próxima página e mescla via `mergeSections()`
   - `extraData={expandedMonths}` para re-render correto dos acordeons
   - Footer: spinner durante carga / "Todos os registros carregados" ao final

3. **`useDashboardData` hook** (`src/hooks/useDashboardData.ts`)
   - Extrai toda lógica de fetch/estado do `dashboard.tsx`
   - Expõe: `{ data, loading, refreshing, fetch, refresh }`

### Sonnet Baixo
4. **CSV com BOM UTF-8** — `'\uFEFF' +` no `shareCSV` de `exportReport.ts`
5. **Error Boundary global** — classe `AppErrorBoundary` em `_layout.tsx`; tela de fallback com "Tentar novamente"
6. **`testID` no `AppButton`** — prop opcional passada ao `TouchableOpacity`
7. **`testID` no dashboard** — `dashboard-scroll`, `dashboard-net`, `dashboard-income`, `dashboard-expense`, `btn-add-income`, `btn-add-expense`
8. **Bug fix** — `ORDER BY date DESC, id DESC` causava erro SQLite em UNION ALL; revertido para `ORDER BY date DESC`

### Resultado: 74 testes passando
```
npx jest --selectProjects unit --no-coverage
Test Suites: 5 passed  |  Tests: 74 passed
```

---

## 4b. O que foi feito na sessão de 26/04/2026

### Sessão 1 (commits 05add86)
- **DT-3/4** — `manage-sources/categories`: TextInput → AppInput, SafeAreaView edges bottom, isLoading/disabled, testIDs, try/catch
- **DT-5** — `SortableChipGrid`: detecção "drop após último chip" antes do fallback nearest-center

### Sessão 2 (commit 89a5df9)
- **Busca por texto** em lançamentos: `getTransactionHistory` + `opts.search`, debounce 300ms, cap 500 registros, footer com contagem
- **Backup/Restore**: `src/lib/backup.ts` — exportBackup (expo-sharing) + importBackup (expo-document-picker) com backup de segurança e rollback; `resetDatabase()` em sqlite.ts
- **Swipe editar/excluir**: `SwipeableRow` com `ReanimatedSwipeable`, `openSwipeableRef` global, botões Editar (primary) + Excluir (danger), 80px cada
- **Tema manual**: `ThemePreference` type, `AppSettingsRepository.getTheme/setTheme`, store Zustand, `useTheme()` lê preferência, carregado no setup

### Sessão 3 (commit c3c0bb6)
- **Notificações**: `expo-notifications` v55
  - `src/lib/notifications.ts`: `requestNotificationPermissions`, `scheduleReminder`, `cancelReminder`, `checkGoalCrossed`
  - `app_settings` migration: `notifications_enabled` + `reminder_time`
  - `AppSettingsRepository`: `getNotificationSettings`, `setNotificationsEnabled`, `setReminderTime`
  - `app-store.ts`: estado + ações; reagenda ao mudar enabled/horário
  - `_layout.tsx`: solicita permissão + reagenda no startup
  - `add-income.tsx`: captura totais antes → detecta cruzamento de meta → dispara notificação
  - `settings.tsx`: Switch lembrete + TimePicker horário (condicional)

### Novos arquivos criados nesta sessão
- `src/lib/backup.ts`
- `src/lib/notifications.ts`

### Pacotes instalados nesta sessão
- `expo-document-picker` (restore de backup)
- `expo-notifications` v55

---

### Sessão 4 (27/04/2026) — Lançamentos Recorrentes
- **Schema SQL** (`sqlite.ts`): tabela `recurring_rules` + índice `idx_recurring_rules_active`
- **`RecurringRulesRepository`** (`src/infrastructure/repositories/RecurringRulesRepository.ts`):
  - Tipos: `RecurringFrequency`, `RecurringType`, `RecurringRule`, `RecurringRuleWithLabel`, `NewRecurringRule`
  - Métodos: `getAllRules()` (JOIN com label), `getActiveRules()`, `addRule()`, `updateRule()`, `toggleActive()`, `deleteRule()`, `updateLastGeneratedDate()`
- **`recurringGenerator`** (`src/lib/recurringGenerator.ts`):
  - `getDueDates(rule, fromKey, toKey)` — função pura exportada; `Math.min(dom, lastDay)` para meses curtos
  - `generatePendingTransactions()` — chamado no startup (não-bloqueante); `last_generated_date` avança regra a regra; erros isolados por try/catch
- **`_layout.tsx`**: Stack.Screen para `(modals)/manage-recurring`; `generatePendingTransactions().catch(...)` no setup
- **`app/(modals)/manage-recurring.tsx`**: CRUD completo
  - Zod schema com `superRefine` para validação condicional (semanal/mensal)
  - Lista: ícone, label, descrição de frequência, valor, editar + Pausar/Ativar + excluir
  - Formulário: type pills, chips de fonte/categoria, valor, frequência pills, DOW buttons / day_of_month, data início, notas
  - `frequencyLabel()`, `DOW_SHORT`, `DOW_LONG`
  - Hard-delete com Alert (avisa que transações geradas são mantidas)
- **`settings.tsx`**: link "Lançamentos Recorrentes" adicionado na seção GERENCIAR

### Design decisions (recorrentes)
- **Sem retroação**: `last_generated_date = null` → usa `start_date` como `fromKey`
- **Transações independentes**: regras não referenciam transações por FK; excluir/pausar regra não afeta histórico
- **Meses curtos**: dia 31 em fevereiro → dia 28/29 (Math.min)

---

## 5. Decisões de Design Fechadas

| Decisão | Detalhe |
|---|---|
| `amountCents` no schema como `number` | Conversão da máscara ocorre na UI antes do `zodResolver` |
| Data máxima = fim do dia atual | Compatível com `maximumDate={new Date()}` do DateTimePicker |
| `notes` → `undefined` via `.transform()` | Bate com `notes.trim() \|\| undefined` do repositório |
| Limite de valor: R$ 9.999.999.999,99 | MAX_CENTS = `999_999_999_999` (12 dígitos, slice 12) |
| Metas: `0` ≠ `null` | `0` = zerar meta; `null` = desativar |
| Cursor de paginação = `date` ISO da última linha | `id` não pode ser tie-breaker em UNION ALL no SQLite |
| PAGE_SIZE = 50 | Padrão em `TransactionsRepository` e `entries.tsx` |

---

## 6. Banco de Dados (SQLite)

Arquivo: `motofinance.db`. DDL em `sqlite.ts → initDatabase()`.
PRAGMAs: `journal_mode = WAL`, `foreign_keys = ON`.

### Índices (adicionados em 23/04/2026)
```sql
CREATE INDEX IF NOT EXISTS idx_incomes_received_at ON incomes(received_at);
CREATE INDEX IF NOT EXISTS idx_expenses_spent_at ON expenses(spent_at);
CREATE INDEX IF NOT EXISTS idx_incomes_source_id ON incomes(source_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_income_sources_active_order ON income_sources(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_expense_categories_active_order ON expense_categories(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_financial_goals_period_type ON financial_goals(period, goal_type, is_active);
```

---

## 7. Estado Real de Cada Tela

| Tela | Status | Observação |
|---|---|---|
| `app/_layout.tsx` | ✅ OK | Error Boundary global + `setDbIsReady` no `finally` |
| `app/index.tsx` | ✅ OK | Redirect condicional |
| `onboarding/welcome.tsx` | ✅ OK | — |
| `onboarding/profile.tsx` | ✅ Zod + RHF | `profileSchema` |
| `(tabs)/dashboard.tsx` | ✅ Refatorado | Usa `useDashboardData`; testIDs adicionados |
| `(tabs)/entries.tsx` | ✅ FlatList + paginação + busca + swipe | loadMore, mergeSections, SwipeableRow, searchBar |
| `(tabs)/reports.tsx` | ✅ OK | Exportação CSV/PDF; Evolução Diária decrescente |
| `(tabs)/settings.tsx` | ✅ OK | Aparência (tema), Notificações, Dados (backup), Gerenciar |
| `(modals)/add-income.tsx` | ✅ Zod + RHF | `incomeSchema`; modo edição |
| `(modals)/add-expense.tsx` | ✅ Zod + RHF | `expenseSchema`; modo edição |
| `(modals)/manage-sources.tsx` | ✅ OK | CRUD com soft-delete; AppInput; SafeArea |
| `(modals)/manage-categories.tsx` | ✅ OK | CRUD com soft-delete; AppInput; SafeArea |
| `(modals)/manage-goals.tsx` | ✅ OK | Metas mensais |
| `(modals)/manage-recurring.tsx` | ✅ Zod + RHF | Lista + formulário; type/freq/DOW/day_of_month |

---

## 8. Dívidas Técnicas Remanescentes

| ID | Descrição | Prioridade |
|---|---|---|
| DT-1 | Entidades de domínio (`src/domain/entities/`) não usadas pelos repositórios | Baixa |
| DT-2 | `schema.sql` pode divergir de `sqlite.ts` | Atualizar ao alterar schema |
| ~~DT-3~~ | ~~SafeArea inconsistente entre telas~~ | ✅ Resolvido |
| ~~DT-4~~ | ~~`manage-sources/categories` usam `TextInput` cru em vez de `AppInput`~~ | ✅ Resolvido |
| ~~DT-5~~ | ~~`SortableChipGrid`: bug ao posicionar item como último da lista~~ | ✅ Resolvido |

---

## 9. Próximas Tarefas (Roadmap)

### Fundação — ✅ Concluída
- [x] Schemas Zod + react-hook-form em todos os formulários
- [x] Formatters BRL centralizados
- [x] Índices SQLite idempotentes
- [x] Jest configurado + 74 testes unitários
- [x] Paginação cursor-based em `getTransactionHistory`
- [x] FlatList com infinite scroll em `entries.tsx`
- [x] CSV com BOM UTF-8
- [x] `useDashboardData` hook
- [x] Error Boundary global
- [x] testIDs nos elementos interativos principais

### Sprint 3 (features — confirmar com usuário antes de implementar)
- [x] Busca/filtro por texto em lançamentos — debounce 300ms, filtra notes + label (fonte/categoria), desabilita paginação
- [x] Backup/Restore — exportBackup (expo-sharing) + importBackup (expo-document-picker) com rollback automático; seção DADOS em Settings
- [x] Swipe para editar/excluir em lançamentos — ReanimatedSwipeable, um item aberto por vez, long-press mantido como fallback
- [x] Configuração de tema — Sistema/Claro/Escuro; Zustand + SQLite (app_settings.theme); carregado no setup antes da splash
- [x] Notificações — lembrete diário (horário configurável, padrão 20h) + alerta de meta atingida (detecção before/after cruzamento); expo-notifications v55; Switch + TimePicker em Settings
- [x] Lançamentos recorrentes — `recurring_rules` schema, gerador no startup, modal completo Zod+RHF

---

## 10. Regras Obrigatórias do Projeto

1. **Singleton SQLite**: sempre `getDatabase()` — NUNCA `SQLite.openDatabaseAsync()` direto
2. **Soft-delete**: NUNCA `DELETE FROM income_sources` ou `expense_categories`
3. **Hard-delete**: apenas em `incomes` e `expenses`
4. **Centavos**: `amount_cents` é sempre `INTEGER`
5. **UUIDs**: `Crypto.randomUUID()` do `expo-crypto`
6. **Timestamps**: `new Date().toISOString()`
7. **Tema**: `useTheme()` para tudo — zero hardcode de cores/spacing/radius
8. **Moeda**: `formatBRL()` de `@/lib/formatters/currency` para exibição; `centsToMaskedBRL`/`applyBRLMask`/`parseBRLToCents` para inputs
9. **Validação**: novos formulários DEVEM usar Zod + react-hook-form (padrão de `add-expense.tsx`)
10. **Path alias**: `@/` → `./src/`
11. **Repositórios**: classes com métodos estáticos
12. **Try/catch**: todo `handleSave` e todo `fetch` de tela DEVE ter try/catch + `console.error`
13. **Datas locais**: `new Date(isoString).toLocaleDateString('en-CA')` — nunca `.substring(0, 10)`
14. **`_layout.tsx`**: `setDbIsReady(true)` DEVE ficar no `finally`
15. **`.claude/worktrees/`**: está no `.gitignore` — nunca commitar
16. **Git**: bloqueado por `.claude/settings.json` — só executar quando o usuário pedir explicitamente
17. **Paginação**: `getTransactionHistory` retorna `PagedTransactionResult`; callers devem usar `.sections`
18. **ORDER BY em UNION ALL**: nunca usar `table.column` no ORDER BY — usar apenas aliases definidos no SELECT

---

---

## 11. O que foi feito na sessão 5 (27/04/2026) — Polimentos UX/UI

### Bugs corrigidos
- **Nome não aparecia após onboarding**: `profile.tsx` não chamava `loadUserProfile()` após salvar — o Zustand ficava com `userName: null` e o dashboard exibia "Motorista Parceiro". Corrigido com `await loadUserProfile()` antes de `completeOnboarding()`.

### Campo `activityType` removido
- Removido de: `profile.schema.ts`, `profile.schema.test.ts`, `UserProfile.ts`, `UserProfileRepository.ts`, `onboarding/profile.tsx`, `manage-profile.tsx`
- Coluna `activity_type` mantida no SQLite (sem migração necessária); nova assinatura: `saveProfile(fullName: string)`

### Ferramenta de dev — Limpar Dados de Teste
- `sqlite.ts`: `clearAllData()` — apaga incomes, expenses, goals, recurring_rules, user_profile, app_settings e re-executa seed de defaults
- `app-store.ts`: `resetAppState()` — zera `hasCompletedOnboarding` e `userName` no Zustand
- `settings.tsx` `__DEV__`: botão "Limpar Dados de Teste" (vermelho) que limpa banco + reseta store + navega para onboarding

### Identidade visual — `ScreenTitle`
- Novo componente `src/components/ui/ScreenTitle.tsx`: ícone `wallet-outline` (placeholder) + título em bold
- Aplicado nas 4 abas: **Painel**, **Lançamentos**, **Relatórios**, **Ajustes**
- Ícone definitivo: trocar `wallet-outline` em `ScreenTitle.tsx` quando pronto

### Tela de onboarding/profile
- Cabeçalho de marca (ícone + "MotoFinance") movido para fora do ScrollView — sempre visível com teclado aberto
- Texto introdutório verbose removido
- Campo "Moeda padrão" restaurado (prevendo versão multilíngue)
- Label simplificado: "Informe seu nome ou apelido"

### Padronização de espaçamento das abas
- Referência: dashboard usa `padding: 24` + `header.marginTop: 20` = **44px** do topo até o título
- Reports: `paddingTop: 56 → 44`
- Entries: `paddingTop: 56 → 44`, `paddingBottom: 12 → 16`, `paddingTop: 8 → 0` no FlatList contentContainerStyle, `paddingHorizontal` duplicado removido do header View

### Outros polimentos
- `add-income.tsx`: placeholder de Observação alterado de "Surge duplo, chuva forte..." para "Corrida longa, entrega especial..."
- `manage-recurring.tsx`: chips de fonte/categoria: `ScrollView horizontal` → `View` com `flexWrap: 'wrap'` (padrão das demais telas)
- `entries.tsx`: botão limpar busca (`close-circle`) ampliado de `size={16}` para `size={22}`

---

## 12. Git

- **Branch ativa**: `develop`
- **Commits desta sessão**:
  - `4681a2b` — feat: lançamentos recorrentes (sessão 4)
  - `de57c29` — fix: compatibilidade SDK 54 (lazy import notifications, nova API expo-file-system)
- **Pendente de commit**: polimentos UX/UI da sessão 5 (ver seção 11)
- **Remote**: `origin/develop` (após commitar, rodar `git push origin develop`)
