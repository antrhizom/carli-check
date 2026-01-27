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
  const [hoursCategory, setHoursCategory] = useState(''); // Stunden für Arbeitskategorie
  const [hoursComps, setHoursComps] = useState(''); // Stunden für Kompetenzen
  const [existingEntryId, setExistingEntryId] = useState(null);
  
  // KOMPETENZEN: EXAKT wie tasks - einfaches Array von Strings!
  const [selectedComps, setSelectedComps] = useState([]); // Array von Strings wie ["Teamfähigkeit - geübt: Beispiel"]
  const [expandedComp, setExpandedComp] = useState(null);
  const [compStatus, setCompStatus] = useState('geübt');
  const [compNote, setCompNote] = useState('');
  
  // Tracking für ursprüngliche Werte (um Änderungen zu erkennen)
  const [originalTasks, setOriginalTasks] = useState([]);
  const [originalComps, setOriginalComps] = useState([]);
  const [originalHoursCategory, setOriginalHoursCategory] = useState('');
  const [originalHoursComps, setOriginalHoursComps] = useState('');

  // Prüfen ob ungespeicherte Änderungen vorhanden sind
  const hasUnsavedChanges = useCallback(() => {
    // Neue Einträge: Tasks oder Kompetenzen gewählt
    if (!existingEntryId) {
      return selectedTasks.length > 0 || selectedComps.length > 0 || customTask.trim() !== '';
    }
    
    // Bestehende Einträge: Vergleiche mit Original
    const tasksChanged = JSON.stringify(selectedTasks.sort()) !== JSON.stringify(originalTasks.sort());
    const compsChanged = JSON.stringify(selectedComps.sort()) !== JSON.stringify(originalComps.sort());
    const customTaskChanged = customTask.trim() !== '';
    const hoursCatChanged = hoursCategory !== originalHoursCategory;
    const hoursCompChanged = hoursComps !== originalHoursComps;
    
    return tasksChanged || compsChanged || customTaskChanged || hoursCatChanged || hoursCompChanged;
  }, [selectedTasks, selectedComps, customTask, existingEntryId, originalTasks, originalComps, hoursCategory, hoursComps, originalHoursCategory, originalHoursComps]);

  // Tab-Wechsel mit Warnung
  const handleTabChange = (newTab) => {
    if (activeTab === 'new-entry' && hasUnsavedChanges()) {
      const confirmed = window.confirm(
        '⚠️ Du hast ungespeicherte Änderungen!\n\nMöchtest du wirklich wechseln? Deine Änderungen gehen verloren.'
      );
      if (!confirmed) return;
    }
    setActiveTab(newTab);
  };

  // Browser-Verlassen Warnung
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (activeTab === 'new-entry' && hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
        return '';
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

  // Formular vorausfüllen wenn Eintrag für Datum+Kategorie existiert
  useEffect(() => {
    if (!date || !selectedCategory || entries.length === 0) {
      // Wenn keine Kategorie gewählt, Formular zurücksetzen
      if (!selectedCategory) {
        setSelectedTasks([]);
        setSelectedComps([]);
        setDescription('');
        setHoursCategory('');
        setHoursComps('');
        setExistingEntryId(null);
      }
      return;
    }
    
    // Suche Eintrag für dieses Datum und diese Kategorie
    const foundEntry = entries.find(entry => {
      if (!entry.date || entry.category !== selectedCategory) return false;
      const entryDateStr = entry.date.toISOString().split('T')[0];
      return entryDateStr === date;
    });
    
    if (foundEntry) {
      console.log('📝 Eintrag gefunden:', foundEntry);
      console.log('📝 Tasks:', foundEntry.tasks);
      console.log('📝 Comps:', foundEntry.comps);
      console.log('📝 Alte competencies:', foundEntry.competencies);
      
      // Daten setzen
      const tasks = foundEntry.tasks || [];
      // Rückwärtskompatibilität: comps, competencies, oder leer
      const comps = foundEntry.comps || foundEntry.competencies || [];
      
      // Stunden laden (Rückwärtskompatibilität: altes hoursWorked auf hoursCategory)
      const hoursCat = foundEntry.hoursCategory?.toString() || foundEntry.hoursWorked?.toString() || '';
      const hoursComp = foundEntry.hoursComps?.toString() || '';
      
      setSelectedTasks(tasks);
      setSelectedComps(comps);
      setOriginalTasks([...tasks]);
      setOriginalComps([...comps]);
      setHoursCategory(hoursCat);
      setHoursComps(hoursComp);
      setOriginalHoursCategory(hoursCat);
      setOriginalHoursComps(hoursComp);
      setDescription(foundEntry.description || '');
      setExistingEntryId(foundEntry.id);
      
      console.log('✅ Formular vorausgefüllt mit', tasks.length, 'Tasks und', comps.length, 'Kompetenzen');
    } else {
      console.log('ℹ️ Kein Eintrag für', date, selectedCategory);
      // Kein Eintrag - Formular leeren (aber Kategorie behalten)
      setSelectedTasks([]);
      setSelectedComps([]);
      setOriginalTasks([]);
      setOriginalComps([]);
      setHoursCategory('');
      setHoursComps('');
      setOriginalHoursCategory('');
      setOriginalHoursComps('');
      setDescription('');
      setHoursWorked('');
      setExistingEntryId(null);
    }
  }, [date, selectedCategory, entries]);

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
        hoursCategory: parseFloat(hoursCategory) || 0, // Stunden für Arbeitskategorie
        hoursComps: parseFloat(hoursComps) || 0,       // Stunden für Kompetenzen
        status: 'pending',
        createdAt: Timestamp.now(),
        feedback: null
      };

      console.log('📝 Speichere Entry:', entryData);
      console.log('📝 Tasks:', allTasks);
      console.log('📝 Comps:', selectedComps);

      if (existingEntryId) {
        // Update - ohne createdAt!
        const updateData = {
          category: selectedCategory || 'kompetenz-only',
          categoryName: selectedCategory ? (workCategories.find(c => c.id === selectedCategory)?.name || '') : 'Kompetenz-Eintrag',
          tasks: allTasks,
          comps: selectedComps,
          description: description.trim(),
          date: Timestamp.fromDate(new Date(date)),
          hoursCategory: parseFloat(hoursCategory) || 0,
          hoursComps: parseFloat(hoursComps) || 0,
          updatedAt: Timestamp.now()
        };
        await updateDoc(doc(db, 'entries', existingEntryId), updateData);
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
      
      // Original-Werte aktualisieren (jetzt sind die gespeicherten Werte das neue "Original")
      setOriginalTasks([...allTasks]);
      setOriginalComps([...selectedComps]);
      setOriginalHoursCategory(hoursCategory);
      setOriginalHoursComps(hoursComps);
      
      // Reset nur bestimmte Felder
      setCustomTask('');
      setDescription('');
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
            <button 
              onClick={() => {
                if (activeTab === 'new-entry' && hasUnsavedChanges()) {
                  const confirmed = window.confirm(
                    '⚠️ Du hast ungespeicherte Änderungen!\n\nMöchtest du dich wirklich abmelden? Deine Änderungen gehen verloren.'
                  );
                  if (!confirmed) return;
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
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-6 flex items-center">
              <Plus className="w-5 h-5 mr-2 text-orange-500" />
              Tageseintrag
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Info wenn bestehender Eintrag */}
              {existingEntryId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    ✏️ Du bearbeitest einen bestehenden Eintrag. Änderungen werden beim Speichern aktualisiert.
                  </p>
                </div>
              )}
              
              {/* Warnung bei ungespeicherten Änderungen */}
              {hasUnsavedChanges() && (
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 font-medium">
                    ⚠️ Ungespeicherte Änderungen vorhanden - vergiss nicht zu speichern!
                  </p>
                </div>
              )}
              
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
                  {workCategories.map((cat) => {
                    // Prüfen ob Eintrag für dieses Datum existiert
                    const entry = entries.find(e => {
                      if (!e.date || e.category !== cat.id) return false;
                      return e.date.toISOString().split('T')[0] === date;
                    });
                    const hasEntry = !!entry;
                    const entryTasks = entry?.tasks?.length || 0;
                    const entryComps = (entry?.comps || entry?.competencies || []).length;
                    
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
                        className={`p-4 rounded-lg border-2 text-left relative ${
                          selectedCategory === cat.id
                            ? 'border-orange-500 bg-orange-50'
                            : hasEntry
                            ? 'border-green-400 bg-green-50 hover:border-green-500'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-2xl block mb-1">{cat.icon}</span>
                        <span className="text-sm font-medium">{cat.name}</span>
                        {hasEntry && (
                          <div className="absolute top-2 right-2 flex flex-col items-end space-y-1">
                            <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                              {entryTasks} Aufg.
                            </span>
                            {entryComps > 0 && (
                              <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                                {entryComps} Komp.
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
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
                
                {/* Stunden für Arbeitskategorie */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ⏱️ Stunden für diese Arbeitskategorie
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={hoursCategory}
                    onChange={(e) => setHoursCategory(e.target.value)}
                    placeholder="z.B. 4"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              )}

              {/* Notizen */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notizen (optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Allgemeine Bemerkungen zum Tag..."
                  className="w-full px-4 py-2 border rounded-lg"
                />
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
                    <p className="text-sm font-medium text-green-700">✓ Hinzugefügte Kompetenzen ({selectedComps.length}):</p>
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
                
                {/* Debug-Info für Bestehendes */}
                {existingEntryId && selectedComps.length === 0 && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Bestehender Eintrag hat keine Kompetenzen gespeichert.
                    </p>
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
                
                {/* Stunden für Kompetenzen */}
                {selectedComps.length > 0 && (
                  <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ⏱️ Stunden für Kompetenz-Arbeit
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={hoursComps}
                      onChange={(e) => setHoursComps(e.target.value)}
                      placeholder="z.B. 2"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex justify-end space-x-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    if (hasUnsavedChanges()) {
                      const confirmed = window.confirm(
                        '⚠️ Du hast ungespeicherte Änderungen!\n\nMöchtest du wirklich zurücksetzen?'
                      );
                      if (!confirmed) return;
                    }
                    setSelectedCategory('');
                    setSelectedTasks([]);
                    setSelectedComps([]);
                    setOriginalTasks([]);
                    setOriginalComps([]);
                    setCustomTask('');
                    setDescription('');
                    setHoursCategory('');
                    setHoursComps('');
                    setOriginalHoursCategory('');
                    setOriginalHoursComps('');
                    setExistingEntryId(null);
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
                  {loading ? 'Speichern...' : existingEntryId ? 'Aktualisieren' : 'Speichern'}
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
                            {(entry.hoursCategory || entry.hoursWorked) > 0 && (
                              <span className="ml-2 text-blue-600">({(entry.hoursCategory || entry.hoursWorked).toFixed(1)}h)</span>
                            )}
                          </p>
                        )}
                        
                        {/* Comps - unterstützt comps und competencies */}
                        {(entry.comps?.length > 0 || entry.competencies?.length > 0) && (
                          <div className="mt-2">
                            <strong className="text-sm text-gray-600">Kompetenzen:</strong>
                            {entry.hoursComps > 0 && (
                              <span className="ml-2 text-sm text-purple-600">({entry.hoursComps.toFixed(1)}h)</span>
                            )}
                            <div className="mt-1 space-y-1">
                              {(entry.comps || entry.competencies || []).map((comp, idx) => (
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

            {/* Arbeitskategorien-Übersicht */}
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
                        <span className="text-sm text-gray-400">Noch keine Einträge</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Kompetenz-Übersicht */}
            <h3 className="font-medium mb-4">🏆 Kompetenzen</h3>
            <div className="space-y-3">
              {competencies.map((comp) => {
                // Zähle Einträge für diese Kompetenz (unterstützt comps und competencies)
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
