'use strict';
/**
 * Persistent agent memory, committed to the repo so every session (and the
 * inbox bot) shares it: ROADMAP.md, MEMORY.md, history.jsonl, settings.json.
 */
const fs = require('fs');
const cfg = require('./config');

function read(p, fallback = '') {
  try {
    return fs.readFileSync(p, 'utf-8');
  } catch {
    return fallback;
  }
}

function write(p, content) {
  fs.mkdirSync(require('path').dirname(p), { recursive: true });
  fs.writeFileSync(p, content, 'utf-8');
}

const state = {
  roadmap: () => read(cfg.ROADMAP_PATH, '# Roadmap\n\n## Next\n- (empty)\n'),
  setRoadmap: (md) => write(cfg.ROADMAP_PATH, md.trimEnd() + '\n'),
  memory: () => read(cfg.MEMORY_PATH, '# Memory\n'),
  addMemory(notes) {
    const existing = state.memory();
    const fresh = (notes || [])
      .map((n) => String(n).trim().replace(/^[-*]\s*/, ''))
      .filter((n) => n && !existing.includes(n));
    if (fresh.length === 0) return 0;
    let out = existing.trimEnd() + '\n' + fresh.map((n) => `- ${n}`).join('\n') + '\n';
    // Keep memory bounded: drop oldest bullets past ~60.
    const lines = out.split('\n');
    const bullets = lines.filter((l) => l.startsWith('- '));
    if (bullets.length > 60) {
      const drop = bullets.length - 60;
      let dropped = 0;
      out = lines
        .filter((l) => {
          if (l.startsWith('- ') && dropped < drop) {
            dropped++;
            return false;
          }
          return true;
        })
        .join('\n');
    }
    write(cfg.MEMORY_PATH, out);
    return fresh.length;
  },
  settings() {
    try {
      return JSON.parse(read(cfg.SETTINGS_PATH, '{}'));
    } catch {
      return {};
    }
  },
  setSettings: (obj) => write(cfg.SETTINGS_PATH, JSON.stringify({ ...state.settings(), ...obj }, null, 2) + '\n'),
  history(limit = 8) {
    return read(cfg.HISTORY_PATH)
      .split('\n')
      .filter(Boolean)
      .slice(-limit)
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  },
  appendHistory: (entry) => fs.appendFileSync(cfg.HISTORY_PATH, JSON.stringify(entry) + '\n', 'utf-8'),
  appendChangelog(entry) {
    const existing = read(cfg.CHANGELOG_PATH, '# FluxConvert — Changelog\n');
    write(cfg.CHANGELOG_PATH, existing.trimEnd() + '\n\n' + entry.trim() + '\n');
  },
  /** Append an owner request to the roadmap inbox section. */
  addRoadmapItem(text) {
    let md = state.roadmap();
    const line = `- [ ] (owner) ${text.trim()}`;
    if (/^## Owner requests/m.test(md)) {
      md = md.replace(/^## Owner requests[^\n]*\n/m, (h) => `${h}${line}\n`);
    } else {
      md = md.trimEnd() + `\n\n## Owner requests\n${line}\n`;
    }
    state.setRoadmap(md);
  },
};

module.exports = state;
