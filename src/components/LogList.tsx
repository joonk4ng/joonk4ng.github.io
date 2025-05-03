import React, { useEffect, useState } from 'react';
import { getAllEvents } from '../db/indexedDb';

interface Event {
  type: string;
  name: string;
  timestamp: string;
}

const LogList: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    getAllEvents().then(setEvents);
  }, []);

  return (
    <div className="loglist-container">
      <h2>Local Shift Log</h2>
      <ul>
        {events.map((event, idx) => (
          <li key={idx}>
            <strong>{event.type === 'in' ? 'Clock In' : 'Clock Out'}</strong> - {event.name} - {new Date(event.timestamp).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LogList; 