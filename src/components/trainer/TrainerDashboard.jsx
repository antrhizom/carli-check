import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  doc,
  updateDoc,
  Timestamp 
} from 'firebase/firestore';
import { workCategories, competencies } from '../../data/curriculum';
import { LogOut, Users, Award, Calendar, MessageSquare, CheckCircle, AlertCircle, TrendingUp, FileDown } from 'lucide-react';
import ApprenticeCodeGenerator from './ApprenticeCodeGenerator';

const TrainerDashboard = () => {
  const { signOut, userData, currentUser } = useAuth();
  const [apprentices, setApprentices] = useState([]);
  const [entries, setEntries] = useState([]);
  const [selectedApprentice, setSelectedApprentice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'notes', 'statistics'
  
  // Für Notizen
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [trainerNote, setTrainerNote] = useState('');

  // Lernende laden
  useEffect(() => {
    const loadApprentices = async () => {
      if (!currentUser) return;
      
      try {
        const q = query(
          collection(db, 'users'),
          where('trainerId', '==', currentUser.uid),
          where('role', '==', 'apprentice')
        );
        
        const snapshot = await getDocs(q);
        const apprenticesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setApprentices(apprenticesData);
        
        if (apprenticesData.length > 0 && !selectedApprentice) {
          setSelectedApprentice(apprenticesData[0].id);
        }
      } catch (error) {
        console.error('Error loading apprentices:', error);
      }
    };

    loadApprentices();
  }, [currentUser]);

  // Einträge des ausgewählten Lernenden laden
  useEffect(() => {
    const loadEntries = async () => {
      if (!selectedApprentice) return;
      
      setLoading(true);
      try {
        const q = query(
          collection(db, 'entries'),
          where('apprenticeId', '==', selectedApprentice),
          orderBy('date', 'desc')
        );
        
        const snapshot = await getDocs(q);
        const entriesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate(),
          createdAt: doc.data().createdAt?.toDate()
        }));
        
        setEntries(entriesData);
      } catch (error) {
        console.error('Error loading entries:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEntries();
  }, [selectedApprentice]);

  // Notiz speichern
  const handleSaveNote = async () => {
    if (!selectedEntry) return;
    
    setLoading(true);
    try {
      await updateDoc(doc(db, 'entries', selectedEntry.id), {
        trainerNote: trainerNote.trim() || null,
        trainerNoteDate: trainerNote.trim() ? Timestamp.now() : null
      });
      
      setEntries(prev => prev.map(e => 
        e.id === selectedEntry.id 
          ? { ...e, trainerNote: trainerNote.trim() || null }
          : e
      ));
      
      setSelectedEntry(null);
      setTrainerNote('');
      alert('✅ Notiz gespeichert!');
    } catch (error) {
      alert('Fehler: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Statistiken berechnen
  const getStats = () => {
    const yearEntries = getEntriesInAusbildungsjahr();
    const totalEntries = yearEntries.length;
    const entriesWithComps = yearEntries.filter(e => (e.comps?.length > 0) || (e.competencies?.length > 0)).length;
    const totalHoursCategory = yearEntries.reduce((sum, e) => sum + (e.hoursCategory || e.hoursWorked || 0), 0);
    const totalHoursComps = yearEntries.reduce((sum, e) => sum + (e.hoursComps || 0), 0);
    const notesCount = entries.filter(e => e.trainerNote).length;
    
    return { totalEntries, entriesWithComps, totalHoursCategory, totalHoursComps, notesCount };
  };

  // Ausbildungsjahr berechnen (August bis Juli)
  const getAusbildungsjahr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    if (month < 7) { // Januar-Juli
      return {
        start: new Date(year - 1, 7, 1),
        end: new Date(year, 6, 31, 23, 59, 59),
        label: `${year - 1}/${year}`
      };
    } else { // August-Dezember
      return {
        start: new Date(year, 7, 1),
        end: new Date(year + 1, 6, 31, 23, 59, 59),
        label: `${year}/${year + 1}`
      };
    }
  };

  // Einträge nach Ausbildungsjahr filtern
  const getEntriesInAusbildungsjahr = () => {
    const { start, end } = getAusbildungsjahr();
    return entries.filter(e => e.date && e.date >= start && e.date <= end);
  };

  // Aufgaben-Statistik pro Kategorie
  const getCategoryStats = (categoryId) => {
    const category = workCategories.find(c => c.id === categoryId);
    if (!category) return null;
    
    const yearEntries = getEntriesInAusbildungsjahr();
    const catEntries = yearEntries.filter(e => e.category === categoryId);
    const allTasks = category.tasks;
    
    // Zähle wie oft jede Aufgabe gemacht wurde
    const taskCounts = {};
    allTasks.forEach(task => taskCounts[task] = 0);
    
    catEntries.forEach(entry => {
      entry.tasks?.forEach(task => {
        if (taskCounts[task] !== undefined) {
          taskCounts[task]++;
        }
      });
    });
    
    // ≥2× = erledigt, 1× = noch 1× nötig, 0× = noch nicht gemacht
    const completedTasks = Object.entries(taskCounts).filter(([_, count]) => count >= 2);
    const inProgressTasks = Object.entries(taskCounts).filter(([_, count]) => count === 1);
    const pendingTasks = Object.entries(taskCounts).filter(([_, count]) => count === 0);
    const totalHours = catEntries.reduce((sum, e) => sum + (e.hoursCategory || e.hoursWorked || 0), 0);
    
    // Teilfortschritt: 1× = 0.5, ≥2× = 1.0
    const progressPoints = completedTasks.length + (inProgressTasks.length * 0.5);
    
    return {
      category,
      entryCount: catEntries.length,
      totalHours,
      completedTasks: completedTasks.sort((a, b) => b[1] - a[1]),
      inProgressTasks: inProgressTasks.sort((a, b) => b[1] - a[1]),
      pendingTasks,
      completion: allTasks.length > 0 ? (progressPoints / allTasks.length * 100) : 0
    };
  };

  // Kompetenz-Statistik
  const getCompetencyStats = () => {
    const yearEntries = getEntriesInAusbildungsjahr();
    
    return competencies.map(comp => {
      const compEntries = yearEntries.filter(e => {
        if (e.compDetails) return e.compDetails.some(c => c.name === comp.name);
        const allComps = e.comps || e.competencies || [];
        return allComps.some(c => c.startsWith(comp.name));
      });
      
      const count = compEntries.length;
      
      const improved = yearEntries.filter(e => {
        if (e.compDetails) return e.compDetails.some(c => c.name === comp.name && c.status === 'verbessert');
        const allComps = e.comps || e.competencies || [];
        return allComps.some(c => c.startsWith(comp.name) && c.includes('verbessert'));
      }).length;
      
      const totalHours = yearEntries.reduce((sum, e) => {
        if (e.compDetails) {
          const detail = e.compDetails.find(c => c.name === comp.name);
          return sum + (detail?.hours || 0);
        }
        return sum;
      }, 0);
      
      return { ...comp, count, improved, totalHours };
    });
  };
  
  // Kompetenz-Fortschritt berechnen
  const getCompetencyCompletion = () => {
    const stats = getCompetencyStats();
    let progressPoints = 0;
    stats.forEach(c => {
      if (c.count >= 3) progressPoints += 1;
      else if (c.count === 2) progressPoints += 0.66;
      else if (c.count === 1) progressPoints += 0.33;
    });
    return competencies.length > 0 ? (progressPoints / competencies.length * 100) : 0;
  };

  // Anzahl Notizen pro Lernenden berechnen
  const getNotesCountForApprentice = (apprenticeId) => {
    // Wir müssen alle Einträge des Lernenden prüfen
    // Da wir nur die Einträge des ausgewählten Lernenden haben, 
    // zeigen wir die Anzahl nur für den ausgewählten
    if (apprenticeId === selectedApprentice) {
      return entries.filter(e => e.trainerNote).length;
    }
    return null; // Wird separat geladen wenn nötig
  };

  const selectedApprenticeData = apprentices.find(a => a.id === selectedApprentice);
  const stats = getStats();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <img src="/logo.png" alt="Logo" className="h-12 w-12 object-contain" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Carli-Check</h1>
                <p className="text-sm text-gray-600">Berufsbildner: {userData?.name}</p>
              </div>
            </div>
            <button 
              onClick={signOut}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <LogOut className="w-5 h-5" />
              <span>Abmelden</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar - Lernende */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-orange-500" />
                  Lernende
                </h2>
                <ApprenticeCodeGenerator />
              </div>
              
              {apprentices.length === 0 ? (
                <p className="text-gray-500 text-sm">Keine Lernenden</p>
              ) : (
                <div className="space-y-2">
                  {apprentices.map(apprentice => {
                    const notesCount = apprentice.id === selectedApprentice ? stats.notesCount : null;
                    
                    return (
                      <button
                        key={apprentice.id}
                        onClick={() => setSelectedApprentice(apprentice.id)}
                        className={`w-full text-left p-3 rounded-lg transition ${
                          selectedApprentice === apprentice.id
                            ? 'bg-orange-100 border-2 border-orange-500'
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                        }`}
                      >
                        <div className="font-medium text-gray-900">{apprentice.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {notesCount !== null ? (
                            <span className="flex items-center">
                              <MessageSquare className="w-3 h-3 mr-1" />
                              {notesCount} Notizen
                            </span>
                          ) : (
                            <span>Auswählen für Details</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {!selectedApprentice ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Wähle einen Lernenden aus</p>
              </div>
            ) : loading ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-500 mt-4">Laden...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header mit Lernenden-Name */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedApprenticeData?.name}</h2>
                      <p className="text-gray-500">Fortschritts-Übersicht</p>
                    </div>
                  </div>
                  
                  {/* Ausbildungsjahr-Info */}
                  <div className="mt-4 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-sm text-orange-800">
                      📅 <strong>Ausbildungsjahr {getAusbildungsjahr().label}</strong> (August – Juli)
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      Jede Aufgabe muss mindestens 2× pro Jahr erledigt werden für 100%.
                    </p>
                  </div>
                  
                  {/* Übersichts-Karten */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-orange-50 rounded-lg p-4">
                      <p className="text-sm text-orange-600">Einträge (Jahr)</p>
                      <p className="text-2xl font-bold text-orange-900">{stats.totalEntries}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-600">Arbeitsstunden</p>
                      <p className="text-2xl font-bold text-blue-900">{stats.totalHoursCategory.toFixed(1)}h</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-sm text-purple-600">Kompetenz-Std.</p>
                      <p className="text-2xl font-bold text-purple-900">{stats.totalHoursComps.toFixed(1)}h</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-green-600">Meine Notizen</p>
                      <p className="text-2xl font-bold text-green-900">{stats.notesCount}</p>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-xl shadow-sm">
                  <div className="border-b">
                    <nav className="flex">
                      {[
                        { id: 'overview', label: '📁 Arbeitskategorien' },
                        { id: 'competencies', label: '🏆 Kompetenzen' },
                        { id: 'notes', label: '💬 Notizen hinzufügen' },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex-1 py-4 text-center font-medium text-sm border-b-2 ${
                            activeTab === tab.id
                              ? 'border-orange-500 text-orange-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </nav>
                  </div>

                  <div className="p-6">
                    {/* ARBEITSKATEGORIEN TAB */}
                    {activeTab === 'overview' && (
                      <div className="space-y-6">
                        {workCategories.map(cat => {
                          const catStats = getCategoryStats(cat.id);
                          if (!catStats) return null;
                          
                          return (
                            <div key={cat.id} className="border rounded-lg overflow-hidden">
                              {/* Kategorie Header */}
                              <div className="bg-gray-50 p-4 flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <span className="text-2xl">{cat.icon}</span>
                                  <div>
                                    <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                                    <p className="text-sm text-gray-500">
                                      {catStats.entryCount} Einträge · {catStats.totalHours.toFixed(1)}h
                                    </p>
                                  </div>
                                </div>
                                
                                {/* Fortschritts-Ring */}
                                <div className="relative w-16 h-16">
                                  <svg className="w-16 h-16 transform -rotate-90">
                                    <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                                    <circle 
                                      cx="32" cy="32" r="28" fill="none" 
                                      stroke={catStats.completion >= 80 ? '#22c55e' : catStats.completion >= 50 ? '#f59e0b' : '#ef4444'}
                                      strokeWidth="4"
                                      strokeDasharray={`${catStats.completion * 1.76} 176`}
                                    />
                                  </svg>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-sm font-bold">{Math.round(catStats.completion)}%</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Erledigte Aufgaben (≥2×) */}
                                <div>
                                  <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center">
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Erledigt ≥2× ({catStats.completedTasks.length})
                                  </h4>
                                  {catStats.completedTasks.length === 0 ? (
                                    <p className="text-sm text-gray-400 italic">Noch keine</p>
                                  ) : (
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                      {catStats.completedTasks.map(([task, count]) => (
                                        <div key={task} className="flex items-center justify-between text-sm bg-green-50 px-2 py-1 rounded">
                                          <span className="text-green-800 truncate">{task}</span>
                                          <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${
                                            count >= 5 ? 'bg-green-500 text-white' :
                                            count >= 3 ? 'bg-green-400 text-white' :
                                            'bg-green-200 text-green-800'
                                          }`}>
                                            {count}×
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                
                                {/* In Arbeit (1×) */}
                                {catStats.inProgressTasks.length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-medium text-orange-700 mb-2 flex items-center">
                                      <AlertCircle className="w-4 h-4 mr-1" />
                                      1× gemacht – 1× noch nötig ({catStats.inProgressTasks.length})
                                    </h4>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                      {catStats.inProgressTasks.map(([task, count]) => (
                                        <div key={task} className="flex items-center justify-between text-sm bg-orange-50 px-2 py-1 rounded">
                                          <span className="text-orange-800 truncate">{task}</span>
                                          <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-medium bg-orange-200 text-orange-800">
                                            {count}×
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Ausstehende Aufgaben (0×) */}
                                <div>
                                  <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center">
                                    <AlertCircle className="w-4 h-4 mr-1" />
                                    Noch nicht gemacht – 2× noch nötig ({catStats.pendingTasks.length})
                                  </h4>
                                  {catStats.pendingTasks.length === 0 ? (
                                    <p className="text-sm text-green-600 font-medium">✓ Alle mindestens gestartet!</p>
                                  ) : (
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                      {catStats.pendingTasks.map(([task]) => (
                                        <div key={task} className="text-sm bg-red-50 text-red-800 px-2 py-1 rounded truncate">
                                          {task}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* KOMPETENZEN TAB */}
                    {activeTab === 'competencies' && (
                      <div className="space-y-4">
                        {(() => {
                          const compStats = getCompetencyStats();
                          const completion = getCompetencyCompletion();
                          
                          const completed = compStats.filter(c => c.count >= 3);
                          const inProgress = compStats.filter(c => c.count > 0 && c.count < 3);
                          const notStarted = compStats.filter(c => c.count === 0);
                          
                          return (
                            <>
                              {/* Fortschritts-Übersicht */}
                              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                                <div>
                                  <p className="text-sm text-purple-700">
                                    <strong>{completed.length}</strong> von {competencies.length} Kompetenzen erfüllt (≥3× geübt)
                                  </p>
                                  <p className="text-xs text-purple-600 mt-1">
                                    Jede Kompetenz muss mindestens 3× pro Jahr geübt werden.
                                  </p>
                                </div>
                                <div className="relative w-16 h-16">
                                  <svg className="w-16 h-16 transform -rotate-90">
                                    <circle cx="32" cy="32" r="28" fill="none" stroke="#e9d5ff" strokeWidth="4" />
                                    <circle 
                                      cx="32" cy="32" r="28" fill="none" 
                                      stroke={completion >= 80 ? '#22c55e' : completion >= 50 ? '#f59e0b' : '#ef4444'}
                                      strokeWidth="4"
                                      strokeDasharray={`${completion * 1.76} 176`}
                                    />
                                  </svg>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-sm font-bold">{Math.round(completion)}%</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Erfüllt (≥3×) */}
                              {completed.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-green-700 mb-2">✅ Erfüllt ≥3× ({completed.length})</p>
                                  <div className="space-y-2">
                                    {completed.map(comp => (
                                      <div key={comp.id} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                        <div className="flex justify-between items-center">
                                          <div>
                                            <span className="font-medium text-green-900">{comp.name}</span>
                                            <p className="text-xs text-green-600">{comp.description}</p>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <span className="bg-green-200 text-green-800 px-2 py-1 rounded text-sm">
                                              {comp.count}× geübt
                                            </span>
                                            {comp.improved > 0 && (
                                              <span className="bg-purple-200 text-purple-800 px-2 py-1 rounded text-sm">
                                                {comp.improved}× verbessert
                                              </span>
                                            )}
                                            {comp.totalHours > 0 && (
                                              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">
                                                {comp.totalHours.toFixed(1)}h
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* In Arbeit (1-2×) */}
                              {inProgress.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-orange-700 mb-2">⚠️ In Arbeit ({inProgress.length})</p>
                                  <div className="space-y-2">
                                    {inProgress.map(comp => (
                                      <div key={comp.id} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                        <div className="flex justify-between items-center">
                                          <div>
                                            <span className="font-medium text-orange-900">{comp.name}</span>
                                            <p className="text-xs text-orange-600">{comp.description}</p>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <span className="bg-orange-200 text-orange-800 px-2 py-1 rounded text-sm">
                                              {comp.count}× ({3 - comp.count}× noch nötig)
                                            </span>
                                            {comp.improved > 0 && (
                                              <span className="bg-purple-200 text-purple-800 px-2 py-1 rounded text-sm">
                                                {comp.improved}× verbessert
                                              </span>
                                            )}
                                            {comp.totalHours > 0 && (
                                              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">
                                                {comp.totalHours.toFixed(1)}h
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Noch nicht geübt */}
                              {notStarted.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-red-700 mb-2">❌ Noch nicht geübt ({notStarted.length}) – 3× nötig</p>
                                  <div className="flex flex-wrap gap-2">
                                    {notStarted.map(comp => (
                                      <span 
                                        key={comp.id}
                                        className="text-sm bg-red-50 text-red-700 px-3 py-1 rounded border border-red-200"
                                      >
                                        {comp.name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {/* NOTIZEN TAB */}
                    {activeTab === 'notes' && (
                      <div>
                        <p className="text-gray-600 mb-4">
                          Wähle einen Eintrag aus, um eine Notiz hinzuzufügen oder zu bearbeiten.
                        </p>
                        
                        {entries.length === 0 ? (
                          <p className="text-gray-400 text-center py-8">Keine Einträge vorhanden.</p>
                        ) : (
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {entries.slice(0, 20).map(entry => (
                              <div 
                                key={entry.id} 
                                className={`p-4 rounded-lg border cursor-pointer transition ${
                                  selectedEntry?.id === entry.id
                                    ? 'border-orange-500 bg-orange-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                                onClick={() => {
                                  setSelectedEntry(entry);
                                  setTrainerNote(entry.trainerNote || '');
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <span className="text-xl">{workCategories.find(c => c.id === entry.category)?.icon || '📋'}</span>
                                    <div>
                                      <p className="font-medium text-gray-900">
                                        {entry.date?.toLocaleDateString('de-CH')}
                                      </p>
                                      <p className="text-sm text-gray-500">
                                        {entry.categoryName || 'Kompetenz-Eintrag'}
                                        {entry.tasks?.length > 0 && ` · ${entry.tasks.length} Aufgaben`}
                                      </p>
                                    </div>
                                  </div>
                                  {entry.trainerNote && (
                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                                      💬 Notiz vorhanden
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Notiz-Eingabe */}
                        {selectedEntry && (
                          <div className="mt-6 border-t pt-6">
                            <h4 className="font-medium text-gray-900 mb-2">
                              💬 Notiz für {selectedEntry.date?.toLocaleDateString('de-CH')}
                            </h4>
                            <textarea
                              value={trainerNote}
                              onChange={(e) => setTrainerNote(e.target.value)}
                              rows={3}
                              placeholder="Notiz eingeben... (optional)"
                              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                            <div className="flex justify-end space-x-3 mt-3">
                              <button
                                onClick={() => {
                                  setSelectedEntry(null);
                                  setTrainerNote('');
                                }}
                                className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50"
                              >
                                Abbrechen
                              </button>
                              <button
                                onClick={handleSaveNote}
                                disabled={loading}
                                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                              >
                                {loading ? 'Speichern...' : 'Notiz speichern'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainerDashboard;
