# 🏍️ MotoFinance Mobile — Checkpoint Completo
**Data:** 22 de Abril de 2026 (atualizado 22/04/2026 às 17h27)

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

### expo-file-system (⚠️ Quirk da Versão)
- O pacote `expo-file-system` instalado é a v55 (`^55.0.17`), que **lança erro** ao chamar a API legada diretamente.
- **Solução adotada:** importar de `'expo-file-system/legacy'` (drop-in replacement oficial).
- Referência: `src/lib/exportReport.ts` linha 3.

---

## 3. Funcionalidades Prontas

1. **Início (`dashboard.tsx`)** — Aba renomeada de "Resumo" para "Início" (ícone `home`). Header: "Olá, Nome." + "Resultado do dia — quarta, 22 de abril" (itálico, discreto).
2. **Lançamentos (`entries.tsx`)** — Histórico com agrupamento inteligente (flat/days/months), filtros por período e tipo, overlay de loading.
3. **Relatórios (`reports.tsx`)** — Filtros Hoje/Semana/Mês + intervalo customizado, evolução diária, metas mensais/semanais, receitas por fonte, despesas por categoria, projeção de fim de período. **Botão "Exportar" no header** (ver seção 6).
4. **Ajustes (`settings.tsx`)** — Seções: Perfil (Meus Dados), Gerenciar (Categorias, Fontes, Metas), Desenvolvedor (seed, protegido com `{__DEV__ && ...}`).
5. **Modais** — add-income, add-expense, manage-profile, manage-sources, manage-categories, manage-goals. Todos com títulos corretamente mapeados em `_layout.tsx`.

---

## 4. Funcionalidade de Exportação — Estado Atual (⚠️ Em Progresso)

### Arquitetura implementada

**`src/lib/exportReport.ts`** — Utilitário puro com 5 funções exportadas:

| Função | O que faz |
|---|---|
| `generateCSV(data)` | Monta string CSV com seções: Resumo, Receitas por Fonte, Despesas por Categoria, Evolução Diária. Separador `;` (compatível com Excel BR). |
| `shareCSV(data)` | Escreve o CSV em cache via `expo-file-system/legacy` e abre o share sheet nativo via `expo-sharing`. |
| `printCSV(data)` | Gera o HTML do relatório e abre preview nativo via `Print.printAsync()` (mesmo conteúdo visual que o PDF). |
| `generatePDFHtml(data)` | Gera HTML completo e estilizado: cabeçalho com logo + nome do motorista, summary cards, tabelas de fonte/categoria, evolução diária. Paleta verde `#10B981` / vermelho `#F43F5E`. |
| `sharePDF(data)` | Gera arquivo PDF com `Print.printToFileAsync()` e abre share sheet via `expo-sharing`. |
| `printPDF(data)` | Abre preview/impressão nativo via `Print.printAsync()` (iOS: sheet completo; Android: diálogo de impressão). |

**Tipo `ExportData`:**
```ts
{
  periodLabel: string;      // ex: "01/04/2026 a 22/04/2026"
  generatedAt: string;      // ex: "22/04/2026"
  userName?: string;        // vem do Zustand (useAppStore)
  totalIncomeCents: number;
  totalExpenseCents: number;
  netCents: number;
  incomeCount: number;
  expenseCount: number;
  bySource: Array<{ name: string; totalCents: number }>;
  byCategory: Array<{ name: string; totalCents: number }>;
  dailyData: Array<{ dateKey: string; incomeCents: number; expenseCents: number }>;
}
```

**`app/(tabs)/reports.tsx`** — Integração:
- Botão `share-outline` "Exportar" no header (linha ~270), desabilitado enquanto `!report || isExporting`.
- `showExportModal: boolean` controla um `<Modal>` customizado (não Alert).
- `doExport(format)` aceita `'csv-print' | 'csv-share' | 'pdf-print' | 'pdf-share'`.
- `buildExportData()` monta o `ExportData` a partir dos estados já carregados na tela.

### Modal de exportação

Modal customizado com `animationType="fade"`, posicionado ~190px abaixo do topo (logo após os campos de data). Layout:
```
╔══════════════════════════════════╗
║ Exportar Relatório               ║
║ 01/04/2026 – 22/04/2026          ║
║ ────────────────────────────     ║
║ 📄 PDF               documento   ║
║ ────────────────────────────     ║
║     🖨  Visualizar / Imprimir     ║
║     ↗  Compartilhar              ║
║ ──── (divisor) ────              ║
║ 📊 CSV               planilha    ║
║ ────────────────────────────     ║
║     🖨  Visualizar / Imprimir     ║
║     ↗  Compartilhar              ║
║ ────────────────────────────     ║
║            Cancelar              ║
╚══════════════════════════════════╝
```
- Ícone 📄 vermelho (`#E74C3C`) para PDF, 📊 verde (`#1D6F42`) para CSV.
- Toque fora do card fecha o modal.
- Sub-opções com `setTimeout(..., 300)` para fechar o modal antes de disparar a exportação.

### ⚠️ Problemas em aberto (deixar para próxima sessão)

- **Funcionalidades de exportação não estão 100%.** Foram identificados comportamentos inesperados durante testes no dispositivo. Não foram documentados em detalhes — requer nova rodada de testes para mapear os erros específicos antes de corrigir.
- Possíveis pontos de atenção:
  - `shareCSV` / `sharePDF` podem não estar abrindo o app correto no Android dependendo da versão.
  - `printCSV` e `printPDF` usam o mesmo HTML (comportamento intencional para "Visualizar").
  - O `paddingTop: 190` do modal pode precisar de ajuste fino por dispositivo/safe area.

---

## 5. Roadmap — Próximas Implementações (Priorizado)

### 🔴 Crítico (Fazer Antes de Publicar)
- [x] **Remover seção "DESENVOLVEDOR"** de `settings.tsx` — protegida com `{__DEV__ && ...}`. ✅
- [x] **Limpar dependências mortas** do `package.json` — `react-hook-form`, `zod`, `expo-image`, etc. foram removidas. ✅

### ⭐ Alto Impacto Comercial
- [ ] **Exportação PDF/CSV** em Relatórios — 🚧 **EM PROGRESSO** (22/04/2026). Estrutura completa implementada (utilitário + modal customizado). Funcionalidade não está 100% — retomar na próxima sessão com testes no dispositivo para mapear o problema exato. Ver seção 4.
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
- [ ] **Refatorar `reports.tsx`** (~1145 linhas) — extrair hooks (`useReportData`, `useGoalProgress`) e componentes (`GoalProgressCard`, `DailyEvolutionList`, `ExportModal`).
- [ ] **Testes unitários** — pasta `tests/` existe mas está vazia. Começar por: `formatBRL`, `dateKey`, repositórios.
- [ ] **Multi-moeda** — schema tem `currency_code` mas `formatBRL()` é hardcoded. Parametrizar para expansão internacional.

---

## 6. Estrutura de Arquivos (Referência Rápida)

```
app/
  _layout.tsx          ← Root layout (Stack + modais mapeados)
  index.tsx            ← Entry point (redireciona conforme onboarding)
  (tabs)/
    _layout.tsx        ← Tab bar (Início, Lançamentos, Relatórios, Ajustes)
    dashboard.tsx      ← Tela inicial
    entries.tsx        ← Histórico de transações
    reports.tsx        ← Relatórios e análises (~1145 linhas)
    settings.tsx       ← Configurações
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
  lib/exportReport.ts   ← ⭐ NOVO — Utilitário de exportação PDF/CSV
  types/transaction.ts  ← UnifiedTransaction, TransactionSection
  components/ui/        ← AppButton, AppCard, AppInput, SortableChipGrid
```
