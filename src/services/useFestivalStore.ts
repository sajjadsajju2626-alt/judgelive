import { useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  onPersistenceStatusChange,
  OperationType,
  PersistenceStatus,
} from '../firebase';
import { SEED_ITEMS, SEED_PARTICIPANTS, SEED_SCORES } from '../data/seedData';
import {
  CategoryType,
  CompetitionItem,
  JudgeScore,
  JudgeSlot,
  Participant,
} from '../types';
import {
  validateItemInput,
  validateParticipantInput,
  validateScoreInput,
} from '../utils/scoring';

const STORAGE_KEYS = {
  items: 'kalolsavam_items_v1',
  participants: 'kalolsavam_participants_v1',
  scores: 'kalolsavam_scores_v1',
};

function loadFromLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    if (Array.isArray(parsed) && parsed.length === 0) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

function saveToLocal<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore storage quota errors
  }
}

function formatTimestamp(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

export function useFestivalStore() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [persistenceStatus, setPersistenceStatus] =
    useState<PersistenceStatus>('initializing');
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [lastSyncAt, setLastSyncAt] = useState<string>(new Date().toISOString());
  const [syncMode, setSyncMode] = useState<'firestore-live' | 'local-persisted'>(
    'local-persisted'
  );

  const [items, setItems] = useState<CompetitionItem[]>(() =>
    loadFromLocal(STORAGE_KEYS.items, SEED_ITEMS)
  );
  const [participants, setParticipants] = useState<Participant[]>(() =>
    loadFromLocal(STORAGE_KEYS.participants, SEED_PARTICIPANTS)
  );
  const [scores, setScores] = useState<JudgeScore[]>(() =>
    loadFromLocal(STORAGE_KEYS.scores, SEED_SCORES)
  );

  // Track IndexedDB persistence status and network connectivity
  useEffect(() => {
    const unsubPersistence = onPersistenceStatusChange((status) => {
      setPersistenceStatus(status);
    });
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      unsubPersistence();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cross-tab instant synchronization via storage event
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.items && e.newValue) {
        setItems(JSON.parse(e.newValue));
        setLastSyncAt(new Date().toISOString());
      } else if (e.key === STORAGE_KEYS.participants && e.newValue) {
        setParticipants(JSON.parse(e.newValue));
        setLastSyncAt(new Date().toISOString());
      } else if (e.key === STORAGE_KEYS.scores && e.newValue) {
        setScores(JSON.parse(e.newValue));
        setLastSyncAt(new Date().toISOString());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Track Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      setSyncMode(currentUser ? 'firestore-live' : 'local-persisted');
    });
    return () => unsub();
  }, []);

  // Attach real-time Firestore onSnapshot listeners when authenticated
  useEffect(() => {
    if (!authReady || !user) return;

    const unsubItems = onSnapshot(
      collection(db, 'items'),
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudItems: CompetitionItem[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: String(data.id ?? d.id),
              name: String(data.name ?? ''),
              malayalamName: String(data.malayalamName ?? ''),
              category: (data.category as CategoryType) ?? 'High School',
              stage: String(data.stage ?? 'Stage 1'),
              maxMarks: Number(data.maxMarks ?? 100),
              authorId: String(data.authorId ?? ''),
              createdAt: formatTimestamp(data.createdAt),
            };
          });
          setItems(cloudItems);
          saveToLocal(STORAGE_KEYS.items, cloudItems);
          setLastSyncAt(new Date().toISOString());
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'items');
        } catch {
          // Handled and logged via handleFirestoreError
        }
      }
    );

    const unsubParticipants = onSnapshot(
      collection(db, 'participants'),
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudParts: Participant[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: String(data.id ?? d.id),
              itemId: String(data.itemId ?? ''),
              chestNo: String(data.chestNo ?? ''),
              name: String(data.name ?? ''),
              school: String(data.school ?? ''),
              authorId: String(data.authorId ?? ''),
              createdAt: formatTimestamp(data.createdAt),
            };
          });
          setParticipants(cloudParts);
          saveToLocal(STORAGE_KEYS.participants, cloudParts);
          setLastSyncAt(new Date().toISOString());
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'participants');
        } catch {
          // Handled and logged via handleFirestoreError
        }
      }
    );

    const unsubScores = onSnapshot(
      collection(db, 'scores'),
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudScores: JudgeScore[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: String(data.id ?? d.id),
              itemId: String(data.itemId ?? ''),
              participantId: String(data.participantId ?? ''),
              chestNo: String(data.chestNo ?? ''),
              judgeSlot: (data.judgeSlot as JudgeSlot) ?? 'J1',
              judgeName: String(data.judgeName ?? 'Judge'),
              rhythm: Number(data.rhythm ?? 0),
              expression: Number(data.expression ?? 0),
              perfection: Number(data.perfection ?? 0),
              overall: Number(data.overall ?? 0),
              total: Number(data.total ?? 0),
              remarks: String(data.remarks ?? ''),
              authorId: String(data.authorId ?? ''),
              createdAt: formatTimestamp(data.createdAt),
              updatedAt: formatTimestamp(data.updatedAt),
            };
          });
          setScores(cloudScores);
          saveToLocal(STORAGE_KEYS.scores, cloudScores);
          setLastSyncAt(new Date().toISOString());
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'scores');
        } catch {
          // Handled and logged via handleFirestoreError
        }
      }
    );

    return () => {
      unsubItems();
      unsubParticipants();
      unsubScores();
    };
  }, [authReady, user]);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signOutUser = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const addItem = useCallback(
    async (input: {
      name: string;
      malayalamName: string;
      category: CategoryType;
      stage: string;
    }): Promise<{ ok: true; item: CompetitionItem } | { ok: false; error: string }> => {
      const validation = validateItemInput(input);
      if (!validation.valid) {
        return { ok: false, error: validation.error };
      }

      const id = `item_${Date.now().toString(36)}`;
      const nowIso = new Date().toISOString();
      const newItem: CompetitionItem = {
        id,
        name: input.name.trim(),
        malayalamName: input.malayalamName.trim(),
        category: input.category,
        stage: input.stage.trim(),
        maxMarks: 100,
        authorId: user?.uid ?? 'local_judge_admin',
        createdAt: nowIso,
      };

      setItems((prev) => {
        const next = [...prev, newItem];
        saveToLocal(STORAGE_KEYS.items, next);
        return next;
      });
      setLastSyncAt(nowIso);

      if (user) {
        try {
          await setDoc(doc(db, 'items', id), {
            id: newItem.id,
            name: newItem.name,
            malayalamName: newItem.malayalamName,
            category: newItem.category,
            stage: newItem.stage,
            maxMarks: 100,
            authorId: user.uid,
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `items/${id}`);
        }
      }

      return { ok: true, item: newItem };
    },
    [user]
  );

  const deleteItem = useCallback(
    async (itemId: string) => {
      setItems((prev) => {
        const next = prev.filter((it) => it.id !== itemId);
        saveToLocal(STORAGE_KEYS.items, next);
        return next;
      });
      setParticipants((prev) => {
        const next = prev.filter((p) => p.itemId !== itemId);
        saveToLocal(STORAGE_KEYS.participants, next);
        return next;
      });
      setScores((prev) => {
        const next = prev.filter((s) => s.itemId !== itemId);
        saveToLocal(STORAGE_KEYS.scores, next);
        return next;
      });
      setLastSyncAt(new Date().toISOString());

      if (user) {
        try {
          await deleteDoc(doc(db, 'items', itemId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `items/${itemId}`);
        }
      }
    },
    [user]
  );

  const registerParticipant = useCallback(
    async (input: {
      itemId: string;
      chestNo: string;
      name: string;
      school: string;
    }): Promise<{ ok: true; participant: Participant } | { ok: false; error: string }> => {
      const validation = validateParticipantInput(input, participants, items);
      if (!validation.valid) {
        return { ok: false, error: validation.error };
      }

      const id = `part_${Date.now().toString(36)}`;
      const nowIso = new Date().toISOString();
      const newParticipant: Participant = {
        id,
        itemId: input.itemId.trim(),
        chestNo: validation.normalizedChestNo,
        name: input.name.trim(),
        school: input.school.trim(),
        authorId: user?.uid ?? 'local_judge_admin',
        createdAt: nowIso,
      };

      setParticipants((prev) => {
        const next = [...prev, newParticipant];
        saveToLocal(STORAGE_KEYS.participants, next);
        return next;
      });
      setLastSyncAt(nowIso);

      if (user) {
        try {
          await setDoc(doc(db, 'participants', id), {
            id: newParticipant.id,
            itemId: newParticipant.itemId,
            chestNo: newParticipant.chestNo,
            name: newParticipant.name,
            school: newParticipant.school,
            authorId: user.uid,
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `participants/${id}`);
        }
      }

      return { ok: true, participant: newParticipant };
    },
    [items, participants, user]
  );

  const deleteParticipant = useCallback(
    async (participantId: string) => {
      setParticipants((prev) => {
        const next = prev.filter((p) => p.id !== participantId);
        saveToLocal(STORAGE_KEYS.participants, next);
        return next;
      });
      setScores((prev) => {
        const next = prev.filter((s) => s.participantId !== participantId);
        saveToLocal(STORAGE_KEYS.scores, next);
        return next;
      });
      setLastSyncAt(new Date().toISOString());

      if (user) {
        try {
          await deleteDoc(doc(db, 'participants', participantId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `participants/${participantId}`);
        }
      }
    },
    [user]
  );

  const submitJudgeScore = useCallback(
    async (input: {
      itemId: string;
      participantId: string;
      chestNo: string;
      judgeSlot: JudgeSlot;
      judgeName: string;
      rhythm: number;
      expression: number;
      perfection: number;
      overall: number;
      remarks: string;
    }): Promise<{ ok: true; score: JudgeScore } | { ok: false; error: string }> => {
      const validation = validateScoreInput(input);
      if (!validation.valid) {
        return { ok: false, error: validation.error };
      }

      const id = `${input.itemId}_${input.participantId}_${input.judgeSlot}`;
      const nowIso = new Date().toISOString();
      const existing = scores.find((s) => s.id === id);

      const scoreDoc: JudgeScore = {
        id,
        itemId: input.itemId,
        participantId: input.participantId,
        chestNo: input.chestNo,
        judgeSlot: input.judgeSlot,
        judgeName: input.judgeName.trim(),
        rhythm: Number(input.rhythm),
        expression: Number(input.expression),
        perfection: Number(input.perfection),
        overall: Number(input.overall),
        total: validation.total,
        remarks: input.remarks.trim(),
        authorId: user?.uid ?? existing?.authorId ?? 'local_judge_admin',
        createdAt: existing?.createdAt ?? nowIso,
        updatedAt: nowIso,
      };

      setScores((prev) => {
        const filtered = prev.filter((s) => s.id !== id);
        const next = [...filtered, scoreDoc];
        saveToLocal(STORAGE_KEYS.scores, next);
        return next;
      });
      setLastSyncAt(nowIso);

      if (user) {
        try {
          await setDoc(doc(db, 'scores', id), {
            id: scoreDoc.id,
            itemId: scoreDoc.itemId,
            participantId: scoreDoc.participantId,
            chestNo: scoreDoc.chestNo,
            judgeSlot: scoreDoc.judgeSlot,
            judgeName: scoreDoc.judgeName,
            rhythm: scoreDoc.rhythm,
            expression: scoreDoc.expression,
            perfection: scoreDoc.perfection,
            overall: scoreDoc.overall,
            total: scoreDoc.total,
            remarks: scoreDoc.remarks,
            authorId: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `scores/${id}`);
        }
      }

      return { ok: true, score: scoreDoc };
    },
    [scores, user]
  );

  const resetToSeedData = useCallback(() => {
    setItems(SEED_ITEMS);
    setParticipants(SEED_PARTICIPANTS);
    setScores(SEED_SCORES);
    saveToLocal(STORAGE_KEYS.items, SEED_ITEMS);
    saveToLocal(STORAGE_KEYS.participants, SEED_PARTICIPANTS);
    saveToLocal(STORAGE_KEYS.scores, SEED_SCORES);
    setLastSyncAt(new Date().toISOString());
  }, []);

  return {
    user,
    authReady,
    persistenceStatus,
    isOnline,
    syncMode,
    lastSyncAt,
    items,
    participants,
    scores,
    signInWithGoogle,
    signOutUser,
    addItem,
    deleteItem,
    registerParticipant,
    deleteParticipant,
    submitJudgeScore,
    resetToSeedData,
  };
}
