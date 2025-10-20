-- Create research_spaces table for user research areas
CREATE TABLE public.research_spaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent multiple default spaces per user
CREATE UNIQUE INDEX idx_research_spaces_owner_default 
  ON public.research_spaces (owner_id, is_default) 
  WHERE is_default = true;

-- Enable RLS
ALTER TABLE public.research_spaces ENABLE ROW LEVEL SECURITY;

-- Users can view their own research spaces
CREATE POLICY "Users can view their own research spaces"
  ON public.research_spaces
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Users can create their own research spaces
CREATE POLICY "Users can create their own research spaces"
  ON public.research_spaces
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Users can update their own research spaces
CREATE POLICY "Users can update their own research spaces"
  ON public.research_spaces
  FOR UPDATE
  USING (auth.uid() = owner_id);

-- Users can delete their own research spaces
CREATE POLICY "Users can delete their own research spaces"
  ON public.research_spaces
  FOR DELETE
  USING (auth.uid() = owner_id);

-- Admins can view all research spaces
CREATE POLICY "Admins can view all research spaces"
  ON public.research_spaces
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Admins can manage all research spaces
CREATE POLICY "Admins can manage all research spaces"
  ON public.research_spaces
  FOR ALL
  USING (is_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_research_spaces_updated_at
  BEFORE UPDATE ON public.research_spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();