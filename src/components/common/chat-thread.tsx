"use client";

import type { ReactNode } from "react";

type Accent = { strong: string; soft: string };

/** One message bubble of a Mesajlar thread: mine on the right in the accent colour, others on the left. */
export function ChatBubble({
  mine,
  senderName,
  senderTag,
  body,
  time,
  accent,
}: {
  mine: boolean;
  senderName: string | null;
  /** A short tag after the sender's name, such as "Koordinatör". */
  senderTag?: ReactNode;
  body: string;
  time: string;
  accent: Accent;
}) {
  return (
    <article className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[520px] rounded-xl px-3.5 py-3 text-[13px] leading-5 ${mine ? "text-white" : "border border-[#e4e7ea] bg-[#f6f7f9]"}`}
        style={mine ? { backgroundColor: accent.strong } : undefined}
      >
        {mine || !senderName ? null : (
          <p className="mb-1 flex items-center gap-1.5 text-[10.5px] font-medium text-[#858c96]">
            {senderName}
            {senderTag}
          </p>
        )}
        <p className="whitespace-pre-wrap">{body}</p>
      </div>
      <time className="mt-1 text-[10px] text-[#858c96]">{time}</time>
    </article>
  );
}

/** The text-only composer under a Mesajlar thread. */
export function ChatComposer({
  value,
  onChange,
  onSubmit,
  canSend,
  maxLength,
  placeholder,
  inputLabel,
  sendLabel,
  accent,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  canSend: boolean;
  maxLength: number;
  placeholder: string;
  inputLabel: string;
  sendLabel: string;
  accent: Accent;
  /** Extra controls above the input row (an announcement's title and "Önemli"). */
  children?: ReactNode;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="space-y-3 border-t border-[#e4e7ea] px-6 py-4"
    >
      {children}
      <div className="flex items-center gap-3">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-label={inputLabel}
          className="h-9 min-w-0 flex-1 rounded-full bg-[#f6f7f9] px-4 text-[13px] outline-none placeholder:text-[#858c96]"
        />
        <button
          type="submit"
          disabled={!canSend}
          style={{ backgroundColor: accent.strong }}
          className="h-9 rounded-full px-[18px] text-[13px] font-semibold text-white disabled:opacity-50"
        >
          {sendLabel}
        </button>
      </div>
    </form>
  );
}
