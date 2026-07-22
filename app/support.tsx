import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  Alert,
  Platform,
  Image
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { WebContainer } from '../components/ui/WebContainer';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, SHADOWS } from '../constants/theme';

const PIX_CODE = "00020126670014BR.GOV.BCB.PIX0114293391890001230227Obrigado pela contribuição.5204000053039865802BR5925RENATO BEDA DE AMORIM SAY6009SAO PAULO62140510fPqfVGExYp6304FF95";
const QR_CODE_URL = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(PIX_CODE)}`;

export default function SupportScreen() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleCopyPix = async () => {
    try {
      await Clipboard.setStringAsync(PIX_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 4000);

      if (Platform.OS === 'web') {
        window.alert('Código Pix Copia e Cola copiado com sucesso! Abra o app do seu banco para colar.');
      } else {
        Alert.alert('Copiado com Sucesso! 🎉', 'O código Pix Copia e Cola foi copiado para a sua área de transferência.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <WebContainer>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contribuição via Pix</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* CABEÇALHO DA PÁGINA */}
          <View style={styles.iconHeader}>
            <View style={styles.iconBg}>
              <MaterialCommunityIcons name="heart-flash" size={40} color={COLORS.goldDark} />
            </View>
            <Text style={styles.title}>Apoie o Projeto Trino</Text>
            <Text style={styles.description}>
              O Trino é 100% gratuito e sem fins lucrativos. Sua doação voluntária nos ajuda a cobrir os custos de manutenção dos servidores e banco de dados.
            </Text>
          </View>

          {/* CARD PRINCIPAL DO PIX */}
          <Card variant="default" style={styles.pixCard}>
            <View style={styles.pixBadge}>
              <MaterialCommunityIcons name="lightning-bolt" size={16} color={COLORS.secondary} />
              <Text style={styles.pixBadgeText}>PIX INSTANTÂNEO</Text>
            </View>

            <Text style={styles.instructionsTitle}>Escaneie o QR Code</Text>
            <Text style={styles.instructionsSubtitle}>
              Abra o app do seu banco e aponte a câmera para o código abaixo:
            </Text>

            {/* QR CODE GERADO */}
            <View style={styles.qrContainer}>
              <Image 
                source={{ uri: QR_CODE_URL }} 
                style={styles.qrCodeImage}
                resizeMode="contain"
              />
            </View>

            {/* BENEFICIÁRIO */}
            <View style={styles.beneficiaryContainer}>
              <Text style={styles.beneficiaryLabel}>DESTINATÁRIO</Text>
              <Text style={styles.beneficiaryName}>Freedom Tech - Renato Sayão</Text>
              <Text style={styles.beneficiaryCity}>Rio Claro / SP</Text>
            </View>

            <View style={styles.divider} />

            <Button
              title={copied ? "✓ Código Pix Copiado!" : "Copiar Código Pix"}
              variant={copied ? "secondary" : "primary"}
              size="lg"
              icon={<MaterialCommunityIcons name={copied ? "check" : "content-copy"} size={20} color="#fff" />}
              onPress={handleCopyPix}
              style={styles.copyBtn}
            />

            <Text style={styles.anyAmountNote}>
              💡 Você pode contribuir com <Text style={{ fontWeight: 'bold', color: COLORS.primary }}>qualquer valor</Text> diretamente no aplicativo do seu banco. Deus te abençoe!
            </Text>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </WebContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(225, 222, 227, 0.4)',
  },
  backButton: {
    padding: 2,
  },
  headerTitle: {
    fontSize: FONTS.size.lg,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    fontFamily: FONTS.family.heading,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: 60,
  },
  iconHeader: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  iconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff9eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.light,
  },
  title: {
    fontSize: FONTS.size.xl,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    fontFamily: FONTS.family.heading,
    marginBottom: SPACING.xs,
  },
  description: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: SPACING.sm,
    fontFamily: FONTS.family.body,
  },
  pixCard: {
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  pixBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondaryMuted,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    gap: 4,
  },
  pixBadgeText: {
    color: COLORS.secondary,
    fontSize: 11,
    fontWeight: FONTS.weight.bold,
    fontFamily: FONTS.family.heading,
    letterSpacing: 0.5,
  },
  instructionsTitle: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    fontFamily: FONTS.family.heading,
  },
  instructionsSubtitle: {
    fontSize: FONTS.size.xs,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: SPACING.md,
    fontFamily: FONTS.family.body,
  },
  qrContainer: {
    backgroundColor: '#fff',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.medium,
  },
  qrCodeImage: {
    width: 200,
    height: 200,
  },
  beneficiaryContainer: {
    alignItems: 'center',
    backgroundColor: '#fff9eb',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(196, 150, 60, 0.2)',
    width: '100%',
    marginBottom: SPACING.md,
  },
  beneficiaryLabel: {
    fontSize: 10,
    color: COLORS.goldDark,
    fontWeight: FONTS.weight.bold,
    fontFamily: FONTS.family.heading,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  beneficiaryName: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    fontFamily: FONTS.family.heading,
  },
  beneficiaryCity: {
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    fontFamily: FONTS.family.body,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    width: '100%',
    marginVertical: SPACING.md,
  },
  copyTitle: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    fontFamily: FONTS.family.heading,
    marginBottom: SPACING.xs,
    alignSelf: 'flex-start',
  },
  pixCodeBox: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    width: '100%',
    marginBottom: SPACING.md,
  },
  pixCodeText: {
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 16,
  },
  copyBtn: {
    width: '100%',
    marginBottom: SPACING.md,
  },
  anyAmountNote: {
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: FONTS.family.body,
  },
});
