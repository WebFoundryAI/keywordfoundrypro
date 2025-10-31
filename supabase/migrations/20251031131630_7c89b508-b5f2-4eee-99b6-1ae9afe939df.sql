-- Add missing tables and soft-delete columns

-- Create audit_events table
CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  project_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create exports table  
CREATE TABLE IF NOT EXISTS public.exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  research_id uuid,
  format text NOT NULL,
  file_url text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Create clusters table
CREATE TABLE IF NOT EXISTS public.clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  research_id uuid,
  name text NOT NULL,
  keywords jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Create cached_results table
CREATE TABLE IF NOT EXISTS public.cached_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  deleted_at timestamptz
);

-- Add deleted_at column to existing tables for soft-delete
ALTER TABLE public.keyword_research ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.project_snapshots ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Add RLS policies for new tables
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cached_results ENABLE ROW LEVEL SECURITY;

-- Audit events policies
CREATE POLICY "Users can view their own audit events" ON public.audit_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audit events" ON public.audit_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit events" ON public.audit_events
  FOR SELECT USING (is_admin(auth.uid()));

-- Exports policies
CREATE POLICY "Users can view their own exports" ON public.exports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own exports" ON public.exports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all exports" ON public.exports
  FOR ALL USING (is_admin(auth.uid()));

-- Clusters policies
CREATE POLICY "Users can view their own clusters" ON public.clusters
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own clusters" ON public.clusters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clusters" ON public.clusters
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clusters" ON public.clusters
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all clusters" ON public.clusters
  FOR ALL USING (is_admin(auth.uid()));

-- Cached results policies (service-level access)
CREATE POLICY "Service can manage cached results" ON public.cached_results
  FOR ALL USING (true);