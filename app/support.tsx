import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  TextInput,
  Alert
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { WebContainer } from '../components/ui/WebContainer';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, SHADOWS } from '../constants/theme';

export default function SupportScreen() {
  const router = useRouter();
  const [selectedAmount, setSelectedAmount] = useState<number | 'other'>(25);
  const [customAmount, setCustomAmount] = useState('');
  const [step, setStep] = useState<'donate' | 'success'>('donate');

  const handleCopyPix = async () => {
    const pixCode = "00020101021126580014br.gov.bcb.pix0136trino-apoio-pix-chave-aleatoria-mock5204000053039865802BR5915Trino-Aplicativo6009SAO-PAULO62070503***6304D1B5";
    await Clipboard.setStringAsync(pixCode);
    Alert.alert('Copiado!', 'Chave Pix Copia e Cola copiada para a área de transferência.');
  };

  const handleSimulatePayment = () => {
    setStep('success');
  };

  return (
    <WebContainer>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Apoie o Projeto</Text>
          <View style={{ width: 24 }} />
        </View>

        {step === 'donate' ? (
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconHeader}>
              <View style={styles.iconBg}>
                <MaterialCommunityIcons name="heart-flash" size={40} color={COLORS.gold} />
              </View>
              <Text style={styles.title}>Trino é 100% Gratuito</Text>
              <Text style={styles.description}>
                Nosso objetivo é apoiar o seu crescimento físico e espiritual sem anúncios e sem cobrar assinaturas. Sua doação voluntária ajuda a custear os servidores de banco de dados e armazenamento do Supabase.
              </Text>
            </View>

            {/* Seleção de Valor */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Escolha um valor para ofertar</Text>
              
              <View style={styles.amountGrid}>
                {[10, 25, 50].map(amount => (
                  <TouchableOpacity
                    key={amount}
                    style={[
                      styles.amountCard,
                      selectedAmount === amount && styles.amountCardActive
                    ]}
                    onPress={() => {
                      setSelectedAmount(amount);
                      setCustomAmount('');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.amountText,
                      selectedAmount === amount && styles.amountTextActive
                    ]}>
                      R$ {amount}
                    </Text>
                  </TouchableOpacity>
                ))}
                
                <TouchableOpacity
                  style={[
                    styles.amountCard,
                    selectedAmount === 'other' && styles.amountCardActive
                  ]}
                  onPress={() => setSelectedAmount('other')}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.amountText,
                    selectedAmount === 'other' && styles.amountTextActive
                  ]}>
                    Outro
                  </Text>
                </TouchableOpacity>
              </View>

              {selectedAmount === 'other' && (
                <View style={styles.customInputContainer}>
                  <Text style={styles.currencyPrefix}>R$</Text>
                  <TextInput
                    style={styles.customInput}
                    placeholder="Digite o valor"
                    value={customAmount}
                    onChangeText={setCustomAmount}
                    keyboardType="numeric"
                    autoFocus
                  />
                </View>
              )}
            </View>

            {/* QR CODE E PIX COPIA E COLA */}
            <Card variant="default" style={styles.pixCard}>
              <Text style={styles.pixCardTitle}>Doação Rápida via PIX</Text>
              <Text style={styles.pixCardSubtitle}>Escaneie o QR Code abaixo</Text>
              
              <View style={styles.qrCodePlaceholder}>
                {/* Representação visual elegante do QR Code */}
                <View style={styles.qrBorder}>
                  <MaterialCommunityIcons name="qrcode" size={140} color={COLORS.primary} />
                </View>
              </View>

              <Button
                title="Copiar Pix Copia e Cola"
                variant="outline"
                size="md"
                icon={<MaterialCommunityIcons name="content-copy" size={16} color={COLORS.primary} />}
                onPress={handleCopyPix}
                style={styles.copyBtn}
              />

              <Button
                title="Simular Pagamento Pago"
                variant="secondary"
                size="md"
                onPress={handleSimulatePayment}
                style={styles.simulateBtn}
              />
            </Card>
          </ScrollView>
        ) : (
          <View style={styles.successContainer}>
            <View style={styles.successCircle}>
              <MaterialCommunityIcons name="heart" size={60} color={COLORS.secondary} />
            </View>
            <Text style={styles.successTitle}>Muito Obrigado!</Text>
            <Text style={styles.successText}>
              Sua oferta foi recebida com sucesso. Nosso desejo é que esse app ajude você e a sua comunidade a se manterem firmes nos propósitos de leitura da palavra, vida de oração e saúde do corpo. Deus te abençoe!
            </Text>
            <Button
              title="Voltar ao Perfil"
              variant="primary"
              size="lg"
              onPress={() => router.replace('/(tabs)/profile')}
              style={styles.successBtn}
            />
          </View>
        )}
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
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  iconHeader: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  iconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    marginBottom: SPACING.sm,
  },
  description: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: SPACING.sm,
    fontFamily: FONTS.family.body,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    marginBottom: SPACING.md,
    fontFamily: FONTS.family.heading,
  },
  amountGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  amountCard: {
    width: '23%',
    backgroundColor: COLORS.surfaceCard,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    ...SHADOWS.light,
  },
  amountCardActive: {
    borderColor: COLORS.gold,
    backgroundColor: '#fff9eb',
  },
  amountText: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textSecondary,
    fontFamily: FONTS.family.body,
  },
  amountTextActive: {
    color: COLORS.goldDark,
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    height: 50,
  },
  currencyPrefix: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
    color: COLORS.goldDark,
    marginRight: SPACING.xs,
    fontFamily: FONTS.family.heading,
  },
  customInput: {
    flex: 1,
    height: '100%',
    fontSize: FONTS.size.md,
    color: COLORS.text,
    fontFamily: FONTS.family.body,
  },
  pixCard: {
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  pixCardTitle: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    fontFamily: FONTS.family.heading,
  },
  pixCardSubtitle: {
    fontSize: FONTS.size.xs,
    color: COLORS.textLight,
    textTransform: 'uppercase',
    fontWeight: FONTS.weight.bold,
    marginTop: 2,
    marginBottom: SPACING.lg,
    fontFamily: FONTS.family.body,
  },
  qrCodePlaceholder: {
    backgroundColor: '#fbf9fb',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.lg,
    ...SHADOWS.light,
  },
  qrBorder: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    backgroundColor: '#fff',
  },
  copyBtn: {
    width: '100%',
    marginBottom: SPACING.md,
  },
  simulateBtn: {
    width: '100%',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: 80,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#eefcf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    borderWidth: 2,
    borderColor: 'rgba(74, 101, 74, 0.2)',
  },
  successTitle: {
    fontSize: FONTS.size.xxl,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    fontFamily: FONTS.family.heading,
    marginBottom: SPACING.md,
  },
  successText: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xxl,
    paddingHorizontal: SPACING.sm,
    fontFamily: FONTS.family.body,
  },
  successBtn: {
    width: '100%',
  }
});
