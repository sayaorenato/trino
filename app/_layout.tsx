import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import { Slot, useRouter, useSegments, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthProvider, useAuth, setPendingInviteCode } from '../context/auth';
import { COLORS } from '../constants/theme';

function InitialLayout() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Ler o código do convite e salvar na memória global
  const searchParams = useLocalSearchParams<{ code?: string }>();
  const code = searchParams?.code;
  
  useEffect(() => {
    if (code) {
      setPendingInviteCode(code);
    }
  }, [code]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const onResetPassword = segments[1 as number] === 'reset-password';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (user && inAuthGroup && !onResetPassword) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      {Platform.OS === 'web' && (
        <style type="text/css">{`
          @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

          /* Ícones Oficiais do @expo/vector-icons para React Native Web */
          @font-face {
            font-family: 'MaterialCommunityIcons';
            src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.1.1/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf') format('truetype');
            font-display: swap;
          }
          @font-face {
            font-family: 'material-community';
            src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.1.1/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf') format('truetype');
            font-display: swap;
          }
          @font-face {
            font-family: 'MaterialIcons';
            src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.1.1/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf') format('truetype');
            font-display: swap;
          }
          @font-face {
            font-family: 'Ionicons';
            src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.1.1/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') format('truetype');
            font-display: swap;
          }

          /* Aliases para compatibilidade total com React Native Web */
          @font-face {
            font-family: 'PlusJakartaSans_800ExtraBold';
            src: local('Plus Jakarta Sans ExtraBold'), local('Plus Jakarta Sans');
            font-weight: 800;
            font-display: swap;
          }
          @font-face {
            font-family: 'PlusJakartaSans_700Bold';
            src: local('Plus Jakarta Sans Bold'), local('Plus Jakarta Sans');
            font-weight: 700;
            font-display: swap;
          }
          @font-face {
            font-family: 'PlusJakartaSans_600SemiBold';
            src: local('Plus Jakarta Sans SemiBold'), local('Plus Jakarta Sans');
            font-weight: 600;
            font-display: swap;
          }
          @font-face {
            font-family: 'PlusJakartaSans_500Medium';
            src: local('Plus Jakarta Sans Medium'), local('Plus Jakarta Sans');
            font-weight: 500;
            font-display: swap;
          }
          @font-face {
            font-family: 'PlusJakartaSans_400Regular';
            src: local('Plus Jakarta Sans Regular'), local('Plus Jakarta Sans');
            font-weight: 400;
            font-display: swap;
          }

          /* Aliases para compatibilidade total com Manrope */
          @font-face {
            font-family: 'Manrope_700Bold';
            src: local('Manrope Bold'), local('Manrope');
            font-weight: 700;
            font-display: swap;
          }
          @font-face {
            font-family: 'Manrope_600SemiBold';
            src: local('Manrope SemiBold'), local('Manrope');
            font-weight: 600;
            font-display: swap;
          }
          @font-face {
            font-family: 'Manrope_500Medium';
            src: local('Manrope Medium'), local('Manrope');
            font-weight: 500;
            font-display: swap;
          }
          @font-face {
            font-family: 'Manrope_400Regular';
            src: local('Manrope Regular'), local('Manrope');
            font-weight: 400;
            font-display: swap;
          }

          body, html, #root {
            font-family: 'Manrope', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          /* Custom Scrollbar for premium web design */
          ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          ::-webkit-scrollbar-track {
            background: transparent;
          }
          ::-webkit-scrollbar-thumb {
            background: #E4E2E4;
            border-radius: 3px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #C4963C;
          }
        `}</style>
      )}
      <Slot />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ...MaterialCommunityIcons.font,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });
  const [fontsTimedOut, setFontsTimedOut] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setFontsTimedOut(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!fontsLoaded && !fontsTimedOut) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <InitialLayout />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
