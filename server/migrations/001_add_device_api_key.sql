-- Run this once against an existing database that was created with the original schema.sql
-- (the CREATE TABLE statement already includes api_key for fresh installs)

ALTER TABLE devices ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE;

-- Back-fill existing device rows with a random key so they still work
UPDATE devices
SET api_key = encode(gen_random_bytes(32), 'hex')
WHERE api_key IS NULL;
