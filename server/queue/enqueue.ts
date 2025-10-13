import { taskQueue } from './index';

export interface Task {
  id: string;
  projectId: string;
  type: string;
  data: any;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export async function enqueuePromptInjection(projectId: string, prompt: string): Promise<string> {
  return taskQueue.enqueue({
    projectId,
    type: 'service:input.injectPrompt',
    payload: { projectId, prompt }
  });
}