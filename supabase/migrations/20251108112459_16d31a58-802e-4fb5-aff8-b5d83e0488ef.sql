-- Allow anonymous users to view active subscription plans
CREATE POLICY "Public can view active subscription plans"
ON public.subscription_plans
FOR SELECT
TO anon
USING (is_active = true);