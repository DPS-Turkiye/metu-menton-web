import { describe, expect, it } from "vitest";

import { IskurChannelKind } from "@/interfaces/iskur-channels";
import {
  announcementTime,
  canAnnounce,
  canSendDraft,
  channelHref,
  channelMark,
  ChannelNote,
  ChannelSubtitle,
  channelSubtitle,
  EMPTY_DRAFT,
  firstSearchParam,
  groupChannels,
  isMutableKind,
  messageInput,
  needsAcknowledgement,
  newlyOpenedTeam,
  pickChannel,
  readOnlyNote,
  toggleMuted,
  withOlder,
} from "@/lib/iskur-channels";
import {
  announcementsChannel,
  iskurChannel,
  iskurMessage,
} from "@test/fixtures/iskur-channels";

const unit = iskurChannel({
  id: "unit",
  kind: IskurChannelKind.Unit,
  name: "Kreatif",
});
const direct = iskurChannel({
  id: "direct",
  kind: IskurChannelKind.LeaderDirect,
  name: "Zeynep Kaya",
  counterpart: { userId: "z", fullName: "Zeynep Kaya", leader: true },
});

describe("İŞKUR channels", () => {
  it("groups the list in the 6.1 order and leaves out empty kinds", () => {
    const groups = groupChannels([
      direct,
      iskurChannel(),
      announcementsChannel(),
    ]);
    expect(groups.map((group) => group.kind)).toEqual([
      IskurChannelKind.Announcements,
      IskurChannelKind.Team,
      IskurChannelKind.LeaderDirect,
    ]);
  });

  it("opens the linked channel when it is there, otherwise the first", () => {
    const channels = [announcementsChannel(), unit];
    expect(pickChannel(channels, "unit")).toBe(unit);
    expect(pickChannel(channels, "gone")?.kind).toBe(
      IskurChannelKind.Announcements,
    );
    expect(pickChannel([], null)).toBeNull();
  });

  it("marks channels with # and a 1:1 with @", () => {
    expect(channelMark(IskurChannelKind.Team)).toBe("#");
    expect(channelMark(IskurChannelKind.LeaderDirect)).toBe("@");
  });

  it("names each row's second line after its kind and who the 1:1 is with", () => {
    expect(channelSubtitle(announcementsChannel())).toBe(
      ChannelSubtitle.Announcements,
    );
    expect(channelSubtitle(unit)).toBe(ChannelSubtitle.Unit);
    expect(channelSubtitle(iskurChannel())).toBe(ChannelSubtitle.Team);
    expect(channelSubtitle(direct)).toBe(ChannelSubtitle.WithLeader);
    expect(
      channelSubtitle({
        ...direct,
        counterpart: { userId: "b", fullName: "Burak", leader: false },
      }),
    ).toBe(ChannelSubtitle.WithMember);
  });

  it("explains a missing composer", () => {
    expect(readOnlyNote(iskurChannel())).toBeNull();
    expect(readOnlyNote(announcementsChannel())).toBe(
      ChannelNote.AnnouncementsLocked,
    );
    expect(
      readOnlyNote(iskurChannel({ canWrite: false, coordinatorView: true })),
    ).toBe(ChannelNote.CoordinatorReadOnly);
  });

  it("lets only a coordinator posting in Genel Duyurular give a title and the important mark", () => {
    const coordinator = announcementsChannel({
      canWrite: true,
      coordinatorView: true,
    });
    const draft = { body: "  Eğitim yarın ", title: " İSG ", important: true };
    expect(canAnnounce(coordinator)).toBe(true);
    expect(messageInput(draft, coordinator)).toEqual({
      body: "Eğitim yarın",
      title: "İSG",
      important: true,
    });
    expect(messageInput(draft, iskurChannel())).toEqual({
      body: "Eğitim yarın",
      title: null,
      important: false,
    });
    expect(
      messageInput({ ...draft, title: "  " }, coordinator).title,
    ).toBeNull();
  });

  it("sends only a non-blank draft where the reader may write", () => {
    expect(
      canSendDraft({ ...EMPTY_DRAFT, body: "Merhaba" }, iskurChannel()),
    ).toBe(true);
    expect(canSendDraft({ ...EMPTY_DRAFT, body: "   " }, iskurChannel())).toBe(
      false,
    );
    expect(
      canSendDraft({ ...EMPTY_DRAFT, body: "Merhaba" }, announcementsChannel()),
    ).toBe(false);
    expect(canSendDraft({ ...EMPTY_DRAFT, body: "Merhaba" }, null)).toBe(false);
  });

  it("asks a member, never a coordinator, to confirm an important announcement once", () => {
    const important = iskurMessage({ important: true });
    expect(needsAcknowledgement(important, announcementsChannel())).toBe(true);
    expect(
      needsAcknowledgement(
        { ...important, acknowledgedAt: "2026-11-19T07:00:00Z" },
        announcementsChannel(),
      ),
    ).toBe(false);
    expect(
      needsAcknowledgement(
        important,
        announcementsChannel({ coordinatorView: true }),
      ),
    ).toBe(false);
    expect(needsAcknowledgement(iskurMessage(), announcementsChannel())).toBe(
      false,
    );
  });

  it("puts older pages in front without repeating a message", () => {
    const a = iskurMessage({ id: "a" });
    const b = iskurMessage({ id: "b" });
    const c = iskurMessage({ id: "c" });
    expect(withOlder([a, b], [b, c]).map((message) => message.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("toggles one kind and keeps the Bildirimler order", () => {
    expect(toggleMuted([], IskurChannelKind.Unit, false)).toEqual([
      IskurChannelKind.Unit,
    ]);
    expect(
      toggleMuted([IskurChannelKind.Unit], IskurChannelKind.Team, false),
    ).toEqual([IskurChannelKind.Team, IskurChannelKind.Unit]);
    expect(
      toggleMuted(
        [IskurChannelKind.Team, IskurChannelKind.Unit],
        IskurChannelKind.Team,
        true,
      ),
    ).toEqual([IskurChannelKind.Unit]);
    expect(isMutableKind(IskurChannelKind.Announcements)).toBe(false);
    expect(isMutableKind(IskurChannelKind.LeaderDirect)).toBe(true);
  });

  it("names the team whose channels just opened until its channel is first opened", () => {
    expect(
      newlyOpenedTeam([
        announcementsChannel(),
        iskurChannel({ unopened: true }),
      ]),
    ).toBe("Medya ve Kreatif Üretim");
    expect(newlyOpenedTeam([iskurChannel()])).toBeNull();
    expect(
      newlyOpenedTeam([
        iskurChannel({ unopened: true, coordinatorView: true }),
      ]),
    ).toBeNull();
  });

  it("dates a message today, yesterday or by its day", () => {
    const now = new Date("2026-11-19T12:00:00Z");
    expect(announcementTime("2026-11-19T06:15:00Z", now)).toBe("Bugün 09:15");
    expect(announcementTime("2026-11-18T14:40:00Z", now)).toBe("Dün 17:40");
    expect(announcementTime("2026-11-10T07:12:00Z", now)).toMatch(
      /^10 Kas 10:12$/,
    );
  });

  it("links to a channel and reads one search parameter", () => {
    expect(channelHref("c/1")).toBe("/student/messages?channel=c%2F1");
    expect(firstSearchParam(["a", "b"])).toBe("a");
    expect(firstSearchParam([])).toBeNull();
    expect(firstSearchParam("x")).toBe("x");
    expect(firstSearchParam(undefined)).toBeNull();
  });
});
