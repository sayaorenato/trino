import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  SafeAreaView, 
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { MOCK_FEED, HABIT_LABELS, Checkin } from '../constants/mock-data';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, SHADOWS } from '../constants/theme';

export default function FeedScreen() {
  const router = useRouter();
  const [feedItems, setFeedItems] = useState<Checkin[]>(MOCK_FEED);

  const handleReact = (checkinId: string, emoji: string) => {
    // Simular reação do usuário Renato (user_1)
    setFeedItems(prev => 
      prev.map(item => {
        if (item.id === checkinId) {
          const reactedIndex = item.reactions.findIndex(r => r.emoji === emoji);
          
          if (reactedIndex > -1) {
            const reaction = item.reactions[reactedIndex];
            const alreadyReacted = reaction.users.includes('user_1');
            
            let updatedReactions = [...item.reactions];
            if (alreadyReacted) {
              // Remover reação
              const updatedUsers = reaction.users.filter(id => id !== 'user_1');
              if (updatedUsers.length === 0) {
                updatedReactions = updatedReactions.filter(r => r.emoji !== emoji);
              } else {
                updatedReactions[reactedIndex] = { ...reaction, users: updatedUsers };
              }
            } else {
              // Adicionar reação
              updatedReactions[reactedIndex] = { ...reaction, users: [...reaction.users, 'user_1'] };
            }
            return { ...item, reactions: updatedReactions };
          } else {
            // Nova reação de emoji que não existia no post
            return {
              ...item,
              reactions: [...item.reactions, { emoji, users: ['user_1'] }]
            };
          }
        }
        return item;
      })
    );
  };

  const renderFeedItem = ({ item }: { item: Checkin }) => {
    const habitInfo = HABIT_LABELS[item.habit_type];
    
    return (
      <Card variant="default" style={styles.feedCard}>
        {/* Header do Post */}
        <View style={styles.postHeader}>
          <Avatar source={item.user_avatar} name={item.user_name} size={40} />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.user_name}</Text>
            <View style={styles.timeRow}>
              <Text style={styles.postTime}>
                {new Date(item.created_at).toLocaleDateString('pt-BR')} às {new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
              {item.is_late && (
                <View style={styles.lateBadge}>
                  <Text style={styles.lateBadgeText}>Atrasado (-50%)</Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={[styles.habitBadge, { backgroundColor: habitInfo.color }]}>
            <MaterialCommunityIcons name={habitInfo.icon} size={12} color="#fff" />
            <Text style={styles.habitBadgeText}>{habitInfo.title}</Text>
          </View>
        </View>

        {/* Legenda */}
        {item.caption ? (
          <Text style={styles.postCaption}>{item.caption}</Text>
        ) : null}

        {/* Imagem do Check-in */}
        {item.media_url ? (
          <View style={styles.postImageContainer}>
            <Image source={{ uri: item.media_url }} style={styles.postImage} />
          </View>
        ) : null}

        {/* Rodapé: Pontos e Reações */}
        <View style={styles.postFooter}>
          <View style={styles.pointsEarned}>
            <MaterialCommunityIcons name="star-circle" size={18} color={COLORS.gold} />
            <Text style={styles.pointsEarnedText}>+{item.points} pts</Text>
          </View>

          {/* Lista de Reações Existentes */}
          <View style={styles.reactionsList}>
            {item.reactions.map((reaction, index) => {
              const hasReacted = reaction.users.includes('user_1');
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.reactionChip,
                    hasReacted && styles.reactionChipActive
                  ]}
                  onPress={() => handleReact(item.id, reaction.emoji)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                  <Text style={[
                    styles.reactionCount,
                    hasReacted && styles.reactionCountActive
                  ]}>
                    {reaction.users.length}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Barra de Reação Rápida (para interatividade) */}
        <View style={styles.quickReactionsRow}>
          {['🔥', '👏', '❤️', '🙌'].map(emoji => {
            const reaction = item.reactions.find(r => r.emoji === emoji);
            const hasReacted = reaction?.users.includes('user_1');
            return (
              <TouchableOpacity
                key={emoji}
                style={[
                  styles.quickReactionBtn,
                  hasReacted && styles.quickReactionBtnActive
                ]}
                onPress={() => handleReact(item.id, emoji)}
              >
                <Text style={styles.quickReactionText}>{emoji}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feed do Grupo</Text>
        <View style={{ width: 24 }} /> {/* Espaçador para centralizar */}
      </View>

      <FlatList
        data={feedItems}
        renderItem={renderFeedItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <Text style={styles.feedSubtitle}>
            Acompanhe o progresso diário dos seus amigos e apoie seus hábitos de fé e saúde!
          </Text>
        )}
      />
    </SafeAreaView>
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
  feedSubtitle: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 18,
    fontFamily: FONTS.family.body,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  feedCard: {
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  userInfo: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  userName: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  postTime: {
    fontSize: 10,
    color: COLORS.textLight,
  },
  lateBadge: {
    backgroundColor: '#fff0f0',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: BORDER_RADIUS.xs,
    marginLeft: SPACING.xs,
  },
  lateBadgeText: {
    fontSize: 8,
    fontWeight: FONTS.weight.bold,
    color: COLORS.error,
  },
  habitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.md,
  },
  habitBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: FONTS.weight.bold,
    marginLeft: 4,
  },
  postCaption: {
    fontSize: FONTS.size.sm,
    color: COLORS.text,
    lineHeight: 18,
    marginVertical: SPACING.sm,
    fontFamily: FONTS.family.body,
  },
  postImageContainer: {
    height: 240,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  postImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  pointsEarned: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff9eb',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.md,
  },
  pointsEarnedText: {
    fontSize: FONTS.size.xs,
    fontWeight: FONTS.weight.bold,
    color: COLORS.goldDark,
    marginLeft: 4,
  },
  reactionsList: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.md,
  },
  reactionChipActive: {
    backgroundColor: '#eefcf4',
    borderWidth: 1,
    borderColor: 'rgba(74, 101, 74, 0.2)',
  },
  reactionEmoji: {
    fontSize: 12,
  },
  reactionCount: {
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weight.semibold,
    marginLeft: 2,
  },
  reactionCountActive: {
    color: COLORS.secondaryDark,
  },
  quickReactionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickReactionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    marginHorizontal: 2,
  },
  quickReactionBtnActive: {
    backgroundColor: 'rgba(74, 101, 74, 0.08)',
  },
  quickReactionText: {
    fontSize: 16,
  }
});
