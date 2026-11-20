import { File as NodeFile } from "node:buffer";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as programFile } from "@/app/api/coordinator/programs/[id]/iskur/task-outputs/[taskId]/[outputId]/route";
import { GET as programFiles } from "@/app/api/coordinator/programs/[id]/iskur/task-outputs/route";
import {
  GET as download,
  DELETE as remove,
} from "@/app/api/iskur/tasks/[taskId]/outputs/[outputId]/route";
import { POST as upload } from "@/app/api/iskur/tasks/[taskId]/outputs/route";
import { UserRole, type AppSession } from "@/interfaces/session";
import {
  fetchIskurProgramTaskOutputContent,
  fetchIskurTaskOutputContent,
  fetchIskurTaskOutputs,
  removeIskurTaskOutput,
  uploadIskurTaskOutput,
} from "@/lib/api/iskur-tasks";
import { getSessionUser } from "@/lib/session";
import {
  MULTIPART_CONTENT_TYPE,
  multipartBody,
} from "@test/fixtures/multipart";
import { answerEachWith, backendResponse } from "@test/fixtures/route-handlers";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/api/iskur-tasks", () => ({
  fetchIskurProgramTaskOutputContent: vi.fn(),
  fetchIskurTaskOutputContent: vi.fn(),
  fetchIskurTaskOutputs: vi.fn(),
  removeIskurTaskOutput: vi.fn(),
  uploadIskurTaskOutput: vi.fn(),
}));

const calls = [
  fetchIskurProgramTaskOutputContent,
  fetchIskurTaskOutputContent,
  fetchIskurTaskOutputs,
  removeIskurTaskOutput,
  uploadIskurTaskOutput,
] as const;

const TASK = "00000000-0000-4000-8000-0000000000b1";
const OUTPUT = "00000000-0000-4000-8000-0000000000e1";
const PROGRAM = "00000000-0000-4000-8000-0000000000c1";
const NOT_IDS = ["..", "t1", "../../admin", "..%2F..%2Fadmin"];

const params = <T extends Record<string, string>>(value: T) => ({
  params: Promise.resolve(value),
});
const task = params({ taskId: TASK });
const output = params({ taskId: TASK, outputId: OUTPUT });
const programOutput = params({ id: PROGRAM, taskId: TASK, outputId: OUTPUT });
const plain = () => new Request("http://x");

function as(role: UserRole): AppSession {
  return {
    userId: `${role}-1`,
    email: "someone@example.test",
    fullName: "Someone",
    jobTitle: "x",
    role,
  };
}

function fileUpload(bytes = 64) {
  const body = multipartBody({
    file: {
      filename: "rapor.zip",
      type: "application/zip",
      bytes: new Uint8Array(bytes),
    },
    actorId: "forged",
  });
  return new NextRequest("http://x", {
    method: "POST",
    headers: {
      "Content-Type": MULTIPART_CONTENT_TYPE,
      "Content-Length": String(body.length),
    },
    body,
  });
}

/** What the backend answers for a file: its bytes, with a type and a disposition it chose. */
function backendFile(headers: Record<string, string>) {
  return {
    ...backendResponse(new TextEncoder().encode("<script>").buffer),
    headers,
  };
}

describe("İŞKUR task output routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // undici builds the parsed file with the global File, which jsdom replaces.
    vi.stubGlobal("File", NodeFile);
    answerEachWith(calls, backendResponse({}));
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Mentee));
  });

  it("needs a session", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const refused = [
      await upload(fileUpload(), task),
      await download(plain(), output),
      await remove(plain(), output),
      await programFiles(plain(), params({ id: PROGRAM })),
      await programFile(plain(), programOutput),
    ];
    expect(refused.map((response) => response.status)).toEqual(
      refused.map(() => 401),
    );
    for (const call of calls) expect(call).not.toHaveBeenCalled();
  });

  it("passes on only the checked file, under the session user", async () => {
    expect((await upload(fileUpload(), task)).status).toBe(200);
    expect(uploadIskurTaskOutput).toHaveBeenCalledTimes(1);
    const [actor, taskId, form] =
      vi.mocked(uploadIskurTaskOutput).mock.calls[0] ?? [];
    expect(actor).toBe("MENTEE-1");
    expect(taskId).toBe(TASK);
    expect([...(form?.keys() ?? [])]).toEqual(["file"]);
  });

  it("refuses an empty upload and one larger than a 10 MB file can make", async () => {
    const empty = await upload(fileUpload(0), task);
    expect(empty.status).toBe(400);
    await expect(empty.json()).resolves.toMatchObject({
      message: "iskurTaskOutputInvalid",
    });
    const tooLarge = new NextRequest("http://x", {
      method: "POST",
      headers: { "content-length": String(11 * 1024 * 1024) },
      body: "x",
    });
    expect((await upload(tooLarge, task)).status).toBe(400);
    // A body without a length would be read whole before its size could be checked.
    const unsized = new NextRequest("http://x", { method: "POST", body: "x" });
    unsized.headers.delete("content-length");
    expect((await upload(unsized, task)).status).toBe(400);
    expect(uploadIskurTaskOutput).not.toHaveBeenCalled();
  });

  it("removes a file as the session user", async () => {
    expect((await remove(plain(), output)).status).toBe(200);
    expect(removeIskurTaskOutput).toHaveBeenCalledWith(
      "MENTEE-1",
      TASK,
      OUTPUT,
    );
  });

  it("never builds a backend path from an id that is not one", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Coordinator));
    for (const bad of NOT_IDS) {
      const answers = [
        await upload(fileUpload(), params({ taskId: bad })),
        await download(plain(), params({ taskId: bad, outputId: OUTPUT })),
        await download(plain(), params({ taskId: TASK, outputId: bad })),
        await remove(plain(), params({ taskId: bad, outputId: OUTPUT })),
        await remove(plain(), params({ taskId: TASK, outputId: bad })),
        await programFiles(plain(), params({ id: bad })),
        await programFile(
          plain(),
          params({ id: bad, taskId: TASK, outputId: OUTPUT }),
        ),
        await programFile(
          plain(),
          params({ id: PROGRAM, taskId: bad, outputId: OUTPUT }),
        ),
        await programFile(
          plain(),
          params({ id: PROGRAM, taskId: TASK, outputId: bad }),
        ),
      ];
      expect(answers.map((response) => response.status)).toEqual(
        answers.map(() => 400),
      );
    }
    for (const call of calls) expect(call).not.toHaveBeenCalled();
  });

  it("streams a file as an opaque attachment, whatever the backend calls it", async () => {
    vi.mocked(fetchIskurTaskOutputContent).mockResolvedValue(
      backendFile({
        "content-type": "text/html",
        "content-disposition": "inline",
      }),
    );
    const file = await download(plain(), output);
    expect(fetchIskurTaskOutputContent).toHaveBeenCalledWith(
      "MENTEE-1",
      TASK,
      OUTPUT,
    );
    expect(file.status).toBe(200);
    expect(file.headers.get("content-type")).toBe("application/octet-stream");
    expect(file.headers.get("content-disposition")).toMatch(/^attachment/);
    expect(file.headers.get("content-security-policy")).toContain("sandbox");
    expect(file.headers.get("x-content-type-options")).toBe("nosniff");
    expect(file.headers.get("cache-control")).toBe("private, no-store");

    // The backend's own attachment name is kept.
    vi.mocked(fetchIskurTaskOutputContent).mockResolvedValue(
      backendFile({
        "content-disposition": 'attachment; filename="rapor.pdf"',
      }),
    );
    expect(
      (await download(plain(), output)).headers.get("content-disposition"),
    ).toBe('attachment; filename="rapor.pdf"');
  });

  it("keeps the backend's refusal of a download", async () => {
    for (const status of [403, 404, 503]) {
      vi.mocked(fetchIskurTaskOutputContent).mockResolvedValue({
        ...backendResponse(new ArrayBuffer(0), status),
        headers: {},
      });
      const refused = await download(plain(), output);
      expect(refused.status).toBe(status);
      await expect(refused.json()).resolves.toEqual({
        message: "fileOpenFailed",
      });
    }
  });

  it("keeps the coordinator routes to coordinators and the admin", async () => {
    const refused = [
      await programFiles(plain(), params({ id: PROGRAM })),
      await programFile(plain(), programOutput),
    ];
    expect(refused.map((response) => response.status)).toEqual([403, 403]);
    for (const call of calls) expect(call).not.toHaveBeenCalled();
  });

  it("lists and streams a program's files for its coordinator", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Coordinator));
    expect((await programFiles(plain(), params({ id: PROGRAM }))).status).toBe(
      200,
    );
    expect(fetchIskurTaskOutputs).toHaveBeenCalledWith(
      "COORDINATOR-1",
      PROGRAM,
    );

    vi.mocked(fetchIskurProgramTaskOutputContent).mockResolvedValue(
      backendFile({ "content-type": "image/png" }),
    );
    const file = await programFile(plain(), programOutput);
    expect(fetchIskurProgramTaskOutputContent).toHaveBeenCalledWith(
      "COORDINATOR-1",
      PROGRAM,
      TASK,
      OUTPUT,
    );
    expect(file.headers.get("content-type")).toBe("application/octet-stream");
    expect(file.headers.get("content-disposition")).toMatch(/^attachment/);

    vi.mocked(fetchIskurProgramTaskOutputContent).mockResolvedValue({
      ...backendResponse(new ArrayBuffer(0), 404),
      headers: {},
    });
    expect((await programFile(plain(), programOutput)).status).toBe(404);
  });

  it("answers 502 when the backend cannot be reached", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(as(UserRole.Admin));
    for (const call of calls) vi.mocked(call).mockRejectedValue(new Error("x"));
    const answers = [
      await upload(fileUpload(), task),
      await download(plain(), output),
      await remove(plain(), output),
      await programFiles(plain(), params({ id: PROGRAM })),
      await programFile(plain(), programOutput),
    ];
    expect(answers.map((response) => response.status)).toEqual(
      answers.map(() => 502),
    );
  });
});
