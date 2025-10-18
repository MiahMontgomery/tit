import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
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
  
  const res = await fetch(url, {
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
  const response = await apiRequest("GET", "/api/projects/overview", undefined, pat);
  return response.json();
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
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
   const result = await res.json();
      return (result as any).data ?? result;);
  };

export const queryClient = new Query
  Client({
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
