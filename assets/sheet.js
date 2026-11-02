// Achievement modal behaviour shared by the three profile pages (ES module; layout in ui.css).
// Below the md breakpoint the modal is a bottom sheet: it slides up, and slides back down
// when closed (✕, backdrop, Escape, or dragging the header down). From md up it stays a
// centred dialog that closes at once. Closing always goes through the returned function.
import { useEffect, useRef, useCallback, useState } from 'react';

const PHONE = '(max-width: 767px)';
const isPhone = () => window.matchMedia(PHONE).matches;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const CLOSE_MS     = 220;
const CLOSE_DRAG   = 120;  // px dragged down that closes the sheet
const CLOSE_FLING  = 0.5;  // px/ms downward speed that closes it from a shorter drag

// panelRef: the sheet panel; dragRef: the area that drags it (the art header);
// rootRef: the fixed root, faded out with the panel. Returns close().
export function useSheet({ panelRef, dragRef, rootRef, onClose }) {
  const closing = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    const el = panelRef.current;
    if (!el || !isPhone() || reducedMotion()) { onCloseRef.current(); return; }
    el.style.animation = 'none';
    el.style.transition = `transform ${CLOSE_MS}ms cubic-bezier(0.4, 0, 1, 1)`;
    el.style.transform = 'translateY(100%)';
    rootRef?.current?.classList.add('sheet-leaving');
    setTimeout(() => onCloseRef.current(), CLOSE_MS);
  }, []);

  // Escape closes; the page behind doesn't scroll (html too, for iOS)
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    const html = document.documentElement, body = document.body;
    const prev = [html.style.overflow, body.style.overflow];
    html.style.overflow = body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      [html.style.overflow, body.style.overflow] = prev;
    };
  }, [close]);

  // Drag the header down to close (phone only). Links and buttons in the header keep
  // working: a drag never starts on them.
  useEffect(() => {
    const area = dragRef.current, el = panelRef.current;
    if (!area || !el) return;
    let startY = null, lastY = 0, lastT = 0, speed = 0, dy = 0, pointer = null;
    const down = e => {
      if (!isPhone() || closing.current || e.target.closest('a, button')) return;
      startY = lastY = e.clientY; lastT = e.timeStamp; speed = dy = 0; pointer = e.pointerId;
      try { area.setPointerCapture(pointer); } catch { /* pointer already gone */ }
      el.style.animation = 'none';
      el.style.transition = 'none';
    };
    const move = e => {
      if (startY === null || e.pointerId !== pointer) return;
      dy = Math.max(0, e.clientY - startY);
      const dt = e.timeStamp - lastT;
      if (dt > 0) speed = (e.clientY - lastY) / dt;
      lastY = e.clientY; lastT = e.timeStamp;
      el.style.transform = dy ? `translateY(${dy}px)` : '';
    };
    const up = e => {
      if (startY === null || e.pointerId !== pointer) return;
      startY = null;
      if (dy > CLOSE_DRAG || (dy > 20 && speed > CLOSE_FLING)) { close(); return; }
      el.style.transition = 'transform 200ms cubic-bezier(0.2, 0.8, 0.3, 1)';
      el.style.transform = '';
    };
    area.addEventListener('pointerdown', down);
    area.addEventListener('pointermove', move);
    area.addEventListener('pointerup', up);
    area.addEventListener('pointercancel', up);
    return () => {
      area.removeEventListener('pointerdown', down);
      area.removeEventListener('pointermove', move);
      area.removeEventListener('pointerup', up);
      area.removeEventListener('pointercancel', up);
    };
  }, []);

  return close;
}

// Background image of a sheet or header: fades in once loaded, tries each URL in turn
// and hides itself if none loads.
export function useArtSrc(urls) {
  const list = (urls || []).filter(Boolean);
  const key = list.join('|');
  const [i, setI] = useState(0);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setI(0); setLoaded(false); }, [key]);
  return {
    src: list[i] ?? null,
    loaded,
    onLoad: () => setLoaded(true),
    onError: () => setI(n => n + 1),
  };
}
