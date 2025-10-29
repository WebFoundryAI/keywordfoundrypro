-- Create webhook_events table for idempotency tracking
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);

-- Auto-cleanup old events (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM webhook_events
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

COMMENT ON TABLE webhook_events IS 'Tracks processed webhook events for idempotency';
COMMENT ON FUNCTION cleanup_old_webhook_events IS 'Removes webhook events older than 30 days';
