-- Initial database migration for Balloon'd
-- Creates all required tables with PostGIS support

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE auth_provider AS ENUM ('LOCAL', 'GOOGLE', 'APPLE');
CREATE TYPE pop_type AS ENUM ('SINGLE', 'DOUBLE');
CREATE TYPE message_type AS ENUM ('TEXT', 'IMAGE', 'VOICE', 'VIDEO');

-- Users table with location support
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    provider auth_provider DEFAULT 'LOCAL',
    provider_id VARCHAR(255),
    
    -- Profile fields
    name VARCHAR(100) NOT NULL,
    bio TEXT,
    age INTEGER CHECK (age >= 18 AND age <= 99),
    photos TEXT[],
    prompts JSONB,
    
    -- Location fields with PostGIS
    location GEOGRAPHY(POINT, 4326),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    radius INTEGER DEFAULT 50,
    last_location_update TIMESTAMP,
    
    -- Preferences
    min_age INTEGER DEFAULT 18,
    max_age INTEGER DEFAULT 99,
    
    -- Account status
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial index for location queries
CREATE INDEX idx_users_location ON users USING GIST(location);
CREATE INDEX idx_users_lat_lng ON users(latitude, longitude);
CREATE INDEX idx_users_email ON users(email);

-- Pops table for balloon interactions
CREATE TABLE pops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pop_type pop_type DEFAULT 'SINGLE',
    revealed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, target_user_id)
);

CREATE INDEX idx_pops_user_id ON pops(user_id);
CREATE INDEX idx_pops_target_user_id ON pops(target_user_id);

-- Matches table
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    matched_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, matched_user_id)
);

CREATE INDEX idx_matches_user_id ON matches(user_id);
CREATE INDEX idx_matches_matched_user_id ON matches(matched_user_id);

-- Chats table
CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID UNIQUE NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    last_message_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chats_match_id ON chats(match_id);

-- Chat participants table
CREATE TABLE chat_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_typing BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(chat_id, user_id)
);

CREATE INDEX idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX idx_chat_participants_user_id ON chat_participants(user_id);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type message_type DEFAULT 'TEXT',
    is_read BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);

-- Balloon allocation table for daily limits
CREATE TABLE balloon_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    balloons_used INTEGER DEFAULT 0,
    max_balloons INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, date)
);

CREATE INDEX idx_balloon_allocations_user_id ON balloon_allocations(user_id);
CREATE INDEX idx_balloon_allocations_date ON balloon_allocations(date);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_participants_updated_at BEFORE UPDATE ON chat_participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to find nearby users using PostGIS
CREATE OR REPLACE FUNCTION find_nearby_users(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_km INTEGER,
    exclude_user_id UUID
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    bio TEXT,
    age INTEGER,
    photos TEXT[],
    prompts JSONB,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.name,
        u.bio,
        u.age,
        u.photos,
        u.prompts,
        u.latitude,
        u.longitude,
        ST_Distance(
            ST_MakePoint(u.longitude, u.latitude)::geography,
            ST_MakePoint(user_lng, user_lat)::geography
        ) / 1000 as distance
    FROM users u
    WHERE 
        u.id != exclude_user_id
        AND u.latitude IS NOT NULL
        AND u.longitude IS NOT NULL
        AND u.is_active = TRUE
        AND ST_DWithin(
            ST_MakePoint(u.longitude, u.latitude)::geography,
            ST_MakePoint(user_lng, user_lat)::geography,
            radius_km * 1000
        )
    ORDER BY distance
    LIMIT 50;
END;
$$ LANGUAGE plpgsql;
