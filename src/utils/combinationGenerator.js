/**
 * Generates every combination that picks exactly `count` electives from each required
 * type's eligible pool with no timetable clash.
 *
 * Strategy: depth-first search over requirement groups (smallest pool first), choosing
 * electives in index order within a group so each set is produced exactly once. A slot
 * occupancy set prunes any partial selection the moment it clashes, so clashing branches
 * are never expanded. Groups are disjoint by type, so the same elective cannot be chosen
 * twice and duplicate combinations cannot arise.
 *
 * @param {Array<{typeKey:string,count:number,pool:object[]}>} groups
 * @param {{limit?:number, onCombination?:(electives:object[])=>void}} options
 */
export function generateCombinations(groups, { limit = 250000, onCombination } = {}) {
  const ordered = [...groups].sort((a, b) => a.pool.length - b.pool.length);
  const occupied = new Map(); // slotKey -> count
  const chosen = [];
  const combos = [];
  let explored = 0;
  let pruned = 0;
  let truncated = false;

  const fits = (e) => e.slotKeys.every((k) => !occupied.get(k));
  const occupy = (e, delta) => e.slotKeys.forEach((k) => occupied.set(k, (occupied.get(k) || 0) + delta));

  function pickGroup(groupIndex) {
    if (truncated) return;
    if (groupIndex === ordered.length) {
      const combo = [...chosen];
      if (onCombination) onCombination(combo);
      else combos.push(combo);
      if (++explored >= limit) truncated = true;
      return;
    }
    const { pool, count } = ordered[groupIndex];
    pickWithin(groupIndex, pool, count, 0);
  }

  function pickWithin(groupIndex, pool, remaining, start) {
    if (truncated) return;
    if (remaining === 0) {
      pickGroup(groupIndex + 1);
      return;
    }
    // Not enough electives left in this pool to finish the group: prune.
    for (let i = start; i <= pool.length - remaining; i++) {
      const elective = pool[i];
      if (!fits(elective)) {
        pruned++;
        continue;
      }
      occupy(elective, 1);
      chosen.push(elective);
      pickWithin(groupIndex, pool, remaining - 1, i + 1);
      chosen.pop();
      occupy(elective, -1);
    }
  }

  if (ordered.every((g) => g.pool.length >= g.count)) pickGroup(0);
  return { combos, count: explored, pruned, truncated };
}

/** Stable identity for a combination, independent of order. */
export function comboKey(electives) {
  return electives.map((e) => e.key).sort().join('+');
}
