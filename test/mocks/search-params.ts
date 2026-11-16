import { useMemo, useSyncExternalStore } from "react";

const LOCATION_CHANGED = "test:location-changed";

/** The App Router marks its own history entries with this key (see `next/dist/client/components/app-router.js`). */
const APP_ROUTER_MARK = "__NA";
/** The Pages Router's mark, which the App Router also leaves alone. */
const PAGES_ROUTER_MARK = "_N";

/** The state the App Router leaves on a page's history entry, for tests that open a page as it would. */
export const APP_ROUTER_ENTRY = { [APP_ROUTER_MARK]: true };

let historyPatched = false;

/** The router's own test: either mark, set to anything truthy. */
function carriesAppRouterMark(data: unknown) {
  if (typeof data !== "object" || data === null) return false;
  const marks = new Map(Object.entries(data));
  return Boolean(marks.get(APP_ROUTER_MARK) || marks.get(PAGES_ROUTER_MARK));
}

/** The App Router copies its mark from the current entry into a state the page passes. */
function withAppRouterMark(data: unknown) {
  if (!carriesAppRouterMark(window.history.state)) return data;
  const own = typeof data === "object" && data !== null ? data : {};
  return { ...own, ...APP_ROUTER_ENTRY };
}

/**
 * pushState and replaceState fire no event of their own; the App Router hears them, so the stand-in does too.
 * Like the router, it takes a state that already carries its mark as the router's own call and doesn't follow it.
 */
function patchHistory() {
  if (historyPatched) return;
  historyPatched = true;
  const push = window.history.pushState.bind(window.history);
  const replace = window.history.replaceState.bind(window.history);
  window.history.pushState = (data: unknown, unused, url) => {
    if (carriesAppRouterMark(data)) {
      push(data, unused, url);
      return;
    }
    push(withAppRouterMark(data), unused, url);
    window.dispatchEvent(new Event(LOCATION_CHANGED));
  };
  window.history.replaceState = (data: unknown, unused, url) => {
    if (carriesAppRouterMark(data)) {
      replace(data, unused, url);
      return;
    }
    replace(withAppRouterMark(data), unused, url);
    window.dispatchEvent(new Event(LOCATION_CHANGED));
  };
}

function subscribe(onChange: () => void) {
  patchHistory();
  window.addEventListener(LOCATION_CHANGED, onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    window.removeEventListener(LOCATION_CHANGED, onChange);
    window.removeEventListener("popstate", onChange);
  };
}

/**
 * useSearchParams the way the App Router gives it in the browser: it follows pushState, replaceState and Back.
 * Mock next/navigation's useSearchParams with it in tests of screens that keep their state in the URL.
 */
export function useLocationSearchParams() {
  const query = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
  return useMemo(() => new URLSearchParams(query), [query]);
}
