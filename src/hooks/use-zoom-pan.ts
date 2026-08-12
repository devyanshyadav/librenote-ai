"use client";

import { useRef, useState } from "react";

interface ZoomPanOptions {
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  zoomSpeed?: number;
}

export function useZoomPan(options: ZoomPanOptions = {}) {
  const {
    initialZoom = 1,
    minZoom = 0.3,
    maxZoom = 3,
    zoomSpeed = 0.08,
  } = options;

  const [zoom, setZoom] = useState(initialZoom);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const direction = e.deltaY < 0 ? 1 : -1;
    setZoom((z) => Math.min(Math.max(z + direction * zoomSpeed, minZoom), maxZoom));
  };

  const reset = () => {
    setZoom(initialZoom);
    setPan({ x: 0, y: 0 });
  };

  return {
    zoom,
    setZoom,
    pan,
    setPan,
    isDragging,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    reset,
  };
}
