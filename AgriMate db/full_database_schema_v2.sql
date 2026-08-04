-- 1. Create Enum Types if they do not exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'escrow_status_type') THEN
        CREATE TYPE escrow_status_type AS ENUM ('unfunded', 'funded', 'half_released', 'released', 'disputed', 'refunded');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_status_type') THEN
        CREATE TYPE delivery_status_type AS ENUM ('pending', 'claimed', 'transit', 'delivered', 'completed', 'cancelled');
    END IF;
END $$;

-- 2. Create Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
    wallet_id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    balance NUMERIC(12, 2) DEFAULT 0.00,
    escrow_balance NUMERIC(12, 2) DEFAULT 0.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Offers Table
CREATE TABLE IF NOT EXISTS offers (
    offer_id SERIAL PRIMARY KEY,
    listing_id INT REFERENCES listings(listing_id) ON DELETE CASCADE,
    buyer_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    farmer_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    quantity INT NOT NULL,
    offered_price NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create Jobs Table (Transporter Logistics)
CREATE TABLE IF NOT EXISTS jobs (
    job_id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(order_id) ON DELETE CASCADE,
    transporter_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    distance_km NUMERIC(8, 2) DEFAULT 10.00,
    payout NUMERIC(10, 2) DEFAULT 100.00,
    flat_fee NUMERIC(10, 2) DEFAULT 100.00,
    qr_pickup VARCHAR(100),
    qr_delivery VARCHAR(100),
    status VARCHAR(20) DEFAULT 'available', -- 'available', 'assigned', 'picked_up', 'in_transit', 'delivered', 'completed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create Disputes Table
CREATE TABLE IF NOT EXISTS disputes (
    dispute_id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(order_id) ON DELETE CASCADE,
    raised_by INT REFERENCES users(user_id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open',
    previous_escrow_status escrow_status_type,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Add Missing Columns to Orders Table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS farmer_id INT REFERENCES users(user_id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transporter_id INT REFERENCES users(user_id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity INT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_by TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS escrow_status escrow_status_type DEFAULT 'unfunded';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS previous_escrow_status escrow_status_type;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status delivery_status_type DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transporter_vehicle VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS self_pickup_qr VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transporter_latitude NUMERIC(10, 8);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transporter_longitude NUMERIC(11, 8);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP;

-- 7. Add Missing Columns to Listings Table
ALTER TABLE listings ADD COLUMN IF NOT EXISTS grade VARCHAR(20);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'open';

-- 8. Add Missing Columns to Ratings Table
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS reply TEXT;
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP;

-- 9. Create Wallet Transactions Table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    transaction_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    type VARCHAR(20) CHECK (type IN ('deposit', 'withdrawal', 'escrow')),
    amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
