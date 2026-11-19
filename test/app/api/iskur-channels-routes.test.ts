import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  GET as preferences,
  PUT as savePreferences,
} from "@/app/api/iskur/channel-preferences/route";
import {
  GET as messages,
  POST as post,
} from "@/app/api/iskur/channels/[id]/messages/route";
import { POST as read } from "@/app/api/iskur/channels/[id]/read/route";
import { GET as channels } from "@/app/api/iskur/channels/route";
import { POST as acknowledge } from "@/app/api/iskur/messages/[id]/acknowledge/route";
import { GET as receipts } from "@/app/api/iskur/messages/[id]/receipts/route";
import { IskurChannelKind } from "@/interfaces/iskur-channels";
import { UserRole, type AppSession } from "@/interfaces/session";
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
import { getSessionUser } from "@/lib/session";
import { withForgedActor } from "@test/fixtures/forged-actor";
import { answerEachWith, backendResponse } from "@test/fixtures/route-handlers";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/api/iskur-channels", () => ({
  acknowledgeIskurMessage: vi.fn(),
  fetchIskurChannelPreferences: vi.fn(),
  fetchIskurChannels: vi.fn(),
  fetchIskurMessageReceipts: vi.fn(),
  fetchIskurMessages: vi.fn(),
  markIskurChannelRead: vi.fn(),
  postIskurMessage: vi.fn(),
  updateIskurChannelPreferences: vi.fn(),
}));

const calls = [
  acknowledgeIskurMessage,
  fetchIskurChannelPreferences,
  fetchIskurChannels,
  fetchIskurMessageReceipts,
  fetchIskurMessages,
  markIskurChannelRead,
  postIskurMessage,
  updateIskurChannelPreferences,
] as const;

const CHANNEL = "00000000-0000-4000-8000-0000000000c1";
const MESSAGE = "00000000-0000-4000-8000-0000000000d1";
const PROGRAM = "00000000-0000-4000-8000-0000000000a1";
const id = (value: string) => ({ params: Promise.resolve({ id: value }) });
const get = (path: string) => new NextRequest(`http://localhost${path}`);
const json = (body: unknown, method = "POST") =>
  new NextRequest("http://localhost/x", {
    method,
    body: JSON.stringify(body),
  });

const intern: AppSession = {
  userId: "intern-1",
  email: "intern@example.test",
  fullName: "Burak Tan",
  jobTitle: "x",
  role: UserRole.Mentee,
};

describe("İŞKUR channel routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    answerEachWith(calls, backendResponse({}));
    vi.mocked(getSessionUser).mockResolvedValue(intern);
  });

  it("refuses every route without a session and calls nothing", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const answers = [
      await channels(get("/x")),
      await messages(get("/x"), id(CHANNEL)),
      await post(json({ body: "Merhaba" }), id(CHANNEL)),
      await read(get("/x"), id(CHANNEL)),
      await acknowledge(get("/x"), id(MESSAGE)),
      await receipts(get("/x"), id(MESSAGE)),
      await preferences(get(`/x?programId=${PROGRAM}`)),
      await savePreferences(
        json({ programId: PROGRAM, mutedKinds: [] }, "PUT"),
      ),
    ];
    expect(answers.map((answer) => answer.status)).toEqual(
      answers.map(() => 401),
    );
    for (const call of calls) expect(call).not.toHaveBeenCalled();
  });

  it("acts as the session user and ignores a forged actor", async () => {
    await channels(get(`/x?programId=${PROGRAM}&actorId=forged`));
    expect(fetchIskurChannels).toHaveBeenCalledWith("intern-1", PROGRAM);
    await channels(get("/x"));
    expect(fetchIskurChannels).toHaveBeenLastCalledWith("intern-1", null);

    await messages(get(`/x?before=${MESSAGE}`), id(CHANNEL));
    expect(fetchIskurMessages).toHaveBeenCalledWith(
      "intern-1",
      CHANNEL,
      MESSAGE,
    );
    await messages(get("/x"), id(CHANNEL));
    expect(fetchIskurMessages).toHaveBeenLastCalledWith(
      "intern-1",
      CHANNEL,
      null,
    );

    await post(json(withForgedActor({ body: "  Merhaba  " })), id(CHANNEL));
    expect(postIskurMessage).toHaveBeenCalledWith("intern-1", CHANNEL, {
      body: "Merhaba",
      title: null,
      important: false,
    });

    await read(get("/x"), id(CHANNEL));
    expect(markIskurChannelRead).toHaveBeenCalledWith("intern-1", CHANNEL);
    await acknowledge(get("/x"), id(MESSAGE));
    expect(acknowledgeIskurMessage).toHaveBeenCalledWith("intern-1", MESSAGE);
    await receipts(get("/x"), id(MESSAGE));
    expect(fetchIskurMessageReceipts).toHaveBeenCalledWith("intern-1", MESSAGE);

    await preferences(get(`/x?programId=${PROGRAM}`));
    expect(fetchIskurChannelPreferences).toHaveBeenCalledWith(
      "intern-1",
      PROGRAM,
    );
    await savePreferences(
      json(
        withForgedActor({
          programId: PROGRAM,
          mutedKinds: [IskurChannelKind.Unit],
        }),
        "PUT",
      ),
    );
    expect(updateIskurChannelPreferences).toHaveBeenCalledWith(
      "intern-1",
      PROGRAM,
      [IskurChannelKind.Unit],
    );
  });

  it("sends an announcement's title and mark through, empty title as none", async () => {
    await post(
      json({ body: "Eğitim", title: " İSG ", important: true }),
      id(CHANNEL),
    );
    expect(postIskurMessage).toHaveBeenLastCalledWith("intern-1", CHANNEL, {
      body: "Eğitim",
      title: "İSG",
      important: true,
    });
    await post(json({ body: "Eğitim", title: "   " }), id(CHANNEL));
    expect(postIskurMessage).toHaveBeenLastCalledWith("intern-1", CHANNEL, {
      body: "Eğitim",
      title: null,
      important: false,
    });
  });

  it.each(["..", "%2e%2e", "not-a-uuid", `${CHANNEL}/../x`])(
    "never lets the path id %s reach the backend",
    async (bad) => {
      const answers = [
        await messages(get("/x"), id(bad)),
        await post(json({ body: "Merhaba" }), id(bad)),
        await read(get("/x"), id(bad)),
        await acknowledge(get("/x"), id(bad)),
        await receipts(get("/x"), id(bad)),
      ];
      expect(answers.map((answer) => answer.status)).toEqual(
        answers.map(() => 400),
      );
      for (const call of calls) expect(call).not.toHaveBeenCalled();
    },
  );

  it("accepts any well-formed id, as the backend does, not only RFC 4122 versions", async () => {
    const seeded = "00000000-0000-0000-0000-000000000001";
    await channels(get(`/x?programId=${seeded}`));
    expect(fetchIskurChannels).toHaveBeenCalledWith("intern-1", seeded);
    await messages(get(`/x?before=${seeded}`), id(seeded));
    expect(fetchIskurMessages).toHaveBeenCalledWith("intern-1", seeded, seeded);
  });

  it("ignores a forged actor on every read", async () => {
    await read(json(withForgedActor({})), id(CHANNEL));
    expect(markIskurChannelRead).toHaveBeenCalledWith("intern-1", CHANNEL);
    await receipts(get("/x?actorId=forged"), id(MESSAGE));
    expect(fetchIskurMessageReceipts).toHaveBeenCalledWith("intern-1", MESSAGE);
    await preferences(get(`/x?programId=${PROGRAM}&actorId=forged`));
    expect(fetchIskurChannelPreferences).toHaveBeenCalledWith(
      "intern-1",
      PROGRAM,
    );
    await messages(get("/x?actorId=forged"), id(CHANNEL));
    expect(fetchIskurMessages).toHaveBeenCalledWith("intern-1", CHANNEL, null);
  });

  it("takes the length limits exactly and treats a null mark as not important", async () => {
    await post(
      json({ body: "x".repeat(4000), title: "t".repeat(160), important: null }),
      id(CHANNEL),
    );
    expect(postIskurMessage).toHaveBeenCalledWith("intern-1", CHANNEL, {
      body: "x".repeat(4000),
      title: "t".repeat(160),
      important: false,
    });
    await post(json({ body: "x", title: null }), id(CHANNEL));
    expect(postIskurMessage).toHaveBeenLastCalledWith("intern-1", CHANNEL, {
      body: "x",
      title: null,
      important: false,
    });
  });

  it("refuses bad query parameters and bodies before the backend", async () => {
    const answers = [
      await channels(get("/x?programId=..")),
      await messages(get("/x?before=yesterday"), id(CHANNEL)),
      await preferences(get("/x")),
      await post(json({ body: "   " }), id(CHANNEL)),
      await post(json({ body: "x".repeat(4001) }), id(CHANNEL)),
      await post(json({ body: "x", title: "t".repeat(161) }), id(CHANNEL)),
      await post(json({ body: "x", important: "yes" }), id(CHANNEL)),
      await post(
        new NextRequest("http://localhost/x", { method: "POST", body: "{" }),
        id(CHANNEL),
      ),
      await savePreferences(
        json(
          { programId: PROGRAM, mutedKinds: [IskurChannelKind.Announcements] },
          "PUT",
        ),
      ),
      await savePreferences(
        json({ programId: PROGRAM, mutedKinds: ["SPAM"] }, "PUT"),
      ),
      await savePreferences(json({ programId: "..", mutedKinds: [] }, "PUT")),
      await savePreferences(
        json(
          {
            programId: PROGRAM,
            mutedKinds: [IskurChannelKind.Unit, IskurChannelKind.Unit],
          },
          "PUT",
        ),
      ),
      await savePreferences(json({ programId: PROGRAM }, "PUT")),
      await savePreferences(json({ mutedKinds: [] }, "PUT")),
      await savePreferences(
        json({ programId: PROGRAM, mutedKinds: "UNIT" }, "PUT"),
      ),
      await channels(get("/x?programId=")),
      await messages(get("/x?before="), id(CHANNEL)),
      await post(json({ body: "x", title: 123 }), id(CHANNEL)),
      await post(json({ body: "   ", title: "Başlık" }), id(CHANNEL)),
    ];
    expect(answers.map((answer) => answer.status)).toEqual(
      answers.map(() => 400),
    );
    for (const call of calls) expect(call).not.toHaveBeenCalled();
  });

  it("forwards the backend's answer and maps a failure", async () => {
    vi.mocked(fetchIskurChannels).mockResolvedValue(
      backendResponse({ channels: [], totalUnread: 0 }),
    );
    const ok = await channels(get("/x"));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ channels: [], totalUnread: 0 });

    vi.mocked(postIskurMessage).mockRejectedValue(new Error("down"));
    const failed = await post(json({ body: "Merhaba" }), id(CHANNEL));
    expect(failed.status).toBe(502);
    expect(await failed.json()).toMatchObject({
      message: "iskurMessageSendFailed",
    });
  });
});
