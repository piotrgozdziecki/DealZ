import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  getDocs,
  collection,
  query,
  orderBy,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with explicit database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test as mandated by guidelines
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firestore connection verified');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    return false;
  }
}

// User Profile persistence
export async function syncUserProfile(user: FirebaseUser) {
  if (!user) return;
  const userRef = doc(db, 'users', user.uid);
  const now = new Date().toISOString();
  const payload = {
    uid: user.uid,
    email: user.email || `${user.uid}@anonymous.app`,
    displayName: user.displayName || 'Użytkownik DealRadar',
    photoURL: user.photoURL || '',
    createdAt: now,
    updatedAt: now
  };
  try {
    await setDoc(userRef, payload, { merge: true });
  } catch (err) {
    console.warn('Could not sync user profile to Firestore:', err);
  }
}

// Save Analyzed Offer
export async function saveAnalyzedOfferToFirestore(userId: string, offer: {
  id: string;
  title: string;
  url?: string;
  price: number;
  estimatedMarketPrice?: number;
  verdict?: 'BIERZ TERAZ' | 'NEGOCJUJ' | 'SZUKAJ DALEJ' | 'NIEOPŁACALNE';
  dealScore?: number;
}) {
  const path = `users/${userId}/offers/${offer.id}`;
  const payload = {
    id: offer.id,
    userId,
    title: offer.title.substring(0, 250),
    url: offer.url ? offer.url.substring(0, 1000) : '',
    price: Number(offer.price) || 0,
    estimatedMarketPrice: offer.estimatedMarketPrice ? Number(offer.estimatedMarketPrice) : Number(offer.price),
    verdict: offer.verdict || 'SZUKAJ DALEJ',
    dealScore: offer.dealScore ?? 5,
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, 'users', userId, 'offers', offer.id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Save Price Alert
export async function savePriceAlertToFirestore(userId: string, alert: {
  id: string;
  title: string;
  targetPrice: number;
  currentPrice: number;
  originalPrice?: number;
  url?: string;
}) {
  const path = `users/${userId}/alerts/${alert.id}`;
  const payload = {
    id: alert.id,
    userId,
    title: alert.title.substring(0, 250),
    targetPrice: Number(alert.targetPrice),
    currentPrice: Number(alert.currentPrice),
    originalPrice: alert.originalPrice ? Number(alert.originalPrice) : Number(alert.currentPrice),
    url: alert.url ? alert.url.substring(0, 1000) : '',
    active: true,
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, 'users', userId, 'alerts', alert.id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Delete Price Alert
export async function deletePriceAlertFromFirestore(userId: string, alertId: string) {
  const path = `users/${userId}/alerts/${alertId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'alerts', alertId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// Save Chat Message
export async function saveChatMessageToFirestore(userId: string, message: {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}) {
  const path = `users/${userId}/chats/${message.id}`;
  const payload = {
    id: message.id,
    userId,
    role: message.role,
    content: message.content.substring(0, 2000),
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, 'users', userId, 'chats', message.id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}
