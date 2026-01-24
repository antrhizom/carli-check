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
  updateDoc,
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
  
  // Statistik Filter State
  const [timeFilter, setTimeFilter] = useState('month'); // 'week', 'month', 'year', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Form State
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [customTask, setCustomTask] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hoursWorked, setHoursWorked] = useState('');
  const [existingEntryId, setExistingEntryId] = useState(null);
  const [competencyRatings, setCompetencyRatings] = useState({}); // Selbsteinschätzung!

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

  // Einträge vom gewählten Datum UND Kategorie laden
  useEffect(() => {
    const loadEntryForDateAndCategory = () => {
      if (!date || !selectedCategory) {
        console.log('⚠️ Datum oder Kategorie fehlt:', { date, selectedCategory });
        // Wenn keine Kategorie gewählt: Formular leeren
        if (!selectedCategory) {
          setSelectedTasks([]);
          setCustomTask('');
          setDescription('');
          setHoursWorked('');
          setExistingEntryId(null);
        }
        return;
      }
      
      console.log('🔍 Suche Eintrag für Datum + Kategorie:', date, selectedCategory);
      console.log('📋 Verfügbare Einträge:', entries.length);
      
      // Filtere durch bereits geladene Einträge
      const selectedDateStr = date; // z.B. "2026-01-23"
      
      let foundEntry = null;
      entries.forEach(entry => {
        if (entry.date && entry.category === selectedCategory) {
          const entryDateStr = entry.date.toISOString().split('T')[0];
          console.log('  📄 Eintrag:', entryDateStr, entry.category, 'Gesucht:', selectedDateStr, selectedCategory);
          
          if (entryDateStr === selectedDateStr) {
            console.log('  ✅ MATCH gefunden!', entry);
            foundEntry = entry;
          }
        }
      });
      
      if (foundEntry) {
        // Eintrag für dieses Datum + Kategorie gefunden!
        console.log('✅ Eintrag gefunden für', date, selectedCategory, ':', foundEntry);
        
        // NUR Aufgaben, Beschreibung, Stunden, Ratings vorausfüllen
        setSelectedTasks(foundEntry.tasks || []);
        setDescription(foundEntry.description || '');
        setHoursWorked(foundEntry.hoursWorked?.toString() || '');
        setCompetencyRatings(foundEntry.competencyRatings || {});
        setExistingEntryId(foundEntry.id);
        
        console.log('📝 Formular vorausgefüllt:', {
          tasks: foundEntry.tasks,
          hoursWorked: foundEntry.hoursWorked,
          ratings: foundEntry.competencyRatings
        });
      } else {
        // Kein Eintrag für dieses Datum + Kategorie
        console.log('ℹ️ Kein Eintrag für', date, selectedCategory);
        setSelectedTasks([]);
        setCustomTask('');
        setDescription('');
        setHoursWorked('');
        setCompetencyRatings({});
        setExistingEntryId(null);
      }
    };
    
    loadEntryForDateAndCategory();
  }, [date, selectedCategory, entries]); // Kategorie als Dependency!

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
            date: data.date?.toDate(),
            createdAt: data.createdAt?.toDate()
          };
        });
        
        // Manuell nach createdAt sortieren (neueste zuerst)
        entriesData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
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

    // IMMER beim Start laden, nicht nur bei Tab-Wechsel!
    console.log('🔄 Lade Einträge beim Start...');
    loadEntries();
  }, [currentUser]); // Nur currentUser als Dependency

  // Aufgabe Toggle
  const toggleTask = (task) => {
    setSelectedTasks(prev =>
      prev.includes(task)
        ? prev.filter(t => t !== task)
        : [...prev, task]
    );
  };

  // Prüfe ob für Datum + Kategorie bereits ein Eintrag existiert
  const getEntryForCategory = (categoryId) => {
    if (!date) return null;
    
    const selectedDateStr = date;
    return entries.find(entry => {
      if (entry.date && entry.category === categoryId) {
        const entryDateStr = entry.date.toISOString().split('T')[0];
        return entryDateStr === selectedDateStr;
      }
      return false;
    });
  };

  // Zähle Aufgaben für eine Kategorie
  const getTaskCountForCategory = (categoryId) => {
    const entry = getEntryForCategory(categoryId);
    return entry?.tasks?.length || 0;
  };

  // Eintrag speichern oder aktualisieren
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

      const entryData = {
        category: selectedCategory,
        categoryName: workCategories.find(c => c.id === selectedCategory)?.name || '',
        tasks: allTasks,
        description: description.trim(),
        date: Timestamp.fromDate(new Date(date)),
        hoursWorked: parseFloat(hoursWorked) || 0
      };

      if (existingEntryId) {
        // AKTUALISIEREN eines existierenden Eintrags
        console.log('🔄 Aktualisiere Eintrag:', existingEntryId, entryData);
        
        await updateDoc(doc(db, 'entries', existingEntryId), {
          ...entryData,
          updatedAt: Timestamp.now()
        });
        
        console.log('✅ Eintrag aktualisiert!');
        alert('✅ Eintrag erfolgreich aktualisiert!');
      } else {
        // NEUER Eintrag
        const newEntry = {
          apprenticeId: currentUser.uid,
          apprenticeName: userData?.name || '',
          companyId: userData?.companyId || '',
          trainerId: userData?.trainerId || '',
          ...entryData,
          status: 'pending',
          createdAt: Timestamp.now(),
          feedback: null,
          competencyRatings: {}
        };

        console.log('📝 Speichere neuen Eintrag:', newEntry);
        console.log('👤 currentUser.uid:', currentUser.uid);
        console.log('📋 userData:', userData);

        const docRef = await addDoc(collection(db, 'entries'), newEntry);
        console.log('✅ Neuer Eintrag gespeichert mit ID:', docRef.id);
        
        alert('✅ Eintrag erfolgreich gespeichert!');
      }
      
      // Entries neu laden um Badges zu aktualisieren
      const q = query(
        collection(db, 'entries'),
        where('apprenticeId', '==', currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const entriesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate(),
          createdAt: data.createdAt?.toDate()
        };
      });
      entriesData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setEntries(entriesData);
      
      // Form NUR teilweise zurücksetzen - Kategorie und Datum bleiben!
      setSelectedTasks([]);
      setCustomTask('');
      setDescription('');
      setHoursWorked('');
      setExistingEntryId(null);
      
      console.log('✅ Form wurde zurückgesetzt (Kategorie + Datum bleiben)');
      
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

  // Filtere Einträge nach gewähltem Zeitraum
  const getFilteredEntries = () => {
    const now = new Date();
    let startDate;
    
    switch(timeFilter) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'custom':
        if (!customStartDate || !customEndDate) return entries;
        startDate = new Date(customStartDate);
        const endDate = new Date(customEndDate);
        return entries.filter(e => {
          const entryDate = e.date;
          return entryDate >= startDate && entryDate <= endDate;
        });
      default:
        return entries;
    }
    
    return entries.filter(e => e.date >= startDate);
  };

  // Berechne Aufgaben-Häufigkeit
  const getTaskStatistics = () => {
    const filtered = getFilteredEntries();
    const taskCounts = {};
    
    filtered.forEach(entry => {
      entry.tasks?.forEach(task => {
        taskCounts[task] = (taskCounts[task] || 0) + 1;
      });
    });
    
    // Sortiere nach Häufigkeit (absteigend)
    return Object.entries(taskCounts)
      .map(([task, count]) => ({ task, count }))
      .sort((a, b) => b.count - a.count);
  };

  // Farbcode basierend auf Häufigkeit
  const getFrequencyColor = (count) => {
    if (count >= 5) return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' };
    if (count >= 3) return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' };
    if (count >= 1) return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' };
    return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' };
  };

  // Einfache Statistiken
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
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {existingEntryId ? 'Arbeitsbericht bearbeiten' : 'Neuer Arbeitsbericht'}
            </h2>
            
            {/* Info-Banner wenn Eintrag bearbeitet wird */}
            {existingEntryId && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Bearbeitung
                    </h3>
                    <div className="mt-1 text-sm text-blue-700">
                      Du bearbeitest einen existierenden Eintrag vom {new Date(date).toLocaleDateString('de-CH')}. 
                      Änderungen werden gespeichert und überschreiben den alten Eintrag.
                    </div>
                  </div>
                </div>
              </div>
            )}
            
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
                  {workCategories.map((category) => {
                    const taskCount = getTaskCountForCategory(category.id);
                    const hasEntry = taskCount > 0;
                    
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(category.id);
                          // NICHT mehr Aufgaben leeren - das passiert automatisch im useEffect!
                        }}
                        className={`p-4 rounded-lg border-2 transition relative ${
                          selectedCategory === category.id
                            ? 'border-blue-600 bg-blue-50'
                            : hasEntry
                            ? 'border-green-500 bg-green-50 hover:border-green-600'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {/* Badge mit Anzahl */}
                        {hasEntry && (
                          <div className="absolute top-2 right-2 bg-green-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                            {taskCount}
                          </div>
                        )}
                        <div className="text-3xl mb-2">{category.icon}</div>
                        <div className="text-sm font-medium text-gray-900">{category.name}</div>
                      </button>
                    );
                  })}
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
                  {loading ? 'Speichern...' : (existingEntryId ? 'Änderungen speichern' : 'Eintrag speichern')}
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
                            {entry.createdAt?.toLocaleString('de-CH', { 
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
          <div className="space-y-6">
            {/* Zeitfilter */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Zeitraum</h3>
              <div className="flex flex-wrap gap-3 mb-4">
                <button
                  onClick={() => setTimeFilter('week')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    timeFilter === 'week'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Letzte Woche
                </button>
                <button
                  onClick={() => setTimeFilter('month')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    timeFilter === 'month'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Letzter Monat
                </button>
                <button
                  onClick={() => setTimeFilter('year')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    timeFilter === 'year'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Letztes Jahr
                </button>
                <button
                  onClick={() => setTimeFilter('custom')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    timeFilter === 'custom'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Eigener Zeitraum
                </button>
              </div>
              
              {/* Custom Date Range */}
              {timeFilter === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Von</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bis</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Aufgaben-Häufigkeit */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Aufgaben-Häufigkeit
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({getTaskStatistics().length} verschiedene Aufgaben)
                </span>
              </h3>
              
              {/* Legende */}
              <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-sm text-gray-700">Oft (5+ mal)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span className="text-sm text-gray-700">Mittel (3-4 mal)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="text-sm text-gray-700">Selten (1-2 mal)</span>
                </div>
              </div>

              {/* Aufgaben-Liste */}
              {getTaskStatistics().length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Keine Aufgaben im gewählten Zeitraum
                </p>
              ) : (
                <div className="space-y-2">
                  {getTaskStatistics().map(({ task, count }, index) => {
                    const colors = getFrequencyColor(count);
                    return (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-4 rounded-lg border-2 ${colors.border} ${colors.bg}`}
                      >
                        <span className={`font-medium ${colors.text}`}>{task}</span>
                        <div className="flex items-center space-x-3">
                          <span className={`text-sm ${colors.text}`}>
                            {count} {count === 1 ? 'mal' : 'mal'}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${colors.bg} ${colors.text}`}>
                            {count}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Basis-Statistiken */}
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
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprenticeDashboard;
