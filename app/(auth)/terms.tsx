import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { WebContainer } from '../../components/ui/WebContainer';
import { COLORS, SPACING, FONTS, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

type TabType = 'privacy' | 'terms';

export default function TermsAndPrivacyScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('privacy');

  return (
    <WebContainer>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Informações Legais</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'privacy' && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab('privacy')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="shield-lock-outline"
              size={18}
              color={activeTab === 'privacy' ? COLORS.secondary : COLORS.textSecondary}
              style={styles.tabIcon}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'privacy' && styles.tabTextActive,
              ]}
            >
              Privacidade
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'terms' && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab('terms')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="file-document-outline"
              size={18}
              color={activeTab === 'terms' ? COLORS.secondary : COLORS.textSecondary}
              style={styles.tabIcon}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'terms' && styles.tabTextActive,
              ]}
            >
              Termos de Uso
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'privacy' ? (
            <View style={styles.card}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>LGPD & Segurança</Text>
              </View>
              <Text style={styles.title}>Política de Privacidade</Text>
              <Text style={styles.updatedAt}>Última atualização: Agosto de 2026</Text>

              <Text style={styles.paragraph}>
                Sua privacidade e a proteção dos seus dados são fundamentais para nós no <Text style={styles.bold}>Trino</Text>. Esta política descreve de forma transparente como coletamos, usamos e protegemos suas informações ao utilizar nosso aplicativo.
              </Text>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>1. Informações que Coletamos</Text>
                <Text style={styles.paragraph}>
                  • <Text style={styles.bold}>Dados da Conta:</Text> Nome completo, endereço de e-mail e foto de perfil (quando fornecida via login direto ou pelo Google/Apple).{'\n'}
                  • <Text style={styles.bold}>Atividades no App:</Text> Registros de check-in (hábitos de oração, leitura bíblica, exercícios físicos), comentários em grupos e fotos de comprovação enviadas por você.{'\n'}
                  • <Text style={styles.bold}>Dados Técnicos:</Text> Informações básicas do dispositivo e logs de acesso para garantia de segurança e prevenção de fraudes.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>2. Finalidade do Uso dos Dados</Text>
                <Text style={styles.paragraph}>
                  Utilizamos seus dados exclusivamente para:{'\n'}
                  • Autenticar seu acesso de forma segura;{'\n'}
                  • Contabilizar sua pontuação, streaks e ranking nos grupos e desafios;{'\n'}
                  • Notificar sobre atividades do seu grupo e lembretes de disciplinas diárias;{'\n'}
                  • Melhorar continuamente a estabilidade e usabilidade da plataforma.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>3. Compartilhamento de Dados</Text>
                <Text style={styles.paragraph}>
                  Não vendemos nem alugamos suas informações pessoais. Seus registros de check-in, nome e foto ficam visíveis apenas para os membros dos grupos nos quais você participa ativamente.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>4. Seus Direitos (LGPD)</Text>
                <Text style={styles.paragraph}>
                  Você tem o direito de solicitar a qualquer momento o acesso, correção, exportação ou exclusão definitiva da sua conta e de todos os seus dados cadastrados no Trino.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>5. Contato de Privacidade</Text>
                <Text style={styles.paragraph}>
                  Em caso de dúvidas sobre nossa política ou sobre o tratamento dos seus dados, entre em contato através do nosso suporte no aplicativo.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Regras & Condições</Text>
              </View>
              <Text style={styles.title}>Termos de Serviço</Text>
              <Text style={styles.updatedAt}>Última atualização: Agosto de 2026</Text>

              <Text style={styles.paragraph}>
                Ao acessar e utilizar o aplicativo <Text style={styles.bold}>Trino</Text>, você concorda em cumprir e respeitar os seguintes termos e condições de uso.
              </Text>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>1. O Propósito do Trino</Text>
                <Text style={styles.paragraph}>
                  O Trino é uma plataforma destinada a promover o desenvolvimento pessoal integral nos pilares do corpo, alma e espírito através de disciplinas diárias, desafios em grupo e acompanhamento mútuo.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>2. Cadastro e Responsabilidade</Text>
                <Text style={styles.paragraph}>
                  • Você é responsável por manter a confidencialidade de suas credenciais de acesso.{'\n'}
                  • As informações fornecidas devem ser verídicas e atualizadas.{'\n'}
                  • Cada conta é de uso pessoal e intransferível.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>3. Conduta e Convivência Comunitária</Text>
                <Text style={styles.paragraph}>
                  É estritamente proibido:{'\n'}
                  • Publicar conteúdos ofensivos, preconceituosos, difamatórios ou ilícitos;{'\n'}
                  • Enviar fotos impróprias ou falsificar check-ins de desafios;{'\n'}
                  • Praticar qualquer conduta que desrespeite outros participantes da comunidade.{'\n'}
                  O descumprimento poderá resultar na suspensão ou banimento imediato da conta.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>4. Saúde e Atividade Física</Text>
                <Text style={styles.paragraph}>
                  O Trino estimula hábitos saudáveis, mas não substitui orientação médica ou profissional de educação física. Consulte um especialista antes de iniciar novos treinos ou dietas rigorosas.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>5. Modificações dos Termos</Text>
                <Text style={styles.paragraph}>
                  Reservamo-nos o direito de atualizar estes termos periodicamente. Avisaremos sobre alterações significativas através do próprio aplicativo.
                </Text>
              </View>
            </View>
          )}

          <View style={styles.footerAction}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Text style={styles.closeBtnText}>Entendido e Voltar</Text>
            </TouchableOpacity>
          </View>
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
    paddingTop: Platform.OS === 'android' ? SPACING.lg : SPACING.xs,
    paddingBottom: SPACING.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.light,
  },
  headerTitle: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.headingSemibold,
    color: COLORS.primary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: BORDER_RADIUS.xl,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
    padding: SPACING.xs,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.lg,
  },
  tabButtonActive: {
    backgroundColor: COLORS.surface,
    ...SHADOWS.light,
  },
  tabIcon: {
    marginRight: SPACING.xs,
  },
  tabText: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bodyMedium,
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    fontFamily: FONTS.family.bodySemibold,
    color: COLORS.primary,
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.medium,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.secondaryMuted,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.sm,
  },
  badgeText: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bodySemibold,
    color: COLORS.secondary,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: FONTS.size.xxl,
    fontFamily: FONTS.family.heading,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  updatedAt: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.body,
    color: COLORS.textLight,
    marginBottom: SPACING.lg,
  },
  section: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  sectionTitle: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.headingSemibold,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  paragraph: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  bold: {
    fontFamily: FONTS.family.bodySemibold,
    color: COLORS.text,
  },
  footerAction: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  closeBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
    borderRadius: BORDER_RADIUS.xl,
    width: '100%',
    alignItems: 'center',
    ...SHADOWS.light,
  },
  closeBtnText: {
    color: COLORS.textOnPrimary,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bodySemibold,
  },
});
