# MotoFinance Mobile — Session Checkpoint

> **Última atualização**: 24 de abril de 2026 (sessão 2)
> **Status geral**: App funcionalmente completo. Todas as dívidas técnicas DT-3 a DT-5 resolvidas. Backup em nuvem adiado (requer Google Cloud Console setup). Sprint 3 pendente.

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
| `(tabs)/entries.tsx` | ✅ FlatList + paginação | loadMore, mergeSections, 3 view modes |
| `(tabs)/reports.tsx` | ✅ OK | Exportação CSV/PDF; Evolução Diária decrescente |
| `(tabs)/settings.tsx` | ✅ OK | Menu com links; metas em modal |
| `(modals)/add-income.tsx` | ✅ Zod + RHF | `incomeSchema`; modo edição |
| `(modals)/add-expense.tsx` | ✅ Zod + RHF | `expenseSchema`; modo edição |
| `(modals)/manage-sources.tsx` | ✅ OK | CRUD com soft-delete |
| `(modals)/manage-categories.tsx` | ✅ OK | CRUD com soft-delete |
| `(modals)/manage-goals.tsx` | ✅ OK | Metas mensais |

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
- [ ] Busca/filtro por texto em lançamentos — **próxima a implementar**
- [ ] Lançamentos recorrentes — novo schema necessário
- [ ] Backup em nuvem — Opção B (export/import arquivo .db via expo-sharing) aprovada pelo usuário; Opção A (Google Drive OAuth) requer Google Cloud Console setup
- [ ] Notificações (meta atingida, lembrete diário) — permissões iOS/Android

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

## 11. Git

- **Branch ativa**: `develop`
- **Último commit**: `b279429` — feat: validação Zod, formatters BRL, índices SQLite e testes
- **Pendente**: commit das alterações das duas sessões de 24/04/2026 (paginação, FlatList, hooks, Error Boundary, DT-3/4/5)
- **Remote**: `origin/develop` (após commitar, rodar `git push origin develop`)
