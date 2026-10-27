// Small typed helpers for DOM lookups so callers get null-safety for free.

export function $<E extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): E | null {
  return root.querySelector<E>(selector);
}

export function $$<E extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): E[] {
  return Array.from(root.querySelectorAll<E>(selector));
}
