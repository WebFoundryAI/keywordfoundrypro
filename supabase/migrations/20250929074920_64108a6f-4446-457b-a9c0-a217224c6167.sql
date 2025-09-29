-- Create user profiles table with automatic profile creation trigger
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create keyword research results table
CREATE TABLE public.keyword_research (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seed_keyword TEXT NOT NULL,
  language_code TEXT NOT NULL DEFAULT 'en',
  location_code INTEGER NOT NULL DEFAULT 2840,
  results_limit INTEGER NOT NULL DEFAULT 100,
  total_results INTEGER,
  api_cost DECIMAL(10,4),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on keyword research
ALTER TABLE public.keyword_research ENABLE ROW LEVEL SECURITY;

-- Create policies for keyword research
CREATE POLICY "Users can view their own keyword research" 
ON public.keyword_research 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own keyword research" 
ON public.keyword_research 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own keyword research" 
ON public.keyword_research 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create keyword results table
CREATE TABLE public.keyword_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  research_id UUID NOT NULL REFERENCES public.keyword_research(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  search_volume INTEGER,
  cpc DECIMAL(10,4),
  intent TEXT,
  difficulty INTEGER,
  suggestions TEXT[], 
  related_keywords TEXT[],
  cluster_id TEXT,
  metrics_source TEXT DEFAULT 'dataforseo_labs',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on keyword results
ALTER TABLE public.keyword_results ENABLE ROW LEVEL SECURITY;

-- Create policies for keyword results (via research_id relationship)
CREATE POLICY "Users can view keyword results for their research" 
ON public.keyword_results 
FOR SELECT 
USING (
  research_id IN (
    SELECT id FROM public.keyword_research 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert keyword results for their research" 
ON public.keyword_results 
FOR INSERT 
WITH CHECK (
  research_id IN (
    SELECT id FROM public.keyword_research 
    WHERE user_id = auth.uid()
  )
);

-- Create function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_keyword_research_updated_at
  BEFORE UPDATE ON public.keyword_research
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();