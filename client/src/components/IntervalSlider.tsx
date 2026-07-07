import React from 'react';
import { INTERVAL_STEPS_MS, formatInterval, findClosestStepIndex } from '../lib/intervalSteps';

interface IntervalSliderProps {
  label: string;
  icon: React.ReactNode;
  valueMs: number;
  onChange: (ms: number) => void;
  disabled?: boolean;
}

export function IntervalSlider({ label, icon, valueMs, onChange, disabled }: IntervalSliderProps) {
  const index = findClosestStepIndex(valueMs);
  const displayLabel = formatInterval(INTERVAL_STEPS_MS[index]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--accent-ice)' }}>{icon}</span>
          <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{label}</span>
        </div>
        <span style={{
          fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-ice)',
          background: 'rgba(63,198,240,0.1)', borderRadius: '6px',
          padding: '3px 12px', border: '1px solid rgba(63,198,240,0.25)',
          minWidth: '80px', textAlign: 'center',
        }}>
          {displayLabel}
        </span>
      </div>

      {/* Slider */}
      <input
        type="range"
        min={0}
        max={INTERVAL_STEPS_MS.length - 1}
        step={1}
        value={index}
        disabled={disabled}
        onChange={e => onChange(INTERVAL_STEPS_MS[parseInt(e.target.value)])}
        style={{
          width: '100%',
          accentColor: 'var(--accent-ice)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.4 : 1,
        }}
      />

      {/* Min / mid / max hint labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
        <span>{formatInterval(INTERVAL_STEPS_MS[0])}</span>
        <span>{formatInterval(INTERVAL_STEPS_MS[Math.floor(INTERVAL_STEPS_MS.length / 2)])}</span>
        <span>{formatInterval(INTERVAL_STEPS_MS[INTERVAL_STEPS_MS.length - 1])}</span>
      </div>
    </div>
  );
}
