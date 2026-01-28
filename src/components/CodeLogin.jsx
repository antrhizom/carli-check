import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc,
  setDoc,
  Timestamp 
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { ArrowLeft } from 'lucide-react';

const CodeLogin = ({ onBack }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const codeUpper = code.toUpperCase().trim();
      
      console.log('🔍 Suche Code:', codeUpper);
      
      // 1. Suche Code
      const codeQuery = query(
        collection(db, 'apprenticeCodes'),
        where('code', '==', codeUpper)
      );
      
      const codeSnapshot = await getDocs(codeQuery);
      
      if (codeSnapshot.empty) {
        setError('Ungültiger Code.');
        setLoading(false);
        return;
      }

      const codeData = codeSnapshot.docs[0].data();
      console.log('✅ Code gefunden:', codeData);
      
      // 2. Email und Passwort
      const email = `${codeUpper.toLowerCase()}@carlicheck.ch`;
      const password = codeUpper;

      // 3. Session Persistence
      await setPersistence(auth, browserLocalPersistence);

      // 4. Versuche Login - wenn fehlschlägt, erstelle neuen Account
      try {
        console.log('🔑 Versuche Login...');
        await signInWithEmailAndPassword(auth, email, password);
        console.log('✅ Login erfolgreich!');
        window.location.href = '/apprentice';
        
      } catch (loginError) {
        // User existiert nicht - erstelle neuen Account
        if (loginError.code === 'auth/user-not-found' || loginError.code === 'auth/invalid-credential') {
          console.log('🆕 User existiert nicht, erstelle neuen Account...');
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;
          console.log('✅ Account erstellt:', user.uid);

          await updateProfile(user, { displayName: codeData.name });

          await setDoc(doc(db, 'users', user.uid), {
            role: 'apprentice',
            name: codeData.name,
            email: email,
            code: codeData.code,
            trainerId: codeData.trainerId,
            companyId: codeData.companyId,
            createdAt: Timestamp.now(),
            firstLogin: Timestamp.now()
          });
          console.log('✅ User-Dokument erstellt');

          window.location.href = '/apprentice';
        } else {
          // Anderer Fehler
          throw loginError;
        }
      }
    } catch (error) {
      console.error('❌ Error:', error);
      setError('Fehler: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Zurück
      </button>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Code eingeben
        </h2>
        <p className="text-gray-600">
          Gib deinen 6-stelligen Code ein
        </p>
      </div>

      <form onSubmit={handleCodeSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl font-mono tracking-widest uppercase"
            required
            autoFocus
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
        >
          {loading ? 'Einloggen...' : 'Einloggen'}
        </button>
      </form>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>💡 Hinweis:</strong> Dieser Code ist dein dauerhaftes Passwort. Du kannst dich damit jederzeit auf allen Geräten einloggen.
        </p>
      </div>
    </div>
  );
};

export default CodeLogin;
