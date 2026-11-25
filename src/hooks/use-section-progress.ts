"use client";

import { useEffect, useState } from "react";

/** A section counts as reached once its top passes this share of the window's height. */
const READING_LINE = 0.4;
/** Rounding in the browser can leave the last pixels of the page unscrolled. */
const END_TOLERANCE_PX = 4;

/** The index of the section being read; the last one at the end of the page, however short it is. */
export function useSectionProgress(ids: readonly string[]) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * READING_LINE;
      const page = document.documentElement;
      const atEnd =
        window.scrollY > 0 &&
        window.innerHeight + window.scrollY >=
          page.scrollHeight - END_TOLERANCE_PX;
      const reached = ids.findLastIndex((id) => {
        const section = document.getElementById(id);
        return section !== null && section.getBoundingClientRect().top <= line;
      });
      setCurrent(atEnd ? ids.length - 1 : Math.max(reached, 0));
    };
    const schedule = () => {
      frame ||= requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [ids]);

  return current;
}
