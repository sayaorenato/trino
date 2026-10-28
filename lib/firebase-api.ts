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

  async getActiveChallenge(groupId: string) {
    if (!groupId || groupId.startsWith('group')) {
      const mockChal = Object.values(MOCK_CHALLENGES).find(c => c.group_id === groupId);
      if (mockChal) {
        return {
          ...mockChal,
          rounds: MOCK_ROUNDS[mockChal.id] || []
        };
      }
      return null;
    }

    try {
      const q = query(
        collection(db, 'challenges'),
        where('group_id', '==', groupId),
        orderBy('created_at', 'desc'),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const chalDoc = snap.docs[0];
        const chalData = chalDoc.data();
        return {
          id: chalDoc.id,
          ...chalData,
          rounds: chalData.rounds || []
        };
      }
    } catch (error) {
      console.warn('Erro ao buscar desafio ativo no Firestore:', error);
    }
    return null;
  },

  async getGroupChallenges(groupId: string) {
    if (!groupId || groupId.startsWith('group')) {
      const mockChal = Object.values(MOCK_CHALLENGES).filter(c => c.group_id === groupId);
      return mockChal.map(c => ({
        ...c,
        rounds: MOCK_ROUNDS[c.id] || []
      }));
    }

    try {
      const q = query(
        collection(db, 'challenges'),
        where('group_id', '==', groupId),
        orderBy('created_at', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        rounds: d.data().rounds || []
      }));
    } catch (error) {
      console.warn('Erro ao listar desafios do grupo:', error);
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

        const now = new Date();
        const activeChallengesCount = challenges.filter(
          (c: any) => new Date(c.end_date) >= now
        ).length;

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
        where('current_challenge_id', '==', challengeId),
        orderBy('total_points', 'desc'),
        limit(50)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map((d, index) => ({
          rank: index + 1,
          id: d.id,
          name: d.data().full_name || d.data().username || 'Usuário',
          avatar: d.data().avatar_url,
          points: d.data().total_points || 0,
          streak: d.data().streak_count || 0,
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
      let q;
      if (groupId && !groupId.startsWith('group')) {
        q = query(
          collection(db, 'checkins'),
          where('group_id', '==', groupId),
          orderBy('created_at', 'desc'),
          limit(limitCount)
        );
      } else {
        q = query(
          collection(db, 'checkins'),
          orderBy('created_at', 'desc'),
          limit(limitCount)
        );
      }
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map(d => ({
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

  async getGroupMembers(groupId: string) {
    if (!groupId || groupId.startsWith('group')) {
      await getMockRankings();
      const challengeId = groupId === 'group_1' ? 'chal_1' : 'chal_2';
      const ranking = MOCK_RANKINGS[challengeId] || [];
      return ranking.map((member: any, index: number) => ({
        user_id: member.user_id,
        role: member.user_id === 'user_1' ? 'admin' : 'member',
        joined_at: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
        full_name: member.name,
        avatar_url: member.avatar_url,
        email: `${member.user_id}@exemplo.com`,
      }));
    }

    try {
      const q = query(
        collection(db, 'group_members'),
        where('group_id', '==', groupId)
      );
      const snap = await getDocs(q);

      const members: any[] = [];
      for (const mDoc of snap.docs) {
        const mData = mDoc.data();
        let profileData: any = {};
        if (mData.user_id) {
          const pSnap = await getDoc(doc(db, 'users', mData.user_id));
          if (pSnap.exists()) {
            profileData = pSnap.data();
          }
        }
        members.push({
          user_id: mData.user_id,
          role: mData.role || 'member',
          joined_at: mData.joined_at || new Date().toISOString(),
          full_name: profileData.full_name || 'Sem nome',
          avatar_url: profileData.avatar_url || null,
          email: profileData.email || '',
        });
      }

      return members.sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        return 0;
      });
    } catch (err) {
      console.warn('Erro ao buscar membros do grupo:', err);
      return [];
    }
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
    }
  },

  async getComments(checkinId: string) {
    try {
      const q = query(
        collection(db, 'comments'),
        where('checkin_id', '==', checkinId),
        orderBy('created_at', 'asc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => {
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

  async deleteExtraTask(taskId: string) {
    const taskRef = doc(db, 'tasks', taskId);
    await deleteDoc(taskRef);
    return true;
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
