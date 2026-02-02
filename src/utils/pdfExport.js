import jsPDF from 'jspdf';

export const exportStatisticsToPDF = async (data) => {
  const {
    apprenticeName,
    timeFilter,
    customStartDate,
    customEndDate,
    stats,
    tasksByCategory,
    competencyData,
    ausbildungsjahr
  } = data;

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;

  // Helper: Check if we need a new page
  const checkNewPage = (neededSpace = 20) => {
    if (yPos + neededSpace > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Helper: Add text with word wrap
  const addText = (text, size, style = 'normal', color = [0, 0, 0]) => {
    pdf.setFontSize(size);
    pdf.setFont('helvetica', style);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(text, contentWidth);
    lines.forEach(line => {
      checkNewPage();
      pdf.text(line, margin, yPos);
      yPos += size * 0.4;
    });
  };

  // Header
  pdf.setFillColor(249, 115, 22); // Orange
  pdf.rect(0, 0, pageWidth, 40, 'F');
  
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('Carli-Check', margin, 20);
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Automobilfachmann/-frau EFZ', margin, 30);
  
  yPos = 50;

  // Titel
  addText(`Fortschritts-Übersicht: ${apprenticeName}`, 18, 'bold', [249, 115, 22]);
  yPos += 5;

  // Zeitraum
  let timeRangeText = '';
  if (ausbildungsjahr) {
    timeRangeText = `Ausbildungsjahr ${ausbildungsjahr} (August – Juli)`;
  } else if (timeFilter === 'week') timeRangeText = 'Letzte Woche';
  else if (timeFilter === 'month') timeRangeText = 'Letzter Monat';
  else if (timeFilter === 'year') timeRangeText = 'Letztes Jahr';
  else if (timeFilter === 'custom' && customStartDate && customEndDate) {
    timeRangeText = `${new Date(customStartDate).toLocaleDateString('de-CH')} - ${new Date(customEndDate).toLocaleDateString('de-CH')}`;
  } else {
    timeRangeText = 'Gesamter Zeitraum';
  }
  
  addText(`Zeitraum: ${timeRangeText}`, 10, 'normal', [100, 100, 100]);
  addText(`Erstellt am: ${new Date().toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 10, 'normal', [100, 100, 100]);
  yPos += 10;

  // Basis-Statistiken
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;
  
  addText('Übersicht', 14, 'bold');
  yPos += 2;

  const statsBoxWidth = contentWidth / 4 - 3;
  const statsData = [
    { label: 'Einträge', value: stats.totalEntries },
    { label: 'Arbeitsstd.', value: (stats.totalHoursCategory || stats.totalHours || 0).toFixed(1) },
    { label: 'Kompetenz-Std.', value: (stats.totalHoursComps || 0).toFixed(1) },
    { label: 'Total Stunden', value: ((stats.totalHoursCategory || 0) + (stats.totalHoursComps || 0)).toFixed(1) }
  ];

  statsData.forEach((stat, idx) => {
    const xPos = margin + (idx * (statsBoxWidth + 4));
    pdf.setFillColor(255, 247, 237); // Orange-50
    pdf.roundedRect(xPos, yPos, statsBoxWidth, 20, 2, 2, 'F');
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(stat.label, xPos + statsBoxWidth/2, yPos + 8, { align: 'center' });
    
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(stat.value.toString(), xPos + statsBoxWidth/2, yPos + 16, { align: 'center' });
  });
  
  yPos += 30;

  // Aufgaben nach Kategorien
  if (tasksByCategory && tasksByCategory.length > 0) {
    checkNewPage(40);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;
    
    addText('Arbeitskategorien (2× pro Jahr = 100%)', 14, 'bold');
    yPos += 5;

    tasksByCategory.forEach((category) => {
      checkNewPage(30);
      
      // Kategorie Header mit Prozent
      pdf.setFillColor(245, 245, 245);
      pdf.roundedRect(margin, yPos, contentWidth, 12, 2, 2, 'F');
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text(`${category.icon} ${category.name}`, margin + 3, yPos + 8);
      
      // Fortschritt anzeigen
      const completionColor = category.completion >= 80 ? [34, 197, 94] : category.completion >= 50 ? [234, 179, 8] : [239, 68, 68];
      pdf.setTextColor(...completionColor);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${Math.round(category.completion)}%`, pageWidth - margin - 3, yPos + 8, { align: 'right' });
      
      yPos += 14;

      // Tasks in dieser Kategorie
      category.tasks.forEach((task) => {
        checkNewPage(12);
        
        // Status-Farbe
        let bgColor, textColor, statusText;
        if (task.status === 'completed') {
          bgColor = [220, 252, 231]; // green-100
          textColor = [22, 101, 52]; // green-800
          statusText = `✓ ${task.count}×`;
        } else if (task.status === 'inProgress') {
          bgColor = [254, 243, 199]; // orange-100
          textColor = [154, 52, 18]; // orange-800
          statusText = `${task.count}× (1× noch nötig)`;
        } else {
          bgColor = [254, 226, 226]; // red-100
          textColor = [153, 27, 27]; // red-800
          statusText = '❌ 2× noch nötig';
        }
        
        pdf.setFillColor(...bgColor);
        pdf.roundedRect(margin + 3, yPos, contentWidth - 6, task.dates?.length > 0 ? 14 : 8, 1, 1, 'F');
        
        // Task Name
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...textColor);
        const taskText = pdf.splitTextToSize(task.name, 90);
        pdf.text(taskText[0], margin + 6, yPos + 5);
        
        // Status
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.text(statusText, pageWidth - margin - 6, yPos + 5, { align: 'right' });
        
        // Daten anzeigen wenn vorhanden
        if (task.dates && task.dates.length > 0) {
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(100, 100, 100);
          const dateStrings = task.dates.slice(0, 6).map(d => 
            d instanceof Date ? d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' }) : d
          );
          let datesText = dateStrings.join(', ');
          if (task.dates.length > 6) datesText += ` (+${task.dates.length - 6})`;
          pdf.text(`📅 ${datesText}`, margin + 6, yPos + 11);
        }
        
        yPos += task.dates?.length > 0 ? 16 : 10;
      });
      
      yPos += 5;
    });
  }

  // Kompetenz-Entwicklung
  if (competencyData && competencyData.length > 0) {
    checkNewPage(40);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;
    
    addText('Kompetenzen (3× pro Jahr = 100%)', 14, 'bold');
    yPos += 5;

    competencyData.forEach((comp) => {
      checkNewPage(20);
      
      // Status bestimmen
      let bgColor, statusIcon;
      if (comp.count >= 3) {
        bgColor = [220, 252, 231]; // green
        statusIcon = '✓';
      } else if (comp.count > 0) {
        bgColor = [254, 243, 199]; // orange
        statusIcon = '⚠️';
      } else {
        bgColor = [254, 226, 226]; // red
        statusIcon = '❌';
      }
      
      pdf.setFillColor(...bgColor);
      pdf.roundedRect(margin, yPos, contentWidth, 15, 2, 2, 'F');
      
      // Kompetenz Name
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text(`${statusIcon} ${comp.name}`, margin + 3, yPos + 6);
      
      // Badges
      let badgeX = pageWidth - margin - 3;
      
      // Stunden Badge
      if (comp.totalHours > 0) {
        pdf.setFillColor(219, 234, 254); // blue-100
        pdf.roundedRect(badgeX - 22, yPos + 2, 20, 10, 2, 2, 'F');
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(30, 64, 175); // blue-800
        pdf.text(`${comp.totalHours.toFixed(1)}h`, badgeX - 12, yPos + 8, { align: 'center' });
        badgeX -= 25;
      }
      
      // Verbessert Badge
      if (comp.improved > 0) {
        pdf.setFillColor(233, 213, 255); // purple-200
        pdf.roundedRect(badgeX - 30, yPos + 2, 28, 10, 2, 2, 'F');
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(107, 33, 168); // purple-800
        pdf.text(`${comp.improved}× verbessert`, badgeX - 16, yPos + 8, { align: 'center' });
        badgeX -= 35;
      }
      
      // Geübt Badge
      const countColor = comp.count >= 3 ? [22, 101, 52] : comp.count > 0 ? [154, 52, 18] : [153, 27, 27];
      const countBg = comp.count >= 3 ? [187, 247, 208] : comp.count > 0 ? [254, 215, 170] : [254, 202, 202];
      pdf.setFillColor(...countBg);
      pdf.roundedRect(badgeX - 26, yPos + 2, 24, 10, 2, 2, 'F');
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...countColor);
      pdf.text(`${comp.count}× geübt`, badgeX - 14, yPos + 8, { align: 'center' });
      
      yPos += 18;
    });
  }

  // Footer auf letzter Seite
  const finalPage = pdf.internal.pages.length - 1;
  pdf.setPage(finalPage);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(150, 150, 150);
  pdf.text('Generiert mit Carli-Check © 2026', pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Download
  const fileName = `${apprenticeName.replace(/\s+/g, '-')}_Fortschritt_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
};
