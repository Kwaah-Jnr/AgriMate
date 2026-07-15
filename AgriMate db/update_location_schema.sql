-- Migration: Add transporter location columns to the orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transporter_latitude NUMERIC(10, 8);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transporter_longitude NUMERIC(11, 8);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP;
