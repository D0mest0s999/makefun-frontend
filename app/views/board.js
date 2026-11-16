// The bounty board (#/): every live bounty as a card — live pot, entry fee where one
// is set, a ticking countdown to the deadline, and the entries count. "Still takes
// entries" is read off the deadline, never the status: a bounty past its deadline can
// still report status open until its results are published.

import { getCompetitions } from '../api.js';
import { count, countdown, esc, isOpen, money } from '../format.js';

const SKELETONS = 6;

function skeleton() {
  return `<div class="grid">${'<article class="card skeleton" aria-hidden="true"><div class="sk-line wide"></div><div class="sk-line"></div><div class="sk-line short"></div></article>'.repeat(SKELETONS)}</div>`;
}

function card(b) {
  const open = isOpen(b.deadline);
  const topPrize = Array.isArray(b.rewardsNow) && b.rewardsNow.length ? b.rewardsNow[0].amountUsd : null;
  return `
  <article class="card ${open ? '' : 'closed'}">
    <div class="card-top">
      <span class="chip">${esc(b.category ?? 'Bounty')}</span>
      <span class="chip ${open ? 'chip-open' : 'chip-closed'}">${open ? 'Accepting entries' : 'Entries closed'}</span>
    </div>
    <h2><a href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a></h2>
    <p class="summary">${esc(b.summary ?? '')}</p>
    <div class="pot-row">
      <span class="pot">${money(b.potUsd ?? b.rewardAmount)}</span>
      <span class="pot-label">live pot${topPrize ? ` · ${money(topPrize)} to first` : ''}</span>
    </div>
    <dl class="card-facts">
      <div><dt>${open ? 'Closes in' : 'Closed'}</dt><dd>${open ? `<span data-deadline="${esc(b.deadline)}">${countdown(b.deadline)}</span>` : 'deadline passed'}</dd></div>
      <div><dt>Entries</dt><dd>${count(b.submissionCount)}</dd></div>
      <div><dt>Entry fee</dt><dd>${b.entryFeeUsd ? money(b.entryFeeUsd) : 'Free'}</dd></div>
    </dl>
  </article>`;
}

const SORTERS = {
  closing: (a, b) => new Date(a.deadline) - new Date(b.deadline),
  pot: (a, b) => Number(b.potUsd ?? b.rewardAmount ?? 0) - Number(a.potUsd ?? a.rewardAmount ?? 0),
  entries: (a, b) => (b.submissionCount ?? 0) - (a.submissionCount ?? 0),
  newest: (a, b) => new Date(b.publishedAt ?? 0) - new Date(a.publishedAt ?? 0),
};

export async function render(app) {
  document.title = 'make.fun bounties — the board';
  app.innerHTML = `<h1 class="page-title">Live bounties</h1>${skeleton()}`;
  const data = await getCompetitions('open');
  const items = Array.isArray(data?.items) ? data.items : [];

  app.innerHTML = `
    <div class="board-head">
      <h1 class="page-title">Live bounties</h1>
      <p class="lede">${items.length} bounties from the make.fun API. The pot is live: prize plus entry fees paid in so far.</p>
    </div>
    <form class="controls" id="controls">
      <label>Sort
        <select id="sort">
          <option value="closing">Closing soon</option>
          <option value="pot">Biggest pot</option>
          <option value="entries">Most entries</option>
          <option value="newest">Newest</option>
        </select>
      </label>
      <label>Search <input id="q" type="search" placeholder="Title or category" autocomplete="off"></label>
      <label class="check"><input id="open-only" type="checkbox" checked> Still taking entries</label>
    </form>
    <div id="grid"></div>`;

  const grid = app.querySelector('#grid');
  const sortSelect = app.querySelector('#sort');
  const query = app.querySelector('#q');
  const openOnly = app.querySelector('#open-only');

  const draw = () => {
    const term = query.value.trim().toLowerCase();
    const rows = items
      .filter((b) => !openOnly.checked || isOpen(b.deadline))
      .filter((b) => !term || `${b.title} ${b.category ?? ''} ${b.summary ?? ''}`.toLowerCase().includes(term))
      .sort(SORTERS[sortSelect.value] ?? SORTERS.closing);
    grid.innerHTML = rows.length
      ? `<div class="grid">${rows.map(card).join('')}</div>`
      : '<p class="empty">No bounties match. Loosen the filters to see more.</p>';
  };
  for (const el of [sortSelect, query, openOnly]) el.addEventListener('input', draw);
  draw();
}
