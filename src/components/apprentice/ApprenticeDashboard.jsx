import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { workCategories, competencies } from '../../data/curriculum';
import { Plus, Calendar, LogOut, Award, TrendingUp, Trash2, MessageCircle, Eye, ChevronDown, ChevronUp } from 'lucide-react';

const ApprenticeDashboard = () => {
  const { signOut, userData, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('new-entry');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [companyData, setCompanyData] = useState(null);
  
  // Filter States
  const [timeFilter, setTimeFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [entriesTimeFilter, setEntriesTimeFilter] = useState('all');
  
  // Modal States
  const [viewingEntry, setViewingEntry] = useState(null);
  
  // Form State
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [customTask, setCustomTask] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hoursWorked, setHoursWorked] = useState('');
  const [existingEntryId, setExistingEntryId] = useState(null);
  
  // KOMPETENZEN: Einfaches Array von Strings wie ["Teamfähigkeit [verbessert]: Beispiel..."]
  const [selectedCompetencies, setSelectedCompetencies] = useState([]);
  const [competencyInputs, setCompetencyInputs] = useState({}); // {compId: {status: "geübt"|"verbessert", note: "..."}}
  const [expandedCompetency, setExpandedCompetency] = useState(null);

  // Kompetenz hinzufügen
  const addCompetency = (compId, compName) => {
    const input = competencyInputs[compId];
    const status = input?.status || 'geübt';
    const note = input?.note?.trim() || '';
    
    if (!note) {
      alert('Bitte gib ein Beispiel oder eine Notiz ein.');
      return;
    }
    
    // Als String speichern: "Kompetenzname [status]: Notiz"
    const entry = `${compName} [${status}]: ${note}`;
    
    // Prüfen ob diese Kompetenz schon existiert (ersetzen)
    const existing = selectedCompetencies.filter(c => !c.startsWith(compName + ' ['));
    setSelectedCompetencies([...existing, entry]);
    
    // Input leeren und schliessen
    setCompetencyInputs(prev => ({ ...prev, [compId]: { status: 'geübt', note: '' } }));
    setExpandedCompetency(null);
  };

  // Kompetenz entfernen
  const removeCompetency = (compName) => {
    setSelectedCompetencies(prev => prev.filter(c => !c.startsWith(compName + ' [')));
  };

  // Prüfen ob Kompetenz bereits hinzugefügt
  const isCompetencyAdded = (compName) => {
    return selectedCompetencies.some(c => c.startsWith(compName + ' ['));
  };

  // Status und Notiz einer hinzugefügten Kompetenz parsen
  const parseCompetencyString = (compString) => {
    // Format: "Kompetenzname [status]: Notiz"
    const match = compString.match(/^(.+?) \[(geübt|verbessert)\]: (.+)$/);
    if (match) {
      return { name: match[1], status: match[2], note: match[3] };
    }
    // Fallback für altes Format
    const colonIndex = compString.indexOf(':');
    if (colonIndex > -1) {
      return { name: compString.substring(0, colonIndex), status: 'geübt', note: compString.substring(colonIndex + 2) };
    }
    return { name: compString, status: 'geübt', note: '' };
  };

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

  // Einträge vom gewählten Datum und Kategorie laden
  useEffect(() => {
    const loadEntryForDateAndCategory = () => {
      if (!date || !selectedCategory) {
        if (!selectedCategory) {
          setSelectedTasks([]);
          setCustomTask('');
          setDescription('');
          setHoursWorked('');
          setSelectedCompetencies([]);
          setExistingEntryId(null);
        }
        return;
      }
      
      const selectedDateStr = date;
      let foundEntry = null;
      
      entries.forEach(entry => {
        if (entry.date && entry.category === selectedCategory) {
          const entryDateStr = entry.date.toISOString().split('T')[0];
          if (entryDateStr === selectedDateStr) {
            foundEntry = entry;
          }
        }
      });
      
      if (foundEntry) {
        setSelectedTasks(foundEntry.tasks || []);
        setDescription(foundEntry.description || '');
        setHoursWorked(foundEntry.hoursWorked?.toString() || '');
        setSelectedCompetencies(foundEntry.competencies || []);
        setExistingEntryId(foundEntry.id);
      } else {
        setSelectedTasks([]);
        setCustomTask('');
        setDescription('');
        setHoursWorked('');
        setSelectedCompetencies([]);
        setExistingEntryId(null);
      }
    };
    
    loadEntryForDateAndCategory();
  }, [date, selectedCategory, entries]);

  // Einträge laden
  useEffect(() => {
    const loadEntries = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      try {
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
      } catch (error) {
        console.error('Error loading entries:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEntries();
  }, [currentUser]);

  // Eintrag speichern
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const hasTaskEntry = selectedCategory && (selectedTasks.length > 0 || customTask.trim());
    const hasCompetencyEntry = selectedCompetencies.length > 0;
    
    if (!hasTaskEntry && !hasCompetencyEntry) {
      alert('Bitte wähle entweder eine Arbeitskategorie mit Aufgaben ODER mindestens eine Kompetenz aus.');
      return;
    }

    setLoading(true);
    try {
      const allTasks = [...selectedTasks];
      if (customTask.trim()) {
        allTasks.push(customTask.trim());
      }

      console.log('🎯 Speichere Kompetenzen:', selectedCompetencies);

      const entryData = {
        category: selectedCategory || 'kompetenz-only',
        categoryName: selectedCategory ? (workCategories.find(c => c.id === selectedCategory)?.name || '') : 'Nur Kompetenz-Eintrag',
        tasks: allTasks,
        description: description.trim(),
        date: Timestamp.fromDate(new Date(date)),
        hoursWorked: parseFloat(hoursWorked) || 0,
        competencies: selectedCompetencies, // Einfaches String-Array!
      };

      if (existingEntryId) {
        await updateDoc(doc(db, 'entries', existingEntryId), {
          ...entryData,
          updatedAt: Timestamp.now()
        });
        alert('✅ Eintrag aktualisiert!');
      } else {
        const newEntry = {
          apprenticeId: currentUser.uid,
          apprenticeName: userData?.name || '',
          companyId: userData?.companyId || '',
          trainerId: userData?.trainerId || '',
          ...entryData,
          status: 'pending',
          createdAt: Timestamp.now(),
          feedback: null
        };

        console.log('📝 Speichere:', newEntry);
        await addDoc(collection(db, 'entries'), newEntry);
        alert('✅ Gespeichert!');
      }
      
      // Entries neu laden
      const q = query(
        collection(db, 'entries'),
        where('apprenticeId', '==', currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const entriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      entriesData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setEntries(entriesData);
      
      // Form teilweise zurücksetzen
      setCustomTask('');
      setDescription('');
      setHoursWorked('');
      setExistingEntryId(null);
      
      setLoading(false);
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('❌ Fehler: ' + error.message);
      setLoading(false);
    }
  };

  // Eintrag löschen
  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm('Möchtest du diesen Eintrag wirklich löschen?')) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'entries', entryId));
      setEntries(prev => prev.filter(e => e.id !== entryId));
      alert('✅ Eintrag gelöscht');
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('❌ Fehler beim Löschen');
    }
  };

  // Zeitfilter anwenden
  const getFilteredEntries = () => {
    const now = new Date();
    let filtered = [...entries];
    
    switch (timeFilter) {
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(e => e.date && e.date >= weekAgo);
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(e => e.date && e.date >= monthAgo);
        break;
      case 'year':
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(e => e.date && e.date >= yearAgo);
        break;
      case 'custom':
        if (customStartDate) {
          const start = new Date(customStartDate);
          filtered = filtered.filter(e => e.date && e.date >= start);
        }
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59);
          filtered = filtered.filter(e => e.date && e.date <= end);
        }
        break;
      default:
        break;
    }
    
    return filtered;
  };

  // Einträge-Liste filtern
  const getFilteredEntriesList = () => {
    const now = new Date();
    let filtered = [...entries];
    
    switch (entriesTimeFilter) {
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(e => e.date && e.date >= weekAgo);
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(e => e.date && e.date >= monthAgo);
        break;
      case 'year':
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(e => e.date && e.date >= yearAgo);
        break;
      default:
        break;
    }
    
    return filtered;
  };

  // Ungelesene Notizen zählen
  const getUnreadNotesCount = () => {
    return entries.filter(e => e.feedback && e.status === 'reviewed').length;
  };

  // Heute schon Eintrag vorhanden?
  const hasEntryForCategory = (categoryId) => {
    const today = new Date().toISOString().split('T')[0];
    return entries.some(e => {
      if (!e.date || e.category !== categoryId) return false;
      const entryDate = e.date.toISOString().split('T')[0];
      return entryDate === today;
    });
  };

  // Aufgaben für Kategorie zählen
  const getTaskCountForCategory = (categoryId) => {
    const today = new Date().toISOString().split('T')[0];
    const entry = entries.find(e => {
      if (!e.date || e.category !== categoryId) return false;
      return e.date.toISOString().split('T')[0] === today;
    });
    return entry?.tasks?.length || 0;
  };

  // Kompetenz-Statistik berechnen
  const getCompetencyStats = () => {
    const stats = {};
    competencies.forEach(comp => {
      stats[comp.name] = { count: 0, entries: [] };
    });
    
    getFilteredEntries().forEach(entry => {
      if (entry.competencies && Array.isArray(entry.competencies)) {
        entry.competencies.forEach(compString => {
          const parsed = parseCompetencyString(compString);
          if (stats[parsed.name]) {
            stats[parsed.name].count++;
            stats[parsed.name].entries.push({
              date: entry.date,
              status: parsed.status,
              note: parsed.note
            });
          }
        });
      }
    });
    
    return stats;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <img src="/logo.png" alt="Carli-Check" className="h-12 w-12 object-contain" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Carli-Check</h1>
                <p className="text-sm text-gray-600">Willkommen, {userData?.name || 'Lernender'}</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
              <span>Abmelden</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'new-entry', label: 'Neuer Eintrag', icon: Plus },
              { id: 'my-entries', label: 'Meine Einträge', icon: Calendar },
              { id: 'statistics', label: 'Statistik', icon: TrendingUp },
              { id: 'trainer-notes', label: 'Notizen', icon: MessageCircle, badge: getUnreadNotesCount() }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition relative ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5 animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Tab: Neuer Eintrag */}
        {activeTab === 'new-entry' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Plus className="w-5 h-5 mr-2 text-orange-500" />
              Tageseintrag erfassen
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Datum */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Datum
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* Arbeitskategorie */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Arbeitskategorie (optional)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {workCategories.map((category) => {
                    const hasEntry = hasEntryForCategory(category.id);
                    const taskCount = getTaskCountForCategory(category.id);
                    
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setSelectedCategory(
                          selectedCategory === category.id ? '' : category.id
                        )}
                        className={`p-4 rounded-lg border-2 text-left transition relative ${
                          selectedCategory === category.id
                            ? 'border-orange-500 bg-orange-50'
                            : hasEntry
                            ? 'border-green-300 bg-green-50 hover:border-green-400'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-2xl mb-2 block">{category.icon}</span>
                        <span className="font-medium text-gray-900">{category.name}</span>
                        {hasEntry && (
                          <span className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                            {taskCount} ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Aufgaben - nur wenn Kategorie gewählt */}
              {selectedCategory && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Durchgeführte Arbeiten
                  </label>
                  <div className="space-y-2">
                    {workCategories.find(c => c.id === selectedCategory)?.tasks.map((task) => (
                      <label key={task} className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTasks.includes(task)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTasks([...selectedTasks, task]);
                            } else {
                              setSelectedTasks(selectedTasks.filter(t => t !== task));
                            }
                          }}
                          className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <span className="ml-3 text-gray-700">{task}</span>
                      </label>
                    ))}
                  </div>
                  
                  {/* Eigene Aufgabe */}
                  <div className="mt-4">
                    <input
                      type="text"
                      placeholder="Eigene Aufgabe hinzufügen..."
                      value={customTask}
                      onChange={(e) => setCustomTask(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>
              )}

              {/* Stunden */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Arbeitsstunden (optional)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={hoursWorked}
                  onChange={(e) => setHoursWorked(e.target.value)}
                  placeholder="z.B. 8"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* Beschreibung */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notizen / Beschreibung (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Was hast du heute gelernt? Gab es Herausforderungen?"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* KOMPETENZEN - Neues System */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center">
                  <Award className="w-5 h-5 mr-2 text-orange-500" />
                  Kompetenzen & Lernfortschritt
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Wähle Kompetenzen aus, bei denen du dich heute verbessert hast, und beschreibe kurz was du gelernt hast.
                </p>

                {/* Bereits hinzugefügte Kompetenzen */}
                {selectedCompetencies.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <p className="text-sm font-medium text-green-700">✓ Hinzugefügte Kompetenzen:</p>
                    {selectedCompetencies.map((compString, idx) => {
                      const parsed = parseCompetencyString(compString);
                      return (
                        <div key={idx} className="flex items-start justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-green-800">{parsed.name}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                parsed.status === 'verbessert' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {parsed.status === 'verbessert' ? '📈 verbessert' : '🔄 geübt'}
                              </span>
                            </div>
                            <p className="text-sm text-green-700 mt-1">{parsed.note}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCompetency(parsed.name)}
                            className="text-red-500 hover:text-red-700 p-1 ml-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Kompetenz-Auswahl */}
                <div className="space-y-2">
                  {competencies.map((comp) => {
                    const isAdded = isCompetencyAdded(comp.name);
                    const isExpanded = expandedCompetency === comp.id;
                    
                    if (isAdded) return null; // Bereits hinzugefügte nicht mehr anzeigen
                    
                    return (
                      <div key={comp.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedCompetency(isExpanded ? null : comp.id)}
                          className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition"
                        >
                          <div className="text-left">
                            <span className="font-medium text-gray-900">{comp.name}</span>
                            <p className="text-xs text-gray-500">{comp.description}</p>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                        
                        {isExpanded && (
                          <div className="p-4 bg-white border-t space-y-4">
                            {/* Status-Auswahl: geübt oder verbessert */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Status
                              </label>
                              <div className="flex space-x-3">
                                <button
                                  type="button"
                                  onClick={() => setCompetencyInputs(prev => ({
                                    ...prev,
                                    [comp.id]: { ...prev[comp.id], status: 'geübt' }
                                  }))}
                                  className={`flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition ${
                                    (competencyInputs[comp.id]?.status || 'geübt') === 'geübt'
                                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                  }`}
                                >
                                  🔄 Geübt
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCompetencyInputs(prev => ({
                                    ...prev,
                                    [comp.id]: { ...prev[comp.id], status: 'verbessert' }
                                  }))}
                                  className={`flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition ${
                                    competencyInputs[comp.id]?.status === 'verbessert'
                                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                  }`}
                                >
                                  📈 Verbessert
                                </button>
                              </div>
                            </div>
                            
                            {/* Beispiel / Notiz */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Beispiel / Notiz
                              </label>
                              <textarea
                                value={competencyInputs[comp.id]?.note || ''}
                                onChange={(e) => setCompetencyInputs(prev => ({
                                  ...prev,
                                  [comp.id]: { ...prev[comp.id], note: e.target.value }
                                }))}
                                rows={2}
                                placeholder="z.B. Habe heute selbstständig eine Diagnose durchgeführt..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                              />
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => addCompetency(comp.id, comp.name)}
                              className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                            >
                              + Hinzufügen
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('');
                    setSelectedTasks([]);
                    setCustomTask('');
                    setDescription('');
                    setHoursWorked('');
                    setSelectedCompetencies([]);
                    setCompetencyInputs({});
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Zurücksetzen
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition disabled:opacity-50"
                >
                  {loading ? 'Speichern...' : existingEntryId ? 'Aktualisieren' : 'Speichern'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab: Meine Einträge */}
        {activeTab === 'my-entries' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-orange-500" />
                Meine Einträge
              </h2>
              
              <select
                value={entriesTimeFilter}
                onChange={(e) => setEntriesTimeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">Alle</option>
                <option value="week">Letzte 7 Tage</option>
                <option value="month">Letzter Monat</option>
                <option value="year">Letztes Jahr</option>
              </select>
            </div>

            {getFilteredEntriesList().length === 0 ? (
              <p className="text-gray-500 text-center py-8">Noch keine Einträge vorhanden.</p>
            ) : (
              <div className="space-y-4">
                {getFilteredEntriesList().map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-lg">{workCategories.find(c => c.id === entry.category)?.icon || '📝'}</span>
                          <span className="font-medium text-gray-900">
                            {entry.categoryName || 'Kompetenz-Eintrag'}
                          </span>
                          <span className="text-sm text-gray-500">
                            {entry.date?.toLocaleDateString('de-CH')}
                          </span>
                        </div>
                        
                        {entry.tasks?.length > 0 && (
                          <p className="text-sm text-gray-600 mb-2">
                            Aufgaben: {entry.tasks.join(', ')}
                          </p>
                        )}
                        
                        {/* Kompetenz-Anzeige */}
                        {entry.competencies?.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-1">Kompetenzen:</p>
                            <div className="space-y-1">
                              {entry.competencies.map((compString, idx) => {
                                const parsed = parseCompetencyString(compString);
                                return (
                                  <div key={idx} className="text-sm bg-orange-50 text-orange-800 px-2 py-1 rounded flex items-start justify-between">
                                    <div>
                                      <strong>{parsed.name}</strong>
                                      <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                                        parsed.status === 'verbessert' 
                                          ? 'bg-blue-100 text-blue-700' 
                                          : 'bg-gray-100 text-gray-600'
                                      }`}>
                                        {parsed.status === 'verbessert' ? '📈' : '🔄'} {parsed.status}
                                      </span>
                                      <p className="text-orange-700 mt-0.5">{parsed.note}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {entry.feedback && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                            <strong>Trainer-Feedback:</strong> {entry.feedback}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => setViewingEntry(entry)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Anzeigen"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Löschen"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Statistik */}
        {activeTab === 'statistics' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-orange-500" />
                Meine Statistik
              </h2>
              
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">Gesamte Zeit</option>
                <option value="week">Letzte 7 Tage</option>
                <option value="month">Letzter Monat</option>
                <option value="year">Letztes Jahr</option>
                <option value="custom">Benutzerdefiniert</option>
              </select>
            </div>

            {timeFilter === 'custom' && (
              <div className="flex space-x-4 mb-6">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Von</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Bis</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Übersicht */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-orange-50 rounded-lg p-4">
                <p className="text-sm text-orange-600 font-medium">Einträge</p>
                <p className="text-2xl font-bold text-orange-900">{getFilteredEntries().length}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-600 font-medium">Kompetenz-Einträge</p>
                <p className="text-2xl font-bold text-green-900">
                  {getFilteredEntries().filter(e => e.competencies?.length > 0).length}
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-600 font-medium">Arbeitsstunden</p>
                <p className="text-2xl font-bold text-blue-900">
                  {getFilteredEntries().reduce((sum, e) => sum + (e.hoursWorked || 0), 0).toFixed(1)}h
                </p>
              </div>
            </div>

            {/* Kompetenz-Statistik */}
            <h3 className="text-lg font-medium text-gray-900 mb-4">Kompetenz-Entwicklung</h3>
            <div className="space-y-4">
              {(() => {
                const stats = getCompetencyStats();
                return competencies.map((comp) => {
                  const stat = stats[comp.name];
                  
                  if (stat.count === 0) {
                    return (
                      <div key={comp.id} className="p-4 border-2 border-dashed border-orange-300 rounded-lg bg-orange-50">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">{comp.name}</span>
                          <span className="text-sm text-orange-600">⚠️ Noch keine Einträge</span>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={comp.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-900">{comp.name}</span>
                        <div className="flex items-center space-x-2">
                          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                            {stat.count}× dokumentiert
                          </span>
                          <span className="text-xs text-blue-600">
                            ({stat.entries.filter(e => e.status === 'verbessert').length}× verbessert)
                          </span>
                        </div>
                      </div>
                      
                      {/* Letzte Einträge */}
                      <div className="mt-2 space-y-1">
                        {stat.entries.slice(-3).map((entry, idx) => (
                          <div key={idx} className="text-sm text-gray-600 bg-white p-2 rounded border">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-400">
                                {entry.date?.toLocaleDateString('de-CH')}
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                entry.status === 'verbessert' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {entry.status === 'verbessert' ? '📈' : '🔄'}
                              </span>
                            </div>
                            <p className="mt-1">{entry.note}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Noch nicht dokumentierte Kompetenzen */}
            {(() => {
              const stats = getCompetencyStats();
              const undocumented = competencies.filter(comp => stats[comp.name].count === 0);
              
              if (undocumented.length > 0) {
                return (
                  <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800">
                      📋 <strong>{undocumented.length} von {competencies.length}</strong> Kompetenzen noch nicht dokumentiert:
                      <br />
                      <span className="text-orange-600">{undocumented.map(c => c.name).join(', ')}</span>
                    </p>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        )}

        {/* Tab: Trainer-Notizen */}
        {activeTab === 'trainer-notes' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <MessageCircle className="w-5 h-5 mr-2 text-orange-500" />
              Notizen vom Berufsbildner
            </h2>

            {entries.filter(e => e.feedback).length === 0 ? (
              <p className="text-gray-500 text-center py-8">Noch keine Notizen vorhanden.</p>
            ) : (
              <div className="space-y-4">
                {entries.filter(e => e.feedback).map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-4 bg-yellow-50">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-gray-900">
                        {entry.categoryName || 'Eintrag'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {entry.date?.toLocaleDateString('de-CH')}
                      </span>
                    </div>
                    <p className="text-gray-700">{entry.feedback}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* View Modal */}
      {viewingEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Eintrag Details</h3>
              <button
                onClick={() => setViewingEntry(null)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-sm text-gray-500">Datum</span>
                <p className="font-medium">{viewingEntry.date?.toLocaleDateString('de-CH')}</p>
              </div>
              
              <div>
                <span className="text-sm text-gray-500">Kategorie</span>
                <p className="font-medium">{viewingEntry.categoryName || 'Kompetenz-Eintrag'}</p>
              </div>
              
              {viewingEntry.tasks?.length > 0 && (
                <div>
                  <span className="text-sm text-gray-500">Aufgaben</span>
                  <ul className="list-disc list-inside">
                    {viewingEntry.tasks.map((task, i) => (
                      <li key={i}>{task}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {viewingEntry.description && (
                <div>
                  <span className="text-sm text-gray-500">Beschreibung</span>
                  <p>{viewingEntry.description}</p>
                </div>
              )}
              
              {viewingEntry.hoursWorked > 0 && (
                <div>
                  <span className="text-sm text-gray-500">Arbeitsstunden</span>
                  <p className="font-medium">{viewingEntry.hoursWorked}h</p>
                </div>
              )}

              {/* Kompetenz-Einträge */}
              {viewingEntry.competencies?.length > 0 && (
                <div>
                  <span className="text-sm text-gray-500">Kompetenzen & Lernfortschritt</span>
                  <div className="mt-2 space-y-2">
                    {viewingEntry.competencies.map((compString, idx) => {
                      const parsed = parseCompetencyString(compString);
                      return (
                        <div key={idx} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-orange-800">{parsed.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              parsed.status === 'verbessert' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {parsed.status === 'verbessert' ? '📈 verbessert' : '🔄 geübt'}
                            </span>
                          </div>
                          <p className="text-sm text-orange-700 mt-1">{parsed.note}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {viewingEntry.feedback && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <span className="text-sm text-yellow-800 font-medium">Trainer-Feedback</span>
                  <p className="text-yellow-900 mt-1">{viewingEntry.feedback}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewingEntry(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Schliessen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprenticeDashboard;
