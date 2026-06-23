import { supabase } from './supabase';
import { MOCK_CHALLENGES, MOCK_ROUNDS } from '../constants/mock-data';

export const api = {
  async getUserGroups(userId: string) {
    const { data, error } = await supabase
      .from('group_members')
      .select('group_id, role, groups(*)')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user groups:', error);
      return [];
    }

    return data.map((item: any) => ({
      ...item.groups,
      role: item.role,
    }));
  },

  async getActiveChallenge(groupId: string) {
    // Fallback para grupos mockados
    if (groupId.startsWith('group')) {
      const mockChal = Object.values(MOCK_CHALLENGES).find(c => c.group_id === groupId);
      if (mockChal) {
        return {
          ...mockChal,
          rounds: MOCK_ROUNDS[mockChal.id] || []
        };
      }
      return null;
    }

    const { data, error } = await supabase
      .from('challenges')
      .select('*, rounds(*)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching active challenge:', error);
    }
    return data;
  },

  async getDashboardData(userId: string) {
    const groups = await this.getUserGroups(userId);

    const groupsWithChallenges = await Promise.all(
      groups.map(async (group: any) => {
        const challenges = await this.getGroupChallenges(group.id);
        const challenge = challenges.length > 0 ? challenges[0] : null;
        return { ...group, challenges, challenge };
      })
    );

    const allRoundIds = groupsWithChallenges
      .flatMap((g: any) => (g.challenges || []).flatMap((c: any) => c.rounds || []))
      .map((r: any) => r.id);

    if (allRoundIds.length === 0) {
      return { groups: groupsWithChallenges, habits: { prayer: false, bible: false, exercise: false } };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayCheckins } = await supabase
      .from('checkins')
      .select('type, round_id')
      .eq('user_id', userId)
      .in('round_id', allRoundIds)
      .gte('created_at', today.toISOString());

    const habitsState = { prayer: false, bible: false, exercise: false };
    (todayCheckins || []).forEach((c: any) => {
      if (c.type === 'pray') habitsState.prayer = true;
      if (c.type === 'bible') habitsState.bible = true;
      if (c.type === 'workout') habitsState.exercise = true;
    });

    return { groups: groupsWithChallenges, habits: habitsState };
  },

  async getTodayCheckins(userId: string, roundId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('checkins')
      .select('type')
      .eq('user_id', userId)
      .eq('round_id', roundId)
      .gte('created_at', today.toISOString());

    if (error) {
      console.error('Error fetching today checkins:', error);
      return [];
    }
    return data;
  },

  /**
   * Busca o feed de check-ins de um grupo em duas etapas para compatibilidade com RLS:
   * 1. Busca os IDs dos rounds via desafio ativo do grupo
   * 2. Filtra checkins por round_id com join em profiles
   */
  async getGroupFeed(groupId: string, limit = 20, offset = 0) {
    // Etapa 1 — Buscar o desafio mais recente e seus rounds
    const { data: challengeData, error: challengeError } = await supabase
      .from('challenges')
      .select('id, rounds(id)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (challengeError && challengeError.code !== 'PGRST116') {
      console.error('Error fetching challenge for feed:', challengeError);
      return [];
    }

    if (!challengeData) return [];

    const roundIds: string[] = (challengeData.rounds as any[]).map((r) => r.id);
    if (roundIds.length === 0) return [];

    // Etapa 2 — Buscar checkins filtrando por esses round_ids
    const { data, error } = await supabase
      .from('checkins')
      .select(`
        id,
        user_id,
        round_id,
        type,
        image_url,
        note,
        verified,
        created_at,
        profiles (
          id,
          full_name,
          avatar_url
        )
      `)
      .in('round_id', roundIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching feed checkins:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    const checkinIds = data.map((c: any) => c.id);

    // Buscar reações em lote
    const { data: reactionsData } = await supabase
      .from('checkin_reactions')
      .select('checkin_id, emoji, user_id')
      .in('checkin_id', checkinIds);

    // Buscar comentários em lote para contar
    const { data: commentsCountData } = await supabase
      .from('checkin_comments')
      .select('checkin_id')
      .in('checkin_id', checkinIds);

    const reactionsMap: Record<string, { emoji: string; users: string[] }[]> = {};
    (reactionsData || []).forEach((r: any) => {
      if (!reactionsMap[r.checkin_id]) {
        reactionsMap[r.checkin_id] = [];
      }
      const existingEmoji = reactionsMap[r.checkin_id].find(e => e.emoji === r.emoji);
      if (existingEmoji) {
        existingEmoji.users.push(r.user_id);
      } else {
        reactionsMap[r.checkin_id].push({ emoji: r.emoji, users: [r.user_id] });
      }
    });

    const commentsCountMap: Record<string, number> = {};
    (commentsCountData || []).forEach((c: any) => {
      commentsCountMap[c.checkin_id] = (commentsCountMap[c.checkin_id] || 0) + 1;
    });

    return data.map((item: any) => ({
      ...item,
      reactions: reactionsMap[item.id] || [],
      comments_count: commentsCountMap[item.id] || 0
    }));
  },

  /**
   * Faz upload de uma imagem de check-in para o Supabase Storage (bucket 'checkins').
   * Path: {userId}/{timestamp}.{ext}  — compatível com a política de storage RLS.
   * Retorna a URL pública ou null em caso de erro.
   */
  async uploadCheckinImage(userId: string, localUri: string): Promise<string | null> {
    try {
      const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const fileName = `${userId}/${Date.now()}.${ext}`;
      const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

      const response = await fetch(localUri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('checkins')
        .upload(fileName, blob, { contentType, upsert: false });

      if (uploadError) {
        console.error('Error uploading checkin image:', uploadError);
        return null;
      }

      const { data } = supabase.storage
        .from('checkins')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (err) {
      console.error('Unexpected error uploading image:', err);
      return null;
    }
  },

  /**
   * Busca todos os membros de um grupo com dados de perfil.
   * Admins aparecem primeiro, depois membros, ordenados por joined_at.
   */
  async getGroupMembers(groupId: string) {
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        user_id,
        role,
        joined_at,
        profiles (
          id,
          full_name,
          avatar_url,
          email
        )
      `)
      .eq('group_id', groupId)
      .order('role', { ascending: true })
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('Error fetching group members:', error);
      return [];
    }

    return (data || []).map((item: any) => ({
      user_id: item.user_id,
      role: item.role,
      joined_at: item.joined_at,
      full_name: item.profiles?.full_name || 'Sem nome',
      avatar_url: item.profiles?.avatar_url || null,
      email: item.profiles?.email || '',
    }));
  },

  /**
   * Busca todos os desafios de um grupo, ordenados do mais recente ao mais antigo.
   */
  async getGroupChallenges(groupId: string) {
    if (groupId.startsWith('group')) {
      const mockChals = Object.values(MOCK_CHALLENGES).filter(c => c.group_id === groupId);
      return mockChals.map(c => ({
        ...c,
        rounds: MOCK_ROUNDS[c.id] || []
      }));
    }

    const { data, error } = await supabase
      .from('challenges')
      .select('*, rounds(id, round_number, start_date, end_date)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching group challenges:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Promove um membro a admin do grupo.
   */
  async promoteToAdmin(groupId: string, userId: string) {
    const { error } = await supabase
      .from('group_members')
      .update({ role: 'admin' })
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error promoting member:', error);
      throw error;
    }
  },

  async getComments(checkinId: string) {
    const { data, error } = await supabase
      .from('checkin_comments')
      .select(`
        id,
        content,
        created_at,
        user_id,
        profiles (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('checkin_id', checkinId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
    return (data || []).map((c: any) => ({
      ...c,
      profiles: Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
    }));
  },

  async addComment(checkinId: string, userId: string, content: string) {
    const { data, error } = await supabase
      .from('checkin_comments')
      .insert({
        checkin_id: checkinId,
        user_id: userId,
        content: content
      })
      .select(`
        id,
        content,
        created_at,
        user_id,
        profiles (
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
    return {
      ...data,
      profiles: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles
    };
  },

  async deleteComment(commentId: string) {
    const { error } = await supabase
      .from('checkin_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  },

  async getReactions(checkinId: string) {
    const { data, error } = await supabase
      .from('checkin_reactions')
      .select('emoji, user_id')
      .eq('checkin_id', checkinId);

    if (error) {
      console.error('Error fetching reactions:', error);
      return [];
    }
    return data || [];
  },

  async toggleReaction(checkinId: string, userId: string, emoji: string) {
    const { data: existing, error: fetchError } = await supabase
      .from('checkin_reactions')
      .select('id, emoji')
      .eq('checkin_id', checkinId)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error checking existing reaction:', fetchError);
      throw fetchError;
    }

    if (existing) {
      if (existing.emoji === emoji) {
        const { error: deleteError } = await supabase
          .from('checkin_reactions')
          .delete()
          .eq('id', existing.id);

        if (deleteError) throw deleteError;
        return { action: 'removed', emoji };
      } else {
        const { error: updateError } = await supabase
          .from('checkin_reactions')
          .update({ emoji })
          .eq('id', existing.id);

        if (updateError) throw updateError;
        return { action: 'updated', emoji };
      }
    } else {
      const { error: insertError } = await supabase
        .from('checkin_reactions')
        .insert({
          checkin_id: checkinId,
          user_id: userId,
          emoji
        });

      if (insertError) throw insertError;
      return { action: 'added', emoji };
    }
  }
};
