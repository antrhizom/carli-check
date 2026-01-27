import React, { useState } from 'react';
import { workCategories, competencies } from '../../data/curriculum';
import { BookOpen, Calendar, Award, TrendingUp, FileDown } from 'lucide-react';
import { exportStatisticsToPDF } from '../../utils/pdfExport';

const TrainerStatistics = ({ entries, apprenticeName }) => {
  const [timeFilter, setTimeFilter] = useState('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Zeitfilter-Logik
  const getFilteredEntries = () => {
    const now = new Date();
    let startDate;
    
    switch(timeFilter) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        if (!customStartDate || !customEndDate) return entries;
        return entries.filter(e => {
          const entryDate = e.date || e.createdAt;
          return entryDate >= new Date(customStartDate) && entryDate <= new Date(customEndDate);
        });
      case 'all':
        return entries;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    return entries.filter(e => {
      const entryDate = e.date || e.createdAt;
      return entryDate >= startDate;
    });
  };

  const filtered = getFilteredEntries();

  // Basis-Statistiken mit neuen Feldern
  const stats = {
    totalEntries: filtered.length,
    totalHoursCategory: filtered.reduce((sum, e) => sum + (e.hoursCategory || e.hoursWorked || 0), 0),
    totalHoursComps: filtered.reduce((sum, e) => sum + (e.hoursComps || 0), 0),
    entriesWithComps: filtered.filter(e => (e.comps?.length > 0) || (e.competencies?.length > 0)).length,
    categoriesWorked: new Set(filtered.filter(e => e.category).map(e => e.category)).size
  };

  // PDF Export Funktion
  const handleExportPDF = () => {
    const tasksByCategory = workCategories.map((category) => {
      const catEntries = filtered.filter(e => e.category === category.id);
      if (catEntries.length === 0) return null;
      
      const taskCounts = {};
      catEntries.forEach(entry => {
        entry.tasks?.forEach(task => {
          taskCounts[task] = (taskCounts[task] || 0) + 1;
        });
      });
      
      const totalHours = catEntries.reduce((sum, e) => sum + (e.hoursCategory || e.hoursWorked || 0), 0);
      
      return {
        id: category.id,
        name: category.name,
        icon: category.icon,
        totalCount: catEntries.length,
        totalHours,
        tasks: Object.entries(taskCounts).map(([name, count]) => ({ name, count }))
      };
    }).filter(Boolean);
    
    const competencyData = competencies.map((comp) => {
      const count = filtered.filter(e => {
        const allComps = e.comps || e.competencies || [];
        return allComps.some(c => c.startsWith(comp.name));
      }).length;
      
      const improved = filtered.filter(e => {
        const allComps = e.comps || e.competencies || [];
        return allComps.some(c => c.startsWith(comp.name) && c.includes('verbessert'));
      }).length;
      
      if (count === 0) return null;
      
      return {
        id: comp.id,
        name: comp.name,
        description: comp.description,
        count,
        improved
      };
    }).filter(Boolean);
    
    const statsForPDF = {
      totalEntries: filtered.length,
      totalHoursCategory: stats.totalHoursCategory,
      totalHoursComps: stats.totalHoursComps,
      entriesWithComps: stats.entriesWithComps,
      categoriesWorked: stats.categoriesWorked
    };
    
    exportStatisticsToPDF({
      apprenticeName,
      timeFilter,
      customStartDate,
      customEndDate,
      stats: statsForPDF,
      tasksByCategory,
      competencyData
    });
  };

  return (
    <div className="space-y-6">
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
          {['week', 'month', 'year', 'all', 'custom'].map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                timeFilter === filter
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter === 'week' && '7 Tage'}
              {filter === 'month' && '30 Tage'}
              {filter === 'year' && '1 Jahr'}
              {filter === 'all' && 'Alle'}
              {filter === 'custom' && 'Zeitraum'}
            </button>
          ))}
        </div>
        
        {timeFilter === 'custom' && (
          <div className="flex gap-4 mt-4">
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
      </div>

      {/* Übersicht - wie beim Lernenden */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-orange-50 rounded-lg p-4">
          <p className="text-sm text-orange-600">Einträge</p>
          <p className="text-2xl font-bold text-orange-900">{stats.totalEntries}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-green-600">Mit Kompetenzen</p>
          <p className="text-2xl font-bold text-green-900">{stats.entriesWithComps}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-600">Arbeitsstunden</p>
          <p className="text-2xl font-bold text-blue-900">{stats.totalHoursCategory.toFixed(1)}h</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <p className="text-sm text-purple-600">Kompetenz-Std.</p>
          <p className="text-2xl font-bold text-purple-900">{stats.totalHoursComps.toFixed(1)}h</p>
        </div>
      </div>

      {/* Arbeitskategorien - wie beim Lernenden */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="font-medium mb-4 flex items-center">
          <BookOpen className="w-5 h-5 mr-2 text-blue-500" />
          📁 Arbeitskategorien
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {workCategories.map((cat) => {
            const catEntries = filtered.filter(e => e.category === cat.id);
            const totalHours = catEntries.reduce((sum, e) => sum + (e.hoursCategory || e.hoursWorked || 0), 0);
            const totalTasks = catEntries.reduce((sum, e) => sum + (e.tasks?.length || 0), 0);
            
            return (
              <div 
                key={cat.id} 
                className={`p-4 rounded-lg ${
                  catEntries.length > 0 
                    ? 'bg-gray-50' 
                    : 'bg-gray-100 border-2 border-dashed border-gray-300'
                }`}
              >
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
      </div>

      {/* Kompetenzen - wie beim Lernenden */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="font-medium mb-4 flex items-center">
          <Award className="w-5 h-5 mr-2 text-orange-500" />
          🏆 Kompetenzen
        </h3>
        <div className="space-y-3">
          {competencies.map((comp) => {
            const count = filtered.filter(e => {
              const allComps = e.comps || e.competencies || [];
              return allComps.some(c => c.startsWith(comp.name));
            }).length;
            
            const improved = filtered.filter(e => {
              const allComps = e.comps || e.competencies || [];
              return allComps.some(c => c.startsWith(comp.name) && c.includes('verbessert'));
            }).length;
            
            return (
              <div 
                key={comp.id} 
                className={`p-4 rounded-lg ${
                  count > 0 
                    ? 'bg-gray-50' 
                    : 'bg-orange-50 border-2 border-dashed border-orange-300'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">{comp.name}</span>
                    <p className="text-xs text-gray-500">{comp.description}</p>
                  </div>
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

      {/* Letzte Einträge */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="font-medium mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-gray-500" />
          Letzte Einträge
        </h3>
        {filtered.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Keine Einträge im gewählten Zeitraum.</p>
        ) : (
          <div className="space-y-3">
            {filtered.slice(0, 10).map((entry) => (
              <div key={entry.id} className="border rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm font-medium text-gray-500">
                    {entry.date?.toLocaleDateString('de-CH')}
                  </span>
                </div>
                
                {/* Arbeitskategorie */}
                {entry.category && entry.tasks?.length > 0 && (
                  <div className="mb-2 p-2 bg-blue-50 rounded">
                    <div className="flex items-center space-x-2">
                      <span>{workCategories.find(c => c.id === entry.category)?.icon || '🔧'}</span>
                      <span className="text-sm font-medium text-blue-900">{entry.categoryName}</span>
                      {(entry.hoursCategory || entry.hoursWorked) > 0 && (
                        <span className="text-xs text-blue-600">({(entry.hoursCategory || entry.hoursWorked).toFixed(1)}h)</span>
                      )}
                    </div>
                    <p className="text-xs text-blue-800 mt-1">{entry.tasks?.join(', ')}</p>
                  </div>
                )}
                
                {/* Kompetenzen */}
                {(entry.comps?.length > 0 || entry.competencies?.length > 0) && (
                  <div className="p-2 bg-purple-50 rounded">
                    <div className="flex items-center space-x-2">
                      <Award className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-900">Kompetenzen</span>
                      {entry.hoursComps > 0 && (
                        <span className="text-xs text-purple-600">({entry.hoursComps.toFixed(1)}h)</span>
                      )}
                    </div>
                    <div className="mt-1 space-y-1">
                      {(entry.comps || entry.competencies || []).map((comp, idx) => (
                        <p key={idx} className="text-xs text-purple-800 bg-white px-2 py-1 rounded">{comp}</p>
                      ))}
                    </div>
                  </div>
                )}
                
                {entry.trainerNote && (
                  <div className="mt-2 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                    <p className="text-xs text-yellow-800">
                      <strong>Notiz Berufsbildner:</strong> {entry.trainerNote}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainerStatistics;
