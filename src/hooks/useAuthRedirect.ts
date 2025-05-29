import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Custom hook for handling authentication redirects
 * 
 * Automatically redirects unauthenticated users to the home page
 * and provides loading and session states for components.
 * 
 * @returns Object containing session data, loading state, and authentication status
 */
export const useAuthRedirect = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  return { 
    session, 
    status, 
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated"
  };
}; 