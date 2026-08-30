import { renderShell } from './layout/shell.js';
import { getState, recordAction, setState, subscribe } from './state/store.js';

const app = document.querySelector('#app');

function render(state = getState()) {
  app.innerHTML = renderShell(state);
  bindEvents();
}

function bindEvents() {
  document.querySelectorAll('[data-mode-choice]').forEach((button) => {
    button.addEventListener('click', () => setState({ mode: button.dataset.modeChoice }));
  });
  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => recordAction(button.dataset.action));
  });
}

subscribe(render);
render();
