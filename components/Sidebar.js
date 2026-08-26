"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Compass, Anchor, LifeBuoy, ImagePlus, X, Settings, Users, Menu, GripVertical, ShieldCheck } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { addPropertyPhoto, deletePropertyPhoto, reorderPropertyPhotos } from "@/app/(dashboard)/journey/[id]/actions";
import { setActiveAgency } from "@/app/(dashboard)/switchAgencyActions";
import { reorderById } from "@/lib/reorder";

const MAX_PHOTOS = 5;

function formatUntil(dateString) {
  return new Date(dateString).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function Sidebar({
  guidanceCount,
  fullName,
  isPlatformOwner = false,
  effectiveAgency = null,
  delegateGrants = [],
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const fileInputRef = useRef(null);
  const [isPending, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Sidebar stays mounted across route changes (it lives in the shared
  // dashboard layout), so the mobile drawer needs to close itself on
  // navigation rather than relying on the page unmounting it.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Only present when we're looking at a specific Journey — this widget
  // has nothing to show on /bridge, /harbor, or /journey/new.
  const journeyMatch = pathname.match(/^\/journey\/([^/]+)/);
  const journeyId = journeyMatch && journeyMatch[1] !== "new" ? journeyMatch[1] : null;

  const [photos, setPhotos] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [draggedPhotoId, setDraggedPhotoId] = useState(null);
  const [dragOverPhotoId, setDragOverPhotoId] = useState(null);
  // Mirrors draggedPhotoId synchronously so dragover/drop can read it
  // immediately without waiting on a React re-render mid-drag — see the
  // same pattern (and the race condition it fixes) in
  // JourneyDetailClient.js's milestone drag-and-drop.
  const draggedPhotoIdRef = useRef(null);

  const loadPhotos = async (id) => {
    try {
      const res = await fetch(`/api/property-photos/${id}`);
      const data = await res.json();
      setPhotos(data.photos || []);
    } catch {
      // Quiet failure — this is a small sidebar widget, not core flow.
    }
  };

  useEffect(() => {
    setPhotoError("");
    if (journeyId) {
      loadPhotos(journeyId);
    } else {
      setPhotos([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeyId]);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFilesChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !journeyId) return;
    setUploadingPhotos(true);
    setPhotoError("");
    try {
      const remainingSlots = MAX_PHOTOS - photos.length;
      const filesToUpload = files.slice(0, remainingSlots);
      if (files.length > remainingSlots) {
        setPhotoError(`Only ${remainingSlots} more will fit (5 max).`);
      }
      for (const file of filesToUpload) {
        const path = `${journeyId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("property-photos")
          .upload(path, file);
        if (uploadError) {
          throw new Error(uploadError.message || "Couldn't upload that photo.");
        }
        await addPropertyPhoto(journeyId, path);
      }
      await loadPhotos(journeyId);
    } catch (err) {
      setPhotoError(err.message || "Couldn't upload those photos.");
    }
    setUploadingPhotos(false);
    e.target.value = "";
  };

  const handleDeletePhoto = (photoId) => {
    startTransition(async () => {
      await deletePropertyPhoto(photoId, journeyId);
      await loadPhotos(journeyId);
    });
  };

  const handlePhotoDragStart = (e, photoId) => {
    // Dragging shouldn't hijack a click on the remove button — see the
    // data-no-drag attribute on that button below.
    if (e.target.closest("[data-no-drag]")) {
      e.preventDefault();
      return;
    }
    draggedPhotoIdRef.current = photoId;
    setDraggedPhotoId(photoId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handlePhotoDragOver = (e, photoId) => {
    // Always preventDefault (not gated on state) so a fast drag doesn't
    // miss every dragover before React catches up with the dragged id.
    e.preventDefault();
    if (!draggedPhotoIdRef.current || draggedPhotoIdRef.current === photoId) return;
    setDragOverPhotoId(photoId);
  };

  const handlePhotoDrop = (e, photoId) => {
    e.preventDefault();
    const fromId = draggedPhotoIdRef.current;
    draggedPhotoIdRef.current = null;
    setDraggedPhotoId(null);
    setDragOverPhotoId(null);
    if (!fromId || fromId === photoId) return;

    const reordered = reorderById(photos, fromId, photoId);
    if (reordered === photos) return;

    setPhotos(reordered);
    startTransition(async () => {
      await reorderPropertyPhotos(journeyId, reordered.map((p) => p.id));
    });
  };

  const handlePhotoDragEnd = () => {
    draggedPhotoIdRef.current = null;
    setDraggedPhotoId(null);
    setDragOverPhotoId(null);
  };

  const items = [
    { key: "bridge", label: "The Bridge", icon: Compass, href: "/bridge" },
    { key: "harbor", label: "The Harbor", icon: LifeBuoy, href: "/harbor" },
    { key: "team", label: "Team", icon: Users, href: "/team" },
    { key: "settings", label: "Settings", icon: Settings, href: "/settings" },
    ...(isPlatformOwner ? [{ key: "admin", label: "Admin", icon: ShieldCheck, href: "/admin" }] : []),
  ];

  const initials = (fullName || "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSwitchAgency = (agencyId) => {
    startTransition(async () => {
      await setActiveAgency(agencyId === effectiveAgency?.ownAgencyId ? null : agencyId);
      router.refresh();
    });
  };

  const handleSignOut = async () => {
    setMobileOpen(false);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      {/* Mobile-only sticky header — hidden on desktop via CSS. This is
          what's actually visible when the drawer below is off-canvas. */}
      <div className="lh-mobile-topbar">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="lh-focus"
          style={{ background: "none", border: "none", padding: 4, display: "flex", cursor: "pointer" }}
        >
          <Menu size={22} color="var(--lh-navy)" strokeWidth={1.75} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Anchor size={16} color="var(--lh-navy)" strokeWidth={1.75} />
          <span className="lh-display" style={{ fontSize: 16, fontWeight: 600 }}>
            Lighthouse
          </span>
        </div>
        <div style={{ width: 22 }} />
      </div>

      {/* Dims the page and closes the drawer on tap — only rendered
          visible (via CSS) once the drawer is open, on mobile. */}
      <div
        className={`lh-sidebar-backdrop${mobileOpen ? " lh-sidebar-backdrop-open" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      <div className={`lh-sidebar${mobileOpen ? " lh-sidebar-open" : ""}`}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Anchor size={18} color="var(--lh-navy)" strokeWidth={1.75} />
            <span className="lh-display" style={{ fontSize: 19, fontWeight: 600 }}>
              Lighthouse
            </span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="lh-sidebar-close-btn lh-focus"
            style={{ background: "none", border: "none", padding: 2, alignItems: "center", cursor: "pointer" }}
          >
            <X size={18} color="var(--lh-slate)" />
          </button>
        </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((it) => {
          const active = pathname.startsWith(it.href);
          const Icon = it.icon;
          return (
            <button
              key={it.key}
              onClick={() => {
                setMobileOpen(false);
                router.push(it.href);
              }}
              className="lh-focus lh-anim"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                background: active ? "var(--lh-paper)" : "transparent",
                boxShadow: active ? "0 1px 2px rgba(22,50,79,0.06)" : "none",
                color: active ? "var(--lh-navy)" : "var(--lh-slate)",
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                transition: "background 150ms ease, color 150ms ease",
              }}
            >
              <Icon size={16} strokeWidth={1.75} />
              {it.label}
              {it.key === "bridge" && guidanceCount > 0 && (
                <span
                  className="lh-mono"
                  style={{
                    marginLeft: "auto",
                    background: "var(--lh-gold)",
                    color: "white",
                    borderRadius: 10,
                    fontSize: 10,
                    padding: "1px 6px",
                  }}
                >
                  {guidanceCount}
                </span>
              )}
            </button>
          );
        })}

        {journeyId && (
          <div style={{ marginTop: 26, paddingLeft: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span
                className="lh-mono"
                style={{ fontSize: 11, color: "var(--lh-navy)", fontWeight: 700, letterSpacing: 0.3 }}
              >
                PHOTOS{photos.length > 0 ? ` ${photos.length}/${MAX_PHOTOS}` : ""}
              </span>
              {photos.length < MAX_PHOTOS && (
                <button
                  onClick={handleUploadClick}
                  disabled={uploadingPhotos}
                  title="Add property photos"
                  className="lh-focus"
                  style={{
                    background: "none",
                    border: "none",
                    padding: 2,
                    cursor: "pointer",
                    display: "flex",
                    color: "var(--lh-slate)",
                  }}
                >
                  <ImagePlus size={14} />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFilesChange}
                style={{ display: "none" }}
              />
            </div>

            {photos.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 10, color: "var(--lh-slate-light)", lineHeight: 1.35 }}>
                  The first photo is the main one clients see — drag to reorder.
                </div>
                {photos.map((p, idx) => (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={(e) => handlePhotoDragStart(e, p.id)}
                    onDragOver={(e) => handlePhotoDragOver(e, p.id)}
                    onDrop={(e) => handlePhotoDrop(e, p.id)}
                    onDragEnd={handlePhotoDragEnd}
                    style={{
                      position: "relative",
                      cursor: "grab",
                      opacity: draggedPhotoId === p.id ? 0.4 : 1,
                      outline: dragOverPhotoId === p.id && draggedPhotoId !== p.id ? "2px solid var(--lh-teal)" : "none",
                      outlineOffset: 2,
                    }}
                  >
                    <img
                      src={p.url}
                      alt=""
                      style={{
                        width: "100%",
                        height: idx === 0 ? 150 : 96,
                        objectFit: "cover",
                        borderRadius: 8,
                        border: idx === 0 ? "2px solid var(--lh-teal)" : "1px solid var(--lh-line)",
                        background: "var(--lh-fog)",
                      }}
                    />
                    {idx === 0 && (
                      <span
                        className="lh-mono"
                        style={{
                          position: "absolute",
                          top: 5,
                          left: 5,
                          background: "var(--lh-teal)",
                          color: "white",
                          fontSize: 8.5,
                          fontWeight: 700,
                          letterSpacing: 0.3,
                          borderRadius: 10,
                          padding: "2px 6px",
                        }}
                      >
                        MAIN PHOTO
                      </span>
                    )}
                    <button
                      data-no-drag
                      onClick={() => handleDeletePhoto(p.id)}
                      disabled={isPending}
                      title="Remove"
                      style={{
                        position: "absolute",
                        top: 5,
                        right: 5,
                        background: "rgba(22, 50, 79, 0.8)",
                        border: "none",
                        borderRadius: 16,
                        width: 18,
                        height: 18,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      <X size={11} color="white" />
                    </button>
                    <div
                      title="Drag to reorder"
                      style={{
                        position: "absolute",
                        bottom: 5,
                        left: 5,
                        background: "rgba(22, 50, 79, 0.8)",
                        borderRadius: 16,
                        width: 18,
                        height: 18,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <GripVertical size={11} color="white" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 10.5, color: "var(--lh-slate-light)", lineHeight: 1.35 }}>
                Add photos of the property — the first one you upload becomes the main photo clients
                see, with the rest shown smaller alongside it.
              </div>
            )}
            {photoError && <div style={{ fontSize: 10, color: "#B4472A" }}>{photoError}</div>}
          </div>
        )}
      </nav>

      {delegateGrants.length > 0 && (
        <div style={{ marginTop: "auto", paddingLeft: 4, paddingRight: 4, marginBottom: 12 }}>
          <label
            className="lh-mono"
            style={{ fontSize: 10, color: "var(--lh-slate-light)", fontWeight: 700, letterSpacing: 0.3 }}
          >
            VIEWING
          </label>
          <select
            value={effectiveAgency?.isDelegate ? effectiveAgency.agencyId : effectiveAgency?.ownAgencyId}
            onChange={(e) => handleSwitchAgency(e.target.value)}
            disabled={isPending}
            className="lh-focus"
            style={{
              width: "100%",
              marginTop: 4,
              border: "1px solid var(--lh-line)",
              borderRadius: 7,
              padding: "6px 8px",
              fontSize: 12.5,
              color: "var(--lh-navy)",
              background: "var(--lh-paper)",
              cursor: "pointer",
            }}
          >
            <option value={effectiveAgency?.ownAgencyId}>My agency</option>
            {delegateGrants.map((g) => (
              <option key={g.agencyId} value={g.agencyId}>
                Covering: {g.agencyName} (until {formatUntil(g.endsAt)})
              </option>
            ))}
          </select>
        </div>
      )}

      <div
        className="lh-sidebar-bottom-profile"
        style={{ marginTop: delegateGrants.length > 0 ? 0 : "auto", paddingLeft: 4 }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "var(--lh-navy)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          {initials}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{fullName}</div>
        <button
          onClick={handleSignOut}
          className="lh-focus"
          style={{
            background: "none",
            border: "none",
            padding: 0,
            fontSize: 12,
            color: "var(--lh-slate)",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Sign out
        </button>
      </div>
      </div>
    </>
  );
}
