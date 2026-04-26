import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { GoalsRepository } from '@/infrastructure/repositories/GoalsRepository';
import { TransactionsRepository } from '@/infrastructure/repositories/TransactionsRepository';
import { getFirstOfMonth } from '@/lib/dates';

// Exibe notificação mesmo com app em foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const REMINDER_IDENTIFIER = 'motofinance-daily-reminder';

/** Solicita permissão ao usuário. Retorna true se concedida. */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'MotoFinance',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
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

  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_IDENTIFIER,
    content: {
      title: 'MotoFinance 💰',
      body: 'Não esqueça de registrar seus lançamentos de hoje!',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

/** Remove o lembrete diário agendado, se existir. */
export async function cancelReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER);
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

    if (notifyIncome && notifyNet) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Metas atingidas! 🏆',
          body: 'Você bateu a meta de receita e de lucro líquido este mês!',
        },
        trigger: null,
      });
    } else if (notifyIncome) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Meta de receita atingida! 🎯',
          body: 'Você atingiu sua meta de receita mensal. Bora mais!',
        },
        trigger: null,
      });
    } else if (notifyNet) {
      await Notifications.scheduleNotificationAsync({
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
