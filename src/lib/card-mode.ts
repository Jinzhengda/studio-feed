export type CardMode = "image" | "text";

export const CARD_MODE_STORAGE_KEY = "studio-feed-card-mode";
export const CARD_MODE_CHANGE_EVENT = "studio-feed-card-mode-change";

export function getCardMode(): CardMode {
  const savedMode = window.localStorage.getItem(CARD_MODE_STORAGE_KEY);
  return savedMode === "text" ? "text" : "image";
}

export function getServerCardMode(): CardMode {
  return "image";
}

export function subscribeCardMode(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CARD_MODE_CHANGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CARD_MODE_CHANGE_EVENT, callback);
  };
}

export function updateCardMode(nextMode: CardMode) {
  window.localStorage.setItem(CARD_MODE_STORAGE_KEY, nextMode);
  window.dispatchEvent(new Event(CARD_MODE_CHANGE_EVENT));
}
