import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Car, GraduationCap, UserCog, Settings } from 'lucide-react';
import CodeLogin from './CodeLogin';

const Login = () => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      // Warte kurz bis userData geladen ist, dann redirect
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    } catch (error) {
      console.error('Login error:', error);
      setError('Login fehlgeschlagen. Bitte überprüfen Sie Ihre Anmeldedaten.');
      setLoading(false);
    }
  };

  const handleRoleSelection = (role) => {
    setSelectedRole(role);
    setError('');
  };

  const handleBack = () => {
    setSelectedRole(null);
    setEmail('');
    setPassword('');
    setError('');
  };

  // Logo und Beschreibung basierend auf Rolle
  const getRoleInfo = () => {
    switch (selectedRole) {
      case 'apprentice':
        return {
          title: 'Als Lernende:r einloggen',
          description: 'Dokumentiere deine täglichen Arbeiten und verfolge deine Entwicklung',
          placeholder: 'vorname.nachname@firma.carlicheck.ch'
        };
      case 'trainer':
        return {
          title: 'Als Berufsbildner:in einloggen',
          description: 'Verwalte und bewerte deine Lernenden',
          placeholder: 'ihre.email@firma.ch'
        };
      case 'admin':
        return {
          title: 'Admin-Login',
          description: 'Verwaltung von Firmen, Berufsbildner:innen und Lernenden',
          placeholder: 'admin@carlicheck.ch'
        };
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo und Titel */}
          <div className="text-center mb-8">
            <img 
              src="/logo.svg" 
              alt="carli-check Logo" 
              className="w-24 h-24 mx-auto mb-4"
            />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">carli-check</h1>
            <p className="text-gray-600 text-sm">
              Lernplattform für die Grundbildung Automobilfachmann/-frau EFZ
            </p>
          </div>

          {!selectedRole ? (
            // Rollen-Auswahl
            <div className="space-y-4">
              <button
                onClick={() => handleRoleSelection('apprentice')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-xl font-medium transition-all transform hover:scale-105 flex items-center justify-center gap-3 shadow-lg"
              >
                <GraduationCap className="w-6 h-6" />
                <span>Als Lernende:r einloggen</span>
              </button>

              <button
                onClick={() => handleRoleSelection('trainer')}
                className="w-full bg-white hover:bg-gray-50 text-gray-800 py-4 px-6 rounded-xl font-medium transition-all transform hover:scale-105 flex items-center justify-center gap-3 border-2 border-gray-200 shadow-md"
              >
                <UserCog className="w-6 h-6" />
                <span>Als Berufsbildner:in einloggen</span>
              </button>

              <button
                onClick={() => handleRoleSelection('admin')}
                className="w-full bg-white hover:bg-gray-50 text-gray-600 py-3 px-6 rounded-xl font-medium transition-all flex items-center justify-center gap-3 border border-gray-200"
              >
                <Settings className="w-5 h-5" />
                <span>Admin</span>
              </button>
            </div>
          ) : (
            // Login-Formular oder Code-Login
            <>
              {selectedRole === 'apprentice' ? (
                // Lernende: NUR Code-Login
                <CodeLogin onBack={handleBack} />
              ) : (
                // Trainer/Admin: Normal Login
                <>
                  <div className="mb-6">
                    <button
                      onClick={handleBack}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-2"
                    >
                      ← Zurück zur Auswahl
                    </button>
                  </div>

                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                      {getRoleInfo().title}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {getRoleInfo().description}
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                        {error}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        E-Mail
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        placeholder={getRoleInfo().placeholder}
                        required
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Passwort
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        placeholder="••••••••"
                        required
                        disabled={loading}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Anmelden...' : 'Anmelden'}
                    </button>
                  </form>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-8">
          © 2025 carli-check · Digitale Berufslehre
        </p>
      </div>
    </div>
  );
};

export default Login;
