export const RESIDENT_CLASSES = Object.freeze({ CORE: 'core', VISITOR: 'visitor', FUTURE: 'future' });
export const CORE_RESIDENTS = Object.freeze(['zhanzhan', 'egg', 'smokeBeast']);
export const VISITOR_RESIDENTS = Object.freeze(['liver', 'muscle', 'moon', 'water']);
export const MAX_VISIBLE_VISITORS = 2;
export const MAX_VISIBLE_RESIDENTS = MAX_VISIBLE_VISITORS;

const visitor = Object.freeze([RESIDENT_CLASSES.VISITOR]);

// Normalized room coordinates and semantic rendering metadata keep visitors
// readable and give placement a real collision contract.
export const ROOM_RESIDENT_ANCHORS = Object.freeze([
  Object.freeze({ id: 'rug_back_left', className: 'room-anchor-rug_back_left', position: Object.freeze({ left: '66%', bottom: '17%' }), scale: 1, zLayer: 1, allowedResidentTypes: visitor, bounds: Object.freeze({ x: .66, y: .66, width: .08, height: .17 }) }),
  Object.freeze({ id: 'rug_back_center', className: 'room-anchor-rug_back_center', position: Object.freeze({ left: '76%', bottom: '17%' }), scale: 1, zLayer: 1, allowedResidentTypes: visitor, bounds: Object.freeze({ x: .76, y: .66, width: .08, height: .17 }) }),
  Object.freeze({ id: 'rug_back_right', className: 'room-anchor-rug_back_right', position: Object.freeze({ right: '4%', bottom: '17%' }), scale: 1, zLayer: 1, allowedResidentTypes: visitor, bounds: Object.freeze({ x: .88, y: .66, width: .08, height: .17 }) }),
  Object.freeze({ id: 'table_side', className: 'room-anchor-table_side', position: Object.freeze({ right: '16%', bottom: '36%' }), scale: .95, zLayer: 3, allowedResidentTypes: visitor, bounds: Object.freeze({ x: .76, y: .46, width: .08, height: .14 }) }),
  Object.freeze({ id: 'bed_side', className: 'room-anchor-bed_side', position: Object.freeze({ left: '22%', bottom: '20%' }), scale: .9, zLayer: 3, allowedResidentTypes: visitor, bounds: Object.freeze({ x: .22, y: .63, width: .07, height: .14 }) }),
  Object.freeze({ id: 'window_side', className: 'room-anchor-window_side', position: Object.freeze({ right: '27%', top: '28%' }), scale: .82, zLayer: 3, allowedResidentTypes: visitor, bounds: Object.freeze({ x: .65, y: .28, width: .07, height: .12 }) })
]);

const PROTECTED_BOUNDS = Object.freeze([
  Object.freeze({ id: 'zhanzhan', x: .28, y: .63, width: .20, height: .31, zLayer: 6 }),
  Object.freeze({ id: 'egg', x: .50, y: .67, width: .16, height: .25, zLayer: 5 }),
  Object.freeze({ id: 'smokeBeast', x: .68, y: .64, width: .13, height: .22, zLayer: 6 }),
  Object.freeze({ id: 'bed', x: .01, y: .68, width: .38, height: .25, zLayer: 2 }),
  Object.freeze({ id: 'table', x: .70, y: .67, width: .29, height: .25, zLayer: 2 })
]);

function overlaps(a, b) { return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y; }
function residentClass(candidate) { return candidate?.residentClass || candidate?.class || RESIDENT_CLASSES.VISITOR; }
export function anchorForId(id) { return ROOM_RESIDENT_ANCHORS.find(anchor => anchor.id === id) || null; }

export function placeResidents(candidates, max = MAX_VISIBLE_VISITORS) {
  const placed = [];
  const seen = new Set();
  const limit = Math.min(Math.max(Number(max) || 0, 0), MAX_VISIBLE_VISITORS);
  for (const candidate of candidates || []) {
    if (!candidate?.id || seen.has(candidate.id) || residentClass(candidate) !== RESIDENT_CLASSES.VISITOR) continue;
    seen.add(candidate.id);
    if (placed.length >= limit) break;
    const anchor = ROOM_RESIDENT_ANCHORS.find(item => item.allowedResidentTypes.includes(residentClass(candidate)) && !placed.some(resident => overlaps(item.bounds, resident.anchorBounds)) && !PROTECTED_BOUNDS.some(protectedBounds => overlaps(item.bounds, protectedBounds) && ['zhanzhan', 'egg', 'smokeBeast'].includes(protectedBounds.id)) && !PROTECTED_BOUNDS.some(protectedBounds => item.zLayer >= protectedBounds.zLayer && overlaps(item.bounds, protectedBounds)));
    if (!anchor) continue;
    placed.push({ ...candidate, residentClass: RESIDENT_CLASSES.VISITOR, anchor: anchor.id, anchorClass: anchor.className, anchorBounds: anchor.bounds, anchorScale: anchor.scale, anchorZLayer: anchor.zLayer });
  }
  return placed;
}

export function placementAudit(candidates, max = MAX_VISIBLE_VISITORS) {
  const ids = [...new Set((candidates || []).filter(Boolean).map(candidate => candidate.id))];
  const placed = placeResidents(candidates, max);
  return { eligible: ids.length, placed: placed.length, skipped: Math.max(0, ids.length - placed.length), anchors: placed.map(resident => resident.anchor), overcrowded: placed.length > MAX_VISIBLE_VISITORS || placed.some((resident, index) => placed.slice(index + 1).some(other => overlaps(resident.anchorBounds, other.anchorBounds))) };
}
