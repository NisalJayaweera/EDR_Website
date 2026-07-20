import { useState, useEffect, useCallback } from 'react';

export interface SheetReading {
  temperature_c: number;
  humidity_pct: number;
  recorded_at: string; // original timestamp string from sheet
}

const SHEET_ID = '11dLIb4in5O_0SYTCjUBD_X_XzV8yeQAPYgd3MVrTOjE';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;

function parseCSV(csv: string): SheetReading | null {
  const lines = csv.trim().split('\n').filter(l => l.trim() !== '');
  if (lines.length < 2) return null;

  // Last non-empty row = most recent reading
  const lastLine = lines[lines.length - 1];

  // Google Sheets CSV is comma-separated; some fields may be quoted
  const cols = lastLine.split(',').map(c => c.replace(/^"|"$/g, '').trim());

  // Format is:
  // 0: Date, 1: Time, 2: Temperature(C), 3: Humidity(%), 4: LIS3DH_X, 5: LIS3DH_Y, 6: LIS3DH_Z
  // Example: "7/11/2026", "0:10:02", "25", "85", "1", "2", "9"
  
  if (cols.length < 4) return null;

  const recorded_at = `${cols[0]} ${cols[1]}`; // Combine Date and Time
  const temperature_c = parseFloat(cols[2]);
  const humidity_pct  = parseFloat(cols[3]);

  if (isNaN(temperature_c) || isNaN(humidity_pct)) return null;

  return { temperature_c, humidity_pct, recorded_at };
}

export function useSheetReading(intervalMs = 60_000) {
  const [reading, setReading] = useState<SheetReading | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReading = useCallback(async () => {
    try {
      // Use a cache-busted URL so the browser always fetches fresh data
      const res = await fetch(`${CSV_URL}&cachebust=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
      const csv = await res.text();
      const parsed = parseCSV(csv);
      if (parsed) {
        setReading(parsed);
        setError(null);
      } else {
        setError('Could not parse sheet data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sheet');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReading();
    const id = setInterval(fetchReading, intervalMs);
    return () => clearInterval(id);
  }, [fetchReading, intervalMs]);

  return { reading, error, loading };
}
