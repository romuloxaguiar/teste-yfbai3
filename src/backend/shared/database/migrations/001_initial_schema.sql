-- Initial database migration for Automated Meeting Minutes System
-- Version: 1.0.0
-- Description: Creates core schema with tables, relationships, and advanced features

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create custom types
CREATE TYPE meeting_status AS ENUM (
    'scheduled', 'in_progress', 'completed', 'cancelled', 'failed', 'archived'
);

CREATE TYPE minutes_status AS ENUM (
    'queued', 'processing', 'generated', 'distributed', 'error', 'archived'
);

CREATE TYPE transcription_status AS ENUM (
    'initializing', 'recording', 'processing', 'completed', 'error', 'archived'
);

CREATE TYPE security_classification AS ENUM (
    'public', 'internal', 'confidential', 'restricted'
);

CREATE TYPE action_item_status AS ENUM (
    'pending', 'in_progress', 'completed'
);

CREATE TYPE priority_level AS ENUM (
    'high', 'medium', 'low'
);

CREATE TYPE impact_level AS ENUM (
    'high', 'medium', 'low'
);

-- Create meetings table with partitioning
CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    status meeting_status NOT NULL DEFAULT 'scheduled',
    participants JSONB NOT NULL DEFAULT '[]',
    metadata JSONB NOT NULL DEFAULT '{}',
    security_classification security_classification NOT NULL DEFAULT 'internal',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    sys_period tstzrange NOT NULL DEFAULT tstzrange(CURRENT_TIMESTAMP, null)
) PARTITION BY RANGE (start_time);

-- Create transcriptions table with partitioning
CREATE TABLE transcriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    status transcription_status NOT NULL DEFAULT 'initializing',
    speaker_data JSONB NOT NULL DEFAULT '[]',
    metadata JSONB NOT NULL DEFAULT '{}',
    confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
    security_classification security_classification NOT NULL DEFAULT 'internal',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sys_period tstzrange NOT NULL DEFAULT tstzrange(CURRENT_TIMESTAMP, null)
) PARTITION BY RANGE (timestamp);

-- Create minutes table
CREATE TABLE minutes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    status minutes_status NOT NULL DEFAULT 'queued',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    content_confidence FLOAT CHECK (content_confidence >= 0 AND content_confidence <= 1),
    metadata JSONB NOT NULL DEFAULT '{}',
    security_classification security_classification NOT NULL DEFAULT 'internal',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create topics table
CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    minutes_id UUID NOT NULL REFERENCES minutes(id) ON DELETE CASCADE,
    parent_topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
    relevance_score FLOAT CHECK (relevance_score >= 0 AND relevance_score <= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create action_items table
CREATE TABLE action_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    minutes_id UUID NOT NULL REFERENCES minutes(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    assignee_id VARCHAR(255) NOT NULL,
    due_date TIMESTAMPTZ,
    status action_item_status NOT NULL DEFAULT 'pending',
    priority priority_level NOT NULL DEFAULT 'medium',
    confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create decisions table
CREATE TABLE decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    minutes_id UUID NOT NULL REFERENCES minutes(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    made_by VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    impact impact_level NOT NULL DEFAULT 'medium',
    confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
    context JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create history tables for temporal data
CREATE TABLE meetings_history (LIKE meetings);
CREATE TABLE transcriptions_history (LIKE transcriptions);

-- Create initial partitions for meetings
CREATE TABLE meetings_2024_q1 PARTITION OF meetings
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
CREATE TABLE meetings_2024_q2 PARTITION OF meetings
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');

-- Create initial partitions for transcriptions
CREATE TABLE transcriptions_2024_q1 PARTITION OF transcriptions
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
CREATE TABLE transcriptions_2024_q2 PARTITION OF transcriptions
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');

-- Create indexes for performance optimization
CREATE INDEX idx_meetings_organizer ON meetings(organizer_id);
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_meetings_start_time ON meetings(start_time);
CREATE INDEX idx_transcriptions_meeting ON transcriptions(meeting_id, timestamp);
CREATE INDEX idx_transcriptions_status ON transcriptions(status);
CREATE INDEX idx_minutes_meeting ON minutes(meeting_id);
CREATE INDEX idx_minutes_status ON minutes(status);
CREATE INDEX idx_action_items_assignee ON action_items(assignee_id);
CREATE INDEX idx_action_items_status ON action_items(status);
CREATE INDEX idx_topics_minutes ON topics(minutes_id);
CREATE INDEX idx_decisions_minutes ON decisions(minutes_id);

-- Create GIN indexes for JSONB columns
CREATE INDEX idx_meetings_metadata ON meetings USING GIN (metadata);
CREATE INDEX idx_meetings_participants ON meetings USING GIN (participants);
CREATE INDEX idx_transcriptions_speaker_data ON transcriptions USING GIN (speaker_data);
CREATE INDEX idx_minutes_content ON minutes USING GIN (content);

-- Add audit triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meetings_updated_at
    BEFORE UPDATE ON meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER transcriptions_updated_at
    BEFORE UPDATE ON transcriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER minutes_updated_at
    BEFORE UPDATE ON minutes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER action_items_updated_at
    BEFORE UPDATE ON action_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();