// Simple event bus for "please upgrade" flows (feature/ quota denials)
const BUS_EVENT = "xbyte-upgrade-request";

export function requestUpgrade(detail) {
  window.dispatchEvent(new CustomEvent(BUS_EVENT, { detail }));
}

export function subscribeUpgrade(handler) {
  const h = e => handler?.(e.detail);
  window.addEventListener(BUS_EVENT, h);
  return () => window.removeEventListener(BUS_EVENT, h);
}
