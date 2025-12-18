
// src/utils/AGUIClient.ts (reverted to EventSource-based SSE client)
import EventSource from 'react-native-sse';
import { apply_patch } from 'jsonpatch';

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type AgentState = Record<string, any>;

type AGUIEvent =
  | { type: 'TEXT_MESSAGE_CONTENT'; delta: string }
  | { type: 'MESSAGE_START'; messageId: string }
  | { type: 'MESSAGE_END'; messageId: string }
  | { type: 'STATE_DELTA'; patch: any[] }
  | { type: 'TOOL_CALL_START'; name: string; args: any }
  | { type: 'TOOL_CALL_END'; name: string; result: any }
  | { type: 'REQUEST_HUMAN_INPUT'; prompt: string; options?: string[] }
  | { type: 'THREAD_START' | 'THREAD_END' };

type Listener = {
  onMessageDelta: (delta: string) => void;
  onStateUpdate: (newState: AgentState) => void;
  onToolStart: (name: string, args: any) => void;
  onToolEnd: (name: string, result: any) => void;
  onHumanInputRequest: (prompt: string, options?: string[]) => Promise<any>;
  onError: (error: string) => void;
};

export class AGUIClient {
  private es: EventSource | null = null;
  private currentState: AgentState = {};
  private listeners: Partial<Listener> = {};
  private sessionId: string | null = null;

  constructor(private endpoint: string) {}

  setListeners(listeners: Partial<Listener>) {
    this.listeners = listeners;
  }

  async sendMessage(userMessage: string, initialState: AgentState = {}) {
    this.currentState = { ...this.currentState, ...initialState };

    const stateToSend = { ...this.currentState };
    delete stateToSend.dsl; // server owns DSL

    // Close any previous stream before starting a new one to avoid duplicate listeners
    this.es?.close();

    this.es = new EventSource(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: userMessage }],
        state: stateToSend,
        sessionId: this.sessionId,
      }),
    });

    this.es.addEventListener('message', (event: any) => {
      if (event.data === '[DONE]') {
        this.es?.close();
        return;
      }
      try {
        const data: any = JSON.parse(event.data);
        this.handleEvent(data);
      } catch (e) {
        // ignore parse errors
      }
    });

    this.es.addEventListener('error', (_err: any) => {
      this.listeners.onError?.('Connection interrupted');
      this.es?.close();
    });
  }

  private handleEvent(event: AGUIEvent | { type: 'SESSION_INIT'; sessionId: string }) {
    switch (event.type) {
      case 'SESSION_INIT':
        this.sessionId = event.sessionId;
        break;
      case 'TEXT_MESSAGE_CONTENT':
        this.listeners.onMessageDelta?.((event as any).delta);
        break;
      case 'STATE_DELTA':
        // jsonpatch.apply_patch returns the updated document directly. Some servers may send
        // patches that assume missing parents are created automatically. The library may throw
        // in that case, so fall back to a permissive patcher that creates parents.
        try {
          this.currentState = apply_patch(this.currentState, (event as any).patch);
        } catch (_err) {
          this.currentState = this.applySimplePatch(this.currentState, (event as any).patch);
        }
        this.listeners.onStateUpdate?.(this.currentState);
        break;
      case 'TOOL_CALL_START':
        this.listeners.onToolStart?.((event as any).name, (event as any).args);
        break;
      case 'TOOL_CALL_END':
        this.listeners.onToolEnd?.((event as any).name, (event as any).result);
        break;
      default:
        break;
    }
  }

  close() {
    this.es?.close();
  }

  // Minimal JSON patcher that supports add/replace for object paths, creating parents as needed
  private applySimplePatch(state: any, ops: Array<{ op: string; path: string; value?: any }>) {
    const next = { ...(state || {}) };
    for (const op of ops || []) {
      if (!op.path || !op.path.startsWith('/')) continue;
      const keys = op.path
        .split('/')
        .slice(1)
        .map((k) => k.replace(/~1/g, '/').replace(/~0/g, '~'));
      let cursor: any = next;
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (cursor[key] == null || typeof cursor[key] !== 'object') {
          cursor[key] = {};
        }
        cursor = cursor[key];
      }
      const leaf = keys[keys.length - 1];
      if (op.op === 'add' || op.op === 'replace') {
        cursor[leaf] = op.value;
      }
      // ignore remove/move/copy/test for this simple fallback
    }
    return next;
  }
}
