-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user has a role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.is_admin(auth.uid()));

-- Update profiles table RLS to allow admin access
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Update keyword_research table RLS to allow admin access
CREATE POLICY "Admins can view all keyword research"
ON public.keyword_research
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all keyword research"
ON public.keyword_research
FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete keyword research"
ON public.keyword_research
FOR DELETE
USING (public.is_admin(auth.uid()));

-- Update keyword_results table RLS to allow admin access
CREATE POLICY "Admins can view all keyword results"
ON public.keyword_results
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete keyword results"
ON public.keyword_results
FOR DELETE
USING (public.is_admin(auth.uid()));

-- Note: To grant admin role to a user, run:
-- INSERT INTO public.user_roles (user_id, role) 
-- VALUES ('user-uuid-here', 'admin')
-- Replace 'user-uuid-here' with the actual user UUID from auth.users