import { app, db, analytics } from './firebaseApp';
import { authService, AppUser } from './authService';
import { User as FirebaseUser } from 'firebase/auth';

export { app, db, analytics };

export const auth = {
  get currentUser(): (AppUser | FirebaseUser | null) {
    return authService.getCurrentUser();
  },
  onAuthStateChanged(cb: (user: any) => void) {
    return authService.onAuthStateChanged(cb);
  },
  signOut() {
    return authService.signOut();
  }
} as any;

export const onAuthStateChanged = (authInstance: any, callback: (user: any) => void) => {
  return authService.onAuthStateChanged(callback);
};

export const signOut = async (authInstance?: any) => {
  return authService.signOut();
};

export const updateProfile = async (user: any, updates: { displayName?: string; photoURL?: string }) => {
  return authService.updateProfile(updates);
};

export const updatePassword = async (user: any, newPassword: string) => {
  return authService.updatePassword(newPassword);
};

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
} as const;

export type OperationType = typeof OperationType[keyof typeof OperationType];

interface FirestoreErrorInfo {
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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const current = authService.getCurrentUser();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: current?.uid,
      email: current?.email,
      emailVerified: current?.emailVerified,
      isAnonymous: current?.isAnonymous,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
  return errInfo;
}
