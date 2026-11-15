// Data layer.
//
// The app only talks to `store` through the async methods below. In demo mode
// everything is kept in this browser (localStorage) and the friend's replies
// are simulated. To make the real two-person version, write a second class
// with the same methods that calls a backend (e.g. Supabase) and swap it in
// at the bottom of this file. No screen code needs to change.
//
// Strip shape:
// {
//   id, createdAt, updatedAt,
//   friendName, gap, place, opener,
//   stage: 'invite' | 'now' | 'then' | 'next' | 'meetup' | 'done',
//   turns: {
//     now:  { me: { text, photo, format, askBack }, friend: { text } },
//     then: { me: {...}, friend: {...}, note },
//     next: { me: { ideaId, idea, time }, friend: { text, accepted } },
//     meetup: { photo, caption },
//   }
// }

import { demoFriend } from './content.js';

export const MODE = 'demo';

const KEY = 'reconnect.demo.v1';
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

class DemoStore {
  #read() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || { strips: {} };
    } catch {
      return { strips: {} };
    }
  }
  #write(db) {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
      return true;
    } catch (e) {
      // Storage full or blocked (e.g. some private browsing modes).
      console.warn('Could not save', e);
      return false;
    }
  }

  async createStrip({ friendName, gap, place }) {
    const db = this.#read();
    const strip = {
      id: uid(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      friendName,
      gap,
      place,
      opener: '',
      stage: 'invite',
      turns: { now: {}, then: {}, next: {}, meetup: {} },
    };
    db.strips[strip.id] = strip;
    this.#write(db);
    return strip;
  }

  async getStrip(id) {
    return this.#read().strips[id] || null;
  }

  async listStrips() {
    return Object.values(this.#read().strips).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async updateStrip(id, patch) {
    const db = this.#read();
    const s = db.strips[id];
    if (!s) return null;
    Object.assign(s, patch, { updatedAt: Date.now() });
    const ok = this.#write(db);
    if (!ok) throw new Error('storage');
    return s;
  }

  async saveTurn(id, stage, who, payload) {
    const db = this.#read();
    const s = db.strips[id];
    if (!s) return null;
    s.turns[stage] = s.turns[stage] || {};
    s.turns[stage][who] = { ...(s.turns[stage][who] || {}), ...payload, at: Date.now() };
    s.updatedAt = Date.now();
    const ok = this.#write(db);
    if (!ok) throw new Error('storage');
    return s;
  }

  // Demo only: pretend the friend replies after a short delay.
  // A real backend would instead notify the page when the friend's turn arrives.
  async waitForFriend(id, stage, { delay = 4000, signal } = {}) {
    const s = await this.getStrip(id);
    if (s?.turns?.[stage]?.friend) return s;
    await new Promise((resolve, reject) => {
      const t = setTimeout(resolve, delay);
      signal?.addEventListener('abort', () => {
        clearTimeout(t);
        reject(new DOMException('aborted', 'AbortError'));
      });
    });
    const me = s.turns[stage]?.me || {};
    let reply;
    if (stage === 'next') reply = { text: demoFriend.next(me.idea, me.time), accepted: true };
    else reply = { text: demoFriend[stage](me.text || '') };
    return this.saveTurn(id, stage, 'friend', reply);
  }

  async deleteStrip(id) {
    const db = this.#read();
    delete db.strips[id];
    this.#write(db);
  }

  async reset() {
    localStorage.removeItem(KEY);
  }
}

export const store = new DemoStore();
