import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { Plus, Copy, X } from 'lucide-react';

const ApprenticeCodeGenerator = ({ trainerId, companyId }) => {
  const [showModal, setShowModal] = useState(false);
  const [showNameForm, setShowNameForm] = useState(false);
  const [apprenticeName, setApprenticeName] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [loading, setLoading] = useState(false);

  // 6-stelligen Code generieren
  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Ohne 0, O, 1, I
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Code in Firestore speichern
  const handleGenerateCode = async () => {
    if (!apprenticeName.trim()) {
      alert('Bitte Name eingeben!');
      return;
    }
    
    if (!trainerId) {
      alert('Fehler: Trainer-ID fehlt. Bitte Seite neu laden.');
      return;
    }

    setLoading(true);
    try {
      const code = generateCode();
      
      await addDoc(collection(db, 'apprenticeCodes'), {
        code: code,
        name: apprenticeName.trim(),
        trainerId: trainerId,
        companyId: companyId || null,
        used: false,
        userId: null,
        createdAt: Timestamp.now()
      });

      setGeneratedCode(code);
      setShowNameForm(false);
      setShowModal(true);
    } catch (error) {
      console.error('Error generating code:', error);
      alert('Fehler beim Generieren des Codes.');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    alert('Code kopiert!');
  };

  const copyInstructions = () => {
    const text = `Hallo ${apprenticeName}! Du bist jetzt registriert für carli-check.

Dein Code: ${generatedCode}

WICHTIG: Dieser Code ist dein dauerhaftes Passwort!
Du kannst dich damit jederzeit auf allen Geräten einloggen.

So geht's:
1. App öffnen: carli-check.vercel.app
2. "Als Lernende:r einloggen" klicken  
3. Code eingeben: ${generatedCode}
4. Fertig!

Bei erneutem Login: Einfach wieder den gleichen Code eingeben.`;
    
    navigator.clipboard.writeText(text);
    alert('Anleitung kopiert!');
  };

  return (
    <>
      <button
        onClick={() => setShowNameForm(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        <Plus className="w-4 h-4" />
        Neuer Code
      </button>

      {/* Name-Eingabe Modal */}
      {showNameForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                Neue:r Lernende:r
              </h3>
              <button
                onClick={() => {
                  setShowNameForm(false);
                  setApprenticeName('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name des/der Lernenden
              </label>
              <input
                type="text"
                value={apprenticeName}
                onChange={(e) => setApprenticeName(e.target.value)}
                placeholder="z.B. Max Muster"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleGenerateCode();
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-2">
                Dieser Name wird dem/der Lernenden zugewiesen
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowNameForm(false);
                  setApprenticeName('');
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Abbrechen
              </button>
              <button
                onClick={handleGenerateCode}
                disabled={loading || !apprenticeName.trim()}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
              >
                {loading ? 'Generiere...' : 'Code erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  ✅ Code erstellt!
                </h3>
                <p className="text-gray-600 mt-1">
                  für {apprenticeName}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setApprenticeName('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Code anzeigen */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6 text-center">
              <p className="text-blue-600 text-sm mb-2">Code für Lernende:r:</p>
              <p className="font-mono text-4xl font-bold text-blue-900 tracking-wider">
                {generatedCode}
              </p>
              <button
                onClick={copyCode}
                className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Copy className="w-4 h-4" />
                Code kopieren
              </button>
            </div>

            {/* Anleitung */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-gray-700 text-sm font-medium mb-2">
                📱 So informieren Sie den/die Lernende:n:
              </p>
              <div className="bg-white p-3 rounded border border-gray-200 text-xs text-gray-600 space-y-1">
                <p>1. App öffnen: <span className="font-mono">carli-check.vercel.app</span></p>
                <p>2. "Als Lernende:r einloggen" klicken</p>
                <p>3. Code eingeben: <span className="font-mono font-bold text-blue-600">{generatedCode}</span></p>
                <p>4. Fertig! → Automatisch als <strong>{apprenticeName}</strong> eingeloggt</p>
                <p className="text-green-600 font-medium pt-1">✓ Code funktioniert auf allen Geräten und für wiederholtes Login!</p>
              </div>
              <button
                onClick={copyInstructions}
                className="mt-3 w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm"
              >
                📋 Anleitung kopieren
              </button>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-green-800">
                <strong>✓ Dauerhaftes Passwort:</strong> Der/die Lernende kann sich mit diesem Code jederzeit auf allen Geräten einloggen - über die gesamte Lehrzeit!
              </p>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Verstanden
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ApprenticeCodeGenerator;
