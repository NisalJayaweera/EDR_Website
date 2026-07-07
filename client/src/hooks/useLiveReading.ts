import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api';

export interface SensorReading {
  temperature_c: number;
  humidity_pct: number;
  latitude: number | null;
  longitude: number | null;
  recorded_at: string;
}

export function useLiveReading(deviceId: string | null, intervalMs = 4000) {
  const [reading, setReading] = useState<SensorReading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReading = useCallback(async () => {
    if (!deviceId) return;
    try {
      const data = await apiFetch(`/devices/${deviceId}/latest`);
      setReading(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    if (!deviceId) { setLoading(false); return; }
    fetchReading();
    const id = setInterval(fetchReading, intervalMs);
    return () => clearInterval(id);
  }, [deviceId, intervalMs, fetchReading]);

  return { reading, error, loading };
}
