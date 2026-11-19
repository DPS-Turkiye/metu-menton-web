import { act } from "@testing-library/react";
import { vi } from "vitest";

type MessageHandler = (message: { body: string }) => void;

/** The callbacks the push hook hands the client; it reads none of their arguments. */
type FakeConfig = {
  brokerURL?: string;
  beforeConnect?: () => Promise<void> | void;
  onConnect?: () => void;
  onWebSocketClose?: () => void;
  onStompError?: () => void;
};

/** Stands in for @stomp/stompjs's Client: it records its config and lets a test play the broker. */
export class FakeIskurClient {
  brokerURL: string | undefined;
  connected = false;
  readonly activate = vi.fn();
  readonly deactivate = vi.fn(async () => {});
  private readonly subscriptions = new Map<string, MessageHandler>();

  constructor(readonly config: FakeConfig) {
    this.brokerURL = config.brokerURL;
    iskurStomp.clients.push(this);
  }

  subscribe(destination: string, handler: MessageHandler) {
    this.subscriptions.set(destination, handler);
    return { unsubscribe: () => this.subscriptions.delete(destination) };
  }

  topics() {
    return [...this.subscriptions.keys()].sort();
  }

  deliver(destination: string, body: string) {
    const handler = this.subscriptions.get(destination);
    if (!handler) throw new Error(`nothing subscribed to ${destination}`);
    handler({ body });
  }

  /** The socket closes: the broker forgets its subscriptions. */
  drop() {
    this.connected = false;
    this.subscriptions.clear();
    this.config.onWebSocketClose?.();
  }
}

export const iskurStomp = {
  Client: FakeIskurClient,
  clients: [] as FakeIskurClient[],
  reset() {
    this.clients = [];
  },
  last() {
    const client = this.clients.at(-1);
    if (!client) throw new Error("no STOMP client was created");
    return client;
  },
  /** Runs the broker handshake: the token request, then the connect callback. */
  async connect() {
    const client = this.last();
    await act(async () => {
      await client.config.beforeConnect?.();
    });
    act(() => {
      client.connected = true;
      client.config.onConnect?.();
    });
    return client;
  },
};
