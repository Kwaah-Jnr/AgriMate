-- 1. Add vehicle_number to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(50);

-- 2. Create Enum Types for escrow and delivery status if they do not exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'escrow_status_type') THEN
        CREATE TYPE escrow_status_type AS ENUM ('unfunded', 'funded', 'half_released', 'released', 'disputed', 'refunded');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_status_type') THEN
        CREATE TYPE delivery_status_type AS ENUM ('pending', 'claimed', 'transit', 'delivered', 'completed', 'cancelled');
    END IF;
END $$;

-- 3. Add columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS escrow_status escrow_status_type DEFAULT 'unfunded';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS previous_escrow_status escrow_status_type;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status delivery_status_type DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transporter_vehicle VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS self_pickup_qr VARCHAR(100);

-- 4. Add flat_fee to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS flat_fee NUMERIC(10, 2) DEFAULT 100.00;

-- 5. Add previous_escrow_status to disputes table
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS previous_escrow_status escrow_status_type;

-- 6. Create wallet_transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    transaction_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    type VARCHAR(20) CHECK (type IN ('deposit', 'withdrawal', 'escrow')),
    amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Recreate payments table (drop existing to realign fields)
DROP TABLE IF EXISTS payments CASCADE;
CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(order_id) ON DELETE CASCADE,
    buyer_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('escrow_lock', 'release')),
    status VARCHAR(20) DEFAULT 'pending',
    description TEXT,
    confirmed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
