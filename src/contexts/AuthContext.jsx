import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Benutzer-Authentifizierung überwachen
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🔐 Auth State Changed:', user ? user.uid : 'No user');
      setCurrentUser(user);
      
      if (user) {
        // Benutzerdaten aus Firestore laden
        try {
          console.log('📄 Loading user data from Firestore...');
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            console.log('✅ User data loaded:', data);
            setUserData(data);
          } else {
            console.error('❌ User document does not exist in Firestore!');
            setUserData(null);
          }
        } catch (error) {
          console.error('❌ Error loading user data:', error);
          setUserData(null);
        }
      } else {
        console.log('🚪 User logged out');
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Login-Funktion
  const signIn = async (email, password) => {
    try {
      // Session Persistence aktivieren
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Logout-Funktion
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUserData(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Benutzerrolle prüfen
  const isAdmin = () => userData?.role === 'admin';
  const isTrainer = () => userData?.role === 'trainer';
  const isApprentice = () => userData?.role === 'apprentice';

  const value = {
    currentUser,
    userData,
    signIn,
    signOut,
    isAdmin,
    isTrainer,
    isApprentice,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
