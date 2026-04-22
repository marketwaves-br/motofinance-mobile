# 🏍️ MotoFinance Mobile — Checkpoint Completo
**Data:** 22 de Abril de 2026

Documento de continuidade para qualquer LLM (Claude, Gemini, etc.).

---

## 1. O Projeto
Aplicativo *offline-first* para controle financeiro de motociclistas (entregadores e motoristas de aplicativo).
- **Stack:** Expo 54 / React Native 0.81, TypeScript, Zustand (Estado), SQLite (`expo-sqlite`).
- **Navegação:** `expo-router` com Tabs e Modais.

---

## 2. Padrões de Código e Arquitetura

### Persistência (SQLite)
- Conexão via `getDatabase()` em `src/infrastructure/db/sqlite.ts` (Singleton com validação de conexão stale).
- Repositórios em `src/infrastructure/repositories/`.
- Valores monetários em **centavos** (`amount_cents INTEGER`).

### Estilização
- Tokens via `useTheme()` de `@/theme`. **NUNCA usar TailwindCSS.**
- Estilos via `StyleSheet.create`. Componentes próprios em `src/components/ui/`.

### UX de Teclado (Padrão para Modais)
- `KeyboardAvoidingView` + `ScrollView` com `ref`.
- `onFocus` dos inputs chama `setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150)`.
- `paddingBottom: 40` no ScrollView.

### Overlay de Carregamento
- `ActivityIndicator` com overlay semi-transparente. Usar `setIsLoading(true/false)` em `entries.tsx`.
- Para operações locais (toggles, filtros), usar `setTimeout(..., 50)` para renderizar o spinner antes da lógica.

### Espaçamento em Ajustes (⚠️ Quirk do Expo Router)
- O `Link asChild` do Expo Router **não repassa** `marginBottom` do `TouchableOpacity` filho.
- Solução adotada: envolver cada `Link` em `<View style={styles.menuWrapper}>` com `marginBottom: 16`.
- **ATENÇÃO:** na sessão atual o espaçamento entre menus pode não ter refletido no hot-reload. Verificar em restart frio do app.

---

## 3. Funcionalidades Prontas

1. **Início (`dashboard.tsx`)** — Aba renomeada de "Resumo" para "Início" (ícone `home`). Header: "Olá, Nome." + "Resultado do dia — quarta, 22 de abril" (itálico, discreto).
2. **Lançamentos (`entries.tsx`)** — Histórico com agrupamento inteligente (flat/days/months), filtros por período e tipo, overlay de loading.
3. **Relatórios (`reports.tsx`)** — Filtros Hoje/Semana/Mês, evolução diária com ScrollView (maxHeight: 380), metas, receitas por fonte, despesas por categoria.
4. **Ajustes (`settings.tsx`)** — Seções: Perfil (Meus Dados), Gerenciar (Categorias, Fontes, Metas), Desenvolvedor (seed). Ícone de Metas unificado como `flag-outline` em todas as telas.
5. **Modais** — add-income, add-expense, manage-profile, manage-sources, manage-categories, manage-goals. Todos com títulos corretamente mapeados em `_layout.tsx`.

---

## 4. Roadmap — Próximas Implementações (Priorizado)

### 🔴 Crítico (Fazer Antes de Publicar)
- [ ] **Remover seção "DESENVOLVEDOR"** de `settings.tsx` (ou proteger com `__DEV__`). O botão "Gerar Dados de Teste" polui dados reais.
- [ ] **Limpar dependências mortas** do `package.json`: `react-hook-form`, `@hookform/resolvers`, `zod`, `react-native-draggable-flatlist`, `expo-image` — nenhuma é importada.

### ⭐ Alto Impacto Comercial
- [ ] **Exportação PDF/CSV** em Relatórios — motoristas precisam comprovar renda para banco/INSS. Usar `expo-print` (PDF) ou `expo-file-system` + `expo-sharing` (CSV). Filtrar pelo período selecionado.
- [ ] **Despesas Recorrentes** — o schema já tem `is_recurring` e `expense_kind` (fixed/variable), mas nenhuma tela usa. Criar "Ajustes > Despesas Fixas" com lançamento automático mensal.
- [ ] **Backup e Restauração** — exportar `motofinance.db` para Google Drive ou armazenamento local via `expo-file-system` + `expo-sharing`. Opção "Restaurar" para importar de volta.

### ⭐ Impacto Médio-Alto
- [ ] **Média diária + projeção** no Dashboard: "Média diária: R$ 187,50 (12 dias) · Projeção abril: R$ 4.312,50". Dados já existem no `getReportData`.
- [ ] **Lembrete diário (push)** — `expo-notifications` às 20h: "Já registrou seus ganhos de hoje? 🏍️". Aumenta retenção.

### ⭐ Quick Wins (< 1h cada)
- [ ] **Toast/snackbar** ao salvar lançamento: "✓ Receita de R$ 45,00 registrada" (2s, verde).
- [ ] **Haptic feedback** — `expo-haptics` já instalado. Vibração sutil em: salvar, excluir, atingir meta, long-press.
- [ ] **Badge na tab Início** — ponto vermelho se não houve lançamentos hoje até 11h.

### 🏗️ Técnico (Qualidade de Código)
- [ ] **Migrations reais** — substituir `try/catch ALTER TABLE` por `PRAGMA user_version` com funções sequenciais.
- [ ] **Refatorar `reports.tsx`** (883 linhas) — extrair hooks (`useReportData`, `useGoalProgress`) e componentes (`GoalProgressCard`, `DailyEvolutionList`).
- [ ] **Testes unitários** — pasta `tests/` existe mas está vazia. Começar por: `formatBRL`, `dateKey`, repositórios.
- [ ] **Multi-moeda** — schema tem `currency_code` mas `formatBRL()` é hardcoded. Parametrizar para expansão internacional.

---

## 5. Estrutura de Arquivos (Referência Rápida)

```
app/
  _layout.tsx          ← Root layout (Stack + modais mapeados)
  index.tsx            ← Entry point (redireciona conforme onboarding)
  (tabs)/
    _layout.tsx        ← Tab bar (Início, Lançamentos, Relatórios, Ajustes)
    dashboard.tsx      ← Tela inicial
    entries.tsx         ← Histórico de transações (717 linhas)
    reports.tsx         ← Relatórios e análises (883 linhas)
    settings.tsx        ← Configurações
  (modals)/
    add-income.tsx      ← Modal de receita
    add-expense.tsx     ← Modal de despesa
    manage-profile.tsx  ← Edição de dados do usuário
    manage-sources.tsx  ← Fontes de receita
    manage-categories.tsx ← Categorias de despesa
    manage-goals.tsx    ← Metas mensais
  onboarding/
    welcome.tsx         ← Tela de boas-vindas
    profile.tsx         ← Cadastro inicial

src/
  infrastructure/
    db/sqlite.ts        ← Singleton SQLite + schema + migrations
    db/seed.ts          ← Dados padrão (Uber, 99, iFood, etc.)
    db/seedTestData.ts  ← Gerador de dados fake (12 meses)
    repositories/       ← TransactionsRepository, GoalsRepository, etc.
  stores/app-store.ts   ← Zustand (onboarding, perfil, loading)
  theme/index.ts        ← useTheme() hook
  constants/colors.ts   ← Paleta light/dark
  lib/dates.ts          ← Utilitários de data (startOfDay, dateKey, etc.)
  lib/formatters/       ← formatBRL
  types/transaction.ts  ← UnifiedTransaction, TransactionSection
  components/ui/        ← AppButton, AppCard, AppInput, SortableChipGrid
```
