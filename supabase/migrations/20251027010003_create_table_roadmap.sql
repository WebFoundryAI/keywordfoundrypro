-- Migration: Create roadmap tables for public roadmap with voting
-- Allows users to view and vote on feature requests

CREATE TABLE IF NOT EXISTS public.roadmap_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('idea', 'planned', 'in-progress', 'done')) DEFAULT 'idea',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.roadmap_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.roadmap_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(item_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_roadmap_items_state ON public.roadmap_items(state);
CREATE INDEX idx_roadmap_items_created_at ON public.roadmap_items(created_at DESC);
CREATE INDEX idx_roadmap_votes_item_id ON public.roadmap_votes(item_id);
CREATE INDEX idx_roadmap_votes_user_id ON public.roadmap_votes(user_id);

-- Row Level Security
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_votes ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view roadmap items (public)
CREATE POLICY "Anyone can view roadmap items"
  ON public.roadmap_items
  FOR SELECT
  USING (true);

-- Policy: Only admins can create roadmap items
CREATE POLICY "Admins can create roadmap items"
  ON public.roadmap_items
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE role = 'admin'
    )
  );

-- Policy: Only admins can update roadmap items
CREATE POLICY "Admins can update roadmap items"
  ON public.roadmap_items
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE role = 'admin'
    )
  );

-- Policy: Only admins can delete roadmap items
CREATE POLICY "Admins can delete roadmap items"
  ON public.roadmap_items
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE role = 'admin'
    )
  );

-- Policy: Everyone can view votes (to show counts)
CREATE POLICY "Anyone can view votes"
  ON public.roadmap_votes
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can vote
CREATE POLICY "Authenticated users can vote"
  ON public.roadmap_votes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can remove their own votes
CREATE POLICY "Users can remove own votes"
  ON public.roadmap_votes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_roadmap_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamp
CREATE TRIGGER update_roadmap_items_updated_at
  BEFORE UPDATE ON public.roadmap_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_roadmap_updated_at();

-- Grant permissions
GRANT SELECT ON public.roadmap_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.roadmap_items TO authenticated;
GRANT SELECT ON public.roadmap_votes TO anon, authenticated;
GRANT INSERT, DELETE ON public.roadmap_votes TO authenticated;
