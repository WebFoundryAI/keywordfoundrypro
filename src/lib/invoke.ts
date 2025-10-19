import { supabase } from "@/integrations/supabase/client";

/**
 * Custom error class for DataForSEO API errors
 */
export class DataForSEOApiError extends Error {
  errorCode: string;
  statusCode: number;
  isRateLimit: boolean;
  isCreditsExhausted: boolean;
  
  constructor(message: string, errorCode: string, statusCode: number) {
    super(message);
    this.name = 'DataForSEOApiError';
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.isRateLimit = errorCode === 'RATE_LIMIT';
    this.isCreditsExhausted = errorCode === 'CREDITS_EXHAUSTED';
  }
}

export async function invokeFunction(name: string, body: any) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Please sign in.");
  
  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  
  // Check if the response contains DataForSEO specific error codes
  if (data?.error_code === 'RATE_LIMIT') {
    throw new DataForSEOApiError(
      data.error || 'DataForSEO rate limit exceeded. Please try again in a few minutes.',
      'RATE_LIMIT',
      429
    );
  }
  
  if (data?.error_code === 'CREDITS_EXHAUSTED') {
    throw new DataForSEOApiError(
      data.error || 'DataForSEO API credits exhausted. Please add credits to your DataForSEO account.',
      'CREDITS_EXHAUSTED',
      402
    );
  }
  
  if (error) throw error;
  return data;
}
