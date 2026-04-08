import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import { HeroScreen } from '../screens/HeroScreen';
import { QuestsScreen } from '../screens/QuestsScreen';
import { LogScreen } from '../screens/LogScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { COLORS, FONTS, SPACING } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
      <Text style={styles.tabEmoji}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Hero"
        component={HeroScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👤" label="Герой" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Quests"
        component={QuestsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📋" label="Квесты" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Log"
        component={LogScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.centerButton}>
              <Text style={styles.centerButtonText}>＋</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📊" label="Стат" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏆" label="Профиль" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: COLORS.accent,
          background: COLORS.bg,
          card: COLORS.card,
          text: COLORS.text,
          border: COLORS.cardBorder,
          notification: COLORS.danger,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '900' },
        },
      }}
    >
      <TabNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    height: 80,
    paddingBottom: 12,
    paddingTop: 8,
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    width: 64,
  },
  tabIconActive: {},
  tabEmoji: { fontSize: 22 },
  tabLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: COLORS.accent,
  },
  centerButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  centerButtonText: {
    fontSize: 28,
    color: COLORS.white,
    lineHeight: 32,
  },
});
