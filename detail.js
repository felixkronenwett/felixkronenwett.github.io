// detail.js
(async () => {
  function qs(param) {
    return new URLSearchParams(location.search).get(param);
  }
  function formatDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return iso; }
  }
  async function loadYAML(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load: ${url}`);
    const text = await res.text();
    return jsyaml.load(text);
  }
  async function loadText(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load: ${url}`);
    return res.text();
  }

  // Stile wie auf index.html anwenden
  function applyIndexStyles(root) {
    if (!root) return;

    // Fließtext
    root.querySelectorAll('p, li').forEach(el => {
      el.classList.add('text-[#637588]', 'text-base', 'font-normal', 'leading-normal');
    });

    // Listen
    root.querySelectorAll('ul').forEach(el => el.classList.add('list-disc', 'pl-6', 'my-2'));
    root.querySelectorAll('ol').forEach(el => el.classList.add('list-decimal', 'pl-6', 'my-2'));

    // Überschriften
    root.querySelectorAll('h1').forEach(el => el.classList.add('text-[#111418]', 'text-[22px]', 'font-bold', 'leading-tight', 'tracking-[-0.015em]', 'mt-4', 'mb-2'));
    root.querySelectorAll('h2').forEach(el => el.classList.add('text-[#111418]', 'text-[18px]', 'font-bold', 'leading-tight', 'mt-4', 'mb-2'));
    root.querySelectorAll('h3').forEach(el => el.classList.add('text-[#111418]', 'text-base', 'font-semibold', 'leading-tight', 'mt-3', 'mb-1.5'));

    // Bilder
    root.querySelectorAll('img').forEach(el => {
      el.classList.add('rounded-lg', 'max-w-full', 'my-4');
      el.loading = 'lazy';
      el.decoding = 'async';
    });

    // Links
    root.querySelectorAll('a').forEach(el => {
      el.classList.add('text-[#111418]', 'hover:underline');
      el.target = el.target || '_blank';
      el.rel = el.rel || 'noopener noreferrer';
    });

    // Code
    root.querySelectorAll('pre').forEach(el => el.classList.add('bg-[#f0f2f4]', 'rounded-lg', 'p-3', 'overflow-auto', 'my-3'));
    root.querySelectorAll('code').forEach(el => el.classList.add('bg-[#f0f2f4]', 'rounded', 'px-1', 'py-[2px]'));

    // Tabellen
    root.querySelectorAll('table').forEach(tbl => {
      tbl.classList.add('w-full', 'border-collapse', 'my-4', 'text-left');
      tbl.querySelectorAll('th').forEach(th => th.classList.add('text-[#111418]', 'font-medium', 'border-b', 'border-[#e5e7eb]', 'bg-[#f8f9fc]', 'px-3', 'py-2'));
      tbl.querySelectorAll('td').forEach(td => td.classList.add('text-[#637588]', 'border-b', 'border-[#e5e7eb]', 'px-3', 'py-2'));
    });
  }

  try {
    const type = qs('type');
    const slug = qs('slug');
    if (!type || !slug) throw new Error('Missing type or slug');

    const data = await loadYAML('data/posts.yaml');
    const item = (data.items || []).find(i => i.slug === slug && i.type === type);
    if (!item) throw new Error('Item not found');

    const titleEl = document.getElementById('detail-title');
    const metaEl = document.getElementById('detail-meta');
    const coverEl = document.getElementById('detail-cover');
    const contentEl = document.getElementById('detail-content');

    titleEl.textContent = item.title;
    metaEl.textContent = `${item.type === 'project' ? 'Projekt' : 'Blog'} • Veröffentlicht: ${formatDate(item.date)}`;

    if (item.thumb) {
      coverEl.style.backgroundImage = `url("${item.thumb}")`;
      coverEl.style.display = '';
    }

    // Markdown laden und sicher rendern
    const md = await loadText(item.md);

    // --- Math protection: extract $$ and $ blocks before marked processes them ---
    const mathStore = [];
    const protect = (src) => {
      // Display math first ($$...$$), then inline ($...$)
      return src
        .replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) => {
          mathStore.push({ type: 'display', content: inner });
          return `MATHPLACEHOLDER${mathStore.length - 1}ENDMATH`;
        })
        .replace(/\$([^\n$]+?)\$/g, (_, inner) => {
          mathStore.push({ type: 'inline', content: inner });
          return `MATHPLACEHOLDER${mathStore.length - 1}ENDMATH`;
        });
    };
    const restore = (html) => {
      return html.replace(/MATHPLACEHOLDER(\d+)ENDMATH/g, (_, i) => {
        const m = mathStore[parseInt(i, 10)];
        return m.type === 'display'
          ? `<span class="math-display">$$${m.content}$$</span>`
          : `<span class="math-inline">$${m.content}$</span>`;
      });
    };

    const protectedMd = protect(md);
    marked.setOptions({ breaks: true, gfm: true, headerIds: false, mangle: false });
    const rawHtml = restore(marked.parse(protectedMd));

    // DOMPurify: allow span and class (needed for math placeholders)
    const safeHtml = DOMPurify.sanitize(rawHtml, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ['class'],
    });

    contentEl.innerHTML = safeHtml;
    applyIndexStyles(contentEl);

    // MathJax für Formeln ausführen (after DOM is set)
    if (window.MathJax) {
      // If MathJax already loaded, typeset immediately; otherwise wait for it
      if (window.MathJax.typesetPromise) {
        await window.MathJax.typesetPromise([contentEl]);
      } else {
        window.MathJax.startup = window.MathJax.startup || {};
        const prev = window.MathJax.startup.ready;
        window.MathJax.startup.ready = () => {
          if (prev) prev();
          window.MathJax.typesetPromise([contentEl]);
        };
      }
    }
  } catch (err) {
    console.error(err);
    const contentEl = document.getElementById('detail-content');
    contentEl.innerHTML = '<p class="text-red-600 text-base leading-normal">Inhalt konnte nicht geladen werden.</p>';
  }
})();