/**
 * Auth helper functions for Clerk integration
 * Maintains compatibility with existing app user interface
 */

import { useUser } from '@clerk/react-router';

/**
 * Returns current user in format compatible with existing components
 */
export function useCurrentUser() {
  const { user, isLoaded } = useUser();
  
  if (!isLoaded) {
    return { user: null, loading: true };
  }

  if (!user) {
    return { user: null, loading: false };
  }

  // Map Clerk user to our app's expected format
  const appUser = {
    id: user.id,
    email: user.primaryEmailAddress?.emailAddress || '',
    user_metadata: {
      full_name: user.fullName || '',
      name: user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}`
        : user.firstName || user.lastName || '',
      avatar_url: user.imageUrl || '',
    }
  };

  return { user: appUser, loading: false };
}
