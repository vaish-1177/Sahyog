import * as S from './store.js';
import { savePhoto, photoURL } from './media.js';
import { $, esc, icon, modal, close, toast, money, date, time, button, lifecycle } from './ui.js';
let done = () => {};
export function configure(fn) {
  done = fn;
}
const steps = (names, n) => `<div class="wizard-steps" aria-label="Step ${n + 1} of ${names.length}">${names.map((_, i) => `<span class="${i <= n ? 'active' : ''}"></span>`).join('')}</div><div class="wizard-step-label">STEP ${n + 1} OF ${names.length}</div><h2 id="modal-title">${names[n]}</h2>`;
const footer = (n, last) => `<div class="modal-footer">${button(n ? 'Back' : 'Cancel', 'type="button" id="wizard-back"')}${button(last ? 'Save & finish' : `Continue ${icon('arrow')}`, 'type="submit"', 'primary')}</div>`;
function futureDate() {
  return S.dayAfter(1);
}
export function bookingWizard(rid, preset = {}) {
  const r = S.get().resources.find(r => r.id === rid),
    u = S.user();
  if (u.role !== 'borrower') {
    toast('Sign in with a borrower account to request access.', true);
    return;
  }
  let n = 0,
    data = {
      date: futureDate(),
      time: '10:00',
      duration: '1',
      purpose: '',
      agreement: false,
      ...preset
    };
  const names = ['Find your time.', 'Tell us about your idea.', 'Check your eligibility.', 'A little care goes a long way.', 'Ready to make it happen?'];
  function draw() {
    let body = '';
    if (n === 0) body = `<p>Select a future session within ${r.open}:00–${r.close}:00 IST. Maximum ${r.maxHours} hours.</p><label>Booking date<input name="date" type="date" min="${S.today()}" max="${S.dayAfter(S.get().policy.advance)}" value="${esc(data.date)}" required></label><div class="fieldgrid"><label>Start time · IST<input type="time" name="time" value="${esc(data.time)}" required></label><label>Duration · hours<input type="number" name="duration" min="1" max="${r.maxHours}" value="${esc(data.duration)}" required></label></div><div class="notice mt">${icon('calendar')}Overlapping approved reservations will create a waitlist request if enabled. Pending requests may compete under fair-access rules.</div>`;
    if (n === 1) body = `<p>Your description helps the owner understand how this resource will support your work.</p><label>Project / research purpose<textarea name="purpose" minlength="10" maxlength="2000" required placeholder="Describe the outcome you are working toward…">${esc(data.purpose)}</textarea></label>`;
    if (n === 2) body = `<p>Safety clearances are granted by your institution after verification.</p><div class="wizard-surface"><div class="row">${icon('shield')}<strong>${esc(r.certRequired || 'Open access')}</strong></div><p class="helper mt">${S.eligible(S.get(), u, r) ? '✓ Your account meets the listed qualification.' : 'Your account needs the listed clearance. Ask your institution to verify your training, or choose an open-access resource.'}</p><div class="summary-line"><span>Requested monthly hours</span><strong>${S.usage(S.get(), u.id, data.date.slice(0, 7), true)} / ${S.get().policy.quota} h</strong></div><div class="summary-line"><span>Supervision</span><strong>${r.supervisionRequired ? 'Required' : 'Independent use'}</strong></div></div>`;
    if (n === 3) body = `<p>${esc(r.rules)}</p><div class="notice">${icon('help')}Check equipment before use, return every accessory, and record any issue. Cancelling before check-in frees a reservation. All fees and deposits are illustrative.</div><label class="check"><input type="checkbox" name="agreement" ${data.agreement ? 'checked' : ''} required>I understand the safety, supervision, cancellation, and return requirements.</label>`;
    if (n === 4) {
      const start = data.date + 'T' + data.time + ':00+05:30';
      body = `<div class="wizard-surface"><span class="eyebrow">${esc(r.category)}</span><h3>${esc(r.name)}</h3>${[['Date', date(start)], ['Time', time(start) + ' IST'], ['Duration', data.duration + ' hour(s)'], ['Estimated usage', money(r.hourlyRate * Number(data.duration))], ['Illustrative deposit', money(r.deposit)]].map(([k, v]) => `<div class="summary-line"><span>${k}</span><strong>${v}</strong></div>`).join('')}<hr><p class="helper">${esc(data.purpose)}</p><div class="summary-line"><span>Estimated total incl. deposit</span><strong>${money(r.hourlyRate * Number(data.duration) + r.deposit)}</strong></div></div><p class="helper mt">No payment will be processed. This request is saved securely to your workspace.</p>`;
    }
    modal(steps(names, n) + `<form id="booking-wizard">${body}<p class="error-text" id="wizard-error" role="alert"></p>${footer(n, n === 4)}</form>`);
    $('#wizard-back').onclick = () => {
      if (n) {
        capture();
        n--;
        draw();
      } else close();
    };
    $('#booking-wizard').onsubmit = async e => {
      e.preventDefault();
      capture();
      try {
        if (n === 0) {
          const start = new Date(data.date + 'T' + data.time + ':00+05:30'),
            end = new Date(+start + Number(data.duration) * 3600000);
          if (start <= new Date() || end > new Date(data.date + 'T' + String(r.close).padStart(2, '0') + ':00:00+05:30') || start < new Date(data.date + 'T' + String(r.open).padStart(2, '0') + ':00:00+05:30')) throw Error('Choose a future time within opening hours.');
          if ((r.blockedDates || []).includes(data.date)) throw Error('The owner blocked this date.');
        }
        if (n === 2 && !S.eligible(S.get(), u, r)) throw Error('Your account does not meet the required safety qualification.');
        if (n < 4) {
          n++;
          draw();
          return;
        }
        e.submitter.disabled = true;
        const start = data.date + 'T' + data.time + ':00+05:30',
          end = new Date(+new Date(start) + Number(data.duration) * 3600000).toISOString();
        const id = await S.request({
          resourceId: rid,
          start,
          end,
          purpose: data.purpose
        });
        done();
        modal(`<div class="success"><span>${icon('check')}</span><div class="eyebrow">REQUEST RECORDED</div><h2 id="modal-title">Your idea is one step closer.</h2><p>Booking ${esc(id)} is ${S.get().bookings.find(x => x.id === id).status.toLowerCase()}. You can follow each decision in My Bookings.</p>${button('Open my bookings', 'id="finish-booking"', 'primary')}</div>`);
        $('#finish-booking').onclick = () => {
          close();
          done('My Bookings');
        };
      } catch (err) {
        $('#wizard-error').textContent = err.message;
        e.submitter.disabled = false;
      }
    };
  }
  function capture() {
    const f = $('#booking-wizard');
    for (const k of ['date', 'time', 'duration', 'purpose']) if (f.elements.namedItem(k)) data[k] = f.elements.namedItem(k).value;
    if (f.elements.namedItem('agreement')) data.agreement = f.elements.namedItem('agreement').checked;
  }
  draw();
}
export function resourceWizard(id) {
  const old = S.get().resources.find(r => r.id === id),
    r = {
      name: '',
      description: '',
      category: 'Fabrication & 3D',
      type: 'Equipment',
      image: '',
      specs: [],
      location: '',
      building: '',
      campus: 'Sahyog Main Campus',
      coordinates: [28.614, 77.21],
      distanceKm: 0,
      open: 9,
      close: 18,
      maxHours: 4,
      blockedDates: [],
      certRequired: 'None',
      supervisionRequired: false,
      accessories: ['Power supply', 'Included tools'],
      rules: 'Follow supervisor instructions. Return all accessories and report any damage.',
      hourlyRate: 0,
      deposit: 0,
      status: 'Available',
      published: true,
      ...structuredClone(old)
    };
  let n = 0,
    upload = null;
  const names = ['The essentials.', 'Give it a closer look.', 'Put it on the campus map.', 'Make time for possibility.', 'Set safe access requirements.', 'Clear costs. Shared expectations.', 'Ready for your community.'];
  function draw() {
    let body = '';
    if (n === 0) body = `<p>A clear listing helps the right people find the right resource.</p><label>Resource name<input name="name" value="${esc(r.name)}" required minlength="3" maxlength="160"></label><div class="fieldgrid"><label>Category<select name="category">${[...new Set(S.get().resources.map(x => x.category))].map(c => `<option ${r.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label><label>Resource type<select name="type"><option ${r.type === 'Equipment' ? 'selected' : ''}>Equipment</option><option ${r.type === 'Space' ? 'selected' : ''}>Space</option></select></label></div><label>Description<textarea name="description" required minlength="10" maxlength="2000">${esc(r.description)}</textarea></label>`;
    if (n === 1) body = `<p>Use a relevant image you have permission to share. Uploaded images are saved to private Supabase Storage.</p><label class="dropzone">Resource photo (PNG, JPEG, WebP · up to 5 MB)<input name="photo" type="file" accept="image/png,image/jpeg,image/webp"></label><p class="helper" id="upload-name">${upload ? esc(upload.name) : r.photoId ? 'A resource image is attached.' : r.image ? 'Existing catalog image will be retained.' : 'A designed placeholder is used if no image is uploaded.'}</p><label>Technical specifications (one per line)<textarea name="specs" placeholder="12 seats\nAccessible entrance\nDisplay & whiteboard">${esc(r.specs.join('\n'))}</textarea></label>`;
    if (n === 2) body = `<p>Use fictional locations for this demonstration. Map pins are illustrative.</p><label>Building / room / location<input name="location" value="${esc(r.location)}" required maxlength="200"></label><label>Campus / institution<input name="campus" value="${esc(r.campus)}" required maxlength="120"></label><div class="fieldgrid"><label>Map latitude<input name="lat" type="number" step="any" min="-90" max="90" value="${r.coordinates?.[0] || 28.614}" required></label><label>Map longitude<input name="lng" type="number" step="any" min="-180" max="180" value="${r.coordinates?.[1] || 77.21}" required></label></div><label>Illustrative distance · km<input name="distanceKm" type="number" min="0" max="999" step=".1" value="${r.distanceKm}" required></label>`;
    if (n === 3) body = `<p>Set daily availability. Block individual dates when a resource is reserved for institutional use.</p><div class="fieldgrid">${[['open', 'Opening hour · IST', 0, 23], ['close', 'Closing hour · IST', 1, 24], ['maxHours', 'Maximum session hours', 1, 8]].map(([k, l, min, max]) => `<label>${l}<input name="${k}" type="number" min="${min}" max="${max}" value="${r[k]}" required></label>`).join('')}<label>Resource status<select name="status"><option ${r.status === 'Available' ? 'selected' : ''}>Available</option><option ${r.status === 'Maintenance' ? 'selected' : ''}>Maintenance</option></select></label></div><label>Blocked dates (comma-separated YYYY-MM-DD)<input name="blockedDates" value="${esc(r.blockedDates.join(', '))}" placeholder="2026-11-05, 2026-11-06"></label>`;
    if (n === 4) body = `<label>Required certification (None for open access)<input name="certRequired" value="${esc(r.certRequired)}" required maxlength="200"></label><label class="check"><input type="checkbox" name="supervisionRequired" ${r.supervisionRequired ? 'checked' : ''}>A lab supervisor must be present</label><label>Accessories to inspect (one per line)<textarea name="accessories">${esc(r.accessories.join('\n'))}</textarea></label><div class="notice mt">${icon('shield')}Choosing a requirement does not issue that certification. Borrowers must already have the matching institution-recorded clearance.</div>`;
    if (n === 5) body = `<div class="fieldgrid"><label>Illustrative hourly fee · ₹<input type="number" name="hourlyRate" min="0" max="1000000" value="${r.hourlyRate}" required></label><label>Illustrative refundable deposit · ₹<input type="number" name="deposit" min="0" max="1000000" value="${r.deposit}" required></label></div><label>Safety & usage rules<textarea name="rules" required maxlength="2000">${esc(r.rules)}</textarea></label><p class="helper">No payment, deposit hold, or release is performed by this prototype.</p>`;
    if (n === 6) body = `<div class="wizard-surface"><div class="eyebrow">${esc(r.category)} · ${esc(r.type)}</div><h3>${esc(r.name)}</h3><p>${esc(r.description)}</p><div class="summary-line"><span>Location</span><strong>${esc(r.location)}</strong></div><div class="summary-line"><span>Daily hours · IST</span><strong>${r.open}:00–${r.close}:00</strong></div><div class="summary-line"><span>Requirements</span><strong>${esc(r.certRequired)}</strong></div><div class="summary-line"><span>Estimated hourly fee</span><strong>${money(r.hourlyRate)}</strong></div></div><label class="check"><input name="published" type="checkbox" ${r.published ? 'checked' : ''}>Publish this listing to the demo marketplace</label>`;
    modal(steps(names, n) + `<form id="resource-wizard">${body}<p class="error-text" id="wizard-error" role="alert"></p>${footer(n, n === 6)}</form>`);
    $('#wizard-back').onclick = () => {
      if (n) {
        capture();
        n--;
        draw();
      } else close();
    };
    $('[name=photo]')?.addEventListener('change', e => {
      upload = e.target.files[0] || upload;
      $('#upload-name').textContent = upload?.name || 'No file selected';
    });
    $('#resource-wizard').onsubmit = async e => {
      e.preventDefault();
      capture();
      try {
        if (n === 3) {
          if (r.close <= r.open) throw Error('Closing hour must be after opening hour.');
          if (r.blockedDates.some(d => !/^\d{4}-\d{2}-\d{2}$/.test(d) || isNaN(+new Date(d)))) throw Error('Use YYYY-MM-DD for blocked dates.');
        }
        if (n < 6) {
          n++;
          draw();
          return;
        }
        e.submitter.disabled = true;
        if (upload) r.photoId = await savePhoto(upload);
        if (!e.target.isConnected || !$('#modal').open) return;
        const id = await S.saveResource(r);
        done('My Inventory');
        close();
        toast(r.published ? 'Resource published to your workspace.' : 'Draft resource saved.');
      } catch (err) {
        $('#wizard-error').textContent = err.message;
        e.submitter.disabled = false;
      }
    };
  }
  function capture() {
    const f = $('#resource-wizard');
    for (const el of f.elements) {
      if (!el.name || el.type === 'file') continue;
      let v = el.type === 'checkbox' ? el.checked : el.value;
      if (['specs', 'accessories'].includes(el.name)) v = v.split('\n').map(x => x.trim()).filter(Boolean);
      if (el.name === 'blockedDates') v = v.split(',').map(x => x.trim()).filter(Boolean);
      if (['open', 'close', 'maxHours', 'distanceKm', 'hourlyRate', 'deposit'].includes(el.name)) v = Number(v);
      if (el.name === 'lat') r.coordinates[0] = Number(v);else if (el.name === 'lng') r.coordinates[1] = Number(v);else r[el.name] = v;
    }
  }
  draw();
}
export async function conditionWizard(id, action) {
  const b = S.get().bookings.find(x => x.id === id),
    r = S.get().resources.find(x => x.id === b.resourceId),
    ret = action === 'return';
  modal(`<div class="eyebrow">${ret ? 'RETURN HANDOVER' : 'PRE-USE HANDOVER'}</div><h2 id="modal-title">${ret ? 'Leave it ready for the next idea.' : 'A safe start makes all the difference.'}</h2><p>${esc(r.name)} · ${esc(id)}</p>${lifecycle(b)}<form id="condition-form"><div class="row between mt"><h3>Condition checklist</h3><small id="check-progress">0 checks complete</small></div><div class="progress mb"><span id="check-bar" style="width:0%"></span></div><div class="checklist">${[ret ? 'Equipment powered down and left safe' : 'Safety guards / emergency procedures checked', ret ? 'Any changes or damage have been recorded' : 'Equipment condition inspected before use', ...r.accessories].map(x => `<label class="check"><input type="checkbox" name="condition" required>${esc(x)}</label>`).join('')}</div><label class="dropzone">${ret ? 'After-use' : 'Before-use'} condition photo · PNG/JPEG/WebP, up to 5 MB<input type="file" name="photo" accept="image/png,image/jpeg,image/webp" capture="environment" required></label><img id="condition-preview" class="wizard-preview" alt="Selected condition photo" hidden><label>Condition notes<textarea name="notes" required minlength="3" maxlength="2000" placeholder="Record the equipment condition and anything the next user should know."></textarea></label><p class="helper">${ret ? 'Return submission sends this record to the owner for a separate inspection.' : 'Check-in opens 15 minutes before your booking and closes at the end.'} Photos are shared only with authorized participants.</p><p class="error-text" id="condition-error" role="alert"></p><button class="btn primary full" type="submit">${ret ? 'Submit return for inspection' : 'Confirm condition & activate session'}</button></form>`);
  let preview;
  $('#condition-form').onchange = e => {
    const checks = [...document.querySelectorAll('[name=condition]')],
      count = checks.filter(x => x.checked).length;
    $('#check-progress').textContent = count + ' / ' + checks.length + ' complete';
    $('#check-bar').style.width = count / checks.length * 100 + '%';
    if (e.target.name === 'photo' && e.target.files[0]) {
      if (preview) URL.revokeObjectURL(preview);
      preview = URL.createObjectURL(e.target.files[0]);
      $('#condition-preview').src = preview;
      $('#condition-preview').hidden = false;
    }
  };
  $('#condition-form').onsubmit = async e => {
    e.preventDefault();
    e.submitter.disabled = true;
    try {
      const photoId = await savePhoto(e.target.photo.files[0]),
        checks = [...e.target.querySelectorAll('[name=condition]')].map(x => x.checked);
      if (!e.target.isConnected || !$('#modal').open) return;
      await S.decide(id, action, e.target.notes.value, {
        photoId,
        checks
      });
      if (preview) URL.revokeObjectURL(preview);
      close();
      done();
      toast(ret ? 'Return submitted. The owner can now inspect it.' : 'Session active. Your pre-use record is saved.');
    } catch (err) {
      $('#condition-error').textContent = err.message;
      e.submitter.disabled = false;
    }
  };
}
export function decisionDialog(id, action) {
  const b = S.get().bookings.find(x => x.id === id);
  const titles = {
    approve: 'A fair decision starts with the facts.',
    reject: 'Explain your decision.',
    waitlist: 'Keep the opportunity open.',
    cancel: 'Cancel this reservation?',
    'manager-review': 'Request a manager review.',
    'manager-approve': 'Record the manager’s decision.',
    'extension': 'Request one more hour.',
    'extension-approve': 'Review the extension.',
    'extension-reject': 'Decline the extension.',
    'no-show': 'Record a missed session.'
  };
  modal(`<div class="eyebrow">BOOKING ${esc(id)}</div><h2 id="modal-title">${titles[action] || action}</h2><p>${esc(S.get().resources.find(r => r.id === b.resourceId).name)}</p>${action === 'approve' ? '<div class="notice">Safety requirements, approved overlap, monthly quota, and competing request priority are checked by the server before this decision is saved.</div>' : ''}${action === 'manager-approve' ? '<div class="notice warning">This exception changes allocation priority only. It cannot bypass required training or approve conflicting slots.</div>' : ''}<form id="decision-form"><label>${action === 'cancel' ? 'Optional cancellation notes' : 'Reason / review notes'}<textarea name="notes" ${['reject', 'waitlist', 'manager-review', 'manager-approve'].includes(action) ? 'required' : ''} maxlength="2000"></textarea></label><p class="error-text" id="decision-error" role="alert"></p><div class="modal-footer">${button('Go back', 'type="button" id="decision-back"')}${button(action === 'approve' ? 'Evaluate & save decision' : 'Confirm', 'type="submit"', 'primary')}</div></form>`);
  $('#decision-back').onclick = close;
  $('#decision-form').onsubmit = async e => {
    e.preventDefault();
    try {
      const result = await S.decide(id, action, e.target.notes.value);
      close();
      done();
      toast('Decision recorded · ' + result);
    } catch (err) {
      $('#decision-error').textContent = err.message;
    }
  };
}
export async function inspectionDialog(id) {
  const b = S.get().bookings.find(x => x.id === id);
  modal(`<div class="eyebrow">OWNER RETURN INSPECTION</div><h2 id="modal-title">A complete picture of the handover.</h2><p>Compare the evidence, review notes, then record your decision. No liability or financial penalty is assigned automatically.</p><div class="photo-grid">${['checkin', 'return'].map(k => `<figure><img data-photo="${esc(b[k]?.photoId || '')}" alt="${k === 'checkin' ? 'Before-use' : 'After-use'} condition evidence"><figcaption>${k === 'checkin' ? 'BEFORE USE' : 'AFTER USE'}<p>${esc(b[k]?.notes || 'No notes')}</p></figcaption></figure>`).join('')}</div><form id="inspection"><label>Inspection findings<textarea name="notes" required minlength="3" maxlength="2000"></textarea></label><label class="check"><input type="checkbox" required>I compared the evidence and checked the returned accessories.</label><p id="inspection-error" class="error-text" role="alert"></p><div class="modal-footer">${button('Report an issue', 'type="button" id="inspection-incident"', 'danger')}${button('Confirm successful return', 'type="submit"', 'primary')}</div></form>`, true);
  hydratePhotos();
  $('#inspection-incident').onclick = () => incidentDialog(id);
  $('#inspection').onsubmit = async e => {
    e.preventDefault();
    try {
      await S.decide(id, 'complete', e.target.notes.value);
      close();
      done();
      toast('Inspection complete. The resource journey is recorded.');
    } catch (err) {
      $('#inspection-error').textContent = err.message;
    }
  };
}
export async function hydratePhotos() {
  for (const el of document.querySelectorAll('[data-photo]')) {
    if (!el.dataset.photo) continue;
    try {
      const url = await photoURL(el.dataset.photo);
      if (url) {
        el.src = url;
        el.onload = () => URL.revokeObjectURL(url);
      } else {
        el.alt += ' — unavailable in this browser';
      }
    } catch {
      el.alt += ' — browser storage unavailable';
    }
  }
}
export function incidentDialog(bookingId) {
  const bs = S.get().bookings.filter(b => S.user().role !== 'borrower' || b.userId === S.user().id);
  modal(`<div class="eyebrow">INCIDENT REPORT</div><h2 id="modal-title">Let’s get it looked at.</h2><p>Report facts and condition. Responsibility is determined through human review, not automatically.</p><form id="incident-form"><label>Related booking<select name="bookingId" required>${bs.map(b => `<option value="${b.id}" ${bookingId === b.id ? 'selected' : ''}>${esc(S.get().resources.find(r => r.id === b.resourceId)?.name)} · ${b.id}</option>`).join('')}</select></label><div class="fieldgrid"><label>Category<select name="type">${['Damage', 'Equipment malfunction', 'Delayed return', 'Missing accessories', 'Access issue', 'Booking conflict'].map(x => `<option>${x}</option>`).join('')}</select></label><label>Severity<select name="severity"><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label></div><label>Description<textarea name="description" required minlength="10" maxlength="2000"></textarea></label><label>Optional photo<input type="file" name="photo" accept="image/png,image/jpeg,image/webp"></label><p class="error-text" id="incident-error" role="alert"></p><button class="btn primary full" type="submit">Submit incident report</button></form>`);
  $('#incident-form').onsubmit = async e => {
    e.preventDefault();
    e.submitter.disabled = true;
    try {
      const f = e.target,
        data = Object.fromEntries(new FormData(f));
      delete data.photo;
      if (f.photo.files[0]) data.photoId = await savePhoto(f.photo.files[0]);
      if (!f.isConnected || !$('#modal').open) return;
      await S.reportIncident(data);
      close();
      done();
      toast('Incident recorded for human review.');
    } catch (err) {
      $('#incident-error').textContent = err.message;
      e.submitter.disabled = false;
    }
  };
}
