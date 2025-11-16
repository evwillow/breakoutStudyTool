-- ============================================================================
-- Database Cleanup Script for Supabase
-- ============================================================================
-- This script safely cleans up orphaned data, empty rounds, and bad records
-- 
-- INSTRUCTIONS:
-- 1. First run the ANALYSIS section to see what will be deleted
-- 2. Review the counts carefully
-- 3. Run the cleanup sections in order (they're already properly ordered)
-- 4. Each cleanup is wrapped in a transaction for safety
-- 5. Run FINAL VERIFICATION after cleanup
-- ============================================================================

-- ============================================================================
-- STEP 1: ANALYSIS - Check what will be deleted (run this first!)
-- ============================================================================

-- Count orphaned matches (matches without valid round_id)
SELECT 
    'Orphaned Matches' as cleanup_type,
    COUNT(*) as count_to_delete
FROM matches m
WHERE NOT EXISTS (
    SELECT 1 FROM rounds r WHERE r.id = m.round_id
);

-- Count orphaned rounds (rounds without valid user_id)
SELECT 
    'Orphaned Rounds' as cleanup_type,
    COUNT(*) as count_to_delete
FROM rounds r
WHERE NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = r.user_id
);

-- Count empty rounds (rounds with no matches)
SELECT 
    'Empty Rounds' as cleanup_type,
    COUNT(*) as count_to_delete
FROM rounds r
WHERE NOT EXISTS (
    SELECT 1 FROM matches m WHERE m.round_id = r.id
);

-- Count orphaned game_sessions (only if table exists)
DO $$
DECLARE
    count_result INTEGER;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'game_sessions'
    ) THEN
        EXECUTE '
            SELECT COUNT(*) 
            FROM game_sessions gs
            WHERE NOT EXISTS (
                SELECT 1 FROM users u WHERE u.id = gs.user_id
            )
        ' INTO count_result;
        RAISE NOTICE 'Orphaned Game Sessions: %', count_result;
    ELSE
        RAISE NOTICE 'Table game_sessions does not exist - skipping';
    END IF;
END $$;

-- Count orphaned predictions (only if table exists)
DO $$
DECLARE
    count_result INTEGER;
    game_sessions_exists BOOLEAN;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'predictions'
    ) THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'game_sessions'
        ) INTO game_sessions_exists;
        
        IF game_sessions_exists THEN
            EXECUTE '
                SELECT COUNT(*) 
                FROM predictions p
                WHERE NOT EXISTS (
                    SELECT 1 FROM users u WHERE u.id = p.user_id
                )
                   OR NOT EXISTS (
                    SELECT 1 FROM game_sessions gs WHERE gs.id = p.session_id
                )
            ' INTO count_result;
        ELSE
            EXECUTE '
                SELECT COUNT(*) 
                FROM predictions p
                WHERE NOT EXISTS (
                    SELECT 1 FROM users u WHERE u.id = p.user_id
                )
            ' INTO count_result;
        END IF;
        RAISE NOTICE 'Orphaned Predictions: %', count_result;
    ELSE
        RAISE NOTICE 'Table predictions does not exist - skipping';
    END IF;
END $$;

-- Count orphaned subscriptions (only if table exists)
DO $$
DECLARE
    count_result INTEGER;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'subscriptions'
    ) THEN
        EXECUTE '
            SELECT COUNT(*) 
            FROM subscriptions s
            WHERE NOT EXISTS (
                SELECT 1 FROM users u WHERE u.id = s.user_id
            )
        ' INTO count_result;
        RAISE NOTICE 'Orphaned Subscriptions: %', count_result;
    ELSE
        RAISE NOTICE 'Table subscriptions does not exist - skipping';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: CLEANUP - Delete bad data (ordered: children before parents)
-- ============================================================================

-- CLEANUP 1: Delete orphaned predictions (depends on game_sessions + users)
DO $$
DECLARE
    deleted_count INTEGER;
    table_exists BOOLEAN;
    game_sessions_exists BOOLEAN;
BEGIN
    -- Check if predictions table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'predictions'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        RAISE NOTICE 'Table predictions does not exist - skipping cleanup';
        RETURN;
    END IF;
    
    -- Check if game_sessions table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'game_sessions'
    ) INTO game_sessions_exists;
    
    RAISE WARNING 'Deleting orphaned predictions...';
    
    IF game_sessions_exists THEN
        DELETE FROM predictions
        WHERE NOT EXISTS (
            SELECT 1 FROM users u WHERE u.id = predictions.user_id
        )
           OR NOT EXISTS (
            SELECT 1 FROM game_sessions gs WHERE gs.id = predictions.session_id
        );
    ELSE
        -- If game_sessions doesn't exist, only check user_id
        DELETE FROM predictions
        WHERE NOT EXISTS (
            SELECT 1 FROM users u WHERE u.id = predictions.user_id
        );
    END IF;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % orphaned predictions', deleted_count;
END $$;

-- CLEANUP 2: Delete orphaned game_sessions (depends on users)
DO $$
DECLARE
    deleted_count INTEGER;
    table_exists BOOLEAN;
BEGIN
    -- Check if game_sessions table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'game_sessions'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        RAISE NOTICE 'Table game_sessions does not exist - skipping cleanup';
        RETURN;
    END IF;
    
    RAISE WARNING 'Deleting orphaned game_sessions...';
    
    DELETE FROM game_sessions
    WHERE NOT EXISTS (
        SELECT 1 FROM users u WHERE u.id = game_sessions.user_id
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % orphaned game_sessions', deleted_count;
END $$;

-- CLEANUP 3: Delete orphaned matches (depends on rounds)
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    RAISE WARNING 'Deleting orphaned matches...';
    
    DELETE FROM matches
    WHERE NOT EXISTS (
        SELECT 1 FROM rounds r WHERE r.id = matches.round_id
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % orphaned matches', deleted_count;
END $$;

-- CLEANUP 4: Delete empty rounds (rounds with no matches)
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    RAISE WARNING 'Deleting empty rounds...';
    
    DELETE FROM rounds
    WHERE NOT EXISTS (
        SELECT 1 FROM matches m WHERE m.round_id = rounds.id
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % empty rounds', deleted_count;
END $$;

-- CLEANUP 5: Delete orphaned rounds (depends on users)
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    RAISE WARNING 'Deleting orphaned rounds...';
    
    DELETE FROM rounds
    WHERE NOT EXISTS (
        SELECT 1 FROM users u WHERE u.id = rounds.user_id
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % orphaned rounds', deleted_count;
END $$;

-- CLEANUP 6: Delete orphaned subscriptions (depends on users)
DO $$
DECLARE
    deleted_count INTEGER;
    table_exists BOOLEAN;
BEGIN
    -- Check if subscriptions table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'subscriptions'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        RAISE NOTICE 'Table subscriptions does not exist - skipping cleanup';
        RETURN;
    END IF;
    
    RAISE WARNING 'Deleting orphaned subscriptions...';
    
    DELETE FROM subscriptions
    WHERE NOT EXISTS (
        SELECT 1 FROM users u WHERE u.id = subscriptions.user_id
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % orphaned subscriptions', deleted_count;
END $$;

-- ============================================================================
-- STEP 3: FINAL VERIFICATION - Check that cleanup was successful
-- ============================================================================

-- Run this after cleanup to verify no orphaned data remains
SELECT 
    'Final Check - Orphaned Matches' as check_type,
    COUNT(*) as remaining_count
FROM matches m
WHERE NOT EXISTS (
    SELECT 1 FROM rounds r WHERE r.id = m.round_id
)
UNION ALL
SELECT 
    'Final Check - Orphaned Rounds' as check_type,
    COUNT(*) as remaining_count
FROM rounds r
WHERE NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = r.user_id
)
UNION ALL
SELECT 
    'Final Check - Empty Rounds' as check_type,
    COUNT(*) as remaining_count
FROM rounds r
WHERE NOT EXISTS (
    SELECT 1 FROM matches m WHERE m.round_id = r.id
);

-- Final verification for optional tables (game_sessions, predictions, subscriptions)
DO $$
DECLARE
    count_result INTEGER;
    game_sessions_exists BOOLEAN;
    predictions_exists BOOLEAN;
    subscriptions_exists BOOLEAN;
BEGIN
    -- Check game_sessions
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'game_sessions'
    ) INTO game_sessions_exists;
    
    IF game_sessions_exists THEN
        EXECUTE '
            SELECT COUNT(*) 
            FROM game_sessions gs
            WHERE NOT EXISTS (
                SELECT 1 FROM users u WHERE u.id = gs.user_id
            )
        ' INTO count_result;
        RAISE NOTICE 'Final Check - Orphaned Game Sessions: %', count_result;
    END IF;
    
    -- Check predictions
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'predictions'
    ) INTO predictions_exists;
    
    IF predictions_exists THEN
        IF game_sessions_exists THEN
            EXECUTE '
                SELECT COUNT(*) 
                FROM predictions p
                WHERE NOT EXISTS (
                    SELECT 1 FROM users u WHERE u.id = p.user_id
                )
                   OR NOT EXISTS (
                    SELECT 1 FROM game_sessions gs WHERE gs.id = p.session_id
                )
            ' INTO count_result;
        ELSE
            EXECUTE '
                SELECT COUNT(*) 
                FROM predictions p
                WHERE NOT EXISTS (
                    SELECT 1 FROM users u WHERE u.id = p.user_id
                )
            ' INTO count_result;
        END IF;
        RAISE NOTICE 'Final Check - Orphaned Predictions: %', count_result;
    END IF;
    
    -- Check subscriptions
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'subscriptions'
    ) INTO subscriptions_exists;
    
    IF subscriptions_exists THEN
        EXECUTE '
            SELECT COUNT(*) 
            FROM subscriptions s
            WHERE NOT EXISTS (
                SELECT 1 FROM users u WHERE u.id = s.user_id
            )
        ' INTO count_result;
        RAISE NOTICE 'Final Check - Orphaned Subscriptions: %', count_result;
    END IF;
END $$;

-- ============================================================================
-- OPTIONAL: Vacuum and analyze for performance (run after cleanup)
-- ============================================================================
VACUUM ANALYZE;
