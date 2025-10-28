-- Create status_components table for tracking system component health
CREATE TABLE IF NOT EXISTS status_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'operational' CHECK (status IN ('operational', 'degraded', 'outage', 'maintenance')),
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create status_incidents table for tracking incidents
CREATE TABLE IF NOT EXISTS status_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'investigating' CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  severity TEXT NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor', 'major', 'critical')),
  component_id UUID REFERENCES status_components(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Create status_incident_updates table for incident timeline
CREATE TABLE IF NOT EXISTS status_incident_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES status_incidents(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_status_incidents_created_at ON status_incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_incidents_status ON status_incidents(status);
CREATE INDEX IF NOT EXISTS idx_status_incident_updates_incident_id ON status_incident_updates(incident_id);
CREATE INDEX IF NOT EXISTS idx_status_components_display_order ON status_components(display_order);

-- Enable RLS
ALTER TABLE status_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_incident_updates ENABLE ROW LEVEL SECURITY;

-- Public can read all status data
CREATE POLICY "Public can view status components" ON status_components
  FOR SELECT USING (true);

CREATE POLICY "Public can view status incidents" ON status_incidents
  FOR SELECT USING (true);

CREATE POLICY "Public can view incident updates" ON status_incident_updates
  FOR SELECT USING (true);

-- Only admins can modify status data (admin check done at application layer)
CREATE POLICY "Admins can insert status components" ON status_components
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update status components" ON status_components
  FOR UPDATE USING (true);

CREATE POLICY "Admins can delete status components" ON status_components
  FOR DELETE USING (true);

CREATE POLICY "Admins can insert incidents" ON status_incidents
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update incidents" ON status_incidents
  FOR UPDATE USING (true);

CREATE POLICY "Admins can delete incidents" ON status_incidents
  FOR DELETE USING (true);

CREATE POLICY "Admins can insert incident updates" ON status_incident_updates
  FOR INSERT WITH CHECK (true);

-- Seed default components
INSERT INTO status_components (name, description, status, display_order) VALUES
  ('API', 'Core API services', 'operational', 1),
  ('Database', 'PostgreSQL database', 'operational', 2),
  ('DataForSEO', 'DataForSEO API integration', 'operational', 3),
  ('Authentication', 'User authentication system', 'operational', 4),
  ('Web Application', 'Main web application', 'operational', 5)
ON CONFLICT (name) DO NOTHING;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_status_components_updated_at
  BEFORE UPDATE ON status_components
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_status_incidents_updated_at
  BEFORE UPDATE ON status_incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
