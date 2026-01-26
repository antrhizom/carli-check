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
import { workCategories, competencies, ratingScale } from '../../data/curriculum';
import { Car, Plus, Calendar, BookOpen, LogOut, Award, TrendingUp, FileDown, Trash2, Edit, MessageCircle, Eye } from 'lucide-react';

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
  
  // KOMPETENZEN: Separate States für jede Kompetenz (korrekten IDs aus curriculum.js!)
  const [compTechnical, setCompTechnical] = useState(0);
  const [compSafety, setCompSafety] = useState(0);
  const [compQuality, setCompQuality] = useState(0);
  const [compCustomer, setCompCustomer] = useState(0);
  const [compTeamwork, setCompTeamwork] = useState(0);
  const [compIndependence, setCompIndependence] = useState(0);
  const [compProblemSolving, setCompProblemSolving] = useState(0);
  const [compEnvironment, setCompEnvironment] = useState(0);
  const [compEfficiency, setCompEfficiency] = useState(0);
  const [compCommunication, setCompCommunication] = useState(0);

  // Kompetenz-Mapping für einfacheren Zugriff (IDs müssen mit curriculum.js übereinstimmen!)
  const competencyStates = {
    'technical': { value: compTechnical, setter: setCompTechnical },
    'safety': { value: compSafety, setter: setCompSafety },
    'quality': { value: compQuality, setter: setCompQuality },
    'customer': { value: compCustomer, setter: setCompCustomer },
    'teamwork': { value: compTeamwork, setter: setCompTeamwork },
    'independence': { value: compIndependence, setter: setCompIndependence },
    'problem-solving': { value: compProblemSolving, setter: setCompProblemSolving },
    'environment': { value: compEnvironment, setter: setCompEnvironment },
    'efficiency': { value: compEfficiency, setter: setCompEfficiency },
    'communication': { value: compCommunication, setter: setCompCommunication },
  };

  // Alle Kompetenzwerte zurücksetzen
  const resetCompetencies = () => {
    setCompTechnical(0);
    setCompSafety(0);
    setCompQuality(0);
    setCompCustomer(0);
    setCompTeamwork(0);
    setCompIndependence(0);
    setCompProblemSolving(0);
    setCompEnvironment(0);
    setCompEfficiency(0);
    setCompCommunication(0);
  };

  // Kompetenzwerte aus Entry laden
  const loadCompetenciesFromEntry = (entry) => {
    setCompTechnical(entry.comp_technical || 0);
    setCompSafety(entry.comp_safety || 0);
    setCompQuality(entry.comp_quality || 0);
    setCompCustomer(entry.comp_customer || 0);
    setCompTeamwork(entry.comp_teamwork || 0);
    setCompIndependence(entry.comp_independence || 0);
    setCompProblemSolving(entry.comp_problem_solving || 0);
    setCompEnvironment(entry.comp_environment || 0);
    setCompEfficiency(entry.comp_efficiency || 0);
    setCompCommunication(entry.comp_communication || 0);
  };

  // Kompetenzwerte für Speicherung sammeln
  const getCompetencyData = () => {
    return {
      comp_technical: compTechnical,
      comp_safety: compSafety,
      comp_quality: compQuality,
      comp_customer: compCustomer,
      comp_teamwork: compTeamwork,
      comp_independence: compIndependence,
      comp_problem_solving: compProblemSolving,
      comp_environment: compEnvironment,
      comp_efficiency: compEfficiency,
      comp_communication: compCommunication,
    };
  };

  // Prüfen ob mindestens eine Kompetenz bewertet wurde
  const hasAnyCompetency = () => {
    return compTechnical > 0 || compSafety > 0 || compQuality > 0 || 
           compCustomer > 0 || compTeamwork > 0 || compIndependence > 0 ||
           compProblemSolving > 0 || compEnvironment > 0 || compEfficiency > 0 ||
           compCommunication > 0;
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
          resetCompetencies();
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
        loadCompetenciesFromEntry(foundEntry);
        setExistingEntryId(foundEntry.id);
      } else {
        setSelectedTasks([]);
        setCustomTask('');
        setDescription('');
        setHoursWorked('');
        resetCompetencies();
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
    const hasCompetencyEntry = hasAnyCompetency();
    
    if (!hasTaskEntry && !hasCompetencyEntry) {
      alert('Bitte wähle entweder eine Arbeitskategorie mit Aufgaben ODER mindestens eine Kompetenz-Bewertung aus.');
      return;
    }

    setLoading(true);
    try {
      const allTasks = [...selectedTasks];
      if (customTask.trim()) {
        allTasks.push(customTask.trim());
      }

      // Kompetenz-Daten sammeln (separate Felder!)
      const competencyData = getCompetencyData();
      console.log('🎯 Kompetenz-Daten:', competencyData);

      const entryData = {
        category: selectedCategory || 'kompetenz-only',
        categoryName: selectedCategory ? (workCategories.find(c => c.id === selectedCategory)?.name || '') : 'Nur Kompetenz-Bewertung',
        tasks: allTasks,
        description: description.trim(),
        date: Timestamp.fromDate(new Date(date)),
        hoursWorked: parseFloat(hoursWorked) || 0,
        // Separate Kompetenz-Felder (keine verschachtelten Objekte!)
        ...competencyData,
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

  // Kompetenz-Wert aus Entry holen
  const getEntryCompetency = (entry, compId) => {
    // Bindestriche in Unterstriche umwandeln für Feldnamen
    const fieldName = `comp_${compId.replace(/-/g, '_')}`;
    return entry[fieldName] || 0;
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
                  Arbeitskategorie
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

              {/* KOMPETENZEN - Komplett neu */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center">
                  <Award className="w-5 h-5 mr-2 text-orange-500" />
                  Selbsteinschätzung Kompetenzen
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Bewerte dich selbst (1 = Ungenügend, 6 = Sehr gut)
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-800">
                    💡 Du kannst auch nur Kompetenzen bewerten, ohne eine Arbeitskategorie auszuwählen.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {competencies.map((comp) => {
                    const state = competencyStates[comp.id];
                    const currentValue = state?.value || 0;
                    
                    return (
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
                              onClick={() => state?.setter(rating.value)}
                              className={`flex-1 py-2 px-1 rounded text-sm font-medium transition ${
                                currentValue === rating.value
                                  ? 'ring-2 ring-offset-2'
                                  : 'hover:bg-gray-200'
                              }`}
                              style={{
                                backgroundColor: currentValue === rating.value 
                                  ? rating.color 
                                  : '#e5e7eb',
                                color: currentValue === rating.value 
                                  ? '#ffffff' 
                                  : '#374151',
                              }}
                            >
                              {rating.value}
                            </button>
                          ))}
                        </div>
                        {currentValue > 0 && (
                          <p className="text-xs text-gray-600 mt-2 text-center">
                            {ratingScale.find(r => r.value === currentValue)?.label}
                          </p>
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
                    resetCompetencies();
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
              
              {/* Filter */}
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
                            {entry.categoryName || 'Nur Kompetenz-Bewertung'}
                          </span>
                          <span className="text-sm text-gray-500">
                            {entry.date?.toLocaleDateString('de-CH')}
                          </span>
                        </div>
                        
                        {entry.tasks?.length > 0 && (
                          <p className="text-sm text-gray-600 mb-2">
                            {entry.tasks.join(', ')}
                          </p>
                        )}
                        
                        {/* Kompetenz-Anzeige */}
                        {(entry.comp_technical > 0 || entry.comp_safety > 0 || 
                          entry.comp_quality > 0 || entry.comp_customer > 0 ||
                          entry.comp_teamwork > 0 || entry.comp_independence > 0 ||
                          entry.comp_problem_solving > 0 || entry.comp_environment > 0 ||
                          entry.comp_efficiency > 0 || entry.comp_communication > 0) && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {competencies.map(comp => {
                              const value = getEntryCompetency(entry, comp.id);
                              if (value === 0) return null;
                              const ratingInfo = ratingScale.find(r => r.value === value);
                              return (
                                <span
                                  key={comp.id}
                                  className="px-2 py-1 rounded text-xs text-white"
                                  style={{ backgroundColor: ratingInfo?.color || '#6b7280' }}
                                >
                                  {comp.name}: {value}
                                </span>
                              );
                            })}
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
              
              {/* Zeit-Filter */}
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
                <p className="text-sm text-green-600 font-medium">Kategorien bearbeitet</p>
                <p className="text-2xl font-bold text-green-900">
                  {new Set(getFilteredEntries().map(e => e.category)).size}
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
              {competencies.map((comp) => {
                const filtered = getFilteredEntries();
                const entriesWithRating = filtered.filter(e => getEntryCompetency(e, comp.id) > 0);
                const ratings = entriesWithRating.map(e => getEntryCompetency(e, comp.id));
                
                if (ratings.length === 0) {
                  return (
                    <div key={comp.id} className="p-4 border-2 border-dashed border-orange-300 rounded-lg bg-orange-50">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900">{comp.name}</span>
                        <span className="text-sm text-orange-600">⚠️ Noch nicht bewertet</span>
                      </div>
                    </div>
                  );
                }
                
                const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
                const ratingInfo = ratingScale.find(r => r.value === Math.round(avg));
                
                return (
                  <div key={comp.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-900">{comp.name}</span>
                      <div className="flex items-center space-x-2">
                        <span
                          className="px-3 py-1 rounded-full text-sm font-medium text-white"
                          style={{ backgroundColor: ratingInfo?.color || '#6b7280' }}
                        >
                          Ø {avg.toFixed(1)}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({ratings.length}× bewertet)
                        </span>
                      </div>
                    </div>
                    
                    {/* Mini-Chart */}
                    <div className="flex items-end space-x-1 h-8 mt-2">
                      {ratings.slice(-10).map((r, i) => {
                        const rInfo = ratingScale.find(rs => rs.value === r);
                        return (
                          <div
                            key={i}
                            className="flex-1 rounded-t"
                            style={{
                              height: `${(r / 6) * 100}%`,
                              backgroundColor: rInfo?.color || '#6b7280',
                              minHeight: '4px'
                            }}
                            title={`Bewertung: ${r}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Nicht bewertete Kompetenzen */}
            {(() => {
              const filtered = getFilteredEntries();
              const unrated = competencies.filter(comp => {
                return !filtered.some(e => getEntryCompetency(e, comp.id) > 0);
              });
              
              if (unrated.length > 0) {
                return (
                  <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800">
                      📋 <strong>{unrated.length} von {competencies.length}</strong> Kompetenzen noch nicht bewertet:
                      <br />
                      <span className="text-orange-600">{unrated.map(c => c.name).join(', ')}</span>
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
                className="text-gray-400 hover:text-gray-600"
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
                <p className="font-medium">{viewingEntry.categoryName || 'Nur Kompetenz-Bewertung'}</p>
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

              {/* Kompetenz-Bewertungen */}
              <div>
                <span className="text-sm text-gray-500">Kompetenz-Bewertungen</span>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {competencies.map(comp => {
                    const value = getEntryCompetency(viewingEntry, comp.id);
                    if (value === 0) return null;
                    const ratingInfo = ratingScale.find(r => r.value === value);
                    return (
                      <div key={comp.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm">{comp.name}</span>
                        <span
                          className="px-2 py-1 rounded text-xs text-white font-medium"
                          style={{ backgroundColor: ratingInfo?.color || '#6b7280' }}
                        >
                          {value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

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
