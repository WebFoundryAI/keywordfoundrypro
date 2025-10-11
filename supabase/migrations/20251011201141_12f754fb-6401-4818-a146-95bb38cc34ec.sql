-- Drop existing RLS policy for viewing keyword results
DROP POLICY IF EXISTS "Users can view keyword results for their research" ON public.keyword_results;

-- Recreate policy with admin access
CREATE POLICY "Users can view keyword results for their research" 
ON public.keyword_results 
FOR SELECT 
USING (
  -- Allow admins to view all results
  is_admin(auth.uid())
  OR
  -- Allow users to view their own research results
  research_id IN (
    SELECT id FROM public.keyword_research 
    WHERE user_id = auth.uid()
  )
);