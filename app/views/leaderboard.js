// A bounty's leaderboard (#/bounty/<slug>/leaderboard): the entries ranked as the API
// gives them, with the API's own columns. Leaderboards run to thousands of rows, so
// the table renders in pages of 100 behind a "Show more" button — the first paint
// stays small and the rest is one click away. Entrants link to their profiles.

import { getLeaderboard } from '../api.js';
import { cellText, count, esc } from '../format.js';

const PAGE = 100;

function row(entry, columns) {
  const badges = [
    entry.house ? '<span class="chip chip-house">house</span>' : '',
    entry.baseline ? '<span class="chip">baseline</span>' : '',
    entry.status && entry.status !== 'finished' ? `<span class="chip">${esc(entry.status)}</span>` : '',
  ].join(' ');
  const cells = columns.map((c) => `<td>${esc(cellText(c, entry))}</td>`).join('');
  return `<tr>
    <td class="rank">${entry.rank ?? '—'}</td>
    <td class="entrant"><a href="#/profile/${encodeURIComponent(entry.handle ?? '')}">@${esc(entry.handle ?? '')}</a> ${badges}<span class="entry-title">${esc(entry.title ?? '')}</span></td>
    ${cells}
  </tr>`;
}

export async function render(app, slug) {
  app.innerHTML = '<p class="loading">Loading the leaderboard…</p>';
  const data = await getLeaderboard(slug);
  const title = data?.competition?.title ?? data?.title ?? slug;
  document.title = `Leaderboard — ${title} | make.fun bounties`;
  const entries = Array.isArray(data?.entries) ? data.entries : [];
  const columns = (Array.isArray(data?.columns) ? data.columns : []).filter((c) => !c.hidden).slice(0, 4);
  const head = columns.map((c) => `<th>${esc(c.title)}</th>`).join('');

  app.innerHTML = `
    <p class="crumbs"><a href="#/bounty/${encodeURIComponent(slug)}">← ${esc(title)}</a></p>
    <h1 class="page-title">Leaderboard</h1>
    <p class="lede">${esc(data?.phase?.title ?? 'Results')} · ${count(entries.length)} ranked entries, best first, exactly as the API ranks them${data?.rank_key ? ` · ranked by ${esc(data.rank_key)}` : ''}.</p>
    <div class="table-wrap">
      <table class="board-table">
        <thead><tr><th>#</th><th>Entrant</th>${head}</tr></thead>
        <tbody id="rows"></tbody>
      </table>
    </div>
    <p class="more-row"><button type="button" id="more" class="button">Show more</button>
    <span class="muted" id="shown"></span></p>`;

  const tbody = app.querySelector('#rows');
  const more = app.querySelector('#more');
  const shown = app.querySelector('#shown');
  let rendered = 0;
  const draw = () => {
    const next = Math.min(entries.length, rendered + PAGE);
    tbody.insertAdjacentHTML('beforeend', entries.slice(rendered, next).map((e) => row(e, columns)).join(''));
    rendered = next;
    shown.textContent = entries.length ? `showing ${count(rendered)} of ${count(entries.length)}` : 'no ranked entries yet';
    more.hidden = rendered >= entries.length;
  };
  more.addEventListener('click', draw);
  draw();
}
