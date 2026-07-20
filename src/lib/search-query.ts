let currentSearchQuery: string | null = null;
const listeners = new Set<() => void>();

function readSearchQueryFromUrl() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("q") || "";
}

export function getSearchQuery() {
  if (currentSearchQuery === null) {
    currentSearchQuery = readSearchQueryFromUrl();
  }

  return currentSearchQuery;
}

export function getServerSearchQuery() {
  return "";
}

export function subscribeSearchQuery(callback: () => void) {
  listeners.add(callback);

  function handlePopState() {
    currentSearchQuery = readSearchQueryFromUrl();
    callback();
  }

  window.addEventListener("popstate", handlePopState);

  return () => {
    listeners.delete(callback);
    window.removeEventListener("popstate", handlePopState);
  };
}

export function setSearchQuery(value: string) {
  if (currentSearchQuery === value) return;

  currentSearchQuery = value;
  listeners.forEach((listener) => listener());
}

export function syncSearchQueryToUrl(value: string) {
  const params = new URLSearchParams(window.location.search);
  const normalizedQuery = value.trim();

  if (normalizedQuery) {
    params.set("q", normalizedQuery);
  } else {
    params.delete("q");
  }

  const queryString = params.toString();
  const nextUrl = queryString
    ? `${window.location.pathname}?${queryString}`
    : window.location.pathname;

  window.history.replaceState(window.history.state, "", nextUrl);
}
