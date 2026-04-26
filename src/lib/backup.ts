import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { resetDatabase, initDatabase } from '@/infrastructure/db/sqlite';

const DB_NAME     = 'motofinance.db';
const EXPORT_NAME = 'motofinance-backup.db';
const SAFETY_NAME = 'motofinance-safety.db';

function dbPath(): string {
  if (!FileSystem.documentDirectory) throw new Error('Sistema de arquivos indisponível.');
  return `${FileSystem.documentDirectory}SQLite/${DB_NAME}`;
}

function exportPath(): string {
  if (!FileSystem.cacheDirectory) throw new Error('Cache indisponível.');
  return `${FileSystem.cacheDirectory}${EXPORT_NAME}`;
}

function safetyPath(): string {
  if (!FileSystem.cacheDirectory) throw new Error('Cache indisponível.');
  return `${FileSystem.cacheDirectory}${SAFETY_NAME}`;
}

/**
 * Copia o banco de dados para o cache e abre o seletor de compartilhamento nativo.
 * O usuário escolhe o destino (Google Drive, WhatsApp, e-mail, etc.).
 */
export async function exportBackup(): Promise<void> {
  const src = dbPath();

  const info = await FileSystem.getInfoAsync(src);
  if (!info.exists) throw new Error('Banco de dados não encontrado no dispositivo.');

  const dst = exportPath();
  await FileSystem.copyAsync({ from: src, to: dst });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Compartilhamento não está disponível neste dispositivo.');

  await Sharing.shareAsync(dst, {
    mimeType: 'application/octet-stream',
    dialogTitle: 'Salvar backup do MotoFinance',
  });
}

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

  const file = result.assets[0];

  if (!file.name.toLowerCase().endsWith('.db')) {
    throw new Error(
      'Arquivo inválido. Selecione um arquivo .db gerado pelo MotoFinance.'
    );
  }

  const src     = file.uri;
  const dst     = dbPath();
  const safety  = safetyPath();

  // Cria backup de segurança do banco atual antes de qualquer operação destrutiva
  const currentInfo = await FileSystem.getInfoAsync(dst);
  if (currentInfo.exists) {
    await FileSystem.copyAsync({ from: dst, to: safety });
  }

  try {
    await resetDatabase();
    await FileSystem.copyAsync({ from: src, to: dst });

    // Verifica se o arquivo é um banco SQLite válido reabrindo a conexão
    await initDatabase();

    return 'success';
  } catch {
    // Arquivo corrompido ou inválido — restaura banco anterior
    try {
      await resetDatabase();
      if (currentInfo.exists) {
        await FileSystem.copyAsync({ from: safety, to: dst });
      }
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
      await FileSystem.deleteAsync(safety, { idempotent: true });
    } catch { /* ignora */ }
  }
}
