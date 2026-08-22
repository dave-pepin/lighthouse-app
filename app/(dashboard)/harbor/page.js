import { createClient } from "@/lib/supabase/server";
import JourneyCard from "@/components/JourneyCard";

function parseDateOnly(dateString) {
  const [y, m, d] = dateString.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

// Computes the next occurrence of a closing date's month/day, using plain
// y/m/d numbers throughout (rather than letting the JS Date constructor
// parse the "YYYY-MM-DD" string directly) to sidestep the classic
// UTC-vs-local off-by-one-day trap with date-only strings.
function nextAnniversary(closedAtString) {
  const { month, day } = parseDateOnly(closedAtString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let year = today.getFullYear();
  let candidate = new Date(year, month, day);
  if (candidate < today) {
    year += 1;
    candidate = new Date(year, month, day);
  }
  return candidate;
}

function formatAnniversary(date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default async function HarborPage() {
  const supabase = await createClient();

  const { data: journeys } = await supabase
    .from("journeys")
    .select("*")
    .eq("stage", "Harbor")
    .order("last_activity_at", { ascending: false });

  // Clients opted in to an anniversary reminder, soonest upcoming first —
  // a persistent at-a-glance list so an agent doesn't have to open each
  // Journey to remember who's coming up.
  const anniversaries = (journeys || [])
    .filter((j) => j.anniversary_reminder_enabled && j.closed_at)
    .map((j) => {
      const { year: closedYear } = parseDateOnly(j.closed_at);
      const next = nextAnniversary(j.closed_at);
      return {
        id: j.id,
        client_name: j.client_name,
        property_address: j.property_address,
        next,
        yearsSinceClosing: next.getFullYear() - closedYear,
      };
    })
    .sort((a, b) => a.next - b.next);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "36px 32px 60px" }}>
      <div style={{ marginBottom: 26 }}>
        <h1 className="lh-display" style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>
          The Harbor
        </h1>
        <p style={{ fontSize: 14, color: "var(--lh-slate)", marginTop: 4 }}>
          The relationship doesn&apos;t end at closing. It anchors here.
        </p>
      </div>

      {anniversaries.length > 0 && (
        <div
          style={{
            background: "var(--lh-teal-soft)",
            border: "1px solid #BFE0DC",
            borderRadius: 14,
            padding: "16px 20px",
            marginBottom: 24,
          }}
        >
          <h2
            className="lh-display"
            style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px", color: "var(--lh-teal)" }}
          >
            Closing anniversaries
          </h2>
          <p style={{ fontSize: 12, color: "var(--lh-navy-soft)", margin: "0 0 12px" }}>
            Clients you&apos;ve opted in to a reminder for, soonest first.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {anniversaries.map((a) => (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 10,
                  flexWrap: "wrap",
                  fontSize: 13,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontWeight: 600, color: "var(--lh-navy)" }}>{a.client_name}</span>
                  {a.property_address && (
                    <span style={{ color: "var(--lh-slate)" }}> — {a.property_address}</span>
                  )}
                </div>
                <span className="lh-mono" style={{ color: "var(--lh-teal)", fontSize: 11.5, flexShrink: 0 }}>
                  {formatAnniversary(a.next)}
                  {a.yearsSinceClosing > 0 ? ` · ${a.yearsSinceClosing}yr` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {journeys?.map((j) => (
          <JourneyCard key={j.id} journey={j} />
        ))}
        {(!journeys || journeys.length === 0) && (
          <div style={{ color: "var(--lh-slate)", fontSize: 14 }}>
            No Journeys have reached the Harbor yet.
          </div>
        )}
      </div>
    </div>
  );
}
