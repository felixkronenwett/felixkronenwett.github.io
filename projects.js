// projects.js
(() => {
  'use strict';

  // Utils
  const $ = (sel) => document.querySelector(sel);
  const formatDate = (iso) => {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso || '';
      return d.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return iso || '';
    }
  };
  const debounce = (fn, ms = 200) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  // YAML laden mit besserer Fehleranzeige
  async function loadYAML(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} bei ${url}`);
    const text = await res.text();

    if (/\t/.test(text)) {
      console.warn('Warnung: Tabs in YAML gefunden. Bitte nur Leerzeichen verwenden.');
    }

    try {
      return jsyaml.load(text);
    } catch (e) {
      const where = e.mark ? `Zeile ${e.mark.line + 1}, Spalte ${e.mark.column + 1}` : '';
      const reason = e.reason || e.message || e.toString();
      throw new Error(`YAML-Fehler ${where}: ${reason}`);
    }
  }

  // Karte für Eintrag – Badge rechts mittig fixiert
  function makeCard(item) {
    const a = document.createElement('a');
    a.href = `detail.html?type=${encodeURIComponent(item.type)}&slug=${encodeURIComponent(item.slug)}`;
    a.className = 'relative flex gap-4 bg-[#f8f9fc] px-4 py-3 rounded-lg hover:bg-[#f0f2f4] transition-colors pr-20 sm:pr-24 min-h-[86px]';

    const thumb = document.createElement('div');
    thumb.className = 'bg-center bg-no-repeat aspect-video bg-cover rounded-lg h-[70px] w-[124px] min-w-[124px]';
    if (item.thumb) thumb.style.backgroundImage = `url("${item.thumb}")`;

    const contentWrap = document.createElement('div');
    contentWrap.className = 'flex flex-1 items-center';

    const content = document.createElement('div');
    content.className = 'flex flex-1 flex-col justify-center';
    content.innerHTML = `
      <p class="text-[#111418] text-base font-medium leading-normal">${item.title || ''}</p>
      <p class="text-[#637588] text-sm leading-normal">Veröffentlicht: ${formatDate(item.date)}</p>
      <p class="text-[#637588] text-sm leading-normal">${item.summary || ''}</p>
    `;

    const badge = document.createElement('span');
    badge.className = 'absolute right-4 top-1/2 -translate-y-1/2 text-xs px-2 py-0.5 rounded bg-[#e7ebf3] text-[#111418]';
    badge.textContent = item.type === 'project' ? 'Projekt' : 'Blog';
    badge.setAttribute('aria-label', `Typ: ${badge.textContent}`);

    contentWrap.appendChild(content);
    a.appendChild(thumb);
    a.appendChild(contentWrap);
    a.appendChild(badge);
    return a;
  }

  // Pagination-Helfer
  function paginate(items, pageSize, page) {
    const total = items.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), pages);
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return { slice: items.slice(start, end), page: safePage, pages, total };
  }

  function renderPagination(container, pages, page, onChange) {
    container.innerHTML = '';
    if (pages <= 1) return;

    const mkBtn = (label, disabled, handler, isActive = false) => {
      const btn = document.createElement('button');
      btn.className = `text-sm flex size-10 items-center justify-center rounded-full ${isActive ? 'bg-[#e7ebf3] font-bold' : 'hover:bg-[#e7ebf3]'} disabled:opacity-40`;
      btn.textContent = label;
      btn.disabled = disabled;
      if (!disabled) btn.addEventListener('click', handler);
      return btn;
    };

    const prev = mkBtn('‹', page === 1, () => onChange(page - 1));
    container.appendChild(prev);

    for (let i = 1; i <= pages; i++) {
      const btn = mkBtn(String(i), false, () => onChange(i), i === page);
      container.appendChild(btn);
    }

    const next = mkBtn('›', page === pages, () => onChange(page + 1));
    container.appendChild(next);
  }

  // Hauptlogik
  document.addEventListener('DOMContentLoaded', async () => {
    const listEl = $('#posts-list');
    const searchEl = $('#search-posts');
    const filterEl = $('#filter-type');
    const pagerEl = $('#pagination');

    if (!listEl) {
      console.error('posts-list Container nicht gefunden.');
      return;
    }

    let items = [];
    let page = 1;
    const pageSize = 5;

    const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const apply = () => {
      const q = (searchEl?.value || '').toLowerCase().trim();
      const f = (filterEl?.value || 'all').toLowerCase();

      const filtered = items.filter((i) => {
        const typeOk = f === 'all' || i.type === f;
        const qOk = !q || i._search.includes(q);
        return typeOk && qOk;
      });

      // Neueste zuerst
      filtered.sort((a, b) => {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
      });

      const { slice, page: p, pages } = paginate(filtered, pageSize, page);
      page = p;

      listEl.innerHTML = '';
      if (slice.length === 0) {
        listEl.innerHTML = `
          <div class="rounded-lg bg-[#f8f9fc] p-4 text-[#637588]">
            Keine Beiträge gefunden${q ? ` für „${escapeHtml(q)}“` : ''}.
          </div>`;
      } else {
        slice.forEach((item) => listEl.appendChild(makeCard(item)));
      }

      if (pagerEl) {
        renderPagination(pagerEl, pages, page, (newPage) => {
          page = newPage;
          apply();
          const heading = document.querySelector('h1,h2,h3');
          if (heading) heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    };

    try {
      const data = await loadYAML('data/posts.yaml');
      items = (data?.items || []).map((i) => ({
        ...i,
        type: (i.type || '').toLowerCase() === 'project' ? 'project' : 'blog',
        _search: [
          i.title || '',
          i.summary || '',
          i.slug || '',
          i.type || '',
          formatDate(i.date) || '',
          i.date || '',
        ].join(' ').toLowerCase(),
      }));

      if (searchEl) searchEl.addEventListener('input', debounce(() => { page = 1; apply(); }, 150));
      if (filterEl) filterEl.addEventListener('change', () => { page = 1; apply(); });

      apply();
    } catch (err) {
      console.error('Failed to load posts:', err);
      listEl.innerHTML = `
        <div class="text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">
          Konnte Beiträge nicht laden.<br/>
          <span class="text-sm">${(err.message || String(err)).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))}</span>
        </div>`;
    }
  });
})();