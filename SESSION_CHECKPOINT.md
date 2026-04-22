# MotoFinance Mobile — Session Checkpoint

> **Última atualização**: 22 de abril de 2026
> **Status geral**: App funcionalmente completo. Todas as telas implementadas e testadas.

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
| Gestos | react-native-gesture-handler | — |
| Animações | react-native-reanimated | — |
| UUID | expo-crypto | ~15.0.8 |
| Ícones | @expo/vector-icons (Ionicons) | ^15.0.3 |
| Data Picker | @react-native-community/datetimepicker | — |
| Validação (instalado, sem uso) | Zod ^4.3.6 + react-hook-form ^7.72.1 | — |
| Testes (instalados, sem testes escritos) | jest-expo + @testing-library/react-native | — |

**Configurações importantes**:
- `app.json`: `newArchEnabled: true`, `typedRoutes: true`, `reactCompiler: true`, plugin `expo-sqlite` registrado
- `.env`: `REACT_NATIVE_PACKAGER_HOSTNAME=192.168.15.95` (IP fixo da máquina na LAN)
- `tsconfig.json`: `strict: true`, path alias `@/*` → `./src/*`
- `metro.config.js`: extensão `.wasm` adicionada para expo-sqlite na web
- `package.json` scripts: `start` executa `expo start --host lan`

---

## 3. Estrutura de Diretórios

```
d:\MotoFinance\motofinance-mobile\
├── app/
│   ├── _layout.tsx               # Root Stack: initDatabase, splash, carrega onboarding + perfil
│   ├── index.tsx                 # Redirect condicional: onboarding OU /(tabs)/dashboard
│   ├── onboarding/
│   │   ├── welcome.tsx           # Tela de boas-vindas + botão "Começar Agora"
│   │   └── profile.tsx           # Coleta nome/atividade → grava SQLite + Zustand
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Bottom tabs: Resumo | Lançamentos | Relatórios | Ajustes
│   │   ├── dashboard.tsx         # Resumo financeiro do dia + botões de ação rápida
│   │   ├── entries.tsx           # Histórico completo agrupado por dia (SectionList)
│   │   ├── reports.tsx           # ✅ Relatórios com seletor Hoje/Semana/Mês + barras proporcionais
│   │   └── settings.tsx          # Links para manage-sources e manage-categories
│   └── (modals)/
│       ├── add-income.tsx        # Modal: registrar receita (com SortableChipGrid); aceita params para edição
│       ├── add-expense.tsx       # Modal: registrar despesa (com SortableChipGrid); aceita params para edição
│       ├── manage-sources.tsx    # CRUD fontes de receita com soft-delete
│       ├── manage-categories.tsx # CRUD categorias de despesa com soft-delete
│       └── manage-goals.tsx      # ✅ NOVO — Metas mensais (receita + lucro líquido)
└── src/
    ├── domain/
    │   └── entities/             # Income.ts, Expense.ts, UserProfile.ts, Goal.ts
    │                             # (interfaces TypeScript — não usadas pelos repositórios ainda)
    ├── infrastructure/
    │   ├── db/
    │   │   ├── sqlite.ts         # ⭐ Singleton de conexão + DDL completo (7 tabelas) + migrações defensivas
    │   │   ├── schema.sql        # DDL de referência (manter sincronizado com sqlite.ts)
    │   │   └── seed.ts           # Auto-seed: 6 fontes + 5 categorias (INSERT OR IGNORE)
    │   └── repositories/
    │       ├── TransactionsRepository.ts       # CRUD completo + getReportData + getTransactionHistory
    │       ├── IncomeSourcesRepository.ts      # CRUD fontes + updateSourcesOrder (drag & drop)
    │       ├── ExpenseCategoriesRepository.ts  # CRUD categorias + updateCategoriesOrder (drag & drop)
    │       ├── AppSettingsRepository.ts        # onboarding_completed no SQLite
    │       └── UserProfileRepository.ts        # saveProfile / getProfile
    ├── components/
    │   └── ui/
    │       ├── AppButton.tsx       # Variantes: primary|danger|outline|ghost; tamanhos: sm|md|lg
    │       ├── AppCard.tsx         # Card com sombra, borda, adapta dark/light
    │       ├── AppInput.tsx        # Input com label, erro, focus highlight, onFocus/onBlur corretos
    │       └── SortableChipGrid.tsx # ✅ NOVO — Grid de chips com drag & drop (reordenamento)
    ├── constants/
    │   ├── colors.ts             # Paleta light/dark (primary, danger, income, expense, muted…)
    │   └── spacing.ts            # Spacing (xs=4…xxl=48) + Radius (sm=8…full=9999)
    ├── theme/
    │   └── index.ts              # Hook useTheme() → { colors, spacing, radius, isDark }
    ├── stores/
    │   └── app-store.ts          # Zustand: hasCompletedOnboarding, userName, loaders
    ├── lib/
    │   └── formatters/
    │       └── currency.ts       # formatBRL(cents: number): string
    └── types/
        ├── database.ts           # type UUID, type IsoDateString
        └── transaction.ts        # UnifiedTransaction, TransactionSection
```

---

## 4. Banco de Dados (SQLite)

Arquivo: `motofinance.db`. DDL em `sqlite.ts → initDatabase()` via `CREATE TABLE IF NOT EXISTS`.
PRAGMAs ativos: `journal_mode = WAL`, `foreign_keys = ON`.

### Singleton de conexão (padrão obrigatório)

```typescript
// src/infrastructure/db/sqlite.ts
let _db: SQLiteDatabase | null = null;

export const getDatabase = async (): Promise<SQLiteDatabase> => {
  if (_db) {
    try {
      await _db.runAsync('SELECT 1'); // valida conexão
      return _db;
    } catch {
      _db = null; // stale → reabrir
    }
  }
  _db = await SQLite.openDatabaseAsync('motofinance.db');
  await _db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  return _db;
};
```

> NUNCA chamar `SQLite.openDatabaseAsync()` diretamente. Sempre usar `getDatabase()`.

### Tabelas

**`user_profile`**
```sql
id TEXT PK, full_name TEXT, activity_type TEXT,
currency_code TEXT DEFAULT 'BRL', week_starts_on INTEGER DEFAULT 1,
created_at TEXT, updated_at TEXT
```

**`income_sources`**
```sql
id TEXT PK, name TEXT, color TEXT, icon TEXT,
is_default INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1,
sort_order INTEGER DEFAULT 0,
created_at TEXT, updated_at TEXT
```
Seed (INSERT OR IGNORE, IDs "1"–"6"):

| ID | Nome | Cor | Observação |
|---|---|---|---|
| 1 | Uber | `#000000` | Preto — identidade visual da Uber |
| 2 | 99 | `#FFD100` | Amarelo — cor da 99 |
| 3 | iFood | `#EA1D2C` | Vermelho — cor do iFood |
| 4 | Particular | `#10B981` | Verde — sem vínculo de marca |
| 5 | Gorjeta | `#F59E0B` | Âmbar — "dinheiro extra" |
| 6 | Outros | `#6B7280` | Cinza — genérico |

**`expense_categories`**
```sql
id TEXT PK, name TEXT, type TEXT DEFAULT 'variable',
color TEXT, icon TEXT, is_default INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1,
sort_order INTEGER DEFAULT 0,
created_at TEXT, updated_at TEXT
```
Seed (IDs "1"–"5"): Combustível `#EF4444`, Alimentação `#F97316`, Manutenção `#8B5CF6`, Internet/Celular `#3B82F6`, Outros `#6B7280`.

**`incomes`**
```sql
id TEXT PK, source_id TEXT FK→income_sources,
amount_cents INTEGER, received_at TEXT,
payment_method TEXT, notes TEXT, created_at TEXT, updated_at TEXT
```

**`expenses`**
```sql
id TEXT PK, category_id TEXT FK→expense_categories,
amount_cents INTEGER, spent_at TEXT,
expense_kind TEXT DEFAULT 'variable', is_recurring INTEGER DEFAULT 0,
notes TEXT, created_at TEXT, updated_at TEXT
```

**`financial_goals`**
```sql
id TEXT PK, period TEXT, goal_type TEXT DEFAULT 'net',
target_amount_cents INTEGER, is_active INTEGER DEFAULT 1,
created_at TEXT, updated_at TEXT
```
> Tabela existe no DDL mas **não tem UI ainda**.

**`app_settings`**
```sql
id TEXT PK, theme TEXT DEFAULT 'system',
onboarding_completed INTEGER DEFAULT 0,
enable_goals INTEGER DEFAULT 1, created_at TEXT, updated_at TEXT
```

### Migrações defensivas (em `initDatabase`)
```typescript
// Adicionadas para devices com o app já instalado sem sort_order
try { await db.execAsync(`ALTER TABLE income_sources ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;`); } catch {}
try { await db.execAsync(`ALTER TABLE expense_categories ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;`); } catch {}
```

---

## 5. Repositórios — Mapa Completo de Métodos

### `TransactionsRepository.ts`

| Método | Assinatura resumida | O que faz |
|---|---|---|
| `getTodaySummary()` | `→ {incomes, expenses, net}` | Soma receitas/despesas do dia (centavos) |
| `getIncomeSources()` | `→ {id, name}[]` | Fontes ativas para seleção nos modais, ordenadas por `sort_order` |
| `getExpenseCategories()` | `→ {id, name}[]` | Categorias ativas para seleção nos modais, ordenadas por `sort_order` |
| `addIncome()` | `(sourceId, amountCents, date?)` | Insere receita com UUID |
| `addExpense()` | `(categoryId, amountCents, date?)` | Insere despesa com UUID |
| `deleteTransaction()` | `(id, type)` | Hard-delete em `incomes` ou `expenses` |
| `getTransactionHistory()` | `(limit=50) → TransactionSection[]` | Histórico agrupado por dia em horário LOCAL, JOIN com nome/cor |
| `getReportData()` | `(period) → ReportData` | Totais e breakdowns por fonte/categoria para o período selecionado |
| `getDateRange()` *(private)* | `(period) → {start, end}` | Intervalos ISO para 'today'/'week'/'month' |

**`getReportData` — retorno**:
```typescript
{
  totalIncomeCents: number,
  totalExpenseCents: number,
  netCents: number,
  bySource:   Array<{ id, name, color: string|null, totalCents }>,
  byCategory: Array<{ id, name, color: string|null, totalCents }>,
}
```

Definição de período:
- `'today'` → 00:00:00 até 23:59:59 do dia atual
- `'week'` → últimos 7 dias (hoje − 6 dias até hoje)
- `'month'` → do dia 1 do mês atual até hoje

### `IncomeSourcesRepository.ts`
| Método | O que faz |
|---|---|
| `getAllSources()` | Todas as fontes (ativas + arquivadas), ativas primeiro |
| `getActiveSources()` | Apenas fontes ativas, ordenadas por `sort_order` |
| `addSource(name, color?, icon?)` | Nova fonte com UUID, `sort_order = max + 1` |
| `toggleSourceActive(id, isActive)` | Soft-delete / reativação |
| `updateSourcesOrder(ids[])` | ✅ NOVO — Persiste nova ordem após drag & drop |

### `ExpenseCategoriesRepository.ts`
| Método | O que faz |
|---|---|
| `getAllCategories()` | Todas as categorias (ativas + arquivadas), ativas primeiro |
| `getActiveCategories()` | Apenas categorias ativas, ordenadas por `sort_order` |
| `addCategory(name, type?, color?, icon?)` | Nova categoria com UUID, `sort_order = max + 1` |
| `toggleCategoryActive(id, isActive)` | Soft-delete / reativação |
| `updateCategoriesOrder(ids[])` | ✅ NOVO — Persiste nova ordem após drag & drop |

### `AppSettingsRepository.ts`
| Método | O que faz |
|---|---|
| `isOnboardingCompleted()` | Lê flag do SQLite |
| `completeOnboarding()` | Marca onboarding concluído (INSERT se não existir, UPDATE se existir) |

### `UserProfileRepository.ts`
| Método | O que faz |
|---|---|
| `saveProfile(fullName, activityType)` | INSERT OR REPLACE no SQLite |
| `getProfile()` | Retorna `{ fullName, activityType }` ou null |

---

## 6. Zustand Store — `src/stores/app-store.ts`

| Campo / Método | Tipo | Propósito |
|---|---|---|
| `hasCompletedOnboarding` | `boolean` | Flag do onboarding |
| `isOnboardingLoaded` | `boolean` | Evita flash no redirect inicial |
| `loadOnboardingState()` | `async` | Hidrata `hasCompletedOnboarding` do SQLite no startup |
| `completeOnboarding()` | `async` | Grava SQLite + atualiza Zustand |
| `userName` | `string \| null` | Nome do motorista |
| `loadUserProfile()` | `async` | Hidrata `userName` do SQLite no startup |
| `isLoading` | `boolean` | Flag de loading geral |
| `setLoading(val)` | `(boolean) → void` | Setter do loading geral |

Ambos `loadOnboardingState()` e `loadUserProfile()` são chamados em `app/_layout.tsx` durante a inicialização, dentro do `try/finally`.

---

## 7. Estado Real de Cada Tela

| Tela | Status | Funcionalidades |
|---|---|---|
| `app/_layout.tsx` | ✅ OK | initDatabase, splash screen, carrega onboarding + perfil; `setDbIsReady` no `finally`; rota `manage-goals` registrada |
| `app/index.tsx` | ✅ OK | Redirect condicional baseado em `isOnboardingLoaded` + `hasCompletedOnboarding` |
| `onboarding/welcome.tsx` | ✅ OK | Apresentação com ícone e botão "Começar Agora" |
| `onboarding/profile.tsx` | ✅ OK | Coleta nome/tipo atividade, grava SQLite via `UserProfileRepository` + Zustand |
| `(tabs)/dashboard.tsx` | ✅ OK | Cards receita/despesa/lucro do dia, nome dinâmico do Zustand, pull-to-refresh |
| `(tabs)/entries.tsx` | ✅ OK | SectionList agrupada por mês/dia, filtros, long-press → Alert (Editar/Excluir/Cancelar) |
| `(tabs)/reports.tsx` | ✅ OK | Pills Hoje/Semana/Mês, cards de totais, barras proporcionais por fonte/categoria |
| `(tabs)/settings.tsx` | ✅ OK | Menu GERENCIAR em ordem alfabética: Categorias de Despesa, Fontes de Receita, Metas Mensais |
| `(modals)/add-income.tsx` | ✅ OK | SortableChipGrid com drag & drop, máscara BRL, date picker, try/catch; aceita params de edição |
| `(modals)/add-expense.tsx` | ✅ OK | SortableChipGrid com drag & drop, máscara BRL, date picker, try/catch; aceita params de edição |
| `(modals)/manage-sources.tsx` | ✅ OK | CRUD fontes com soft-delete, cores do tema |
| `(modals)/manage-categories.tsx` | ✅ OK | CRUD categorias com soft-delete, cores do tema |
| `(modals)/manage-goals.tsx` | ✅ NOVO | Metas mensais de receita e lucro líquido com máscara BRL e persistência SQLite |

**Nenhuma tela está como placeholder. O app está funcionalmente completo e testado.**

---

## 8. SortableChipGrid — Componente de Drag & Drop

**Arquivo**: `src/components/ui/SortableChipGrid.tsx`

Grid de chips com layout `flexWrap` natural e reordenamento por drag & drop. Usado em `add-income.tsx` e `add-expense.tsx`.

**Interface pública**:
```typescript
export interface SortableChipItem {
  id: string;
  name: string;
}

interface SortableChipGridProps {
  items: SortableChipItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOrderChange: (newItems: SortableChipItem[]) => void;
  accentColor: string;
  borderColor: string;
  textColor: string;
  radiusMd: number;
}
```

**Comportamento**:
- Tap rápido (< 280ms) → seleciona o chip (`onSelect`)
- Segurar > 300ms + arrastar → ativa drag; chip "flutua" seguindo o dedo com overlay animado
- Soltar → reposiciona na lista e chama `onOrderChange`
- `useEffect` sincroniza com o pai quando `initialItems` chega de forma assíncrona

**Integração com repositórios**:
```typescript
// add-income.tsx
const handleOrderChange = async (newItems: SortableChipItem[]) => {
  setSources(newItems);
  await IncomeSourcesRepository.updateSourcesOrder(newItems.map(s => s.id));
};
```

**Bug conhecido (menor prioridade)**: ao tentar posicionar um item como o último da lista, o comportamento pode ser imprevisível. O fallback de "chip com centro mais próximo" pode interferir nesse caso extremo.

---

## 9. Barras de Progresso nos Relatórios

**Arquivo**: `app/(tabs)/reports.tsx`

### Lógica de largura (proporcional ao total)
```typescript
// Receitas: cada barra ocupa % do total de receitas do período
const pct = Math.round((item.totalCents / report!.totalIncomeCents) * 100);

// Despesas: cada barra ocupa % do total de despesas do período
const pct = Math.round((item.totalCents / report!.totalExpenseCents) * 100);
```

### Esquema de cores (decisão de design)
| Elemento | Cor |
|---|---|
| Fundo da barra (track) | `colors.border` — cinza neutro fixo |
| Preenchimento de receitas | `colors.income` — verde uniforme |
| Preenchimento de despesas | `colors.expense` — vermelho uniforme |
| Bolinha identificadora (dot) | `item.color` — cor própria do item (Uber=preto, 99=amarelo, etc.) |

**Racional**: a barra comunica *quanto* (proporção), não *quem* (identidade). A bolinha colorida antes do nome já faz a identificação visual. Usar cores de marca nas barras criaria problemas de contraste (ex: `#6B7280` cinza do "Outros" quase invisível sobre fundo cinza).

---

## 10. Bugs Corrigidos Nesta Sessão

### Sessão matinal — Opus 4.6 (auditoria)

| Bug | Correção | Arquivo(s) |
|---|---|---|
| `handleSave` sem try/catch nos modais | Envolvido em try/catch com Alert.alert | `add-income.tsx`, `add-expense.tsx` |
| `typography` inexistente desestruturada do `useTheme()` | Removido da desestruturação | `manage-sources.tsx` |
| Import `Ionicons` não utilizado | Removido | `manage-sources.tsx` |
| `formatBRL` duplicada em 2 arquivos | Extraída para `src/lib/formatters/currency.ts` | `dashboard.tsx`, `entries.tsx` |
| Cores hardcoded nos botões de toggle | Substituídas por `colors.danger` / `colors.income` | `manage-sources.tsx`, `manage-categories.tsx` |

### Sessão desta noite — Sonnet 4.6 (reavaliação + correções)

| Bug | Correção | Arquivo(s) |
|---|---|---|
| **BUG-1**: Tela em branco permanente se `initDatabase()` falhar | `setDbIsReady(true)` movido para o bloco `finally` | `app/_layout.tsx` |
| **BUG-2**: Timezone — transações após ~21h (UTC-3) aparecem no dia errado | `dateKey` agora usa `new Date(row.date).toLocaleDateString('en-CA')` em horário local; comparadores de "hoje/ontem" também convertidos | `TransactionsRepository.ts` |
| **BUG-3**: `handleDelete` em `entries.tsx` duplicava lógica de formatação | Substituído por `formatBRL(item.amountCents)` | `app/(tabs)/entries.tsx` |
| **BUG-4**: Texto de debug "Valores reais salvos no MotoFinance DB" visível ao usuário | Texto removido | `app/(tabs)/dashboard.tsx` |
| **BUG-5**: Sem try/catch nos métodos `fetch` das telas | try/catch adicionado; em `entries.tsx` o `setIsLoading(false)` movido para `finally` | `dashboard.tsx`, `entries.tsx`, `reports.tsx` |
| **Barras de relatório**: largura relativa ao item máximo, não ao total | Divisor alterado para `totalIncomeCents` / `totalExpenseCents` | `app/(tabs)/reports.tsx` |
| **Barras de relatório**: fundo e preenchimento tinham contraste insuficiente | Fundo = `colors.border`; preenchimento = `colors.income`/`colors.expense` | `app/(tabs)/reports.tsx` |

---

## 11. Fix do Teclado nos Modais (Detalhe Técnico — sessão anterior)

**Problema**: Ao tocar no campo de valor, o teclado cobria os campos.

**Solução aplicada em sessão anterior**:

`src/components/ui/AppInput.tsx`:
```typescript
// onFocus e onBlur mesclados com optional chaining para não sobrescrever handlers externos
onFocus={(e) => { setIsFocused(true); onFocus?.(e); }}
onBlur={(e) => { setIsFocused(false); onBlur?.(e); }}
```

`add-income.tsx` e `add-expense.tsx`:
```typescript
const handleAmountFocus = () => {
  setTimeout(() => { scrollRef.current?.scrollToEnd({ animated: true }); }, 150);
};

// KeyboardAvoidingView
behavior="padding"
keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 80}
```

---

## 12. Dívidas Técnicas Remanescentes

| ID | Descrição | Quando resolver |
|---|---|---|
| DT-1 | Entidades de domínio (`src/domain/entities/`) nunca usadas pelos repositórios | Ao implementar features complexas |
| DT-2 | `zod` e `react-hook-form` instalados sem uso | Adotar em formulários futuros ou remover |
| DT-3 | `schema.sql` pode divergir de `sqlite.ts` (DDL duplicado) | Sempre atualizar ambos ao alterar o schema |
| DT-4 | SafeArea inconsistente: `marginTop: 40` no dashboard, `paddingTop: 56` no entries/reports, sem padding no settings | Padronizar com `react-native-safe-area-context` |
| DT-5 | `manage-sources.tsx` e `manage-categories.tsx` usam `TextInput` cru em vez de `AppInput` | Ao refatorar os modais |
| DT-6 | `SortableChipGrid`: bug ao tentar posicionar item como último da lista | Baixa prioridade — usuário relatou mas decidiu não corrigir agora |

---

## 13. Próximas Tarefas (Roadmap Priorizado)

### ✅ Concluído nesta sessão (22/04/2026)

| Feature | Detalhes |
|---|---|
| **Metas Mensais → modal dedicado** | Extraído de `settings.tsx` para `(modals)/manage-goals.tsx`; menu Ajustes reorganizado em ordem alfabética |
| **Edição de transações** | Long-press em `entries.tsx` → Alert com Editar / Excluir / Cancelar; "Editar" navega para `add-income` ou `add-expense` com params pré-preenchidos. Testado e funcionando. |

---

### Prioridade Média — Metas financeiras (UI de acompanhamento)

As metas já são salvas/editadas via `manage-goals.tsx`. O que falta é **exibir o progresso** em algum lugar:

- **`dashboard.tsx`** — barra de progresso abaixo dos cards (receita atual vs. meta de receita; lucro atual vs. meta de lucro)
- **`GoalsRepository.ts`** — método `getMonthlyGoals()` já existe; só consumir no dashboard

---

### Prioridade Baixa

- **Testes unitários**: `jest-expo` e `@testing-library/react-native` instalados, nenhum teste escrito.
- **Exportação de dados**: CSV/PDF do histórico ou relatórios. Requer `expo-file-system` + `expo-sharing`.
- **SafeArea** (DT-4): padronizar com `react-native-safe-area-context`.

---

## 14. Regras Obrigatórias do Projeto

1. **Singleton SQLite**: sempre `getDatabase()` de `sqlite.ts` — NUNCA `SQLite.openDatabaseAsync()` direto
2. **Soft-delete**: NUNCA `DELETE FROM income_sources` ou `expense_categories` — usar `toggleActive(id, false)`
3. **Hard-delete**: permitido somente em `incomes` e `expenses`
4. **Centavos**: `amount_cents` é sempre `INTEGER` — nunca float
5. **UUIDs**: `Crypto.randomUUID()` do `expo-crypto`
6. **Timestamps**: `new Date().toISOString()`
7. **Ordenação**: por `sort_order ASC`; "Outros" sempre no final (sort_order mais alto no seed)
8. **Tema**: `useTheme()` para tudo — zero cores, spacing ou radius hardcoded
9. **Componentes**: usar `AppButton`, `AppCard`, `AppInput` — nunca primitivos crus para ações
10. **Ícones**: sempre `Ionicons` do `@expo/vector-icons`
11. **Moeda**: `formatBRL()` de `@/lib/formatters/currency` — nunca formatar inline
12. **Path alias**: `@/` → `./src/`
13. **Repositórios**: classes com métodos estáticos
14. **IP da rede**: `192.168.15.95` no `.env`
15. **Try/catch**: todo `handleSave` E todo método `fetch` de tela que acessa SQLite DEVE ter try/catch + `console.error`; `handleSave` deve ter também `Alert.alert`
16. **AppInput com onFocus**: suporta `onFocus` externo corretamente via optional chaining — usar quando precisar de scroll ou side-effect no foco
17. **KeyboardAvoidingView em modais**: `behavior="padding"`, `keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 80}`
18. **Datas locais**: ao derivar `dateKey` de string ISO, usar `new Date(isoString).toLocaleDateString('en-CA')` — nunca `isoString.substring(0, 10)` (bug de timezone UTC-3)
19. **_layout.tsx**: `setDbIsReady(true)` DEVE ficar no bloco `finally` — nunca só no `try`

---

## 15. Arquivos-Chave

| Arquivo | Conteúdo |
|---|---|
| `src/infrastructure/db/sqlite.ts` | Singleton + DDL completo das 7 tabelas + migrações defensivas |
| `src/infrastructure/db/seed.ts` | Auto-seed com cores de marca: Uber=preto, 99=amarelo, iFood=vermelho |
| `src/infrastructure/repositories/TransactionsRepository.ts` | Repositório principal — `getTodaySummary`, `getReportData`, `getTransactionHistory` |
| `src/infrastructure/repositories/IncomeSourcesRepository.ts` | `updateSourcesOrder` para drag & drop |
| `src/infrastructure/repositories/ExpenseCategoriesRepository.ts` | `updateCategoriesOrder` para drag & drop |
| `src/stores/app-store.ts` | Zustand com onboarding + perfil, hidratados do SQLite |
| `src/theme/index.ts` | `useTheme()` |
| `src/constants/colors.ts` | Paleta light/dark completa — `colors.income`, `colors.expense`, `colors.danger` |
| `src/constants/spacing.ts` | Spacing e Radius |
| `src/lib/formatters/currency.ts` | `formatBRL(cents: number): string` |
| `src/types/transaction.ts` | `UnifiedTransaction`, `TransactionSection` |
| `src/components/ui/AppInput.tsx` | Input com merge correto de onFocus/onBlur |
| `src/components/ui/AppButton.tsx` | Botão com variantes e tamanhos |
| `src/components/ui/AppCard.tsx` | Card com sombra e borda do tema |
| `src/components/ui/SortableChipGrid.tsx` | ✅ NOVO — Grid sortável com drag & drop (Reanimated + GestureHandler) |
