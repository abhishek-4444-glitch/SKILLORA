/**
 * Hard rule: two electives clash when they share any timetable slot code.
 * A cell may hold several slot codes ("A; D") for courses that meet in more than one slot.
 */
export function sharedSlots(a, b) {
  return a.slotKeys.filter((k) => b.slotKeys.includes(k)).map((k) => a.slots[a.slotKeys.indexOf(k)]);
}

export function clashes(a, b) {
  return a.slotKeys.some((k) => b.slotKeys.includes(k));
}

/** Every clashing pair in a selection. */
export function findConflicts(electives) {
  const conflicts = [];
  for (let i = 0; i < electives.length; i++) {
    for (let j = i + 1; j < electives.length; j++) {
      const slots = sharedSlots(electives[i], electives[j]);
      if (slots.length) conflicts.push({ a: electives[i], b: electives[j], slots });
    }
  }
  return conflicts;
}
