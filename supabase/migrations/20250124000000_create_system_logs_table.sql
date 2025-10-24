-- Create system_logs table for real-time logging
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
  function_name TEXT,
  message TEXT NOT NULL,
  metadata JSONB,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  request_id TEXT
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_function_name ON system_logs(function_name);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_request_id ON system_logs(request_id);

-- Enable RLS
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read logs
CREATE POLICY "Admins can read all logs"
  ON system_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policy: System (service role) can insert logs
CREATE POLICY "System can insert logs"
  ON system_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Automatically delete logs older than 7 days
CREATE OR REPLACE FUNCTION delete_old_system_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM system_logs
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- Create a scheduled job to clean up old logs (if pg_cron is enabled)
-- This is optional and requires pg_cron extension
-- SELECT cron.schedule('delete-old-logs', '0 2 * * *', 'SELECT delete_old_system_logs()');

COMMENT ON TABLE system_logs IS 'System logs from Edge Functions and application events. Automatically purged after 7 days.';
COMMENT ON COLUMN system_logs.level IS 'Log level: info, warn, error, or debug';
COMMENT ON COLUMN system_logs.function_name IS 'Name of the Edge Function that generated this log';
COMMENT ON COLUMN system_logs.request_id IS 'Correlation ID for tracing requests across services';
