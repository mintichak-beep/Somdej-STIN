import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User } from '../types';

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkLocalUser = async () => {
    const stored = localStorage.getItem('stin_current_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCurrentUser(parsed);
      } catch (e) {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    checkLocalUser();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            setCurrentUser({ id: userDocSnap.id, ...userDocSnap.data() } as User);
          } else {
            const stored = localStorage.getItem('stin_current_user');
            if (stored) {
              setCurrentUser(JSON.parse(stored));
            } else {
              setCurrentUser({
                id: user.uid,
                email: user.email || 'user@stin.ac.th',
                role: 'student',
                displayName: user.displayName || 'User',
                createdAt: null as any
              });
            }
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
        }
      } else {
        await checkLocalUser();
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signOut = async () => {
    localStorage.removeItem('stin_current_user');
    setCurrentUser(null);
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, firebaseUser, loading, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

