import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Alert,
  ActivityIndicator,
  Platform,
  Share
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { WebContainer } from '../components/ui/WebContainer';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, SHADOWS } from '../constants/theme';
import { supabase } from '../lib/supabase';

export default function InviteScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setLoading(false);
      return;
    }

    supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single()
      .then(async ({ data, error }) => {
        if (data && !error) {
          // Lógica auto-healing: se o grupo não possuir invite_code, gera e atualiza na hora
          if (!data.invite_code) {
            try {
              const cleanName = data.name.replace(/[^A-Za-z]/g, '').toUpperCase();
              const prefix = cleanName.substring(0, 3).padEnd(3, 'T');
              const randomNum = Math.floor(100 + Math.random() * 900);
              const generatedCode = `TRI-${prefix}-${randomNum}`;

              const { error: updateError } = await supabase
                .from('groups')
                .update({ invite_code: generatedCode })
                .eq('id', groupId);

              if (!updateError) {
                data.invite_code = generatedCode;
              }
            } catch (e) {
              console.error('Erro ao gerar invite_code de forma lazy:', e);
            }
          }
          setGroup(data);
        }
        setLoading(false);
      });
  }, [groupId]);

  const inviteCode = group?.invite_code || "TRI-GEN-000";
  const inviteLink = `https://trino.app/invite?code=${inviteCode}`;

  const handleShareLink = async () => {
    const shareMessage = `Venha fazer parte do nosso grupo "${group?.name || 'Trino'}"! Use o código ${inviteCode} ou acesse direto pelo link: ${inviteLink}`;

    try {
      await Clipboard.setStringAsync(inviteLink);
      
      if (Platform.OS === 'web') {
        window.alert('Link Copiado! O link de convite foi copiado para a sua área de transferência. Escolha onde compartilhar!');
      } else {
        Alert.alert('Link Copiado!', 'O link de convite foi copiado para a sua área de transferência. Escolha onde compartilhar!');
      }

      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({
          title: `Convite para ${group?.name || 'Trino'}`,
          text: shareMessage,
          url: inviteLink,
        });
      } else {
        await Share.share({
          message: shareMessage,
          url: inviteLink,
          title: `Convite para ${group?.name || 'Trino'}`,
        });
      }
    } catch (e) {
      console.log('Compartilhamento finalizado.');
    }
  };

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(inviteCode);
    if (Platform.OS === 'web') {
      window.alert('Código Copiado! O código do grupo foi copiado para a área de transferência.');
    } else {
      Alert.alert('Código Copiado!', 'O código do grupo foi copiado para a área de transferência.');
    }
  };

  if (loading) {
    return (
      <WebContainer>
        <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={COLORS.secondary} />
        </SafeAreaView>
      </WebContainer>
    );
  }

  return (
    <WebContainer>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Convidar Membros</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <Text style={styles.subtitle}>
            Compartilhe o convite abaixo para trazer mais irmãos para prestarem contas juntos de seus hábitos.
          </Text>

          <Card variant="default" style={styles.inviteCard}>
            <Text style={styles.groupLabel}>GRUPO ATIVO</Text>
            <Text style={styles.groupName}>{group?.name || "Sem Grupo"}</Text>

            {/* QR Code de Convite */}
            <View style={styles.qrContainer}>
              <View style={styles.qrBorder}>
                <MaterialCommunityIcons name="qrcode-scan" size={130} color={COLORS.primary} />
              </View>
            </View>

            <Text style={styles.qrDesc}>Escaneie para entrar no grupo</Text>

            <View style={styles.divider} />

            {/* Código do Grupo */}
            <Text style={styles.codeLabel}>CÓDIGO DE ACESSO</Text>
            <View style={styles.codeRow}>
              <Text style={styles.codeText}>{inviteCode}</Text>
              <TouchableOpacity onPress={handleCopyCode} style={styles.copyIconBtn}>
                <MaterialCommunityIcons name="content-copy" size={20} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.buttonRow}>
              <Button
                title="Compartilhar Link do Grupo"
                variant="primary"
                size="md"
                icon={<MaterialCommunityIcons name="share-variant" size={16} color="#fff" />}
                onPress={handleShareLink}
                style={styles.actionBtn}
              />
            </View>
          </Card>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.xl,
    fontFamily: FONTS.family.body,
  },
  inviteCard: {
    width: '100%',
    padding: SPACING.lg,
    alignItems: 'center',
  },
  groupLabel: {
    fontSize: 10,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textLight,
    letterSpacing: 1,
    fontFamily: FONTS.family.body,
  },
  groupName: {
    fontSize: FONTS.size.lg,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    marginBottom: SPACING.lg,
    fontFamily: FONTS.family.heading,
  },
  qrContainer: {
    backgroundColor: '#fbf9fb',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.sm,
    ...SHADOWS.light,
  },
  qrBorder: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    backgroundColor: '#fff',
  },
  qrDesc: {
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weight.semibold,
    marginBottom: SPACING.md,
    fontFamily: FONTS.family.body,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textLight,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
    fontFamily: FONTS.family.body,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  codeText: {
    fontSize: FONTS.size.lg,
    fontWeight: FONTS.weight.extraBold,
    color: COLORS.primary,
    letterSpacing: 2,
    fontFamily: FONTS.family.heading,
  },
  copyIconBtn: {
    marginLeft: SPACING.md,
  },
  buttonRow: {
    width: '100%',
  },
  actionBtn: {
    width: '100%',
  }
});
