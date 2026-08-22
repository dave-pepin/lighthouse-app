// Standard milestone checklists, organized by stage, for each Journey role.
// These get created automatically when a new Journey is set up, so every
// client follows the same proven sequence instead of a hand-typed list.
//
// Buying and Selling follow genuinely different pipelines — not just
// different milestone wording within a shared set of stages. A stage
// whose entry is an object instead of an array (see "Financing" below,
// or Selling's "Final Preparations") has cash/financed variants, resolved
// by buildMilestoneTemplate.

export const MILESTONE_TEMPLATES = {
  Buying: {
    "Getting Started": [
      "Initial consultation",
      "Pre-approval received",
      "Home search set up",
    ],
    Searching: ["Tour properties", "Narrow down favorites", "Submit offer"],
    "Under Contract": [
      "Offer accepted",
      "Earnest money deposited",
      "Contract fully executed",
    ],
    Inspection: [
      "Inspection scheduled",
      "Inspection completed",
      "Repair negotiations resolved",
    ],
    Financing: {
      financed: [
        "Loan application submitted",
        "Appraisal completed",
        "Clear to close",
      ],
      cash: ["Proof of funds provided", "Clear to close"],
    },
    Closing: [
      "Final walkthrough",
      "Closing documents signed",
      "Keys received",
    ],
  },
  Selling: {
    Consultation: [
      "Initial consultation",
      "Market analysis completed",
      "Listing strategy agreed",
    ],
    "Listing Agreement": [
      "Listing agreement signed",
      "Listing paperwork completed",
    ],
    Showings: [
      "Professional photos taken",
      "Listing went live",
      "Showings scheduled",
    ],
    "Under Contract": [
      "Offer received",
      "Offer accepted",
      "Contract fully executed",
    ],
    "Final Preparations": {
      financed: [
        "Buyer inspection completed",
        "Repair requests negotiated",
        "Buyer's loan clear to close",
      ],
      cash: [
        "Buyer inspection completed",
        "Repair requests negotiated",
        "Buyer proof of funds confirmed",
      ],
    },
    Closed: [
      "Final walkthrough",
      "Closing documents signed",
      "Sale proceeds received",
    ],
  },
};

// The stage order the templates (and auto-advance logic) follow, per role.
// "Harbor" is the destination reached automatically once the last stage is
// done — it has no milestones of its own and isn't listed here.
export const MILESTONE_STAGE_ORDER = {
  Buying: ["Getting Started", "Searching", "Under Contract", "Inspection", "Financing", "Closing"],
  Selling: ["Consultation", "Listing Agreement", "Showings", "Under Contract", "Final Preparations", "Closed"],
};

// Builds a flat { stageName: [labels] } template for a given role and
// financing type. A stage entry that's an array is used as-is; one that's
// an object is a cash/financed variant, resolved here.
export function buildMilestoneTemplate(role, financingType) {
  const order = MILESTONE_STAGE_ORDER[role] || MILESTONE_STAGE_ORDER.Buying;
  const roleTemplate = MILESTONE_TEMPLATES[role] || {};
  const resolved = {};
  for (const stageName of order) {
    const entry = roleTemplate[stageName];
    if (!entry) continue;
    resolved[stageName] = Array.isArray(entry) ? entry : entry[financingType === "cash" ? "cash" : "financed"] || [];
  }
  return resolved;
}

// Flattens a role's template into a list of { stage, label, variantNote }
// rows, for UIs that need to show every possible milestone regardless of
// financing type (e.g. assigning a default video per milestone in
// Settings). Where a stage has cash/financed variants with different
// wording, both are included as separate rows, with variantNote set only
// when a label is specific to one variant (not shared by both).
export function flattenTemplateForRole(role) {
  const order = MILESTONE_STAGE_ORDER[role] || MILESTONE_STAGE_ORDER.Buying;
  const roleTemplate = MILESTONE_TEMPLATES[role] || {};
  const rows = [];

  for (const stage of order) {
    const entry = roleTemplate[stage];
    if (!entry) continue;

    if (Array.isArray(entry)) {
      for (const label of entry) {
        rows.push({ stage, label, variantNote: null });
      }
      continue;
    }

    const variantsByLabel = new Map();
    for (const variant of ["financed", "cash"]) {
      for (const label of entry[variant] || []) {
        if (!variantsByLabel.has(label)) variantsByLabel.set(label, new Set());
        variantsByLabel.get(label).add(variant);
      }
    }
    for (const [label, variants] of variantsByLabel) {
      rows.push({
        stage,
        label,
        variantNote: variants.size === 1 ? [...variants][0] : null,
      });
    }
  }

  return rows;
}
