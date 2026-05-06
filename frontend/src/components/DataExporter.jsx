import React from 'react';

const DataExporter = () => {
  const exportData = () => {
    const data = {
      tasks: JSON.parse(localStorage.getItem('opto_tasks') || '[]'),
      config: JSON.parse(localStorage.getItem('opto_config') || '{}'),
      profiles: JSON.parse(localStorage.getItem('opto_profiles') || '[]')
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'data_export.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button 
      onClick={exportData} 
      style={{ 
        padding: '10px 20px', 
        background: '#0d9488', 
        color: '#fff', 
        border: 'none', 
        borderRadius: '5px', 
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 'bold'
      }}
    >
      Export LocalStorage to JSON
    </button>
  );
};

export default DataExporter;
