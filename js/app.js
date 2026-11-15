import { site, stats, gapOptions, placeOptions, openers, stages, formats, ideas, times, faq, faqCats } from './content.js';
import { store, MODE } from './store.js';
import { renderPhotostrip } from './photostrip.js';

const view = document.getElementById('app');
const ASSETS = {
  logo: 'assets/img/logo.webp',
  enc: 'assets/img/encourager.webp',
  ovr: 'assets/img/overthinker.webp',
};
const ORDER = ['now', 'then', 'next'];

/* ---------------- helpers ---------------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const $ = (sel, root = view) => root.querySelector(sel);
const $$ = (sel, root = view) => [...root.querySelectorAll(sel)];
const go = (hash) => { location.hash = hash; };
const linkTo = (id) => `${location.origin}${location.pathname}#/s/${id}/friend`;

const icon = {
  back: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m15 18-6-6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  chevron: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m8 5 5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  search: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.8"/><path d="m13.5 13.5 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  chat: '<svg viewBox="0 0 18 18" fill="none" aria-hidden="true" width="18" height="18"><path d="M3 4.5A2.5 2.5 0 0 1 5.5 2h7A2.5 2.5 0 0 1 15 4.5v5a2.5 2.5 0 0 1-2.5 2.5H8l-3.5 3v-3A1.5 1.5 0 0 1 3 10.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="22" height="22"><circle cx="12" cy="12" r="11" fill="#69455B"/><path d="m7.5 12.5 3 3 6-6.5" stroke="#FFF6E9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M5 19h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.5" stroke="currentColor" stroke-width="1.8"/></svg>',
};

function toast(msg) {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', 'status');
  t.textContent = msg;
  document.body.append(t);
  setTimeout(() => t.remove(), 3200);
}

function shell({ title, back, body, actions = '', docTitle }) {
  document.title = `${docTitle || title || 'Reconnect'} · ${site.campaign}`;
  const header = title || back
    ? `<header class="topbar">
        ${back ? `<a class="icon-btn" href="${back}" aria-label="Back">${icon.back}</a>` : '<span></span>'}
        <p class="title">${esc(title || '')}</p><span></span>
      </header>`
    : '';
  view.innerHTML = `${header}
    <div class="view">
      <div class="content" id="main-content">${body}</div>
      ${actions ? `<div class="actions">${actions}</div>` : ''}
    </div>`;
}

function progress(current) {
  const idx = current === 'done' || current === 'meetup' ? 3 : ORDER.indexOf(current);
  return `<ol class="progress" aria-label="Photostrip progress">${ORDER.map((k, i) => {
    const state = i < idx ? 'done' : i === idx ? 'current' : '';
    return `<li class="${state === 'done' ? 'done' : ''}" ${state === 'current' ? 'aria-current="step"' : ''}>${i + 1} · ${stages[k].label}${state === 'done' ? '<span class="visually-hidden"> (done)</span>' : ''}</li>`;
  }).join('')}</ol>`;
}

const lockup = () => `<div class="lockup" aria-label="${esc(site.campaign)} ${esc(site.tagline)}">
  <img src="${ASSETS.logo}" alt="" width="56" height="41"><span class="sep" aria-hidden="true"></span>
  <span><span class="name">This Is<br>Random But…</span><span class="tag-line">${esc(site.tagline)}</span></span></div>`;

const tip = (mascot, text) => `<div class="tip"><img src="${ASSETS[mascot]}" alt="" width="64" height="52"><p class="bubble bubble-them">${esc(text)}</p></div>`;
const demoPill = () => MODE === 'demo' ? `<a class="demo-pill" href="#/about">Demo mode · nothing leaves this device</a>` : '';

async function compressImage(file, max = 1000) {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.8);
}

async function getStripOr404(id) {
  const s = await store.getStrip(id);
  if (!s) {
    shell({
      title: 'photostrip', back: '#/',
      body: `<h1 class="heading" tabindex="-1">we couldn’t find this photostrip</h1>
        <p class="muted">This is a demo, so photostrips only live on the phone or laptop that made them. In the real version, this link would open the shared strip on any phone.</p>
        ${tip('ovr', 'no stress. you can start a new one in a minute.')}`,
      actions: `<a class="btn btn-primary" href="#/start">Start a photostrip</a>`,
    });
  }
  return s;
}

/* ---------------- 01 landing ---------------- */
async function landing() {
  const strips = await store.listStrips();
  const open = strips.find((s) => s.stage !== 'done');
  shell({
    docTitle: 'Reconnect',
    body: `${demoPill()}
      ${lockup()}
      <div class="hero" aria-hidden="true"><img src="${ASSETS.ovr}" alt="" width="104" height="96"><img src="${ASSETS.enc}" alt="" width="124" height="100"></div>
      <h1 class="display" tabindex="-1">thinking of texting an <span class="highlight">old friend?</span></h1>
      <p class="body muted">They’re probably hoping to hear from you too. Reconnect makes going first feel a little less random, in three small steps.</p>
      <div class="card stat"><span class="stat-num">${stats.pleased}%</span>
        <div class="stack-sm"><p class="label">of youths we surveyed would be really happy if an old friend texted first. Only ${stats.thinkSame}% think their friend feels the same.</p>
        <p class="caption" style="text-transform:none;letter-spacing:0">Our survey of ${stats.n} youths aged 17 to 25</p></div></div>
      ${open ? `<a class="list-row" href="#/s/${open.id}">Continue your photostrip with ${esc(open.friendName)} ${icon.chevron}</a>` : ''}
      ${strips.length ? `<a class="list-row" href="#/strips">Your photostrips (${strips.length}) ${icon.chevron}</a>` : ''}
`,
    actions: `<a class="btn btn-primary" href="#/start">Start a photostrip</a>
      <a class="btn btn-tertiary" href="#/faq">Not ready? Read the reconnecting tips</a>
      <p class="footer-note" style="padding:4px 0 0">${esc(site.disclaimer)} <a href="#/about">About this prototype</a></p>`,
  });
}

/* ---------------- 02 start ---------------- */
async function start() {
  const pre = JSON.parse(sessionStorage.getItem('reconnect.prefill') || '{}');
  const radios = (name, opts, checked) => opts.map((o) => `<label class="chip"><input type="radio" name="${name}" value="${esc(o.id)}" ${o.id === checked ? 'checked' : ''}><span>${esc(o.label)}</span></label>`).join('');
  shell({
    title: 'start a photostrip', back: '#/',
    body: `<h1 class="heading" tabindex="-1">who’ve you been meaning to text?</h1>
      <p class="body muted">Just a first name or nickname. No sign-up needed.</p>
      <form id="start-form" class="stack-sm" style="gap:20px" novalidate>
        <div class="field"><label class="label" for="friend">Their name</label>
          <input class="input" id="friend" name="friend" autocomplete="off" maxlength="30" required placeholder="e.g. Wei Ling" value="${esc(pre.friendName || '')}" aria-describedby="friend-err">
          <p class="error" id="friend-err" hidden>Add their name so we can personalise your message.</p></div>
        <div class="field"><label class="label" for="me">Your first name <span class="muted">(optional, so they know it’s you)</span></label>
          <input class="input" id="me" name="me" autocomplete="given-name" maxlength="30" placeholder="e.g. Jia Hui" value="${esc(localStorage.getItem('reconnect.me') || '')}"></div>
        <fieldset class="chips"><legend>Last proper chat was…</legend>${radios('gap', gapOptions, pre.gap || 'year')}</fieldset>
        <fieldset class="chips"><legend>You two got close at…</legend>${radios('place', placeOptions, pre.place || 'secondary school')}</fieldset>
      </form>
      ${tip('enc', 'you don’t need a whole paragraph. a simple hey works.')}`,
    actions: `<button class="btn btn-primary" type="submit" form="start-form">Next</button>`,
  });
  $('#start-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const friendName = String(f.get('friend') || '').trim();
    if (!friendName) {
      $('#friend-err').hidden = false;
      $('#friend').setAttribute('aria-invalid', 'true');
      $('#friend').focus();
      return;
    }
    const me = String(f.get('me') || '').trim();
    localStorage.setItem('reconnect.me', me);
    sessionStorage.removeItem('reconnect.prefill');
    const s = await store.createStrip({ friendName, gap: f.get('gap'), place: f.get('place') });
    await store.updateStrip(s.id, { myName: me });
    go(`#/s/${s.id}/invite`);
  });
}

/* ---------------- 03 invite ---------------- */
async function invite(id) {
  const s = await getStripOr404(id);
  if (!s) return;
  const custom = sessionStorage.getItem('reconnect.opener');
  const list = openers(s);
  if (custom) list.unshift({ tag: 'From the tips', text: custom });
  let sel = 0;
  shell({
    title: 'send the invite', back: '#/start',
    body: `<h1 class="heading" tabindex="-1">pick an opener</h1>
      <p class="body muted">Short and specific works best. Tap one, then edit it to sound like you.</p>
      <div role="radiogroup" aria-label="Opening messages" class="stack-sm" style="gap:12px">
        ${list.map((o, i) => `<button type="button" role="radio" aria-checked="${i === 0}" class="bubble bubble-me opener" data-i="${i}">
          ${i === 0 ? `<span class="tick">${icon.check}</span>` : '<span class="tick"></span>'}<span class="who">${esc(o.tag)}</span>${esc(o.text)}</button>`).join('')}
      </div>
      <div class="field"><label class="label" for="msg">Your message</label>
        <textarea class="textarea" id="msg" maxlength="400">${esc(list[0].text)}</textarea>
        <p class="hint">Your photostrip link is added automatically.</p></div>`,
    actions: `<button class="btn btn-primary" id="send-main" type="button">Send on Instagram</button>
      <div class="row"><button class="btn btn-tertiary" data-app="whatsapp" type="button">WhatsApp</button>
      <button class="btn btn-tertiary" data-app="telegram" type="button">Telegram</button>
      <button class="btn btn-tertiary" data-app="copy" type="button">Copy</button></div>`,
  });
  const msg = $('#msg');
  $$('.opener').forEach((b) => b.addEventListener('click', () => {
    sel = +b.dataset.i;
    $$('.opener').forEach((x, i) => {
      x.setAttribute('aria-checked', String(i === sel));
      x.querySelector('.tick').innerHTML = i === sel ? icon.check : '';
    });
    msg.value = list[sel].text;
  }));
  const full = () => `${msg.value.trim()}\n${linkTo(id)}`;
  const done = async () => {
    sessionStorage.removeItem('reconnect.opener');
    await store.updateStrip(id, { opener: msg.value.trim(), stage: s.stage === 'invite' ? 'now' : s.stage });
    go(`#/s/${id}/sent`);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(full()); return true; } catch { return false; }
  };
  $('#send-main').addEventListener('click', async () => {
    if (navigator.share) {
      try { await navigator.share({ text: msg.value.trim(), url: linkTo(id) }); return done(); } catch (e) { if (e.name === 'AbortError') return; }
    }
    const ok = await copy();
    toast(ok ? 'Message copied. Paste it into your Instagram DM.' : 'Copy your message, then paste it into Instagram.');
    window.open('https://www.instagram.com/direct/inbox/', '_blank', 'noopener');
    done();
  });
  $$('[data-app]').forEach((b) => b.addEventListener('click', async () => {
    const a = b.dataset.app;
    if (a === 'whatsapp') window.open(`https://wa.me/?text=${encodeURIComponent(full())}`, '_blank', 'noopener');
    if (a === 'telegram') window.open(`https://t.me/share/url?url=${encodeURIComponent(linkTo(id))}&text=${encodeURIComponent(msg.value.trim())}`, '_blank', 'noopener');
    if (a === 'copy') toast((await copy()) ? 'Copied. Paste it wherever you chat.' : 'Couldn’t copy automatically. Select the text and copy it.');
    done();
  }));
}

/* ---------------- invite sent ---------------- */
async function sent(id) {
  const s = await getStripOr404(id);
  if (!s) return;
  shell({
    title: 'invite sent', back: `#/s/${id}/invite`,
    body: `<h1 class="display" tabindex="-1">sent. that’s the hardest part done.</h1>
      <p class="body muted">${esc(s.friendName)} gets your message with a link to your shared photostrip. You go first on stage 1, then it’s their turn.</p>
      <div class="polaroids" aria-hidden="true">
        <figure class="polaroid tilt-l" style="margin:0"><div class="ph empty">+</div><figcaption>now</figcaption></figure>
        <figure class="polaroid tilt-r" style="margin:0"><div class="ph empty">+</div><figcaption>then</figcaption></figure></div>
      ${MODE === 'demo' ? `<p class="notice">Demo: in the real version, ${esc(s.friendName)} opens the link on their own phone. Here you can preview what they’d see, and their replies are simulated.</p>` : ''}`,
    actions: `<a class="btn btn-primary" href="#/s/${id}/stage/now">Start stage 1</a>
      <a class="btn btn-secondary" href="#/s/${id}/friend">Preview what ${esc(s.friendName)} sees</a>`,
  });
}

/* ---------------- 04 friend view ---------------- */
async function friendView(id) {
  const s = await getStripOr404(id);
  if (!s) return;
  const sender = s.myName || 'An old friend';
  const nowMe = s.turns.now?.me;
  shell({
    docTitle: `${sender} wants to reconnect`,
    body: `${MODE === 'demo' ? `<p class="notice">Preview: this is what ${esc(s.friendName)} sees after tapping your link.</p>` : ''}
      <div class="card" style="display:flex;gap:12px;align-items:center;box-shadow:var(--shadow)">
        <img src="${ASSETS.logo}" alt="" width="40" height="30">
        <div><p class="caption">New message</p><p class="label">${esc(sender)}</p><p class="small muted" style="margin:0">${esc(s.opener || openers(s)[0].text)}</p></div></div>
      <h1 class="display" tabindex="-1">${esc(sender)} wants to pick up where you left off.</h1>
      <p class="body muted">They started a photostrip for you two. Three short stages, at your own pace.</p>
      <div class="polaroids" aria-hidden="true">
        <figure class="polaroid tilt-l" style="margin:0"><div class="ph ${nowMe ? '' : 'empty'}">${nowMe?.photo ? `<img src="${nowMe.photo}" alt="">` : nowMe ? '' : '+'}</div><figcaption>now${nowMe ? ' · ' + esc(sender) : ''}</figcaption></figure>
        <figure class="polaroid" style="margin:0"><div class="ph empty">+</div><figcaption>then</figcaption></figure>
        <figure class="polaroid tilt-r" style="margin:0"><div class="ph empty">+</div><figcaption>next</figcaption></figure></div>
      ${tip('enc', 'they went first. you just add one thing back.')}`,
    actions: `<button class="btn btn-primary" id="add-part" type="button">Add my part</button>
      <a class="btn btn-tertiary" href="#/s/${id}">${MODE === 'demo' ? 'Back to my side (demo)' : 'Maybe later (they won’t be told)'}</a>`,
  });
  $('#add-part').addEventListener('click', () => toast(MODE === 'demo' ? `Demo: ${s.friendName}’s side is simulated. Head back to continue as you.` : 'Opening…'));
}

/* ---------------- 05 / 07 stage 1 & 2 ---------------- */
async function stageView(id, key) {
  const s = await getStripOr404(id);
  if (!s) return;
  if (key === 'next') return nextStage(s);
  const st = stages[key];
  const prevKey = ORDER[ORDER.indexOf(key) - 1];
  const prevFriend = prevKey && s.turns[prevKey]?.friend?.text;
  const mine = s.turns[key]?.me || {};
  let photo = mine.photo || null;
  shell({
    title: `stage ${st.n} · ${st.label}`, back: prevKey ? `#/s/${id}/wait/${prevKey}` : `#/s/${id}/sent`,
    body: `${progress(key)}
      <div class="stack-sm" style="gap:4px"><h1 class="heading" tabindex="-1">${esc(st.title)}</h1>
      <p class="body muted">${key === 'now' ? `You go first. ${esc(s.friendName)} answers next.` : 'Your turn to start this one.'}</p></div>
      ${prevFriend ? `<p class="bubble bubble-them"><span class="who">${esc(s.friendName)}</span>${esc(prevFriend)}</p>` : ''}
      <form id="turn" class="card card-yellow stack-sm" style="gap:12px" novalidate>
        <p class="caption">Your turn · stage ${st.n} of 3</p>
        <label class="subheading" for="answer">${esc(st.question)}</label>
        <fieldset class="chips" aria-label="How do you want to answer?">${formats.map((f, i) => `<label class="chip"><input type="radio" name="format" value="${f.id}" ${(mine.format || 'text') === f.id ? 'checked' : ''}><span>${f.label}</span></label>`).join('')}</fieldset>
        <div id="photo-wrap" class="photo-pick" ${mine.format === 'photo' ? '' : 'hidden'}>
          <img class="thumb" id="thumb" alt="Your photo" ${photo ? `src="${photo}"` : 'hidden'}>
          <label class="btn btn-secondary file-label" style="width:auto">${icon.camera}<span id="photo-btn">${photo ? 'Change photo' : 'Add a photo'}</span><input type="file" id="photo" accept="image/*"></label></div>
        <textarea class="textarea" id="answer" name="answer" maxlength="280" placeholder="${esc(st.placeholder)}" ${key === 'then' && mine.note ? 'style="font:400 22px/1.2 var(--font-hand)"' : ''}>${esc(mine.text || '')}</textarea>
        <button type="button" class="chip-btn" id="askback" aria-pressed="${mine.askBack ? 'true' : 'false'}">${icon.chat} Ask back: “${esc(st.askBack)}”</button>
      </form>
      ${key === 'then' ? `<button type="button" class="card card-coral stack-sm" id="note-toggle" aria-pressed="${mine.note ? 'true' : 'false'}" style="text-align:left;cursor:pointer;gap:4px;border:0">
        <span class="subheading">prefer words? write a short note</span><span class="small muted">Optional. ${esc(s.friendName)} can reply with a note or just a reaction.</span>
        <span class="hand-sm">${mine.note ? 'note mode on ✓' : `dear ${esc(s.friendName.toLowerCase())}, remember when we…`}</span></button>` : ''}
      <p class="hint">${esc(st.note)}</p>`,
    actions: `<button class="btn btn-primary" type="submit" form="turn" id="submit">Add to our photostrip</button>`,
  });

  const answer = $('#answer');
  const submit = $('#submit');
  const refresh = () => {
    const ok = answer.value.trim() || photo;
    submit.toggleAttribute('disabled', !ok);
  };
  answer.addEventListener('input', refresh);
  refresh();

  $$('input[name=format]').forEach((r) => r.addEventListener('change', () => {
    const f = formats.find((x) => x.id === r.value);
    $('#photo-wrap').hidden = r.value !== 'photo';
    answer.placeholder = r.value === 'text' ? st.placeholder : f.hint;
  }));
  $('#photo').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      photo = await compressImage(file);
      $('#thumb').src = photo;
      $('#thumb').hidden = false;
      $('#photo-btn').textContent = 'Change photo';
      refresh();
    } catch {
      toast('That photo couldn’t be opened. Try another one.');
    }
  });
  $('#askback').addEventListener('click', (e) => {
    const b = e.currentTarget;
    b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
  });
  $('#note-toggle')?.addEventListener('click', (e) => {
    const b = e.currentTarget;
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    b.querySelector('.hand-sm').textContent = on ? 'note mode on ✓' : `dear ${s.friendName.toLowerCase()}, remember when we…`;
    answer.style.font = on ? '400 22px/1.2 var(--font-hand)' : '';
    answer.focus();
  });
  $('#turn').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submit.disabled) return;
    const format = $('input[name=format]:checked')?.value || 'text';
    try {
      await store.saveTurn(id, key, 'me', {
        text: answer.value.trim(),
        photo,
        format,
        askBack: $('#askback').getAttribute('aria-pressed') === 'true' ? st.askBack : '',
        note: $('#note-toggle')?.getAttribute('aria-pressed') === 'true',
      });
      await store.updateStrip(id, { stage: key });
      go(`#/s/${id}/wait/${key}`);
    } catch {
      toast('Your browser’s storage is full. Try a smaller photo.');
    }
  });
}

/* ---------------- 08 stage 3 ---------------- */
function rankIdeas(s) {
  const text = [s.place, s.turns.now?.me?.text, s.turns.now?.friend?.text, s.turns.then?.me?.text, s.turns.then?.friend?.text].join(' ').toLowerCase();
  const scored = ideas.map((i) => ({ ...i, score: i.match.filter((w) => text.includes(w)).length }));
  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((i) => i.tag !== 'Online').slice(0, 2);
  return [...top, ideas.find((i) => i.tag === 'Online')];
}

async function nextStage(s) {
  const id = s.id;
  const list = rankIdeas(s);
  const mine = s.turns.next?.me || {};
  shell({
    title: 'stage 3 · next', back: `#/s/${id}/wait/then`,
    body: `${progress('next')}
      <div class="stack-sm" style="gap:4px"><h1 class="heading" tabindex="-1">make a new memory</h1>
      <p class="body muted">Ideas based on what you both shared:</p></div>
      <form id="plan" class="stack-sm" style="gap:20px">
        <fieldset class="ideas"><legend class="visually-hidden">Pick an idea</legend>
          ${list.map((i, n) => `<label class="idea"><input type="radio" name="idea" value="${i.id}" ${(mine.ideaId ? mine.ideaId === i.id : n === 0) ? 'checked' : ''}>
            <span class="txt"><span class="tag">${esc(i.tag)}</span><span class="subheading">${esc(i.title)}</span><span class="small muted">${esc(i.why)}</span></span><span class="ring" aria-hidden="true"></span></label>`).join('')}
        </fieldset>
        <fieldset class="chips"><legend>When works?</legend>
          ${times.map((t, n) => `<label class="chip"><input type="radio" name="time" value="${esc(t)}" ${(mine.time ? mine.time === t : n === 0) ? 'checked' : ''}><span>${esc(t)}</span></label>`).join('')}
        </fieldset>
      </form>`,
    actions: `<button class="btn btn-primary" type="submit" form="plan">Suggest this to ${esc(s.friendName)}</button>
      <a class="btn btn-tertiary" href="#/strips">Not now, just keep chatting</a>`,
  });
  $('#plan').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const idea = ideas.find((i) => i.id === f.get('idea'));
    await store.saveTurn(id, 'next', 'me', { ideaId: idea.id, idea: idea.title, time: f.get('time') });
    await store.updateStrip(id, { stage: 'next' });
    go(`#/s/${id}/wait/next`);
  });
}

/* ---------------- 06 waiting / reply ---------------- */
async function waitView(id, key, signal) {
  const s = await getStripOr404(id);
  if (!s) return;
  const st = stages[key];
  const me = s.turns[key]?.me;
  if (!me) return go(`#/s/${id}/stage/${key}`);
  const friend = s.turns[key]?.friend;
  const nextKey = ORDER[ORDER.indexOf(key) + 1];

  if (friend) {
    const isPlan = key === 'next';
    shell({
      title: `stage ${st.n} · ${st.label}`, back: `#/s/${id}/stage/${key}`,
      body: `${progress(isPlan ? 'meetup' : nextKey)}
        <h1 class="display" tabindex="-1">${isPlan ? `${esc(s.friendName)} said yes!` : `${esc(s.friendName)} replied!`}</h1>
        <div class="stack-sm" style="gap:12px">
          <p class="bubble bubble-me"><span class="who">You</span>${isPlan ? esc(`${me.idea}, ${me.time}?`) : esc(me.text || 'Shared a photo')}${me.askBack ? `<br><em>${esc(me.askBack)}</em>` : ''}</p>
          <p class="bubble bubble-them"><span class="who">${esc(s.friendName)}</span>${esc(friend.text)}</p></div>
        ${isPlan ? tip('enc', 'nice. now go make the memory, then add a photo to finish your strip.') : ''}`,
      actions: isPlan
        ? `<a class="btn btn-primary" href="#/s/${id}/meetup">We met up · add our photo</a><a class="btn btn-tertiary" href="#/strips">Do this after the meet-up</a>`
        : `<a class="btn btn-primary" href="#/s/${id}/stage/${nextKey}">On to stage ${st.n + 1}: ${stages[nextKey].label}</a>`,
    });
    return;
  }

  shell({
    title: 'our photostrip', back: `#/s/${id}/stage/${key}`,
    body: `${progress(key)}
      <div class="stack-sm" style="gap:4px"><h1 class="display" tabindex="-1">sent. nice one!</h1>
      <p class="body muted">${esc(s.friendName)} can see your ${key === 'next' ? 'plan' : 'answer'} now. Replies can take a day or two, and that’s normal.</p></div>
      <div class="polaroids" aria-hidden="true">
        <figure class="polaroid tilt-l" style="margin:0"><div class="ph">${me.photo ? `<img src="${me.photo}" alt="">` : ''}</div><figcaption>you · done</figcaption></figure>
        <figure class="polaroid tilt-r" style="margin:0"><div class="ph waiting"><span class="dots"><i></i><i></i><i></i></span></div><figcaption>${esc(s.friendName)}…</figcaption></figure></div>
      <p class="visually-hidden" role="status" aria-live="polite">Waiting for ${esc(s.friendName)} to reply.</p>
      ${tip('ovr', 'no reply yet doesn’t mean no. life gets busy.')}
      <div class="stack-sm"><p class="caption">While you wait</p>
      <a class="list-row" href="#/faq">What if they reply with one word? ${icon.chevron}</a></div>`,
    actions: `<button class="btn btn-primary" disabled>Gentle nudge available in 3 days</button>
      ${MODE === 'demo' ? `<button class="btn btn-tertiary" id="skip">Skip the wait (demo)</button>` : `<a class="btn btn-tertiary" href="#/">Back to home</a>`}`,
  });
  let delay = 6000;
  $('#skip')?.addEventListener('click', () => {
    store.waitForFriend(id, key, { delay: 0 }).then(() => location.hash.endsWith(`/wait/${key}`) && render());
  });
  try {
    await store.waitForFriend(id, key, { delay, signal });
    if (location.hash.endsWith(`/wait/${key}`)) render();
  } catch { /* navigated away */ }
}

/* ---------------- meet-up photo ---------------- */
async function meetupView(id) {
  const s = await getStripOr404(id);
  if (!s) return;
  let photo = s.turns.meetup?.photo || null;
  shell({
    title: 'last frame', back: `#/s/${id}/wait/next`,
    body: `${progress('meetup')}
      <h1 class="display" tabindex="-1">you met up. nice.</h1>
      <p class="body muted">Add a photo from your ${esc(s.turns.next?.me?.idea || 'meet-up')} to finish the strip.</p>
      <div class="photo-pick"><img class="thumb" id="thumb" alt="Your meet-up photo" ${photo ? `src="${photo}"` : 'hidden'}>
        <label class="btn btn-secondary file-label" style="width:auto">${icon.camera}<span id="photo-btn">${photo ? 'Change photo' : 'Add a photo'}</span><input type="file" id="photo" accept="image/*"></label></div>
      <div class="field"><label class="label" for="cap">Caption <span class="muted">(optional)</span></label>
        <input class="input" id="cap" maxlength="28" placeholder="e.g. badminton + supper" value="${esc(s.turns.meetup?.caption || '')}"></div>`,
    actions: `<button class="btn btn-primary" id="finish">Finish our photostrip</button>
      <button class="btn btn-tertiary" id="skip">No photo, use our plan instead</button>`,
  });
  $('#photo').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    photo = await compressImage(file);
    $('#thumb').src = photo;
    $('#thumb').hidden = false;
    $('#photo-btn').textContent = 'Change photo';
  });
  const finish = async (withPhoto) => {
    try {
      await store.updateStrip(id, { stage: 'done', turns: { ...(await store.getStrip(id)).turns, meetup: { photo: withPhoto ? photo : null, caption: $('#cap').value.trim() } } });
      go(`#/s/${id}/done`);
    } catch {
      toast('Your browser’s storage is full. Try a smaller photo.');
    }
  };
  $('#finish').addEventListener('click', () => (photo ? finish(true) : (toast('Add a photo first, or tap the option below.'), $('#photo').click())));
  $('#skip').addEventListener('click', () => finish(false));
}

/* ---------------- 09 done ---------------- */
async function doneView(id) {
  const s = await getStripOr404(id);
  if (!s) return;
  shell({
    title: 'our photostrip', back: '#/strips',
    body: `${progress('done')}
      <h1 class="display" tabindex="-1">your photostrip is done!</h1>
      <div class="strip-preview"><p class="muted small" id="rendering">Making your strip…</p></div>
      <p class="body muted">It’s private to you two. Joining the Photostrip Challenge? Share it to your Story and tag ${esc(site.igHandle)} with ${esc(site.hashtag)}.</p>
      <p class="small muted">${MODE === 'demo' ? `In the real version, ${esc(s.friendName)} is asked first. Nothing is posted unless you both say yes.` : `${esc(s.friendName)} said yes to sharing.`}</p>`,
    actions: `<button class="btn btn-primary" id="share" disabled>${icon.share} Share to my Story</button>
      <div class="row"><button class="btn btn-secondary" id="download" disabled>${icon.download} Save</button>
      <button class="btn btn-secondary" id="again">Another strip</button></div>`,
  });
  let blob;
  try {
    blob = await renderPhotostrip(s, { logo: ASSETS.logo, hashtag: site.hashtag });
  } catch (e) {
    console.error(e);
    $('#rendering').textContent = 'Couldn’t draw the strip on this browser.';
    return;
  }
  const url = URL.createObjectURL(blob);
  $('.strip-preview').innerHTML = `<img src="${url}" alt="Your photostrip with ${esc(s.friendName)}: now, then and next frames">`;
  $('#share').disabled = false;
  $('#download').disabled = false;
  const fname = `reconnect-photostrip-${s.friendName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
  const download = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = fname;
    a.click();
  };
  $('#download').addEventListener('click', () => { download(); toast('Saved to your downloads.'); });
  $('#share').addEventListener('click', async () => {
    const file = new File([blob], fname, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], text: `${site.hashtag} we picked up where we left off.` }); } catch {}
    } else {
      download();
      toast('Saved. Post it to your Story and tag Reconnect.');
    }
  });
  $('#again').addEventListener('click', () => {
    sessionStorage.setItem('reconnect.prefill', JSON.stringify({ friendName: s.friendName, gap: 'months', place: s.place }));
    go('#/start');
  });
}

/* ---------------- 10 FAQ ---------------- */
async function faqView() {
  shell({
    title: 'reconnecting FAQ', back: '#/',
    body: `<h1 class="visually-hidden" tabindex="-1">Reconnecting FAQ</h1>
      <div class="search"><label class="visually-hidden" for="q">Search the tips</label>${icon.search}
        <input class="input" id="q" type="search" placeholder="Search, e.g. ‘it’s been a year’" autocomplete="off"></div>
      <fieldset class="chips"><legend class="visually-hidden">Filter by topic</legend>
        ${faqCats.map((c, i) => `<label class="chip"><input type="radio" name="cat" value="${esc(c)}" ${i === 0 ? 'checked' : ''}><span>${esc(c.toLowerCase())}</span></label>`).join('')}</fieldset>
      <div id="list" class="stack-sm" style="gap:10px"></div>
      <p id="empty" class="muted" hidden>No match. Try “awkward”, “reply” or “meet up”.</p>`,
    actions: `<a class="btn btn-primary" href="#/start">Start a photostrip</a>`,
  });
  const list = $('#list');
  const draw = () => {
    const q = $('#q').value.trim().toLowerCase();
    const cat = $('input[name=cat]:checked').value;
    const items = faq.filter((f) => (cat === 'All' || f.cat === cat) && (!q || (f.q + ' ' + f.a + ' ' + f.cat).toLowerCase().includes(q)));
    $('#empty').hidden = items.length > 0;
    list.innerHTML = items.map((f, i) => `<details class="faq-item" ${i === 0 && !q ? 'open' : ''}><summary>${esc(f.q)}</summary>
      <div class="faq-body"><p class="body muted" style="margin:0">${esc(f.a)}</p>
      <p class="bubble bubble-me" style="max-width:none"><span class="who">Try</span>${esc(f.try)}</p>
      <button class="btn btn-tertiary" style="justify-content:flex-start;text-decoration:underline" data-use="${esc(f.id)}">Use this as my opener</button></div></details>`).join('');
    $$('[data-use]', list).forEach((b) => b.addEventListener('click', () => {
      const f = faq.find((x) => x.id === b.dataset.use);
      sessionStorage.setItem('reconnect.opener', f.try);
      toast('Saved. We’ll put it at the top of your openers.');
      go('#/start');
    }));
  };
  $('#q').addEventListener('input', draw);
  $$('input[name=cat]').forEach((r) => r.addEventListener('change', draw));
  draw();
}

/* ---------------- your strips ---------------- */
async function stripsView() {
  const strips = await store.listStrips();
  const label = { invite: 'Invite not sent yet', now: 'Stage 1', then: 'Stage 2', next: 'Stage 3', meetup: 'Waiting for your meet-up photo', done: 'Done' };
  shell({
    title: 'your photostrips', back: '#/',
    body: `<h1 class="heading" tabindex="-1">your photostrips</h1>
      ${strips.length ? `<div class="stack-sm" style="gap:10px">${strips.map((s) => `<a class="list-row" href="#/s/${s.id}"><span><span class="subheading" style="display:block">${esc(s.friendName)}</span><span class="small muted">${label[s.stage] || ''}</span></span>${icon.chevron}</a>`).join('')}</div>`
        : `${tip('ovr', 'nothing here yet. your first photostrip is one message away.')}`}`,
    actions: `<a class="btn btn-primary" href="#/start">Start a new photostrip</a>`,
  });
}

/* ---------------- about ---------------- */
async function aboutView() {
  shell({
    title: 'about', back: '#/',
    body: `<h1 class="heading" tabindex="-1">about this prototype</h1>
      <p class="body">${esc(site.disclaimer)}</p>
      <div class="card stack-sm"><h2 class="subheading">Demo mode</h2>
        <p class="body muted" style="margin:0">Everything you type and any photos you add stay in this browser on this device. Nothing is sent to a server, and your friend’s replies are simulated so you can try the full journey on your own.</p></div>
      <div class="card stack-sm"><h2 class="subheading">How the real version would work</h2>
        <p class="body muted" style="margin:0">Your friend opens your link on their own phone and adds their part. Strips are private to the two of you, deleted after the pilot, and only shared publicly if you both agree.</p></div>
      <button class="btn btn-secondary" id="reset">Clear demo data on this device</button>`,
  });
  $('#reset').addEventListener('click', async () => {
    if (!confirm('Delete all demo photostrips on this device?')) return;
    await store.reset();
    toast('Demo data cleared.');
    go('#/');
  });
}

async function resume(id) {
  const s = await getStripOr404(id);
  if (!s) return;
  const map = { invite: `invite`, now: s.turns.now?.me ? 'wait/now' : 'stage/now', then: s.turns.then?.me ? 'wait/then' : 'stage/then', next: s.turns.next?.me ? 'wait/next' : 'stage/next', meetup: 'meetup', done: 'done' };
  location.replace(`#/s/${id}/${map[s.stage] || 'invite'}`);
}

/* ---------------- router ---------------- */
const routes = [
  [/^#?\/?$/, landing],
  [/^#\/start$/, start],
  [/^#\/faq$/, faqView],
  [/^#\/strips$/, stripsView],
  [/^#\/about$/, aboutView],
  [/^#\/s\/(\w+)$/, resume],
  [/^#\/s\/(\w+)\/invite$/, invite],
  [/^#\/s\/(\w+)\/sent$/, sent],
  [/^#\/s\/(\w+)\/friend$/, friendView],
  [/^#\/s\/(\w+)\/stage\/(now|then|next)$/, stageView],
  [/^#\/s\/(\w+)\/wait\/(now|then|next)$/, waitView],
  [/^#\/s\/(\w+)\/meetup$/, meetupView],
  [/^#\/s\/(\w+)\/done$/, doneView],
];

let controller;
async function render() {
  controller?.abort();
  controller = new AbortController();
  const signal = controller.signal;
  const h = location.hash || '#/';
  const match = routes.map(([re, fn]) => [h.match(re), fn]).find(([m]) => m);
  window.scrollTo(0, 0);
  if (!match) return go('#/');
  const [m, fn] = match;
  const p = fn(...m.slice(1), signal);
  // Move focus to the new screen's heading for screen-reader and keyboard users.
  queueMicrotask(() => setTimeout(() => $('h1')?.focus({ preventScroll: true }), 0));
  await p;
}

window.addEventListener('hashchange', render);
render();
