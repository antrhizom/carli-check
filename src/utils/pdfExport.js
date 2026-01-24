import jsPDF from 'jspdf';

export const exportStatisticsToPDF = async (data) => {
  const {
    apprenticeName,
    timeFilter,
    customStartDate,
    customEndDate,
    stats,
    tasksByCategory,
    competencyData
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
  pdf.setFillColor(37, 99, 235); // Blue
  pdf.rect(0, 0, pageWidth, 40, 'F');
  
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('carli-check', margin, 20);
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Automobilfachmann/-frau EFZ', margin, 30);
  
  yPos = 50;

  // Titel
  addText(`Statistik-Auswertung: ${apprenticeName}`, 18, 'bold', [37, 99, 235]);
  yPos += 5;

  // Zeitraum
  let timeRangeText = '';
  if (timeFilter === 'week') timeRangeText = 'Letzte Woche';
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
  
  addText('Basis-Statistiken', 14, 'bold');
  yPos += 2;

  const statsBoxWidth = contentWidth / 4 - 3;
  const statsData = [
    { label: 'Einträge', value: stats.totalEntries },
    { label: 'Stunden', value: stats.totalHours.toFixed(1) },
    { label: 'Aufgaben', value: stats.totalTasks },
    { label: 'Kategorien', value: stats.categoriesWorked }
  ];

  statsData.forEach((stat, idx) => {
    const xPos = margin + (idx * (statsBoxWidth + 4));
    pdf.setFillColor(240, 240, 240);
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
    
    addText('Aufgaben nach Kategorien', 14, 'bold');
    yPos += 5;

    tasksByCategory.forEach((category) => {
      checkNewPage(30);
      
      // Kategorie Header
      pdf.setFillColor(245, 245, 245);
      pdf.roundedRect(margin, yPos, contentWidth, 10, 2, 2, 'F');
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text(`${category.icon} ${category.name}`, margin + 3, yPos + 7);
      
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${category.totalCount}× gesamt`, pageWidth - margin - 3, yPos + 7, { align: 'right' });
      
      yPos += 12;

      // Tasks in dieser Kategorie
      category.tasks.forEach((task, idx) => {
        checkNewPage(8);
        
        const barWidth = (task.count / category.totalCount) * (contentWidth - 80);
        
        // Task Name
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(60, 60, 60);
        const taskText = pdf.splitTextToSize(task.name, 70);
        pdf.text(taskText[0], margin + 5, yPos + 4);
        
        // Bar
        const barX = margin + 75;
        pdf.setFillColor(220, 220, 220);
        pdf.roundedRect(barX, yPos, contentWidth - 80, 5, 1, 1, 'F');
        
        // Farbe basierend auf Häufigkeit
        let barColor;
        if (task.count >= 5) barColor = [34, 197, 94]; // green
        else if (task.count >= 3) barColor = [234, 179, 8]; // yellow
        else barColor = [239, 68, 68]; // red
        
        pdf.setFillColor(...barColor);
        pdf.roundedRect(barX, yPos, Math.max(barWidth, 2), 5, 1, 1, 'F');
        
        // Count
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...barColor);
        pdf.text(`${task.count}×`, pageWidth - margin - 3, yPos + 4, { align: 'right' });
        
        yPos += 8;
      });
      
      yPos += 5;
    });
  }

  // Kompetenz-Entwicklung
  if (competencyData && competencyData.length > 0) {
    checkNewPage(40);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;
    
    addText('Kompetenz-Entwicklung', 14, 'bold');
    yPos += 5;

    competencyData.forEach((comp) => {
      if (comp.ratings.length === 0) return;
      
      checkNewPage(25);
      
      // Kompetenz Name
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text(comp.name, margin, yPos + 4);
      
      // Durchschnitt
      const avgColor = comp.average >= 5 ? [34, 197, 94] : comp.average >= 4 ? [234, 179, 8] : comp.average >= 3 ? [249, 115, 22] : [239, 68, 68];
      pdf.setFillColor(...avgColor);
      pdf.circle(pageWidth - margin - 10, yPos + 2, 4, 'F');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text(comp.average.toFixed(1), pageWidth - margin - 10, yPos + 3.5, { align: 'center' });
      
      yPos += 8;
      
      // Beschreibung
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      const descLines = pdf.splitTextToSize(comp.description, contentWidth - 20);
      pdf.text(descLines[0], margin + 2, yPos);
      
      yPos += 5;
      
      // Mini Chart (letzte 10 Bewertungen)
      const chartWidth = contentWidth - 40;
      const chartHeight = 12;
      const chartX = margin + 20;
      const lastRatings = comp.ratings.slice(-10);
      const barWidth = chartWidth / lastRatings.length;
      
      lastRatings.forEach((rating, idx) => {
        const barHeight = (rating / 6) * chartHeight;
        const barColor = rating >= 5 ? [34, 197, 94] : rating >= 4 ? [234, 179, 8] : rating >= 3 ? [249, 115, 22] : [239, 68, 68];
        pdf.setFillColor(...barColor);
        pdf.rect(chartX + (idx * barWidth), yPos + chartHeight - barHeight, barWidth - 1, barHeight, 'F');
      });
      
      yPos += chartHeight + 8;
    });
  }

  // Footer auf letzter Seite
  const finalPage = pdf.internal.pages.length - 1;
  pdf.setPage(finalPage);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(150, 150, 150);
  pdf.text('Generiert mit carli-check © 2026', pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Download
  const fileName = `${apprenticeName.replace(/\s+/g, '-')}_Statistik_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
};
