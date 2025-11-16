-- ============================================================================
-- Add Foreign Keys and Indexes for Database Integrity
-- ============================================================================
-- This migration adds foreign key constraints and indexes to prevent
-- orphaned data from being created in the future.
-- 
-- Run this BEFORE running the cleanup script for best results.
-- ============================================================================

BEGIN;

-- ============================================================================
-- Add indexes on foreign key columns (for performance)
-- ============================================================================

-- Indexes for matches table
CREATE INDEX IF NOT EXISTS idx_matches_round_id ON matches(round_id);

-- Indexes for rounds table
CREATE INDEX IF NOT EXISTS idx_rounds_user_id ON rounds(user_id);

-- Indexes for game_sessions table (only if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'game_sessions'
    ) THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id)';
    END IF;
END $$;

-- Indexes for predictions table (only if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'predictions'
    ) THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON predictions(user_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_predictions_session_id ON predictions(session_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_predictions_user_session ON predictions(user_id, session_id)';
    END IF;
END $$;

-- Indexes for subscriptions table (only if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'subscriptions'
    ) THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)';
    END IF;
END $$;

-- ============================================================================
-- Add foreign key constraints (if they don't already exist)
-- ============================================================================

-- Foreign key: matches.round_id -> rounds.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'matches_round_id_fkey'
          AND connamespace = 'public'::regnamespace
    ) THEN
        ALTER TABLE matches
        ADD CONSTRAINT matches_round_id_fkey
        FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
END $$;

-- Foreign key: rounds.user_id -> users.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'rounds_user_id_fkey'
          AND connamespace = 'public'::regnamespace
    ) THEN
        ALTER TABLE rounds
        ADD CONSTRAINT rounds_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
END $$;

-- Foreign key: game_sessions.user_id -> users.id (only if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'game_sessions'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'game_sessions_user_id_fkey'
              AND connamespace = 'public'::regnamespace
        ) THEN
            ALTER TABLE game_sessions
            ADD CONSTRAINT game_sessions_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;
        END IF;
    END IF;
END $$;

-- Foreign key: predictions.user_id -> users.id (only if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'predictions'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'predictions_user_id_fkey'
              AND connamespace = 'public'::regnamespace
        ) THEN
            ALTER TABLE predictions
            ADD CONSTRAINT predictions_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;
        END IF;
    END IF;
END $$;

-- Foreign key: predictions.session_id -> game_sessions.id (only if both tables exist)
DO $$
DECLARE
    predictions_exists BOOLEAN;
    game_sessions_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'predictions'
    ) INTO predictions_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'game_sessions'
    ) INTO game_sessions_exists;
    
    IF predictions_exists AND game_sessions_exists THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'predictions_session_id_fkey'
              AND connamespace = 'public'::regnamespace
        ) THEN
            ALTER TABLE predictions
            ADD CONSTRAINT predictions_session_id_fkey
            FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;
        END IF;
    END IF;
END $$;

-- Foreign key: subscriptions.user_id -> users.id (only if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'subscriptions'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'subscriptions_user_id_fkey'
              AND connamespace = 'public'::regnamespace
        ) THEN
            ALTER TABLE subscriptions
            ADD CONSTRAINT subscriptions_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;
        END IF;
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- Verify foreign keys were created (only for existing tables)
-- ============================================================================
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name IN (
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('matches', 'rounds', 'game_sessions', 'predictions', 'subscriptions')
    )
ORDER BY tc.table_name, kcu.column_name;

