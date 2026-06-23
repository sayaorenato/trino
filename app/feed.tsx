import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Vibration,
  Dimensions,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { WebContainer } from '../components/ui/WebContainer';
import { useAuth } from '../context/auth';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { MOCK_EXTRA_TASKS } from '../constants/mock-data';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, SHADOWS } from '../constants/theme';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type HabitType = 'bible' | 'pray' | 'workout';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface RealCheckin {
  id: string;
  user_id: string;
  round_id: string;
  type: HabitType;
  image_url: string | null;
  note: string | null;
  verified: boolean;
  created_at: string;
  profiles: Profile | null;
}

interface Reaction {
  emoji: string;
  users: string[];
}

interface FeedItem extends RealCheckin {
  reactions: Reaction[];
  comments_count: number;
}

interface CommentItem {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const HABIT_META: Record<HabitType, { title: string; icon: string; color: string }> = {
  bible:   { title: 'Bíblia',    icon: 'book-open-variant', color: COLORS.primaryLight },
  pray:    { title: 'Oração',    icon: 'hands-pray',        color: COLORS.gold },
  workout: { title: 'Exercício', icon: 'dumbbell',          color: COLORS.secondary },
};

const FB_REACTIONS = [
  { emoji: '👍', name: 'Curtir', color: COLORS.primary },
  { emoji: '❤️', name: 'Amei', color: '#e0245e' },
  { emoji: '🥰', name: 'Força', color: '#ffad1f' },
  { emoji: '😂', name: 'Haha', color: '#ffad1f' },
  { emoji: '😮', name: 'Uau', color: '#ffad1f' },
  { emoji: '😢', name: 'Triste', color: '#ffad1f' },
  { emoji: '😡', name: 'Grr', color: '#f34423' },
];

// ─── Componente ───────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const { user, profile } = useAuth();

  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Estados para reações estilo Facebook
  const [activeReactionCheckinId, setActiveReactionCheckinId] = useState<string | null>(null);
  const [popoverCoords, setPopoverCoords] = useState({ x: 0, y: 0 });

  // Estados para comentários inline
  const [commentsMap, setCommentsMap] = useState<Record<string, CommentItem[]>>({});
  const [expandedCommentsCheckinIds, setExpandedCommentsCheckinIds] = useState<Record<string, boolean>>({});
  const [commentInputsText, setCommentInputsText] = useState<Record<string, string>>({});
  const [sendingCommentMap, setSendingCommentMap] = useState<Record<string, boolean>>({});
  const commentInputRefs = React.useRef<Record<string, TextInput | null>>({});
  const [extraTasksMap, setExtraTasksMap] = useState<Record<string, string>>({});

  const PAGE_SIZE = 15;

  // ── Busca inicial / refresh ──
  const fetchFeed = useCallback(async (isRefresh = false) => {
    if (!groupId) {
      setError('Nenhum grupo selecionado.');
      setLoading(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const isMock = groupId.startsWith('group');
      
      // Buscar tarefas extras do grupo para mapear seus títulos
      const tempTasksMap: Record<string, string> = {};
      if (isMock) {
        const mockTasks = MOCK_EXTRA_TASKS['chal_1'] || [];
        mockTasks.forEach(t => {
          tempTasksMap[t.id] = t.title;
        });
      } else {
        try {
          const challenges = await api.getGroupChallenges(groupId);
          const challengeIds = challenges.map((c: any) => c.id);

          if (challengeIds.length > 0) {
            const { data: tasksData } = await supabase
              .from('tasks')
              .select('id, description')
              .in('challenge_id', challengeIds);

            (tasksData || []).forEach((t: any) => {
              let title = 'Tarefa Extra';
              try {
                const parsed = JSON.parse(t.description);
                title = parsed.title || 'Tarefa Extra';
              } catch (e) {
                // não era JSON
              }
              tempTasksMap[t.id] = title;
            });
          }
        } catch (taskErr) {
          console.error('Error fetching tasks map:', taskErr);
        }
      }
      setExtraTasksMap(tempTasksMap);

      const data = await api.getGroupFeed(groupId, PAGE_SIZE, 0);

      const mapped: FeedItem[] = data.map((item: any) => ({
        ...item,
        reactions: item.reactions || [],
        comments_count: item.comments_count || 0
      }));

      // Buscar comentários em lote ou mocks para cada check-in
      const newCommentsMap: Record<string, CommentItem[]> = {};

      if (isMock) {
        mapped.forEach(item => {
          newCommentsMap[item.id] = [
            {
              id: `comm_${item.id}_1`,
              content: 'Parabéns pela constância! Inspirador! 🔥',
              created_at: new Date(Date.now() - 3600000).toISOString(),
              user_id: 'user_2',
              profiles: {
                id: 'user_2',
                full_name: 'Sarah Souza',
                avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80'
              }
            },
            {
              id: `comm_${item.id}_2`,
              content: 'Vamos juntos, foco total! 🚀',
              created_at: new Date(Date.now() - 1800000).toISOString(),
              user_id: 'user_3',
              profiles: {
                id: 'user_3',
                full_name: 'Mateus Oliveira',
                avatar_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80'
              }
            }
          ];
        });
      } else {
        const commentsPromises = mapped.map(item =>
          api.getComments(item.id).then(comments => ({ id: item.id, comments }))
        );
        const results = await Promise.all(commentsPromises);
        results.forEach(res => {
          newCommentsMap[res.id] = res.comments;
        });
      }

      setFeedItems(mapped);
      setCommentsMap(newCommentsMap);
      setHasMore(data.length === PAGE_SIZE);
    } catch (err) {
      console.error('Error fetching feed:', err);
      setError('Ocorreu um erro ao carregar o feed.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId]);

  // ── Paginação — carregar mais ──
  const fetchMore = useCallback(async () => {
    if (!groupId || loadingMore || !hasMore) return;
    setLoadingMore(true);

    try {
      const data = await api.getGroupFeed(groupId, PAGE_SIZE, feedItems.length);

      const mapped: FeedItem[] = data.map((item: any) => ({
        ...item,
        reactions: item.reactions || [],
        comments_count: item.comments_count || 0
      }));

      // Buscar comentários para cada novo check-in
      const isMock = groupId.startsWith('group');
      const newCommentsMap: Record<string, CommentItem[]> = {};

      if (isMock) {
        mapped.forEach(item => {
          newCommentsMap[item.id] = [
            {
              id: `comm_${item.id}_1`,
              content: 'Parabéns pela constância! Inspirador! 🔥',
              created_at: new Date(Date.now() - 3600000).toISOString(),
              user_id: 'user_2',
              profiles: {
                id: 'user_2',
                full_name: 'Sarah Souza',
                avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80'
              }
            },
            {
              id: `comm_${item.id}_2`,
              content: 'Vamos juntos, foco total! 🚀',
              created_at: new Date(Date.now() - 1800000).toISOString(),
              user_id: 'user_3',
              profiles: {
                id: 'user_3',
                full_name: 'Mateus Oliveira',
                avatar_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80'
              }
            }
          ];
        });
      } else {
        const commentsPromises = mapped.map(item =>
          api.getComments(item.id).then(comments => ({ id: item.id, comments }))
        );
        const results = await Promise.all(commentsPromises);
        results.forEach(res => {
          newCommentsMap[res.id] = res.comments;
        });
      }

      setFeedItems(prev => [...prev, ...mapped]);
      setCommentsMap(prev => ({ ...prev, ...newCommentsMap }));
      setHasMore(data.length === PAGE_SIZE);
    } catch (err) {
      console.error('Error fetching more feed:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [groupId, feedItems.length, loadingMore, hasMore]);

  // Limpar a legenda do post removendo o prefixo de ID de tarefa extra
  const getCleanNote = (note: string | null) => {
    if (!note) return null;
    if (note.startsWith('[EXTRA_TASK_ID:')) {
      const match = note.match(/^\[EXTRA_TASK_ID:([^\]]+)\]/);
      if (match) {
        const cleaned = note.substring(match[0].length).trim();
        // Se ficou vazio ou for apenas o fallback automático de conclusão manual
        if (!cleaned || cleaned === 'Concluído manualmente') {
          return null;
        }
        return cleaned;
      }
    }
    return note;
  };

  // Obter os metadados da tag do post (título, ícone, cor)
  const getPostBadge = (item: FeedItem) => {
    if (item.note && item.note.startsWith('[EXTRA_TASK_ID:')) {
      const match = item.note.match(/^\[EXTRA_TASK_ID:([^\]]+)\]/);
      const taskId = match ? match[1] : '';
      const title = extraTasksMap[taskId] || 'Tarefa Extra';

      return {
        title,
        icon: 'trophy-outline',
        color: COLORS.secondary,
      };
    }

    const habit = HABIT_META[item.type] ?? HABIT_META.bible;
    return {
      title: habit.title,
      icon: habit.icon,
      color: habit.color,
    };
  };

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // ── Reações estilo Facebook (Toggle e Popover) ──
  const handleToggleReaction = async (checkinId: string, emoji: string) => {
    const myId = user?.id ?? 'local';
    const isMock = groupId?.startsWith('group');
    
    // Atualização otimista local
    setFeedItems(prev =>
      prev.map(item => {
        if (item.id !== checkinId) return item;

        // Limpa a reação desse usuário de todas as outras reações existentes
        let cleanReactions = item.reactions.map(r => ({
          ...r,
          users: r.users.filter(id => id !== myId)
        })).filter(r => r.users.length > 0);

        const oldReaction = item.reactions.find(r => r.users.includes(myId));
        
        if (oldReaction && oldReaction.emoji === emoji) {
          // Clique no mesmo emoji remove a reação
          return { ...item, reactions: cleanReactions };
        } else {
          // Adiciona/Atualiza a reação
          const idx = cleanReactions.findIndex(r => r.emoji === emoji);
          if (idx === -1) {
            cleanReactions.push({ emoji, users: [myId] });
          } else {
            cleanReactions[idx].users.push(myId);
          }
          return { ...item, reactions: cleanReactions };
        }
      })
    );

    setActiveReactionCheckinId(null);

    // Persistência no banco
    if (!isMock && user) {
      try {
        await api.toggleReaction(checkinId, user.id, emoji);
      } catch (err) {
        console.error('Error persisting reaction:', err);
      }
    }
  };

  const handleLikePress = async (checkinId: string) => {
    const myId = user?.id ?? 'local';
    const item = feedItems.find(i => i.id === checkinId);
    if (!item) return;

    const userReaction = item.reactions.find(r => r.users.includes(myId));
    if (userReaction) {
      await handleToggleReaction(checkinId, userReaction.emoji);
    } else {
      await handleToggleReaction(checkinId, '👍');
    }
  };

  // ── Comentários Inline (Adicionar, Remover e Focar Input) ──
  const handleAddCommentInline = async (checkinId: string) => {
    const text = commentInputsText[checkinId]?.trim();
    if (!text || !user) return;

    setSendingCommentMap(prev => ({ ...prev, [checkinId]: true }));
    const isMock = groupId?.startsWith('group');

    if (isMock) {
      const newComment: CommentItem = {
        id: `comm_${Date.now()}`,
        content: text,
        created_at: new Date().toISOString(),
        user_id: user.id,
        profiles: {
          id: user.id,
          full_name: profile?.full_name || user.email?.split('@')[0] || 'Você',
          avatar_url: profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
        }
      };

      setCommentsMap(prev => ({
        ...prev,
        [checkinId]: [...(prev[checkinId] || []), newComment]
      }));
      setCommentInputsText(prev => ({ ...prev, [checkinId]: '' }));
      setSendingCommentMap(prev => ({ ...prev, [checkinId]: false }));

      setFeedItems(prev =>
        prev.map(item => {
          if (item.id === checkinId) {
            return { ...item, comments_count: (item.comments_count || 0) + 1 };
          }
          return item;
        })
      );
    } else {
      try {
        const added = await api.addComment(checkinId, user.id, text);
        setCommentsMap(prev => ({
          ...prev,
          [checkinId]: [...(prev[checkinId] || []), added]
        }));
        setCommentInputsText(prev => ({ ...prev, [checkinId]: '' }));

        setFeedItems(prev =>
          prev.map(item => {
            if (item.id === checkinId) {
              return { ...item, comments_count: (item.comments_count || 0) + 1 };
            }
            return item;
          })
        );
      } catch (err) {
        console.error('Failed to add comment:', err);
        Alert.alert('Erro', 'Não foi possível enviar o comentário.');
      } finally {
        setSendingCommentMap(prev => ({ ...prev, [checkinId]: false }));
      }
    }
  };

  const handleDeleteCommentInline = async (checkinId: string, commentId: string) => {
    Alert.alert(
      'Remover Comentário',
      'Deseja mesmo apagar o seu comentário?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            const isMock = groupId?.startsWith('group');
            if (isMock) {
              setCommentsMap(prev => ({
                ...prev,
                [checkinId]: (prev[checkinId] || []).filter(c => c.id !== commentId)
              }));
              setFeedItems(prev =>
                prev.map(item => {
                  if (item.id === checkinId) {
                    return { ...item, comments_count: Math.max(0, (item.comments_count || 0) - 1) };
                  }
                  return item;
                })
              );
            } else {
              try {
                await api.deleteComment(commentId);
                setCommentsMap(prev => ({
                  ...prev,
                  [checkinId]: (prev[checkinId] || []).filter(c => c.id !== commentId)
                }));
                setFeedItems(prev =>
                  prev.map(item => {
                    if (item.id === checkinId) {
                      return { ...item, comments_count: Math.max(0, (item.comments_count || 0) - 1) };
                    }
                    return item;
                  })
                );
              } catch (err) {
                console.error('Failed to delete comment:', err);
                Alert.alert('Erro', 'Não foi possível apagar o comentário.');
              }
            }
          }
        }
      ]
    );
  };

  const focusCommentInput = (checkinId: string) => {
    commentInputRefs.current[checkinId]?.focus();
  };

  const renderReactionPicker = () => {
    if (activeReactionCheckinId === null) return null;

    return (
      <Modal
        visible={activeReactionCheckinId !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActiveReactionCheckinId(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActiveReactionCheckinId(null)}
        >
          <View 
            style={[
              styles.reactionsPopover, 
              { 
                top: popoverCoords.y, 
                left: popoverCoords.x 
              }
            ]}
          >
            {FB_REACTIONS.map(reaction => (
              <TouchableOpacity
                key={reaction.emoji}
                style={styles.popoverEmojiBtn}
                onPress={() => handleToggleReaction(activeReactionCheckinId, reaction.emoji)}
                activeOpacity={0.6}
              >
                <Text style={styles.popoverEmojiText}>{reaction.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  // Renderizador do empilhamento de emojis estilo Facebook
  const renderReactionsSummary = (reactions: Reaction[]) => {
    if (!reactions || reactions.length === 0) return null;

    const totalCount = reactions.reduce((sum, r) => sum + r.users.length, 0);
    if (totalCount === 0) return null;

    const sortedReactions = [...reactions]
      .sort((a, b) => b.users.length - a.users.length)
      .slice(0, 3);

    return (
      <View style={styles.summaryContainer}>
        <View style={styles.reactionIconsGroup}>
          {sortedReactions.map((r, i) => (
            <View 
              key={r.emoji} 
              style={[
                styles.summaryEmojiContainer, 
                { marginLeft: i > 0 ? -6 : 0, zIndex: 3 - i }
              ]}
            >
              <Text style={styles.summaryEmojiText}>{r.emoji}</Text>
            </View>
          ))}
          <Text style={styles.totalReactionsText}>{totalCount}</Text>
        </View>
      </View>
    );
  };

  // ── Renderização de cada comentário inline ──
  const renderInlineCommentItem = (checkinId: string, item: CommentItem) => {
    const isMyComment = item.user_id === user?.id;
    const authorName = item.profiles?.full_name || 'Membro';
    const avatarUrl = item.profiles?.avatar_url || undefined;

    return (
      <View key={item.id} style={styles.inlineCommentItem}>
        <Avatar source={avatarUrl} name={authorName} size={28} />
        <View style={styles.inlineCommentContentContainer}>
          <View style={styles.inlineCommentBubble}>
            <View style={styles.inlineCommentBubbleHeader}>
              <Text style={styles.inlineCommentAuthorName}>{authorName}</Text>
              {isMyComment && (
                <TouchableOpacity onPress={() => handleDeleteCommentInline(checkinId, item.id)}>
                  <MaterialCommunityIcons name="delete-outline" size={14} color={COLORS.error} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.inlineCommentText}>{item.content}</Text>
          </View>
          <Text style={styles.inlineCommentTime}>
            {new Date(item.created_at).toLocaleDateString('pt-BR')} às {new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  // ── Renderização de cada post ──
  const renderItem = ({ item }: { item: FeedItem }) => {
    const badge = getPostBadge(item);
    const itemProfile = item.profiles;
    const name = itemProfile?.full_name ?? 'Membro';
    const avatarUrl = itemProfile?.avatar_url ?? undefined;
    const myId = user?.id ?? 'local';

    const userReaction = item.reactions.find(r => r.users.includes(myId));
    const activeReactionInfo = userReaction 
      ? FB_REACTIONS.find(r => r.emoji === userReaction.emoji) 
      : null;

    const hasReactions = item.reactions.some(r => r.users.length > 0);

    return (
      <Card variant="default" style={styles.feedCard}>
        {/* Header */}
        <View style={styles.postHeader}>
          <Avatar source={avatarUrl} name={name} size={40} />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{name}</Text>
            <Text style={styles.postTime}>
              {new Date(item.created_at).toLocaleDateString('pt-BR')}{' '}
              às{' '}
              {new Date(item.created_at).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <View style={[styles.habitBadge, { backgroundColor: badge.color }]}>
            <MaterialCommunityIcons name={badge.icon as any} size={12} color="#fff" />
            <Text style={styles.habitBadgeText}>{badge.title}</Text>
          </View>
        </View>

        {/* Nota / Legenda */}
        {(() => {
          const cleanNote = getCleanNote(item.note);
          return cleanNote ? (
            <Text style={styles.postCaption}>{cleanNote}</Text>
          ) : null;
        })()}

        {/* Imagem do Check-in */}
        {item.image_url ? (
          <View style={styles.postImageContainer}>
            <Image source={{ uri: item.image_url }} style={styles.postImage} />
          </View>
        ) : null}

        {/* Resumo de Reações e Comentários estilo Facebook */}
        {(hasReactions || (item.comments_count && item.comments_count > 0)) ? (
          <View style={styles.postMetaRow}>
            {/* Lado Esquerdo: Emojis agrupados */}
            {renderReactionsSummary(item.reactions)}
            
            {/* Lado Direito: Quantidade de Comentários */}
            {item.comments_count && item.comments_count > 0 ? (
              <TouchableOpacity onPress={() => {
                // Ao clicar no número de comentários, expande se colapsado e foca no input
                setExpandedCommentsCheckinIds(prev => ({ ...prev, [item.id]: true }));
                focusCommentInput(item.id);
              }}>
                <Text style={styles.commentsCountText}>
                  {item.comments_count} {item.comments_count === 1 ? 'comentário' : 'comentários'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* Rodapé: Botões de Ação estilo Facebook */}
        <View style={styles.actionButtonsRow}>
          {/* Botão Curtir / Reagir com Gesto Long Press */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleLikePress(item.id)}
            onLongPress={(event) => {
              if (Platform.OS !== 'web') {
                Vibration.vibrate(12);
              }
              const { pageX, pageY } = event.nativeEvent;
              const screenWidth = Dimensions.get('window').width;
              // Centralizar popover de reações com largura estimada de 285px
              let xPos = pageX - 142;
              if (xPos < 10) xPos = 10;
              if (xPos + 285 > screenWidth - 10) xPos = screenWidth - 295;
              
              setPopoverCoords({
                x: Math.max(10, xPos),
                y: pageY - 65
              });
              setActiveReactionCheckinId(item.id);
            }}
            delayLongPress={300}
            activeOpacity={0.7}
          >
            {activeReactionInfo ? (
              <View style={styles.activeReactionButtonContent}>
                <Text style={styles.activeReactionButtonEmoji}>{activeReactionInfo.emoji}</Text>
                <Text style={[styles.actionBtnText, { color: activeReactionInfo.color, fontWeight: 'bold' }]}>
                  {activeReactionInfo.name}
                </Text>
              </View>
            ) : (
              <View style={styles.actionButtonContent}>
                <MaterialCommunityIcons name="thumb-up-outline" size={20} color={COLORS.textSecondary} />
                <Text style={styles.actionBtnText}>Curtir</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Botão Comentar para focar input inline */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => focusCommentInput(item.id)}
            activeOpacity={0.7}
          >
            <View style={styles.actionButtonContent}>
              <MaterialCommunityIcons name="comment-outline" size={20} color={COLORS.textSecondary} />
              <Text style={styles.actionBtnText}>Comentar</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Seção de Comentários Inline */}
        <View style={styles.inlineCommentsSection}>
          {(() => {
            const checkinComments = commentsMap[item.id] || [];
            const isExpanded = expandedCommentsCheckinIds[item.id];
            // Exibir apenas os 3 comentários mais recentes de forma colapsada
            const displayComments = isExpanded ? checkinComments : checkinComments.slice(-3);
            const hiddenCount = checkinComments.length - displayComments.length;

            return (
              <>
                {hiddenCount > 0 && (
                  <TouchableOpacity
                    onPress={() => setExpandedCommentsCheckinIds(prev => ({ ...prev, [item.id]: true }))}
                    style={styles.expandCommentsBtn}
                  >
                    <Text style={styles.expandCommentsText}>
                      Ver comentários anteriores ({hiddenCount})
                    </Text>
                  </TouchableOpacity>
                )}

                {displayComments.map(comment => renderInlineCommentItem(item.id, comment))}

                {/* Caixa de Entrada Inline Permanente */}
                <View style={styles.inlineCommentInputContainer}>
                  <Avatar source={profile?.avatar_url || undefined} name={profile?.full_name || 'Você'} size={28} />
                  <TextInput
                    ref={el => {
                      commentInputRefs.current[item.id] = el;
                    }}
                    style={styles.inlineCommentInput}
                    placeholder="Escreva um comentário de apoio..."
                    value={commentInputsText[item.id] || ''}
                    onChangeText={text => setCommentInputsText(prev => ({ ...prev, [item.id]: text }))}
                    placeholderTextColor={COLORS.textLight}
                    maxLength={500}
                    multiline
                  />
                  <TouchableOpacity
                    style={[
                      styles.inlineCommentSendBtn,
                      !(commentInputsText[item.id] || '').trim() && styles.inlineCommentSendBtnDisabled
                    ]}
                    disabled={!(commentInputsText[item.id] || '').trim() || sendingCommentMap[item.id]}
                    onPress={() => handleAddCommentInline(item.id)}
                  >
                    {sendingCommentMap[item.id] ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <MaterialCommunityIcons name="send" size={16} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>
              </>
            );
          })()}
        </View>
      </Card>
    );
  };

  // ── Estados de tela ──
  if (loading) {
    return (
      <WebContainer>
        <SafeAreaView style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando feed…</Text>
        </SafeAreaView>
      </WebContainer>
    );
  }

  if (error) {
    return (
      <WebContainer>
        <SafeAreaView style={[styles.container, styles.centered]}>
          <MaterialCommunityIcons name="wifi-off" size={48} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>Algo deu errado</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchFeed()}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </WebContainer>
    );
  }

  return (
    <WebContainer>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Feed do Grupo</Text>
          <View style={{ width: 24 }} />
        </View>

        <FlatList
          data={feedItems}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchFeed(true)}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          onEndReached={fetchMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={() => (
            <Text style={styles.feedSubtitle}>
              Acompanhe o progresso diário dos seus amigos e apoie seus hábitos de fé e saúde!
            </Text>
          )}
          ListFooterComponent={() =>
            loadingMore ? (
              <ActivityIndicator
                size="small"
                color={COLORS.secondary}
                style={{ marginVertical: SPACING.lg }}
              />
            ) : null
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="newspaper-variant-multiple-outline"
                size={64}
                color={COLORS.textLight}
              />
              <Text style={styles.emptyTitle}>Nenhum check-in ainda</Text>
              <Text style={styles.emptySubtitle}>
                Seja o primeiro a fazer um check-in no seu grupo!
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => router.push('/(tabs)/checkin')}
              >
                <Text style={styles.retryText}>Fazer Check-in</Text>
              </TouchableOpacity>
            </View>
          )}
        />

        {/* Popover flutuante de reações estilo Facebook */}
        {renderReactionPicker()}


      </SafeAreaView>
    </WebContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
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
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },

  // ─ Card ─
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
  postTime: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 2,
  },
  habitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
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

  // ─ Reações estilo Facebook ─
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  reactionsPopover: {
    position: 'absolute',
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingHorizontal: 8,
    paddingVertical: 5,
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: 'rgba(225, 222, 227, 0.7)',
    alignItems: 'center',
    gap: 8,
    zIndex: 999,
  },
  popoverEmojiBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  popoverEmojiText: {
    fontSize: 22,
  },
  activeReactionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeReactionButtonEmoji: {
    fontSize: 16,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // ─ Resumo de reações ─
  postMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    paddingHorizontal: 2,
  },
  summaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionIconsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryEmojiContainer: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  summaryEmojiText: {
    fontSize: 11,
  },
  totalReactionsText: {
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    fontFamily: FONTS.family.bodySemibold,
    marginLeft: 6,
  },
  commentsCountText: {
    fontSize: FONTS.size.xs,
    color: COLORS.textLight,
    fontFamily: FONTS.family.body,
  },
  dividerLine: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.sm,
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs + 2,
    borderRadius: BORDER_RADIUS.md,
  },
  actionBtnText: {
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    fontFamily: FONTS.family.bodySemibold,
  },

  // ─ Comentários Inline ─
  inlineCommentsSection: {
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.sm,
  },
  expandCommentsBtn: {
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  expandCommentsText: {
    fontSize: FONTS.size.xs,
    color: COLORS.primary,
    fontFamily: FONTS.family.bodySemibold,
  },
  inlineCommentItem: {
    flexDirection: 'row',
    marginBottom: SPACING.xs + 2,
    gap: SPACING.xs + 2,
  },
  inlineCommentContentContainer: {
    flex: 1,
  },
  inlineCommentBubble: {
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  inlineCommentBubbleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 1,
  },
  inlineCommentAuthorName: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bodyBold,
    color: COLORS.primary,
  },
  inlineCommentText: {
    fontSize: FONTS.size.sm - 1,
    color: COLORS.text,
    fontFamily: FONTS.family.body,
    lineHeight: 16,
  },
  inlineCommentTime: {
    fontSize: 9,
    color: COLORS.textLight,
    fontFamily: FONTS.family.body,
    marginTop: 2,
    marginLeft: 4,
  },
  inlineCommentInputContainer: {
    flexDirection: 'row',
    marginTop: SPACING.sm,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  inlineCommentInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? 6 : 4,
    fontSize: FONTS.size.sm - 1,
    color: COLORS.text,
    fontFamily: FONTS.family.body,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    maxHeight: 80,
  },
  inlineCommentSendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineCommentSendBtnDisabled: {
    backgroundColor: COLORS.border,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: SPACING.xl * 2,
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONTS.size.lg,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
  loadingText: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  retryButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
  },
  retryText: {
    color: '#fff',
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
  },
});
