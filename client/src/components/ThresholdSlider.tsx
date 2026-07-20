import React from 'react';

interface ThresholdSliderProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (val: number) => void;
  disabled?: boolean;
}

export function ThresholdSlider({ label, icon, value, min, max, unit, onChange, disabled }: ThresholdSliderProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newVal = parseFloat(e.target.value);
    if (isNaN(newVal)) return;
    if (newVal < min) newVal = min;
    if (newVal > max) newVal = max;
    onChange(newVal);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--accent-ice)' }}>{icon}</span>
          <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            disabled={disabled}
            onChange={handleInputChange}
            style={{
              fontSize: '0.9rem',
              fontWeight: 700,
              color: 'var(--accent-ice)',
              background: 'rgba(63,198,240,0.1)',
              borderRadius: '6px',
              padding: '3px 8px',
              border: '1px solid rgba(63,198,240,0.25)',
              width: '70px',
              textAlign: 'center',
              outline: 'none',
            }}
          />
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{unit}</span>
        </div>
      </div>

      {/* Slider */}
      <input
        type="range"
        min={min}
        max={max}
        step="0.1"
        value={value}
        disabled={disabled}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%',
          accentColor: 'var(--accent-ice)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.4 : 1,
        }}
      />

      {/* Min / mid / max hint labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
        <span>{min}{unit}</span>
        <span>{((min + max) / 2).toFixed(1)}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}
