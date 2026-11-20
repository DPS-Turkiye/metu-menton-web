import { beforeEach, describe, expect, it, vi } from "vitest";

import SignupPage from "@/app/signup/page";
import { SignupFlow } from "@/components/signup/signup-flow";
import { StudentSignupFlow } from "@/components/signup/student-signup-flow";
import { Edition } from "@/interfaces/edition";

const connection = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const edition = vi.hoisted(() => ({ current: "ODTU" }));

vi.mock("next/server", () => ({ connection }));
vi.mock("@/lib/server/edition", () => ({
  appEdition: () => edition.current,
}));

describe("sign-up page", () => {
  beforeEach(() => {
    connection.mockClear();
  });

  it("gives ODTÜ the student e-mail sign-up, read per request", async () => {
    edition.current = Edition.Odtu;
    const page = await SignupPage();

    expect(connection).toHaveBeenCalledTimes(1);
    expect(page.props.children.type).toBe(StudentSignupFlow);
  });

  it("keeps Teknokent's role sign-up", async () => {
    edition.current = Edition.Teknokent;
    const page = await SignupPage();

    const flow = page.props.children;
    expect(flow.type).toBe(SignupFlow);
    expect(flow.props).toEqual({ edition: Edition.Teknokent });
  });
});
