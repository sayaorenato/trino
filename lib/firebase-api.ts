import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { updatePassword as fbUpdatePassword } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from './firebase';
import { 
  MOCK_CHALLENGES, 
  MOCK_ROUNDS, 
  MOCK_RANKINGS, 
  USER_MOCK_GROUPS, 
  getMockRankings, 
  saveMockRankings 
} from '../constants/mock-data';

export interface WeeklyTheme {
  text: string;
  reference: string;
  updated_at?: string;
}

const DEFAULT_WEEKLY_THEME: WeeklyTheme = {
  text: "Não fui eu que ordenei a você? Seja forte e corajoso! Não se apavore nem desanime, pois o Senhor, o seu Deus, estará com você por onde você andar.",
  reference: "Josué 1:9 • Tema da Semana"
};

function getFileInfo(uri: string) {
  let ext = 'jpg';
  let contentType = 'image/jpeg';

  if (uri.startsWith('data:')) {
    const match = uri.match(/^data:(image\/(png|jpeg|jpg|webp));base64,/);
    if (match) {
      contentType = match[1];
      ext = match[2] === 'jpeg' ? 'jpg' : match[2];
    }
  } else {
    const cleanUri = uri.split('?')[0].split('#')[0];
    const pathExt = cleanUri.split('.').pop()?.toLowerCase();
    if (pathExt && ['png', 'jpg', 'jpeg', 'webp'].includes(pathExt)) {
      ext = pathExt;
      contentType = pathExt === 'png' ? 'image/png' : 'image/jpeg';
    }
  }

  return { ext, contentType };
}

export const api = {
  async getUserGroups(userId: string) {
    if (!userId) return USER_MOCK_GROUPS;

    try {
      const q = query(collection(db, 'group_members'), where('user_id', '==', userId));
      const querySnapshot = await getDocs(q);

      const userGroups: any[] = [];
      for (const memberDoc of querySnapshot.docs) {
        const memberData = memberDoc.data();
        if (memberData.group_id) {
          const groupSnap = await getDoc(doc(db, 'groups', memberData.group_id));
          if (groupSnap.exists()) {
            userGroups.push({
              id: groupSnap.id,
              ...groupSnap.data(),
              role: memberData.role || 'member'
            });
          }
        }
      }

      const isRealUser = userId && !userId.startsWith('user_');
      if (userGroups.length > 0 || isRealUser) {
        return userGroups.sort((a, b) => {
          if (a.role === 'admin' && b.role !== 'admin') return -1;
          if (a.role !== 'admin' && b.role === 'admin') return 1;
          return 0;
        });
      }
    } catch (error) {
      console.warn('Erro ao buscar grupos no Firestore, usando fallback:', error);
    }

    // Fallback para mock local
    const combinedGroups = [...USER_MOCK_GROUPS];
    return combinedGroups.sort((a, b) => {
      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (a.role !== 'admin' && b.role === 'admin') return 1;
      return 0;
    });
  },

  async createGroup(name: string, description: string, userId: string) {
    const trimmedName = name.trim();
    const lowerName = trimmedName.toLowerCase();

    // 1. Verificar duplicidade de nome
    try {
      const q = query(collection(db, 'groups'), where('name_lower', '==', lowerName));
      const snap = await getDocs(q);
      if (!snap.empty) {
        throw new Error('Já existe um grupo cadastrado com este nome. Por favor, escolha outro nome para o seu grupo.');
      }
    } catch (err: any) {
      if (err?.message?.includes('Já existe um grupo')) throw err;
    }

    // 2. Criar código de convite
    const cleanName = trimmedName.replace(/[^A-Za-z]/g, '').toUpperCase();
    const prefix = cleanName.substring(0, 3).padEnd(3, 'T');
    const randomNum = Math.floor(100 + Math.random() * 900);
    const inviteCode = `TRI-${prefix}-${randomNum}`;

    // 3. Salvar documento do grupo
    const groupPayload = {
      name: trimmedName,
      name_lower: lowerName,
      description: description.trim(),
      invite_code: inviteCode,
      created_by: userId,
      created_at: new Date().toISOString()
    };
    const groupRef = await addDoc(collection(db, 'groups'), groupPayload);

    // 4. Salvar associação do usuário como admin
    await addDoc(collection(db, 'group_members'), {
      user_id: userId,
      group_id: groupRef.id,
      role: 'admin',
      joined_at: new Date().toISOString()
    });

    return {
      id: groupRef.id,
      ...groupPayload
    };
  },

  async getGroupById(groupId: string): Promise<any> {
    if (!groupId) return null;
    if (groupId.startsWith('group')) {
      return USER_MOCK_GROUPS.find(g => g.id === groupId) || null;
    }
    try {
      const snap = await getDoc(doc(db, 'groups', groupId));
      if (snap.exists()) {
        const data = snap.data();
        // Lógica auto-healing para invite_code se ausente
        if (!data.invite_code && data.name) {
          const cleanName = data.name.replace(/[^A-Za-z]/g, '').toUpperCase();
          const prefix = cleanName.substring(0, 3).padEnd(3, 'T');
          const randomNum = Math.floor(100 + Math.random() * 900);
          const genCode = `TRI-${prefix}-${randomNum}`;
          try {
            await updateDoc(doc(db, 'groups', groupId), { invite_code: genCode });
            data.invite_code = genCode;
          } catch {}
        }
        return { id: snap.id, ...data };
      }
    } catch (error) {
      console.warn('Erro ao buscar grupo:', error);
    }
    return null;
  },

  async getUserGroupRole(groupId: string, userId: string): Promise<'admin' | 'member' | null> {
    if (!groupId || !userId) return null;
    if (groupId.startsWith('group')) {
      const g = USER_MOCK_GROUPS.find(item => item.id === groupId);
      return (g?.role as 'admin' | 'member') || 'member';
    }
    try {
      const q = query(
        collection(db, 'group_members'),
        where('group_id', '==', groupId),
        where('user_id', '==', userId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return (snap.docs[0].data().role as 'admin' | 'member') || 'member';
      }
    } catch (error) {
      console.warn('Erro ao buscar role:', error);
    }
    return null;
  },

  async updateGroup(groupId: string, data: { name?: string; description?: string; invite_code?: string }) {
    const payload: any = { ...data, updated_at: new Date().toISOString() };
    if (data.name) {
      payload.name = data.name.trim();
      payload.name_lower = data.name.trim().toLowerCase();
    }
    await updateDoc(doc(db, 'groups', groupId), payload);
    return { id: groupId, ...payload };
  },

  async deleteGroup(groupId: string) {
    await deleteDoc(doc(db, 'groups', groupId));
    try {
      const q = query(collection(db, 'group_members'), where('group_id', '==', groupId));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } catch {}
    return true;
  },

  async getGroupMembers(groupId: string) {
    if (!groupId) return [];
    if (groupId.startsWith('group')) {
      return [
        { user_id: 'user_1', full_name: 'Você', role: 'admin', joined_at: new Date().toISOString() },
        { user_id: 'user_2', full_name: 'Lucas Silva', role: 'member', joined_at: new Date().toISOString() },
        { user_id: 'user_3', full_name: 'Ana Souza', role: 'member', joined_at: new Date().toISOString() }
      ];
    }
    try {
      const q = query(collection(db, 'group_members'), where('group_id', '==', groupId));
      const snap = await getDocs(q);
      const members: any[] = [];
      for (const d of snap.docs) {
        const memData = d.data();
        let fullName = 'Membro';
        let avatarUrl = null;
        try {
          const uSnap = await getDoc(doc(db, 'users', memData.user_id));
          if (uSnap.exists()) {
            const uData = uSnap.data();
            fullName = uData.full_name || uData.username || 'Membro';
            avatarUrl = uData.avatar_url || null;
          }
        } catch {}

        members.push({
          id: d.id,
          user_id: memData.user_id,
          group_id: groupId,
          role: memData.role || 'member',
          joined_at: memData.joined_at || new Date().toISOString(),
          full_name: fullName,
          avatar_url: avatarUrl
        });
      }
      return members;
    } catch (error) {
      console.warn('Erro ao buscar membros:', error);
      return [];
    }
  },

  async removeMemberFromGroup(groupId: string, userId: string) {
    const q = query(
      collection(db, 'group_members'),
      where('group_id', '==', groupId),
      where('user_id', '==', userId)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    return true;
  },

  async promoteToAdmin(groupId: string, userId: string) {
    const q = query(
      collection(db, 'group_members'),
      where('group_id', '==', groupId),
      where('user_id', '==', userId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      await updateDoc(snap.docs[0].ref, { role: 'admin' });
      return true;
    }
    throw new Error('Membro não encontrado no grupo.');
  },

  async updateMemberRole(groupId: string, userId: string, role: string) {
    const q = query(
      collection(db, 'group_members'),
      where('group_id', '==', groupId),
      where('user_id', '==', userId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      await updateDoc(snap.docs[0].ref, { role });
      return true;
    }
    return false;
  },

  async getGroupByInviteCode(inviteCode: string): Promise<any> {
    const cleanCode = inviteCode.trim().toUpperCase();
    const q = query(collection(db, 'groups'), where('invite_code', '==', cleanCode));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() };
    }
    return null;
  },

  async joinGroupByCode(inviteCode: string, userId: string) {
    const group = await this.getGroupByInviteCode(inviteCode);
    if (!group) {
      throw new Error('Código de convite inválido ou grupo não encontrado.');
    }

    const q = query(
      collection(db, 'group_members'),
      where('group_id', '==', group.id),
      where('user_id', '==', userId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return group;
    }

    await addDoc(collection(db, 'group_members'), {
      group_id: group.id,
      user_id: userId,
      role: 'member',
      joined_at: new Date().toISOString()
    });

    return group;
  },

  async joinGroup(groupId: string, userId: string) {
    if (!groupId || !userId) return;
    const q = query(
      collection(db, 'group_members'),
      where('group_id', '==', groupId),
      where('user_id', '==', userId)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      await addDoc(collection(db, 'group_members'), {
        group_id: groupId,
        user_id: userId,
        role: 'member',
        joined_at: new Date().toISOString()
      });
    }
    return true;
  },

  async getActiveChallenge(groupId: string) {
    if (!groupId) return null;

    try {
      const challenges = await this.getGroupChallenges(groupId);
      if (challenges.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const active = challenges.find((c: any) => {
          if (!c.end_date) return true;
          const parts = c.end_date.split('-');
          if (parts.length === 3) {
            const end = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 23, 59, 59, 999);
            return end >= today;
          }
          const end = new Date(c.end_date);
          end.setHours(23, 59, 59, 999);
          return end >= today;
        });
        return active || challenges[0];
      }
    } catch (e) {
      console.warn('Erro em getActiveChallenge:', e);
    }

    if (groupId.startsWith('group')) {
      const mockChal = Object.values(MOCK_CHALLENGES).find(c => c.group_id === groupId);
      if (mockChal) {
        return {
          ...mockChal,
          rounds: MOCK_ROUNDS[mockChal.id] || []
        };
      }
    }

    return null;
  },

  async getChallengeById(challengeId: string): Promise<any> {
    if (!challengeId) return null;

    try {
      const snap = await getDoc(doc(db, 'challenges', challengeId));
      if (snap.exists()) {
        const data = snap.data();
        return {
          id: snap.id,
          name: data.title || data.name,
          ...data,
          rounds: data.rounds || []
        };
      }
    } catch (error) {
      console.warn('Erro ao buscar desafio por ID no Firestore:', error);
    }

    if (challengeId.startsWith('chal')) {
      const mockChal = MOCK_CHALLENGES[challengeId];
      if (mockChal) {
        return {
          ...mockChal,
          rounds: MOCK_ROUNDS[mockChal.id] || []
        };
      }
    }
    return null;
  },

  async createChallenge(data: {
    groupId: string;
    title: string;
    rules: any;
    startDate: string;
    endDate: string;
    rounds?: any[];
    createdBy?: string;
  }) {
    const payload = {
      group_id: data.groupId,
      title: data.title,
      name: data.title,
      rules: data.rules,
      start_date: data.startDate,
      end_date: data.endDate,
      rounds: data.rounds || [],
      created_by: data.createdBy || null,
      created_at: new Date().toISOString()
    };
    const ref = await addDoc(collection(db, 'challenges'), payload);
    return { id: ref.id, ...payload };
  },

  async updateChallenge(challengeId: string, data: any) {
    const ref = doc(db, 'challenges', challengeId);
    await updateDoc(ref, {
      ...data,
      updated_at: new Date().toISOString()
    });
    return { id: challengeId, ...data };
  },

  async deleteChallenge(challengeId: string) {
    if (!challengeId) return true;
    try {
      await deleteDoc(doc(db, 'challenges', challengeId));

      const batch = writeBatch(db);

      // Limpar rounds
      try {
        const rQ = query(collection(db, 'rounds'), where('challenge_id', '==', challengeId));
        const rSnap = await getDocs(rQ);
        rSnap.docs.forEach(d => batch.delete(d.ref));
      } catch {}

      // Limpar tasks
      try {
        const tQ = query(collection(db, 'tasks'), where('challenge_id', '==', challengeId));
        const tSnap = await getDocs(tQ);
        tSnap.docs.forEach(d => batch.delete(d.ref));
      } catch {}

      // Limpar extra_tasks
      try {
        const etQ = query(collection(db, 'extra_tasks'), where('challenge_id', '==', challengeId));
        const etSnap = await getDocs(etQ);
        etSnap.docs.forEach(d => batch.delete(d.ref));
      } catch {}

      // Limpar challenge_participants
      try {
        const cpQ = query(collection(db, 'challenge_participants'), where('challenge_id', '==', challengeId));
        const cpSnap = await getDocs(cpQ);
        cpSnap.docs.forEach(d => batch.delete(d.ref));
      } catch {}

      // Limpar challenge_requests
      try {
        const crQ = query(collection(db, 'challenge_requests'), where('challenge_id', '==', challengeId));
        const crSnap = await getDocs(crQ);
        crSnap.docs.forEach(d => batch.delete(d.ref));
      } catch {}

      await batch.commit();

      // Limpar mocks em memória e storage local se existirem
      try {
        const { MOCK_CHALLENGES, MOCK_ROUNDS, MOCK_RANKINGS, MOCK_EXTRA_TASKS, saveMockRankings } = require('../constants/mock-data');
        if (MOCK_CHALLENGES) delete MOCK_CHALLENGES[challengeId];
        if (MOCK_ROUNDS) delete MOCK_ROUNDS[challengeId];
        if (MOCK_RANKINGS) {
          delete MOCK_RANKINGS[challengeId];
          await saveMockRankings();
        }
        if (MOCK_EXTRA_TASKS) delete MOCK_EXTRA_TASKS[challengeId];
      } catch {}
    } catch (e) {
      console.warn('Erro ao deletar desafio:', e);
    }
    return true;
  },

  async getGroupChallenges(groupId: string) {
    if (!groupId) return [];

    let dbChallenges: any[] = [];
    try {
      const q = query(
        collection(db, 'challenges'),
        where('group_id', '==', groupId)
      );
      const snap = await getDocs(q);
      dbChallenges = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        rounds: d.data().rounds || []
      }));
    } catch (error) {
      console.warn('Erro ao listar desafios do grupo no Firestore:', error);
    }

    if (dbChallenges.length > 0) {
      return dbChallenges.sort((a: any, b: any) => 
        new Date(b.created_at || b.start_date || 0).getTime() - new Date(a.created_at || a.start_date || 0).getTime()
      );
    }

    if (groupId.startsWith('group')) {
      const mockChal = Object.values(MOCK_CHALLENGES).filter(c => c.group_id === groupId);
      return mockChal.map(c => ({
        ...c,
        rounds: MOCK_ROUNDS[c.id] || []
      }));
    }

    return [];
  },

  async getAllChallenges() {
    try {
      const snap = await getDocs(collection(db, 'challenges'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data(), rounds: d.data().rounds || [] }));
      if (list.length > 0) {
        return list.sort((a: any, b: any) => 
          new Date(b.created_at || b.start_date || 0).getTime() - new Date(a.created_at || a.start_date || 0).getTime()
        );
      }
    } catch {}
    return Object.values(MOCK_CHALLENGES);
  },

  async getChallengeRanking(challengeId: string): Promise<any[]> {
    if (!challengeId) return [];

    try {
      // 1. Buscar os check-ins feitos para este desafio no Firestore
      let checkinsList: any[] = [];
      try {
        const cQ = query(
          collection(db, 'checkins'),
          where('challenge_id', '==', challengeId)
        );
        const cSnap = await getDocs(cQ);
        checkinsList = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        console.warn('Erro ao buscar checkins por challenge_id:', err);
      }

      // Se não encontrou checkins diretos e tiver rounds, tentar buscar por round_ids
      if (checkinsList.length === 0) {
        try {
          const chal = await this.getChallengeById(challengeId);
          const roundIds = (chal?.rounds || []).map((r: any) => r.id).filter(Boolean);
          if (roundIds.length > 0) {
            const rQ = query(
              collection(db, 'checkins'),
              where('round_id', 'in', roundIds.slice(0, 10))
            );
            const rSnap = await getDocs(rQ);
            checkinsList = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          }
        } catch {}
      }

      // 2. Buscar participantes oficiais da coleção 'challenge_participants'
      let participantsList: any[] = [];
      try {
        const partQ = query(
          collection(db, 'challenge_participants'),
          where('challenge_id', '==', challengeId)
        );
        const partSnap = await getDocs(partQ);
        participantsList = partSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        console.warn('Erro ao buscar challenge_participants:', err);
      }

      // 3. Buscar membros do grupo associado ao desafio (se houver)
      let groupMembers: any[] = [];
      try {
        const chal = await this.getChallengeById(challengeId);
        if (chal?.group_id) {
          groupMembers = await this.getGroupMembers(chal.group_id);
        }
      } catch {}

      // 4. Carregar mock rankings persistidos se existirem
      const { MOCK_RANKINGS, getMockRankings } = require('../constants/mock-data');
      await getMockRankings();
      const mockMembers = MOCK_RANKINGS[challengeId] || [];

      // 5. Unificar todos os participantes em um Map por user_id
      const participantsMap = new Map<string, any>();

      // Adicionar mock members (base de demonstração/inicial)
      mockMembers.forEach((m: any) => {
        participantsMap.set(m.user_id, {
          user_id: m.user_id,
          name: m.name || m.full_name || 'Participante',
          avatar_url: m.avatar_url || null,
          points: m.points || 0,
          streak: m.streak || 0,
          rounds_won: m.rounds_won || 0,
          checkin_count: m.checkin_count || 0
        });
      });

      // Adicionar membros do grupo
      groupMembers.forEach((m: any) => {
        if (!participantsMap.has(m.user_id)) {
          participantsMap.set(m.user_id, {
            user_id: m.user_id,
            name: m.full_name || 'Participante',
            avatar_url: m.avatar_url || null,
            points: 0,
            streak: m.streak || 0,
            rounds_won: 0,
            checkin_count: 0
          });
        }
      });

      // Adicionar challenge_participants
      participantsList.forEach((p: any) => {
        const existing = participantsMap.get(p.user_id);
        participantsMap.set(p.user_id, {
          user_id: p.user_id,
          name: p.user_name || p.full_name || existing?.name || 'Participante',
          avatar_url: p.user_avatar || p.avatar_url || existing?.avatar_url || null,
          points: Math.max(p.points || 0, existing?.points || 0),
          streak: p.streak || existing?.streak || 0,
          rounds_won: p.rounds_won || existing?.rounds_won || 0,
          checkin_count: existing?.checkin_count || 0
        });
      });

      // Adicionar qualquer usuário que tenha feito checkin
      checkinsList.forEach((c: any) => {
        if (c.user_id && !participantsMap.has(c.user_id)) {
          participantsMap.set(c.user_id, {
            user_id: c.user_id,
            name: c.user_name || 'Participante',
            avatar_url: c.user_avatar || null,
            points: 0,
            streak: 0,
            rounds_won: 0,
            checkin_count: 0
          });
        }
      });

      // 6. Recalcular os pontos com base em TODOS os check-ins reais encontrados
      const finalRanking = Array.from(participantsMap.values()).map(participant => {
        const userCheckins = checkinsList.filter(c => c.user_id === participant.user_id);
        
        let calculatedPoints = 0;
        let lastCheckinIso: string | null = null;

        userCheckins.forEach((c: any) => {
          let pts = 10;
          if (typeof c.points === 'number' && c.points > 0) {
            pts = c.points;
          } else if (c.note && (c.note.startsWith('[TAREFA EXTRA]') || c.note.startsWith('[EXTRA_TASK_ID:'))) {
            pts = 30;
          }
          calculatedPoints += pts;

          if (c.created_at) {
            if (!lastCheckinIso || c.created_at > lastCheckinIso) {
              lastCheckinIso = c.created_at;
            }
          }
        });

        // Garantir que a pontuação reflita os pontos calculados de check-ins ou pontos salvos
        const totalPoints = Math.max(calculatedPoints, participant.points || 0);

        return {
          ...participant,
          points: totalPoints,
          checkin_count: Math.max(userCheckins.length, participant.checkin_count || 0),
          last_checkin: lastCheckinIso
        };
      });

      // 7. Ordenar estritamente decrescente por pontos (quem tem maior pontuação no topo)
      finalRanking.sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }
        if ((b.checkin_count || 0) !== (a.checkin_count || 0)) {
          return (b.checkin_count || 0) - (a.checkin_count || 0);
        }
        return (a.name || '').localeCompare(b.name || '');
      });

      // 8. Atribuir posição sequencial (1, 2, 3...)
      return finalRanking.map((item, idx) => ({
        ...item,
        position: idx + 1,
        rank: idx + 1
      }));
    } catch (e) {
      console.warn('Erro ao calcular ranking:', e);
      return [];
    }
  },

  async getDashboardData(userId: string) {
    const groups = await this.getUserGroups(userId);

    // Buscar quais desafios o usuário participa oficialmente no Firestore
    const userChallengeIds = new Set<string>();
    if (userId && !userId.startsWith('user_')) {
      try {
        const cpQ = query(collection(db, 'challenge_participants'), where('user_id', '==', userId));
        const cpSnap = await getDocs(cpQ);
        cpSnap.docs.forEach(d => {
          const cId = d.data().challenge_id;
          if (cId) userChallengeIds.add(cId);
        });
      } catch (cpErr) {
        console.warn('Erro ao verificar challenge_participants do usuário:', cpErr);
      }
    }

    const groupsWithChallenges = await Promise.all(
      groups.map(async (group: any) => {
        const challenges = await this.getGroupChallenges(group.id);

        let memberCount = 5;
        try {
          if (!group.id.startsWith('group')) {
            const memQ = query(collection(db, 'group_members'), where('group_id', '==', group.id));
            const memSnap = await getDocs(memQ);
            memberCount = memSnap.size;
          }
        } catch {}

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const enrichedChallenges = challenges.map((c: any) => {
          const isUserAdmin = group.role === 'admin';
          const isCreator = c.created_by === userId;
          const isParticipant = userChallengeIds.has(c.id);
          const inMockRanking = (MOCK_RANKINGS[c.id] || []).some((m: any) => m.user_id === userId);
          return {
            ...c,
            userParticipates: isUserAdmin || isCreator || isParticipant || inMockRanking
          };
        });

        const activeChallengesCount = enrichedChallenges.filter((c: any) => {
          if (!c.end_date) return true;
          const parts = c.end_date.split('-');
          if (parts.length === 3) {
            const end = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 23, 59, 59, 999);
            return end >= today;
          }
          const end = new Date(c.end_date);
          end.setHours(23, 59, 59, 999);
          return end >= today;
        }).length;

        return {
          ...group,
          challenges: enrichedChallenges,
          challenge: enrichedChallenges[0] || null,
          memberCount,
          activeChallengesCount
        };
      })
    );

    const allChallengeIds = groupsWithChallenges
      .flatMap((g: any) => (g.challenges || []))
      .map((c: any) => c.id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let todayCheckins: any[] = [];
    try {
      const cQ = query(
        collection(db, 'checkins'),
        where('user_id', '==', userId)
      );
      const cSnap = await getDocs(cQ);
      const allCheckins = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const todayIso = today.toISOString();
      const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      todayCheckins = allCheckins.filter((c: any) => {
        if (!c.created_at) return false;
        try {
          const d = new Date(c.created_at);
          const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          return dStr === todayDateStr || c.created_at >= todayIso;
        } catch {
          return c.created_at >= todayIso;
        }
      });
    } catch (err) {
      console.warn('Erro ao buscar checkins de hoje:', err);
    }

    let dbTasks: any[] = [];
    if (allChallengeIds.length > 0) {
      try {
        const tQ = query(
          collection(db, 'tasks'),
          where('challenge_id', 'in', allChallengeIds.slice(0, 10))
        );
        const tSnap = await getDocs(tQ);
        dbTasks = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch {}
    }

    const habitsState = { prayer: false, bible: false, exercise: false };
    todayCheckins.forEach((c: any) => {
      if (c.type === 'pray' || c.habit_type === 'prayer') habitsState.prayer = true;
      if (c.type === 'bible' || c.habit_type === 'bible') habitsState.bible = true;
      if (c.type === 'workout' || c.habit_type === 'exercise') habitsState.exercise = true;
    });

    const streakCount = await this.calculateUserStreak(userId);

    return {
      groups: groupsWithChallenges,
      habits: habitsState,
      todayCheckins,
      tasks: dbTasks,
      streakCount
    };
  },

  async getTasksForChallenges(challengeIds: string[]): Promise<any[]> {
    if (!challengeIds || challengeIds.length === 0) return [];
    try {
      const tQ = query(
        collection(db, 'tasks'),
        where('challenge_id', 'in', challengeIds.slice(0, 10))
      );
      const tSnap = await getDocs(tQ);
      return tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch {
      return [];
    }
  },

  async saveExtraTask(challengeId: string, task: any, taskId?: string) {
    if (taskId) {
      await updateDoc(doc(db, 'tasks', taskId), {
        ...task,
        updated_at: new Date().toISOString()
      });
      return { id: taskId, ...task };
    } else {
      const ref = await addDoc(collection(db, 'tasks'), {
        challenge_id: challengeId,
        ...task,
        created_at: new Date().toISOString()
      });
      return { id: ref.id, challenge_id: challengeId, ...task };
    }
  },

  async deleteExtraTask(taskId: string) {
    await deleteDoc(doc(db, 'tasks', taskId));
    return true;
  },

  async getUserCheckins(userId: string) {
    if (!userId) return [];
    try {
      const q = query(collection(db, 'checkins'), where('user_id', '==', userId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch {
      return [];
    }
  },

  async calculateUserStreak(userId: string): Promise<number> {
    try {
      let userCheckins: any[] = [];
      try {
        const q = query(collection(db, 'checkins'), where('user_id', '==', userId));
        const snap = await getDocs(q);
        userCheckins = snap.docs.map(d => d.data());
      } catch {}

      const { MOCK_FEED } = require('../constants/mock-data');
      const userFeedCheckins = (MOCK_FEED || []).filter((f: any) => f.user_id === userId);
      const allDates = [
        ...userCheckins.map((c: any) => c.created_at),
        ...userFeedCheckins.map((f: any) => f.created_at)
      ].filter(Boolean);

      if (allDates.length === 0) return 0;

      const uniqueDates = new Set(
        allDates.map(d => {
          try {
            return new Date(d).toISOString().split('T')[0];
          } catch {
            return String(d).split('T')[0];
          }
        })
      );

      let streak = 0;
      const checkDate = new Date();
      let dateStr = checkDate.toISOString().split('T')[0];

      if (!uniqueDates.has(dateStr)) {
        checkDate.setDate(checkDate.getDate() - 1);
        dateStr = checkDate.toISOString().split('T')[0];
      }

      while (uniqueDates.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
        dateStr = checkDate.toISOString().split('T')[0];
      }

      (async () => {
        try {
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, { streak_count: streak });
        } catch {}
      })();

      return streak;
    } catch {
      return 0;
    }
  },

  async getTodayCheckins(userId: string, roundId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const q = query(
        collection(db, 'checkins'),
        where('user_id', '==', userId)
      );
      const snap = await getDocs(q);
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const todayIso = today.toISOString();
      const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      return all.filter((c: any) => {
        if (!c.created_at) return false;
        try {
          const d = new Date(c.created_at);
          const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          return dStr === todayDateStr || c.created_at >= todayIso;
        } catch {
          return c.created_at >= todayIso;
        }
      });
    } catch {
      return [];
    }
  },

  async getRankings(challengeId: string) {
    try {
      const q = query(
        collection(db, 'users'),
        where('current_challenge_id', '==', challengeId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const list = snap.docs.map(d => ({
          id: d.id,
          name: d.data().full_name || d.data().username || 'Usuário',
          avatar: d.data().avatar_url,
          points: d.data().total_points || 0,
          streak: d.data().streak_count || 0,
        }));
        list.sort((a, b) => b.points - a.points);
        return list.slice(0, 50).map((u, index) => ({
          rank: index + 1,
          ...u
        }));
      }
    } catch {}

    return getMockRankings();
  },

  async getFeed(groupId: string, page = 1, limitCount = 10) {
    return this.getGroupFeed(groupId, limitCount, (page - 1) * limitCount);
  },

  async getGroupFeed(groupId: string, limitCount = 20, offset = 0) {
    try {
      let rawDocs: any[] = [];
      if (groupId && !groupId.startsWith('group')) {
        const q = query(
          collection(db, 'checkins'),
          where('group_id', '==', groupId)
        );
        const snap = await getDocs(q);
        rawDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Se ainda não encontrou por group_id, tenta também pelos IDs de desafio do grupo
        if (rawDocs.length === 0) {
          const challenges = await this.getGroupChallenges(groupId);
          const cIds = challenges.map((c: any) => c.id).filter(Boolean);
          if (cIds.length > 0) {
            const cq = query(
              collection(db, 'checkins'),
              where('challenge_id', 'in', cIds.slice(0, 10))
            );
            const cSnap = await getDocs(cq);
            rawDocs = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          }
        }
      } else {
        const q = query(
          collection(db, 'checkins'),
          limit(limitCount * 2)
        );
        const snap = await getDocs(q);
        rawDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }

      if (rawDocs.length > 0) {
        const list = rawDocs.map(data => {
          return {
            id: data.id,
            ...data,
            media_url: data.media_url || data.image_url || null,
            image_url: data.image_url || data.media_url || null,
            caption: data.caption || data.note || null,
            habit_type: data.type === 'pray' ? 'prayer' : (data.type === 'workout' ? 'exercise' : (data.type || 'bible')),
            profiles: {
              id: data.user_id,
              full_name: data.user_name || 'Membro Trino',
              avatar_url: data.user_avatar || null
            },
            reactions: data.reactions || [],
            comments_count: data.comments_count || 0
          };
        });
        list.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        return list.slice(offset, offset + limitCount);
      }
    } catch (err) {
      console.warn('Erro ao buscar feed do grupo:', err);
    }

    const { MOCK_FEED } = require('../constants/mock-data');
    return MOCK_FEED || [];
  },

  async createCheckin(checkinData: any) {
    const payload: any = {
      created_at: new Date().toISOString(),
      reactions: [],
      comments_count: 0
    };
    Object.keys(checkinData).forEach(key => {
      if (checkinData[key] !== undefined) {
        payload[key] = checkinData[key];
      }
    });

    if (payload.image_url && !payload.media_url) {
      payload.media_url = payload.image_url;
    }
    if (payload.media_url && !payload.image_url) {
      payload.image_url = payload.media_url;
    }

    const docRef = await addDoc(collection(db, 'checkins'), payload);

    // Atualizar pontos em challenge_participants no Firestore
    if (payload.challenge_id && payload.user_id) {
      const ptsToAdd = typeof payload.points === 'number' ? payload.points : 10;
      try {
        const partId = `${payload.challenge_id}_${payload.user_id}`;
        const partRef = doc(db, 'challenge_participants', partId);
        const partSnap = await getDoc(partRef);
        if (partSnap.exists()) {
          const currentPoints = partSnap.data().points || 0;
          await updateDoc(partRef, {
            points: currentPoints + ptsToAdd,
            last_checkin: payload.created_at,
            user_name: payload.user_name || partSnap.data().user_name,
            user_avatar: payload.user_avatar || partSnap.data().user_avatar
          });
        } else {
          await setDoc(partRef, {
            id: partId,
            challenge_id: payload.challenge_id,
            group_id: payload.group_id || null,
            user_id: payload.user_id,
            user_name: payload.user_name || 'Participante',
            user_avatar: payload.user_avatar || null,
            points: ptsToAdd,
            joined_at: payload.created_at,
            last_checkin: payload.created_at,
            streak: 1,
            role: 'member'
          }, { merge: true });
        }
      } catch (err) {
        console.warn('Erro ao atualizar pontos em challenge_participants:', err);
      }

      // Sincronizar em memória com MOCK_RANKINGS caso esteja em execução mock/local
      try {
        const { MOCK_RANKINGS, saveMockRankings } = require('../constants/mock-data');
        if (MOCK_RANKINGS) {
          if (!MOCK_RANKINGS[payload.challenge_id]) {
            MOCK_RANKINGS[payload.challenge_id] = [];
          }
          const existing = MOCK_RANKINGS[payload.challenge_id].find((m: any) => m.user_id === payload.user_id);
          if (existing) {
            existing.points = (existing.points || 0) + ptsToAdd;
            if (payload.user_name) existing.name = payload.user_name;
            if (payload.user_avatar) existing.avatar_url = payload.user_avatar;
          } else {
            MOCK_RANKINGS[payload.challenge_id].push({
              user_id: payload.user_id,
              name: payload.user_name || 'Participante',
              avatar_url: payload.user_avatar || null,
              points: ptsToAdd,
              streak: 1,
              rounds_won: 0
            });
          }
          await saveMockRankings();
        }
      } catch (mockErr) {
        console.warn('Erro ao sincronizar mock ranking:', mockErr);
      }
    }

    return { id: docRef.id, ...payload };
  },

  async uploadCheckinImage(userId: string, localUri: string): Promise<string | null> {
    try {
      // 1. No Web, se for blob/file/data, gera base64 otimizado rapidamente para garantir que nunca trave
      let optimizedDataUrl: string | null = null;
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
        try {
          optimizedDataUrl = await new Promise<string>((resolve) => {
            const img = new (window as any).Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                let width = img.width || 600;
                let height = img.height || 600;
                const maxDim = 800;
                if (width > maxDim || height > maxDim) {
                  if (width > height) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                  } else {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                  }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0, width, height);
                  resolve(canvas.toDataURL('image/jpeg', 0.65));
                  return;
                }
              } catch {}
              resolve(localUri);
            };
            img.onerror = () => resolve(localUri);
            img.src = localUri;
          });
        } catch {
          optimizedDataUrl = localUri;
        }
      }

      // 2. Tentar upload no Firebase Storage com timeout estrito de 3 segundos
      const { ext, contentType } = getFileInfo(localUri);
      const filePath = `checkins/${userId}_${Date.now()}.${ext}`;
      const storageRef = ref(storage, filePath);

      const uploadPromise = (async () => {
        const response = await fetch(localUri);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob, { contentType });
        return await getDownloadURL(storageRef);
      })();

      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 3000);
      });

      const uploadedUrl = await Promise.race([uploadPromise, timeoutPromise]);
      if (uploadedUrl) {
        return uploadedUrl;
      }

      // Se Firebase Storage falhou ou demorou mais que 3s, usa a imagem otimizada
      return optimizedDataUrl || localUri;
    } catch (err) {
      console.warn('Erro ou timeout no upload de imagem de checkin, usando fallback:', err);
      return localUri;
    }
  },

  async uploadAvatarImage(userId: string, localUri: string): Promise<string | null> {
    try {
      let optimizedDataUrl: string | null = null;
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
        try {
          optimizedDataUrl = await new Promise<string>((resolve) => {
            const img = new (window as any).Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                let width = img.width || 400;
                let height = img.height || 400;
                const maxDim = 400;
                if (width > maxDim || height > maxDim) {
                  if (width > height) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                  } else {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                  }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0, width, height);
                  resolve(canvas.toDataURL('image/jpeg', 0.7));
                  return;
                }
              } catch {}
              resolve(localUri);
            };
            img.onerror = () => resolve(localUri);
            img.src = localUri;
          });
        } catch {
          optimizedDataUrl = localUri;
        }
      }

      const { ext, contentType } = getFileInfo(localUri);
      const filePath = `avatars/${userId}_${Date.now()}.${ext}`;
      const storageRef = ref(storage, filePath);

      const uploadPromise = (async () => {
        const response = await fetch(localUri);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob, { contentType });
        return await getDownloadURL(storageRef);
      })();

      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 3000);
      });

      const uploadedUrl = await Promise.race([uploadPromise, timeoutPromise]);
      if (uploadedUrl) {
        return uploadedUrl;
      }

      return optimizedDataUrl || localUri;
    } catch (err) {
      console.warn('Erro ou timeout no upload de avatar, usando fallback:', err);
      return localUri;
    }
  },

  async updateProfileAvatar(userId: string, avatarUrl: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { avatar_url: avatarUrl });
    } catch (err) {
      console.error('Erro ao atualizar avatar do perfil:', err);
    }
  },

  async updateProfileName(userId: string, fullName: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { full_name: fullName });
    } catch (err) {
      console.error('Erro ao atualizar nome do perfil:', err);
    }
  },

  async updatePassword(newPassword: string): Promise<void> {
    if (auth.currentUser) {
      await fbUpdatePassword(auth.currentUser, newPassword);
    }
  },


  async getComments(checkinId: string) {
    try {
      const q = query(
        collection(db, 'comments'),
        where('checkin_id', '==', checkinId)
      );
      const snap = await getDocs(q);
      const comments = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          content: data.content || '',
          created_at: data.created_at || new Date().toISOString(),
          user_id: data.user_id || '',
          profiles: {
            id: data.user_id || '',
            full_name: data.user_name || 'Membro',
            avatar_url: data.user_avatar || null
          }
        };
      });
      return comments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } catch {
      return [];
    }
  },

  async addComment(checkinId: string, userId: string, content: string) {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.exists() ? userDoc.data() : {};

    const commentPayload = {
      checkin_id: checkinId,
      user_id: userId,
      user_name: userData.full_name || 'Membro',
      user_avatar: userData.avatar_url || null,
      content,
      created_at: new Date().toISOString()
    };

    const newDoc = await addDoc(collection(db, 'comments'), commentPayload);
    return {
      id: newDoc.id,
      content,
      created_at: commentPayload.created_at,
      user_id: userId,
      profiles: {
        id: userId,
        full_name: userData.full_name || 'Membro',
        avatar_url: userData.avatar_url || null
      }
    };
  },

  async deleteComment(commentId: string) {
    await deleteDoc(doc(db, 'comments', commentId));
  },

  async getReactions(checkinId: string) {
    try {
      const snap = await getDocs(collection(db, 'checkins', checkinId, 'reactions'));
      return snap.docs.map(d => d.data());
    } catch {
      return [];
    }
  },

  async toggleReaction(checkinId: string, userId: string, emoji: string) {
    const reactionRef = doc(db, 'checkins', checkinId, 'reactions', userId);
    const reactionSnap = await getDoc(reactionRef);

    if (reactionSnap.exists()) {
      const data = reactionSnap.data();
      if (data.emoji === emoji) {
        await deleteDoc(reactionRef);
        return { action: 'removed', emoji };
      } else {
        await updateDoc(reactionRef, { emoji, updated_at: new Date().toISOString() });
        return { action: 'updated', emoji };
      }
    } else {
      await setDoc(reactionRef, {
        user_id: userId,
        emoji,
        created_at: new Date().toISOString()
      });
      return { action: 'added', emoji };
    }
  },

  async createExtraTask(taskData: any) {
    const payload = {
      ...taskData,
      created_at: new Date().toISOString()
    };
    const docRef = await addDoc(collection(db, 'tasks'), payload);
    return { id: docRef.id, ...payload };
  },

  async updateExtraTask(taskId: string, taskData: any) {
    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, taskData);
    return { id: taskId, ...taskData };
  },

  async completeExtraTask(taskId: string, userId: string) {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const snap = await getDoc(taskRef);
      if (snap.exists()) {
        const completedBy = snap.data().completed_by || [];
        if (!completedBy.includes(userId)) {
          await updateDoc(taskRef, {
            completed_by: [...completedBy, userId]
          });
        }
      }
    } catch (e) {
      console.warn('Erro ao atualizar completed_by em tasks:', e);
    }
  },


  async getWeeklyTheme(): Promise<WeeklyTheme> {
    try {
      const snap = await getDoc(doc(db, 'settings', 'weekly_theme'));
      if (snap.exists()) {
        const data = snap.data() as WeeklyTheme;
        await AsyncStorage.setItem('trino_weekly_theme', JSON.stringify(data));
        return data;
      }
    } catch {}

    try {
      const localData = await AsyncStorage.getItem('trino_weekly_theme');
      if (localData) {
        const parsed = JSON.parse(localData);
        if (parsed?.text) return parsed as WeeklyTheme;
      }
    } catch {}

    return DEFAULT_WEEKLY_THEME;
  },

  async updateWeeklyTheme(theme: WeeklyTheme): Promise<void> {
    const payload = {
      text: theme.text.trim(),
      reference: theme.reference.trim() || 'Tema da Semana',
      updated_at: new Date().toISOString()
    };

    try {
      await AsyncStorage.setItem('trino_weekly_theme', JSON.stringify(payload));
    } catch {}

    try {
      await setDoc(doc(db, 'settings', 'weekly_theme'), payload);
    } catch (err) {
      console.warn('Erro ao salvar tema no Firestore:', err);
    }
  },

  async getChallengeRequests(groupId?: string): Promise<any[]> {
    try {
      let q = query(collection(db, 'challenge_requests'));
      if (groupId) {
        q = query(collection(db, 'challenge_requests'), where('group_id', '==', groupId));
      }
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('Erro ao buscar challenge_requests:', e);
      return [];
    }
  },

  async createChallengeRequest(data: {
    challenge_id: string;
    challenge_name: string;
    group_id: string;
    user_id: string;
    user_name: string;
    user_avatar?: string | null;
  }) {
    const docId = `req_${Date.now()}`;
    const payload = {
      id: docId,
      challenge_id: data.challenge_id,
      challenge_name: data.challenge_name,
      group_id: data.group_id,
      user_id: data.user_id,
      user_name: data.user_name,
      user_avatar: data.user_avatar || null,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'challenge_requests', docId), payload);
    } catch (e) {
      console.warn('Erro ao criar challenge_request:', e);
    }
    return payload;
  },

  async respondToChallengeRequest(requestId: string, approve: boolean) {
    const newStatus = approve ? 'approved' : 'declined';
    try {
      const reqRef = doc(db, 'challenge_requests', requestId);
      await updateDoc(reqRef, {
        status: newStatus,
        updated_at: new Date().toISOString()
      });

      if (approve) {
        const snap = await getDoc(reqRef);
        if (snap.exists()) {
          const reqData = snap.data();
          const partId = `${reqData.challenge_id}_${reqData.user_id}`;
          await setDoc(doc(db, 'challenge_participants', partId), {
            id: partId,
            challenge_id: reqData.challenge_id,
            group_id: reqData.group_id,
            user_id: reqData.user_id,
            user_name: reqData.user_name,
            user_avatar: reqData.user_avatar || null,
            role: 'member',
            joined_at: new Date().toISOString(),
            points: 0,
            streak: 0
          });
        }
      }
    } catch (e) {
      console.warn('Erro ao responder challenge_request:', e);
    }
  },

  async getChallengeParticipants(challengeId: string): Promise<any[]> {
    if (!challengeId) return [];
    try {
      const q = query(
        collection(db, 'challenge_participants'),
        where('challenge_id', '==', challengeId)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('Erro ao buscar challenge_participants:', e);
      return [];
    }
  }
};
