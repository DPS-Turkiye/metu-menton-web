import type { AxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IskurChannelKind } from "@/interfaces/iskur-channels";
import {
  acknowledgeIskurMessage,
  fetchIskurChannelPreferences,
  fetchIskurChannels,
  fetchIskurMessageReceipts,
  fetchIskurMessages,
  markIskurChannelRead,
  postIskurMessage,
  updateIskurChannelPreferences,
} from "@/lib/api/iskur-channels";
import { backendRequest } from "@/lib/server/backend-client";

vi.mock("@/lib/server/backend-client", () => ({ backendRequest: vi.fn() }));

const input = { body: "Merhaba", title: null, important: false };

const cases: [string, () => Promise<unknown>, AxiosRequestConfig][] = [
  [
    "lists every channel",
    () => fetchIskurChannels("u1", null),
    { method: "GET", url: "/api/iskur/channels", params: { actorId: "u1" } },
  ],
  [
    "lists one program's channels",
    () => fetchIskurChannels("u1", "p1"),
    {
      method: "GET",
      url: "/api/iskur/channels",
      params: { actorId: "u1", programId: "p1" },
    },
  ],
  [
    "reads the newest page",
    () => fetchIskurMessages("u1", "c/1", null),
    {
      method: "GET",
      url: "/api/iskur/channels/c%2F1/messages",
      params: { actorId: "u1" },
    },
  ],
  [
    "reads an older page",
    () => fetchIskurMessages("u1", "c1", "m1"),
    {
      method: "GET",
      url: "/api/iskur/channels/c1/messages",
      params: { actorId: "u1", before: "m1" },
    },
  ],
  [
    "posts a message",
    () => postIskurMessage("u1", "c1", input),
    {
      method: "POST",
      url: "/api/iskur/channels/c1/messages",
      data: { ...input, actorId: "u1" },
    },
  ],
  [
    "marks a channel read",
    () => markIskurChannelRead("u1", "c1"),
    {
      method: "POST",
      url: "/api/iskur/channels/c1/read",
      data: { actorId: "u1" },
    },
  ],
  [
    "confirms an announcement",
    () => acknowledgeIskurMessage("u1", "m/1"),
    {
      method: "POST",
      url: "/api/iskur/messages/m%2F1/acknowledge",
      data: { actorId: "u1" },
    },
  ],
  [
    "reads the receipts",
    () => fetchIskurMessageReceipts("u1", "m1"),
    {
      method: "GET",
      url: "/api/iskur/messages/m1/receipts",
      params: { actorId: "u1" },
    },
  ],
  [
    "reads the notification settings",
    () => fetchIskurChannelPreferences("u1", "p1"),
    {
      method: "GET",
      url: "/api/iskur/channel-preferences",
      params: { actorId: "u1", programId: "p1" },
    },
  ],
  [
    "saves the notification settings",
    () => updateIskurChannelPreferences("u1", "p1", [IskurChannelKind.Unit]),
    {
      method: "PUT",
      url: "/api/iskur/channel-preferences",
      data: {
        actorId: "u1",
        programId: "p1",
        mutedKinds: [IskurChannelKind.Unit],
      },
    },
  ],
];

describe("İŞKUR channels server API", () => {
  beforeEach(() => vi.mocked(backendRequest).mockReset());

  it.each(cases)("%s", async (_description, call, request) => {
    await call();
    expect(backendRequest).toHaveBeenCalledWith(request);
  });
});
