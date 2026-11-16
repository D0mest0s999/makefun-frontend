// An account's public profile (#/profile/<handle>): who they are, their record, and
// every entry they have made, each linking back to its bounty and its leaderboard.

import { getProfile } from '../api.js';
import { count, day, esc, money } from '../format.js';

function avatar(p) {
  const url = p.image ?? p.avatar;
  const name = p.display_name ?? p.handle ?? '?';
  if (url) {
    const img = document.createElement('img');
    img.className = 'avatar';
    img.alt = '';
    img.crossOrigin = 'anonymous'; // make.fun's images ask for CORS mode (see the rules)
    img.src = url;
    img.addEventListener('error', () => img.replaceWith(letterDisc(name)));
    return img;
  }
  return letterDisc(name);
}

function letterDisc(name) {
  const disc = document.createElement('span');
  disc.className = 'avatar avatar-letter';
  disc.textContent = String(name).trim().charAt(0).toUpperCase() || '?';
  return disc;
}

function solution(s) {
  const c = s.competition ?? {};
  let score = '';
  if (s.score?.display) {
    const value = Number(s.score.value);
    const isRate = (s.score.column?.key === 'judge' || /win rate/i.test(s.score.column?.title ?? ''))
      && Number.isFinite(value) && Math.abs(value) >= 10000;
    score = `${esc(s.score.column?.title ?? 'Score')} ${isRate ? `${(value / 10000).toFixed(2)}%` : esc(s.score.display)}`;
  }
  const placed = s.placement ? `placed #${s.placement}` : 'not placed yet';
  const prize = s.prize_usd ? ` · won ${money(s.prize_usd)}` : '';
  return `<li class="solution">
    <a href="#/bounty/${encodeURIComponent(c.slug ?? '')}">${esc(s.title ?? '')}</a>
    <span class="muted">in ${esc(c.title ?? '')} · ${placed}${prize}${score ? ` · ${score}` : ''} · entered ${day(s.entered_at)}</span>
    <a class="muted" href="#/bounty/${encodeURIComponent(c.slug ?? '')}/leaderboard">leaderboard</a>
  </li>`;
}

export async function render(app, handle) {
  app.innerHTML = '<p class="loading">Loading the profile…</p>';
  const p = await getProfile(handle);
  document.title = `@${p.handle} | make.fun bounties`;
  const record = p.record ?? {};
  // Only URLs the API itself hands over become links; a login name is shown as text.
  const links = [
    p.github_login ? `GitHub @${esc(p.github_login)}` : '',
    p.discord?.url ? `<a href="${esc(p.discord.url)}" rel="noopener">Discord ${esc(p.discord.global_name ?? p.discord.username ?? '')}</a>` : '',
    p.x?.url ? `<a href="${esc(p.x.url)}" rel="noopener">X ${esc(p.x.username ?? '')}</a>` : '',
  ].filter(Boolean).join(' · ');
  const wallet = p.wallet?.address
    ? `<div class="fact"><span class="fact-label">Wallet</span><span class="fact-value mono">${esc(p.wallet.address.slice(0, 6))}…${esc(p.wallet.address.slice(-4))}</span></div>`
    : '';
  const solutions = Array.isArray(p.solutions) ? p.solutions : [];

  app.innerHTML = `
    <p class="crumbs"><a href="#/">← All bounties</a></p>
    <section class="profile-head">
      <span id="avatar-slot"></span>
      <div>
        <h1 class="page-title">${esc(p.display_name ?? p.handle)} <span class="muted">@${esc(p.handle)}</span></h1>
        ${p.bio ? `<p class="lede">${esc(p.bio)}</p>` : ''}
        <p class="muted">Joined ${day(p.joined_at)}${p.house ? ' · house account' : ''}${links ? ` · ${links}` : ''}</p>
      </div>
    </section>
    <section class="bounty-facts">
      <div class="fact"><span class="fact-label">Entered</span><span class="fact-value">${count(record.competitions_entered)}</span></div>
      <div class="fact"><span class="fact-label">Placed</span><span class="fact-value">${count(record.competitions_placed)}</span></div>
      <div class="fact"><span class="fact-label">Won</span><span class="fact-value">${count(record.competitions_won)}</span></div>
      <div class="fact"><span class="fact-label">Podiums</span><span class="fact-value">${count(record.podium_finishes)}</span></div>
      <div class="fact"><span class="fact-label">Best place</span><span class="fact-value">${record.best_placement ? `#${record.best_placement}` : '—'}</span></div>
      <div class="fact"><span class="fact-label">Prizes</span><span class="fact-value">${money(record.prize_usd ?? 0)}</span></div>
      ${wallet}
    </section>
    <h2>Entries</h2>
    ${solutions.length ? `<ul class="solutions">${solutions.map(solution).join('')}</ul>` : '<p class="empty">No entries yet.</p>'}`;
  app.querySelector('#avatar-slot').replaceWith(avatar(p));
}
