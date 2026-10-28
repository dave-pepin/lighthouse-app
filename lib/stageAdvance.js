// Where a Journey's course-line should be, given its milestones: the stage
// of the first not-yet-done milestone at or after the current stage.
// Returns that stage's index, or null to stay put. Only ever moves
// forward.
//
// It used to step forward one stage, and only when the current stage had
// milestones and they were all done. A stage with no milestones — the
// agent deleted them, or filed them under another stage — then had
// nothing left to check off, and the Journey sat there for good, even
// once everything after it was done.
//
// `stages` is the role's pipeline (stagesForRole), ending in "Harbor".
// `milestones` is every milestone on the Journey, as { stage, done }.
export function targetStageIndex(stages, currentStage, milestones) {
  const harborIndex = stages.length - 1;
  const currentIndex = stages.indexOf(currentStage);
  if (currentIndex < 0 || currentIndex >= harborIndex) return null;

  const hasUndone = (i) => milestones.some((m) => m.stage === stages[i] && !m.done);
  const hasAny = (i) => milestones.some((m) => m.stage === stages[i]);

  if (hasUndone(currentIndex)) return null;

  for (let i = currentIndex + 1; i < harborIndex; i++) {
    if (hasUndone(i)) return i;
  }

  // Nothing left to do from here on. Into the Harbor only if the final
  // stage (Closing/Closed) actually had milestones and they're all done —
  // not just because the rest of the pipeline is empty.
  if (hasAny(harborIndex - 1)) return harborIndex;
  // Otherwise the old behavior: a finished current stage moves on one.
  if (hasAny(currentIndex)) return currentIndex + 1;
  return null;
}
