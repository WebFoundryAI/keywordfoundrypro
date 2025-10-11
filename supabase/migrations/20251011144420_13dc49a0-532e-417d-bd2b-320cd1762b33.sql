-- Fix critical security issue: Block direct user manipulation of usage tracking
-- Only allow usage modifications via security definer functions or by admins

-- Block direct user inserts on usage (only system functions should insert)
CREATE POLICY "Block direct user inserts on usage"
ON public.user_usage
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Block direct user updates on usage (only system functions should update)
CREATE POLICY "Block direct user updates on usage"
ON public.user_usage
FOR UPDATE
TO authenticated
USING (false);

-- Allow admins to manage usage data for support/debugging
CREATE POLICY "Admins can manage usage"
ON public.user_usage
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- Add security documentation
COMMENT ON TABLE public.user_usage IS 'Tracks user consumption of API resources. Direct modification blocked - use increment_usage() function only. Admins have full access for support.';