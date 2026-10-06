import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db, googleProvider, DEFAULT_ADMIN_EMAIL } from './config.js';
import { handleFirestoreError, OperationType } from './errors.js';

export interface AllowedUserRecord {
  email: string;
  role: 'admin' | 'user';
  addedBy: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'user';
  isApproved: boolean;
  createdAt: string;
  lastLoginAt: string;
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  isApproved: boolean;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  // Admin functions
  allowedUsers: AllowedUserRecord[];
  refreshAllowedUsers: () => Promise<void>;
  addAllowedUser: (email: string, role?: 'admin' | 'user') => Promise<void>;
  removeAllowedUser: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [allowedUsers, setAllowedUsers] = useState<AllowedUserRecord[]>([]);

  // Check if current user is admin
  const userEmail = currentUser?.email?.toLowerCase().trim() || '';
  const isDefaultAdmin = userEmail === DEFAULT_ADMIN_EMAIL.toLowerCase();
  const isAdmin = isDefaultAdmin || profile?.role === 'admin';
  const isApproved = isDefaultAdmin || profile?.isApproved === true;

  // Listen for Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthError(null);

      if (!user) {
        setProfile(null);
        setAllowedUsers([]);
        setLoading(false);
        return;
      }

      try {
        const email = (user.email || '').toLowerCase().trim();
        const userIsDefaultAdmin = email === DEFAULT_ADMIN_EMAIL.toLowerCase();

        // Check if user is in allowed_users collection
        let isWhitelisted = userIsDefaultAdmin;
        let assignedRole: 'admin' | 'user' = userIsDefaultAdmin ? 'admin' : 'user';

        const allowedDocRef = doc(db, 'allowed_users', email);
        const pathForAllowed = `allowed_users/${email}`;
        try {
          const allowedSnap = await getDoc(allowedDocRef);
          if (allowedSnap.exists()) {
            isWhitelisted = true;
            const data = allowedSnap.data();
            assignedRole = data.role === 'admin' ? 'admin' : assignedRole;
          } else if (userIsDefaultAdmin) {
            // Seed default admin in allowed_users if not existing
            await setDoc(allowedDocRef, {
              email: DEFAULT_ADMIN_EMAIL.toLowerCase(),
              role: 'admin',
              addedBy: 'system',
              createdAt: new Date().toISOString(),
            });
            isWhitelisted = true;
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, pathForAllowed);
        }

        // Fetch or create user profile
        const userDocRef = doc(db, 'users', user.uid);
        const pathForUser = `users/${user.uid}`;
        try {
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const data = userSnap.data() as UserProfile;
            const updatedProfile: UserProfile = {
              ...data,
              isApproved: isWhitelisted,
              role: isWhitelisted && (assignedRole === 'admin' || userIsDefaultAdmin) ? 'admin' : data.role || 'user',
              lastLoginAt: new Date().toISOString(),
            };
            setProfile(updatedProfile);
            // Update lastLoginAt
            await setDoc(userDocRef, {
              ...updatedProfile,
              lastLoginAt: new Date().toISOString(),
            }, { merge: true });
          } else {
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || user.email?.split('@')[0] || 'User',
              photoURL: user.photoURL || '',
              role: assignedRole,
              isApproved: isWhitelisted,
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, newProfile);
            setProfile(newProfile);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, pathForUser);
        }
      } catch (err: any) {
        console.error('Failed to resolve user authorization:', err);
        setAuthError(err.message || 'Authorization check failed.');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch allowed users (Admins only)
  const refreshAllowedUsers = async () => {
    if (!isAdmin) return;
    const path = 'allowed_users';
    try {
      const snap = await getDocs(collection(db, path));
      const list: AllowedUserRecord[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          email: d.id,
          role: data.role || 'user',
          addedBy: data.addedBy || 'admin',
          createdAt: data.createdAt || new Date().toISOString(),
        });
      });
      // Ensure default admin is included in list
      if (!list.some(u => u.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase())) {
        list.unshift({
          email: DEFAULT_ADMIN_EMAIL.toLowerCase(),
          role: 'admin',
          addedBy: 'system',
          createdAt: new Date().toISOString(),
        });
      }
      setAllowedUsers(list);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  };

  useEffect(() => {
    if (isAdmin && currentUser) {
      refreshAllowedUsers();
    }
  }, [isAdmin, currentUser]);

  // Sign In with Google
  const signInWithGoogle = async () => {
    setAuthError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setAuthError(err.message || 'Google Sign-in failed');
      }
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setProfile(null);
      setCurrentUser(null);
      setAllowedUsers([]);
    } catch (err: any) {
      console.error('Sign-out error:', err);
    }
  };

  // Admin: Add new user to whitelist
  const addAllowedUser = async (email: string, role: 'admin' | 'user' = 'user') => {
    if (!isAdmin) throw new Error('Unauthorized: only administrators can add users.');
    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new Error('Please enter a valid Gmail / email address.');
    }

    const path = `allowed_users/${normalizedEmail}`;
    try {
      const docRef = doc(db, 'allowed_users', normalizedEmail);
      await setDoc(docRef, {
        email: normalizedEmail,
        role,
        addedBy: currentUser?.email || 'admin',
        createdAt: new Date().toISOString(),
      });
      await refreshAllowedUsers();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  // Admin: Remove user from whitelist
  const removeAllowedUser = async (email: string) => {
    if (!isAdmin) throw new Error('Unauthorized: only administrators can remove users.');
    const normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail === DEFAULT_ADMIN_EMAIL.toLowerCase()) {
      throw new Error('Cannot remove the primary default administrator.');
    }

    const path = `allowed_users/${normalizedEmail}`;
    try {
      const docRef = doc(db, 'allowed_users', normalizedEmail);
      await deleteDoc(docRef);
      await refreshAllowedUsers();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        isAdmin,
        isApproved,
        loading,
        authError,
        signInWithGoogle,
        signOut,
        allowedUsers,
        refreshAllowedUsers,
        addAllowedUser,
        removeAllowedUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
