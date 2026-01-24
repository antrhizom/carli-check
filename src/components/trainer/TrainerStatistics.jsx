import React, { useState } from 'react';
import { workCategories, competencies, ratingScale } from '../../data/curriculum';
import { BookOpen, Calendar, Award, TrendingUp } from 'lucide-react';

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
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      case 'custom':
        if (!customStartDate || !customEndDate) return entries;
        return entries.filter(e => {
          const entryDate = e.date || e.createdAt;
          return entryDate >= new Date(customStartDate) && entryDate <= new Date(customEndDate);
        });
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1));
    }
    
    return entries.filter(e => {
      const entryDate = e.date || e.createdAt;
      return entryDate >= startDate;
    });
  };

  // Aufgaben-Statistik
  const getTaskStatistics = () => {
    const filtered = getFilteredEntries();
    const taskCounts = {};
    
    filtered.forEach(entry => {
      entry.tasks?.forEach(task => {
        taskCounts[task] = (taskCounts[task] || 0) + 1;
      });
    });
    
    return Object.entries(taskCounts)
      .map(([task, count]) => ({ task, count }))
      .sort((a, b) => b.count - a.count);
  };

  // Farbe basierend auf Häufigkeit
  const getFrequencyColor = (count) => {
    if (count >= 5) return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' };
    if (count >= 3) return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' };
    return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' };
  };

  // Basis-Statistiken
  const stats = {
    totalEntries: getFilteredEntries().length,
    totalHours: getFilteredEntries().reduce((sum, e) => sum + (e.hoursWorked || 0), 0),
    categoriesWorked: new Set(getFilteredEntries().map(e => e.category)).size
  };

  return (
    <div className="space-y-6">
      {/* Basis-Statistiken */}
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Zeitraum</h3>
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

      {/* Aufgaben nach KATEGORIEN gruppiert */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Aufgaben nach Kategorien
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
          <div className="space-y-3">
            {workCategories.map((category) => {
              // Finde alle Aufgaben dieser Kategorie
              const categoryTasks = getTaskStatistics().filter(({ task }) => {
                const hasTask = getFilteredEntries().some(e => 
                  e.category === category.id && e.tasks?.includes(task)
                );
                return hasTask;
              });
              
              if (categoryTasks.length === 0) return null;
              
              const totalCount = categoryTasks.reduce((sum, t) => sum + t.count, 0);
              const colors = getFrequencyColor(totalCount);
              
              return (
                <details key={category.id} className="group border-2 rounded-lg overflow-hidden" style={{ borderColor: colors.border.replace('border-', '') }}>
                  <summary className={`px-4 py-3 cursor-pointer flex items-center justify-between hover:bg-gray-50 transition ${colors.bg}`}>
                    <div className="flex items-center space-x-3 flex-1">
                      <span className="text-3xl">{category.icon}</span>
                      <div>
                        <span className={`font-semibold ${colors.text}`}>{category.name}</span>
                        <p className="text-xs text-gray-600">{categoryTasks.length} verschiedene Aufgaben</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${colors.bg} ${colors.text}`}>
                        {totalCount}× gesamt
                      </span>
                      <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                    </div>
                  </summary>
                  
                  <div className="px-4 pb-4 pt-2 bg-white">
                    {/* Liste aller Aufgaben in dieser Kategorie */}
                    <div className="space-y-3">
                      {categoryTasks.map(({ task, count }, idx) => {
                        const taskColors = getFrequencyColor(count);
                        const maxCount = Math.max(...categoryTasks.map(t => t.count));
                        const widthPercent = (count / maxCount) * 100;
                        
                        const taskEntries = getFilteredEntries().filter(e => 
                          e.category === category.id && e.tasks?.includes(task)
                        );
                        
                        return (
                          <div key={idx} className={`p-3 rounded-lg border ${taskColors.border} ${taskColors.bg}`}>
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
                                  <div key={i} className="flex items-center justify-between text-xs text-gray-700 bg-white p-2 rounded">
                                    <span>{entry.date?.toLocaleDateString('de-CH')}</span>
                                    {entry.hoursWorked > 0 && <span>{entry.hoursWorked}h</span>}
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
            }).filter(Boolean)}
          </div>
        )}
      </div>

      {/* ACCORDION: Alle Aufgaben Übersicht */}
      <details className="bg-white rounded-lg shadow-sm overflow-hidden group">
        <summary className="px-6 py-4 cursor-pointer flex items-center justify-between hover:bg-gray-50 transition">
          <h3 className="text-lg font-semibold text-gray-900">
            🎓 Kompetenz-Entwicklung von {apprenticeName}
          </h3>
          <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        
        <div className="px-6 pb-6 pt-2">
          <p className="text-sm text-gray-600 mb-4">
            Selbsteinschätzungen im gewählten Zeitraum
          </p>
          
          <div className="space-y-4">
            {competencies.map((comp) => {
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
  );
};

export default TrainerStatistics;
