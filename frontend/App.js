import MobileControls from './components/MobileControls';
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import './App.css';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, backgroundColor: '#fee', color: '#900' }}>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo?.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

// Fix leaflet default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// NASA Attribution component
const NASAAttribution = () => (
  <div className="nasa-attribution">
    <div className="nasa-badge">
      <span>🛰️ Powered by NASA Open Data</span>
      <div className="nasa-sources">
        <small>MODIS Ocean Color • GIBS Imagery • EONET Events</small>
      </div>
    </div>
  </div>
);

// Custom marker creation
const createCustomIcon = (color, type = 'prediction') => {
  const iconHtml = type === 'prediction'
    ? `<div style="
        background-color: ${color}; 
        width: 22px; 
        height: 22px; 
        border: 3px solid white; 
        border-radius: 50%; 
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      "></div>`
    : `<div style="
        background-color: ${color}; 
        width: 26px; 
        height: 26px; 
        border: 3px solid #1E40AF; 
        border-radius: 4px; 
        box-shadow: 0 2px 6px rgba(0,0,0,0.3); 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        color: white; 
        font-weight: bold; 
        font-size: 14px;
      ">T</div>`;

  return L.divIcon({
    html: iconHtml,
    className: 'custom-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

function App() {
  // State management
  const [events, setEvents] = useState([]);
  const [realTimeEvents, setRealTimeEvents] = useState([]);
  const [systemStats, setSystemStats] = useState({});
  const [nasaInfo, setNasaInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    showPredictions: true,
    showValidations: true,
    minConfidence: 0.0
  });

  const API_URL = 'http://localhost:8000';

  // Mock data for development (before backend is ready)
  const createMockData = () => {
    const mockEvents = [];
    const baseCoords = { lat: -33.8688, lon: 151.2093 };
    for (let i = 0; i < 25; i++) {
      mockEvents.push({
        event_id: `MOCK_NASA_${i}`,
        latitude: baseCoords.lat + (Math.random() - 0.5) * 0.4,
        longitude: baseCoords.lon + (Math.random() - 0.5) * 0.4,
        display_confidence: 0.3 + Math.random() * 0.6,
        timestamp: new Date().toISOString(),
        prey_type: ['small_fish', 'plankton_bloom', 'squid_cephalopods', 'mixed_diet'][Math.floor(Math.random() * 4)],
        data_source: 'nasa_satellite',
        marker_type: 'prediction',
        popup_info: `NASA Prediction - ${['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)]} Quality Habitat`
      });
    }
    for (let i = 0; i < 12; i++) {
      mockEvents.push({
        event_id: `MOCK_TAG_${i}`,
        latitude: baseCoords.lat + (Math.random() - 0.5) * 0.3,
        longitude: baseCoords.lon + (Math.random() - 0.5) * 0.3,
        display_confidence: 0.5 + Math.random() * 0.4,
        timestamp: new Date().toISOString(),
        prey_type: ['small_fish', 'plankton_bloom', 'squid_cephalopods'][Math.floor(Math.random() * 3)],
        data_source: 'mantis_tag',
        marker_type: 'validation',
        popup_info: `MANTIS Tag - ${['Great White', 'Tiger Shark', 'Bull Shark'][Math.floor(Math.random() * 3)]} Feeding Event`
      });
    }
    return mockEvents;
  };

  useEffect(() => {
    loadData();
    loadNasaInfo();
    const interval = setInterval(loadRealTimeData, 25000); // Every 25 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const eventsResponse = await axios.get(`${API_URL}/api/combined-events?limit=400`, { timeout: 8000 });
      const statsResponse = await axios.get(`${API_URL}/api/system-stats`, { timeout: 8000 });

      setEvents(eventsResponse.data);
      setSystemStats(statsResponse.data);
      setError(null);
      setLoading(false);

      console.log('✅ Loaded real data:', eventsResponse.data.length, 'events');
    } catch (err) {
      console.error('❌ Backend connection failed:', err.message);

      const mockEvents = createMockData();
      const mockStats = {
        prediction_accuracy: 0.85,
        total_satellite_predictions: 25,
        total_tag_validations: 12,
        shark_species_tracked: { 'Great White': 4, 'Tiger Shark': 3, 'Bull Shark': 3, 'Hammerhead': 2 }
      };

      setEvents(mockEvents);
      setSystemStats(mockStats);
      setError('Demo Mode - Backend not connected (this is OK for development)');
      setLoading(false);

      console.log('📝 Using mock data for development');
    }
  };

  const loadNasaInfo = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/nasa-data-sources`, { timeout: 5000 });
      setNasaInfo(response.data);
    } catch (err) {
      console.log('NASA info not available, using fallback');
      setNasaInfo({
        nasa_datasets: {
          primary: {
            'MODIS_Aqua_OC': { name: 'MODIS Ocean Color', status: 'integrated' },
            'EONET': { name: 'Environmental Events', status: 'integrated' }
          }
        }
      });
    }
  };

  const loadRealTimeData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/real-time-events`, { timeout: 3000 });
      setRealTimeEvents(response.data.events || []);
    } catch (err) {
      if (Math.random() > 0.6) {
        const mockRealTime = {
          tag_id: `REALTIME_${Date.now()}`,
          shark_species: ['Great White', 'Tiger Shark', 'Bull Shark'][Math.floor(Math.random() * 3)],
          latitude: -33.8688 + (Math.random() - 0.5) * 0.25,
          longitude: 151.2093 + (Math.random() - 0.5) * 0.25,
          actual_prey_type: ['small_fish', 'plankton_bloom'][Math.floor(Math.random() * 2)],
          tag_confidence: 0.6 + Math.random() * 0.3,
          timestamp: new Date().toISOString()
        };

        setRealTimeEvents(prev => [...prev.slice(-4), mockRealTime]);
      }
    }
  };

  const filteredEvents = events.filter(event => {
    if (!filters.showPredictions && event.marker_type === 'prediction') return false;
    if (!filters.showValidations && event.marker_type === 'validation') return false;
    if ((event.display_confidence || 0) < filters.minConfidence) return false;
    return true;
  });

  const getMarkerColor = (confidence) => {
    if (confidence >= 0.8) return '#10B981'; // Green
    if (confidence >= 0.5) return '#F59E0B'; // Orange
    return '#EF4444'; // Red
  };

  const getPreyEmoji = (preyType) => {
    const emojis = {
      'small_fish': '🐟',
      'plankton_bloom': '🦠',
      'squid_cephalopods': '🦑',
      'mixed_diet': '🍽️'
    };
    return emojis[preyType] || '🔍';
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-content">
          <div className="shark-icon">🦈</div>
          <h2>Loading MANTIS System...</h2>
          <p>Connecting to NASA satellite data and tracking networks</p>
          <div className="loading-bar">
            <div className="loading-progress"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="App">
        {/* Header */}
        <header className="header">
          <div className="header-content">
            <div className="header-left">
              <h1>🦈 MANTIS: NASA Marine Tracking System</h1>
              <p>Satellite Predictions + Tag Validations • Powered by NASA Open Data</p>
            </div>
            <div className="header-right">
              <div className="connection-status">
                {error ? '📝 Demo Mode' : '🔗 Live NASA Data'}
              </div>
              <div className="accuracy">
                Accuracy: {((systemStats?.prediction_accuracy || 0) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </header>

        {/* NASA Attribution */}
        <NASAAttribution />

        {/* Error/Demo Banner */}
        {error && (
          <div className="demo-banner">
            <p>📝 {error} - Full functionality available when backend is connected</p>
            <button onClick={loadData} className="retry-btn">Retry Connection</button>
          </div>
        )}

        {/* Stats Bar */}
        <div className="stats-bar">
          <div className="stat-item">
            <div className="stat-label">📡 NASA Predictions</div>
            <div className="stat-value">{systemStats?.total_satellite_predictions || 0}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">🏷️ Tag Validations</div>
            <div className="stat-value">{systemStats?.total_tag_validations || 0}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">🦈 Species</div>
            <div className="stat-value">{systemStats?.shark_species_tracked ? Object.keys(systemStats.shark_species_tracked).length : 0}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">🎯 NASA Accuracy</div>
            <div className="stat-value">{((systemStats?.prediction_accuracy || 0) * 100).toFixed(0)}%</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {/* Sidebar */}
          <div className="sidebar">
            <h3>🛠️ Controls</h3>

            {/* Data Source Filters */}
            <div className="filter-section">
              <h4>Data Sources</h4>
              <label className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={filters.showPredictions}
                  onChange={(e) => setFilters({ ...filters, showPredictions: e.target.checked })}
                />
                📡 NASA Satellite Predictions
              </label>
              <label className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={filters.showValidations}
                  onChange={(e) => setFilters({ ...filters, showValidations: e.target.checked })}
                />
                🏷️ MANTIS Tag Validations
              </label>
            </div>

            {/* Confidence Filter */}
            <div className="filter-section">
              <h4>Confidence Filter</h4>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={filters.minConfidence}
                onChange={(e) => setFilters({ ...filters, minConfidence: parseFloat(e.target.value) })}
                className="confidence-slider"
              />
              <div className="slider-label">
                Min: {(filters.minConfidence * 100).toFixed(0)}%
              </div>
            </div>

            {/* NASA Integration Status */}
            <div className="filter-section">
              <h4>🛰️ NASA Integration</h4>
              <div className="nasa-datasets">
                {Object.entries(nasaInfo.nasa_datasets?.primary || {}).map(([key, dataset]) => (
                  <div key={key} className="dataset-badge">
                    {dataset.name} ✅
                  </div>
                ))}
              </div>
            </div>

            {/* Real-time Events */}
            {realTimeEvents.length > 0 && (
              <div className="filter-section">
                <h4 className="realtime-title">⚡ Real-time Updates</h4>
                <div className="realtime-events">
                  {realTimeEvents.slice(-3).map((event, index) => (
                    <div key={index} className="realtime-event">
                      <strong>{event.tag_id || event.shark_species}</strong><br />
                      <span>{event.actual_prey_type} - {((event.tag_confidence || 0) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="legend">
              <h4>🎨 Legend</h4>

              <div className="legend-section">
                <div className="legend-title">Marker Types:</div>
                <div className="legend-item">
                  <div className="legend-circle prediction"></div>
                  <span>NASA Satellite Prediction</span>
                </div>
                <div className="legend-item">
                  <div className="legend-square validation"></div>
                  <span>MANTIS Tag Validation</span>
                </div>
              </div>

              <div className="legend-section">
                <div className="legend-title">Confidence Levels:</div>
                <div className="legend-item">
                  <div className="legend-circle high"></div>
                  <span>High (&gt;80%)</span>
                </div>
                <div className="legend-item">
                  <div className="legend-circle medium"></div>
                  <span>Medium (50-80%)</span>
                </div>
                <div className="legend-item">
                  <div className="legend-circle low"></div>
                  <span>Low (&lt;50%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Map Container */}
          <div className="map-container">
            <MapContainer
              center={[-33.8688, 151.2093]}
              zoom={11}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Render filtered events */}
              {filteredEvents.map(event => (
                <Marker
                  key={event.event_id}
                  position={[event.latitude, event.longitude]}
                  icon={createCustomIcon(
                    getMarkerColor(event.display_confidence || 0),
                    event.marker_type
                  )}
                >
                  <Popup>
                    <div className="popup-content">
                      <h3>
                        {event.marker_type === 'prediction' ? '🛰️ NASA Satellite Prediction' : '🏷️ MANTIS Tag Validation'}
                      </h3>
                      <p><strong>Confidence:</strong> {((event.display_confidence || 0) * 100).toFixed(0)}%</p>
                      <p><strong>Prey Type:</strong> {getPreyEmoji(event.prey_type)} {event.prey_type?.replace('_', ' ')}</p>
                      <p><strong>Time:</strong> {new Date(event.timestamp).toLocaleString()}</p>
                      <p><strong>Data Source:</strong> {event.data_source?.replace('_', ' ').toUpperCase()}</p>
                      <div className={`confidence-badge ${(event.display_confidence || 0) >= 0.8 ? 'high' : (event.display_confidence || 0) >= 0.5 ? 'medium' : 'low'}`}>
                        {(event.display_confidence || 0) >= 0.8 ? 'High Confidence' :
                          (event.display_confidence || 0) >= 0.5 ? 'Medium Confidence' : 'Low Confidence'}
                      </div>
                      <div className="nasa-popup-attribution">
                        <small>🛰️ Powered by NASA Open Data</small>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Real-time events as pulsing circles */}
              {realTimeEvents.map((event, index) => (
                <CircleMarker
                  key={`realtime-${index}`}
                  center={[event.latitude, event.longitude]}
                  radius={14}
                  fillColor={getMarkerColor(event.tag_confidence || 0.7)}
                  color="#1E40AF"
                  weight={3}
                  opacity={0.9}
                  fillOpacity={0.7}
                  className="pulse-marker"
                >
                  <Popup>
                    <div className="popup-content">
                      <h3>⚡ Real-time NASA Validation</h3>
                      <p><strong>Species:</strong> {event.shark_species}</p>
                      <p><strong>Prey:</strong> {getPreyEmoji(event.actual_prey_type)} {event.actual_prey_type}</p>
                      <p><strong>Confidence:</strong> {((event.tag_confidence || 0) * 100).toFixed(0)}%</p>
                      <p><em>Live update received</em></p>
                      <div className="nasa-popup-attribution">
                        <small>🏷️ MANTIS Tag validating NASA predictions</small>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>

            {/* Map Info Overlay */}
            <div className="map-info">
              <div className="info-title">📍 {filteredEvents.length} Events Shown</div>
              <div className="info-details">
                {events.filter(e => e.marker_type === 'prediction').length} NASA predictions<br />
                {events.filter(e => e.marker_type === 'validation').length} tag validations<br />
                <strong>Sydney, Australia</strong>
              </div>
            </div>
          </div> {/* closes .map-container */}

          {/* Mobile Controls */}
          <MobileControls
            filters={filters}
            setFilters={setFilters}
            systemStats={systemStats}
            nasaInfo={nasaInfo}
            realTimeEvents={realTimeEvents}
          />

        </div> {/* closes .main-content */}
      </div>
    </ErrorBoundary>
  );
}

export default App;
