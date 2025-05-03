import React from 'react';
import CSVDisplay from './components/CSVDisplay';
import './styles.css';

const App: React.FC = () => {
  return (
    <div className="app-container">
      <h1>Firefighter Shift List</h1>
      <CSVDisplay />
    </div>
  );
};

export default App; 