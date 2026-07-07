import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../lib/api';

interface TrackPoint {
  latitude: number;
  longitude: number;
  recorded_at: string;
  temperature_c: number;
}

export function useTrackHistory(deviceId: string | null, limit = 200, intervalMs = 10000) {
  const [trail, setTrail] = useState<TrackPoint[]>([]);

  const fetchTrail = useCallback(async () => {
    if (!deviceId) return;
    try {
      const data = await apiFetch(`/devices/${deviceId}/track?limit=${limit}`);
      setTrail(data);
    } catch {
      // silently ignore; trail is non-critical
    }
  }, [deviceId, limit]);

  useEffect(() => {
    if (!deviceId) return;
    fetchTrail();
    const id = setInterval(fetchTrail, intervalMs);
    return () => clearInterval(id);
  }, [deviceId, intervalMs, fetchTrail]);

  return trail;
}
