"use client";

import { useEffect, useRef, useState } from "react";

// How close (px) the pointer has to get to the top/bottom edge of the
// scroll area before the list starts scrolling on its own, and how fast.
const EDGE_ZONE = 60;
const MAX_SCROLL_STEP = 14;

// Drag-to-reorder built on pointer events instead of native HTML5
// drag-and-drop. Native DnD barely works on phones: iOS only starts a
// drag after a long-press, and mouse-only gating (onMouseDown) never
// fires before a touch drag at all — so on a phone the handle simply
// never picked anything up. Pointer events behave the same for a finger,
// a pen and a mouse, so there's one code path everywhere.
//
// Usage: spread `getRowProps(id)` on each row and `getHandleProps(id)` on
// its grip handle (which should also have `touch-action: none` so the
// page doesn't scroll instead of dragging). `onReorder(fromId, toId)`
// fires once on release over a different row. Optional `canDrop(fromId,
// toId)` rules out some targets (no drop indicator, no reorder). Ids are
// compared as strings, since they round-trip through a data attribute.
export function usePointerReorder({ onReorder, canDrop, enabled = true }) {
  const [draggedId, setDraggedId] = useState(null);
  const [overId, setOverId] = useState(null);
  const dragRef = useRef(null);
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;
  const canDropRef = useRef(canDrop);
  canDropRef.current = canDrop;

  const stopAutoScroll = () => {
    if (dragRef.current?.rafId) cancelAnimationFrame(dragRef.current.rafId);
  };

  useEffect(() => stopAutoScroll, []);

  const updateOver = (clientX, clientY) => {
    const drag = dragRef.current;
    if (!drag) return;
    const row = document.elementFromPoint(clientX, clientY)?.closest("[data-reorder-id]");
    const target = row?.dataset.reorderId ?? null;
    const next =
      target && target !== drag.id && (!canDropRef.current || canDropRef.current(drag.id, target)) ? target : null;
    if (next !== drag.overId) {
      drag.overId = next;
      setOverId(next);
    }
  };

  // While dragging, keep scrolling the list if the pointer is held near an
  // edge — otherwise a long list can't be reordered past one screenful,
  // since touch-action: none on the handle blocks normal scrolling.
  const autoScrollTick = () => {
    const drag = dragRef.current;
    if (!drag) return;
    const { scroller, lastX, lastY } = drag;
    const rect =
      scroller === document.scrollingElement
        ? { top: 0, bottom: window.innerHeight }
        : scroller.getBoundingClientRect();
    let step = 0;
    if (lastY < rect.top + EDGE_ZONE) {
      step = -Math.ceil(((rect.top + EDGE_ZONE - lastY) / EDGE_ZONE) * MAX_SCROLL_STEP);
    } else if (lastY > rect.bottom - EDGE_ZONE) {
      step = Math.ceil(((lastY - (rect.bottom - EDGE_ZONE)) / EDGE_ZONE) * MAX_SCROLL_STEP);
    }
    if (step) {
      scroller.scrollTop += step;
      updateOver(lastX, lastY);
    }
    drag.rafId = requestAnimationFrame(autoScrollTick);
  };

  const finish = (commit) => {
    const drag = dragRef.current;
    if (!drag) return;
    stopAutoScroll();
    dragRef.current = null;
    setDraggedId(null);
    setOverId(null);
    if (commit && drag.overId) onReorderRef.current(drag.id, drag.overId);
  };

  const getHandleProps = (id) => {
    if (!enabled) return {};
    const key = String(id);
    return {
      onPointerDown: (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = {
          id: key,
          overId: null,
          scroller: findScrollParent(e.currentTarget),
          lastX: e.clientX,
          lastY: e.clientY,
          rafId: null,
        };
        dragRef.current.rafId = requestAnimationFrame(autoScrollTick);
        setDraggedId(key);
      },
      onPointerMove: (e) => {
        const drag = dragRef.current;
        if (!drag || drag.id !== key) return;
        drag.lastX = e.clientX;
        drag.lastY = e.clientY;
        updateOver(e.clientX, e.clientY);
      },
      onPointerUp: () => finish(true),
      onPointerCancel: () => finish(false),
      onLostPointerCapture: () => finish(false),
      onClick: (e) => e.stopPropagation(),
    };
  };

  const getRowProps = (id) => ({ "data-reorder-id": String(id) });

  return { draggedId, overId, getRowProps, getHandleProps };
}

function findScrollParent(el) {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
      return node;
    }
  }
  return document.scrollingElement || document.documentElement;
}
