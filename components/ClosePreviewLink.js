"use client";

// "Close preview" for the agent-facing portal previews. When the agent got
// here from the Journey page in this same tab, it goes *back* rather than
// forward — otherwise the preview stays behind the Journey page in history,
// and the phone's back gesture (or any history-based back) lands on the
// preview again. Opened any other way (fresh tab, bookmark), it's a plain
// link to `href`.
export default function ClosePreviewLink({ href, style }) {
  const handleClick = (e) => {
    try {
      const referrer = document.referrer ? new URL(document.referrer) : null;
      const target = new URL(href, window.location.href);
      if (
        referrer &&
        referrer.origin === window.location.origin &&
        referrer.pathname === target.pathname &&
        window.history.length > 1
      ) {
        e.preventDefault();
        window.history.back();
      }
    } catch {
      // Fall through to the plain link.
    }
  };

  return (
    <a href={href} onClick={handleClick} className="lh-focus" style={style}>
      Close preview
    </a>
  );
}
