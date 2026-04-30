import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExportData = {
  periodLabel: string;
  generatedAt: string;
  userName?: string;
  totalIncomeCents: number;
  totalExpenseCents: number;
  netCents: number;
  incomeCount: number;
  expenseCount: number;
  bySource: Array<{ name: string; totalCents: number }>;
  byCategory: Array<{ name: string; totalCents: number }>;
  dailyData: Array<{ dateKey: string; incomeCents: number; expenseCents: number }>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (cents: number): string => {
  const abs = Math.abs(cents);
  const reais = (abs / 100).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${reais}`;
};

const fmtDate = (isoDate: string): string => {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
};

// ─── CSV ──────────────────────────────────────────────────────────────────────

export const generateCSV = (data: ExportData): string => {
  const lines: string[] = [];

  lines.push('MotoFinance - Relatório Financeiro');
  lines.push(`Período;${data.periodLabel}`);
  lines.push(`Gerado em;${data.generatedAt}`);
  lines.push('');

  lines.push('RESUMO');
  lines.push(`Total de Receitas;${fmt(data.totalIncomeCents)}`);
  lines.push(`Total de Despesas;${fmt(data.totalExpenseCents)}`);
  lines.push(`Lucro Líquido;${fmt(data.netCents)}`);
  lines.push(`Lançamentos (receitas);${data.incomeCount}`);
  lines.push(`Lançamentos (despesas);${data.expenseCount}`);
  lines.push('');

  if (data.bySource.length > 0) {
    lines.push('RECEITAS POR FONTE');
    lines.push('Fonte;Valor');
    data.bySource.forEach(s => lines.push(`${s.name};${fmt(s.totalCents)}`));
    lines.push('');
  }

  if (data.byCategory.length > 0) {
    lines.push('DESPESAS POR CATEGORIA');
    lines.push('Categoria;Valor');
    data.byCategory.forEach(c => lines.push(`${c.name};${fmt(c.totalCents)}`));
    lines.push('');
  }

  if (data.dailyData.length > 0) {
    lines.push('EVOLUÇÃO DIÁRIA');
    lines.push('Data;Receitas;Despesas;Resultado');
    data.dailyData.forEach(d => {
      const net = d.incomeCents - d.expenseCents;
      lines.push(`${fmtDate(d.dateKey)};${fmt(d.incomeCents)};${fmt(d.expenseCents)};${fmt(net)}`);
    });
  }

  return lines.join('\n');
};

export const shareCSV = async (data: ExportData): Promise<void> => {
  // BOM UTF-8 (\uFEFF) garante compatibilidade com Excel BR ao abrir direto
  const csv = '\uFEFF' + generateCSV(data);
  const filename = `motofinance_${data.generatedAt.replace(/\//g, '-')}.csv`;
  const csvFile = new File(Paths.cache, filename);
  if (csvFile.exists) csvFile.delete();
  csvFile.write(csv);
  await Sharing.shareAsync(csvFile.uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Compartilhar relatório CSV',
    UTI: 'public.comma-separated-values-text',
  });
};

// ─── PDF ──────────────────────────────────────────────────────────────────────

export const generatePDFHtml = (data: ExportData): string => {
  const pct = (part: number, total: number) =>
    total > 0 ? Math.round((part / total) * 100) : 0;

  const sourceRows = data.bySource
    .map(s => `
      <tr>
        <td>${s.name}</td>
        <td class="amount">${fmt(s.totalCents)}</td>
        <td class="pct">${pct(s.totalCents, data.totalIncomeCents)}%</td>
      </tr>`)
    .join('');

  const categoryRows = data.byCategory
    .map(c => `
      <tr>
        <td>${c.name}</td>
        <td class="amount">${fmt(c.totalCents)}</td>
        <td class="pct">${pct(c.totalCents, data.totalExpenseCents)}%</td>
      </tr>`)
    .join('');

  const dailyRows = data.dailyData
    .map(d => {
      const net = d.incomeCents - d.expenseCents;
      const netClass = net >= 0 ? 'positive' : 'negative';
      return `
        <tr>
          <td>${fmtDate(d.dateKey)}</td>
          <td class="amount positive">${fmt(d.incomeCents)}</td>
          <td class="amount negative">${fmt(d.expenseCents)}</td>
          <td class="amount ${netClass}">${fmt(net)}</td>
        </tr>`;
    })
    .join('');

  const netClass = data.netCents >= 0 ? 'positive' : 'negative';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MotoFinance - Relatório</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; background: #fff; padding: 32px; font-size: 13px; }

    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #1677FF; }
    .logo { font-size: 22px; font-weight: 800; color: #0D183D; letter-spacing: -0.5px; }
    .logo span { color: #1677FF; }
    .meta { text-align: right; color: #6B7280; font-size: 11px; line-height: 1.6; }

    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
    .summary-card { padding: 16px; border-radius: 10px; background: #f8fafc; border: 1px solid #E5E7EB; text-align: center; }
    .summary-card .label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #6B7280; margin-bottom: 6px; }
    .summary-card .value { font-size: 20px; font-weight: 800; }
    .positive { color: #1677FF; }
    .negative { color: #F43F5E; }
    .neutral  { color: #1677FF; }

    h2 { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin: 20px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; padding: 6px 8px; text-align: left; background: #f8fafc; }
    td { padding: 8px; border-bottom: 1px solid #f1f5f9; }
    td.amount { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; }
    td.pct { text-align: right; color: #64748b; font-size: 11px; }

    .footer { margin-top: 32px; text-align: center; color: #94a3b8; font-size: 10px; }
  </style>
</head>
<body>

  <div class="header">
    <div>
      <div class="logo">moto<span>finance</span></div>
      <div style="color:#6B7280;font-size:11px;margin-top:4px;">Suas finanças na direção certa</div>
      ${data.userName ? `<div style="color:#1e293b;font-size:12px;margin-top:6px;font-weight:600;">Motorista: ${data.userName}</div>` : ''}
    </div>
    <div class="meta">
      <div><strong>Período:</strong> ${data.periodLabel}</div>
      <div><strong>Gerado em:</strong> ${data.generatedAt}</div>
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="label">Receitas</div>
      <div class="value positive">${fmt(data.totalIncomeCents)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Despesas</div>
      <div class="value negative">${fmt(data.totalExpenseCents)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Lucro Líquido</div>
      <div class="value ${netClass}">${fmt(data.netCents)}</div>
    </div>
  </div>

  ${data.bySource.length > 0 ? `
  <h2>Receitas por Fonte</h2>
  <table>
    <thead><tr><th>Fonte</th><th style="text-align:right">Valor</th><th style="text-align:right">%</th></tr></thead>
    <tbody>${sourceRows}</tbody>
  </table>` : ''}

  ${data.byCategory.length > 0 ? `
  <h2>Despesas por Categoria</h2>
  <table>
    <thead><tr><th>Categoria</th><th style="text-align:right">Valor</th><th style="text-align:right">%</th></tr></thead>
    <tbody>${categoryRows}</tbody>
  </table>` : ''}

  ${data.dailyData.length > 0 ? `
  <h2>Evolução Diária</h2>
  <table>
    <thead><tr><th>Data</th><th style="text-align:right">Receitas</th><th style="text-align:right">Despesas</th><th style="text-align:right">Resultado</th></tr></thead>
    <tbody>${dailyRows}</tbody>
  </table>` : ''}

  <div class="footer">motofinance · Relatório gerado em ${data.generatedAt}</div>

</body>
</html>`;
};

/** Compartilha o PDF como arquivo (share sheet nativo) */
export const sharePDF = async (data: ExportData): Promise<void> => {
  const html = generatePDFHtml(data);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Compartilhar relatório PDF',
    UTI: 'com.adobe.pdf',
  });
};

/**
 * Abre o preview nativo de impressão/PDF.
 * iOS → sheet com preview completo + Salvar em Arquivos / Compartilhar / Imprimir.
 * Android → diálogo de impressão nativo (também permite salvar como PDF).
 */
export const printPDF = async (data: ExportData): Promise<void> => {
  const html = generatePDFHtml(data);
  await Print.printAsync({ html });
};

/**
 * Abre o preview/impressão do CSV como documento HTML formatado.
 * Mesma experiência que printPDF: preview nativo com opção de imprimir/salvar/compartilhar.
 */
export const printCSV = async (data: ExportData): Promise<void> => {
  const html = generatePDFHtml(data);
  await Print.printAsync({ html });
};
