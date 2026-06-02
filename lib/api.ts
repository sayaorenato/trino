import { supabase } from './supabase';

export const api = {
  async getUserGroups(userId: string) {
    const { data, error } = await supabase
      .from('group_members')
      .select('group_id, groups(*)')
      .eq('user_id', userId);
      
    if (error) {
      console.error('Error fetching user groups:', error);
      return [];
    }
    
    // Formata o retorno para retornar apenas os dados do grupo
    return data.map((item: any) => item.groups);
  },

  async getActiveChallenge(groupId: string) {
    const { data, error } = await supabase
      .from('challenges')
      .select('*, rounds(*)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (error && error.code !== 'PGRST116') { // PGRST116 = Nenhum resultado retornado do single()
      console.error('Error fetching active challenge:', error);
    }
    return data;
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

  async getGroupFeed(groupId: string) {
    // Usar a estrutura relacional para buscar o grupo do round
    const { data, error } = await supabase
      .from('checkins')
      .select(`
        *,
        profiles (id, full_name, avatar_url),
        rounds!inner (
          challenge_id,
          challenges!inner (
            group_id
          )
        )
      `)
      .eq('rounds.challenges.group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (error) {
      console.error('Error fetching feed:', error);
      return [];
    }
    return data;
  }
};
