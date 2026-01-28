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
import { Plus, Calendar, LogOut, Award, TrendingUp, Trash2, ChevronDown, ChevronUp, Clock } from 'lucide-react';

const ApprenticeDashboard = () => {
  const { signOut, userData, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('new-entry');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [entriesTimeFilter, setEntriesTimeFilter] = useState('all');
  
  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [existingEntryId, setExistingEntryId] = useState(null);
  
  // Tasks mit Stunden: { "taskName": hours }
  const [taskHours, setTaskHours] = useState({});
  const [customTask, setCustomTask] = useState('');
  
  // Kompetenzen: [{ name, status, note, hours }]
  const [selectedComps, setSelectedComps] = useState([]);
  const [expandedComp, setExpandedComp] = useState(null);
  const [compStatus, setCompStatus] = useState('geübt');
  const [compNote, setCompNote] = useState('');
  const [compHours, setCompHours] = useState('');
  
  // Original-Werte
  const [originalData, setOriginalData] = useState({ taskHours: {}, comps: [] });
  
  // Statistik - expandierte Kategorien
  const [expandedStatCat, setExpandedStatCat] = useState(null);

  // Ausbildungsjahr berechnen (August bis Juli)
  const getAusbildungsjahr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11
    
    // Wenn vor August (0-6), dann vorheriges Jahr bis aktuelles Jahr
    // Wenn ab August (7-11), dann aktuelles Jahr bis nächstes Jahr
    if (month < 7) { // Januar-Juli
      return {
        start: new Date(year - 1, 7, 1), // 1. August Vorjahr
        end: new Date(year, 6, 31, 23, 59, 59), // 31. Juli aktuelles Jahr
        label: `${year - 1}/${year}`
      };
    } else { // August-Dezember
      return {
        start: new Date(year, 7, 1), // 1. August aktuelles Jahr
        end: new Date(year + 1, 6, 31, 23, 59, 59), // 31. Juli nächstes Jahr
        label: `${year}/${year + 1}`
      };
    }
  };

  // Einträge nach Ausbildungsjahr filtern
  const getEntriesInAusbildungsjahr = () => {
    const { start, end } = getAusbildungsjahr();
    return entries.filter(e => e.date && e.date >= start && e.date <= end);
  };

  // Änderungen prüfen
  const hasUnsavedChanges = useCallback(() => {
    if (!existingEntryId) {
      return Object.keys(taskHours).length > 0 || selectedComps.length > 0;
    }
    return JSON.stringify(taskHours) !== JSON.stringify(originalData.taskHours) ||
           JSON.stringify(selectedComps) !== JSON.stringify(originalData.comps);
  }, [taskHours, selectedComps, existingEntryId, originalData]);

  // Tab-Wechsel
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

  // Formular vorausfüllen
  useEffect(() => {
    if (!date || entries.length === 0) return;
    
    const foundEntry = entries.find(e => e.date?.toISOString().split('T')[0] === date);
    
    if (foundEntry) {
      // TaskHours laden
      const hours = {};
      if (foundEntry.taskHours) {
        Object.assign(hours, foundEntry.taskHours);
      } else if (foundEntry.tasks) {
        const perTask = (foundEntry.hoursCategory || foundEntry.hoursWorked || 0) / (foundEntry.tasks.length || 1);
        foundEntry.tasks.forEach(t => hours[t] = perTask);
      }
      setTaskHours(hours);
      
      // Kompetenzen laden
      let comps = [];
      if (foundEntry.compDetails) {
        comps = foundEntry.compDetails;
      } else if (foundEntry.comps || foundEntry.competencies) {
        const oldComps = foundEntry.comps || foundEntry.competencies || [];
        const perComp = (foundEntry.hoursComps || 0) / (oldComps.length || 1);
        comps = oldComps.map(c => {
          const match = c.match(/^(.+?) \((.+?)\): (.+)$/);
          if (match) return { name: match[1], status: match[2], note: match[3], hours: perComp };
          return { name: c, status: 'geübt', note: '', hours: perComp };
        });
      }
      setSelectedComps(comps);
      
      setDescription(foundEntry.description || '');
      setExistingEntryId(foundEntry.id);
      setOriginalData({ taskHours: { ...hours }, comps: JSON.parse(JSON.stringify(comps)) });
    } else {
      resetForm(false);
    }
  }, [date, entries]);

  const resetForm = (keepDate = true) => {
    if (!keepDate) setDate(new Date().toISOString().split('T')[0]);
    setTaskHours({});
    setSelectedComps([]);
    setCustomTask('');
    setDescription('');
    setExistingEntryId(null);
    setOriginalData({ taskHours: {}, comps: [] });
  };

  // Aufgabe hinzufügen/entfernen
  const toggleTask = (task, categoryId) => {
    setTaskHours(prev => {
      const newHours = { ...prev };
      if (newHours[task] !== undefined) {
        delete newHours[task];
      } else {
        newHours[task] = 0.5; // Standard: 30 Min
      }
      return newHours;
    });
  };

  // Eigene Aufgabe hinzufügen
  const addCustomTask = () => {
    if (!customTask.trim()) return;
    setTaskHours(prev => ({ ...prev, [customTask.trim()]: 0.5 }));
    setCustomTask('');
  };

  // Kompetenz hinzufügen
  const addCompetency = (compName) => {
    if (!compNote.trim()) {
      alert('Bitte gib ein Beispiel ein.');
      return;
    }
    const newComp = {
      name: compName,
      status: compStatus,
      note: compNote.trim(),
      hours: parseFloat(compHours) || 0.5
    };
    
    const idx = selectedComps.findIndex(c => c.name === compName);
    if (idx >= 0) {
      setSelectedComps(prev => prev.map((c, i) => i === idx ? newComp : c));
    } else {
      setSelectedComps(prev => [...prev, newComp]);
    }
    
    setExpandedComp(null);
    setCompNote('');
    setCompHours('');
    setCompStatus('geübt');
  };

  // Speichern
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (Object.keys(taskHours).length === 0 && selectedComps.length === 0) {
      alert('Bitte füge Aufgaben oder Kompetenzen hinzu.');
      return;
    }

    setLoading(true);
    try {
      const totalTaskHours = Object.values(taskHours).reduce((sum, h) => sum + h, 0);
      const totalCompHours = selectedComps.reduce((sum, c) => sum + (c.hours || 0), 0);
      const compsStrings = selectedComps.map(c => `${c.name} (${c.status}): ${c.note}`);

      // Kategorie aus Tasks ableiten
      let category = '';
      let categoryName = '';
      for (const cat of workCategories) {
        if (Object.keys(taskHours).some(t => cat.tasks.includes(t))) {
          category = cat.id;
          categoryName = cat.name;
          break;
        }
      }

      const entryData = {
        apprenticeId: currentUser.uid,
        apprenticeName: userData?.name || '',
        companyId: userData?.companyId || '',
        trainerId: userData?.trainerId || '',
        category,
        categoryName,
        tasks: Object.keys(taskHours),
        taskHours,
        hoursCategory: totalTaskHours,
        comps: compsStrings,
        compDetails: selectedComps,
        hoursComps: totalCompHours,
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
      
      setOriginalData({ taskHours: { ...taskHours }, comps: JSON.parse(JSON.stringify(selectedComps)) });
      
    } catch (error) {
      alert('Fehler: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter
  const getFilteredEntries = (filter) => {
    const now = new Date();
    if (filter === 'week') return entries.filter(e => e.date >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
    if (filter === 'month') return entries.filter(e => e.date >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
    return entries;
  };

  const hasEntryForDate = () => entries.some(e => e.date?.toISOString().split('T')[0] === date);
  
  // Totals
  const totalTaskHours = Object.values(taskHours).reduce((sum, h) => sum + h, 0);
  const totalCompHours = selectedComps.reduce((sum, c) => sum + (c.hours || 0), 0);

  // Tasks nach Kategorie gruppieren
  const getTasksByCategory = () => {
    return workCategories.map(cat => ({
      ...cat,
      selectedTasks: Object.entries(taskHours).filter(([task]) => cat.tasks.includes(task)),
      hasCustomTasks: Object.keys(taskHours).some(t => !workCategories.some(c => c.tasks.includes(t)))
    }));
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
                  if (!window.confirm('⚠️ Ungespeicherte Änderungen?')) return;
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

      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* NEUER EINTRAG */}
        {activeTab === 'new-entry' && (
          <div className="space-y-6">
            
            {/* Datum + Zusammenfassung */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">📅 Datum</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                
                {/* Live-Zusammenfassung */}
                {(totalTaskHours > 0 || totalCompHours > 0) && (
                  <div className="flex items-center space-x-3 bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-3 rounded-lg">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <div className="flex items-center space-x-4 text-sm">
                      {totalTaskHours > 0 && (
                        <span className="text-blue-700">
                          <strong>{totalTaskHours.toFixed(1)}</strong>h Arbeit
                        </span>
                      )}
                      {totalCompHours > 0 && (
                        <span className="text-purple-700">
                          <strong>{totalCompHours.toFixed(1)}</strong>h Kompetenzen
                        </span>
                      )}
                      <span className="text-green-700 font-bold border-l pl-4">
                        = {(totalTaskHours + totalCompHours).toFixed(1)}h Total
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              {hasEntryForDate() && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-800">
                  ✏️ Bestehender Eintrag wird bearbeitet
                </div>
              )}
              
              {hasUnsavedChanges() && (
                <div className="mt-4 bg-yellow-50 border border-yellow-300 rounded-lg px-3 py-2 text-sm text-yellow-800">
                  ⚠️ Ungespeicherte Änderungen
                </div>
              )}
            </div>

            {/* ARBEITSKATEGORIEN */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">🔧 Was hast du heute gearbeitet?</h2>
              
              <div className="space-y-4">
                {workCategories.map((cat) => {
                  const catTasks = Object.entries(taskHours).filter(([task]) => cat.tasks.includes(task));
                  const catHours = catTasks.reduce((sum, [_, h]) => sum + h, 0);
                  const isExpanded = catTasks.length > 0;
                  
                  return (
                    <div key={cat.id} className={`border rounded-xl overflow-hidden ${isExpanded ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                      {/* Kategorie-Header */}
                      <div className="p-4 flex items-center justify-between bg-white">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{cat.icon}</span>
                          <div>
                            <span className="font-medium">{cat.name}</span>
                            {catTasks.length > 0 && (
                              <span className="ml-2 text-sm text-blue-600">
                                ({catTasks.length} Aufgaben, {catHours.toFixed(1)}h)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Aufgaben */}
                      <div className="px-4 pb-4 pt-2 space-y-2">
                        {cat.tasks.map((task) => {
                          const isSelected = taskHours[task] !== undefined;
                          const hours = taskHours[task] || 0;
                          
                          return (
                            <div 
                              key={task} 
                              className={`flex items-center p-3 rounded-lg transition-all ${
                                isSelected 
                                  ? 'bg-white border-2 border-blue-400 shadow-sm' 
                                  : 'bg-gray-50 hover:bg-gray-100 cursor-pointer'
                              }`}
                              onClick={() => !isSelected && toggleTask(task, cat.id)}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleTask(task, cat.id)}
                                className="w-5 h-5 text-blue-600 rounded"
                              />
                              <span className={`ml-3 flex-1 text-sm ${isSelected ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                                {task}
                              </span>
                              
                              {isSelected && (
                                <div className="flex items-center space-x-1 ml-2" onClick={(e) => e.stopPropagation()}>
                                  {[0.5, 1, 2, 4].map((h) => (
                                    <button
                                      key={h}
                                      type="button"
                                      onClick={() => setTaskHours(prev => ({ ...prev, [task]: h }))}
                                      className={`px-2 py-1 text-xs rounded-full transition-all ${
                                        hours === h 
                                          ? 'bg-blue-600 text-white font-bold' 
                                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                      }`}
                                    >
                                      {h}h
                                    </button>
                                  ))}
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={hours || ''}
                                    onChange={(e) => setTaskHours(prev => ({ ...prev, [task]: parseFloat(e.target.value) || 0 }))}
                                    className="w-14 px-2 py-1 text-xs border rounded text-center ml-1"
                                    placeholder="andere"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                
                {/* Eigene Aufgabe */}
                <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <input
                    type="text"
                    placeholder="+ Eigene Aufgabe hinzufügen..."
                    value={customTask}
                    onChange={(e) => setCustomTask(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCustomTask()}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm bg-white"
                  />
                  <button
                    type="button"
                    onClick={addCustomTask}
                    disabled={!customTask.trim()}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm"
                  >
                    Hinzufügen
                  </button>
                </div>
                
                {/* Eigene Aufgaben anzeigen */}
                {Object.entries(taskHours)
                  .filter(([task]) => !workCategories.some(c => c.tasks.includes(task)))
                  .map(([task, hours]) => (
                    <div key={task} className="flex items-center p-3 bg-white border-2 border-green-400 rounded-lg shadow-sm">
                      <span className="text-green-600 mr-2">✓</span>
                      <span className="flex-1 font-medium text-sm">{task}</span>
                      <div className="flex items-center space-x-1">
                        {[0.5, 1, 2, 4].map((h) => (
                          <button
                            key={h}
                            type="button"
                            onClick={() => setTaskHours(prev => ({ ...prev, [task]: h }))}
                            className={`px-2 py-1 text-xs rounded-full ${
                              hours === h ? 'bg-green-600 text-white font-bold' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                          >
                            {h}h
                          </button>
                        ))}
                        <button
                          onClick={() => setTaskHours(prev => {
                            const newHours = { ...prev };
                            delete newHours[task];
                            return newHours;
                          })}
                          className="ml-2 p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* KOMPETENZEN */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Award className="w-5 h-5 mr-2 text-purple-500" />
                Welche Kompetenzen hast du geübt?
              </h2>

              {/* Hinzugefügte Kompetenzen */}
              {selectedComps.length > 0 && (
                <div className="mb-6 space-y-3">
                  {selectedComps.map((comp, idx) => (
                    <div key={idx} className="p-4 bg-purple-50 border-2 border-purple-300 rounded-xl">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-semibold text-purple-900">{comp.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              comp.status === 'verbessert' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-orange-100 text-orange-700'
                            }`}>
                              {comp.status === 'verbessert' ? '📈 verbessert' : '🔄 geübt'}
                            </span>
                          </div>
                          <p className="text-sm text-purple-700">{comp.note}</p>
                        </div>
                        
                        <div className="flex items-center space-x-1 ml-4">
                          {[0.5, 1, 2].map((h) => (
                            <button
                              key={h}
                              type="button"
                              onClick={() => setSelectedComps(prev => prev.map((c, i) => i === idx ? { ...c, hours: h } : c))}
                              className={`px-2 py-1 text-xs rounded-full ${
                                comp.hours === h 
                                  ? 'bg-purple-600 text-white font-bold' 
                                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                              }`}
                            >
                              {h}h
                            </button>
                          ))}
                          <button
                            onClick={() => setSelectedComps(prev => prev.filter((_, i) => i !== idx))}
                            className="ml-2 p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Kompetenz hinzufügen */}
              <div className="space-y-2">
                {competencies.map((comp) => {
                  const isAdded = selectedComps.some(c => c.name === comp.name);
                  const isExpanded = expandedComp === comp.id;
                  
                  if (isAdded) return null;
                  
                  return (
                    <div key={comp.id} className="border rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedComp(isExpanded ? null : comp.id)}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 text-left"
                      >
                        <div>
                          <span className="font-medium">{comp.name}</span>
                          <p className="text-xs text-gray-500 mt-0.5">{comp.description}</p>
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                      </button>
                      
                      {isExpanded && (
                        <div className="p-4 bg-white border-t space-y-4">
                          {/* Status-Auswahl */}
                          <div className="flex space-x-3">
                            <button
                              type="button"
                              onClick={() => setCompStatus('geübt')}
                              className={`flex-1 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                                compStatus === 'geübt'
                                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              🔄 Geübt
                            </button>
                            <button
                              type="button"
                              onClick={() => setCompStatus('verbessert')}
                              className={`flex-1 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                                compStatus === 'verbessert'
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              📈 Verbessert
                            </button>
                          </div>
                          
                          {/* Beispiel */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Was hast du gemacht?</label>
                            <textarea
                              value={compNote}
                              onChange={(e) => setCompNote(e.target.value)}
                              rows={2}
                              placeholder="z.B. Kundengespräch geführt, im Team gearbeitet..."
                              className="w-full px-3 py-2 border rounded-lg text-sm"
                            />
                          </div>
                          
                          {/* Stunden + Hinzufügen */}
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-600">Zeit:</span>
                              {[0.5, 1, 2].map((h) => (
                                <button
                                  key={h}
                                  type="button"
                                  onClick={() => setCompHours(h.toString())}
                                  className={`px-3 py-1 text-sm rounded-full ${
                                    compHours === h.toString() 
                                      ? 'bg-purple-600 text-white font-bold' 
                                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                  }`}
                                >
                                  {h}h
                                </button>
                              ))}
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => addCompetency(comp.name)}
                              className="ml-auto px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                            >
                              + Hinzufügen
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notizen & Speichern */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">📝 Notizen (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Allgemeine Bemerkungen zum Tag..."
                className="w-full px-4 py-2 border rounded-lg mb-4"
              />
              
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (hasUnsavedChanges() && !window.confirm('⚠️ Wirklich zurücksetzen?')) return;
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Zurücksetzen
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || (Object.keys(taskHours).length === 0 && selectedComps.length === 0)}
                  className="px-8 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium"
                >
                  {loading ? 'Speichern...' : existingEntryId ? '💾 Aktualisieren' : '💾 Speichern'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EINTRÄGE */}
        {activeTab === 'my-entries' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">📅 Meine Einträge</h2>
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
                  <div key={entry.id} className="border rounded-xl p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 mb-3">
                          {entry.date?.toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                        
                        {/* Aufgaben */}
                        {entry.tasks?.length > 0 && (
                          <div className="mb-3">
                            {entry.tasks.map((task, idx) => {
                              const hours = entry.taskHours?.[task] || 0;
                              return (
                                <div key={idx} className="flex items-center justify-between text-sm py-1">
                                  <span className="text-gray-700">{task}</span>
                                  {hours > 0 && <span className="text-blue-600 font-medium">{hours.toFixed(1)}h</span>}
                                </div>
                              );
                            })}
                            <div className="text-right text-sm font-bold text-blue-700 pt-1 mt-1 border-t">
                              Arbeit: {(entry.hoursCategory || entry.hoursWorked || 0).toFixed(1)}h
                            </div>
                          </div>
                        )}
                        
                        {/* Kompetenzen */}
                        {(entry.compDetails?.length > 0 || entry.comps?.length > 0) && (
                          <div className="bg-purple-50 rounded-lg p-3">
                            {(entry.compDetails || []).map((comp, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm py-1">
                                <div>
                                  <span className="font-medium text-purple-900">{comp.name}</span>
                                  <span className="text-purple-600 text-xs ml-2">({comp.status})</span>
                                </div>
                                {comp.hours > 0 && <span className="text-purple-600 font-medium">{comp.hours.toFixed(1)}h</span>}
                              </div>
                            ))}
                            {entry.hoursComps > 0 && (
                              <div className="text-right text-sm font-bold text-purple-700 pt-1 mt-1 border-t border-purple-200">
                                Kompetenzen: {entry.hoursComps.toFixed(1)}h
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Trainer-Notiz */}
                        {entry.trainerNote && (
                          <div className="mt-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg p-3">
                            <p className="text-xs font-medium text-yellow-800 mb-1">💬 Notiz vom Berufsbildner:</p>
                            <p className="text-sm text-yellow-900">{entry.trainerNote}</p>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={async () => {
                          if (!confirm('Löschen?')) return;
                          await deleteDoc(doc(db, 'entries', entry.id));
                          setEntries(prev => prev.filter(e => e.id !== entry.id));
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg ml-4"
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
          <div className="space-y-6">
            {/* Ausbildungsjahr-Info */}
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-4">
              <p className="text-sm text-orange-800">
                📅 <strong>Ausbildungsjahr {getAusbildungsjahr().label}</strong> (August – Juli)
              </p>
              <p className="text-xs text-orange-600 mt-1">
                Jede Aufgabe muss mindestens 2× pro Jahr erledigt werden für 100%.
              </p>
            </div>

            {/* Übersicht */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-sm text-gray-500">Einträge (Jahr)</p>
                <p className="text-3xl font-bold text-gray-900">{getEntriesInAusbildungsjahr().length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-sm text-gray-500">Arbeitsstunden</p>
                <p className="text-3xl font-bold text-blue-600">
                  {getEntriesInAusbildungsjahr().reduce((sum, e) => sum + (e.hoursCategory || e.hoursWorked || 0), 0).toFixed(1)}h
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-sm text-gray-500">Kompetenz-Stunden</p>
                <p className="text-3xl font-bold text-purple-600">
                  {getEntriesInAusbildungsjahr().reduce((sum, e) => sum + (e.hoursComps || 0), 0).toFixed(1)}h
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-3xl font-bold text-green-600">
                  {getEntriesInAusbildungsjahr().reduce((sum, e) => sum + (e.hoursCategory || e.hoursWorked || 0) + (e.hoursComps || 0), 0).toFixed(1)}h
                </p>
              </div>
            </div>

            {/* Kategorien mit Akkordeon */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold mb-4">📁 Arbeitskategorien <span className="text-sm font-normal text-gray-500">({getAusbildungsjahr().label})</span></h3>
              <div className="space-y-3">
                {workCategories.map((cat) => {
                  const yearEntries = getEntriesInAusbildungsjahr();
                  const catEntries = yearEntries.filter(e => e.category === cat.id);
                  const totalHours = catEntries.reduce((sum, e) => sum + (e.hoursCategory || e.hoursWorked || 0), 0);
                  const maxHours = Math.max(...workCategories.map(c => 
                    yearEntries.filter(e => e.category === c.id).reduce((sum, e) => sum + (e.hoursCategory || e.hoursWorked || 0), 0)
                  ), 1);
                  const isExpanded = expandedStatCat === cat.id;
                  
                  // Aufgaben-Statistik sammeln
                  const taskStats = {};
                  catEntries.forEach(entry => {
                    entry.tasks?.forEach(task => {
                      if (!taskStats[task]) {
                        taskStats[task] = { count: 0, totalHours: 0, dates: [] };
                      }
                      taskStats[task].count++;
                      taskStats[task].totalHours += entry.taskHours?.[task] || 0;
                      if (entry.date) {
                        taskStats[task].dates.push(entry.date);
                      }
                    });
                  });
                  
                  // Fortschritt berechnen: Nur offizielle Aufgaben zählen (1× = 0.5, 2× = 1.0)
                  let progressPoints = 0;
                  cat.tasks.forEach(task => {
                    const stats = taskStats[task];
                    if (stats) {
                      if (stats.count >= 2) progressPoints += 1;
                      else if (stats.count === 1) progressPoints += 0.5;
                    }
                  });
                  const completion = cat.tasks.length > 0 ? (progressPoints / cat.tasks.length * 100) : 0;
                  
                  return (
                    <div key={cat.id} className="border rounded-xl overflow-hidden">
                      {/* Header - klickbar */}
                      <button
                        onClick={() => setExpandedStatCat(isExpanded ? null : cat.id)}
                        className="w-full flex items-center space-x-3 p-4 hover:bg-gray-50 text-left"
                      >
                        <span className="text-xl w-8">{cat.icon}</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{cat.name}</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-500">{catEntries.length} Einträge</span>
                              <span className="font-bold text-blue-600">{totalHours.toFixed(1)}h</span>
                            </div>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${(totalHours / maxHours) * 100}%` }}
                            />
                          </div>
                        </div>
                        
                        {/* Fortschritts-Ring */}
                        <div className="relative w-12 h-12 ml-2">
                          <svg className="w-12 h-12 transform -rotate-90">
                            <circle cx="24" cy="24" r="20" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                            <circle 
                              cx="24" cy="24" r="20" fill="none" 
                              stroke={completion >= 80 ? '#22c55e' : completion >= 50 ? '#f59e0b' : '#ef4444'}
                              strokeWidth="3"
                              strokeDasharray={`${completion * 1.26} 126`}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-bold">{Math.round(completion)}%</span>
                          </div>
                        </div>
                        
                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {/* Aufgaben-Details */}
                      {isExpanded && (
                        <div className="border-t bg-gray-50 p-4">
                          {Object.keys(taskStats).length === 0 && cat.tasks.length > 0 ? (
                            <p className="text-gray-500 text-sm text-center py-2">Noch keine Aufgaben erfasst</p>
                          ) : (
                            <div className="space-y-3">
                              {/* Erledigte Aufgaben (≥2×) */}
                              {Object.entries(taskStats)
                                .filter(([_, s]) => s.count >= 2)
                                .sort((a, b) => b[1].count - a[1].count)
                                .map(([task, stats]) => (
                                  <div key={task} className="bg-white rounded-lg p-3 border border-green-200">
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-green-600">✅</span>
                                        <span className="font-medium text-gray-900 text-sm">{task}</span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                          {stats.count}×
                                        </span>
                                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                          {stats.totalHours.toFixed(1)}h
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {stats.dates
                                        .sort((a, b) => b - a)
                                        .slice(0, 10)
                                        .map((date, idx) => (
                                          <span 
                                            key={idx} 
                                            className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                                          >
                                            {date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })}
                                          </span>
                                        ))}
                                    </div>
                                  </div>
                                ))}
                              
                              {/* Aufgaben mit nur 1× (noch 1× nötig) */}
                              {Object.entries(taskStats)
                                .filter(([_, s]) => s.count === 1)
                                .map(([task, stats]) => (
                                  <div key={task} className="bg-white rounded-lg p-3 border border-orange-200">
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-orange-500">⚠️</span>
                                        <span className="font-medium text-gray-900 text-sm">{task}</span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                          {stats.count}× (1× noch nötig)
                                        </span>
                                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                          {stats.totalHours.toFixed(1)}h
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {stats.dates.map((date, idx) => (
                                        <span 
                                          key={idx} 
                                          className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                                        >
                                          {date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                          
                          {/* Noch nicht 2× gemachte Aufgaben */}
                          {(() => {
                            const pendingTasks = cat.tasks.filter(t => !taskStats[t] || taskStats[t].count < 2);
                            const notStarted = pendingTasks.filter(t => !taskStats[t]);
                            if (notStarted.length === 0) return null;
                            
                            return (
                              <div className="mt-4 pt-4 border-t border-dashed">
                                <p className="text-sm font-medium text-red-600 mb-2">
                                  ❌ Noch nicht gemacht ({notStarted.length}) – 2× noch nötig:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {notStarted.map(task => (
                                    <span 
                                      key={task} 
                                      className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded border border-red-200"
                                    >
                                      {task}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Kompetenzen */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold mb-4">🏆 Kompetenzen <span className="text-sm font-normal text-gray-500">({getAusbildungsjahr().label})</span></h3>
              
              {(() => {
                const yearEntries = getEntriesInAusbildungsjahr();
                
                // Kompetenz-Statistik berechnen
                const compStats = competencies.map(comp => {
                  const compEntries = yearEntries.filter(e => {
                    if (e.compDetails) return e.compDetails.some(c => c.name === comp.name);
                    return (e.comps || []).some(c => c.startsWith(comp.name));
                  });
                  
                  const count = compEntries.length;
                  const improved = yearEntries.filter(e => {
                    if (e.compDetails) return e.compDetails.some(c => c.name === comp.name && c.status === 'verbessert');
                    return (e.comps || []).some(c => c.startsWith(comp.name) && c.includes('verbessert'));
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
                
                // Fortschritt berechnen: 1× = 0.33, 2× = 0.66, ≥3× = 1.0
                let progressPoints = 0;
                compStats.forEach(c => {
                  if (c.count >= 3) progressPoints += 1;
                  else if (c.count === 2) progressPoints += 0.66;
                  else if (c.count === 1) progressPoints += 0.33;
                });
                const completion = competencies.length > 0 ? (progressPoints / competencies.length * 100) : 0;
                
                const completed = compStats.filter(c => c.count >= 3);
                const inProgress = compStats.filter(c => c.count > 0 && c.count < 3);
                const notStarted = compStats.filter(c => c.count === 0);
                
                return (
                  <>
                    {/* Fortschritts-Übersicht */}
                    <div className="flex items-center justify-between mb-4 p-3 bg-purple-50 rounded-lg">
                      <div>
                        <p className="text-sm text-purple-700">
                          <strong>{completed.length}</strong> von {competencies.length} Kompetenzen erfüllt (≥3× geübt)
                        </p>
                        <p className="text-xs text-purple-600 mt-1">
                          Jede Kompetenz muss mindestens 3× pro Jahr geübt werden.
                        </p>
                      </div>
                      <div className="relative w-14 h-14">
                        <svg className="w-14 h-14 transform -rotate-90">
                          <circle cx="28" cy="28" r="24" fill="none" stroke="#e9d5ff" strokeWidth="4" />
                          <circle 
                            cx="28" cy="28" r="24" fill="none" 
                            stroke={completion >= 80 ? '#22c55e' : completion >= 50 ? '#f59e0b' : '#ef4444'}
                            strokeWidth="4"
                            strokeDasharray={`${completion * 1.51} 151`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-bold">{Math.round(completion)}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Erfüllt (≥3×) */}
                      {completed.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-green-700 mb-2">✅ Erfüllt ≥3× ({completed.length})</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {completed.map(c => (
                              <div key={c.id} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium text-sm text-green-900">{c.name}</span>
                                  <div className="flex items-center space-x-2">
                                    <span className="bg-green-200 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium">
                                      {c.count}× geübt
                                    </span>
                                    {c.improved > 0 && (
                                      <span className="bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full text-xs font-medium">
                                        {c.improved}× verbessert
                                      </span>
                                    )}
                                    {c.totalHours > 0 && (
                                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                        {c.totalHours.toFixed(1)}h
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
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {inProgress.map(c => (
                              <div key={c.id} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium text-sm text-orange-900">{c.name}</span>
                                  <div className="flex items-center space-x-2">
                                    <span className="bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full text-xs font-medium">
                                      {c.count}× ({3 - c.count}× noch nötig)
                                    </span>
                                    {c.improved > 0 && (
                                      <span className="bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full text-xs font-medium">
                                        {c.improved}× verbessert
                                      </span>
                                    )}
                                    {c.totalHours > 0 && (
                                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                        {c.totalHours.toFixed(1)}h
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
                            {notStarted.map(c => (
                              <span 
                                key={c.id}
                                className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded border border-red-200"
                              >
                                {c.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ApprenticeDashboard;
