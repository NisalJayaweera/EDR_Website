CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    address TEXT,
    username TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    must_change_password BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by TEXT DEFAULT 'admin'
);

-- Devices Table
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_label TEXT,
    upload_interval_ms BIGINT DEFAULT 300000,
    recording_interval_ms BIGINT DEFAULT 1000,
    last_seen_at TIMESTAMP,
    api_key TEXT UNIQUE  -- 64-char hex, generated on device registration; used by firmware
);

-- Sensor Readings Table
CREATE TABLE IF NOT EXISTS sensor_readings (
    id BIGSERIAL PRIMARY KEY,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    temperature_c NUMERIC(5,2),
    humidity_pct NUMERIC(5,2),
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    recorded_at TIMESTAMP,
    received_at TIMESTAMP DEFAULT NOW()
);

-- CSV Files Table
CREATE TABLE IF NOT EXISTS csv_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    file_name TEXT,
    storage_path TEXT,
    size_bytes BIGINT,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_id ON sensor_readings(device_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_recorded_at ON sensor_readings(recorded_at);
