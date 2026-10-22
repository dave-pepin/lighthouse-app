"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Lets a page put something in the Sidebar, under the nav, without the
// shared dashboard layout having to load that page's data. Sidebar.js
// renders the empty #lh-sidebar-slot; this fills it while the page is
// mounted. Used by the Bridge for its Business Tracker. The slot is
// desktop-only (globals.css), since on mobile the Sidebar is a drawer.
export default function SidebarPortal({ children }) {
  const [target, setTarget] = useState(null);
  useEffect(() => setTarget(document.getElementById("lh-sidebar-slot")), []);
  return target ? createPortal(children, target) : null;
}
