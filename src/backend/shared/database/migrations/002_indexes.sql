-- Migration: Add optimized indexes for Automated Meeting Minutes System
-- Version: 1.0.0
-- Description: Creates optimized database indexes for improved query performance

-- Disable statement timeout for long-running index creation
SET statement_timeout = 0;

-- Create indexes for meetings table
DO $$
BEGIN
    -- B-tree index for organizer lookups with included columns for common queries
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_meetings_organizer_lookup') THEN
        CREATE INDEX CONCURRENTLY idx_meetings_organizer_lookup 
        ON meetings (organizer_id)
        INCLUDE (title, start_time, status);
    END IF;

    -- BRIN index for time-range queries (efficient for sequential data)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_meetings_timerange') THEN
        CREATE INDEX CONCURRENTLY idx_meetings_timerange 
        ON meetings USING BRIN (start_time, end_time)
        WITH (pages_per_range = 128);
    END IF;

    -- Partial index for active meetings
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_meetings_active') THEN
        CREATE INDEX CONCURRENTLY idx_meetings_active 
        ON meetings (start_time)
        WHERE status = 'in_progress';
    END IF;

    -- GIN index for JSONB metadata with path operations
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_meetings_metadata_gin') THEN
        CREATE INDEX CONCURRENTLY idx_meetings_metadata_gin 
        ON meetings USING GIN (metadata jsonb_path_ops);
    END IF;

    -- GIN index for JSONB participants array
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_meetings_participants_gin') THEN
        CREATE INDEX CONCURRENTLY idx_meetings_participants_gin 
        ON meetings USING GIN (participants jsonb_path_ops);
    END IF;
END$$;

-- Create indexes for transcriptions table
DO $$
BEGIN
    -- Composite B-tree index for meeting-based queries with chronological order
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transcriptions_meeting_time') THEN
        CREATE INDEX CONCURRENTLY idx_transcriptions_meeting_time 
        ON transcriptions (meeting_id, timestamp);
    END IF;

    -- GiST index for full-text search on content
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transcriptions_content_search') THEN
        CREATE INDEX CONCURRENTLY idx_transcriptions_content_search 
        ON transcriptions USING GiST (to_tsvector('english', content));
    END IF;

    -- GIN index for speaker data JSONB
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transcriptions_speaker_gin') THEN
        CREATE INDEX CONCURRENTLY idx_transcriptions_speaker_gin 
        ON transcriptions USING GIN (speaker_data jsonb_path_ops);
    END IF;

    -- B-tree index for confidence score filtering
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transcriptions_confidence') THEN
        CREATE INDEX CONCURRENTLY idx_transcriptions_confidence 
        ON transcriptions (confidence_score)
        WHERE confidence_score IS NOT NULL;
    END IF;
END$$;

-- Create indexes for minutes table
DO $$
BEGIN
    -- Composite B-tree index for meeting minutes lookup
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_minutes_meeting_generated') THEN
        CREATE INDEX CONCURRENTLY idx_minutes_meeting_generated 
        ON minutes (meeting_id, generated_at);
    END IF;

    -- GiST index for full-text search on summary
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_minutes_summary_search') THEN
        CREATE INDEX CONCURRENTLY idx_minutes_summary_search 
        ON minutes USING GiST (to_tsvector('english', summary));
    END IF;

    -- GIN index for content JSONB
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_minutes_content_gin') THEN
        CREATE INDEX CONCURRENTLY idx_minutes_content_gin 
        ON minutes USING GIN (content jsonb_path_ops);
    END IF;

    -- B-tree index for content confidence filtering
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_minutes_confidence') THEN
        CREATE INDEX CONCURRENTLY idx_minutes_confidence 
        ON minutes (content_confidence)
        WHERE content_confidence IS NOT NULL;
    END IF;
END$$;

-- Create indexes for topics table
DO $$
BEGIN
    -- B-tree index for hierarchical topic queries
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_topics_hierarchy') THEN
        CREATE INDEX CONCURRENTLY idx_topics_hierarchy 
        ON topics (minutes_id, parent_topic_id);
    END IF;

    -- GiST index for full-text search on title and content
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_topics_content_search') THEN
        CREATE INDEX CONCURRENTLY idx_topics_content_search 
        ON topics USING GiST (to_tsvector('english', title || ' ' || content));
    END IF;

    -- B-tree index for relevance filtering
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_topics_relevance') THEN
        CREATE INDEX CONCURRENTLY idx_topics_relevance 
        ON topics (relevance_score DESC)
        WHERE relevance_score > 0.5;
    END IF;
END$$;

-- Create indexes for action_items table
DO $$
BEGIN
    -- Composite B-tree index for assignee queries
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_action_items_assignee') THEN
        CREATE INDEX CONCURRENTLY idx_action_items_assignee 
        ON action_items (assignee_id, due_date)
        INCLUDE (status, priority);
    END IF;

    -- Partial index for pending high-priority items
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_action_items_pending_high') THEN
        CREATE INDEX CONCURRENTLY idx_action_items_pending_high 
        ON action_items (due_date)
        WHERE status = 'pending' AND priority = 'high';
    END IF;
END$$;

-- Create indexes for decisions table
DO $$
BEGIN
    -- Composite B-tree index for chronological access
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_decisions_timeline') THEN
        CREATE INDEX CONCURRENTLY idx_decisions_timeline 
        ON decisions (minutes_id, timestamp);
    END IF;

    -- GiST index for full-text search on description
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_decisions_content_search') THEN
        CREATE INDEX CONCURRENTLY idx_decisions_content_search 
        ON decisions USING GiST (to_tsvector('english', description));
    END IF;

    -- GIN index for context JSONB
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_decisions_context_gin') THEN
        CREATE INDEX CONCURRENTLY idx_decisions_context_gin 
        ON decisions USING GIN (context jsonb_path_ops);
    END IF;
END$$;

-- Add index maintenance statistics tracking
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Analyze tables after index creation
ANALYZE meetings;
ANALYZE transcriptions;
ANALYZE minutes;
ANALYZE topics;
ANALYZE action_items;
ANALYZE decisions;