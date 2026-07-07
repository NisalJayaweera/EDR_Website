import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLiveReading } from '../hooks/useLiveReading';
import { useTrackHistory } from '../hooks/useTrackHistory';
import { apiFetch } from '../lib/api';
import { MapPin, Thermometer, Droplets, Navigation } from 'lucide-react';

// Fix default Leaflet marker icons (Vite/React bundler doesn't serve them automatically)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom ice-blue marker for the live position
const liveIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize:    [25, 41],
  iconAnchor:  [12, 41],
  popupAnchor: [1, -34],
  shadowSize:  [41, 41],
  className: 'leaflet-live-icon',
});

/** Sub-component: keeps map centred on the live reading without re-mounting the map */
function MapCentre({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(position, map.getZoom()); }, [position, map]);
  return null;
}

export default function TrackingPage() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [deviceLabel, setDeviceLabel] = useState('');

  useEffect(() => {
    apiFetch('/devices').then(devices => {
      if (devices.length > 0) {
        setDeviceId(devices[0].id);
        setDeviceLabel(devices[0].device_label || 'Device 1');
      }
    }).catch(() => {});
  }, []);

  const { reading, loading } = useLiveReading(deviceId, 5000);
  const trail = useTrackHistory(deviceId, 200, 10000);

  const hasGps = reading && reading.latitude != null && reading.longitude != null;
  const position: [number, number] = hasGps
    ? [Number(reading!.latitude!), Number(reading!.longitude!)]
    : [6.9271, 79.8612]; // default: Colombo, Sri Lanka

  const trailPositions: [number, number][] = trail
    .filter(p => p.latitude != null && p.longitude != null)
    .map(p => [Number(p.latitude), Number(p.longitude)]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Stats Bar ── */}
      {reading && (
        <div style={{
          display: 'flex', gap: '0', borderBottom: '1px solid rgba(63,198,240,0.1)',
          background: 'rgba(3,2,19,0.7)', backdropFilter: 'blur(6px)',
        }}>
          {[
            { icon: <Thermometer size={15} color="var(--accent-ice)" />, label: 'Temperature', value: `${reading.temperature_c != null ? Number(reading.temperature_c).toFixed(1) : '—'} °C` },
            { icon: <Droplets size={15} color="var(--accent-ice)" />,   label: 'Humidity',    value: `${reading.humidity_pct != null ? Number(reading.humidity_pct).toFixed(1) : '—'} %` },
            { icon: <MapPin size={15} color="var(--accent-ice)" />,     label: 'Coordinates', value: hasGps ? `${Number(reading.latitude!).toFixed(5)}, ${Number(reading.longitude!).toFixed(5)}` : 'No GPS fix' },
            { icon: <Navigation size={15} color="var(--accent-ice)" />, label: 'Trail points', value: `${trailPositions.length} pts` },
          ].map(({ icon, label, value }) => (
            <div key={label} style={{
              flex: 1, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px',
              borderRight: '1px solid rgba(255,255,255,0.05)',
            }}>
              {icon}
              <div>
                <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', margin: 0, letterSpacing: '0.5px' }}>{label.toUpperCase()}</p>
                <p style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0, color: '#fff' }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Map ── */}
      <div style={{ flex: 1, position: 'relative' }}>
        {loading && !deviceId ? (
          <div style={{
            height: '100%', minHeight: '60vh', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexDirection: 'column', gap: '12px',
          }}>
            <MapPin size={40} color="rgba(63,198,240,0.3)" />
            <p style={{ color: 'rgba(255,255,255,0.4)' }}>No device linked to your account yet.</p>
          </div>
        ) : (
          <>
            {/* No GPS fix overlay */}
            {!hasGps && !loading && (
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                zIndex: 1000, background: 'rgba(3,2,19,0.85)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(245,158,11,0.4)', borderRadius: '12px',
                padding: '16px 24px', textAlign: 'center', pointerEvents: 'none',
              }}>
                <p style={{ color: 'var(--status-warning)', margin: 0, fontWeight: 600 }}>⏳ Waiting for GPS fix...</p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginTop: '4px' }}>Map is centred on Colombo as default</p>
              </div>
            )}

            <MapContainer
              center={position}
              zoom={14}
              style={{ height: 'calc(100vh - 130px)', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {hasGps && <MapCentre position={position} />}

              {/* Route trail polyline */}
              {trailPositions.length > 1 && (
                <Polyline
                  positions={trailPositions}
                  color="#3FC6F0"
                  weight={3}
                  opacity={0.7}
                  dashArray="6 4"
                />
              )}

              {/* Live position marker */}
              {hasGps && (
                <Marker position={position} icon={liveIcon}>
                  <Popup>
                    <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                      <strong>📦 Package Location</strong><br />
                      🌡 Temp: <strong>{reading!.temperature_c != null ? Number(reading.temperature_c).toFixed(1) : '—'}°C</strong><br />
                      💧 Humidity: <strong>{reading!.humidity_pct != null ? Number(reading.humidity_pct).toFixed(1) : '—'}%</strong><br />
                      🕐 Updated: {new Date(reading!.recorded_at).toLocaleString()}
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Trail start marker */}
              {trailPositions.length > 1 && (
                <Marker position={trailPositions[0]}>
                  <Popup>🚀 Journey start</Popup>
                </Marker>
              )}
            </MapContainer>
          </>
        )}
      </div>
    </div>
  );
}
