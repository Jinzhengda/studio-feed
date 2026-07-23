export type SortMode = "time" | "random";

const SORT_MODE_STORAGE_KEY = "studio-feed-sort-mode";
const RANDOM_SEED_STORAGE_KEY = "studio-feed-random-seed";

let currentSortMode: SortMode | null = null;
let currentRandomSeed: number | null = null;
const listeners = new Set<() => void>();

function readSortMode(): SortMode {
  if (typeof window === "undefined") return "time";

  const params = new URLSearchParams(window.location.search);
  if (params.get("sort") === "random") return "random";

  return window.localStorage.getItem(SORT_MODE_STORAGE_KEY) === "random"
    ? "random"
    : "time";
}

function readRandomSeed() {
  if (typeof window === "undefined") return 0;

  const params = new URLSearchParams(window.location.search);
  const value =
    params.get("seed") || window.localStorage.getItem(RANDOM_SEED_STORAGE_KEY);
  const seed = Number(value);

  return Number.isFinite(seed) ? seed : 0;
}

export function getSortMode(): SortMode {
  if (currentSortMode === null) {
    currentSortMode = readSortMode();
  }

  return currentSortMode;
}

export function getServerSortMode(): SortMode {
  return "time";
}

export function getRandomSeed() {
  if (currentRandomSeed === null) {
    currentRandomSeed = readRandomSeed();
  }

  return currentRandomSeed;
}

export function getServerRandomSeed() {
  return 0;
}

export function subscribeSortMode(callback: () => void) {
  listeners.add(callback);

  function handlePopState() {
    currentSortMode = readSortMode();
    currentRandomSeed = readRandomSeed();
    callback();
  }

  window.addEventListener("popstate", handlePopState);

  return () => {
    listeners.delete(callback);
    window.removeEventListener("popstate", handlePopState);
  };
}

export function updateSortMode(nextMode: SortMode) {
  currentSortMode = nextMode;
  currentRandomSeed =
    nextMode === "random" ? createRandomSeed() : currentRandomSeed || 0;

  window.localStorage.setItem(SORT_MODE_STORAGE_KEY, nextMode);
  window.localStorage.setItem(
    RANDOM_SEED_STORAGE_KEY,
    String(currentRandomSeed),
  );

  const params = new URLSearchParams(window.location.search);
  if (nextMode === "random") {
    params.set("sort", "random");
    params.set("seed", String(currentRandomSeed));
  } else {
    params.delete("sort");
    params.delete("seed");
  }

  const queryString = params.toString();
  const nextUrl = queryString
    ? `${window.location.pathname}?${queryString}`
    : window.location.pathname;

  window.history.replaceState(window.history.state, "", nextUrl);
  listeners.forEach((listener) => listener());
}

function createRandomSeed() {
  if (window.crypto) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0];
  }

  return Math.floor(Math.random() * 2 ** 32);
}
