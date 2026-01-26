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
import { workCategories, competencies, ratingScale } from '../../data/curriculum';
import { Car, LogOut, Users, BookOpen, Award, Calendar, MessageSquare } from 'lucide-react';
import ApprenticeCodeGenerator from './ApprenticeCodeGenerator';
import TrainerStatistics from './TrainerStatistics';

const TrainerDashboard = () => {
  const { signOut, userData, currentUser } = useAuth();
  const [apprentices, setApprentices] = useState([]);
  const [entries, setEntries] = useState([]);
  const [selectedApprentice, setSelectedApprentice] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [trainerNote, setTrainerNote] = useState(''); // Notiz vom Trainer
  const [activeTab, setActiveTab] = useState('entries'); // 'entries' oder 'statistics'
  const [entriesTimeFilter, setEntriesTimeFilter] = useState('all'); // 'all', 'week', 'month', 'year'
  const [entriesCustomStartDate, setEntriesCustomStartDate] = useState('');
  const [entriesCustomEndDate, setEntriesCustomEndDate] = useState('');

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

  // Eintrag auswählen zum Anschauen
  const handleSelectEntry = (entry) => {
    setSelectedEntry(entry);
    setTrainerNote(entry.trainerNote || '');
  };

  // Notiz speichern (optional)
  const handleSaveNote = async () => {
    if (!selectedEntry) return;

    setLoading(true);
    try {
      const entryRef = doc(db, 'entries', selectedEntry.id);
      await updateDoc(entryRef, {
        trainerNote: trainerNote.trim(),
        trainerNoteAt: trainerNote.trim() ? Timestamp.now() : null,
        trainerNoteBy: trainerNote.trim() ? currentUser.uid : null,
        hasNewNote: trainerNote.trim() ? true : false // Flag für Lernende
      });

      // Liste aktualisieren
      setEntries(prev =>
        prev.map(e =>
          e.id === selectedEntry.id
            ? { ...e, trainerNote: trainerNote.trim(), hasNewNote: trainerNote.trim() ? true : false }
            : e
        )
      );

      alert(trainerNote.trim() ? 'Notiz erfolgreich gespeichert!' : 'Notiz gelöscht!');
      setSelectedEntry(null);
      setTrainerNote('');
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Fehler beim Speichern der Notiz.');
    } finally {
      setLoading(false);
    }
  };

  const selectedApprenticeData = apprentices.find(a => a.id === selectedApprentice);

  // Filter-Funktion für Einträge
  const getFilteredEntriesForList = () => {
    if (entriesTimeFilter === 'all') return entries;
    
    const now = new Date();
    let startDate;
    
    switch(entriesTimeFilter) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      case 'custom':
        if (!entriesCustomStartDate || !entriesCustomEndDate) return entries;
        return entries.filter(e => {
          const entryDate = e.date || e.createdAt;
          return entryDate >= new Date(entriesCustomStartDate) && entryDate <= new Date(entriesCustomEndDate);
        });
      default:
        return entries;
    }
    
    return entries.filter(e => {
      const entryDate = e.date || e.createdAt;
      return entryDate >= startDate;
    });
  };
  const pendingEntries = entries.filter(e => e.status === 'pending');
  const reviewedEntries = entries.filter(e => e.status === 'reviewed');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/logo.svg" 
                alt="carli-check Logo" 
                className="w-10 h-10"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900">carli-check</h1>
                <p className="text-sm text-gray-600">
                  Berufsbildner:in · {userData?.name}
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Lernenden-Liste */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Lernende
              </h2>
              
              {/* Code-Generator */}
              <div className="mb-4">
                <ApprenticeCodeGenerator 
                  trainerId={currentUser?.uid} 
                  companyId={userData?.companyId}
                />
              </div>
              
              <div className="space-y-2">
                {apprentices.length === 0 ? (
                  <p className="text-sm text-gray-600">Keine Lernenden zugewiesen</p>
                ) : (
                  apprentices.map((apprentice) => {
                    const apprenticeEntries = entries.filter(e => e.apprenticeId === apprentice.id);
                    const pending = apprenticeEntries.filter(e => e.status === 'pending').length;
                    
                    return (
                      <button
                        key={apprentice.id}
                        onClick={() => setSelectedApprentice(apprentice.id)}
                        className={`w-full text-left p-3 rounded-lg border transition ${
                          selectedApprentice === apprentice.id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-gray-900">{apprentice.name}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {apprenticeEntries.length} Einträge
                          {pending > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">
                              {pending} offen
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Einträge und Bewertung */}
          <div className="lg:col-span-3">
            {!selectedApprentice ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Lernenden</h3>
                <p className="text-gray-600">
                  Es sind noch keine Lernenden zugewiesen.
                </p>
              </div>
            ) : loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Lade Einträge...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Statistik-Übersicht */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Einträge gesamt</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{entries.length}</p>
                      </div>
                      <BookOpen className="w-10 h-10 text-blue-600 opacity-20" />
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Zu bewerten</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{pendingEntries.length}</p>
                      </div>
                      <Award className="w-10 h-10 text-yellow-600 opacity-20" />
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Bewertet</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{reviewedEntries.length}</p>
                      </div>
                      <MessageSquare className="w-10 h-10 text-green-600 opacity-20" />
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-lg shadow-sm">
                  <div className="border-b border-gray-200">
                    <div className="flex space-x-8 px-6">
                      <button
                        onClick={() => setActiveTab('entries')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                          activeTab === 'entries'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        📋 Einträge
                      </button>
                      <button
                        onClick={() => setActiveTab('statistics')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                          activeTab === 'statistics'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        📊 Statistik
                      </button>
                    </div>
                  </div>
                </div>

                {/* Einträge Tab */}
                {activeTab === 'entries' && (
                  <div className="bg-white rounded-lg shadow-sm">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">
                        Einträge von {selectedApprenticeData?.name}
                      </h3>
                      
                      {/* Zeitfilter */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setEntriesTimeFilter('all')}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                            entriesTimeFilter === 'all'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Alle
                        </button>
                        <button
                          onClick={() => setEntriesTimeFilter('week')}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                            entriesTimeFilter === 'week'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Letzte Woche
                        </button>
                        <button
                          onClick={() => setEntriesTimeFilter('month')}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                            entriesTimeFilter === 'month'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Letzter Monat
                        </button>
                        <button
                          onClick={() => setEntriesTimeFilter('year')}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                            entriesTimeFilter === 'year'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Letztes Jahr
                        </button>
                        <button
                          onClick={() => setEntriesTimeFilter('custom')}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                            entriesTimeFilter === 'custom'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Eigener Zeitraum
                        </button>
                      </div>
                      
                      {/* Custom Date Range */}
                      {entriesTimeFilter === 'custom' && (
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Von</label>
                            <input
                              type="date"
                              value={entriesCustomStartDate}
                              onChange={(e) => setEntriesCustomStartDate(e.target.value)}
                              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Bis</label>
                            <input
                              type="date"
                              value={entriesCustomEndDate}
                              onChange={(e) => setEntriesCustomEndDate(e.target.value)}
                              max={new Date().toISOString().split('T')[0]}
                              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="divide-y divide-gray-200">
                      {getFilteredEntriesForList().length === 0 ? (
                        <div className="p-12 text-center">
                          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Einträge</h3>
                          <p className="text-gray-600">
                            {entriesTimeFilter === 'all' 
                              ? `${selectedApprenticeData?.name} hat noch keine Arbeitsberichte erstellt.`
                              : 'Keine Einträge im gewählten Zeitraum gefunden.'}
                          </p>
                        </div>
                      ) : (
                        getFilteredEntriesForList().map((entry) => (
                          <div key={entry.id} className="p-4 hover:bg-gray-50 transition">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3 flex-1">
                                <div className="text-2xl">
                                  {workCategories.find(c => c.id === entry.category)?.icon || '📋'}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900">{entry.categoryName}</h4>
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
                                  
                                  <div className="mt-2">
                                    <p className="text-sm text-gray-700 font-medium">Aufgaben:</p>
                                    <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                                      {entry.tasks?.slice(0, 3).map((task, idx) => (
                                        <li key={idx}>{task}</li>
                                      ))}
                                      {entry.tasks?.length > 3 && (
                                        <li className="text-gray-500">
                                          und {entry.tasks.length - 3} weitere...
                                        </li>
                                      )}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-3 ml-4">
                                {entry.trainerNote && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded flex items-center">
                                    💬 Notiz
                                  </span>
                                )}
                                <button
                                  onClick={() => handleSelectEntry(entry)}
                                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                                >
                                  Ansehen
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Statistik Tab */}
                {activeTab === 'statistics' && selectedApprenticeData && (
                  <TrainerStatistics 
                    entries={entries}
                    apprenticeName={selectedApprenticeData.name}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Eintrags-Ansicht Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  Eintrag ansehen
                </h3>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Eintrag Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start space-x-3 mb-4">
                  <div className="text-3xl">
                    {workCategories.find(c => c.id === selectedEntry.category)?.icon || '📋'}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{selectedEntry.categoryName}</h4>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {selectedEntry.createdAt?.toLocaleString('de-CH', { 
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {selectedEntry.hoursWorked > 0 && (
                        <span>{selectedEntry.hoursWorked} Std.</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-1">Aufgaben:</h5>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      {selectedEntry.tasks?.map((task, idx) => (
                        <li key={idx}>{task}</li>
                      ))}
                    </ul>
                  </div>
                  
                  {selectedEntry.description && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-1">Beschreibung:</h5>
                      <p className="text-sm text-gray-600">{selectedEntry.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Selbsteinschätzung des Lernenden */}
              {selectedEntry.competencyRatings && Object.keys(selectedEntry.competencyRatings).length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Selbsteinschätzung des Lernenden
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(selectedEntry.competencyRatings).map(([compId, rating]) => {
                      const comp = competencies.find(c => c.id === compId);
                      const ratingInfo = ratingScale.find(r => r.value === rating);
                      if (!comp) return null;
                      
                      return (
                        <div key={compId} className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900">{comp.name}</span>
                            <span 
                              className="px-3 py-1 rounded-full text-sm font-bold text-white"
                              style={{ backgroundColor: ratingInfo?.color }}
                            >
                              {rating}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">{comp.description}</p>
                          <p className="text-xs text-gray-500 mt-1">{ratingInfo?.label}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Notiz vom Berufsbildner (optional) */}
              <div className="border-t pt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  💬 Notiz hinzufügen (optional)
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  Hinterlasse eine Notiz für den/die Lernende/n. Dies ist freiwillig.
                </p>
                <textarea
                  value={trainerNote}
                  onChange={(e) => setTrainerNote(e.target.value)}
                  rows={4}
                  placeholder="z.B. Sehr gute Arbeit! Achte beim nächsten Mal auf..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                {selectedEntry.trainerNote && (
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Tipp: Leere das Feld komplett um die Notiz zu löschen
                  </p>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
              <button
                onClick={() => {
                  setSelectedEntry(null);
                  setTrainerNote('');
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveNote}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50"
              >
                {loading ? 'Speichern...' : 'Notiz speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainerDashboard;
