import { Platform } from 'react-native';
import { GoalsRepository } from '@/infrastructure/repositories/GoalsRepository';
import { TransactionsRepository } from '@/infrastructure/repositories/TransactionsRepository';
import { getFirstOfMonth } from '@/lib/dates';

// ─── Import lazy ─────────────────────────────────────────────────────────────
//
// expo-notifications possui um side-effect de nível de módulo
// (DevicePushTokenAutoRegistration) que lança exceção no Expo Go (SDK 53+).
// Para não quebrar a cadeia de importações no startup, o import é feito de
// forma dinâmica (lazy), dentro de cada função que precisa do pacote.
// Em builds de produção/desenvolvimento o comportamento é idêntico.

type ExpoNotifications = typeof import('expo-notifications');

let _N: ExpoNotifications | null = null;
let _handlerSet = false;

async function getNotifications(): Promise<ExpoNotifications | null> {
  if (_N) return _N;
  try {
    const mod = await import('expo-notifications');

    // Em Expo Go (SDK 53+) o módulo carrega parcialmente: o side-effect de
    // push token falha mas não lança — algumas APIs ficam undefined.
    // Verifica se a API de agendamento local está disponível.
    if (typeof (mod as any).scheduleNotificationAsync !== 'function') {
      console.warn('[notifications] expo-notifications sem suporte a notificações locais');
      return null;
    }

    if (!_handlerSet) {
      _handlerSet = true;
      // setNotificationHandler pode estar ausente em Expo Go
      if (typeof (mod as any).setNotificationHandler === 'function') {
        mod.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
      }
    }

    _N = mod;
    return _N;
  } catch (err) {
    console.warn('[notifications] expo-notifications indisponível:', err);
    return null;
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────

const REMINDER_IDENTIFIER = 'motofinance-daily-reminder';

/** Solicita permissão ao usuário. Retorna true se concedida. */
export async function requestNotificationPermissions(): Promise<boolean> {
  const N = await getNotifications();
  if (!N) return false;

  if (Platform.OS === 'android') {
    await N.setNotificationChannelAsync('default', {
      name: 'MotoFinance',
      importance: N.AndroidImportance.DEFAULT,
    });
  }

  const { status: existing } = await N.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await N.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Agenda (ou reagenda) o lembrete diário para o horário especificado.
 * @param time — string no formato 'HH:MM'
 */
export async function scheduleReminder(time: string): Promise<void> {
  await cancelReminder();

  const [hour, minute] = time.split(':').map(Number);
  if (isNaN(hour) || isNaN(minute)) return;

  const N = await getNotifications();
  if (!N) return;

  await N.scheduleNotificationAsync({
    identifier: REMINDER_IDENTIFIER,
    content: {
      title: 'MotoFinance 💰',
      body: 'Não esqueça de registrar seus lançamentos de hoje!',
    },
    trigger: {
      type: N.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

/** Remove o lembrete diário agendado, se existir. */
export async function cancelReminder(): Promise<void> {
  try {
    const N = await getNotifications();
    if (!N) return;
    await N.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER);
  } catch {
    // Ignora se não existia agendamento
  }
}

/**
 * Verifica se alguma meta mensal foi cruzada após adicionar uma receita.
 * Compara os totais antes e depois — notifica apenas se acabou de cruzar o limite.
 *
 * @param prevIncomeCents — total de receita antes do novo lançamento
 * @param prevNetCents    — lucro líquido antes do novo lançamento
 */
export async function checkGoalCrossed(
  prevIncomeCents: number,
  prevNetCents: number,
): Promise<void> {
  try {
    const goals = await GoalsRepository.getMonthlyGoals();
    if (!goals.income && !goals.net) return;

    const start = getFirstOfMonth();
    const end   = new Date();
    const report = await TransactionsRepository.getReportData(start, end);

    const notifyIncome =
      goals.income !== null &&
      prevIncomeCents < goals.income &&
      report.totalIncomeCents >= goals.income;

    const notifyNet =
      goals.net !== null &&
      prevNetCents < goals.net &&
      report.netCents >= goals.net;

    if (!notifyIncome && !notifyNet) return;

    const N = await getNotifications();
    if (!N) return;

    if (notifyIncome && notifyNet) {
      await N.scheduleNotificationAsync({
        content: {
          title: 'Metas atingidas! 🏆',
          body: 'Você bateu a meta de receita e de lucro líquido este mês!',
        },
        trigger: null,
      });
    } else if (notifyIncome) {
      await N.scheduleNotificationAsync({
        content: {
          title: 'Meta de receita atingida! 🎯',
          body: 'Você atingiu sua meta de receita mensal. Bora mais!',
        },
        trigger: null,
      });
    } else {
      await N.scheduleNotificationAsync({
        content: {
          title: 'Meta de lucro atingida! 🚀',
          body: 'Você atingiu sua meta de lucro líquido mensal. Excelente!',
        },
        trigger: null,
      });
    }
  } catch (err) {
    console.error('Erro ao verificar metas para notificação:', err);
  }
}
