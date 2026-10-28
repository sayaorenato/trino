import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import { Slot, useRouter, useSegments, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
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
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700&display=swap');

          @font-face {
            font-family: 'Outfit_700Bold';
            src: local('Outfit Bold'), local('Outfit-Bold'), url('https://fonts.gstatic.com/s/outfit/v11/QxbgTeY83dFLTWqj2PYnvnEKbzg.woff2') format('woff2');
            font-weight: 700;
            font-display: swap;
          }
          @font-face {
            font-family: 'Outfit_600SemiBold';
            src: local('Outfit SemiBold'), local('Outfit-SemiBold'), url('https://fonts.gstatic.com/s/outfit/v11/QxbgTeY83dFLTWqj2PYnvnEKbzg.woff2') format('woff2');
            font-weight: 600;
            font-display: swap;
          }
          @font-face {
            font-family: 'Outfit_500Medium';
            src: local('Outfit Medium'), local('Outfit-Medium'), url('https://fonts.gstatic.com/s/outfit/v11/QxbgTeY83dFLTWqj2PYnvnEKbzg.woff2') format('woff2');
            font-weight: 500;
            font-display: swap;
          }
          @font-face {
            font-family: 'Inter_700Bold';
            src: local('Inter Bold'), local('Inter-Bold'), url('https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiA.woff2') format('woff2');
            font-weight: 700;
            font-display: swap;
          }
          @font-face {
            font-family: 'Inter_600SemiBold';
            src: local('Inter SemiBold'), local('Inter-SemiBold'), url('https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiA.woff2') format('woff2');
            font-weight: 600;
            font-display: swap;
          }
          @font-face {
            font-family: 'Inter_500Medium';
            src: local('Inter Medium'), local('Inter-Medium'), url('https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiA.woff2') format('woff2');
            font-weight: 500;
            font-display: swap;
          }
          @font-face {
            font-family: 'Inter_400Regular';
            src: local('Inter Regular'), local('Inter-Regular'), url('https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2') format('woff2');
            font-weight: 400;
            font-display: swap;
          }

          body, html, #root {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
            background: #C8C2BA;
            border-radius: 3px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #9A7630;
          }
        `}</style>
      )}
      <Slot />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
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
