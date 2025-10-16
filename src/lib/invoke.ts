import { supabase } from "@/integrations/supabase/client";

export async function invokeFunction(name: string, body: any) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Please sign in.");
  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  return data;
}
