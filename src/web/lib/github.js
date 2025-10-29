/**
 * GitHub Access Token Utility
 * 
 * Provides secure access to GitHub credentials from environment variables
 * instead of using files that might get committed to the repository.
 */

/**
 * Returns the GitHub access token from environment variables
 * Falls back to development token if in development mode and not set
 */
export function getGitHubAccessToken() {
  const token = process.env.GITHUB_ACCESS_TOKEN;
  
  if (!token) {
    console.error('GITHUB_ACCESS_TOKEN is not set in environment variables');
    
    // Only in development, we can return a fake token for testing
    if (process.env.NODE_ENV === 'development') {
      console.warn('Using a placeholder token for development. This will not work with real GitHub API calls.');
      return 'development_placeholder_token';
    }
    
    throw new Error('Missing GitHub access token. Please set GITHUB_ACCESS_TOKEN in your environment variables.');
  }
  
  return token;
}

/**
 * Creates headers with GitHub authentication
 * For use with the fetch API
 */
export function getGitHubAuthHeaders() {
  const token = getGitHubAccessToken();
  
  return {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json'
  };
} 