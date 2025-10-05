import EventMap from './EventMap';
import React, { useEffect, useState } from 'react';

// This is where your backend API lives
const API_BASE_URL = "http://localhost:8000";

function EventMap() {
  const [events, setEvents] = useState([]);

  // This code runs once when the component loads
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/combined-events?limit=100`)
      .then((response) => response.json())
      .then((data) => setEvents(data))
      .catch((error) => console.error('Error fetching events:', error));
  }, []);

  if (events.length === 0) {
    return <p>Loading events...</p>
  }

  return (
    <div>
      <h2>Event Map Data</h2>
      <ul>
        {events.map((e) => (
          <li key={e.event_id}>
            {e.popup_info} at lat {e.latitude.toFixed(3)}, lon {e.longitude.toFixed(3)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default EventMap;
