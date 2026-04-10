// eslint-disable-next-line @typescript-eslint/no-var-requires
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch {
  // expo-notifications not installed — notifications disabled
}

import { Platform } from 'react-native';

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Notifications || Platform.OS === 'web') return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleDailyNotifications(): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    // 7:00 — Утреннее задание
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚡ Утренний брифинг, Охотник',
        body: 'Новый день — новые квесты. Проверь задания и начни прокачку!',
        sound: true,
      },
      trigger: { type: 'daily', hour: 7, minute: 0 },
    });

    // 21:00 — Предупреждение о стрике
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔥 Стрик под угрозой',
        body: 'Ты ещё не залогировал активность сегодня. Не дай стрику сгореть!',
        sound: true,
      },
      trigger: { type: 'daily', hour: 21, minute: 0 },
    });

    // 20:00 — Вопрос дневника
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📔 Время дневника',
        body: 'Пора подвести итоги дня. Ответь на вопрос — это займёт 2 минуты.',
        sound: true,
      },
      trigger: { type: 'daily', hour: 20, minute: 0 },
    });

    // 19:00 — Напоминание прочитать экспертный совет
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧠 Экспертный совет ждёт',
        body: 'У тебя есть персональная рекомендация от AI. Прочитай её и примени сегодня!',
        sound: true,
      },
      trigger: { type: 'daily', hour: 19, minute: 0 },
    });

    // 20:30 — Повторное напоминание о совете
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚡ Не забудь прочитать совет',
        body: 'Твой персональный совет от AI может изменить подход к делу. Открой и прочитай!',
        sound: true,
      },
      trigger: { type: 'daily', hour: 20, minute: 30 },
    });

    // 22:00 — Дедлайн квестов
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📋 Осталось 2 часа',
        body: 'Ежедневные квесты истекают в полночь. Успей выполнить хотя бы один!',
        sound: true,
      },
      trigger: { type: 'daily', hour: 22, minute: 0 },
    });
  } catch (e) {
    console.warn('Notifications scheduling failed:', e);
  }
}

export function setupNotificationHandler(): void {
  if (!Notifications) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // ignore
  }
}

/**
 * Планирует напоминание о незавершённом квесте.
 * Ежедневные: через 30 мин и 1 час.
 * Сюжетные / Боссы: через 2 часа.
 * Возвращает массив идентификаторов уведомлений (для отмены при завершении).
 */
export async function scheduleQuestReminders(
  questId: string,
  questTitle: string,
  isDaily: boolean
): Promise<string[]> {
  if (!Notifications || Platform.OS === 'web') return [];
  try {
    const ids: string[] = [];

    if (isDaily) {
      const id1 = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏳ Квест ещё не выполнен',
          body: `"${questTitle}" — прошло 30 минут. Не забудь завершить!`,
          sound: true,
        },
        trigger: { type: 'timeInterval', seconds: 30 * 60, repeats: false },
      });
      const id2 = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔥 Квест ждёт тебя',
          body: `"${questTitle}" — уже час. Завершай задание!`,
          sound: true,
        },
        trigger: { type: 'timeInterval', seconds: 60 * 60, repeats: false },
      });
      ids.push(id1, id2);
    } else {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚔️ Квест в процессе',
          body: `"${questTitle}" — прошло 2 часа. Ты ещё в бою!`,
          sound: true,
        },
        trigger: { type: 'timeInterval', seconds: 2 * 60 * 60, repeats: false },
      });
      ids.push(id);
    }

    return ids;
  } catch (e) {
    console.warn('Quest reminder scheduling failed:', e);
    return [];
  }
}

/** Отменяет уведомления-напоминания по их идентификаторам. */
export async function cancelQuestReminders(notificationIds: string[]): Promise<void> {
  if (!Notifications || notificationIds.length === 0) return;
  try {
    await Promise.all(notificationIds.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  } catch {
    // ignore
  }
}
