import { authEntry, accountInfo, passwordRecovery } from './auth.js';
import { client } from './backend.js';
import * as S from './store.js';
import { $, $$, esc, icon, button, badge, empty, toast, modal, close, initials, money, date, time, lifecycle, exportCSV, download } from './ui.js';
import * as W from './wizards.js';
import { clearPhotos, photoURL } from './media.js';
let page = 'Overview',
  filter = {
    q: '',
    category: 'All',
    campus: 'All',
    location: '',
    status: 'All',
    date: '',
    maxPrice: '',
    supervision: false,
    cert: false,
    free: false,
    type: 'All',
    proximity: 'all'
  },
  view = 'grid',
  bookingFilter = 'All',
  compare = [],
  selectedResource = '',
  recentOnly = false,
  favoritesOnly = false,
  inventorySort = 'name',
  calendarDate = new Date(S.today() + 'T12:00:00+05:30'),
  calendarView = 'month',
  timeframe = '30',
  discussionResource = '',
  activityFilter = {
    q: '',
    type: 'All',
    date: ''
  },
  map;
const g = () => S.get(),
  u = () => S.user(),
  r = id => g().resources.find(x => x.id === id),
  person = id => g().users.find(x => x.id === id),
  visibleBookings = () => g().bookings.filter(b => u().role === 'admin' || u().role === 'owner' && r(b.resourceId)?.ownerId === u().id || b.userId === u().id),
  published = () => g().resources.filter(r => r.published),
  action = (name, id = '') => `data-action="${name}" data-id="${esc(id)}"`,
  nav = name => `data-page="${esc(name)}"`,
  categories = () => [...new Set(g().resources.map(r => r.category))];
const navs = {
  borrower: [['Workspace', [['Overview', 'grid'], ['Explore Resources', 'search'], ['My Bookings', 'calendar'], ['Access Passes', 'pass']]], ['My activity', [['Eligibility & Certifications', 'shield'], ['Notifications', 'bell'], ['Activity History', 'history'], ['Saved Resources', 'heart']]], ['Community', [['Operations & Insights', 'chart'], ['Price Watchlist', 'bell'], ['Item Discussions', 'book']]], ['Account', [['Profile', 'user'], ['Settings', 'settings']]]],
  owner: [['Workspace', [['Overview', 'grid'], ['My Inventory', 'box'], ['Add Resource', 'plus'], ['Booking Requests', 'calendar'], ['Calendar', 'calendar']]], ['Operations', [['Active Sessions', 'clock'], ['Return Inspections', 'shield'], ['Incident Reports', 'flag'], ['Fair Access', 'compare']]], ['Management', [['Operations & Insights', 'chart'], ['Price Watchlist', 'bell'], ['Item Discussions', 'book'], ['Audit History', 'history'], ['Settings', 'settings']]]],
  admin: [['Institution', [['Institutional Overview', 'grid'], ['All Resources', 'box'], ['User Verification', 'shield'], ['Allocation Policies', 'compare'], ['Approvals & Oversight', 'calendar']]], ['Operations', [['Incident Management', 'flag'], ['Audit History', 'history'], ['Analytics', 'chart'], ['Calendar', 'calendar'], ['Price Watchlist', 'bell'], ['Item Discussions', 'book']]], ['Account', [['Profile', 'user'], ['Settings', 'settings']]]]
};
function safe(fn) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (e) {
      toast(e.message, true);
    }
  };
}
function go(name) {
  page = name;
  selectedResource = '';
  bookingFilter = 'All';
  render();
  window.scrollTo(0, 0);
  $('#main')?.focus({
    preventScroll: true
  });
}
W.configure(name => {
  if (name) page = name;
  render();
});
function pagehead(title, sub, buttons = '') {
  return `<div class="pagehead"><div><div class="eyebrow">${u().role === 'borrower' ? 'Your campus. Your possibilities.' : u().role === 'owner' ? 'The resource owner workspace' : 'Institutional operations'}</div><h1>${title}</h1><p>${sub}</p></div>${buttons ? `<div class="row wrap">${buttons}</div>` : ''}</div>`;
}
function render() {
  if (!u()) {
    entry();
    return;
  }
  const user = u(),
    unread = g().notifications.filter(n => n.to.includes(user.id) && !n.read.includes(user.id)).length;
  $('#app').innerHTML = `<aside class="sidebar" id="sidebar"><a href="#" class="brand" ${nav('Overview')}><span class="logo-mark">s</span><span>sahyog<small>institutional commons</small></span></a><button class="collapse" ${action('collapse')} aria-label="Collapse sidebar">${icon('chevron')}</button><div class="campus-label">${icon('pin')}Sahyog Innovation Centre <span style="margin-left:auto">⌄</span></div><nav aria-label="${user.role} workspace">${navs[user.role].map(([group, links]) => `<div class="nav-group">${group}</div>${links.map(([name, ic]) => `<button class="nav-link ${page === name ? 'active' : ''}" ${nav(name)} title="${name}" ${page === name ? 'aria-current="page"' : ''}>${icon(ic)}<span>${name}</span>${name === 'Booking Requests' ? `<span class="count">${visibleBookings().filter(b => b.status === 'Pending').length}</span>` : ''}</button>`).join('')}`).join('')}</nav><div class="sidebar-footer"><div class="demo-mini"><strong>Small shares. Big possibilities.</strong><p>Your resources and reservations sync across devices.</p>${button('Account information ' + icon('arrow'), action('personas'), 'small full')}</div><div class="account row"><span class="avatar">${initials(user.name)}</span><div><strong>${esc(user.name)}</strong><br><small>${user.role} · Account</small></div></div></div></aside><div class="shell"><header class="topbar"><div class="row"><button class="iconbtn mobile-only" ${action('menu')} aria-label="Open navigation">${icon('menu')}</button><button class="iconbtn expand-only" ${action('collapse')} aria-label="Expand sidebar">${icon('menu')}</button><div class="crumb"><span>Workspace</span>${icon('chevron')}<strong>${esc(page)}</strong></div></div><div class="top-actions">${button('Refresh',action('refresh'),'small ghost')}<form id="global-search" class="global-search">${icon('search')}<input name="query" aria-label="Search resources and bookings" placeholder="Search your workspace…"></form><button class="iconbtn" ${action('theme')} aria-label="Switch color theme">${icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon')}</button><button class="iconbtn" style="position:relative" ${nav('Notifications')} aria-label="Notifications${unread ? ', ' + unread + ' unread' : ''}">${icon('bell')}${unread ? '<span class="notification-dot"></span>' : ''}</button><details class="profile-menu"><summary aria-label="Account menu"><span class="avatar">${initials(user.name)}</span></summary><div class="dropdown"><strong>${esc(user.name)}</strong><p class="helper">${esc(user.email)}</p>${button('Your profile', nav('Profile'), 'ghost')}${button('Account information', action('personas'), 'ghost')}${button('Help & demo guide', action('help'), 'ghost')}${button('Leave workspace', action('logout'), 'ghost danger')}</div></details></div></header><main id="main" class="workspace" tabindex="-1"><div class="demo-ribbon"><div class="row"><span class="demo-pill">CONNECTED</span><span>Supabase connected · Shared workspace · Payments are illustrative</span></div><span>India Standard Time</span></div>${S.storageWarning ? `<div class="notice warning mb">${esc(S.storageWarning)}</div>` : ''}<div id="content" class="content-enter"></div><div id="guide" class="guide"></div></main></div>`;
  renderContent();
  renderGuide();
  $('#global-search').onsubmit = e => {
    e.preventDefault();
    globalSearch(e.target.query.value);
  };
}
function entry() {
  authEntry(render);
}
function stats(items) {
  return `<section class="stats" aria-label="Workspace metrics">${items.map(([name, value, ic, note]) => `<article class="stat"><div class="row between"><span class="stat-label">${name}</span><span class="stat-icon">${icon(ic)}</span></div><strong>${value}</strong><small>${note}</small></article>`).join('')}</section>`;
}
function network() {
  return `<div class="hero-art" aria-hidden="true"><div class="network"><div class="network-core">${icon('box')}</div>${['book', 'calendar', 'shield', 'user'].map(x => `<span class="network-node">${icon(x)}</span>`).join('')}</div><div class="art-tag">${icon('check')} A little sharing goes a long way.</div></div>`;
}
function resourcePhoto(r, extra = '') {
  return `<div class="resource-photo ${extra}"><span class="fallback">${icon(r.type === 'Space' ? 'grid' : 'box')}</span>${r.photoId ? `<img data-photo="${esc(r.photoId)}" alt="${esc(r.name)}">` : r.image ? `<img src="${esc(r.image)}" alt="Illustrative ${esc(r.name)}" loading="lazy">` : ''}</div>`;
}
function cards(rs, compact = false) {
  if (!rs.length) return empty('The right resource is out there.', 'Try another search or clear your filters.', button('Clear filters', action('clear-filters'), 'soft'));
  return `<div class="${compact ? 'resource-list' : 'resource-grid'}">${rs.map(x => `<article class="resource-card">${resourcePhoto(x).replace('</div>', `${badge(x.published ? x.status : 'Draft')}<button class="favorite ${(g().favorites[u().id] || []).includes(x.id) ? 'saved' : ''}" ${action('favorite', x.id)} aria-label="${(g().favorites[u().id] || []).includes(x.id) ? 'Remove from' : 'Add to'} favorites: ${esc(x.name)}" aria-pressed="${(g().favorites[u().id] || []).includes(x.id)}">${icon('heart')}</button></div>`)}<div class="resource-body"><span class="eyebrow">${esc(x.category)}</span><h3>${esc(x.name)}</h3><small>${esc(x.owner)}</small><small>${icon('pin')} ${esc(x.location)}</small><div class="card-requirements">${icon('shield')}${x.certRequired === 'None' ? 'Open eligibility' : 'Training required'}<span>·</span>${x.supervisionRequired ? 'Supervised' : 'Independent use'}</div><div class="resource-bottom"><strong>${money(x.hourlyRate)} ${x.hourlyRate ? '<small>/ hour*</small>' : ''}</strong>${button('View details ' + icon('arrow'), action('detail', x.id))}</div><label class="compare-control"><input type="checkbox" data-compare="${x.id}" ${compare.includes(x.id) ? 'checked' : ''}>Compare resource</label></div></article>`).join('')}</div>${compare.length ? `<div class="compare-bar row between wrap"><span>${compare.length} / 3 resources selected</span><div class="row">${button('Clear', action('compare-clear'), 'small')}${button('Compare side by side', action('compare'), 'small')}</div></div>` : ''}`;
}
function bookings(bs) {
  if (!bs.length) return empty('A little space for your next idea.', 'No bookings in this view yet.', button('Explore resources', nav('Explore Resources'), 'soft'));
  return bs.map(b => {
    const x = r(b.resourceId),
      borrower = person(b.userId),
      own = u().id === b.userId,
      manager = u().role === 'admin' || u().id === x.ownerId;
    return `<article class="booking-card"><div class="booking-top">${x.image ? `<img class="booking-thumb" src="${esc(x.image)}" alt="Illustrative ${esc(x.name)}" loading="lazy">` : ''}<div style="flex:1;min-width:0"><small style="font-size:9px">${esc(b.id)} ${b.sample ? '· Seeded example' : ''} · ${esc(borrower.name)}</small><h3>${esc(x.name)}</h3><div class="booking-meta"><span>${icon('calendar')} ${date(b.start)}</span><span>${icon('clock')} ${time(b.start)}–${time(b.end)} IST · ${S.hours(b)} h</span></div></div>${badge(b.status)}</div>${b.reason ? `<div class="booking-reason">${esc(b.reason)}</div>` : ''}${b.extension ? `<p class="helper mt">Extension: ${b.extension.status} · until ${time(b.extension.end)} IST</p>` : ''}${lifecycle(b)}<div class="booking-actions">${button('View journey', action('journey', b.id))}${own && ['Pending', 'Waitlisted', 'Approved'].includes(b.status) ? button('Cancel', `data-booking-action="cancel" data-id="${b.id}"`) : ''}${own && b.status === 'Approved' ? button('Start check-in', `data-booking-action="checkin" data-id="${b.id}"`, 'primary') : ''}${own && b.status === 'Active' ? button('Start return', `data-booking-action="return" data-id="${b.id}"`, 'primary') + button('Request extension', `data-booking-action="extension" data-id="${b.id}"`) : ''}${own && ['Approved', 'Active'].includes(b.status) ? button('View demo pass', action('pass', b.id)) : ''}${manager && ['Pending', 'Waitlisted'].includes(b.status) ? button('Evaluate & approve', `data-booking-action="approve" data-id="${b.id}"`, 'primary') + button('Waitlist', `data-booking-action="waitlist" data-id="${b.id}"`) + button('Reject', `data-booking-action="reject" data-id="${b.id}"`, 'danger') : ''}${manager && b.status === 'Awaiting Inspection' ? button('Inspect return', action('inspect', b.id), 'primary') : ''}${manager && b.status === 'Active' && b.extension?.status === 'Pending' ? button('Approve extension', `data-booking-action="extension-approve" data-id="${b.id}"`) + button('Decline extension', `data-booking-action="extension-reject" data-id="${b.id}"`) : ''}${manager && b.status === 'Approved' && new Date(b.end) < new Date() ? button('Record no-show', `data-booking-action="no-show" data-id="${b.id}"`) : ''}${u().role === 'admin' && b.managerReview?.status === 'Requested' ? button('Review exception', `data-booking-action="manager-approve" data-id="${b.id}"`, 'soft') : ''}${(own || manager) && ['Pending', 'Waitlisted', 'Rejected'].includes(b.status) ? button('Manager review', `data-booking-action="manager-review" data-id="${b.id}"`) : ''}${button('Report issue', action('incident', b.id), 'danger')}</div></article>`;
  }).join('');
}
function activity(events, limited = false) {
  return events.length ? `<div class="${limited ? 'timeline-preview' : ''}">${events.map(e => `<div class="event"><small>${date(e.at)} · ${time(e.at)} · ${esc(e.actor)} ${e.sample ? '· Seeded example' : ''}</small><strong>${esc(e.action)}</strong><p>${esc(e.details)}</p>${button('View record ' + icon('arrow'), action('event', e.id), 'ghost small')}</div>`).join('')}</div>` : empty('Your shared story starts here.', 'Actions in the demo create a local activity record.');
}
function visibleActivity() {
  const ids = visibleBookings().map(b => b.id);
  return g().activity.filter(a => u().role === 'admin' || a.actor === u().name || ids.includes(a.target) || u().role === 'owner' && r(a.resourceId)?.ownerId === u().id);
}
function overview() {
  const bs = visibleBookings(),
    mine = u().role === 'borrower',
    completed = bs.filter(b => b.status === 'Completed'),
    hrs = completed.reduce((n, b) => n + S.hours(b), 0),
    active = bs.filter(b => ['Approved', 'Active'].includes(b.status)),
    pending = bs.filter(b => b.status === 'Pending');
  let recommended = published().filter(x => u().interests.includes(x.category) && S.eligible(g(), u(), x));
  if (recommended.length < 3) recommended = [...new Set([...recommended, ...published()])];
  return pagehead(mine ? `Good ${new Date().getHours() < 12 ? 'morning' : 'day'}, ${esc(u().name.split(' ')[0])}.` : u().role === 'owner' ? 'Every resource. In good hands.' : 'A connected view of your institution.', mine ? 'Your next big idea deserves the right resources.' : 'Turn shared capacity into shared opportunity.', button(mine ? 'Explore resources ' + icon('arrow') : icon('plus') + ' Add resource', mine ? nav('Explore Resources') : action('add'), 'primary')) + (mine ? `<section class="hero"><div class="hero-copy"><div class="eyebrow">MAKE ROOM FOR YOUR NEXT BIG IDEA</div><h2>More possibilities.<br>Already on your campus.</h2><p>From a first prototype to a research breakthrough. Discover the tools, spaces, and technology to make it happen.</p>${button('Find your next resource ' + icon('arrow'), nav('Explore Resources'), 'primary')}</div>${network()}</section>` : '') + stats(mine ? [['Available resources', published().filter(r => r.status === 'Available').length, 'box', 'Ready to discover'], ['Active bookings', active.length, 'calendar', 'Approved & in use'], ['Pending requests', pending.length, 'clock', 'Awaiting an owner decision'], ['Hours accessed', hrs + ' h', 'chart', 'From completed sessions']] : [['Shared resources', g().resources.filter(x => u().role === 'admin' || x.ownerId === u().id).length, 'box', 'In your local inventory'], ['Pending approvals', pending.length, 'calendar', 'A decision makes a difference'], ['Active sessions', bs.filter(b => b.status === 'Active').length, 'clock', 'Currently checked in'], ['Returns to inspect', bs.filter(b => b.status === 'Awaiting Inspection').length, 'shield', 'Close the loop with care']]) + (mine ? `<div class="section-heading"><div><h2>Picked for your next project</h2><p>Based on demo interests and qualifications where available.</p></div>${button('View all ' + icon('arrow'), nav('Explore Resources'), 'ghost')}</div>${cards(recommended.slice(0, 3))}` : `<div class="section-heading"><h2>Your next decisions</h2>${button('View request queue ' + icon('arrow'), nav('Booking Requests'), 'ghost')}</div>${bookings(bs.filter(b => ['Pending', 'Waitlisted', 'Awaiting Inspection'].includes(b.status)).slice(0, 2))}`) + `<div class="overview-bottom mt"><section><div class="section-heading"><h2>${mine ? 'Coming up next' : 'Today & upcoming'}</h2>${button('Calendar ' + icon('arrow'), nav('Calendar'), 'ghost')}</div>${bookings(active.slice(0, 2))}</section><section class="stack"><div class="section-heading"><h2>A little momentum</h2></div><div class="panel impact"><div class="eyebrow" style="color:#bad4ac">THE IMPACT OF SHARING</div><h3 class="mt">Idle tools. Active ideas.</h3><strong>${hrs} <span style="font-size:14px">hours</span></strong><p>of completed shared access across ${completed.length} completed booking${completed.length === 1 ? '' : 's'} in this workspace.</p><div class="progress"><span style="width:${Math.min(100, hrs / Math.max(1, bs.reduce((n, b) => n + S.hours(b), 0)) * 100)}%"></span></div><small style="color:#bfd3c3">Completed hours as a share of requested hours</small></div><div class="panel"><h3>Quick actions</h3><div class="quick-actions">${[['Find equipment', 'Explore Resources', 'search'], ['Book a space', 'Explore Resources', 'grid'], ['Your requests', 'My Bookings', 'calendar'], ['Check eligibility', 'Eligibility & Certifications', 'shield']].map(([t, n, i]) => button(icon(i) + t, nav(n), 'soft')).join('')}</div></div></section></div><div class="section-heading"><h2>Recent workspace activity</h2>${button('See all ' + icon('arrow'), nav('Activity History'), 'ghost')}</div><div class="panel">${activity(visibleActivity().slice(0, 4), true)}</div>`;
}
function filteredResources() {
  return published().filter(x => (!favoritesOnly || (g().favorites[u().id] || []).includes(x.id)) && (!recentOnly || (g().recent[u().id] || []).includes(x.id)) && `${x.name} ${x.description} ${x.owner}`.toLowerCase().includes(filter.q.toLowerCase()) && (filter.category === 'All' || x.category === filter.category) && (filter.campus === 'All' || x.campus === filter.campus) && x.location.toLowerCase().includes(filter.location.toLowerCase()) && (filter.status === 'All' || x.status === filter.status) && (!filter.maxPrice || x.hourlyRate <= Number(filter.maxPrice)) && (!filter.supervision || x.supervisionRequired) && (!filter.cert || x.certRequired !== 'None') && (!filter.free || x.hourlyRate === 0) && (filter.type === 'All' || x.type === filter.type) && (filter.proximity === 'all' || x.distanceKm <= Number(filter.proximity)) && (!filter.date || !(x.blockedDates || []).includes(filter.date) && !(g().busy||[]).some(b => b.resourceId === x.id && b.start.slice(0,10)===filter.date)));
}
function filters() {
  return `<aside class="filter-panel" id="filters" aria-label="Resource filters"><div class="row between"><h3>Refine your discovery</h3>${button('Reset', action('clear-filters'), 'ghost small')}</div><details open><summary>Where & when</summary><label>Institution / campus<select data-filter="campus"><option>All</option>${[...new Set(published().map(r => r.campus))].map(x => `<option ${filter.campus === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label><label>Building / location<input data-filter="location" value="${esc(filter.location)}" placeholder="Search location"></label><label>Availability<select data-filter="status">${['All', 'Available', 'Maintenance'].map(x => `<option ${filter.status === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label>Booking date<input data-filter="date" type="date" value="${filter.date}" min="${S.today()}"></label><small style="font-size:9px">Date filter shows resources without a reserved or blocked period that day.</small><label>Illustrative distance<select data-filter="proximity">${[['all', 'Any distance'], ['1', 'Within 1 km'], ['5', 'Within 5 km']].map(([v, l]) => `<option value="${v}" ${filter.proximity === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></details><details open><summary>Cost & access</summary><label>Maximum hourly rate · ₹<input data-filter="maxPrice" type="number" min="0" value="${filter.maxPrice}" placeholder="Any rate"></label>${[['free', 'Free resources only'], ['supervision', 'Supervision required'], ['cert', 'Certification required']].map(([k, l]) => `<label class="check"><input type="checkbox" data-filter="${k}" ${filter[k] ? 'checked' : ''}>${l}</label>`).join('')}<label>Resource type<select data-filter="type">${['All', 'Equipment', 'Space'].map(x => `<option ${filter.type === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label></details></aside>`;
}
function marketplace() {
  const rs = filteredResources();
  return pagehead(favoritesOnly ? 'Good finds, kept close.' : recentOnly ? 'Pick up where you left off.' : 'Discover spaces and equipment.', 'Access the tools, spaces, and technology that bring your ideas to life.', button(icon('heart') + ' Saved', action('saved'), 'ghost') + button(icon('history') + ' Recent', action('recent'), 'ghost')) + `<div class="search-line"><div class="searchbox">${icon('search')}<input id="catalog-search" value="${esc(filter.q)}" placeholder="Search equipment, spaces, research tools…" aria-label="Search resource catalog"></div>${button(icon('filter') + ' Filters', action('filters'), 'filter-toggle')}<div class="view-switch" role="group" aria-label="Resource view">${[['grid', 'grid'], ['list', 'list'], ['map', 'map']].map(([v, ic]) => `<button data-view="${v}" class="${view === v ? 'active' : ''}" aria-label="${v} view" aria-pressed="${view === v}">${icon(ic)}</button>`).join('')}</div></div><div class="category-chips">${['All', ...categories()].map((c, i) => `<button class="chip ${filter.category === c ? 'active' : ''}" data-category="${esc(c)}">${icon(['grid', 'shield', 'box', 'pass', 'chart'][i % 5])}${esc(c === 'All' ? 'All resources' : c)}</button>`).join('')}</div><div class="catalog-layout">${filters()}<div><div class="row between mb"><span class="result-count" aria-live="polite">${rs.length} resource${rs.length === 1 ? '' : 's'} to explore</span><small style="font-size:9px">*Illustrative INR fees · no payment processing</small></div>${view === 'map' ? '<div id="resource-map" class="map-panel"></div><p class="map-note">Fictional facilities · illustrative New Delhi-area pins. Map tiles require internet.</p>' : cards(rs, view === 'list')}</div></div>`;
}
function renderMap() {
  map?.remove();
  map = null;
  if (!$('#resource-map')) return;
  if (!window.L) {
    $('#resource-map').innerHTML = empty('Map library is unavailable.', 'Connect to the internet to load Leaflet, or continue with the grid view.', button('Show grid', action('show-grid'), 'soft'));
    return;
  }
  map = L.map('resource-map').setView([28.614, 77.21], 13);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  const coords = [];
  filteredResources().forEach(x => {
    const c = x.coordinates;
    if (!c) return;
    coords.push(c);
    const pop = document.createElement('div'),
      title = document.createElement('strong'),
      btn = document.createElement('button');
    title.textContent = x.name;
    btn.textContent = 'View resource →';
    btn.className = 'btn small';
    btn.dataset.action = 'detail';
    btn.dataset.id = x.id;
    pop.append(title, document.createElement('br'), btn);
    L.circleMarker(c, {
      radius: 8,
      color: '#174d3c',
      fillColor: '#a9c5b1',
      fillOpacity: 1,
      weight: 2
    }).addTo(map).bindPopup(pop);
  });
  if (coords.length) map.fitBounds(coords, {
    padding: [35, 35],
    maxZoom: 15
  });
  setTimeout(() => map?.invalidateSize(), 100);
}
function bookingPage() {
  let bs = visibleBookings(),
    forced = {
      'Booking Requests': ['Pending', 'Waitlisted'],
      'Return Inspections': ['Awaiting Inspection'],
      'Active Sessions': ['Active'],
      'Access Passes': ['Approved', 'Active']
    }[page];
  if (forced) bs = bs.filter(b => forced.includes(b.status));
  if (bookingFilter !== 'All') bs = bs.filter(b => b.status === bookingFilter);
  return pagehead(page, 'A clear next step at every stage of your sharing journey.', page === 'Active Sessions' ? button('Report incident', action('incident'), 'danger') : '') + `<div class="category-chips">${['All', 'Pending', 'Approved', 'Waitlisted', 'Active', 'Awaiting Inspection', 'Completed', 'Cancelled', 'Rejected'].map(x => `<button class="chip ${bookingFilter === x ? 'active' : ''}" data-booking-filter="${x}">${x}</button>`).join('')}</div>` + bookings(bs.slice().reverse());
}
function inventory() {
  const rs = g().resources.filter(x => (u().role === 'admin' || x.ownerId === u().id) && x.name.toLowerCase().includes(filter.q.toLowerCase())).sort((a, b) => inventorySort === 'rate' ? a.hourlyRate - b.hourlyRate : inventorySort === 'status' ? a.status.localeCompare(b.status) : a.name.localeCompare(b.name));
  return pagehead('A home for shared possibilities.', 'Keep your listings current, available, and easy to access.', button(icon('download') + ' Inventory CSV', action('inventory-csv')) + button(icon('plus') + ' Add resource', action('add'), 'primary')) + `<div class="panel"><div class="table-tools"><input id="inventory-search" placeholder="Find a resource in your inventory…" value="${esc(filter.q)}" aria-label="Search inventory"><select id="inventory-sort" aria-label="Sort inventory"><option value="name">Name A–Z</option><option value="rate" ${inventorySort === 'rate' ? 'selected' : ''}>Hourly rate</option><option value="status" ${inventorySort === 'status' ? 'selected' : ''}>Availability</option></select></div>${rs.length ? `<div class="table-wrap"><table><thead><tr><th>Resource</th><th>Location</th><th>Availability</th><th>Est. rate</th><th>Updated</th><th>Actions</th></tr></thead><tbody>${rs.map(x => `<tr><td class="inventory-name"><div class="row">${x.image ? `<img src="${esc(x.image)}" class="inventory-thumb" alt="Illustrative resource" loading="lazy">` : icon('box')}<div><strong>${esc(x.name)}</strong><br><small style="font-size:9px">${esc(x.category)}</small></div></div></td><td>${esc(x.location)}</td><td>${badge(x.published ? x.status : 'Draft')}</td><td>${money(x.hourlyRate)}</td><td>${date(x.updatedAt)}</td><td><div class="row wrap">${button('Edit', action('edit', x.id), 'small')}${button(x.published ? 'Hide' : 'Publish', action('publish', x.id), 'small')}${button(x.status === 'Available' ? 'Mark unavailable' : 'Make available', action('availability', x.id), 'small')}</div></td></tr>`).join('')}</tbody></table></div>` : empty('Your collection starts with one resource.', 'Add a listing to share it with your demo community.', button('Add resource', action('add'), 'primary'))}</div>`;
}
function detail() {
  const x = r(selectedResource),
    qualified = S.eligible(g(), u(), x);
  return `<div class="row between mb">${button(icon('arrow') + ' Back to discovery', action('back-discovery'), 'ghost')}${button(icon('heart') + ' Save resource', action('favorite', x.id), 'soft')}</div><div class="detail-gallery">${x.photoId ? `<img data-photo="${x.photoId}" alt="${esc(x.name)}">` : `<img src="${esc(x.image || '')}" alt="Illustrative ${esc(x.name)}">`}</div><div class="detail-layout"><section class="detail-info"><div class="row between"><span class="eyebrow">${esc(x.category)}</span>${badge(x.status)}</div><h1>${esc(x.name)}</h1><p>${icon('pin')} ${esc(x.location)} · ${esc(x.campus)}</p><div class="rating-free">FICTIONAL CAMPUS LISTING · ILLUSTRATIVE RESOURCE PHOTO</div><hr><h2>A little more about this resource</h2><p>${esc(x.description)}</p><div class="specs">${x.specs.map(s => `<div class="spec">${icon('check')} ${esc(s)}</div>`).join('')}</div><hr><h2>Access, with confidence.</h2><div class="qualification">${icon('shield')}<div><strong>${esc(x.certRequired === 'None' ? 'No specialist certification required' : x.certRequired)}</strong><small>${qualified ? 'This demo profile meets the listed requirement.' : 'This demo profile needs the listed clearance.'} Not an independently verified qualification.</small></div></div><div class="qualification">${icon('user')}<div><strong>${x.supervisionRequired ? 'Supervisor required' : 'Independent access'}</strong><small>${esc(x.owner)} · Demonstration resource manager</small></div></div><div class="qualification">${icon('clock')}<div><strong>${x.open}:00–${x.close}:00 IST · up to ${x.maxHours} h/session</strong><small>Daily schedule. Blocked dates are set by the owner.</small></div></div><hr><h2>Make time for your idea.</h2><label>See one-hour slot availability<input id="detail-date" type="date" value="${S.dayAfter(1)}" min="${S.today()}" max="${S.dayAfter(g().policy.advance)}"></label><div class="slot-grid" id="detail-slots"></div><p class="helper">Green selection = selected · amber = reserved (waitlist available) · rose = blocked or unavailable.</p><hr><h2>A shared responsibility.</h2><p>${esc(x.rules)}</p><p class="helper">Required accessories: ${esc(x.accessories.join(', '))}. Record condition before use and submit return evidence for a separate owner inspection.</p>${button('Share resource', action('share', x.id))}${button('View item discussions', action('discussion', x.id), 'ghost')}</section><aside class="booking-summary"><span class="summary-price">${money(x.hourlyRate)} <small>${x.hourlyRate ? '/ hour' : ''}</small></span><p class="helper mt">Transparent estimates. No payment is processed.</p><div class="summary-line"><span>Maximum session</span><strong>${x.maxHours} h</strong></div><div class="summary-line"><span>Illustrative deposit</span><strong>${money(x.deposit)}</strong></div><hr><p class="helper">Choose your date and duration in the booking flow to review the estimated total.</p>${button('Request booking ' + icon('arrow'), action('book', x.id), 'primary full')}<p class="helper" style="text-align:center;margin-top:12px">${qualified ? 'Demo eligibility matched' : 'Demo qualification required'} · Owner approval required</p><div class="notice">${icon('help')}Single-browser simulation. No real facility access is granted.</div></aside></div>`;
}
function detailSlots() {
  const x = r(selectedResource),
    d = $('#detail-date')?.value;
  if (!x || !d || !$('#detail-slots')) return;
  $('#detail-slots').innerHTML = Array.from({
    length: x.close - x.open
  }, (_, i) => i + x.open).map(h => {
    const b = {
        resourceId: x.id,
        start: d + 'T' + String(h).padStart(2, '0') + ':00:00+05:30',
        end: d + 'T' + String(h + 1).padStart(2, '0') + ':00:00+05:30'
      },
      blocked = x.status !== 'Available' || (x.blockedDates || []).includes(d) || new Date(b.start) <= new Date(),
      reserved = S.conflicts(g(), b).length;
    return `<button class="slot ${blocked ? 'blocked' : reserved ? 'reserved' : ''}" data-slot="${h}" data-date="${d}" ${blocked ? 'disabled' : ''}>${String(h).padStart(2, '0')}:00<small style="display:block;font-size:8px">${blocked ? 'Unavailable' : reserved ? 'Reserved' : 'Available'}</small></button>`;
  }).join('');
}
function renderGuide() {
  if ($('#guide')) $('#guide').innerHTML = '';
}
function renderContent() {
  map?.remove();
  map = null;
  let html = '';
  favoritesOnly = page === 'Saved Resources';
  recentOnly = page === 'Recently Viewed';
  if (page === 'Resource Details') html = detail();else if (['Overview', 'Institutional Overview'].includes(page)) html = overview();else if (['Explore Resources', 'Saved Resources', 'Recently Viewed'].includes(page)) html = marketplace();else if (['My Inventory', 'All Resources'].includes(page)) html = inventory();else if (page === 'Add Resource') html = pagehead('Make room for something shared.', 'A listing is the first step toward someone else’s breakthrough.', button('Start listing wizard ' + icon('arrow'), action('add'), 'primary')) + `<div class="cols"><div class="panel"><div class="eyebrow">SEVEN THOUGHTFUL STEPS</div><h2 class="mt">Good information.<br>Great shared experiences.</h2><p>Add the essentials, a photo, the location, opening hours, safety requirements, and illustrative fees. Review before publishing.</p>${button('Create a resource', action('add'), 'primary')}</div><div class="panel impact"><h3>A little clarity goes a long way.</h3><p>Who can use it? When is it available? What should be checked on return?</p><p>Every answer helps your community share responsibly.</p></div></div>`;else if (['My Bookings', 'Booking Requests', 'Approvals & Oversight', 'Return Inspections', 'Active Sessions', 'Access Passes'].includes(page)) html = bookingPage();else if (['Audit History', 'Activity History'].includes(page)) html = historyPage();else if (['Operations & Insights', 'Analytics'].includes(page)) html = analyticsPage();else if (['Fair Access', 'Allocation Policies'].includes(page)) html = fairnessPage();else if (page === 'Calendar') html = calendarPage();else if (['Incident Reports', 'Incident Management'].includes(page)) html = incidentsPage();else if (page === 'Price Watchlist') html = watchlistPage();else if (page === 'Item Discussions') html = discussionsPage();else if (page === 'Notifications') html = notificationsPage();else if (['Profile', 'Eligibility & Certifications', 'User Verification'].includes(page)) html = profilePage();else if (page === 'Settings') html = settingsPage();else html = empty('This workspace is ready to explore.', 'Open your overview to continue.', button('Overview', nav('Overview'), 'primary'));
  $('#content').innerHTML = html;
  bindForms();
  if (page === 'Resource Details') detailSlots();
  if (view === 'map') renderMap();
  W.hydratePhotos();
  hydrateResourcePhotos();
}
function historyPage() {
  let events = visibleActivity().filter(a => `${a.action} ${a.details} ${a.actor} ${a.target}`.toLowerCase().includes(activityFilter.q.toLowerCase()) && (activityFilter.type === 'All' || a.action === activityFilter.type) && (!activityFilter.date || a.at.slice(0, 10) === activityFilter.date));
  return pagehead('Activity History', 'Server-recorded resource, booking, and handover events.', button(icon('download') + ' Export CSV', action('audit-csv'))) + `<div class="activity-filter"><input id="activity-search" placeholder="Find an event, actor, or reference…" aria-label="Search activity" value="${esc(activityFilter.q)}"><select id="activity-type" aria-label="Event type"><option>All</option>${[...new Set(visibleActivity().map(a => a.action))].map(a => `<option ${activityFilter.type === a ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select><input id="activity-date" type="date" aria-label="Event date" value="${activityFilter.date}"></div><div class="panel">${activity(events)}</div>`;
}
function chartBarRows(items, unit = 'h') {
  const max = Math.max(1, ...items.map(x => x[1]));
  return items.map(([name, val]) => `<div class="bar-row"><div class="row between"><span>${esc(name)}</span><strong>${Number(val.toFixed(1))} ${unit}</strong></div><div class="progress" role="img" aria-label="${esc(name)}: ${val} ${unit}"><span style="width:${val / max * 100}%"></span></div></div>`).join('');
}
function analyticsPage() {
  let bs = visibleBookings().filter(b => timeframe === 'all' || new Date(b.createdAt) >= new Date(Date.now() - Number(timeframe) * 86400000)),
    total = bs.reduce((n, b) => n + S.hours(b), 0),
    complete = bs.filter(b => b.status === 'Completed'),
    available = published().filter(r => r.status === 'Available').length,
    inc = g().incidents.filter(i => timeframe === 'all' || new Date(i.at) >= new Date(Date.now() - Number(timeframe) * 86400000)),
    used = bs.filter(b => ['Active', 'Awaiting Inspection', 'Completed'].includes(b.status)).reduce((n, b) => n + S.hours(b), 0),
    statuses = [['Pending', bs.filter(b => ['Pending', 'Waitlisted'].includes(b.status)).length, '#e7ae57'], ['Approved / active', bs.filter(b => ['Approved', 'Active', 'Awaiting Inspection'].includes(b.status)).length, '#a9c5b1'], ['Completed', complete.length, '#168b78'], ['Cancelled / rejected', bs.filter(b => ['Cancelled', 'Rejected', 'No-show'].includes(b.status)).length, '#cf6262']];
  let cumulative = 0;
  const grad = statuses.map(([, n, c]) => {
    let prev = cumulative;
    cumulative += n / Math.max(1, bs.length) * 100;
    return `${c} ${prev}% ${cumulative}%`;
  }).join(',');
  const weeks = Array.from({
      length: 7
    }, (_, i) => S.dayAfter(i - 6)),
    counts = weeks.map(d => bs.filter(b => b.createdAt.slice(0, 10) === d).length),
    max = Math.max(1, ...counts);
  return pagehead('A clearer view of shared impact.', 'Every chart is calculated from the local demo records.', button(icon('download') + ' Inventory CSV', action('inventory-csv')) + button('Print report', action('print'), 'primary')) + `<div class="category-chips">${[['7', '7 days'], ['30', '30 days'], ['all', 'All time']].map(([v, t]) => `<button class="chip ${timeframe === v ? 'active' : ''}" data-timeframe="${v}">${t}</button>`).join('')}</div>` + stats([['Booking hours', Number(total.toFixed(1)) + ' h', 'clock', 'All requests in selected period'], ['Completed bookings', complete.length, 'check', 'Owner-inspected returns'], ['Available equipment', available, 'box', 'Current inventory snapshot'], ['Incident reports', inc.length, 'flag', 'Reported in selected period']]) + `<div class="cols equal"><div class="panel chart-panel"><h3>Requests created · last 7 days</h3><p class="helper">Daily counts within the selected timeframe.</p><div class="chart-bars" role="img" aria-label="${weeks.map((d, i) => d + ': ' + counts[i] + ' requests').join(', ')}">${counts.map(n => `<div class="chart-bar"><small>${n}</small><span style="height:${n / max * 120}px"></span></div>`).join('')}</div><div class="chart-labels">${weeks.map(d => `<span>${d.slice(-2)}</span>`).join('')}</div></div><div class="panel chart-panel"><h3>Every request has a next step.</h3><p class="helper">Request outcomes in the selected period.</p><div class="row gap24 mt"><div class="donut" style="background:${bs.length ? 'conic-gradient(' + grad + ')' : 'var(--border)'}" role="img" aria-label="${statuses.map(([n, v]) => n + ': ' + v).join(', ')}"><strong>${bs.length}</strong></div><div class="legend">${statuses.map(([n, v, c]) => `<div><i style="background:${c}"></i>${n}<strong>${v}</strong></div>`).join('')}</div></div></div><div class="panel chart-panel"><h3>Used hours by category</h3><p class="helper">Active, returned, and completed sessions.</p>${chartBarRows(categories().map(c => [c, bs.filter(b => r(b.resourceId).category === c && ['Active', 'Awaiting Inspection', 'Completed'].includes(b.status)).reduce((n, b) => n + S.hours(b), 0)]))}</div><div class="panel impact"><div class="eyebrow" style="color:#bad4ac">FROM CAPACITY TO POSSIBILITY</div><h2 class="mt">${Number(used.toFixed(1))} hours<br>put to shared use.</h2><p>Booked time becomes meaningful activity when a session is checked in and the return is recorded.</p><div class="progress"><span style="width:${Math.min(100, used / Math.max(1, total) * 100)}%"></span></div><p class="helper">${Math.round(used / Math.max(1, total) * 100)}% of requested hours have reached active use or beyond. This is not a measure of total institutional capacity.</p><div class="row wrap">${button('Price watchlist', nav('Price Watchlist'), 'small')}${button('Item discussions', nav('Item Discussions'), 'small')}${button('Incident register', nav('Incident Reports'), 'small')}</div></div></div>`;
}
function fairnessPage() {
  const p = g().policy,
    borrowers = g().users.filter(u => u.role === 'borrower'),
    month = S.today().slice(0, 7),
    dist = borrowers.map(u => [u.name, S.usage(g(), u.id, month)]),
    sum = dist.reduce((n, x) => n + x[1], 0),
    top = Math.max(0, ...dist.map(x => x[1]));
  return pagehead('More opportunity. Fairly shared.', 'Safety eligibility is a requirement. Allocation priority is a separate, explainable choice.') + `<div class="cols"><div class="stack"><div class="panel"><div class="eyebrow">THE REASON WE SHARE</div><h2 class="mt">A few repeat bookings shouldn’t<br>close the door on everyone else.</h2><p>Under the lower-usage policy, eligible applicants with fewer approved monthly hours are considered first. Equal usage follows submission order. Reserved overlaps can never be approved.</p>${chartBarRows(dist)}<div class="notice mt">${icon('compare')}Top borrower concentration: ${sum ? Math.round(top / sum * 100) : 0}% of ${sum} approved monthly hours. Waitlisted requests: ${g().bookings.filter(b => b.status === 'Waitlisted').length}.</div></div><div class="panel"><h3>See the rationale</h3><p id="fairness-preview">${p.priority === 'usage' ? 'Lower approved monthly usage comes first; submission order breaks ties.' : 'Earlier submission comes first among eligible requests.'}</p><h4>Human oversight, without bypassing safety.</h4><p class="helper">Borrowers and owners may request manager review. The administrator can record a priority exception with a reason. Certification, conflicts, and quota checks still apply.</p>${button('Open booking decisions', nav('Approvals & Oversight'), 'soft')}</div></div><form class="panel policy-form" id="policy-form"><div class="eyebrow">${u().role === 'admin' ? 'APPLIED DEMO POLICY' : 'READ-ONLY POLICY · SWITCH TO ADMIN TO EDIT'}</div><h3 class="mt">Make the rules understandable.</h3>${[['quota', 'Monthly hours per borrower', 1, 80, 'h'], ['concurrent', 'Concurrent live bookings', 1, 8, 'bookings'], ['advance', 'Advance booking window', 1, 90, 'days']].map(([k, t, min, max, unit]) => `<div class="policy-item"><label class="row between">${t}<output id="${k}-output">${p[k]} ${unit}</output></label><input type="range" name="${k}" min="${min}" max="${max}" value="${p[k]}" data-unit="${unit}" ${u().role === 'admin' ? '' : 'disabled'} aria-label="${t}"></div>`).join('')}<label>Allocation priority<select name="priority" ${u().role === 'admin' ? '' : 'disabled'}><option value="usage" ${p.priority === 'usage' ? 'selected' : ''}>Lower monthly usage, then first submitted</option><option value="fifo" ${p.priority === 'fifo' ? 'selected' : ''}>First submitted</option></select></label><label class="check"><input name="waitlist" type="checkbox" ${p.waitlist ? 'checked' : ''} ${u().role === 'admin' ? '' : 'disabled'}>Allow waitlisting for reserved slots</label><label>No-show handling<select name="noShow" ${u().role === 'admin' ? '' : 'disabled'}><option value="review" ${p.noShow === 'review' ? 'selected' : ''}>Flag for human review</option><option value="record" ${p.noShow === 'record' ? 'selected' : ''}>Record without automatic penalty</option></select></label><p class="helper">No-show status can be recorded by the owner after the reservation ends. It never assigns a financial penalty.</p>${u().role === 'admin' ? '<button class="btn primary full">Save policy</button>' : button('Account information', action('personas'), 'soft full')}</form></div>`;
}
function calendarPage() {
  const y = calendarDate.getFullYear(),
    m = calendarDate.getMonth(),
    monthLabel = calendarDate.toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric'
    }),
    first = new Date(y, m, 1),
    start = new Date(first);
  start.setDate(1 - (first.getDay() + 6) % 7);
  if (calendarView === 'week') {
    start.setTime(calendarDate.getTime());
    start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  }
  let days = Array.from({
      length: calendarView === 'week' ? 7 : 42
    }, (_, i) => {
      let d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    }),
    bs = visibleBookings();
  return pagehead('Room for your next collaboration.', 'Select a reservation to see its journey. All displayed times use IST.') + `<div class="panel"><div class="row between wrap calendar-toolbar mb"><div class="row">${button('←', action('calendar-prev'), 'small')}<h2 style="margin:0">${monthLabel}</h2>${button('→', action('calendar-next'), 'small')}</div><div class="row">${button(calendarView === 'week' ? 'Month view' : 'Week view', action('calendar-view'), 'small')}${button('Today', action('calendar-today'), 'small')}</div></div><div class="calendar-header">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(x => `<span>${x}</span>`).join('')}</div><div class="calendar">${days.map(d => {
    const iso = d.toLocaleDateString('en-CA'),
      items = bs.filter(b => b.start.slice(0, 10) === iso && !['Cancelled', 'Rejected'].includes(b.status));
    return `<div class="calendar-day ${iso === S.today() ? 'today' : ''} ${d.getMonth() !== m ? 'off' : ''}"><span>${d.getDate()}</span>${items.map(b => `<button class="calendar-item ${['Pending', 'Waitlisted'].includes(b.status) ? 'waiting' : ''}" ${action('journey', b.id)} title="${esc(r(b.resourceId).name)} · ${time(b.start)} · ${b.status}" aria-label="${esc(r(b.resourceId).name)} ${date(b.start)} ${time(b.start)} ${b.status}">${time(b.start)} ${esc(r(b.resourceId).name)}</button>`).join('')}</div>`;
  }).join('')}</div><p class="helper mt">Pending and waitlisted requests are amber; reserved sessions are green. On narrow screens, select a dot for the full reservation.</p></div>`;
}
function incidentsPage() {
  const bs = visibleBookings().map(b => b.id),
    is = g().incidents.filter(i => u().role === 'admin' || bs.includes(i.bookingId));
  return pagehead('Care for the resources we share.', 'A human-reviewed record of issues, evidence, and follow-up.', button(icon('flag') + ' Report incident', action('incident'), 'primary')) + (is.length ? is.slice().reverse().map(i => `<article class="booking-card"><div class="row between wrap"><div><span class="eyebrow">${esc(i.type)} · ${esc(i.severity)}</span><h3 class="mt" style="margin-top:8px">${esc(r(i.resourceId)?.name)}</h3></div>${badge(i.status)}</div><p>${esc(i.description)}</p><small>${esc(i.id)} · ${date(i.at)} · ${esc(person(i.reporter)?.name)} · Review role: ${esc(r(i.resourceId)?.owner)}</small><div class="booking-actions">${button('View case & evidence', action('incident-detail', i.id))}${u().role !== 'borrower' && i.status !== 'Resolved' ? button('Next review stage', action('incident-next', i.id), 'primary') : ''}${button('Related booking', action('journey', i.bookingId), 'ghost')}</div></article>`).join('') : empty('A clean slate. A shared responsibility.', 'Use a booking’s “Report issue” action if something needs attention.'));
}
function watchlistPage() {
  const as = g().alerts.filter(a => a.userId === u().id);
  return pagehead('Keep a good opportunity in sight.', 'Price watchlists compare your target to the current illustrative listing rate. No scheduled checks or emails.') + `<div class="cols"><div class="panel"><h3>Your saved watches</h3>${as.length ? as.map(a => `<div class="alert-row"><div class="row between wrap"><strong>${esc(r(a.resourceId)?.name)}</strong>${badge(a.active ? 'Active' : 'Paused')}</div><p>Notify in this browser at or ${a.direction === 'below' ? 'below' : 'above'} ${money(a.target)} / h. Current estimate: ${money(r(a.resourceId)?.hourlyRate)}.</p><p class="helper">${a.active && (a.direction === 'below' ? r(a.resourceId)?.hourlyRate <= a.target : r(a.resourceId)?.hourlyRate >= a.target) ? '● Your target condition is currently met.' : 'Your target condition is not currently met, or the watch is paused.'}</p><div class="row">${button(a.active ? 'Pause' : 'Resume', action('alert-toggle', a.id), 'small')}${button('Remove', action('alert-delete', a.id), 'small danger')}</div></div>`).join('') : empty('A good find is worth watching.', 'Choose a resource and a target illustrative hourly rate.')}</div><form class="panel" id="alert-form"><h3>Add a price watch</h3><label>Resource<select name="resourceId">${published().map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select></label><label>Target hourly rate · ₹<input name="target" type="number" min="0" max="1000000" required></label><label>Condition<select name="direction"><option value="below">At or below target</option><option value="above">At or above target (legacy behavior)</option></select></label><button class="btn primary full mt">Save watch</button></form></div>`;
}
function commentHTML(c, depth = 0) {
  const kids = g().comments.filter(x => x.parentId === c.id);
  return `<article class="comment ${depth ? 'reply' : ''}"><div class="comment-meta"><strong>${esc(person(c.userId)?.name)}</strong> · ${date(c.at)}${c.edited ? ' · edited' : ''}</div><p>${c.deleted ? 'Comment removed by its author.' : esc(c.body)}</p><div class="row">${!c.deleted ? button('Reply', action('comment-reply', c.id), 'ghost small') : ''}${c.userId === u().id && !c.deleted ? button('Edit', action('comment-edit', c.id), 'ghost small') + button('Delete', action('comment-delete', c.id), 'ghost small danger') : ''}</div>${kids.map(x => commentHTML(x, Math.min(depth + 1, 2))).join('')}</article>`;
}
function discussionsPage() {
  discussionResource ||= published()[0]?.id || '';
  return pagehead('Good questions make better sharing.', 'Resource-specific discussions, shared within your workspace.') + `<div class="cols"><div class="panel"><label>Choose a resource<select id="discussion-resource">${published().map(r => `<option value="${r.id}" ${discussionResource === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label><div class="mt">${g().comments.filter(c => c.resourceId === discussionResource && !c.parentId).map(c => commentHTML(c)).join('') || empty('Start a useful conversation.', 'Ask about setup, suitable materials, or how to prepare for a session.')}</div></div><form class="panel" id="comment-form"><h3>Add to the conversation</h3><label>Your comment<textarea name="body" minlength="1" maxlength="1000" required placeholder="What would help you use this resource well?"></textarea></label><button class="btn primary full">Post comment</button><p class="helper mt">Only the author can edit or remove a comment. Permissions are checked by the server.</p></form></div>`;
}
function notificationsPage() {
  const ns = g().notifications.filter(n => n.to.includes(u().id));
  return pagehead('The latest from your workspace.', 'Workspace updates saved to your account. Push notifications and emails are not enabled.', button('Mark all as read', action('read-all'), 'soft')) + (ns.length ? ns.map(n => `<article class="notification ${n.read.includes(u().id) ? '' : 'unread'}"><div class="row between wrap"><strong>${esc(n.action)}</strong><small>${date(n.at)} · ${time(n.at)}</small></div><p class="helper mt" style="margin-top:8px">${esc(n.details)}</p><div class="row">${button('Open record', action('notification', n.id), 'small')}${!n.read.includes(u().id) ? button('Mark as read', action('read', n.id), 'small ghost') : ''}</div></article>`).join('') : empty('You’re all caught up.', 'New requests, decisions, and handovers will appear here.'));
}
function profilePage() {
  if (page === 'User Verification') return pagehead('People make sharing possible.', 'Grant roles and record verified safety qualifications.') + `<div class="panel table-wrap"><table><thead><tr><th>Member</th><th>Role</th><th>Safety clearances</th><th></th></tr></thead><tbody>${g().users.map(p=>`<tr><td>${esc(p.name)}<br><small>${esc(p.email)}</small></td><td>${badge(p.role)}</td><td>${esc(p.certs.join(', ')||'None recorded')}</td><td>${button('Manage',action('manage-member',p.id),'small')}</td></tr>`).join('')}</tbody></table></div>`;
  if (page === 'Eligibility & Certifications') return pagehead('Ready, informed, and eligible.', 'Training requirements help people and equipment stay safe.') + `<div class="cols"><div class="panel"><h2>Your safety clearances</h2>${u().certs.length ? u().certs.map(c => `<div class="qualification">${icon('shield')}<div><strong>${esc(c)}</strong><small>Recorded by your institution</small></div></div>`).join('') : empty('No specialist clearances recorded.', 'Use open-access spaces, or ask your institution to review and record your training.')}</div><div class="panel impact"><h3>Safety is a requirement,<br>not a ranking advantage.</h3><p>Fair-access priority never overrides a missing certification. In a real institution, training and evidence must be reviewed by authorized staff.</p>${button('Explore open opportunities', nav('Explore Resources'), 'small')}</div></div>`;
  return pagehead('A little about your next big idea.', 'Your account, interests, and activity.') + `<div class="cols"><form id="profile-form" class="panel"><span class="avatar profile-avatar">${initials(u().name)}</span><h2>${esc(u().name)}</h2><p>${esc(u().email)} · ${esc(u().role)} account</p><label>Display name<input name="name" value="${esc(u().name)}" minlength="2" maxlength="80" required></label><label>Department / group<input name="department" value="${esc(u().department)}" maxlength="120" required></label><label>Project interests</label><div class="interests">${categories().map(c => `<label class="check"><input type="checkbox" name="interests" value="${esc(c)}" ${u().interests.includes(c) ? 'checked' : ''}>${esc(c)}</label>`).join('')}</div><button class="btn primary full mt">Save profile</button></form><div class="stack"><div class="panel"><h3>A snapshot of your activity</h3>${[['Requests', g().bookings.filter(b => b.userId === u().id).length], ['Saved resources', (g().favorites[u().id] || []).length], ['Safety clearances', u().certs.length]].map(([k, v]) => `<div class="summary-line"><span>${k}</span><strong>${v}</strong></div>`).join('')}</div><div class="notice">${icon('help')}Safety clearances are recorded by an administrator after institutional verification.</div></div></div>`;
}
function settingsPage(){return pagehead('Your connected workspace.','Manage your account, appearance, and records.')+`<div class="panel"><div class="settings-row"><div><h3>Appearance</h3><p class="helper">Light is the default. Your theme preference stays on this device.</p></div>${button('Change theme',action('theme'))}</div><div class="settings-row"><div><h3>Cloud records</h3><p class="helper">Refresh to load changes made by other members.</p></div>${button('Refresh workspace',action('refresh'))}</div><div class="settings-row"><div><h3>Export records</h3><p class="helper">Downloads the records your account is allowed to see. Photos remain in private storage.</p></div>${button('Export metadata',action('export-json'))}</div><div class="settings-row"><div><h3>Sign out</h3><p class="helper">Your saved resources and bookings stay available after signing in again.</p></div>${button('Sign out',action('logout'),'danger')}</div></div>`}

function keepFocus(selector, fn) {
  const input = $(selector),
    pos = input?.selectionStart;
  fn();
  const next = $(selector);
  next?.focus();
  if (pos !== null && pos !== undefined) try {
    next?.setSelectionRange(pos, pos);
  } catch {}
}
function bindForms() {
  $('#catalog-search')?.addEventListener('input', e => {
    filter.q = e.target.value;
    keepFocus('#catalog-search', renderContent);
  });
  $$('[data-filter]').forEach(el => el.onchange = () => {
    const opened = $('#filters')?.classList.contains('open');
    filter[el.dataset.filter] = el.type === 'checkbox' ? el.checked : el.value;
    renderContent();
    if (opened) $('#filters')?.classList.add('open');
  });
  $('#inventory-search')?.addEventListener('input', e => {
    filter.q = e.target.value;
    keepFocus('#inventory-search', renderContent);
  });
  $('#inventory-sort')?.addEventListener('change', e => {
    inventorySort = e.target.value;
    renderContent();
  });
  $('#detail-date')?.addEventListener('change', detailSlots);
  $('#activity-search')?.addEventListener('input', e => {
    activityFilter.q = e.target.value;
    keepFocus('#activity-search', renderContent);
  });
  $('#activity-type')?.addEventListener('change', e => {
    activityFilter.type = e.target.value;
    renderContent();
  });
  $('#activity-date')?.addEventListener('change', e => {
    activityFilter.date = e.target.value;
    renderContent();
  });
  $('#policy-form')?.addEventListener('input', e => {
    if (e.target.type === 'range') $('#' + e.target.name + '-output').textContent = e.target.value + ' ' + e.target.dataset.unit;
    if (e.target.name === 'priority') $('#fairness-preview').textContent = (e.target.value === 'usage' ? 'Preview: lower approved monthly usage, then submission order.' : 'Preview: submission order among eligible applicants.') + ' Save to apply the rule.';
  });
  $('#policy-form')?.addEventListener('submit', safe(async e => {
    e.preventDefault();
    const f = e.target;
    await S.setPolicy({
      quota: Number(f.quota.value),
      concurrent: Number(f.concurrent.value),
      advance: Number(f.advance.value),
      priority: f.priority.value,
      waitlist: f.waitlist.checked,
      noShow: f.noShow.value
    });
    render();
    toast('Allocation policy saved.');
  }));
  $('#alert-form')?.addEventListener('submit', safe(async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    await S.change(s => {
      if (s.alerts.some(a => a.userId === u().id && a.resourceId === data.resourceId && a.target === Number(data.target) && a.direction === data.direction)) throw Error('This price watch already exists.');
      s.alerts.push({
        ...data,
        target: Number(data.target),
        id: S.uid('WATCH'),
        active: true,
        userId: u().id
      });
      S.event(s, 'Price watch created', data.resourceId, 'Target ' + money(data.target), data.resourceId);
    });
    render();
    toast('Price watch saved.');
  }));
  $('#discussion-resource')?.addEventListener('change', e => {
    discussionResource = e.target.value;
    renderContent();
  });
  $('#comment-form')?.addEventListener('submit', safe(async e => {
    e.preventDefault();
    await postComment(discussionResource, e.target.body.value);
    render();
    toast('Comment saved.');
  }));
  $('#profile-form')?.addEventListener('submit', safe(async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target)),
      interests = new FormData(e.target).getAll('interests');
    await S.change(s => {
      const p = s.users.find(x => x.id === u().id);
      p.name = data.name.trim();
      p.department = data.department.trim();
      p.interests = interests;
      S.event(s, 'Profile updated', p.id, 'Interests and profile updated.');
    });
    render();
    toast('Profile saved.');
  }));
}
async function postComment(resourceId, body, parentId = null) {
  await S.change(s => {
    if (!body.trim() || body.length > 1000) throw Error('Write a comment of 1–1000 characters.');
    if (parentId && !s.comments.some(c => c.id === parentId && c.resourceId === resourceId)) throw Error('The parent discussion is no longer available.');
    s.comments.push({
      id: S.uid('COMMENT'),
      resourceId,
      userId: u().id,
      body: body.trim(),
      parentId,
      at: new Date().toISOString()
    });
    S.event(s, parentId ? 'Discussion reply' : 'Discussion comment', resourceId, 'A discussion contribution was added.', resourceId);
  });
}
function showPersonas() {
  accountInfo();
}
async function openDetail(id) {
  if (!r(id)) return;
  await S.change(s => {
    s.recent[u().id] = [id, ...(s.recent[u().id] || []).filter(x => x !== id)].slice(0, 12);
  });
  selectedResource = id;
  page = 'Resource Details';
  render();
  window.scrollTo(0, 0);
}
function bookingJourney(id) {
  const b = g().bookings.find(b => b.id === id);
  if (!b) return;
  modal(`<div class="eyebrow">RESOURCE LIFECYCLE JOURNEY</div><h2 id="modal-title">${esc(r(b.resourceId).name)}</h2><div class="row between wrap"><small>${esc(id)} · ${esc(person(b.userId).name)}</small>${badge(b.status)}</div>${lifecycle(b)}<p class="helper mt">${date(b.start)} · ${time(b.start)}–${time(b.end)} IST · ${S.hours(b)} h</p><p>${esc(b.purpose)}</p>${b.reason ? `<div class="notice mb">${icon('help')}${esc(b.reason)}</div>` : ''}${b.managerReview ? `<div class="notice mb">${icon('user')}Manager review ${b.managerReview.status}: ${esc(b.managerReview.reason)}</div>` : ''}<h3>Every meaningful step</h3>${activity(g().activity.filter(a => a.target === id))}${b.checkin || b.return ? `<h3 class="mt">The condition story</h3><div class="photo-grid">${['checkin', 'return'].map(k => b[k] ? `<figure><img data-photo="${b[k].photoId}" alt="${k === 'checkin' ? 'Before-use' : 'After-use'} condition photo"><figcaption>${k === 'checkin' ? 'BEFORE USE' : 'AFTER USE'} · ${date(b[k].at)}<p>${esc(b[k].notes)}</p></figcaption></figure>` : '').join('')}</div>` : ''}${b.inspection ? `<div class="notice mt">${icon('check')}Inspection by ${esc(b.inspection.actor)}: ${esc(b.inspection.notes)}</div>` : ''}`, true);
  W.hydratePhotos();
}
function pass(id) {
  const b = g().bookings.find(b => b.id === id);
  if (!['Approved', 'Active'].includes(b.status)) throw Error('This demo pass is no longer active.');
  modal(`<h2 id="modal-title">Your demo access pass.</h2><div class="pass-card"><div class="row between"><div class="brand"><span class="logo-mark">s</span><span>sahyog</span></div><span class="eyebrow">${b.status}</span></div><h3>${esc(r(b.resourceId).name)}</h3><div class="row"><span class="avatar">${initials(person(b.userId).name)}</span><div><strong>${esc(person(b.userId).name)}</strong><br><small>Demo borrower</small></div></div><div class="pass-ref">SH-${esc(b.id).toUpperCase()}</div><div class="row between"><div><small>SESSION WINDOW · IST</small><p>${date(b.start)}<br>${time(b.start)}–${time(b.end)}</p></div><div><small>LOCATION</small><p>${esc(r(b.resourceId).location)}</p></div></div></div><div class="notice warning mt">${icon('shield')}Demo Access Pass — Not a Physical Access Credential. No smart locks, security systems, or QR scanning are connected.</div>`);
}
function globalSearch(q) {
  const term = q.trim().toLowerCase();
  if (!term) return;
  const rs = published().filter(r => `${r.name} ${r.description} ${r.location}`.toLowerCase().includes(term)),
    bs = visibleBookings().filter(b => `${b.id} ${b.purpose} ${r(b.resourceId).name} ${b.status}`.toLowerCase().includes(term));
  modal(`<h2 id="modal-title">Search your shared workspace.</h2><p>${rs.length} resources · ${bs.length} visible bookings for “${esc(q)}”</p><h3>Resources</h3>${rs.length ? rs.map(r => `<div class="row between alert-row"><strong>${esc(r.name)}</strong>${button('Open', action('detail', r.id), 'small')}</div>`).join('') : '<p class="helper">No matching resources.</p>'}<h3 class="mt">Bookings</h3>${bs.map(b => `<div class="row between alert-row"><div><strong>${esc(b.id)}</strong><br><small>${esc(r(b.resourceId).name)} · ${b.status}</small></div>${button('Journey', action('journey', b.id), 'small')}</div>`).join('') || '<p class="helper">No matching visible bookings.</p>'}`);
}
function comparison() {
  if (compare.length < 2) {
    toast('Select two or three resources to compare.', true);
    return;
  }
  modal(`<div class="eyebrow">A LITTLE CLARITY BEFORE YOU CHOOSE</div><h2 id="modal-title">Find the right fit.</h2><div class="table-wrap"><table><thead><tr><th>Compare</th>${compare.map(id => `<th>${esc(r(id).name)}</th>`).join('')}</tr></thead><tbody>${[['Illustrative hourly fee', r => money(r.hourlyRate)], ['Availability', r => r.status], ['Location', r => r.location], ['Required clearance', r => r.certRequired], ['Supervision', r => r.supervisionRequired ? 'Required' : 'Independent'], ['Daily opening hours', r => r.open + ':00–' + r.close + ':00 IST'], ['Maximum session', r => r.maxHours + ' h']].map(([name, fn]) => `<tr><td><strong>${name}</strong></td>${compare.map(id => `<td>${esc(fn(r(id)))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`, true);
}
function textDialog(title, initial, save) {
  modal(`<h2 id="modal-title">${title}</h2><form id="text-dialog"><label>Details<textarea name="text" required maxlength="1000">${esc(initial)}</textarea></label><p class="error-text" id="text-error" role="alert"></p><button class="btn primary full mt">Save</button></form>`);
  $('#text-dialog').onsubmit = async e => {
    e.preventDefault();
    try {
      await save(e.target.text.value.trim());
      close();
      render();
    } catch (err) {
      $('#text-error').textContent = err.message;
    }
  };
}
function confirmDialog(title, desc, save) {
  modal(`<h2 id="modal-title">${title}</h2><p>${desc}</p><div class="modal-footer">${button('Keep it', 'id="confirm-no"')}${button('Confirm', 'id="confirm-yes"', 'primary')}</div>`);
  $('#confirm-no').onclick = close;
  $('#confirm-yes').onclick = safe(async () => {
    await save();
    close();
    render();
  });
}
function incidentDetail(id) {
  const i = g().incidents.find(i => i.id === id);
  modal(`<div class="eyebrow">INCIDENT CASE</div><h2 id="modal-title">${esc(i.type)} · ${esc(i.severity)}</h2><p>${esc(r(i.resourceId)?.name)} · ${esc(i.id)}</p>${badge(i.status)}<p class="mt">${esc(i.description)}</p>${i.photoId ? `<img data-photo="${i.photoId}" alt="Incident evidence" class="wizard-preview">` : ''}<h3 class="mt">Review trail</h3>${activity(g().activity.filter(a => a.target === i.bookingId && a.action.startsWith('Incident')))}<div class="notice mt">${icon('help')}No financial penalty or borrower liability has been determined automatically.</div>`);
  W.hydratePhotos();
}
function hydrateResourcePhotos() {
  $$('img').forEach(el => {
    el.addEventListener('error', () => {
      el.style.visibility = 'hidden';
      el.setAttribute('aria-hidden', 'true');
    }, {
      once: true
    });
  });
}
const handlers = {
 refresh:async()=>{await S.refresh();render();toast('Workspace refreshed.')},
 'manage-member':id=>{const member=person(id);modal(`<h2 id="modal-title">Manage ${esc(member.name)}</h2><p>Record qualifications only after reviewing institutional training evidence.</p><form id="member-form"><label>Workspace role<select name="role">${['borrower','owner','admin'].map(role=>`<option ${role===member.role?'selected':''}>${role}</option>`).join('')}</select></label><label>Safety certifications (one exact resource qualification per line)<textarea name="certs">${esc(member.certs.join('\n'))}</textarea></label><p id="member-error" role="alert"></p><button class="btn primary">Save access</button></form>`);$('#member-form').onsubmit=async e=>{e.preventDefault();try{await S.execute('admin-member',[id,e.target.role.value,e.target.certs.value.split('\n').map(v=>v.trim()).filter(Boolean)]);await S.refresh();close();render();toast('Access updated.')}catch(err){$('#member-error').textContent=err.message}}},

  enter: async id => {
    await S.enter(id);
    compare = [];
    filter.q = '';
    page = g().views?.[id] || 'Overview';
    close();
    render();
  },
  personas: showPersonas,
  logout: async () => {
    await S.change(s => s.session = null);
    page = 'Overview';
    render();
  },
  'show-password': () => {
    const p = $('#demo-password');
    p.type = p.type === 'password' ? 'text' : 'password';
    $$('[data-action="show-password"]')[0].textContent = p.type === 'password' ? 'Show' : 'Hide';
  },
  theme: () => {
    const val = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem('sahyog-commons-theme', val);
    } catch {
      toast('Appearance changed for this visit; browser preference could not be saved.', true);
    }
    document.documentElement.dataset.theme = val;
    if (u()) render();
  },
  collapse: () => document.body.classList.toggle('collapsed'),
  menu: () => {
    $('#sidebar').classList.toggle('open');
  },
  detail: async id => {
    close();
    await openDetail(id);
  },
  'back-discovery': () => go('Explore Resources'),
  favorite: async id => {
    await S.change(s => {
      const fs = s.favorites[u().id] ||= [];
      if (fs.includes(id)) s.favorites[u().id] = fs.filter(x => x !== id);else fs.push(id);
    });
    render();
    toast('Saved resource collection updated.');
  },
  saved: () => go('Saved Resources'),
  recent: () => go('Recently Viewed'),
  'clear-filters': () => {
    filter = {
      q: '',
      category: 'All',
      campus: 'All',
      location: '',
      status: 'All',
      date: '',
      maxPrice: '',
      supervision: false,
      cert: false,
      free: false,
      type: 'All',
      proximity: 'all'
    };
    renderContent();
  },
  filters: () => {
    if (innerWidth > 1000) {
      $('#filters').classList.toggle('desktop-hidden');
      $('.catalog-layout').classList.toggle('filters-hidden');
    } else $('#filters').classList.toggle('open');
  },
  'show-grid': () => {
    view = 'grid';
    renderContent();
  },
  compare: comparison,
  'compare-clear': () => {
    compare = [];
    renderContent();
  },
  book: id => W.bookingWizard(id),
  add: () => W.resourceWizard(),
  edit: id => W.resourceWizard(id),
  publish: async id => {
    const x = r(id);
    await S.saveResource({
      ...x,
      published: !x.published
    });
    render();
    toast(x.published ? 'Listing hidden from discovery.' : 'Listing published.');
  },
  availability: async id => {
    const x = r(id);
    if (x.status === 'Maintenance' && g().incidents.some(i => i.resourceId === id && i.severity === 'Critical' && i.status !== 'Resolved')) throw Error('Resolve the critical incident before making this resource available.');
    await S.saveResource({
      ...x,
      status: x.status === 'Available' ? 'Maintenance' : 'Available'
    });
    render();
  },
  journey: bookingJourney,
  pass,
  inspect: id => W.inspectionDialog(id),
  incident: id => {
    if (!visibleBookings().length) {
      toast('Create a related booking before reporting an incident.', true);
      return;
    }
    W.incidentDialog(id);
  },
  'incident-detail': incidentDetail,
  'incident-next': id => {
    const i = g().incidents.find(i => i.id === id),
      stages = ['Reported', 'Under Review', 'Action Requested', 'Resolved'],
      next = stages[stages.indexOf(i.status) + 1];
    textDialog('Move incident to ' + next + '.', i.notes || '', async text => await S.incidentStatus(id, next, text));
  },
  event: id => {
    const e = g().activity.find(e => e.id === id);
    if (!e) return;
    modal(`<h2 id="modal-title">${esc(e.action)}</h2><p>${date(e.at)} · ${time(e.at)} IST<br>${esc(e.actor)} · ${esc(e.target)}</p><div class="notice">${icon('history')}${esc(e.details)}</div>${g().bookings.some(b => b.id === e.target) ? `<div class="mt">${button('View booking journey', action('journey', e.target), 'primary')}</div>` : ''}`);
  },
  'read-all': async () => {
    await S.change(s => s.notifications.filter(n => n.to.includes(u().id)).forEach(n => {
      if (!n.read.includes(u().id)) n.read.push(u().id);
    }));
    render();
  },
  read: async id => {
    await S.change(s => {
      const n = s.notifications.find(n => n.id === id);
      if (!n.read.includes(u().id)) n.read.push(u().id);
    });
    render();
  },
  notification: async id => {
    const n = g().notifications.find(n => n.id === id);
    await handlers.read(id);
    handlers.event(id);
  },
  'alert-toggle': async id => {
    await S.change(s => {
      const a = s.alerts.find(x => x.id === id);
      if (a.userId !== u().id) throw Error('Switch to the watch owner.');
      a.active = !a.active;
      S.event(s, 'Price watch updated', a.resourceId, a.active ? 'Resumed' : 'Paused', a.resourceId);
    });
    render();
  },
  'alert-delete': id => confirmDialog('Remove this price watch?', 'The resource itself will remain available.', async () => await S.change(s => {
    const a = s.alerts.find(x => x.id === id);
    s.alerts = s.alerts.filter(x => x.id !== id || x.userId !== u().id);
    S.event(s, 'Price watch removed', a.resourceId, 'Local watch removed.', a.resourceId);
  })),
  discussion: id => {
    discussionResource = id;
    go('Item Discussions');
  },
  'comment-reply': id => {
    const c = g().comments.find(x => x.id === id);
    textDialog('Reply to ' + esc(person(c.userId).name) + '.', '', async body => await postComment(c.resourceId, body, c.id));
  },
  'comment-edit': id => {
    const c = g().comments.find(x => x.id === id);
    if (c.userId !== u().id) throw Error('Only the author persona can edit.');
    textDialog('Edit your local comment.', c.body, async body => await S.change(s => {
      if (!body) throw Error('A comment cannot be empty.');
      const x = s.comments.find(x => x.id === id);
      x.body = body;
      x.edited = true;
      S.event(s, 'Discussion edited', x.resourceId, 'Author edited a local comment.', x.resourceId);
    }));
  },
  'comment-delete': id => confirmDialog('Remove your comment?', 'Replies remain attached to a deleted-comment placeholder.', async () => await S.change(s => {
    const c = s.comments.find(x => x.id === id);
    if (c.userId !== u().id) throw Error('Only the author persona can delete.');
    c.deleted = true;
    S.event(s, 'Discussion removed', c.resourceId, 'Author removed a local comment.', c.resourceId);
  })),
  'calendar-prev': () => {
    calendarDate.setDate(calendarView === 'week' ? calendarDate.getDate() - 7 : 1);
    if (calendarView === 'month') calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderContent();
  },
  'calendar-next': () => {
    calendarDate.setDate(calendarView === 'week' ? calendarDate.getDate() + 7 : 1);
    if (calendarView === 'month') calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderContent();
  },
  'calendar-view': () => {
    calendarView = calendarView === 'week' ? 'month' : 'week';
    renderContent();
  },
  'calendar-today': () => {
    calendarDate = new Date(S.today() + 'T12:00:00+05:30');
    renderContent();
  },
  'inventory-csv': () => exportCSV('Sahyog-Inventory.csv', [['Resource', 'Category', 'Owner', 'Location', 'Status', 'Published', 'Illustrative hourly fee', 'Qualification'], ...g().resources.filter(x => u().role === 'admin' || u().role === 'borrower' && x.published || x.ownerId === u().id).map(x => [x.name, x.category, x.owner, x.location, x.status, x.published, x.hourlyRate, x.certRequired])]),
  'audit-csv': () => exportCSV('Sahyog-Demo-Activity.csv', [['ID', 'Time', 'Actor', 'Action', 'Reference', 'Details'], ...visibleActivity().map(a => [a.id, a.at, a.actor, a.action, a.target, a.details])]),
  print: () => window.print(),
  'export-json': () => download('Sahyog-Local-Metadata.json', JSON.stringify(g(), null, 2)),
  reset: () => confirmDialog('Start a fresh demonstration?', 'This replaces the fictional bookings, listings, discussions, favorites, watches, and evidence in this browser. Export metadata first if you want to keep a copy.', async () => {
    await S.reset();
    try {
      await clearPhotos();
    } catch {
      toast('Records reset; the browser could not clear orphaned local photos.', true);
    }
    page = 'Overview';
    compare = [];
    selectedResource = '';
    filter.q = '';
  }),
  share: async id => {
    const x = r(id),
      text = `Sahyog demo resource: ${x.name} · ${x.location}. Fictional listing; open this browser’s catalog to explore.`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: x.name,
          text
        });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      toast('Demo resource summary copied.');
    } else modal(`<h2 id="modal-title">Share this resource.</h2><p>${esc(text)}</p><p class="helper">Browser-local records cannot be opened on another device.</p>`);
  },
  help: () => modal(`<div class="eyebrow">A LITTLE HELP GOES A LONG WAY</div><h2 id="modal-title">From idle resource to shared opportunity.</h2><div class="stack mt">${[['1', 'List it.', 'Sign in with an owner account to create and publish a listing.'], ['2', 'Request it.', 'Sign in as a borrower, choose a listing, and complete the request flow.'], ['3', 'Make a fair decision.', 'The resource owner can approve, reject with a reason, or waitlist.'], ['4', 'Use it responsibly.', 'The borrower uploads a before-use photo and verifies the checklist.'], ['5', 'Return & inspect.', 'Submit an after-use photo. The owner completes a separate inspection.'], ['6', 'See the whole story.', 'Open the journey, review records, and refresh to load the latest cloud records.']].map(([n, t, d]) => `<div class="row"><span class="avatar">${n}</span><div><strong>${t}</strong><p class="helper" style="margin:3px 0 0">${d}</p></div></div>`).join('')}</div><div class="notice mt">${icon('help')}When two borrowers request the same resource and time, allocation rules apply. Owner approval explains who receives access and who is waitlisted.</div>`)
};
document.addEventListener('click', safe(async e => {
  const el = e.target.closest('[data-action],[data-page],[data-category],[data-view],[data-booking-filter],[data-timeframe],[data-slot],[data-booking-action]');
  if (!el) return;
  if (el.disabled) return;
  if (el.dataset.page) {
    e.preventDefault();
    close();
    go(el.dataset.page);
    return;
  }
  if (el.dataset.action) {
    e.preventDefault();
    await handlers[el.dataset.action]?.(el.dataset.id);
    return;
  }
  if (el.dataset.category) {
    filter.category = el.dataset.category;
    renderContent();
    return;
  }
  if (el.dataset.view) {
    view = el.dataset.view;
    renderContent();
    return;
  }
  if (el.dataset.bookingFilter) {
    bookingFilter = el.dataset.bookingFilter;
    renderContent();
    return;
  }
  if (el.dataset.timeframe) {
    timeframe = el.dataset.timeframe;
    renderContent();
    return;
  }
  if (el.dataset.slot) {
    $$('[data-slot]').forEach(b => b.classList.remove('selected'));
    el.classList.add('selected');
    W.bookingWizard(selectedResource, {
      date: el.dataset.date,
      time: el.dataset.slot.padStart(2, '0') + ':00'
    });
    return;
  }
  if (el.dataset.bookingAction) {
    const a = el.dataset.bookingAction;
    if (['checkin', 'return'].includes(a)) await W.conditionWizard(el.dataset.id, a);else W.decisionDialog(el.dataset.id, a);
  }
}));
document.addEventListener('change', safe(e => {
  if (e.target.dataset.compare) {
    const id = e.target.dataset.compare;
    if (e.target.checked) {
      if (compare.length >= 3) {
        e.target.checked = false;
        throw Error('Compare up to three resources at a time.');
      }
      compare.push(id);
    } else compare = compare.filter(x => x !== id);
    renderContent();
  }
}));
$('#modal-close').onclick = close;
$('#modal').addEventListener('click', e => {
  if (e.target === $('#modal')) {
    const rect = e.target.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) close();
  }
});
document.addEventListener('click', e => {
  if (!e.target.closest('.profile-menu')) $$('.profile-menu[open]').forEach(d => d.open = false);
  if ($('#sidebar.open') && !e.target.closest('.sidebar') && !e.target.closest('[data-action="menu"]')) $('#sidebar').classList.remove('open');
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    $('#sidebar')?.classList.remove('open');
    $$('.profile-menu[open]').forEach(d => d.open = false);
  }
});
window.addEventListener('storage', e => {
  if (e.key === S.KEY) toast('Demo data changed in another tab. Reload before making changes.', true);
});
window.addEventListener('error', e => {
  if (e.target instanceof HTMLImageElement) {
    e.target.style.visibility = 'hidden';
    e.target.setAttribute('aria-hidden', 'true');
  }
}, true);
try {
  document.documentElement.dataset.theme = localStorage.getItem('sahyog-commons-theme') || 'light';
} catch {
  document.documentElement.dataset.theme = 'light';
}
try {
  await S.initialize();
  if (new URLSearchParams(location.search).has('reset')) passwordRecovery(render);else render();
} catch (error) {
  entry();
  toast(error.message, true);
}
client?.auth.onAuthStateChange(event => {
  if (event === 'SIGNED_OUT') {
    S.clearSession();render();
  }
});
