import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import appletConfig from '../firebase-applet-config.json';

export const firebaseConfig = {
  apiKey: appletConfig.apiKey,
  authDomain: appletConfig.authDomain,
  projectId: appletConfig.projectId,
  storageBucket: appletConfig.storageBucket,
  messagingSenderId: appletConfig.messagingSenderId,
  appId: appletConfig.appId,
};

const app = initializeApp(appletConfig);

export type PersistenceStatus = 'initializing' | 'enabled' | 'multi-tab' | 'unsupported';

let currentPersistenceStatus: PersistenceStatus = 'initializing';
const persistenceListeners = new Set<(status: PersistenceStatus) => void>();

export function getPersistenceStatus(): PersistenceStatus {
  return currentPersistenceStatus;
}

export function onPersistenceStatusChange(cb: (status: PersistenceStatus) => void): () => void {
  persistenceListeners.add(cb);
  cb(currentPersistenceStatus);
  return () => {
    persistenceListeners.delete(cb);
  };
}

function updatePersistenceStatus(status: PersistenceStatus) {
  currentPersistenceStatus = status;
  persistenceListeners.forEach((cb) => cb(status));
}

function createFirestoreClient() {
  try {
    const instance = initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      },
      appletConfig.firestoreDatabaseId
    );
    updatePersistenceStatus('enabled');
    return instance;
  } catch {
    updatePersistenceStatus('unsupported');
    return initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
        localCache: memoryLocalCache(),
      },
      appletConfig.firestoreDatabaseId
    );
  }
}

// Initialize Firestore with the provisioned database ID from firebase-applet-config.json
export const db = createFirestoreClient();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Validate connection to Firestore on boot per firebase-integration-rpc
async function testConnection() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return;
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
      return;
    } catch (error) {
      const isOfflineErr =
        error instanceof Error && error.message.includes('the client is offline');
      if (isOfflineErr && attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        continue;
      }
      if (isOfflineErr && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
        console.error('Please check your Firebase configuration.');
      }
      return;
    }
  }
}
void testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
