import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { workCategories, competencies } from '../../data/curriculum';
import { Plus, Calendar, LogOut, Award, TrendingUp, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const ApprenticeDashboard = () => {
  const { signOut, userData, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('new-entry');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filter
  const [entriesTimeFilter, setEntriesTimeFilter] = useState('all');
  
  // Form State - Datum
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [existingEntryId, setExistingEntryId] = useState(null);
  
  // ARBEITSKATEGORIEN - unabhängig
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [customTask, setCustomTask] = useState('');
  const [hoursCategory, setHoursCategory] = useState('');
  
  // KOMPETENZEN - unabhängig
  const [selectedComps, setSelectedComps] = useState([]);
  const [expandedComp, setExpandedComp] = useState(null);
  const [compStatus, setCompStatus] = useState('geübt');
  const [compNote, setCompNote] = useState('');
  const [hoursComps, setHoursComps] = useState('');
  
  // Original-Werte für Änderungs-Erkennung
  const [originalData, setOriginalData] = useState({
    tasks: [], comps: [], hoursCategory: '', hoursComps: ''
  });

  // Prüfen ob ungespeicherte Änderungen
  const hasUnsavedChanges = useCallback(() => {
    if (!existingEntryId) {
      return selectedTasks.length > 0 || selectedComps.length > 0 || customTask.trim() !== '';
    }
    const tasksChanged = JSON.stringify(selectedTasks.sort()) !== JSON.stringify(originalData.tasks.sort());
    const compsChanged = JSON.stringify(selectedComps.sort()) !== JSON.stringify(originalData.comps.sort());
    const hoursCatChanged = hoursCategory !== originalData.hoursCategory;
    const hoursCompChanged = hoursComps !== originalData.hoursComps;
    return tasksChanged || compsChanged || hoursCatChanged || hoursCompChanged || customTask.trim() !== '';
  }, [selectedTasks, selectedComps, customTask, existingEntryId, originalData, hoursCategory, hoursComps]);

  // Tab-Wechsel mit Warnung
  const handleTabChange = (newTab) => {
    if (activeTab === 'new-entry' && hasUnsavedChanges()) {
      if (!window.confirm('⚠️ Ungespeicherte Änderungen!\n\nWirklich wechseln?')) return;
    }
    setActiveTab(newTab);
  };

  // Browser-Warnung
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (activeTab === 'new-entry' && hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeTab, hasUnsavedChanges]);

  // Einträge laden
  useEffect(() => {
    const loadEntries = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        const q = query(collection(db, 'entries'), where('apprenticeId', '==', currentUser.uid));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate(),
          createdAt: doc.data().createdAt?.toDate()
        }));
        data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setEntries(data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    loadEntries();
  }, [currentUser]);

  // Formular vorausfüllen wenn Eintrag für Datum existiert
  useEffect(() => {
    if (!date || entries.length === 0) return;
    
    const foundEntry = entries.find(e => {
      if (!e.date) return false;
      return e.date.toISOString().split('T')[0] === date;
    });
    
    if (foundEntry) {
      const tasks = foundEntry.tasks || [];
      const comps = foundEntry.comps || foundEntry.competencies || [];
      const hCat = foundEntry.hoursCategory?.toString() || foundEntry.hoursWorked?.toString() || '';
      const hComp = foundEntry.hoursComps?.toString() || '';
      
      setSelectedCategory(foundEntry.category || '');
      setSelectedTasks(tasks);
      setSelectedComps(comps);
      setHoursCategory(hCat);
      setHoursComps(hComp);
      setDescription(foundEntry.description || '');
      setExistingEntryId(foundEntry.id);
      setOriginalData({ tasks: [...tasks], comps: [...comps], hoursCategory: hCat, hoursComps: hComp });
    } else {
      resetForm(false);
    }
  }, [date, entries]);

  // Formular zurücksetzen
  const resetForm = (keepDate = true) => {
    if (!keepDate) setDate(new Date().toISOString().split('T')[0]);
    setSelectedCategory('');
    setSelectedTasks([]);
    setSelectedComps([]);
    setCustomTask('');
    setHoursCategory('');
    setHoursComps('');
    setDescription('');
    setExistingEntryId(null);
    setOriginalData({ tasks: [], comps: [], hoursCategory: '', hoursComps: '' });
  };

  // Eintrag speichern
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const hasTasks = selectedTasks.length > 0 || customTask.trim();
    const hasComps = selectedComps.length > 0;
    
    if (!hasTasks && !hasComps) {
      alert('Bitte füge Aufgaben oder Kompetenzen hinzu.');
      return;
    }

    setLoading(true);
    try {
      const allTasks = [...selectedTasks];
      if (customTask.trim()) allTasks.push(customTask.trim());

      const entryData = {
        apprenticeId: currentUser.uid,
        apprenticeName: userData?.name || '',
        companyId: userData?.companyId || '',
        trainerId: userData?.trainerId || '',
        category: selectedCategory || '',
        categoryName: selectedCategory ? (workCategories.find(c => c.id === selectedCategory)?.name || '') : '',
        tasks: allTasks,
        comps: selectedComps,
        hoursCategory: parseFloat(hoursCategory) || 0,
        hoursComps: parseFloat(hoursComps) || 0,
        description: description.trim(),
        date: Timestamp.fromDate(new Date(date)),
        status: 'pending',
        createdAt: Timestamp.now(),
        feedback: null
      };

      if (existingEntryId) {
        const { createdAt, ...updateData } = entryData;
        updateData.updatedAt = Timestamp.now();
        await updateDoc(doc(db, 'entries', existingEntryId), updateData);
        alert('✅ Aktualisiert!');
      } else {
        await addDoc(collection(db, 'entries'), entryData);
        alert('✅ Gespeichert!');
      }
      
      // Neu laden
      const q = query(collection(db, 'entries'), where('apprenticeId', '==', currentUser.uid));
      const snapshot = await getDocs(q);
      const newData = snapshot.docs.map(doc => ({
        id: doc.id, ...doc.data(),
        date: doc.data().date?.toDate(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      newData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setEntries(newData);
      
      setOriginalData({ tasks: [...allTasks], comps: [...selectedComps], hoursCategory, hoursComps });
      setCustomTask('');
      
    } catch (error) {
      console.error('Error:', error);
      alert('Fehler: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Kompetenz hinzufügen
  const addCompetency = (compName) => {
    if (!compNote.trim()) {
      alert('Bitte gib ein Beispiel ein.');
      return;
    }
    const compString = `${compName} (${compStatus}): ${compNote.trim()}`;
    if (!selectedComps.some(c => c.startsWith(compName))) {
      setSelectedComps([...selectedComps, compString]);
    } else {
      setSelectedComps(prev => prev.map(c => c.startsWith(compName) ? compString : c));
    }
    setExpandedComp(null);
    setCompNote('');
    setCompStatus('geübt');
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

  // Prüfen ob Eintrag für Datum existiert
  const hasEntryForDate = () => {
    return entries.some(e => e.date?.toISOString().split('T')[0] === date);
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
            <button 
              onClick={() => {
                if (activeTab === 'new-entry' && hasUnsavedChanges()) {
                  if (!window.confirm('⚠️ Ungespeicherte Änderungen!\n\nWirklich abmelden?')) return;
                }
                signOut();
              }} 
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
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
                onClick={() => handleTabChange(tab.id)}
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
          <div className="space-y-6">
            
            {/* Datum-Auswahl */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">📅 Datum</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                {hasEntryForDate() && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                    <p className="text-sm text-blue-800">✏️ Bestehender Eintrag wird bearbeitet</p>
                  </div>
                )}
              </div>
              
              {hasUnsavedChanges() && (
                <div className="mt-4 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 font-medium">
                    ⚠️ Ungespeicherte Änderungen - vergiss nicht zu speichern!
                  </p>
                </div>
              )}
            </div>

            {/* BEREICH 1: Arbeitskategorien */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                🔧 Arbeitskategorien
              </h2>
              
              {/* Kategorie-Auswahl */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                {workCategories.map((cat) => {
                  // Prüfen ob Einträge für diese Kategorie am gewählten Datum existieren
                  const catEntry = entries.find(e => {
                    if (!e.date || e.category !== cat.id) return false;
                    return e.date.toISOString().split('T')[0] === date;
                  });
                  const hasEntry = !!catEntry;
                  const taskCount = catEntry?.tasks?.length || 0;
                  const hours = catEntry?.hoursCategory || catEntry?.hoursWorked || 0;
                  
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
                      className={`p-3 rounded-lg border-2 text-left relative ${
                        selectedCategory === cat.id
                          ? 'border-orange-500 bg-orange-50'
                          : hasEntry
                          ? 'border-green-400 bg-green-50 hover:border-green-500'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-xl block mb-1">{cat.icon}</span>
                      <span className="text-sm font-medium">{cat.name}</span>
                      {hasEntry && (
                        <div className="absolute top-1 right-1 flex flex-col items-end">
                          <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                            {taskCount} ✓
                          </span>
                          {hours > 0 && (
                            <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full mt-0.5">
                              {hours}h
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Aufgaben wenn Kategorie gewählt */}
              {selectedCategory && (
                <div className="border-t pt-4 mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Aufgaben</label>
                  <div className="space-y-2 mb-4">
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
                    placeholder="Eigene Aufgabe hinzufügen..."
                    value={customTask}
                    onChange={(e) => setCustomTask(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg mb-4"
                  />
                  
                  {/* Stunden für Arbeitskategorie */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <label className="block text-sm font-medium text-blue-800 mb-2">
                      ⏱️ Stunden für Arbeitskategorie
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={hoursCategory}
                      onChange={(e) => setHoursCategory(e.target.value)}
                      placeholder="z.B. 4"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              )}
              
              {!selectedCategory && (
                <p className="text-sm text-gray-500 italic">Wähle eine Kategorie um Aufgaben hinzuzufügen</p>
              )}
            </div>

            {/* BEREICH 2: Kompetenzen (unabhängig!) */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Award className="w-5 h-5 mr-2 text-orange-500" />
                Kompetenzen & Lernfortschritt
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Dokumentiere unabhängig von Arbeitskategorien, welche Kompetenzen du geübt oder verbessert hast.
              </p>

              {/* Hinzugefügte Kompetenzen */}
              {selectedComps.length > 0 && (
                <div className="mb-4 space-y-2">
                  <p className="text-sm font-medium text-green-700">✓ Hinzugefügte Kompetenzen ({selectedComps.length}):</p>
                  {selectedComps.map((comp, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <span className="text-sm text-green-800">{comp}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const name = comp.split(' (')[0];
                          setSelectedComps(prev => prev.filter(c => !c.startsWith(name)));
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  {/* Stunden für Kompetenzen */}
                  <div className="bg-purple-50 rounded-lg p-4 mt-4">
                    <label className="block text-sm font-medium text-purple-800 mb-2">
                      ⏱️ Stunden für Kompetenz-Arbeit
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={hoursComps}
                      onChange={(e) => setHoursComps(e.target.value)}
                      placeholder="z.B. 2"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
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
                        <div className="text-left">
                          <span className="font-medium">{comp.name}</span>
                          <p className="text-xs text-gray-500">{comp.description}</p>
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                      
                      {isExpanded && (
                        <div className="p-4 bg-white border-t space-y-3">
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

            {/* Notizen & Speichern */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">📝 Allgemeine Notizen (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Bemerkungen zum Tag..."
                className="w-full px-4 py-2 border rounded-lg mb-4"
              />
              
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    if (hasUnsavedChanges() && !window.confirm('⚠️ Wirklich zurücksetzen?')) return;
                    resetForm();
                  }}
                  className="px-6 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Zurücksetzen
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {loading ? 'Speichern...' : existingEntryId ? 'Aktualisieren' : 'Speichern'}
                </button>
              </div>
            </div>
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
                          <span className="text-sm font-medium text-gray-500">
                            {entry.date?.toLocaleDateString('de-CH')}
                          </span>
                        </div>
                        
                        {/* Arbeitskategorie */}
                        {entry.category && entry.tasks?.length > 0 && (
                          <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-lg">{workCategories.find(c => c.id === entry.category)?.icon || '🔧'}</span>
                              <span className="font-medium text-blue-900">{entry.categoryName || 'Arbeit'}</span>
                              {(entry.hoursCategory || entry.hoursWorked) > 0 && (
                                <span className="text-sm text-blue-600">({(entry.hoursCategory || entry.hoursWorked).toFixed(1)}h)</span>
                              )}
                            </div>
                            <p className="text-sm text-blue-800">{entry.tasks.join(', ')}</p>
                          </div>
                        )}
                        
                        {/* Kompetenzen */}
                        {(entry.comps?.length > 0 || entry.competencies?.length > 0) && (
                          <div className="p-3 bg-purple-50 rounded-lg">
                            <div className="flex items-center space-x-2 mb-2">
                              <Award className="w-4 h-4 text-purple-600" />
                              <span className="font-medium text-purple-900">Kompetenzen</span>
                              {entry.hoursComps > 0 && (
                                <span className="text-sm text-purple-600">({entry.hoursComps.toFixed(1)}h)</span>
                              )}
                            </div>
                            <div className="space-y-1">
                              {(entry.comps || entry.competencies || []).map((comp, idx) => (
                                <div key={idx} className="text-sm text-purple-800 bg-white px-2 py-1 rounded">
                                  {comp}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {entry.description && (
                          <p className="text-sm text-gray-600 mt-2 italic">{entry.description}</p>
                        )}
                      </div>
                      
                      <button
                        onClick={async () => {
                          if (!confirm('Wirklich löschen?')) return;
                          await deleteDoc(doc(db, 'entries', entry.id));
                          setEntries(prev => prev.filter(e => e.id !== entry.id));
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg ml-4 h-fit"
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-orange-50 rounded-lg p-4">
                <p className="text-sm text-orange-600">Einträge</p>
                <p className="text-2xl font-bold text-orange-900">{entries.length}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-600">Mit Kompetenzen</p>
                <p className="text-2xl font-bold text-green-900">
                  {entries.filter(e => (e.comps?.length > 0) || (e.competencies?.length > 0)).length}
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-600">Arbeitsstunden</p>
                <p className="text-2xl font-bold text-blue-900">
                  {entries.reduce((sum, e) => sum + (e.hoursCategory || e.hoursWorked || 0), 0).toFixed(1)}h
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-purple-600">Kompetenz-Std.</p>
                <p className="text-2xl font-bold text-purple-900">
                  {entries.reduce((sum, e) => sum + (e.hoursComps || 0), 0).toFixed(1)}h
                </p>
              </div>
            </div>

            {/* Arbeitskategorien */}
            <h3 className="font-medium mb-4">📁 Arbeitskategorien</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
              {workCategories.map((cat) => {
                const catEntries = entries.filter(e => e.category === cat.id);
                const totalHours = catEntries.reduce((sum, e) => sum + (e.hoursCategory || e.hoursWorked || 0), 0);
                const totalTasks = catEntries.reduce((sum, e) => sum + (e.tasks?.length || 0), 0);
                
                return (
                  <div key={cat.id} className={`p-4 rounded-lg ${catEntries.length > 0 ? 'bg-gray-50' : 'bg-gray-100 border-2 border-dashed border-gray-300'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">{cat.icon}</span>
                        <span className="font-medium">{cat.name}</span>
                      </div>
                      {catEntries.length > 0 ? (
                        <div className="text-right">
                          <p className="text-sm text-green-600 font-medium">{catEntries.length} Einträge</p>
                          <p className="text-xs text-gray-500">{totalTasks} Aufgaben · {totalHours.toFixed(1)}h</p>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Kompetenzen */}
            <h3 className="font-medium mb-4">🏆 Kompetenzen</h3>
            <div className="space-y-3">
              {competencies.map((comp) => {
                const count = entries.filter(e => {
                  const allComps = e.comps || e.competencies || [];
                  return allComps.some(c => c.startsWith(comp.name));
                }).length;
                
                const improved = entries.filter(e => {
                  const allComps = e.comps || e.competencies || [];
                  return allComps.some(c => c.startsWith(comp.name) && c.includes('verbessert'));
                }).length;
                
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
