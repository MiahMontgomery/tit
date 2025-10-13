export interface Event {
  id: string;
  ts: string;
  kind: 'status' | 'proof.created' | 'artifact.created' | 'decision.auto' | 'question';
  projectId: string;
  runId?: string;
  summary?: string;
  data?: Record<string, unknown>;
}

class EventBus {
  private eventCounter = 0;
  private buffer: Event[] = [];
  private subscribers: Array<{
    projectId?: string;
    lastId?: string;
    callback: (e: Event) => void;
  }> = [];

  emit(e: Event): void {
    // Add to buffer (ring buffer of 1000 events)
    this.buffer.push(e);
    if (this.buffer.length > 1000) {
      this.buffer.shift();
    }
    
    // Notify all matching subscribers
    this.subscribers.forEach(sub => {
      if (!sub.projectId || sub.projectId === e.projectId) {
        if (!sub.lastId || this.isEventAfter(e, sub.lastId)) {
          sub.callback(e);
        }
      }
    });
  }

  subscribe(
    opts: { projectId?: string; lastId?: string },
    onEvent: (e: Event) => void
  ): { unsubscribe(): void } {
    // Replay events since lastId
    const startIndex = opts.lastId ? this.buffer.findIndex(e => e.id === opts.lastId) + 1 : 0;
    const relevantEvents = this.buffer
      .slice(startIndex)
      .filter(e => !opts.projectId || e.projectId === opts.projectId);
    
    relevantEvents.forEach(onEvent);
    
    // Add subscriber
    const subscriber = {
      projectId: opts.projectId,
      lastId: opts.lastId,
      callback: onEvent
    };
    this.subscribers.push(subscriber);
    
    return {
      unsubscribe: () => {
        const index = this.subscribers.indexOf(subscriber);
        if (index > -1) {
          this.subscribers.splice(index, 1);
        }
      }
    };
  }

  private isEventAfter(event: Event, lastId: string): boolean {
    const lastEvent = this.buffer.find(e => e.id === lastId);
    if (!lastEvent) return true;
    return new Date(event.ts) > new Date(lastEvent.ts);
  }
}

export const eventBus = new EventBus();
export const emit = eventBus.emit.bind(eventBus);
export const subscribe = eventBus.subscribe.bind(eventBus);
