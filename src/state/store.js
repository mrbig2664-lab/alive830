const queryMode = new URLSearchParams(window.location.search).get('mode');
const defaultMode = queryMode === 'folded' || queryMode === 'unfolded'
  ? queryMode
  : window.matchMedia?.('(max-width: 720px)').matches ? 'folded' : 'unfolded';

const initialState = {
  mode: defaultMode,
  records: { smoke: 7, drink: 0, move: 60, water: 6, food: 0 },
  lastAction: null,
  smokeEncountered: true,
};

let state = structuredClone(initialState);
const listeners = new Set();

export function getState() {
  return structuredClone(state);
}

export function setState(partial) {
  state = { ...state, ...partial };
  listeners.forEach((listener) => listener(getState()));
}

export function recordAction(actionId) {
  const records = { ...state.records };
  if (actionId === 'move') records.move += 30;
  else records[actionId] += 1;
  setState({ records, lastAction: actionId, smokeEncountered: actionId === 'smoke' ? true : state.smokeEncountered });
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
