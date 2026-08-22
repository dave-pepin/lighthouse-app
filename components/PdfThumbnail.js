"use client";

import { useEffect, useRef, useState } from "react";

// Renders an actual preview of a PDF's first page onto a canvas, instead of
// a generic icon. Runs entirely in the browser via pdf.js; the worker script
// is loaded from unpkg pinned to the exact installed version so it always
// matches what's bundled here.
export default function PdfThumbnail({ url, width = 56, height = 56 }) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;

    async function render() {
      try {
        const pdfjsLib = await import("pdfjs-dist/build/pdf.mjs");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        const pdf = await pdfjsLib.getDocument({ url }).promise;
        const page = await pdf.getPage(1);
        const baseViewport = page.getViewport({ scale: 1 });
        // Render at 2x the display size for a crisp thumbnail, then let
        // CSS scale it down into the tile.
        const scale = (Math.min(width / baseViewport.width, height / baseViewport.height) || 1) * 2;
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (!cancelled) setReady(true);
      } catch (err) {
        console.error("PDF thumbnail render failed:", err);
        if (!cancelled) setFailed(true);
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [url, width, height]);

  if (failed) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        width,
        height,
        objectFit: "cover",
        borderRadius: 8,
        border: "1px solid var(--lh-line)",
        background: "white",
        display: ready ? "block" : "none",
      }}
    />
  );
}
