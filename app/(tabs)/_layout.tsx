import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS, FONTS } from '../../constants/theme';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  // No Android e iOS, ajusta dinamicamente a altura e o paddingBottom da TabBar com base nas insets do sistema
  const bottomPadding = Platform.OS === 'web' 
    ? 8 
    : Math.max(insets.bottom, Platform.OS === 'ios' ? 28 : 12);
    
  const tabBarHeight = Platform.OS === 'web'
    ? 60
    : (Platform.OS === 'ios' ? 60 : 54) + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.secondary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: [
          styles.tabBar,
          {
            height: tabBarHeight,
            paddingBottom: bottomPadding,
          }
        ],
        tabBarLabelStyle: styles.tabBarLabel,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? 'view-dashboard' : 'view-dashboard-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          title: 'Desafios',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? 'trophy' : 'trophy-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          title: 'Check-in',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? 'checkbox-marked-circle' : 'checkbox-marked-circle-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Grupos',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? 'account-group' : 'account-group-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? 'account' : 'account-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      {/* Ocultar a tela de detalhes de desafio específica do menu de abas */}
      <Tabs.Screen
        name="challenge"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    ...Platform.select({
      web: {
        maxWidth: 480,
        alignSelf: 'center',
        width: '100%',
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
      } as any,
    }),
    ...SHADOWS.medium,
  },
  tabBarLabel: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bodySemibold,
  },
});
