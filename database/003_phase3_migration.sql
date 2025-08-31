-- Balloon'd Phase 3 Migration: Smart Matching, Themes, Premium Features, Video & AR
-- Migration Date: 2024

-- =====================================================
-- BALLOON THEMES & VISUAL ENHANCEMENTS
-- =====================================================

-- Balloon themes table
CREATE TABLE balloon_themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(30) NOT NULL, -- 'holiday', 'premium', 'special', 'seasonal'
    style_config JSONB NOT NULL, -- Contains colors, animations, particles
    premium_only BOOLEAN DEFAULT false,
    active_from TIMESTAMP,
    active_until TIMESTAMP,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User balloon customizations
CREATE TABLE user_balloon_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    active_theme_id UUID REFERENCES balloon_themes(id),
    custom_colors JSONB,
    animation_preferences JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Super Pops (like Hinge Roses)
CREATE TABLE super_pops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    theme_id UUID REFERENCES balloon_themes(id),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'viewed', 'accepted', 'declined'
    created_at TIMESTAMP DEFAULT NOW(),
    viewed_at TIMESTAMP,
    responded_at TIMESTAMP
);

-- =====================================================
-- SMART MATCHING ALGORITHM
-- =====================================================

-- User interests for matching
CREATE TABLE user_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    interest VARCHAR(100) NOT NULL,
    weight FLOAT DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, category, interest)
);

-- Matching scores cache
CREATE TABLE match_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interest_score FLOAT DEFAULT 0,
    prompt_similarity_score FLOAT DEFAULT 0,
    engagement_score FLOAT DEFAULT 0,
    diversity_score FLOAT DEFAULT 0,
    total_score FLOAT DEFAULT 0,
    last_calculated TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_a_id, user_b_id)
);

-- Prompt embeddings for NLP matching
CREATE TABLE prompt_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prompt_index INTEGER NOT NULL,
    embedding VECTOR(768), -- Using pgvector for embeddings
    prompt_text TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, prompt_index)
);

-- User engagement metrics
CREATE TABLE user_engagement_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    daily_active_streak INTEGER DEFAULT 0,
    total_pops INTEGER DEFAULT 0,
    total_matches INTEGER DEFAULT 0,
    response_rate FLOAT DEFAULT 0,
    avg_response_time INTEGER, -- in minutes
    profile_completion_score FLOAT DEFAULT 0,
    last_active TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- =====================================================
-- VIDEO PROFILES & AR FEATURES
-- =====================================================

-- Video profiles
CREATE TABLE video_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration INTEGER, -- in seconds
    transcript TEXT,
    status VARCHAR(20) DEFAULT 'processing', -- 'processing', 'active', 'rejected'
    moderation_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- AR balloon experiences
CREATE TABLE ar_experiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'balloon_pop', 'match_reveal', 'special_event'
    ar_model_url TEXT,
    ar_config JSONB,
    premium_only BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User AR sessions
CREATE TABLE ar_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    experience_id UUID REFERENCES ar_experiences(id),
    target_user_id UUID REFERENCES users(id),
    session_data JSONB,
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP
);

-- =====================================================
-- GROUP EVENTS & SPEED DATING
-- =====================================================

-- Group events
CREATE TABLE group_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'speed_dating', 'mixer', 'themed_party'
    description TEXT,
    host_id UUID REFERENCES users(id),
    max_participants INTEGER DEFAULT 20,
    min_participants INTEGER DEFAULT 4,
    start_time TIMESTAMP NOT NULL,
    duration INTEGER NOT NULL, -- in minutes
    location_lat FLOAT,
    location_lon FLOAT,
    location_name VARCHAR(200),
    is_virtual BOOLEAN DEFAULT false,
    room_url TEXT,
    status VARCHAR(20) DEFAULT 'upcoming',
    theme_id UUID REFERENCES balloon_themes(id),
    entry_fee DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Event participants
CREATE TABLE event_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES group_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'registered', -- 'registered', 'attended', 'no_show'
    joined_at TIMESTAMP,
    left_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Speed dating rounds
CREATE TABLE speed_dating_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES group_events(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    duration INTEGER DEFAULT 180, -- 3 minutes default
    started_at TIMESTAMP,
    ended_at TIMESTAMP
);

-- Speed dating matches
CREATE TABLE speed_dating_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID NOT NULL REFERENCES speed_dating_rounds(id) ON DELETE CASCADE,
    user_a_id UUID NOT NULL REFERENCES users(id),
    user_b_id UUID NOT NULL REFERENCES users(id),
    user_a_interested BOOLEAN,
    user_b_interested BOOLEAN,
    matched BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- PREMIUM FEATURES EXPANSION
-- =====================================================

-- Boosts
CREATE TABLE user_boosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    boost_type VARCHAR(30) NOT NULL, -- 'visibility', 'super', 'event'
    started_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    boost_multiplier FLOAT DEFAULT 2.0,
    remaining_views INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Advanced filters
CREATE TABLE user_advanced_filters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filter_name VARCHAR(50),
    min_height INTEGER,
    max_height INTEGER,
    education_levels TEXT[],
    lifestyle_tags TEXT[],
    interests TEXT[],
    languages TEXT[],
    relationship_goals TEXT[],
    has_children_preference VARCHAR(20),
    wants_children_preference VARCHAR(20),
    religion_preferences TEXT[],
    political_preferences TEXT[],
    smoking_preference VARCHAR(20),
    drinking_preference VARCHAR(20),
    min_age INTEGER,
    max_age INTEGER,
    max_distance INTEGER,
    verified_only BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Who Popped You tracking
CREATE TABLE balloon_pop_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    popper_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    popped_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balloon_theme_id UUID REFERENCES balloon_themes(id),
    revealed BOOLEAN DEFAULT false,
    reveal_date TIMESTAMP,
    is_super_pop BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Daily bonus pops
CREATE TABLE daily_bonuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bonus_date DATE NOT NULL,
    streak_day INTEGER DEFAULT 1,
    bonus_pops INTEGER DEFAULT 1,
    claimed BOOLEAN DEFAULT false,
    claimed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, bonus_date)
);

-- =====================================================
-- VIDEO VERIFICATION EXPANSION
-- =====================================================

-- Video selfie verification
CREATE TABLE video_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    verification_code VARCHAR(10) NOT NULL,
    facial_features JSONB,
    verification_score FLOAT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'verified', 'rejected', 'expired'
    reviewer_notes TEXT,
    verified_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Verification badges
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_type VARCHAR(50) NOT NULL, -- 'verified', 'premium', 'super_user', 'active_7days', etc.
    badge_level INTEGER DEFAULT 1,
    earned_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    metadata JSONB,
    UNIQUE(user_id, badge_type)
);

-- =====================================================
-- ML MODEL CONFIGURATIONS
-- =====================================================

-- ML model versions and configs
CREATE TABLE ml_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(100) NOT NULL,
    model_type VARCHAR(50) NOT NULL, -- 'matching', 'nlp', 'recommendation', 'moderation'
    version VARCHAR(20) NOT NULL,
    model_path TEXT,
    config JSONB,
    performance_metrics JSONB,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(model_name, version)
);

-- User ML predictions cache
CREATE TABLE ml_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    model_id UUID REFERENCES ml_models(id),
    prediction_type VARCHAR(50) NOT NULL,
    predictions JSONB NOT NULL,
    confidence_scores JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Smart matching indexes
CREATE INDEX idx_match_scores_users ON match_scores(user_a_id, user_b_id);
CREATE INDEX idx_match_scores_total ON match_scores(total_score DESC);
CREATE INDEX idx_user_interests_user ON user_interests(user_id);
CREATE INDEX idx_prompt_embeddings_user ON prompt_embeddings(user_id);
CREATE INDEX idx_engagement_metrics_active ON user_engagement_metrics(last_active DESC);

-- Video and AR indexes
CREATE INDEX idx_video_profiles_user ON video_profiles(user_id);
CREATE INDEX idx_video_profiles_status ON video_profiles(status);
CREATE INDEX idx_ar_sessions_user ON ar_sessions(user_id);

-- Group events indexes
CREATE INDEX idx_group_events_time ON group_events(start_time);
CREATE INDEX idx_group_events_status ON group_events(status);
CREATE INDEX idx_event_participants_event ON event_participants(event_id);
CREATE INDEX idx_event_participants_user ON event_participants(user_id);

-- Premium features indexes
CREATE INDEX idx_user_boosts_active ON user_boosts(user_id, expires_at);
CREATE INDEX idx_balloon_pop_history_popper ON balloon_pop_history(popper_id);
CREATE INDEX idx_balloon_pop_history_popped ON balloon_pop_history(popped_user_id);
CREATE INDEX idx_daily_bonuses_user_date ON daily_bonuses(user_id, bonus_date);

-- Verification indexes
CREATE INDEX idx_video_verifications_user ON video_verifications(user_id);
CREATE INDEX idx_user_badges_user ON user_badges(user_id);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to calculate match score
CREATE OR REPLACE FUNCTION calculate_match_score(user_a UUID, user_b UUID)
RETURNS FLOAT AS $$
DECLARE
    interest_score FLOAT := 0;
    prompt_score FLOAT := 0;
    engagement_score FLOAT := 0;
    diversity_score FLOAT := 0;
    total FLOAT := 0;
BEGIN
    -- Calculate interest overlap
    SELECT COUNT(*) * 10 INTO interest_score
    FROM user_interests a
    JOIN user_interests b ON a.interest = b.interest AND a.category = b.category
    WHERE a.user_id = user_a AND b.user_id = user_b;
    
    -- Engagement score based on activity
    SELECT 
        (a.daily_active_streak + b.daily_active_streak) / 2.0 * 5 INTO engagement_score
    FROM user_engagement_metrics a, user_engagement_metrics b
    WHERE a.user_id = user_a AND b.user_id = user_b;
    
    -- Calculate total score
    total := interest_score + prompt_score + engagement_score + diversity_score;
    
    -- Update or insert score
    INSERT INTO match_scores (user_a_id, user_b_id, interest_score, prompt_similarity_score, 
                             engagement_score, diversity_score, total_score)
    VALUES (user_a, user_b, interest_score, prompt_score, engagement_score, diversity_score, total)
    ON CONFLICT (user_a_id, user_b_id) 
    DO UPDATE SET 
        interest_score = EXCLUDED.interest_score,
        prompt_similarity_score = EXCLUDED.prompt_similarity_score,
        engagement_score = EXCLUDED.engagement_score,
        diversity_score = EXCLUDED.diversity_score,
        total_score = EXCLUDED.total_score,
        last_calculated = NOW();
    
    RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Function to update engagement metrics
CREATE OR REPLACE FUNCTION update_engagement_metrics()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE user_engagement_metrics
    SET 
        last_active = NOW(),
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for engagement updates
CREATE TRIGGER update_engagement_on_activity
AFTER INSERT ON balloon_pop_history
FOR EACH ROW
EXECUTE FUNCTION update_engagement_metrics();

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default balloon themes
INSERT INTO balloon_themes (name, type, style_config, premium_only) VALUES
('Classic', 'special', '{"colors": ["#FFB6C1", "#FFC0CB", "#FFE4E1"], "animation": "float", "particles": "none"}', false),
('Gold Premium', 'premium', '{"colors": ["#FFD700", "#FFA500", "#FFD700"], "animation": "glow", "particles": "sparkles"}', true),
('Ruby Glow', 'premium', '{"colors": ["#8B0000", "#DC143C", "#FF0000"], "animation": "pulse_glow", "particles": "ruby_dust"}', true),
('Christmas', 'holiday', '{"colors": ["#FF0000", "#00FF00", "#FFFFFF"], "animation": "snow_fall", "particles": "snowflakes"}', false),
('Valentine', 'holiday', '{"colors": ["#FF69B4", "#FF1493", "#FF0000"], "animation": "hearts", "particles": "hearts"}', false),
('Halloween', 'holiday', '{"colors": ["#FF8C00", "#000000", "#8B008B"], "animation": "spooky", "particles": "bats"}', false),
('New Year', 'seasonal', '{"colors": ["#FFD700", "#C0C0C0", "#FFFFFF"], "animation": "fireworks", "particles": "confetti"}', false);

-- Insert default AR experiences
INSERT INTO ar_experiences (name, type, ar_config, premium_only) VALUES
('Classic Pop', 'balloon_pop', '{"model": "balloon_basic", "animation": "pop_burst"}', false),
('Golden Reveal', 'balloon_pop', '{"model": "balloon_gold", "animation": "golden_explosion"}', true),
('Match Celebration', 'match_reveal', '{"model": "hearts_celebration", "animation": "hearts_cascade"}', false),
('Speed Date Timer', 'special_event', '{"model": "countdown_timer", "animation": "tick_tock"}', false);

-- Insert ML models
INSERT INTO ml_models (model_name, model_type, version, config, is_active) VALUES
('CompatibilityNet', 'matching', '3.0.0', '{"layers": 5, "embedding_size": 768, "learning_rate": 0.001}', true),
('PromptSimilarity', 'nlp', '2.1.0', '{"model": "sentence-transformers", "max_length": 512}', true),
('EngagementPredictor', 'recommendation', '1.5.0', '{"features": ["activity", "response_rate", "profile_completion"]}', true),
('ContentModerator', 'moderation', '4.0.0', '{"threshold": 0.85, "categories": ["inappropriate", "spam", "offensive"]}', true);

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO balloond_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO balloond_user;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO balloond_user;