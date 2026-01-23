import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  doc,
  getDoc,
  Timestamp 
} from 'firebase/firestore';
import { workCategories, competencies, ratingScale } from '../../data/curriculum';
import { Car, Plus, Calendar, BookOpen, LogOut, Award, TrendingUp } from 'lucide-react';

const ApprenticeDashboard = () => {
  const { signOut, userData, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('new-entry');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [companyData, setCompanyData] = useState(null);
  
  // Form State
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [customTask, setCustomTask] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hoursWorked, setHoursWorked] = useState('');

  // Firmen-Daten laden
  useEffect(() => {
    const loadCompanyData = async () => {
      if (userData?.companyId) {
        try {
          const companyDoc = await getDoc(doc(db, 'companies', userData.companyId));
          if (companyDoc.exists()) {
            setCompanyData(companyDoc.data());
          }
        } catch (error) {
          console.error('Error loading company data:', error);
        }
      }
    };
    loadCompanyData();
  }, [userData]);

  // Einträge laden
  useEffect(() => {
    const loadEntries = async () => {
      if (!currentUser) {
        console.log('⚠️ loadEntries: currentUser ist null');
        return;
      }
      
      console.log('📋 loadEntries: Starte Laden der Einträge...');
      console.log('👤 currentUser.uid:', currentUser.uid);
      
      setLoading(true);
      try {
        const q = query(
          collection(db, 'entries'),
          where('apprenticeId', '==', currentUser.uid)
          // orderBy('date', 'desc') // TEMPORÄR DEAKTIVIERT - braucht Index
        );
        
        console.log('🔍 Query erstellt:', {
          collection: 'entries',
          where: `apprenticeId == ${currentUser.uid}`,
          orderBy: 'DEAKTIVIERT (kein Index)'
        });
        
        const snapshot = await getDocs(q);
        console.log('📦 Query-Ergebnis:', snapshot.docs.length, 'Dokumente gefunden');
        
        const entriesData = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log('📄 Dokument:', doc.id, data);
          return {
            id: doc.id,
            ...data,
            date: data.date?.toDate()
          };
        });
        
        // Manuell nach Datum sortieren (da kein orderBy in Query)
        entriesData.sort((a, b) => (b.date || 0) - (a.date || 0));
        
        console.log('✅ Einträge geladen:', entriesData.length);
        setEntries(entriesData);
      } catch (error) {
        console.error('❌ Error loading entries:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === 'my-entries') {
      console.log('🔄 Tab "Meine Einträge" aktiv, lade Einträge...');
      loadEntries();
    }
  }, [currentUser, activeTab]);

  // Aufgabe Toggle
  const toggleTask = (task) => {
    setSelectedTasks(prev =>
      prev.includes(task)
        ? prev.filter(t => t !== task)
        : [...prev, task]
    );
  };

  // Eintrag speichern
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCategory || (selectedTasks.length === 0 && !customTask)) {
      alert('Bitte wählen Sie mindestens eine Kategorie und Aufgabe aus.');
      return;
    }

    setLoading(true);
    try {
      const allTasks = [...selectedTasks];
      if (customTask.trim()) {
        allTasks.push(customTask.trim());
      }

      const entry = {
        apprenticeId: currentUser.uid,
        apprenticeName: userData?.name || '',
        companyId: userData?.companyId || '',
        trainerId: userData?.trainerId || '',
        category: selectedCategory,
        categoryName: workCategories.find(c => c.id === selectedCategory)?.name || '',
        tasks: allTasks,
        description: description.trim(),
        date: Timestamp.fromDate(new Date(date)),
        hoursWorked: parseFloat(hoursWorked) || 0,
        status: 'pending',
        createdAt: Timestamp.now(),
        feedback: null,
        competencyRatings: {}
      };

      console.log('📝 Speichere Eintrag:', entry);
      console.log('👤 currentUser.uid:', currentUser.uid);
      console.log('📋 userData:', userData);

      const docRef = await addDoc(collection(db, 'entries'), entry);
      console.log('✅ Eintrag gespeichert mit ID:', docRef.id);
      
      // Form zurücksetzen - NUR BEI ERFOLG!
      setSelectedCategory('');
      setSelectedTasks([]);
      setCustomTask('');
      setDescription('');
      setHoursWorked('');
      setDate(new Date().toISOString().split('T')[0]);
      
      console.log('✅ Form wurde zurückgesetzt');
      console.log('✅ selectedTasks nach Reset:', []);
      
      alert('✅ Eintrag erfolgreich gespeichert!');
      
      setLoading(false);
    } catch (error) {
      console.error('❌ FEHLER beim Speichern:', error);
      console.error('❌ Error Code:', error.code);
      console.error('❌ Error Message:', error.message);
      console.error('❌ Full Error:', JSON.stringify(error, null, 2));
      
      alert('❌ FEHLER beim Speichern!\n\n' + 
            'Error: ' + error.message + '\n' +
            'Code: ' + error.code + '\n\n' +
            'Bitte prüfe:\n' +
            '1. Firestore Rules (sind sie offen?)\n' +
            '2. Internet-Verbindung\n' +
            '3. Browser Console (F12) für Details');
      
      setLoading(false);
    }
  };

  // Statistiken berechnen
  const stats = {
    totalEntries: entries.length,
    totalHours: entries.reduce((sum, e) => sum + (e.hoursWorked || 0), 0),
    reviewedEntries: entries.filter(e => e.status === 'reviewed').length,
    categoriesWorked: new Set(entries.map(e => e.category)).size
  };

  const categoryName = workCategories.find(c => c.id === selectedCategory)?.name || '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Car className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">carli-check</h1>
                <p className="text-sm text-gray-600">
                  {userData?.name} {companyData?.name && `· ${companyData.name}`}
                </p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Abmelden</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('new-entry')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === 'new-entry'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Neuer Eintrag</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('my-entries')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === 'my-entries'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4" />
                  <span>Meine Einträge</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('statistics')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === 'statistics'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>Statistik</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'new-entry' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Neuer Arbeitsbericht</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Datum und Stunden */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Datum *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Arbeitsstunden
                  </label>
                  <input
                    type="number"
                    value={hoursWorked}
                    onChange={(e) => setHoursWorked(e.target.value)}
                    min="0"
                    max="24"
                    step="0.5"
                    placeholder="z.B. 8"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Kategorie Auswahl */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Arbeitskategorie * <span className="text-gray-500 font-normal">({categoryName})</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {workCategories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(category.id);
                        setSelectedTasks([]);
                      }}
                      className={`p-4 rounded-lg border-2 transition ${
                        selectedCategory === category.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-3xl mb-2">{category.icon}</div>
                      <div className="text-sm font-medium text-gray-900">{category.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Aufgaben Auswahl */}
              {selectedCategory && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Durchgeführte Aufgaben *
                  </label>
                  <div className="space-y-2">
                    {workCategories
                      .find(c => c.id === selectedCategory)
                      ?.tasks.map((task, index) => (
                        <label
                          key={index}
                          className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition"
                        >
                          <input
                            type="checkbox"
                            checked={selectedTasks.includes(task)}
                            onChange={() => toggleTask(task)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="ml-3 text-sm text-gray-900">{task}</span>
                        </label>
                      ))}
                    
                    {/* Freies Feld */}
                    <div className="mt-3">
                      <input
                        type="text"
                        value={customTask}
                        onChange={(e) => setCustomTask(e.target.value)}
                        placeholder="Freies Feld: Weitere Aufgabe hinzufügen..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Beschreibung */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Detaillierte Beschreibung
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Beschreiben Sie Ihre Arbeit ausführlich: Was haben Sie gemacht? Welche Herausforderungen gab es? Was haben Sie gelernt?"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('');
                    setSelectedTasks([]);
                    setCustomTask('');
                    setDescription('');
                    setHoursWorked('');
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Zurücksetzen
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50"
                >
                  {loading ? 'Speichern...' : 'Eintrag speichern'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'my-entries' && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Lade Einträge...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Noch keine Einträge</h3>
                <p className="text-gray-600">
                  Erstellen Sie Ihren ersten Arbeitsbericht über den Tab "Neuer Eintrag".
                </p>
              </div>
            ) : (
              entries.map((entry) => (
                <div key={entry.id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3">
                      <div className="text-3xl">
                        {workCategories.find(c => c.id === entry.category)?.icon || '📋'}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{entry.categoryName}</h3>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {entry.date?.toLocaleString('de-CH', { 
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {entry.hoursWorked > 0 && (
                            <span>{entry.hoursWorked} Std.</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      entry.status === 'reviewed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {entry.status === 'reviewed' ? 'Bewertet' : 'Ausstehend'}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Aufgaben:</h4>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        {entry.tasks?.map((task, idx) => (
                          <li key={idx}>{task}</li>
                        ))}
                      </ul>
                    </div>
                    
                    {entry.description && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Beschreibung:</h4>
                        <p className="text-sm text-gray-600">{entry.description}</p>
                      </div>
                    )}
                    
                    {entry.feedback && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <Award className="w-4 h-4 mr-1" />
                          Feedback vom Berufsbildner:
                        </h4>
                        <p className="text-sm text-gray-600 mb-3">{entry.feedback}</p>
                        
                        {Object.keys(entry.competencyRatings || {}).length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Kompetenzen:</h5>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {Object.entries(entry.competencyRatings).map(([compId, rating]) => {
                                const comp = competencies.find(c => c.id === compId);
                                const ratingInfo = ratingScale.find(r => r.value === rating);
                                return (
                                  <div key={compId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-xs text-gray-700">{comp?.name}</span>
                                    <span 
                                      className="text-xs font-bold px-2 py-1 rounded"
                                      style={{ backgroundColor: ratingInfo?.color + '20', color: ratingInfo?.color }}
                                    >
                                      {rating}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'statistics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Einträge gesamt</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalEntries}</p>
                </div>
                <BookOpen className="w-12 h-12 text-blue-600 opacity-20" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Arbeitsstunden</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalHours.toFixed(1)}</p>
                </div>
                <Calendar className="w-12 h-12 text-green-600 opacity-20" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Bewertet</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.reviewedEntries}</p>
                </div>
                <Award className="w-12 h-12 text-purple-600 opacity-20" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Kategorien</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.categoriesWorked}</p>
                </div>
                <TrendingUp className="w-12 h-12 text-orange-600 opacity-20" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprenticeDashboard;
