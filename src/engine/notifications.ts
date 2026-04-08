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
