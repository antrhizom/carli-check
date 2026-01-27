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
  
  // Filter States
  const [timeFilter, setTimeFilter] = useState('all');
  const [entriesTimeFilter, setEntriesTimeFilter] = useState('all');
  
  // Modal States
  const [viewingEntry, setViewingEntry] = useState(null);
  
  // Form State
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTasks, setSelectedTasks] = useState([]); // Array von Strings
  const [customTask, setCustomTask] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hoursWorked, setHoursWorked] = useState('');
  const [existingEntryId, setExistingEntryId] = useState(null);
  
  // KOMPETENZEN: EXAKT wie tasks - einfaches Array von Strings!
  const [selectedComps, setSelectedComps] = useState([]); // Array von Strings wie ["Teamfähigkeit - geübt: Beispiel"]
  const [expandedComp, setExpandedComp] = useState(null);
  const [compStatus, setCompStatus] = useState('geübt');
  const [compNote, setCompNote] = useState('');

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
        const entriesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate(),
          createdAt: doc.data().createdAt?.toDate()
        }));
        
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

  // Eintrag speichern - GENAU wie das Original, aber mit comps Array
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const hasTaskEntry = selectedCategory && (selectedTasks.length > 0 || customTask.trim());
    const hasCompEntry = selectedComps.length > 0;
    
    if (!hasTaskEntry && !hasCompEntry) {
      alert('Bitte wähle Aufgaben oder Kompetenzen aus.');
      return;
    }

    setLoading(true);
    try {
      // Tasks zusammenstellen (wie original)
      const allTasks = [...selectedTasks];
      if (customTask.trim()) {
        allTasks.push(customTask.trim());
      }

      // Daten für Firebase - tasks UND comps sind beides einfache String-Arrays!
      const entryData = {
        apprenticeId: currentUser.uid,
        apprenticeName: userData?.name || '',
        companyId: userData?.companyId || '',
        trainerId: userData?.trainerId || '',
        category: selectedCategory || 'kompetenz-only',
        categoryName: selectedCategory ? (workCategories.find(c => c.id === selectedCategory)?.name || '') : 'Kompetenz-Eintrag',
        tasks: allTasks,           // String-Array
        comps: selectedComps,      // String-Array - GENAU WIE TASKS!
        description: description.trim(),
        date: Timestamp.fromDate(new Date(date)),
        hoursWorked: parseFloat(hoursWorked) || 0,
        status: 'pending',
        createdAt: Timestamp.now(),
        feedback: null
      };

      console.log('📝 Speichere Entry:', entryData);
      console.log('📝 Tasks:', allTasks);
      console.log('📝 Comps:', selectedComps);

      if (existingEntryId) {
        await updateDoc(doc(db, 'entries', existingEntryId), entryData);
        alert('✅ Aktualisiert!');
      } else {
        const docRef = await addDoc(collection(db, 'entries'), entryData);
        console.log('✅ Gespeichert mit ID:', docRef.id);
        alert('✅ Gespeichert!');
      }
      
      // Neu laden
      const q = query(collection(db, 'entries'), where('apprenticeId', '==', currentUser.uid));
      const snapshot = await getDocs(q);
      const newEntries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      newEntries.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setEntries(newEntries);
      
      // Reset
      setCustomTask('');
      setDescription('');
      setHoursWorked('');
      setExistingEntryId(null);
      
    } catch (error) {
      console.error('❌ Fehler:', error);
      alert('Fehler: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Eintrag löschen
  const handleDelete = async (entryId) => {
    if (!confirm('Wirklich löschen?')) return;
    try {
      await deleteDoc(doc(db, 'entries', entryId));
      setEntries(prev => prev.filter(e => e.id !== entryId));
    } catch (error) {
      alert('Fehler: ' + error.message);
    }
  };

  // Filter
  const getFilteredEntries = (filter) => {
    const now = new Date();
    let filtered = [...entries];
    
    if (filter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(e => e.date >= weekAgo);
    } else if (filter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(e => e.date >= monthAgo);
    }
    
    return filtered;
  };

  // Kompetenz hinzufügen - erstellt einen einfachen String
  const addCompetency = (compName) => {
    if (!compNote.trim()) {
      alert('Bitte gib ein Beispiel ein.');
      return;
    }
    
    // Einfacher String - wie ein Task!
    const compString = `${compName} (${compStatus}): ${compNote.trim()}`;
    
    // Zur Liste hinzufügen (wenn noch nicht vorhanden)
    if (!selectedComps.some(c => c.startsWith(compName))) {
      setSelectedComps([...selectedComps, compString]);
    } else {
      // Ersetzen
      setSelectedComps(prev => prev.map(c => c.startsWith(compName) ? compString : c));
    }
    
    setExpandedComp(null);
    setCompNote('');
    setCompStatus('geübt');
  };

  // Kompetenz entfernen
  const removeCompetency = (compName) => {
    setSelectedComps(prev => prev.filter(c => !c.startsWith(compName)));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <img src="/logo.png" alt="Logo" className="h-12 w-12 object-contain" />
              <div>
                <h1 className="text-xl font-bold">Carli-Check</h1>
                <p className="text-sm text-gray-600">Willkommen, {userData?.name || 'Lernender'}</p>
              </div>
            </div>
            <button onClick={signOut} className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <LogOut className="w-5 h-5" />
              <span>Abmelden</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-8">
            {[
              { id: 'new-entry', label: 'Neuer Eintrag', icon: Plus },
              { id: 'my-entries', label: 'Einträge', icon: Calendar },
              { id: 'statistics', label: 'Statistik', icon: TrendingUp },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* NEUER EINTRAG */}
        {activeTab === 'new-entry' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-6 flex items-center">
              <Plus className="w-5 h-5 mr-2 text-orange-500" />
              Tageseintrag
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Datum */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Datum</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Arbeitskategorie */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Arbeitskategorie</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {workCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
                      className={`p-4 rounded-lg border-2 text-left ${
                        selectedCategory === cat.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl block mb-1">{cat.icon}</span>
                      <span className="text-sm font-medium">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Aufgaben */}
              {selectedCategory && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Aufgaben</label>
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
                          className="w-5 h-5 text-orange-600 rounded"
                        />
                        <span className="ml-3">{task}</span>
                      </label>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Eigene Aufgabe..."
                    value={customTask}
                    onChange={(e) => setCustomTask(e.target.value)}
                    className="mt-3 w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              )}

              {/* Stunden & Beschreibung */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stunden</label>
                  <input
                    type="number"
                    step="0.5"
                    value={hoursWorked}
                    onChange={(e) => setHoursWorked(e.target.value)}
                    placeholder="8"
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notizen</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional..."
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>

              {/* KOMPETENZEN */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <Award className="w-5 h-5 mr-2 text-orange-500" />
                  Kompetenzen
                </h3>

                {/* Hinzugefügte Kompetenzen */}
                {selectedComps.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {selectedComps.map((comp, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <span className="text-sm text-green-800">{comp}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const name = comp.split(' (')[0];
                            removeCompetency(name);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Kompetenz-Auswahl */}
                <div className="space-y-2">
                  {competencies.map((comp) => {
                    const isAdded = selectedComps.some(c => c.startsWith(comp.name));
                    const isExpanded = expandedComp === comp.id;
                    
                    if (isAdded) return null;
                    
                    return (
                      <div key={comp.id} className="border rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedComp(isExpanded ? null : comp.id)}
                          className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100"
                        >
                          <span className="font-medium">{comp.name}</span>
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                        
                        {isExpanded && (
                          <div className="p-4 bg-white border-t space-y-3">
                            {/* Status */}
                            <div className="flex space-x-3">
                              <button
                                type="button"
                                onClick={() => setCompStatus('geübt')}
                                className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium ${
                                  compStatus === 'geübt'
                                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                                    : 'border-gray-200'
                                }`}
                              >
                                🔄 Geübt
                              </button>
                              <button
                                type="button"
                                onClick={() => setCompStatus('verbessert')}
                                className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium ${
                                  compStatus === 'verbessert'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200'
                                }`}
                              >
                                📈 Verbessert
                              </button>
                            </div>
                            
                            {/* Beispiel */}
                            <textarea
                              value={compNote}
                              onChange={(e) => setCompNote(e.target.value)}
                              rows={2}
                              placeholder="Beispiel: Was hast du gemacht?"
                              className="w-full px-3 py-2 border rounded-lg text-sm"
                            />
                            
                            <button
                              type="button"
                              onClick={() => addCompetency(comp.name)}
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

              {/* Submit */}
              <div className="flex justify-end space-x-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('');
                    setSelectedTasks([]);
                    setSelectedComps([]);
                    setCustomTask('');
                    setDescription('');
                    setHoursWorked('');
                  }}
                  className="px-6 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Zurücksetzen
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {loading ? 'Speichern...' : 'Speichern'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* EINTRÄGE */}
        {activeTab === 'my-entries' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-orange-500" />
                Meine Einträge
              </h2>
              <select
                value={entriesTimeFilter}
                onChange={(e) => setEntriesTimeFilter(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="all">Alle</option>
                <option value="week">7 Tage</option>
                <option value="month">30 Tage</option>
              </select>
            </div>

            {getFilteredEntries(entriesTimeFilter).length === 0 ? (
              <p className="text-gray-500 text-center py-8">Keine Einträge.</p>
            ) : (
              <div className="space-y-4">
                {getFilteredEntries(entriesTimeFilter).map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-4">
                    <div className="flex justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-lg">{workCategories.find(c => c.id === entry.category)?.icon || '📝'}</span>
                          <span className="font-medium">{entry.categoryName}</span>
                          <span className="text-sm text-gray-500">{entry.date?.toLocaleDateString('de-CH')}</span>
                        </div>
                        
                        {/* Tasks */}
                        {entry.tasks?.length > 0 && (
                          <p className="text-sm text-gray-600 mb-2">
                            <strong>Aufgaben:</strong> {entry.tasks.join(', ')}
                          </p>
                        )}
                        
                        {/* Comps - GENAU WIE TASKS! */}
                        {entry.comps?.length > 0 && (
                          <div className="mt-2">
                            <strong className="text-sm text-gray-600">Kompetenzen:</strong>
                            <div className="mt-1 space-y-1">
                              {entry.comps.map((comp, idx) => (
                                <div key={idx} className="text-sm bg-orange-50 text-orange-800 px-2 py-1 rounded">
                                  {comp}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg ml-4"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STATISTIK */}
        {activeTab === 'statistics' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-6 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-orange-500" />
              Statistik
            </h2>

            {/* Übersicht */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-orange-50 rounded-lg p-4">
                <p className="text-sm text-orange-600">Einträge</p>
                <p className="text-2xl font-bold text-orange-900">{entries.length}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-600">Mit Kompetenzen</p>
                <p className="text-2xl font-bold text-green-900">
                  {entries.filter(e => e.comps?.length > 0).length}
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-600">Stunden</p>
                <p className="text-2xl font-bold text-blue-900">
                  {entries.reduce((sum, e) => sum + (e.hoursWorked || 0), 0).toFixed(1)}h
                </p>
              </div>
            </div>

            {/* Kompetenz-Übersicht */}
            <h3 className="font-medium mb-4">Kompetenzen</h3>
            <div className="space-y-3">
              {competencies.map((comp) => {
                // Zähle Einträge für diese Kompetenz
                const count = entries.filter(e => 
                  e.comps?.some(c => c.startsWith(comp.name))
                ).length;
                
                const improved = entries.filter(e => 
                  e.comps?.some(c => c.startsWith(comp.name) && c.includes('verbessert'))
                ).length;
                
                return (
                  <div key={comp.id} className={`p-4 rounded-lg ${count > 0 ? 'bg-gray-50' : 'bg-orange-50 border-2 border-dashed border-orange-300'}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{comp.name}</span>
                      {count > 0 ? (
                        <div className="flex items-center space-x-2">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                            {count}× dokumentiert
                          </span>
                          {improved > 0 && (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                              {improved}× verbessert
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-orange-600 text-sm">⚠️ Noch nicht dokumentiert</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default ApprenticeDashboard;
