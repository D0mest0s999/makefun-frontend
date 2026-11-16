// The shell: hash routing, one lazy module per route, a ticking countdown clock and
// the "updated" note. Views render into <main id="app"> and own their own DOM.
//
//   #/                              the bounty board
//   #/bounty/<slug>                 one bounty's page
//   #/bounty/<slug>/leaderboard    its leaderboard
//   #/profile/<handle>              an account's public profile
//
// window.__shotReady is false while a route loads and true once its data has rendered,
// so a screenshot script knows when to capture.

import { forget, revalidate, setOnFreshData } from './api.js';
import { clock, countdown, esc } from './format.js';

const app = document.getElementById('app');
const updatedNote = document.getElementById('updated');

setOnFreshData((when) => {
  updatedNote.textContent = `updated ${clock(when)}`;
});

// Countdowns tick once a second by updating text nodes in place; the page itself is
// never rebuilt for the clock. Any element may carry data-deadline="<iso timestamp>".
setInterval(() => {
  for (const el of app.querySelectorAll('[data-deadline]')) {
    el.textContent = countdown(el.dataset.deadline);
  }
}, 1000);

// A route's module is fetched only when the route is first visited (import() below),
// so the first load carries just this shell, the API client and the formatters.
const routes = [
  { match: /^#\/bounty\/([^/]+)\/leaderboard\/?$/, load: () => import('./views/leaderboard.js'), view: 'leaderboard' },
  { match: /^#\/bounty\/([^/]+)\/?$/, load: () => import('./views/bounty.js'), view: 'bounty' },
  { match: /^#\/profile\/([^/]+)\/?$/, load: () => import('./views/profile.js'), view: 'profile' },
  { match: /^\/?$|^#\/?$/, load: () => import('./views/board.js'), view: 'board' },
];

let navigation = 0;

async function render() {
  const mine = ++navigation;
  window.__shotReady = false;
  const hash = location.hash || '#/';
  const route = routes.find((r) => r.match.test(hash)) ?? routes[routes.length - 1];
  const arg = route.match.exec(hash)?.[1];
  try {
    const module = await route.load();
    if (mine !== navigation) return;
    await module.render(app, arg ? decodeURIComponent(arg) : undefined, () => render());
  } catch (err) {
    if (mine !== navigation) return;
    document.title = 'Something went wrong | make.fun bounties';
    app.innerHTML = `
      <section class="error-box">
        <h1>That page could not be loaded</h1>
        <p>${esc(err instanceof Error ? err.message : String(err))}</p>
        <button type="button" id="retry">Try again</button>
      </section>`;
    app.querySelector('#retry').addEventListener('click', () => {
      for (const path of ['/competitions?status=open&activity=times&limit=100']) forget(path);
      revalidate();
      render();
    });
  }
  if (mine === navigation) {
    window.scrollTo(0, 0);
    window.__shotReady = true;
  }
}

window.addEventListener('hashchange', render);
render();
