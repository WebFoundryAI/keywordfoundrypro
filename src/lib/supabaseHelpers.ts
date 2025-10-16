import { supabase } from "@/integrations/supabase/client";

/**
 * Invoke a Supabase edge function with automatic authentication
 * @param name - The edge function name
 * @param body - The request body
 * @returns The function response data
 * @throws Error if not authenticated or function invocation fails
 */
export async function invokeWithAuth(name: string, body: any) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error("Please sign in to continue.");
  }
  
  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: { 
      Authorization: `Bearer ${session.access_token}` 
    },
  });
  
  if (error) throw error;
  
  return data;
}
