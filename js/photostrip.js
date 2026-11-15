// Draws the finished photostrip as a 1080×1920 image (Instagram Story size)
// so people can download it or share it to their Story.

const C = {
  cream: '#FFF6E9',
  plum: '#69455B',
  plumMuted: '#7D5A6E',
  orange: '#F6AA62',
  orangeTint: '#FDE3C8',
  yellow: '#FFD77D',
  yellowTint: '#FFEBBE',
  coral: '#FF8F86',
  white: '#FFFFFF',
};

const loadImg = (src) =>
  new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });

function wrap(ctx, text, maxW) {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCover(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s, sh = h / s;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

function drawTextCard(ctx, x, y, w, h, lines) {
  ctx.fillStyle = C.orangeTint;
  ctx.fillRect(x, y, w, h);
  // soft hills, like the placeholder in the screens
  ctx.fillStyle = 'rgba(246,170,98,0.35)';
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + h * 0.78);
  ctx.lineTo(x + w * 0.3, y + h * 0.6);
  ctx.lineTo(x + w * 0.55, y + h * 0.78);
  ctx.lineTo(x + w * 0.75, y + h * 0.66);
  ctx.lineTo(x + w, y + h * 0.82);
  ctx.lineTo(x + w, y + h);
  ctx.fill();
  ctx.fillStyle = C.plum;
  ctx.font = '700 40px Caveat';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  let ty = y + 34;
  for (const block of lines) {
    if (!block) continue;
    for (const l of wrap(ctx, block, w - 60).slice(0, 3)) {
      if (ty > y + h - 60) break;
      ctx.fillText(l, x + 30, ty);
      ty += 46;
    }
    ty += 14;
  }
}

export async function renderPhotostrip(strip, assets) {
  await Promise.all([
    document.fonts.load('600 64px Fredoka'),
    document.fonts.load('700 40px Caveat'),
    document.fonts.load('500 30px "DM Sans"'),
  ]);
  const W = 1080, H = 1920;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d');

  // background
  ctx.fillStyle = C.cream;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.yellowTint;
  ctx.beginPath();
  ctx.arc(W - 80, 260, 260, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,143,134,0.25)';
  ctx.beginPath();
  ctx.arc(90, H - 260, 220, 0, Math.PI * 2);
  ctx.fill();

  const logo = await loadImg(assets.logo);
  const lw = 150, lh = (logo.height / logo.width) * lw;
  ctx.drawImage(logo, 80, 70, lw, lh);
  ctx.fillStyle = C.plum;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '600 52px Fredoka';
  ctx.fillText('This Is Random But…', 250, 135);
  ctx.font = '700 40px Caveat';
  ctx.fillText("Let's pick up where we left off.", 252, 185);

  // the strip
  const sx = 250, sy = 280, sw = 580, pad = 30, fw = sw - pad * 2, fh = 360, capH = 64;
  const sh = pad + 3 * (fh + capH) + 90;
  ctx.save();
  ctx.translate(W / 2, sy + sh / 2);
  ctx.rotate((-2 * Math.PI) / 180);
  ctx.translate(-W / 2, -(sy + sh / 2));
  ctx.shadowColor = 'rgba(105,69,91,0.22)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 16;
  ctx.fillStyle = C.white;
  roundRect(ctx, sx, sy, sw, sh, 8);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  const t = strip.turns || {};
  const frames = [
    { cap: 'now', photo: t.now?.me?.photo, lines: [t.now?.me?.text && `${strip.myName || 'me'}: ${t.now.me.text}`, t.now?.friend?.text && `${strip.friendName}: ${t.now.friend.text}`] },
    { cap: 'then', photo: t.then?.me?.photo, lines: [t.then?.me?.text, t.then?.friend?.text && `${strip.friendName}: ${t.then.friend.text}`] },
    { cap: 'next', photo: t.meetup?.photo, lines: [t.next?.me?.idea && `${t.next.me.idea}`, t.next?.me?.time] },
  ];
  let y = sy + pad;
  for (const f of frames) {
    if (f.photo) {
      try {
        drawCover(ctx, await loadImg(f.photo), sx + pad, y, fw, fh);
      } catch {
        drawTextCard(ctx, sx + pad, y, fw, fh, f.lines);
      }
    } else drawTextCard(ctx, sx + pad, y, fw, fh, f.lines);
    ctx.fillStyle = C.plum;
    ctx.font = '700 42px Caveat';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const capText = f.cap === 'next' && t.meetup?.caption ? `next · ${t.meetup.caption}` : f.cap;
    ctx.fillText(capText.length > 34 ? capText.slice(0, 33) + '…' : capText, W / 2, y + fh + capH / 2);
    y += fh + capH;
  }
  ctx.font = '700 38px Caveat';
  ctx.fillStyle = C.plumMuted;
  const d = new Date(strip.updatedAt || Date.now());
  const month = d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  ctx.fillText(`${strip.myName || 'you'} & ${strip.friendName} · ${month}`, W / 2, y + 40);
  ctx.restore();

  // footer
  ctx.textAlign = 'center';
  ctx.fillStyle = C.plum;
  ctx.font = '600 44px Fredoka';
  ctx.fillText('we picked up where we left off.', W / 2, H - 170);
  ctx.font = '500 30px "DM Sans"';
  ctx.fillStyle = C.plumMuted;
  ctx.fillText(`${assets.hashtag}  ·  made with Reconnect`, W / 2, H - 110);

  return new Promise((res) => cv.toBlob((b) => res(b), 'image/png'));
}
