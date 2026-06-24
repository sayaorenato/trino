import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, SHADOWS } from '../constants/theme';

export function SupportCard() {
  const router = useRouter();

  return (
    <Card variant="default" style={styles.card}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconBg}>
            <MaterialCommunityIcons name="heart-flash" size={24} color={COLORS.goldDark} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Apoie o Projeto Trino</Text>
            <Text style={styles.subtitle}>Ajude a manter nosso app sem anúncios</Text>
          </View>
        </View>

        <Text style={styles.description}>
          O Trino é 100% gratuito e sem fins lucrativos. Sua doação voluntária nos ajuda a cobrir os custos de servidores e banco de dados do Supabase.
        </Text>

        <Button
          title="Contribuir com o Projeto"
          variant="secondary"
          size="sm"
          icon={<MaterialCommunityIcons name="heart" size={14} color="#fff" />}
          onPress={() => router.push('/support')}
          style={styles.button}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff9eb', // Creme dourado suave combinando com o ouro fé do tema
    borderColor: 'rgba(196, 150, 60, 0.2)',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.light,
  },
  content: {
    gap: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconBg: {
    width: 42,
    height: 42,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.goldMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.heading,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 10,
    fontFamily: FONTS.family.bodyMedium,
    color: COLORS.goldDark,
    marginTop: 1,
  },
  description: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.body,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  button: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
    alignSelf: 'stretch',
    marginTop: SPACING.xs,
  },
});
