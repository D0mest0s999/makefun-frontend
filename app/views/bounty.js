// One bounty's page (#/bounty/<slug>): summary, the live pot and its full rewards
// table, dates and status, then the description and the rules as rendered Markdown.

import { getCompetition } from '../api.js';
import { count, countdown, date, day, esc, isOpen, money } from '../format.js';
import { md } from '../markdown.js';

/** The rewards table: prefer the live curve (base + entry-fee share), else the base map.
 *  Consecutive places paying the same fold into one row with a range label (2–5). */
function rewardsTable(b) {
  if (Array.isArray(b.rewardsNow) && b.rewardsNow.length) {
    const groups = [];
    for (const r of b.rewardsNow) {
      const last = groups[groups.length - 1];
      if (last && last.baseUsd === r.baseUsd && last.feeShareUsd === r.feeShareUsd && last.amountUsd === r.amountUsd) {
        last.to = r.place;
      } else {
        groups.push({ from: r.place, to: r.place, baseUsd: r.baseUsd, feeShareUsd: r.feeShareUsd, amountUsd: r.amountUsd });
      }
    }
    const rows = groups
      .map(
        (g) => `<tr><td>${g.from === g.to ? g.from : `${g.from}–${g.to}`}</td><td>${money(g.baseUsd)}</td><td>${money(g.feeShareUsd)}</td><td class="num-strong">${money(g.amountUsd)}</td></tr>`,
      )
      .join('');
    return `<table class="rewards"><thead><tr><th>Place</th><th>Prize</th><th>Fee share</th><th>Pays now</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  if (b.rewards && typeof b.rewards === 'object') {
    const places = Object.keys(b.rewards).sort((a, c) => Number(a) - Number(c));
    const rows = places.map((p) => `<tr><td>${p}</td><td class="num-strong">${money(b.rewards[p])}</td></tr>`).join('');
    return `<table class="rewards"><thead><tr><th>Place</th><th>Prize</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  return '<p class="empty">No rewards table published.</p>';
}

export async function render(app, slug) {
  app.innerHTML = '<p class="loading">Loading the bounty…</p>';
  const b = await getCompetition(slug);
  document.title = `${b.title} | make.fun bounties`;
  const open = isOpen(b.deadline);
  const skills = Array.isArray(b.skills) && b.skills.length
    ? `<p class="chips">${b.skills.map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</p>`
    : '';
  const phases = Array.isArray(b.phases) && b.phases.length
    ? `<h2>Phases</h2><ol class="phases">${b.phases.map((p) => `<li><strong>${esc(p.title)}</strong> <span class="muted">${day(p.starts_at)} → ${day(p.ends_at)}</span><br>${esc(p.description ?? '')}</li>`).join('')}</ol>`
    : '';

  app.innerHTML = `
    <p class="crumbs"><a href="#/">← All bounties</a></p>
    <div class="card-top">
      <span class="chip">${esc(b.category ?? 'Bounty')}</span>
      <span class="chip ${open ? 'chip-open' : 'chip-closed'}">${open ? 'Accepting entries' : 'Entries closed'}</span>
      <span class="chip">Status: ${esc(b.status)}</span>
    </div>
    <h1 class="page-title">${esc(b.title)}</h1>
    <p class="lede">${esc(b.summary ?? '')}</p>
    ${skills}
    <section class="bounty-facts">
      <div class="fact pot-fact"><span class="fact-label">Live pot</span><span class="fact-value pot">${money(b.potUsd ?? b.rewardAmount)}</span></div>
      <div class="fact"><span class="fact-label">Entry fee</span><span class="fact-value">${b.entryFeeUsd ? money(b.entryFeeUsd) : 'Free'}</span></div>
      <div class="fact"><span class="fact-label">Entries</span><span class="fact-value">${count(b.submissionCount)}</span></div>
      <div class="fact"><span class="fact-label">${open ? 'Closes in' : 'Deadline'}</span><span class="fact-value">${open ? `<span data-deadline="${esc(b.deadline)}">${countdown(b.deadline)}</span>` : date(b.deadline)}</span></div>
      <div class="fact"><span class="fact-label">Opened</span><span class="fact-value">${date(b.opensAt ?? b.publishedAt)}</span></div>
      <div class="fact"><span class="fact-label">Deadline</span><span class="fact-value">${date(b.deadline)}</span></div>
    </section>
    <p class="actions"><a class="button" href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">See the leaderboard</a></p>
    <h2>Rewards</h2>
    ${rewardsTable(b)}
    ${b.resolution?.summary ? `<h2>How it is decided</h2><div class="prose"><p>${esc(b.resolution.summary)}</p></div>` : ''}
    <h2>Description</h2>
    <div class="prose">${md(b.description ?? '')}</div>
    ${phases}
    <h2>Rules</h2>
    <div class="prose rules">${md(b.rules ?? '')}</div>`;
}
