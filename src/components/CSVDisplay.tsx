import React, { useState, useEffect } from 'react';

interface CSVData {
  name: string;
  isEmpty?: boolean;
}

const CSVDisplay: React.FC = () => {
  const [csvData, setCSVData] = useState<CSVData[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  const findNearestEmptySlot = (data: CSVData[]): number => {
    return data.findIndex(row => !row.name.trim());
  };

  const processCSVContent = (text: string) => {
    const rows = text.split('\n');
    const data: CSVData[] = rows
      .filter(row => row.trim() !== '')
      .map(row => ({
        name: row.trim(),
        isEmpty: !row.trim()
      }));
    setCSVData(data);
  };

  const loadDefaultCSV = async () => {
    try {
      const response = await fetch('/firefighters.csv');
      const text = await response.text();
      processCSVContent(text);
    } catch (error) {
      console.error('Error loading default CSV:', error);
    }
  };

  useEffect(() => {
    loadDefaultCSV();
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        processCSVContent(text);
      };
      reader.readAsText(file);
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(csvData[index].name);
  };

  const handleSave = (index: number) => {
    const newData = [...csvData];
    newData[index] = { name: editValue, isEmpty: false };
    setCSVData(newData);
    setEditingIndex(null);
  };

  const handleCancel = () => {
    setEditingIndex(null);
  };

  const handleAddNew = () => {
    const emptySlotIndex = findNearestEmptySlot(csvData);
    if (emptySlotIndex !== -1) {
      handleEdit(emptySlotIndex);
    } else {
      // If no empty slots, add to the end
      const newData = [...csvData, { name: '', isEmpty: true }];
      setCSVData(newData);
      handleEdit(newData.length - 1);
    }
  };

  const handleDownload = () => {
    const csvContent = csvData.map(row => row.name).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'updated_names.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="csv-container">
      <div className="csv-header">
        <button 
          onClick={() => setShowUpload(!showUpload)}
          className="toggle-upload"
        >
          {showUpload ? 'Hide Upload' : 'Upload Different File'}
        </button>
        {showUpload && (
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="file-input"
          />
        )}
      </div>
      <div className="csv-content">
        {csvData.length > 0 ? (
          <>
            <div className="csv-actions">
              <button onClick={handleAddNew}>Add New Entry</button>
              <button onClick={handleDownload}>Download Updated CSV</button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {csvData.map((row, index) => (
                  <tr key={index} className={row.isEmpty ? 'empty-slot' : ''}>
                    <td>
                      {editingIndex === index ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave(index);
                            if (e.key === 'Escape') handleCancel();
                          }}
                          autoFocus
                          placeholder="Enter name"
                        />
                      ) : (
                        <span onClick={() => handleEdit(index)}>
                          {row.name || '(Empty Slot)'}
                        </span>
                      )}
                    </td>
                    <td>
                      {editingIndex === index ? (
                        <>
                          <button onClick={() => handleSave(index)}>Save</button>
                          <button onClick={handleCancel}>Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => handleEdit(index)}>Edit</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p>Loading default CSV file...</p>
        )}
      </div>
    </div>
  );
};

export default CSVDisplay; 