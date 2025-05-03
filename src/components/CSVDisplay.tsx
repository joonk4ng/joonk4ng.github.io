import React, { useState } from 'react';

interface CSVData {
  name: string;
}

const CSVDisplay: React.FC = () => {
  const [csvData, setCSVData] = useState<CSVData[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const rows = text.split('\n');
        const data: CSVData[] = rows
          .filter(row => row.trim() !== '')
          .map(row => ({
            name: row.trim()
          }));
        setCSVData(data);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="csv-container">
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="file-input"
      />
      <div className="csv-content">
        {csvData.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Name</th>
              </tr>
            </thead>
            <tbody>
              {csvData.map((row, index) => (
                <tr key={index}>
                  <td>{row.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Upload a CSV file to display names</p>
        )}
      </div>
    </div>
  );
};

export default CSVDisplay; 