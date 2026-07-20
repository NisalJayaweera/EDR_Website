import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Thermometer, Droplets, Upload, Clock3, Settings } from 'lucide-react';
import { useLiveClock } from '../hooks/useLiveClock';
import { useSheetReading } from '../hooks/useSheetReading';
import { ThresholdSlider } from '../components/ThresholdSlider';
import { apiFetch } from '../lib/api';
import toast from 'react-hot-toast';

interface OutletUser {
  user: { name: string; username: string; role: string };
}

// --- Threshold logic ---
function getTempStatus(tempC: number, threshold: number): 'safe' | 'warning' | 'critical' {
  if (tempC > threshold + 2) return 'critical';
  if (tempC > threshold) return 'warning';
  return 'safe';
}

function getHumidityStatus(humPct: number, threshold: number): 'safe' | 'warning' | 'critical' {
  if (humPct > threshold + 5) return 'critical';
  if (humPct > threshold) return 'warning';
  return 'safe';
}

const STATUS_COLORS = {
  safe:     { color: 'var(--status-safe)',     bg: 'rgba(22,163,74,0.12)',  border: 'rgba(22,163,74,0.3)'     },
  warning:  { color: 'var(--status-warning)',  bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)'    },
  critical: { color: 'var(--status-critical)', bg: 'rgba(220,38,38,0.12)',  border: 'rgba(220,38,38,0.3)'     },
};

export default function HomePage() {
  const { user } = useOutletContext<OutletUser>();
  const { time, date } = useLiveClock();
  const navigate = useNavigate();

  // Fetch user's device on mount
  const [deviceId, setDeviceId] = useState<string | null>(null);
  
  const userKey = `edr_thresholds_${user?.username || 'default'}`;
  
  const [tempThreshold, setTempThreshold] = useState(() => {
    const saved = localStorage.getItem(`${userKey}_temp`);
    return saved ? parseFloat(saved) : 25;
  });
  
  const [humidityThreshold, setHumidityThreshold] = useState(() => {
    const saved = localStorage.getItem(`${userKey}_hum`);
    return saved ? parseFloat(saved) : 60;
  });

  // Save thresholds to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(`${userKey}_temp`, tempThreshold.toString());
  }, [tempThreshold, userKey]);

  useEffect(() => {
    localStorage.setItem(`${userKey}_hum`, humidityThreshold.toString());
  }, [humidityThreshold, userKey]);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const devices = await apiFetch('/devices');
        if (devices.length > 0) {
          const d = devices[0];
          setDeviceId(d.id);
          // If the backend has threshold fields, you'd load them here
        }
      } catch {
        // No device yet — show placeholder
      }
    })();
  }, []);

  // ── Google Sheet live reading (refreshes every 5 s) ──
  const { reading, loading: readingLoading, error: sheetError } = useSheetReading(5_000);

  const tempStatus = reading ? getTempStatus(reading.temperature_c, tempThreshold) : 'safe';
  const tempColors = STATUS_COLORS[tempStatus];

  const humStatus = reading ? getHumidityStatus(reading.humidity_pct, humidityThreshold) : 'safe';
  const humColors = STATUS_COLORS[humStatus];

  // ── Alert Triggering Logic ──
  useEffect(() => {
    console.log('[Alert] effect ran — reading:', reading, 'deviceId:', deviceId, 'tempStatus:', tempStatus, 'humStatus:', humStatus);
    if (!reading || !deviceId) {
      console.log('[Alert] blocked — reading or deviceId is null');
      return;
    }
    
    const now = Date.now();
    const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
    
    const triggerIfNeeded = async (type: 'temperature' | 'humidity', value: number, threshold: number, status: string) => {
      console.log(`[Alert] triggerIfNeeded — type:${type} value:${value} threshold:${threshold} status:${status}`);
      if (status === 'safe') return;
      
      const lastSentKey = `edr_alert_sent_${userKey}_${type}`;
      const lastSent = parseInt(localStorage.getItem(lastSentKey) || '0', 10);
      const cooldownRemaining = COOLDOWN_MS - (now - lastSent);
      console.log(`[Alert] cooldown check — lastSent:${lastSent} remaining:${Math.round(cooldownRemaining/1000)}s`);
      
      if (now - lastSent > COOLDOWN_MS) {
        console.log(`[Alert] firing alert for ${type}...`);
        // Optimistically set to prevent double-firing in StrictMode
        localStorage.setItem(lastSentKey, now.toString());
        try {
          await apiFetch(`/devices/${deviceId}/alert`, {
            method: 'POST',
            data: { type, value, threshold, status }
          });
          console.log(`[Alert] success for ${type}`);
          toast(`Alert sent for ${type}`, { icon: '⚠️' });
        } catch (err) {
          console.error(`[Alert] FAILED for ${type}:`, err);
          // Rollback if failed
          localStorage.setItem(lastSentKey, lastSent.toString());
        }
      } else {
        console.log(`[Alert] cooldown active for ${type}, skipping`);
      }
    };

    triggerIfNeeded('temperature', reading.temperature_c, tempThreshold, tempStatus);
    triggerIfNeeded('humidity', reading.humidity_pct, humidityThreshold, humStatus);

  }, [reading, deviceId, tempStatus, humStatus, tempThreshold, humidityThreshold, userKey]);

  const handleSaveSettings = async () => {
    if (!deviceId) { toast.error('No device linked yet'); return; }
    setSavingSettings(true);
    try {
      await apiFetch(`/devices/${deviceId}/settings`, {
        method: 'PUT',
        data: { temp_threshold: tempThreshold, humidity_threshold: humidityThreshold },
      });
      toast.success('Settings saved to device!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div style={{
      padding: '0',
      backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(63,198,240,0.1), transparent 45%), radial-gradient(circle at 10% 80%, rgba(63,198,240,0.06), transparent 35%)',
    }}>
      {/* ── Main ── */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ── Top: Greeting + Clock ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--accent-ice)', letterSpacing: '1px', marginBottom: '4px' }}>WELCOME BACK</p>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>{user?.name || user?.username}</h1>
            {!deviceId && (
              <p style={{ marginTop: '8px', fontSize: '0.85rem', color: 'rgba(245,158,11,0.8)' }}>
                ⚠ No device linked to your account yet. Contact admin to provision your device.
              </p>
            )}
          </div>
          <div className="glass-panel" style={{ padding: '16px 24px', textAlign: 'right' }}>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-ice)', margin: 0, letterSpacing: '2px', fontVariantNumeric: 'tabular-nums' }}>{time}</p>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>{date}</p>
          </div>
        </div>

        {/* ── Sensor Cards Row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

          {/* Temperature Card */}
          <div className="glass-panel" style={{
            padding: '28px 32px',
            borderColor: reading ? tempColors.border : 'rgba(63,198,240,0.2)',
            background: reading ? tempColors.bg : 'rgba(3,2,19,0.6)',
            transition: 'all 0.5s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Thermometer size={20} color={reading ? tempColors.color : 'rgba(255,255,255,0.4)'} />
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', letterSpacing: '1px' }}>TEMPERATURE</span>
              {reading && (
                <span style={{
                  marginLeft: 'auto', fontSize: '0.7rem', fontWeight: 600, padding: '2px 10px',
                  borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.5px',
                  color: tempColors.color, background: tempColors.bg, border: `1px solid ${tempColors.border}`,
                }}>
                  {tempStatus}
                </span>
              )}
            </div>
            {readingLoading ? (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1rem' }}>Connecting...</p>
            ) : reading ? (
              <>
                <p style={{ fontSize: '3.5rem', fontWeight: 800, margin: 0, color: tempColors.color, letterSpacing: '-2px', lineHeight: 1 }}>
                  {Number(reading.temperature_c).toFixed(1)}
                  <span style={{ fontSize: '1.5rem', fontWeight: 400, marginLeft: '4px' }}>°C</span>
                </p>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '10px' }}>
                  Updated {reading.recorded_at}
                </p>
              </>
            ) : (
              <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.2)' }}>— No data —</p>
            )}
          </div>

          {/* Humidity Card */}
          <div className="glass-panel" style={{
            padding: '28px 32px',
            borderColor: reading ? humColors.border : 'rgba(63,198,240,0.2)',
            background: reading ? humColors.bg : 'rgba(3,2,19,0.6)',
            transition: 'all 0.5s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Droplets size={20} color={reading ? humColors.color : 'rgba(255,255,255,0.4)'} />
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', letterSpacing: '1px' }}>HUMIDITY</span>
              {reading && (
                <span style={{
                  marginLeft: 'auto', fontSize: '0.7rem', fontWeight: 600, padding: '2px 10px',
                  borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.5px',
                  color: humColors.color, background: humColors.bg, border: `1px solid ${humColors.border}`,
                }}>
                  {humStatus}
                </span>
              )}
            </div>
            {readingLoading ? (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1rem' }}>Connecting...</p>
            ) : reading ? (
              <>
                <p style={{ fontSize: '3.5rem', fontWeight: 800, margin: 0, color: humColors.color, letterSpacing: '-2px', lineHeight: 1 }}>
                  {Number(reading.humidity_pct).toFixed(1)}
                  <span style={{ fontSize: '1.5rem', fontWeight: 400, marginLeft: '4px' }}>%</span>
                </p>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '10px' }}>
                  Updated {reading.recorded_at}
                </p>
              </>
            ) : (
              <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.2)' }}>— No data —</p>
            )}
          </div>
        </div>

        {/* ── Device Settings (Sliders) ── */}
        <div className="glass-panel" style={{ padding: '28px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={18} color="var(--accent-ice)" />
              <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Device Settings</h2>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    Object.keys(localStorage).forEach(k => k.includes('alert_sent') && localStorage.removeItem(k));
                    toast.success('Alert cooldowns reset! Alerts will fire immediately on next update.', { duration: 4000 });
                  }}
                  className="btn-secondary"
                  style={{ width: 'auto', padding: '8px 20px', fontSize: '0.85rem' }}
                >
                  Reset Alerts
                </button>
                <button
                  onClick={handleSaveSettings}
                  disabled={!deviceId || savingSettings}
                  className="btn-primary"
                  style={{ width: 'auto', padding: '8px 20px', fontSize: '0.85rem' }}
                >
                  {savingSettings ? 'Saving...' : 'Apply Settings'}
                </button>
              </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            <ThresholdSlider
              label="Temperature Threshold"
              icon={<Thermometer size={16} />}
              value={tempThreshold}
              min={-90}
              max={25}
              unit="°C"
              onChange={setTempThreshold}
              disabled={!deviceId}
            />
            <ThresholdSlider
              label="Humidity Threshold"
              icon={<Droplets size={16} />}
              value={humidityThreshold}
              min={0}
              max={100}
              unit="%"
              onChange={setHumidityThreshold}
              disabled={!deviceId}
            />
          </div>

          {!deviceId && (
            <p style={{ marginTop: '16px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
              Settings are locked until a device is linked to your account
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
