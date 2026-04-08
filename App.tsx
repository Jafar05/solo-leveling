import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
import { setupNotificationHandler, requestNotificationPermissions, scheduleDailyNotifications } from './src/engine/notifications';
import { JournalBlockerModal } from './src/components/JournalBlockerModal';
import { useJournalStore } from './src/store/useJournalStore';

setupNotificationHandler();

export default function App() {
  const { ensureTodayQuestion } = useJournalStore();

  useEffect(() => {
    ensureTodayQuestion();
    (async () => {
      const granted = await requestNotificationPermissions();
      if (granted) {
        await scheduleDailyNotifications();
      }
    })();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <AppNavigator />
      <JournalBlockerModal />
    </>
  );
}
