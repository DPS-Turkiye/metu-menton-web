import { beforeEach, describe, vi } from "vitest";

import { IskurChannelKind } from "@/interfaces/iskur-channels";
import {
  acknowledgeIskurMessage,
  getIskurChannelPreferences,
  getIskurChannels,
  getIskurMessageReceipts,
  getIskurMessages,
  markIskurChannelRead,
  postIskurMessage,
  updateIskurChannelPreferences,
} from "@/lib/client/iskur-channels";
import {
  itSendsEachClientCall,
  type ClientCall,
} from "@test/fixtures/client-calls";

vi.mock("@/lib/http-client", () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const input = { body: "Merhaba", title: null, important: false };

const calls: ClientCall[] = [
  {
    title: "getIskurChannels lists every channel",
    call: () => getIskurChannels(),
    method: "get",
    args: ["/api/iskur/channels", { params: {} }],
  },
  {
    title: "getIskurChannels narrows to a program",
    call: () => getIskurChannels("p1"),
    method: "get",
    args: ["/api/iskur/channels", { params: { programId: "p1" } }],
  },
  {
    title: "getIskurMessages reads the newest page",
    call: () => getIskurMessages("c/1"),
    method: "get",
    args: ["/api/iskur/channels/c%2F1/messages", { params: {} }],
  },
  {
    title: "getIskurMessages pages back",
    call: () => getIskurMessages("c1", "m1"),
    method: "get",
    args: ["/api/iskur/channels/c1/messages", { params: { before: "m1" } }],
  },
  {
    title: "postIskurMessage posts",
    call: () => postIskurMessage("c1", input),
    method: "post",
    args: ["/api/iskur/channels/c1/messages", input],
  },
  {
    title: "markIskurChannelRead marks read",
    call: () => markIskurChannelRead("c1"),
    method: "post",
    args: ["/api/iskur/channels/c1/read"],
  },
  {
    title: "acknowledgeIskurMessage confirms",
    call: () => acknowledgeIskurMessage("m1"),
    method: "post",
    args: ["/api/iskur/messages/m1/acknowledge"],
  },
  {
    title: "getIskurMessageReceipts reads the receipts",
    call: () => getIskurMessageReceipts("m1"),
    method: "get",
    args: ["/api/iskur/messages/m1/receipts"],
  },
  {
    title: "getIskurChannelPreferences reads the settings",
    call: () => getIskurChannelPreferences("p1"),
    method: "get",
    args: ["/api/iskur/channel-preferences", { params: { programId: "p1" } }],
  },
  {
    title: "updateIskurChannelPreferences saves the settings",
    call: () => updateIskurChannelPreferences("p1", [IskurChannelKind.Team]),
    method: "put",
    args: [
      "/api/iskur/channel-preferences",
      { programId: "p1", mutedKinds: [IskurChannelKind.Team] },
    ],
  },
];

describe("İŞKUR channels client", () => {
  beforeEach(() => vi.clearAllMocks());

  itSendsEachClientCall(calls);
});
