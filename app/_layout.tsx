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
          @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700&display=swap');

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

          /* Tipografia do Google Stitch: Fé em Constância (Plus Jakarta Sans) */
          @font-face {
            font-family: 'PlusJakartaSans_800ExtraBold';
            src: local('Plus Jakarta Sans ExtraBold'), url('https://fonts.gstatic.com/s/plusjakartasans/v8/LDIbaomQNQcsA88MACc2WPK33C2z.woff2') format('woff2');
            font-weight: 800;
            font-display: swap;
          }
          @font-face {
            font-family: 'PlusJakartaSans_700Bold';
            src: local('Plus Jakarta Sans Bold'), url('https://fonts.gstatic.com/s/plusjakartasans/v8/LDIbaomQNQcsA88MACc2WPK33C2z.woff2') format('woff2');
            font-weight: 700;
            font-display: swap;
          }
          @font-face {
            font-family: 'PlusJakartaSans_600SemiBold';
            src: local('Plus Jakarta Sans SemiBold'), url('https://fonts.gstatic.com/s/plusjakartasans/v8/LDIbaomQNQcsA88MACc2WPK33C2z.woff2') format('woff2');
            font-weight: 600;
            font-display: swap;
          }
          @font-face {
            font-family: 'PlusJakartaSans_500Medium';
            src: local('Plus Jakarta Sans Medium'), url('https://fonts.gstatic.com/s/plusjakartasans/v8/LDIbaomQNQcsA88MACc2WPK33C2z.woff2') format('woff2');
            font-weight: 500;
            font-display: swap;
          }
          @font-face {
            font-family: 'PlusJakartaSans_400Regular';
            src: local('Plus Jakarta Sans Regular'), url('https://fonts.gstatic.com/s/plusjakartasans/v8/LDIbaomQNQcsA88MACc2WPK33C2z.woff2') format('woff2');
            font-weight: 400;
            font-display: swap;
          }

          /* Tipografia do Google Stitch: Fé em Constância (Manrope) */
          @font-face {
            font-family: 'Manrope_700Bold';
            src: local('Manrope Bold'), url('https://fonts.gstatic.com/s/manrope/v15/xn7_YHE41ni1AdIRqAuZuw1Bx9mbZk79FN_C-b0.woff2') format('woff2');
            font-weight: 700;
            font-display: swap;
          }
          @font-face {
            font-family: 'Manrope_600SemiBold';
            src: local('Manrope SemiBold'), url('https://fonts.gstatic.com/s/manrope/v15/xn7_YHE41ni1AdIRqAuZuw1Bx9mbZk79FN_C-b0.woff2') format('woff2');
            font-weight: 600;
            font-display: swap;
          }
          @font-face {
            font-family: 'Manrope_500Medium';
            src: local('Manrope Medium'), url('https://fonts.gstatic.com/s/manrope/v15/xn7_YHE41ni1AdIRqAuZuw1Bx9mbZk79FN_C-b0.woff2') format('woff2');
            font-weight: 500;
            font-display: swap;
          }
          @font-face {
            font-family: 'Manrope_400Regular';
            src: local('Manrope Regular'), url('https://fonts.gstatic.com/s/manrope/v15/xn7_YHE41ni1AdIRqAuZuw1Bx9mbZk79FN_C-b0.woff2') format('woff2');
            font-weight: 400;
            font-display: swap;
          }

          /* Retrocompatibilidade com Outfit & Inter */
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
            font-family: 'Manrope', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
