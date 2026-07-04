import React, { useRef, useState } from 'react';
import { X, Printer, Download, Activity, DollarSign, Box } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { getVariableValue, formatCurrency } from '../utils/formulaEngine';
import { calculateTaktTime, calculateROI } from '../utils/optimizer';

const ReportGenerator = ({ isOpen, onClose, tasks, config, optimization }) => {
  const reportRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Extract variables
  const demand = getVariableValue(config?.variables || [], 'demand', 0);
  const shiftTime = getVariableValue(config?.variables || [], 'shift_time', 0);
  const totalTaskTime = tasks.reduce((sum, t) => sum + t.time, 0);

  const handleDownload = async () => {
    if (!reportRef.current) return;
    setIsGenerating(true);
    
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`OptoProfit_Report_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '2rem',
          backdropFilter: 'blur(8px)'
        }}
      >
        <div style={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ color: 'white', margin: 0 }}>Report Preview</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={handleDownload} disabled={isGenerating} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1rem', cursor: 'pointer' }}>
              {isGenerating ? 'GENERATING...' : <><Download size={16} /> DOWNLOAD PDF</>}
            </button>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
              <X size={24} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', width: '100%', maxWidth: '800px', background: 'var(--bg-main)', borderRadius: 'var(--radius-lg)' }}>
          {/* A4 Paper styled container */}
          <div ref={reportRef} style={{ padding: '40px', background: 'white', color: 'black', minHeight: '1123px' }}>
            
            {/* Header */}
            <div style={{ borderBottom: '2px solid #333', paddingBottom: '20px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#111' }}>OPTO-PROFIT</h1>
                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>Manufacturing Line Optimization Report</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Date: {new Date().toLocaleDateString()}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>Status: Optimized</div>
              </div>
            </div>

            {/* Config Summary */}
            <h3 style={{ fontSize: '14px', borderBottom: '1px solid #ddd', paddingBottom: '5px', color: '#333' }}>1. PRODUCTION PARAMETERS</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '30px' }}>
              <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '4px' }}>
                <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>Daily Demand</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{demand} units</div>
              </div>
              <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '4px' }}>
                <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>Shift Time</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{shiftTime} min</div>
              </div>
              <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '4px' }}>
                <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>Total Work Content</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{totalTaskTime.toFixed(1)} min</div>
              </div>
            </div>

            {/* Layout Summary */}
            <h3 style={{ fontSize: '14px', borderBottom: '1px solid #ddd', paddingBottom: '5px', color: '#333' }}>2. LINE BALANCING RESULTS</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '30px' }}>
              <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '4px' }}>
                <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>Efficiency</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{optimization?.efficiency || '0.00'}%</div>
              </div>
              <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '4px' }}>
                <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>Workstations</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{optimization?.stations?.length || 0}</div>
              </div>
              <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '4px' }}>
                <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>Balance Delay</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{optimization?.balanceDelay || '0.00'}%</div>
              </div>
            </div>

            {/* Station Breakdown */}
            <h3 style={{ fontSize: '14px', borderBottom: '1px solid #ddd', paddingBottom: '5px', color: '#333' }}>3. STATION ASSIGNMENTS</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#eee' }}>
                  <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Station</th>
                  <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Tasks</th>
                  <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>Time (min)</th>
                </tr>
              </thead>
              <tbody>
                {optimization?.stations?.map((station, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold' }}>Station {idx + 1}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{station.tasks.map(t => t.id).join(', ')}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>{station.time.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Financial Info Placeholder */}
            <h3 style={{ fontSize: '14px', borderBottom: '1px solid #ddd', paddingBottom: '5px', color: '#333' }}>4. FINANCIAL SUMMARY</h3>
            <p style={{ fontSize: '12px', color: '#555' }}>
              Detailed financial projections including revenue, cost modeling, and ROI are available in the Financial Analytics dashboard.
            </p>

          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReportGenerator;
