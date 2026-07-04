import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { calculateTaktTime, runOptimization } from './optimizer';

async function computeMetrics(state) {
  if (!state || !state.tasks || state.tasks.length === 0 || !state.config) {
    return null;
  }
  try {
    const { tasks, config } = state;
    const takt = await calculateTaktTime(config);
    const targetCycleTime = Number(config?.variables?.find(v => v.key === 'target_cycle_time')?.value || takt);
    const cycleTime = targetCycleTime > 0 ? targetCycleTime : takt;
    const heuristic = config.heuristic || 'LTF';
    const opt = runOptimization(tasks, cycleTime, heuristic, config);
    
    return {
      taktTime: takt,
      cycleTime: opt.actualCycleTime || cycleTime,
      stationCount: opt.nActual || 0,
      efficiency: parseFloat(opt.efficiency || 0),
      balanceDelay: parseFloat(opt.balanceDelay || 0),
      totalProcessTime: opt.totalTaskTime || tasks.reduce((sum, t) => sum + (Number(t.time) || 0), 0)
    };
  } catch (err) {
    console.error("Error computing metrics for state:", err);
    return null;
  }
}

export async function generateExecutiveReport(baselineState, currentState, layoutElementId) {
  // 1. Compute metrics for both states
  const baselineMetrics = await computeMetrics(baselineState);
  const currentMetrics = await computeMetrics(currentState);

  // 2. Initialize jsPDF standard A4 document
  // A4 size: 210mm x 297mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.width || 210;
  const pageHeight = doc.internal.pageSize.height || 297;
  const margin = 15;
  let currentY = 15;

  // 3. Add Header
  // Brand color accents: Dark Slate (#0f172a) and Teal (#0d9488)
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Title text
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('OPTOPROFIT EXECUTIVE REPORT', margin, 20);

  // Subtitle / Date
  doc.setTextColor(13, 148, 136); // #0d9488 (Teal)
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(`Date: ${today}`, margin, 30);

  // Profile info if available
  const profileName = currentState?.config?.productName || 'Default Line Configuration';
  doc.text(`Configuration: ${profileName}`, margin, 35);

  currentY = 48;

  // 4. Section 1: Executive KPI Summary Table
  doc.setTextColor(15, 23, 42);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('1. Key Performance Indicator (KPI) Comparison', margin, currentY);
  currentY += 6;

  // Prepare table data
  const columns = [
    { header: 'KPI Metric', dataKey: 'metric' },
    { header: 'Baseline State', dataKey: 'baseline' },
    { header: 'Current State (Optimized)', dataKey: 'current' },
    { header: 'Variance / Improvement', dataKey: 'variance' }
  ];

  const getVarianceString = (baseVal, currVal, isLowerBetter = false, isPercent = false) => {
    if (baseVal === undefined || baseVal === null || baseVal === 0) return 'N/A';
    const delta = currVal - baseVal;
    if (Math.abs(delta) < 0.001) return '0.00';
    const percent = (delta / baseVal) * 100;
    const sign = delta > 0 ? '+' : '';
    const formattedDelta = delta.toFixed(2);
    const formattedPercent = percent.toFixed(2);
    
    // Industrial assessment
    let isBetter = delta > 0;
    if (isLowerBetter) isBetter = delta < 0;

    return `${sign}${formattedDelta}${isPercent ? '%' : ''} (${sign}${formattedPercent}%) ${isBetter ? '▲' : '▼'}`;
  };

  const tableRows = [
    {
      metric: 'Work Stations (count)',
      baseline: baselineMetrics ? `${baselineMetrics.stationCount}` : 'N/A',
      current: currentMetrics ? `${currentMetrics.stationCount}` : '0',
      variance: baselineMetrics && currentMetrics 
        ? getVarianceString(baselineMetrics.stationCount, currentMetrics.stationCount, true) 
        : 'N/A'
    },
    {
      metric: 'Takt Time (min)',
      baseline: baselineMetrics ? `${baselineMetrics.taktTime.toFixed(2)}` : 'N/A',
      current: currentMetrics ? `${currentMetrics.taktTime.toFixed(2)}` : '0.00',
      variance: baselineMetrics && currentMetrics
        ? getVarianceString(baselineMetrics.taktTime, currentMetrics.taktTime)
        : 'N/A'
    },
    {
      metric: 'Cycle Time / Bottleneck (min)',
      baseline: baselineMetrics ? `${baselineMetrics.cycleTime.toFixed(2)}` : 'N/A',
      current: currentMetrics ? `${currentMetrics.cycleTime.toFixed(2)}` : '0.00',
      variance: baselineMetrics && currentMetrics
        ? getVarianceString(baselineMetrics.cycleTime, currentMetrics.cycleTime, true)
        : 'N/A'
    },
    {
      metric: 'Line Efficiency (%)',
      baseline: baselineMetrics ? `${baselineMetrics.efficiency.toFixed(2)}%` : 'N/A',
      current: currentMetrics ? `${currentMetrics.efficiency.toFixed(2)}%` : '0.00%',
      variance: baselineMetrics && currentMetrics
        ? getVarianceString(baselineMetrics.efficiency, currentMetrics.efficiency, false, true)
        : 'N/A'
    },
    {
      metric: 'Balance Delay (%)',
      baseline: baselineMetrics ? `${baselineMetrics.balanceDelay.toFixed(2)}%` : 'N/A',
      current: currentMetrics ? `${currentMetrics.balanceDelay.toFixed(2)}%` : '0.00%',
      variance: baselineMetrics && currentMetrics
        ? getVarianceString(baselineMetrics.balanceDelay, currentMetrics.balanceDelay, true, true)
        : 'N/A'
    },
    {
      metric: 'Total Process Time (min)',
      baseline: baselineMetrics ? `${baselineMetrics.totalProcessTime.toFixed(2)}` : 'N/A',
      current: currentMetrics ? `${currentMetrics.totalProcessTime.toFixed(2)}` : '0.00',
      variance: baselineMetrics && currentMetrics
        ? getVarianceString(baselineMetrics.totalProcessTime, currentMetrics.totalProcessTime, true)
        : 'N/A'
    }
  ];

  // Generate Table using jspdf-autotable
  autoTable(doc, {
    columns: columns,
    body: tableRows,
    startY: currentY,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42], // #0f172a
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // #f8fafc
    },
    styles: {
      font: 'Helvetica',
      fontSize: 9,
      cellPadding: 4
    },
    columnStyles: {
      metric: { fontStyle: 'bold', width: 60 },
      baseline: { halign: 'center', width: 35 },
      current: { halign: 'center', width: 45 },
      variance: { halign: 'left', fontStyle: 'italic', width: 50 }
    },
    didDrawPage: (data) => {
      currentY = data.cursor.y;
    }
  });

  currentY += 12;

  // 5. Section 2: Visualization Capture
  const visualElement = document.getElementById(layoutElementId);
  if (visualElement) {
    try {
      // Check if we need to wrap to next page for visualization
      if (currentY > pageHeight - 110) {
        doc.addPage();
        currentY = 20;
      }

      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('2. Visual Line Configuration & Layout Diagram', margin, currentY);
      currentY += 8;

      // Capture element using html2canvas
      const canvas = await html2canvas(visualElement, {
        useCORS: true,
        logging: false,
        backgroundColor: '#1e293b', // Match industrial slate color
        scale: 2 // High resolution scale
      });

      const imgData = canvas.toDataURL('image/png');
      const maxImgWidth = pageWidth - 2 * margin; // 180mm
      const maxImgHeight = pageHeight - currentY - margin; // avoid page break if possible
      
      let imgWidth = maxImgWidth;
      let imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Scale down if it exceeds remaining vertical page height
      if (imgHeight > maxImgHeight) {
        imgHeight = maxImgHeight;
        imgWidth = (canvas.width * imgHeight) / canvas.height;
      }

      // Center horizontally
      const xOffset = margin + (maxImgWidth - imgWidth) / 2;

      // Add image to PDF
      doc.addImage(imgData, 'PNG', xOffset, currentY, imgWidth, imgHeight);
      currentY += imgHeight + 10;
    } catch (e) {
      console.error('Error capturing layout canvas:', e);
      // Fallback: draw an error box in the PDF rather than failing the whole export
      doc.setFillColor(239, 68, 68, 0.1);
      doc.setDrawColor(239, 68, 68);
      doc.rect(margin, currentY, pageWidth - 2 * margin, 30, 'FD');
      doc.setTextColor(239, 68, 68);
      doc.setFontSize(10);
      doc.text('Failed to render visual layout graph. The table data above is fully accurate.', margin + 5, currentY + 15);
      currentY += 40;
    }
  } else {
    // If no layout ID matches or is provided
    doc.setTextColor(245, 158, 11);
    doc.setFontSize(10);
    doc.text('No active visualization canvas found to capture.', margin, currentY);
    currentY += 10;
  }

  // Footer on all pages
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240); // slate-200 line
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('TEIRAC Optoprofit Industrial Balancing System - confidential engineering report', margin, pageHeight - 7);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 15, pageHeight - 7);
  }

  // Save the PDF
  const safeConfigName = profileName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  doc.save(`Optoprofit_Executive_Report_${safeConfigName}_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function exportStationDataToCSV(stationsArray, tasks) {
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    console.error("No tasks data to export");
    return;
  }
  
  // Create a map of task ID to Station Name
  const taskToStationMap = {};
  if (stationsArray && Array.isArray(stationsArray)) {
    stationsArray.forEach((station, index) => {
      const stationId = `Station ${index + 1}`;
      if (station.tasks && Array.isArray(station.tasks)) {
        station.tasks.forEach(t => {
          taskToStationMap[t.id] = stationId;
        });
      }
    });
  }
  
  const headers = ['id', 'name', 'time', 'predecessors', 'zoning', 'assigned_station'];
  const rows = tasks.map(task => {
    return [
      task.id || '',
      task.name || '',
      task.time || 0,
      Array.isArray(task.predecessors) ? task.predecessors.join(', ') : (task.predecessors || ''),
      task.zoning || 'None',
      taskToStationMap[task.id] || 'Unassigned'
    ];
  });
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'Optoprofit_Tasks_Export.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

