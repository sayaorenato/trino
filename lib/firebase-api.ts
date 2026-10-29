import AsyncStorage from '@react-native-async-storage/async-storage';
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
      const rQ = query(collection(db, 'rounds'), where('challenge_id', '==', challengeId));
      const rSnap = await getDocs(rQ);
      const batch = writeBatch(db);
      rSnap.docs.forEach(d => batch.delete(d.ref));
      const tQ = query(collection(db, 'tasks'), where('challenge_id', '==', challengeId));
      const tSnap = await getDocs(tQ);
      tSnap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
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
    if (challengeId.startsWith('chal')) {
      const { MOCK_RANKINGS } = require('../constants/mock-data');
      return MOCK_RANKINGS[challengeId] || [];
    }

    try {
      const chal = await this.getChallengeById(challengeId);
      if (!chal) return [];

      const members = chal.group_id ? await this.getGroupMembers(chal.group_id) : [];
      const roundIds = (chal.rounds || []).map((r: any) => r.id);
      let checkinsList: any[] = [];
      if (roundIds.length > 0) {
        try {
          const cQ = query(
            collection(db, 'checkins'),
            where('round_id', 'in', roundIds.slice(0, 10))
          );
          const cSnap = await getDocs(cQ);
          checkinsList = cSnap.docs.map(d => d.data());
        } catch {}
      }

      const participantsMap = new Map<string, any>();
      members.forEach((m: any) => {
        participantsMap.set(m.user_id, {
          user_id: m.user_id,
          name: m.full_name || 'Participante',
          avatar_url: m.avatar_url || null,
          streak: 0,
        });
      });

      const ranking = Array.from(participantsMap.values()).map(p => {
        const uCheckins = checkinsList.filter(c => c.user_id === p.user_id);
        let points = 0;
        uCheckins.forEach((c: any) => {
          if (c.note && c.note.startsWith('[TAREFA EXTRA]')) {
            points += 30;
          } else {
            points += 10;
          }
        });
        return {
          ...p,
          points,
          checkin_count: uCheckins.length
        };
      });

      ranking.sort((a, b) => b.points - a.points);
      return ranking.map((item, idx) => ({ ...item, rank: idx + 1 }));
    } catch (e) {
      console.warn('Erro ao calcular ranking:', e);
      return [];
    }
  },

  async getDashboardData(userId: string) {
    const groups = await this.getUserGroups(userId);

    const groupsWithChallenges = await Promise.all(
      groups.map(async (group: any) => {
        const challenges = await this.getGroupChallenges(group.id);
        const challenge = challenges.length > 0 ? challenges[0] : null;

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
        const activeChallengesCount = challenges.filter((c: any) => {
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
          challenges,
          challenge,
          memberCount,
          activeChallengesCount
        };
      })
    );

    const allRoundIds = groupsWithChallenges
      .flatMap((g: any) => (g.challenges || []).flatMap((c: any) => c.rounds || []))
      .map((r: any) => r.id);

    const allChallengeIds = groupsWithChallenges
      .flatMap((g: any) => (g.challenges || []))
      .map((c: any) => c.id);

    if (allRoundIds.length === 0) {
      return {
        groups: groupsWithChallenges,
        habits: { prayer: false, bible: false, exercise: false },
        todayCheckins: [],
        tasks: [],
        streakCount: 0
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let todayCheckins: any[] = [];
    try {
      const cQ = query(
        collection(db, 'checkins'),
        where('user_id', '==', userId),
        where('created_at', '>=', today.toISOString())
      );
      const cSnap = await getDocs(cQ);
      todayCheckins = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch {}

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
      if (c.type === 'pray') habitsState.prayer = true;
      if (c.type === 'bible') habitsState.bible = true;
      if (c.type === 'workout') habitsState.exercise = true;
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
        where('user_id', '==', userId),
        where('created_at', '>=', today.toISOString())
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
      let snap;
      if (groupId && !groupId.startsWith('group')) {
        const q = query(
          collection(db, 'checkins'),
          where('group_id', '==', groupId)
        );
        snap = await getDocs(q);
      } else {
        const q = query(
          collection(db, 'checkins'),
          orderBy('created_at', 'desc'),
          limit(limitCount)
        );
        snap = await getDocs(q);
      }
      if (!snap.empty) {
        const list = snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          profiles: {
            id: d.data().user_id,
            full_name: d.data().user_name || 'Membro Trino',
            avatar_url: d.data().user_avatar || null
          },
          reactions: d.data().reactions || [],
          comments_count: d.data().comments_count || 0
        }));
        list.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        return list.slice(offset, offset + limitCount);
      }
    } catch {}

    const { MOCK_FEED } = require('../constants/mock-data');
    return MOCK_FEED || [];
  },

  async createCheckin(checkinData: any) {
    const payload = {
      ...checkinData,
      created_at: new Date().toISOString()
    };
    const docRef = await addDoc(collection(db, 'checkins'), payload);
    return { id: docRef.id, ...payload };
  },

  async uploadCheckinImage(userId: string, localUri: string): Promise<string | null> {
    try {
      const { ext, contentType } = getFileInfo(localUri);
      const filePath = `checkins/${userId}_${Date.now()}.${ext}`;
      const storageRef = ref(storage, filePath);

      const response = await fetch(localUri);
      const blob = await response.blob();
      await uploadBytes(storageRef, blob, { contentType });
      return await getDownloadURL(storageRef);
    } catch (err) {
      console.error('Erro ao fazer upload da imagem de checkin:', err);
      return null;
    }
  },

  async uploadAvatarImage(userId: string, localUri: string): Promise<string | null> {
    try {
      const { ext, contentType } = getFileInfo(localUri);
      const filePath = `avatars/${userId}_${Date.now()}.${ext}`;
      const storageRef = ref(storage, filePath);

      const response = await fetch(localUri);
      const blob = await response.blob();
      await uploadBytes(storageRef, blob, { contentType });
      return await getDownloadURL(storageRef);
    } catch (err) {
      console.error('Erro ao fazer upload de avatar:', err);
      return null;
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
  }
};
