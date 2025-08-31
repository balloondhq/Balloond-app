-- Phase 2 Database Migration
-- Adds support for voice messages, subscriptions, moderation, and push notifications

-- Add voice message support to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS media_duration INTEGER,
ADD COLUMN IF NOT EXISTS media_format VARCHAR(20);

-- Create push tokens table
CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('IOS', 'ANDROID', 'WEB')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_token ON push_tokens(token);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier VARCHAR(20) NOT NULL DEFAULT 'FREE' CHECK (tier IN ('FREE', 'GOLD', 'GLOWING')),
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    apple_transaction_id VARCHAR(255),
    google_purchase_token VARCHAR(500),
    platform VARCHAR(20) CHECK (platform IN ('STRIPE', 'APPLE', 'GOOGLE')),
    is_active BOOLEAN DEFAULT true,
    auto_renew BOOLEAN DEFAULT true,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_active ON subscriptions(is_active) WHERE is_active = true;

-- Create reports table for moderation
CREATE TABLE IF NOT EXISTS reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('USER', 'MESSAGE', 'PHOTO')),
    content_id VARCHAR(255) NOT NULL,
    reason VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED')),
    resolution TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_content ON reports(content_type, content_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created ON reports(created_at);

-- Create blocks table
CREATE TABLE IF NOT EXISTS blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(blocker_id, blocked_user_id)
);

CREATE INDEX idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON blocks(blocked_user_id);

-- Create verifications table
CREATE TABLE IF NOT EXISTS verifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    selfie_url TEXT NOT NULL,
    similarity DECIMAL(5, 2),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'FAILED', 'EXPIRED')),
    verified_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    attempts INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_verifications_user ON verifications(user_id);
CREATE INDEX idx_verifications_status ON verifications(status);

-- Create moderation queue table
CREATE TABLE IF NOT EXISTS moderation_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('PHOTO', 'MESSAGE', 'PROFILE', 'REPORT')),
    content_url TEXT,
    content_text TEXT,
    ai_score DECIMAL(3, 2),
    ai_details JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'ESCALATED')),
    priority INTEGER DEFAULT 0,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_moderation_status ON moderation_queue(status);
CREATE INDEX idx_moderation_priority ON moderation_queue(priority DESC, created_at ASC);
CREATE INDEX idx_moderation_user ON moderation_queue(user_id);

-- Create moderation actions table
CREATE TABLE IF NOT EXISTS moderation_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_id VARCHAR(255) NOT NULL,
    content_type VARCHAR(20) NOT NULL,
    action VARCHAR(50) NOT NULL,
    reason TEXT,
    automated BOOLEAN DEFAULT false,
    moderator_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_moderation_actions_content ON moderation_actions(content_type, content_id);
CREATE INDEX idx_moderation_actions_created ON moderation_actions(created_at);

-- Create moderation logs table
CREATE TABLE IF NOT EXISTS moderation_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_id VARCHAR(255) NOT NULL,
    content_type VARCHAR(20) NOT NULL,
    result JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_moderation_logs_content ON moderation_logs(content_type, content_id);
CREATE INDEX idx_moderation_logs_timestamp ON moderation_logs(timestamp);

-- Create daily stats table for analytics
CREATE TABLE IF NOT EXISTS daily_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    new_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    new_matches INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    voice_messages INTEGER DEFAULT 0,
    active_subscriptions INTEGER DEFAULT 0,
    revenue_cents INTEGER DEFAULT 0,
    reports INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_daily_stats_date ON daily_stats(date);

-- Create sessions table for cleanup worker
CREATE TABLE IF NOT EXISTS sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Add subscription and verification fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'FREE' CHECK (subscription_tier IN ('FREE', 'GOLD', 'GLOWING')),
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS daily_pops_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_pops_reset_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS thumbnail VARCHAR(500);

-- Add blocking support to chats table
ALTER TABLE chats 
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- Create indexes for subscription features
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier) WHERE subscription_tier != 'FREE';
CREATE INDEX IF NOT EXISTS idx_users_verified ON users(is_verified) WHERE is_verified = true;
CREATE INDEX IF NOT EXISTS idx_users_suspended ON users(is_suspended) WHERE is_suspended = true;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
DROP TRIGGER IF EXISTS update_push_tokens_updated_at ON push_tokens;
CREATE TRIGGER update_push_tokens_updated_at BEFORE UPDATE ON push_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to reset daily pops
CREATE OR REPLACE FUNCTION reset_daily_pops()
RETURNS void AS $$
BEGIN
    UPDATE users 
    SET daily_pops_used = 0, 
        daily_pops_reset_at = CURRENT_TIMESTAMP
    WHERE daily_pops_reset_at < CURRENT_DATE;
END;
$$ language 'plpgsql';

-- Create function to check subscription limits
CREATE OR REPLACE FUNCTION get_daily_pop_limit(tier VARCHAR)
RETURNS INTEGER AS $$
BEGIN
    CASE tier
        WHEN 'FREE' THEN RETURN 5;
        WHEN 'GOLD' THEN RETURN 15;
        WHEN 'GLOWING' THEN RETURN 999;
        ELSE RETURN 5;
    END CASE;
END;
$$ language 'plpgsql';

-- Create view for active subscriptions
CREATE OR REPLACE VIEW active_subscriptions AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    s.tier,
    s.platform,
    s.expires_at,
    s.auto_renew,
    s.started_at
FROM users u
JOIN subscriptions s ON u.id = s.user_id
WHERE s.is_active = true
  AND (s.expires_at IS NULL OR s.expires_at > CURRENT_TIMESTAMP);

-- Create view for moderation stats
CREATE OR REPLACE VIEW moderation_stats AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) FILTER (WHERE status = 'PENDING') as pending_reports,
    COUNT(*) FILTER (WHERE status = 'RESOLVED') as resolved_reports,
    COUNT(*) FILTER (WHERE status = 'DISMISSED') as dismissed_reports,
    COUNT(DISTINCT reporter_id) as unique_reporters,
    COUNT(DISTINCT content_id) FILTER (WHERE content_type = 'USER') as reported_users
FROM reports
GROUP BY DATE(created_at);

-- Sample data for testing (only in development)
-- Uncomment the following lines for test data:

-- INSERT INTO subscriptions (user_id, tier, platform, is_active) 
-- SELECT id, 'GOLD', 'STRIPE', true FROM users LIMIT 5;

-- INSERT INTO push_tokens (user_id, token, platform) 
-- SELECT id, 'test_token_' || id, 'IOS' FROM users LIMIT 10;

-- Add comments for documentation
COMMENT ON TABLE push_tokens IS 'Stores push notification tokens for mobile devices';
COMMENT ON TABLE subscriptions IS 'Manages user subscription tiers and billing information';
COMMENT ON TABLE reports IS 'User-generated reports for content moderation';
COMMENT ON TABLE blocks IS 'User blocking relationships';
COMMENT ON TABLE verifications IS 'Profile verification attempts and results';
COMMENT ON TABLE moderation_queue IS 'Queue for content requiring manual moderation';
COMMENT ON TABLE daily_stats IS 'Aggregated daily statistics for analytics';
COMMENT ON COLUMN messages.media_duration IS 'Duration of voice messages in seconds';
COMMENT ON COLUMN users.daily_pops_used IS 'Number of balloon pops used today';
COMMENT ON COLUMN users.subscription_tier IS 'Current subscription tier: FREE, GOLD, or GLOWING';
