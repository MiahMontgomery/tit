import { QueryClient, QueryFunction } from "@tanstack/react-query";

const API_BASE = import.meta.env.VITE_API_BASE || '';

// Log API base on module load (will show in browser console)
console.log('[queryClient] VITE_API_BASE:', import.meta.env.VITE_API_BASE || '(not set)');
console.log('[queryClient] API_BASE resolved to:', API_BASE || '(empty - will use relative URLs)');

export function getApiUrl(path: string): string {
  // If path already includes the base URL, use it as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // Otherwise prepend the base URL
  const fullUrl = `${API_BASE}${path}`;
  
  // Always log to help debug (even in production)
  console.log('[getApiUrl]', path, '->', fullUrl);
  
  return fullUrl;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Read response as text first (can only read once)
    const text = await res.text() || res.statusText;
    
    // Try to parse as JSON to preserve error codes
    let errorData: any = null;
    try {
      errorData = JSON.parse(text);
    } catch {
      // Not JSON, use text
    }
    
    if (errorData && errorData.errorCode) {
      // Structured error response with error code
      const error: any = new Error(errorData.message || errorData.error || res.statusText);
      error.response = { status: res.status, data: errorData };
      error.data = errorData;
      throw error;
    } else {
      // Plain text or non-structured error
      const error: any = new Error(`${res.status}: ${text}`);
      error.response = { status: res.status };
      error.data = {
        errorCode: `ERR_HTTP_${res.status}`,
        message: text || res.statusText,
        status: res.status
      };
      throw error;
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  pat?: string,
): Promise<Response> {
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};

  if (pat) {
    headers["Authorization"] = `Bearer ${pat}`;
  }

  const fullUrl = getApiUrl(url);
  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

export async function createProject(data: { name: string; description: string; features: string[] }, pat?: string) {
  const response = await apiRequest("POST", "/api/projects", data, pat);
  return response.json();
}

export async function getProjectsOverview(pat?: string) {
  try {
    const response = await apiRequest("GET", "/api/projects", undefined, pat);
    const data = await response.json();
    
    // If response indicates error, preserve error code structure
    if (data.ok === false) {
      const error: any = new Error(data.message || data.error || 'Failed to fetch projects');
      error.data = {
        errorCode: data.errorCode || 'ERR_UNKNOWN',
        message: data.message || data.error,
        details: data.details,
        prismaCode: data.prismaCode,
        meta: data.meta
      };
      throw error;
    }
    
    // Handle different response formats: { ok: true, projects } or { success: true, data: [...] } or just array
    if (data.projects && Array.isArray(data.projects)) {
      return data.projects;
    }
    if (data.data && Array.isArray(data.data)) {
      return data.data;
    }
    if (Array.isArray(data)) {
      return data;
    }
    
    console.warn('Unexpected projects response format:', data);
    return [];
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    
    // Preserve error structure from API
    if (error.data) {
      throw error;
    }
    
    // If it's a network error, wrap it with error code
    if (error.message && error.message.includes('fetch')) {
      const networkError: any = new Error('Network request failed');
      networkError.data = {
        errorCode: 'ERR_NETWORK',
        message: error.message,
        details: 'Could not reach the server. Check your internet connection and API base URL.'
      };
      throw networkError;
    }
    
    // If response has error data (from throwIfResNotOk)
    if (error.message) {
      const apiError: any = new Error(error.message);
      apiError.data = {
        errorCode: 'ERR_API_RESPONSE',
        message: error.message,
        details: 'Server returned an error response'
      };
      throw apiError;
    }
    
    // Fallback
    const unknownError: any = new Error('Unknown error occurred');
    unknownError.data = {
      errorCode: 'ERR_UNKNOWN',
      message: 'Failed to fetch projects',
      details: 'An unexpected error occurred'
    };
    throw unknownError;
  }
}

export async function getProjectHierarchy(projectId: string, pat?: string) {
  const response = await apiRequest("GET", `/api/hierarchy/${projectId}`, undefined, pat);
  return response.json();
}

export async function planProjectHierarchy(projectId: string, pat?: string) {
  const response = await apiRequest("POST", `/api/hierarchy/${projectId}/plan`, undefined, pat);
  return response.json();
}

export async function updateMilestoneState(milestoneId: string, state: string, pat?: string) {
  const response = await apiRequest("PATCH", `/api/milestones/${milestoneId}/state`, { state }, pat);
  return response.json();
}

export async function updateGoalState(goalId: string, state: string, pat?: string) {
  const response = await apiRequest("PATCH", `/api/goals/${goalId}/state`, { state }, pat);
  return response.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: { on401: UnauthorizedBehavior }) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const url = getApiUrl(queryKey.join("/") as string);
      const res = await fetch(url, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null as any;
      }

      await throwIfResNotOk(res);
      const result = await res.json();
      return (result as any).data ?? result;
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Helper function for direct fetch calls with API base URL
export async function fetchApi(url: string, options?: RequestInit): Promise<Response> {
  const apiUrl = getApiUrl(url);
  
  // Log in development to debug API calls
  if (import.meta.env.DEV) {
    console.log('[fetchApi]', options?.method || 'GET', apiUrl, {
      hasBody: !!options?.body,
      headers: options?.headers,
      hasSignal: !!options?.signal
    });
  }
  
  try {
    const response = await fetch(apiUrl, {
      ...options,
      credentials: "include",
      // Ensure signal is passed through for timeout handling
      signal: options?.signal,
    });
    
    // Log errors in development
    if (import.meta.env.DEV && !response.ok) {
      console.error('[fetchApi] Error:', response.status, response.statusText, apiUrl);
    }
    
    return response;
  } catch (error: any) {
    // Log network errors
    console.error('[fetchApi] Network error:', error, apiUrl);
    
    // If it's an AbortError, preserve it
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      const abortError: any = new Error('Request was aborted');
      abortError.name = 'AbortError';
      abortError.cause = error;
      throw abortError;
    }
    
    throw error;
  }
}
