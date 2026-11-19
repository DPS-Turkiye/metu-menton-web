import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useIskurChannelPush } from "@/hooks/use-iskur-channel-push";
import { IskurChannelEventType } from "@/interfaces/iskur-channels";
import { postRealtimeToken } from "@/lib/client/meeting-notes";
import { iskurStomp, type FakeIskurClient } from "@test/mocks/iskur-stomp";

vi.mock("@stomp/stompjs", async () => {
  const { iskurStomp: fake } = await import("@test/mocks/iskur-stomp");
  return { Client: fake.Client };
});
vi.mock("@/lib/client/meeting-notes", () => ({ postRealtimeToken: vi.fn() }));

const TEAM = "00000000-0000-4000-8000-0000000000c1";
const UNIT = "00000000-0000-4000-8000-0000000000c2";
const MESSAGE = "00000000-0000-4000-8000-0000000000d1";
const topic = (channelId: string) => `/topic/iskur/channels/${channelId}`;

const posted = (channelId: string) => ({
  type: IskurChannelEventType.MessagePosted,
  channelId,
  messageId: MESSAGE,
});

function deliver(client: FakeIskurClient, channelId: string, body: string) {
  act(() => client.deliver(topic(channelId), body));
}

describe("useIskurChannelPush", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    iskurStomp.reset();
    vi.mocked(postRealtimeToken).mockResolvedValue({
      token: "tok en",
      expiresAt: "2026-11-20T11:00:00Z",
    });
  });

  it("opens no socket while there is no channel to follow", () => {
    const { result } = renderHook(() =>
      useIskurChannelPush([], vi.fn(), vi.fn()),
    );

    expect(iskurStomp.clients).toHaveLength(0);
    expect(result.current.live).toBe(false);
  });

  it("connects with a fresh token and subscribes to every channel's topic", async () => {
    const { result } = renderHook(() =>
      useIskurChannelPush([TEAM, UNIT], vi.fn(), vi.fn()),
    );
    const client = iskurStomp.last();
    expect(client.activate).toHaveBeenCalledTimes(1);
    expect(result.current.live).toBe(false);

    await iskurStomp.connect();

    expect(client.brokerURL).toBe("ws://localhost:8080/ws?token=tok%20en");
    expect(result.current.live).toBe(true);
    expect(client.topics()).toEqual([topic(TEAM), topic(UNIT)]);
  });

  it("hands a channel's events to the caller", async () => {
    const onEvent = vi.fn();
    renderHook(() => useIskurChannelPush([TEAM, UNIT], onEvent, vi.fn()));
    const client = await iskurStomp.connect();

    deliver(client, UNIT, JSON.stringify(posted(UNIT)));

    expect(onEvent.mock.calls).toEqual([[posted(UNIT)]]);
  });

  it("drops a frame that is not an event of the channel it arrived on", async () => {
    const onEvent = vi.fn();
    renderHook(() => useIskurChannelPush([TEAM, UNIT], onEvent, vi.fn()));
    const client = await iskurStomp.connect();

    deliver(client, TEAM, "not json");
    deliver(client, TEAM, JSON.stringify(posted(UNIT)));
    deliver(client, TEAM, JSON.stringify({ ...posted(TEAM), type: "DELETED" }));

    expect(onEvent).not.toHaveBeenCalled();
  });

  it("always calls the latest handler", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ onEvent }) => useIskurChannelPush([TEAM], onEvent, vi.fn()),
      { initialProps: { onEvent: first } },
    );
    const client = await iskurStomp.connect();

    rerender({ onEvent: second });
    deliver(client, TEAM, JSON.stringify(posted(TEAM)));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("follows the channel list as it changes, on the same socket", async () => {
    const { rerender } = renderHook(
      ({ ids }) => useIskurChannelPush(ids, vi.fn(), vi.fn()),
      { initialProps: { ids: [TEAM] } },
    );
    const client = await iskurStomp.connect();

    rerender({ ids: [UNIT, TEAM] });
    expect(client.topics()).toEqual([topic(TEAM), topic(UNIT)]);

    rerender({ ids: [UNIT] });
    expect(client.topics()).toEqual([topic(UNIT)]);
    expect(iskurStomp.clients).toHaveLength(1);
  });

  it("is not live when no realtime token can be issued", async () => {
    vi.mocked(postRealtimeToken).mockRejectedValue(new Error("401"));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { result } = renderHook(() =>
      useIskurChannelPush([TEAM], vi.fn(), vi.fn()),
    );

    await act(async () => {
      await iskurStomp.last().config.beforeConnect?.();
    });

    expect(result.current.live).toBe(false);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it.each([
    ["the socket closes", "onWebSocketClose"],
    ["the broker refuses a subscription", "onStompError"],
  ] as const)("stops being live when %s", async (_case, callback) => {
    const { result } = renderHook(() =>
      useIskurChannelPush([TEAM], vi.fn(), vi.fn()),
    );
    const client = await iskurStomp.connect();

    act(() => client.config[callback]?.());

    expect(result.current.live).toBe(false);
  });

  it("tells the caller when the broker refuses a subscription, and not when the socket merely closes", async () => {
    const onRefused = vi.fn();
    renderHook(() => useIskurChannelPush([TEAM], vi.fn(), onRefused));
    const client = await iskurStomp.connect();

    act(() => client.config.onWebSocketClose?.());
    expect(onRefused).not.toHaveBeenCalled();

    act(() => client.config.onStompError?.());
    expect(onRefused).toHaveBeenCalledTimes(1);
  });

  it("subscribes afresh after a reconnect", async () => {
    const { result } = renderHook(() =>
      useIskurChannelPush([TEAM], vi.fn(), vi.fn()),
    );
    const client = await iskurStomp.connect();

    act(() => client.drop());
    expect(result.current.live).toBe(false);
    expect(client.topics()).toEqual([]);

    await iskurStomp.connect();
    expect(result.current.live).toBe(true);
    expect(client.topics()).toEqual([topic(TEAM)]);
  });

  it("subscribes on a new socket after the channel list was empty for a while", async () => {
    const { result, rerender } = renderHook(
      ({ ids }) => useIskurChannelPush(ids, vi.fn(), vi.fn()),
      { initialProps: { ids: [TEAM] } },
    );
    const first = await iskurStomp.connect();

    rerender({ ids: [] });
    expect(result.current.live).toBe(false);
    expect(first.deactivate).toHaveBeenCalledTimes(1);

    rerender({ ids: [TEAM] });
    const second = await iskurStomp.connect();
    // The old socket reports its close late; the new one's state is its own.
    act(() => first.config.onWebSocketClose?.());

    expect(second).not.toBe(first);
    expect(second.topics()).toEqual([topic(TEAM)]);
    expect(result.current.live).toBe(true);
  });

  it("closes the socket when the screen goes away", async () => {
    const { unmount } = renderHook(() =>
      useIskurChannelPush([TEAM], vi.fn(), vi.fn()),
    );
    const client = await iskurStomp.connect();

    unmount();

    expect(client.deactivate).toHaveBeenCalledTimes(1);
  });
});
