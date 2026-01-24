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
import { Car, Plus, Calendar, BookOpen, LogOut, Award, TrendingUp, FileDown } from 'lucide-react';
import { exportStatisticsToPDF } from '../../utils/pdfExport';

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

  // Lösche "Neue Notiz" Flags wenn Lernende Einträge anschaut
  useEffect(() => {
    const markNotesAsRead = async () => {
      if (!currentUser || activeTab !== 'my-entries') return;
      
      // Finde alle Einträge mit hasNewNote = true
      const entriesWithNewNotes = entries.filter(e => e.hasNewNote);
      
      if (entriesWithNewNotes.length === 0) return;
      
      try {
        // Setze hasNewNote auf false für alle
        const updatePromises = entriesWithNewNotes.map(entry =>
          updateDoc(doc(db, 'entries', entry.id), {
            hasNewNote: false
          })
        );
        
        await Promise.all(updatePromises);
        
        // Aktualisiere lokalen State
        setEntries(prev =>
          prev.map(e =>
            e.hasNewNote ? { ...e, hasNewNote: false } : e
          )
        );
      } catch (error) {
        console.error('Fehler beim Markieren von Notizen:', error);
      }
    };
    
    markNotesAsRead();
  }, [activeTab, currentUser, entries]);

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

  // PDF Export Funktion
  const handleExportPDF = () => {
    const filtered = getFilteredEntries();
    
    // Prepare tasksByCategory
    const tasksByCategory = workCategories.map((category) => {
      const categoryTasks = getTaskStatistics().filter(({ task }) => {
        const hasTask = filtered.some(e => 
          e.category === category.id && e.tasks?.includes(task)
        );
        return hasTask;
      });
      
      if (categoryTasks.length === 0) return null;
      
      const totalCount = categoryTasks.reduce((sum, t) => sum + t.count, 0);
      
      return {
        id: category.id,
        name: category.name,
        icon: category.icon,
        totalCount,
        tasks: categoryTasks.map(({ task, count }) => ({
          name: task,
          count
        }))
      };
    }).filter(Boolean);
    
    // Prepare competencyData
    const competencyData = competencies.map((comp) => {
      const ratings = filtered
        .map(e => e.competencyRatings?.[comp.id])
        .filter(r => r != null);
      
      if (ratings.length === 0) return null;
      
      const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
      
      return {
        id: comp.id,
        name: comp.name,
        description: comp.description,
        average: avg,
        ratings
      };
    }).filter(Boolean);
    
    // Prepare stats
    const statsForPDF = {
      totalEntries: filtered.length,
      totalHours: filtered.reduce((sum, e) => sum + (e.hoursWorked || 0), 0),
      totalTasks: getTaskStatistics().length,
      categoriesWorked: new Set(filtered.map(e => e.category)).size
    };
    
    exportStatisticsToPDF({
      apprenticeName: userData?.name || 'Lernende/r',
      timeFilter,
      customStartDate,
      customEndDate,
      stats: statsForPDF,
      tasksByCategory,
      competencyData
    });
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

              {/* Selbsteinschätzung Kompetenzen */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Selbsteinschätzung Kompetenzen
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Bewerte deine Leistung in den folgenden Kompetenzbereichen (1 = Ungenügend, 6 = Sehr gut)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {competencies.map((comp) => (
                    <div key={comp.id} className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        {comp.name}
                      </label>
                      <p className="text-xs text-gray-600 mb-3">{comp.description}</p>
                      <div className="flex items-center space-x-2">
                        {ratingScale.map((rating) => (
                          <button
                            key={rating.value}
                            type="button"
                            onClick={() => setCompetencyRatings(prev => ({
                              ...prev,
                              [comp.id]: rating.value
                            }))}
                            className={`flex-1 py-2 px-1 rounded text-sm font-medium transition ${
                              competencyRatings[comp.id] === rating.value
                                ? 'ring-2 ring-offset-2'
                                : 'hover:bg-gray-200'
                            }`}
                            style={{
                              backgroundColor: competencyRatings[comp.id] === rating.value 
                                ? rating.color 
                                : '#e5e7eb',
                              color: competencyRatings[comp.id] === rating.value 
                                ? '#ffffff' 
                                : '#374151',
                              ringColor: rating.color
                            }}
                          >
                            {rating.value}
                          </button>
                        ))}
                      </div>
                      {competencyRatings[comp.id] && (
                        <p className="text-xs text-gray-600 mt-2 text-center">
                          {ratingScale.find(r => r.value === competencyRatings[comp.id])?.label}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
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
                    <div className="flex items-center space-x-2">
                      {entry.hasNewNote && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 animate-pulse">
                          💬 Neue Notiz!
                        </span>
                      )}
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        entry.status === 'reviewed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {entry.status === 'reviewed' ? 'Bewertet' : 'Ausstehend'}
                      </span>
                    </div>
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
                    
                    {entry.trainerNote && (
                      <div className="mt-4 pt-4 border-t border-gray-200 bg-blue-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                          💬 Notiz vom Berufsbildner:
                        </h4>
                        <p className="text-sm text-blue-800">{entry.trainerNote}</p>
                        {entry.trainerNoteAt && (
                          <p className="text-xs text-blue-600 mt-2">
                            Hinzugefügt am {entry.trainerNoteAt?.toDate?.()?.toLocaleString('de-CH')}
                          </p>
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
            {/* Basis-Statistiken ZUOBERST */}
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
                    <p className="text-sm text-gray-600">Verschiedene Aufgaben</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{getTaskStatistics().length}</p>
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

            {/* Zeitfilter */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Zeitraum</h3>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Als PDF exportieren</span>
                </button>
              </div>
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

            {/* COOLE GRAFIK: Gemachte Aufgaben im Zeitraum */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Deine Aufgaben im gewählten Zeitraum
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({getTaskStatistics().length} verschiedene Aufgaben)
                </span>
              </h3>
              
              {getTaskStatistics().length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-gray-500">Keine Aufgaben im gewählten Zeitraum</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {getTaskStatistics().map(({ task, count }, index) => {
                    const colors = getFrequencyColor(count);
                    return (
                      <div
                        key={index}
                        className={`relative p-4 rounded-xl border-2 ${colors.border} ${colors.bg} transform transition-all hover:scale-105 hover:shadow-lg cursor-default`}
                      >
                        {/* Badge mit Anzahl */}
                        <div 
                          className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg"
                          style={{ 
                            backgroundColor: colors.text === 'text-green-800' ? '#22c55e' 
                              : colors.text === 'text-yellow-800' ? '#eab308'
                              : '#ef4444'
                          }}
                        >
                          {count}
                        </div>
                        
                        {/* Icon basierend auf Häufigkeit */}
                        <div className="text-3xl mb-2">
                          {count >= 5 ? '🌟' : count >= 3 ? '⭐' : '✨'}
                        </div>
                        
                        {/* Aufgaben-Name */}
                        <p className={`text-sm font-medium ${colors.text} line-clamp-2`}>
                          {task}
                        </p>
                        
                        {/* Anzahl-Label */}
                        <p className="text-xs text-gray-500 mt-2">
                          {count}× durchgeführt
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ACCORDEONS: Pro Kategorie */}
            <div className="space-y-3">
              {getTaskStatistics().length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-gray-500">Keine Aufgaben im gewählten Zeitraum</p>
                </div>
              ) : (
                workCategories.map((category) => {
                  // Finde alle Aufgaben dieser Kategorie
                  const filtered = getFilteredEntries();
                  const categoryTasks = getTaskStatistics().filter(({ task }) => {
                    const hasTask = filtered.some(e => 
                      e.category === category.id && e.tasks?.includes(task)
                    );
                    return hasTask;
                  });
                  
                  if (categoryTasks.length === 0) return null;
                  
                  const totalCount = categoryTasks.reduce((sum, t) => sum + t.count, 0);
                  const colors = getFrequencyColor(totalCount);
                  
                  return (
                    <details key={category.id} className="bg-white rounded-lg shadow-sm overflow-hidden group border-2" style={{ borderColor: colors.border.replace('border-', '') }}>
                      <summary className={`px-6 py-4 cursor-pointer flex items-center justify-between hover:bg-gray-50 transition ${colors.bg}`}>
                        <div className="flex items-center space-x-3 flex-1">
                          <span className="text-3xl">{category.icon}</span>
                          <div>
                            <h3 className="text-base font-semibold text-gray-900">{category.name}</h3>
                            <p className="text-sm text-gray-500">{categoryTasks.length} verschiedene Aufgaben • {totalCount}× gesamt</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${colors.bg} ${colors.text}`}>
                            {totalCount}
                          </span>
                          <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                        </div>
                      </summary>
                      
                      <div className="px-6 pb-6 pt-2 border-t border-gray-100">
                        {/* Liste aller Aufgaben in dieser Kategorie */}
                        <div className="space-y-3">
                          {categoryTasks.map(({ task, count }, idx) => {
                            const taskColors = getFrequencyColor(count);
                            const maxCount = Math.max(...categoryTasks.map(t => t.count));
                            const widthPercent = (count / maxCount) * 100;
                            
                            const taskEntries = filtered.filter(e => 
                              e.category === category.id && e.tasks?.includes(task)
                            );
                            
                            return (
                              <div key={idx} className={`p-3 rounded-lg border-2 ${taskColors.border} ${taskColors.bg}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xl">
                                      {count >= 5 ? '🌟' : count >= 3 ? '⭐' : '✨'}
                                    </span>
                                    <span className={`font-medium ${taskColors.text}`}>{task}</span>
                                  </div>
                                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${taskColors.bg} ${taskColors.text}`}>
                                    {count}×
                                  </span>
                                </div>
                                
                                {/* Mini-Säule */}
                                <div className="mb-2">
                                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all duration-500"
                                      style={{
                                        width: `${widthPercent}%`,
                                        backgroundColor: taskColors.text === 'text-green-800' ? '#22c55e' 
                                          : taskColors.text === 'text-yellow-800' ? '#eab308'
                                          : '#ef4444',
                                        minWidth: '30px'
                                      }}
                                    />
                                  </div>
                                </div>
                                
                                {/* Details aufklappbar */}
                                <details className="mt-2">
                                  <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-900">
                                    Details anzeigen ({taskEntries.length} Einträge)
                                  </summary>
                                  <div className="mt-2 space-y-1">
                                    {taskEntries.slice(0, 5).map((entry, i) => (
                                      <div key={i} className="flex items-center justify-between text-xs bg-white p-2 rounded">
                                        <span className="text-gray-700">{entry.date?.toLocaleDateString('de-CH')}</span>
                                        <div className="flex items-center space-x-2">
                                          {entry.hoursWorked > 0 && <span className="text-gray-500">{entry.hoursWorked}h</span>}
                                          {entry.trainerNote && (
                                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                                              💬
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                    {taskEntries.length > 5 && (
                                      <p className="text-xs text-gray-500 italic">
                                        ... und {taskEntries.length - 5} weitere
                                      </p>
                                    )}
                                  </div>
                                </details>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </details>
                  );
                }).filter(Boolean)
              )}
            </div>

            {/* ACCORDION: Kompetenzen */}
            <details className="bg-white rounded-lg shadow-sm overflow-hidden group">
              <summary className="px-6 py-4 cursor-pointer flex items-center justify-between hover:bg-gray-50 transition">
                <h3 className="text-lg font-semibold text-gray-900">
                  🎓 Kompetenz-Entwicklung
                </h3>
                <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              
              <div className="px-6 pb-6 pt-2">
                <p className="text-sm text-gray-600 mb-4">
                  Deine Selbsteinschätzungen im gewählten Zeitraum
                </p>
                
                <div className="space-y-4">
                  {competencies.map((comp) => {
                    // Berechne Durchschnitt für diese Kompetenz
                    const filtered = getFilteredEntries();
                    const ratings = filtered
                      .map(e => e.competencyRatings?.[comp.id])
                      .filter(r => r != null);
                    
                    if (ratings.length === 0) return null;
                    
                    const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
                    const ratingInfo = ratingScale.find(r => r.value === Math.round(avg));
                    
                    return (
                      <div key={comp.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{comp.name}</h4>
                            <p className="text-xs text-gray-600 mt-1">{comp.description}</p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <div 
                                className="px-3 py-1 rounded-full text-sm font-bold text-white"
                                style={{ backgroundColor: ratingInfo?.color }}
                              >
                                ⌀ {avg.toFixed(1)}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {ratings.length}× bewertet
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Mini-Verlauf */}
                        <div className="flex items-end space-x-1 h-12">
                          {ratings.slice(-10).map((rating, idx) => {
                            const rInfo = ratingScale.find(r => r.value === rating);
                            const heightPercent = (rating / 6) * 100;
                            
                            return (
                              <div 
                                key={idx}
                                className="flex-1 rounded-t transition-all hover:opacity-75"
                                style={{ 
                                  backgroundColor: rInfo?.color,
                                  height: `${heightPercent}%`,
                                  minHeight: '8px'
                                }}
                                title={`Bewertung ${idx + 1}: ${rating} (${rInfo?.label})`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  }).filter(Boolean)}
                  
                  {competencies.every(comp => {
                    const filtered = getFilteredEntries();
                    const ratings = filtered
                      .map(e => e.competencyRatings?.[comp.id])
                      .filter(r => r != null);
                    return ratings.length === 0;
                  }) && (
                    <div className="text-center py-8 text-gray-500">
                      Keine Kompetenzbewertungen im gewählten Zeitraum
                    </div>
                  )}
                </div>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprenticeDashboard;
