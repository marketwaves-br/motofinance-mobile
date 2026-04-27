import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { resetDatabase, initDatabase } from '@/infrastructure/db/sqlite';

const DB_NAME     = 'motofinance.db';
const EXPORT_NAME = 'motofinance-backup.db';
const SAFETY_NAME = 'motofinance-safety.db';

// ─── Helpers de caminho ───────────────────────────────────────────────────────

/** Arquivo do banco SQLite dentro do diretório de documentos do app. */
function dbFile(): File {
  return new File(Paths.document, 'SQLite', DB_NAME);
}

/** Arquivo temporário de exportação no cache. */
function exportFile(): File {
  return new File(Paths.cache, EXPORT_NAME);
}

/** Arquivo de segurança para rollback durante importação. */
function safetyFile(): File {
  return new File(Paths.cache, SAFETY_NAME);
}

// ─── Exportar ─────────────────────────────────────────────────────────────────

/**
 * Copia o banco de dados para o cache e abre o seletor de compartilhamento nativo.
 * O usuário escolhe o destino (Gmail, Google Drive, WhatsApp, etc.).
 */
export async function exportBackup(): Promise<void> {
  const src = dbFile();

  if (!src.exists) {
    throw new Error('Banco de dados não encontrado no dispositivo.');
  }

  // Remove exportação anterior se existir, depois copia
  const dst = exportFile();
  if (dst.exists) dst.delete();
  src.copy(dst);

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Compartilhamento não disponível neste dispositivo.');

  await Sharing.shareAsync(dst.uri, {
    mimeType: 'application/octet-stream',
    dialogTitle: 'Salvar backup do MotoFinance',
  });
}

// ─── Importar ─────────────────────────────────────────────────────────────────

/**
 * Abre o seletor de arquivos, valida o .db selecionado e substitui o banco local.
 * Em caso de erro, restaura automaticamente o banco anterior.
 *
 * @returns 'cancelled' se o usuário fechou o seletor sem escolher nada.
 * @throws {Error} com mensagem amigável em caso de arquivo inválido ou falha.
 */
export async function importBackup(): Promise<'cancelled' | 'success'> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['*/*'],          // alguns dispositivos não reconhecem MIME de .db
    copyToCacheDirectory: true,
  });

  if (result.canceled) return 'cancelled';

  const picked = result.assets[0];

  if (!picked.name.toLowerCase().endsWith('.db')) {
    throw new Error(
      'Arquivo inválido. Selecione um arquivo .db gerado pelo MotoFinance.'
    );
  }

  const src    = new File(picked.uri);
  const dst    = dbFile();
  const safety = safetyFile();

  // Cria backup de segurança do banco atual antes de qualquer operação destrutiva
  if (dst.exists) {
    if (safety.exists) safety.delete();
    dst.copy(safety);
  }

  try {
    await resetDatabase();
    if (dst.exists) dst.delete();
    src.copy(dst);

    // Verifica se o arquivo é um banco SQLite válido reabrindo a conexão
    await initDatabase();

    return 'success';
  } catch {
    // Arquivo corrompido ou inválido — restaura banco anterior
    try {
      await resetDatabase();
      if (dst.exists) dst.delete();
      if (safety.exists) safety.copy(dst);
      await initDatabase();
    } catch {
      // Falha silenciosa no rollback — app precisará ser reiniciado
    }

    throw new Error(
      'O arquivo selecionado é inválido ou está corrompido. Seus dados originais foram preservados.'
    );
  } finally {
    // Remove backup de segurança independente do resultado
    try {
      if (safety.exists) safety.delete();
    } catch { /* ignora */ }
  }
}
