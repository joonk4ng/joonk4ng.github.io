import React, { useState } from 'react';
import { saveEvent } from '../db/indexedDb';

const ClockInOut: React.FC = () => {
  const [name, setName] = useState('');
  const [lastTicket, setLastTicket] = useState<null | { type: string; name: string; timestamp: string }>(null);

  const handleClock = async (type: 'in' | 'out') => {
    if (!name.trim()) return;
    const event = { type, name, timestamp: new Date().toISOString() };
    await saveEvent(event);
    setLastTicket(event);
  };

  return (
    <div className="clockinout-container">
      <input
        type="text"
        placeholder="Enter Name or ID"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <button onClick={() => handleClock('in')}>Clock In</button>
      <button onClick={() => handleClock('out')}>Clock Out</button>
      {lastTicket && (
        <div className="ticket" id="ticket-print">
          <h3>Shift {lastTicket.type === 'in' ? 'Clock In' : 'Clock Out'} Ticket</h3>
          <p>Name/ID: {lastTicket.name}</p>
          <p>Time: {new Date(lastTicket.timestamp).toLocaleString()}</p>
          <button onClick={() => window.print()}>Print Ticket</button>
        </div>
      )}
    </div>
  );
};

export default ClockInOut; 