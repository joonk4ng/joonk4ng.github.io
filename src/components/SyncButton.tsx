import React from 'react';

const SyncButton: React.FC = () => {
  const handleSync = () => {
    alert('Sync feature coming soon!');
  };

  return (
    <button className="sync-button" onClick={handleSync}>
      Sync Data
    </button>
  );
};

export default SyncButton; 