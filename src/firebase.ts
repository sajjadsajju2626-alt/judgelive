import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  doc,
  enableIndexedDbPersistence,
  getDocFromServer,
  getFirestore,
} from 'firebase/firestore';
import appletConfig from '../firebase-applet-config.json';

// Exact user-provided Firebase configuration embedded directly into the code:
export const firebaseConfig = {
  apiKey: 'AIzaSyCkJuoYBM0JpCygr7ippauAr1vta_EHHOs',
  authDomain: 'judgelive-7a621.firebaseapp.com',
  projectId: 'judgelive-7a621',
  storageBucket: 'judgelive-7a621.firebasestorage.app',
  messagingSenderId: '33980204166',
  appId: '1:33980204166:web:5fd31578977729d5337d07',
  measurementId: 'G-4FGPKBC4EM',
};

const app = initializeApp({
  ...appletConfig,
  ...firebaseConfig,
});

// Initialize Firestore with the provisioned database ID from firebase-applet-config.json
export const db = getFirestore(app, appletConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

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

// Enable offline IndexedDB persistence so judges can input marks seamlessly even if network drops temporarily
enableIndexedDbPersistence(db)
  .then(() => {
    updatePersistenceStatus('enabled');
  })
  .catch((err: { code?: string }) => {
    if (err?.code === 'failed-precondition') {
      updatePersistenceStatus('multi-tab');
    } else {
      updatePersistenceStatus('unsupported');
    }
  });

// Validate connection to Firestore on boot per firebase-integration-rpc
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
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
