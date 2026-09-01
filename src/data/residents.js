export const MAX_VISIBLE_RESIDENTS = 2;

// Semantic anchors keep residents in the same world scale and give the room
// a small, explicit number of safe places to welcome companions.
export const ROOM_RESIDENT_ANCHORS = Object.freeze([
  { id: 'resident_rug_back_left', className: 'room-anchor-resident_rug_back_left' },
  { id: 'resident_rug_back_right', className: 'room-anchor-resident_rug_back_right' },
  { id: 'resident_bedside', className: 'room-anchor-resident_bedside' },
  { id: 'resident_table', className: 'room-anchor-resident_table' },
]);

export function placeResidents(candidates, max = MAX_VISIBLE_RESIDENTS) {
  const unique = [];
  const seen = new Set();
  for (const candidate of candidates) {
    if (!candidate?.id || seen.has(candidate.id)) continue;
    seen.add(candidate.id);
    unique.push(candidate);
  }
  return unique.slice(0, max).map((resident, index) => ({
    ...resident,
    anchor: ROOM_RESIDENT_ANCHORS[index].id,
    anchorClass: ROOM_RESIDENT_ANCHORS[index].className,
  }));
}
