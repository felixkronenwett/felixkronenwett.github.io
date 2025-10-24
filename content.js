// content.js
(async () => {
  // Load a YAML file and parse it
  async function loadYAML(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load: ${url}`);
    const text = await res.text();
    return jsyaml.load(text);
  }

  // Icons (kept consistent with existing layout)
  const expIcon = `
    <div class="text-[#111418]" data-icon="TextHThree" data-size="24px" data-weight="regular">
      <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 76 66">
        <path d="M74,16H48v-6c0-1.1-0.9-2-2-2H30c-1.1,0-2,0.9-2,2v6H2c-1.1,0-2,0.9-2,2v48c0,1.1,0.9,2,2,2h72
        c1.1,0,2-0.9,2-2V18C76,16.9,75.1,16,74,16z M32,12h12v4H32V12z M72,64H4V44h28v5.9c0,1.1,0.9,2,2,2h8c1.1,0,2-0.9,2-2V44h28V64z
        M36,47.9v-12h4v12H36z M72,40H44v-6c0-1.1-0.9-2-2-2h-8c-1.1,0-2,0.9-2,2v6H4V20h68V40z"/>
      </svg>
    </div>`;
  const eduIcon = `
    <div class="text-[#111418]" data-icon="GraduationCap" data-size="24px" data-weight="regular">
      <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
        <path d="M251.76,88.94l-120-64a8,8,0,0,0-7.52,0l-120,64a8,8,0,0,0,0,14.12L32,117.87v48.42a15.91,15.91,0,0,0,4.06,10.65C49.16,191.53,78.51,216,128,216a130,130,0,0,0,48-8.76V240a8,8,0,0,0,16,0V199.51a115.63,115.63,0,0,0,27.94-22.57A15.91,15.91,0,0,0,224,166.29V117.87l27.76-14.81a8,8,0,0,0,0-14.12ZM128,200c-43.27,0-68.72-21.14-80-33.71V126.4l76.24,40.66a8,8,0,0,0,7.52,0L176,143.47v46.34C163.4,195.69,147.52,200,128,200Zm80-33.75a97.83,97.83,0,0,1-16,14.25V134.93l16-8.53ZM188,118.94l-.22-.13-56-29.87a8,8,0,0,0-7.52,14.12L171,128l-43,22.93L25,96,128,41.07,231,96Z"></path>
      </svg>
    </div>`;

  // Timeline column:
  // - Entry 1: icon with small top offset, no top segment, bottom segment (unless it is the last)
  // - Middle entries: short top segment, icon, bottom segment
  // - Last entry: short top segment, icon, NO bottom segment
  function makeTimelineCol(iconHTML, idx, isLast) {
    const col = document.createElement('div');
    col.className = 'flex flex-col items-center gap-1';

    const topSeg = idx > 0 ? '<div class="w-[1.5px] bg-[#dce0e5] h-2"></div>' : '';
    const iconWithOffset = idx === 0 ? `<div style="margin-top:9px;">${iconHTML}</div>` : iconHTML;
    const bottomSeg = !isLast ? '<div class="w-[1.5px] bg-[#dce0e5] h-2 grow"></div>' : '';

    col.innerHTML = `${topSeg}${iconWithOffset}${bottomSeg}`;
    return col;
  }

  // Text column
  function makeTextCol(title, subtitle) {
    const col = document.createElement('div');
    col.className = 'flex flex-1 flex-col py-3';
    col.innerHTML = `
      <p class="text-[#111418] text-base font-medium leading-normal">${title || ''}</p>
      <p class="text-[#637588] text-base font-normal leading-normal">${subtitle || ''}</p>
    `;
    return col;
  }

  // Publication link button (fixed hover classes for Tailwind CDN)
  function createLink(href, label) {
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    const hover =
      label === 'PDF' ? 'hover:bg-red-400' :
      label === 'DOI' ? 'hover:bg-green-400' :
      'hover:bg-blue-400';
    a.className = `bg-gray-300 text-white py-1 px-4 rounded-lg text-sm font-medium transition-colors ${hover} hover:text-white`;
    a.textContent = label;
    return a;
  }

  // Single publication entry
  function createPublicationEntry(p) {
    const wrapper = document.createElement('div');
    wrapper.className = 'flex gap-4 bg-white px-4 py-3 publication-entry';
    wrapper.dataset.year = String(p.year || '');
    wrapper.dataset.title = String(p.title || '');
    wrapper.dataset.citations = String(p.citations || 0);

    const content = document.createElement('div');
    content.className = 'flex flex-1 flex-col justify-center';
    content.innerHTML = `
      <p class="text-[#111418] text-base font-medium leading-normal">${p.title}</p>
      <p class="text-[#637588] text-sm font-normal leading-normal">${p.authors}</p>
      <p class="text-[#637588] text-sm font-normal leading-normal">${p.venue || ''}</p>
    `;

    const linksRow = document.createElement('div');
    linksRow.className = 'flex gap-2 mt-2';
    if (p.links?.pdf) linksRow.appendChild(createLink(p.links.pdf, 'PDF'));
    if (p.links?.journal) linksRow.appendChild(createLink(p.links.journal, 'Journal'));
    if (p.links?.doi) linksRow.appendChild(createLink(p.links.doi, 'DOI'));
    content.appendChild(linksRow);

    wrapper.appendChild(content);
    return wrapper;
  }

  // Sort publications
  function sortEntries(container, sortVal) {
    const entries = Array.from(container.querySelectorAll('.publication-entry'));
    const getYear = el => parseInt(el.dataset.year || '0', 10) || 0;
    const getTitle = el => (el.dataset.title || '').toLowerCase();
    const getCitations = el => parseInt(el.dataset.citations || '0', 10) || 0;

    entries.sort((a, b) => {
      if (sortVal === 'year-desc') return getYear(b) - getYear(a);
      if (sortVal === 'year-asc') return getYear(a) - getYear(b);
      if (sortVal === 'title-asc') return getTitle(a).localeCompare(getTitle(b));
      if (sortVal === 'title-desc') return getTitle(b).localeCompare(getTitle(a));
      if (sortVal === 'citations-desc') return getCitations(b) - getCitations(a);
      return 0;
    });
    entries.forEach(el => container.appendChild(el));
  }

  try {
    const [profile, exp, edu, pubs] = await Promise.all([
      loadYAML('data/profile.yaml'),
      loadYAML('data/experience.yaml'),
      loadYAML('data/education.yaml'),
      loadYAML('data/publications.yaml'),
    ]);

    // Profile
    const nameEl = document.getElementById('profile-name');
    const titleEl = document.getElementById('profile-title');
    const bioEl = document.getElementById('profile-bio');
    if (nameEl) nameEl.textContent = profile.name || '';
    if (titleEl) titleEl.textContent = profile.title || '';
    if (bioEl) bioEl.textContent = profile.bio || '';

    const linkScholar = document.getElementById('link-scholar');
    const linkOrcid = document.getElementById('link-orcid');
    const linkPublica = document.getElementById('link-publica');
    if (linkScholar && profile.links?.scholar) linkScholar.href = profile.links.scholar;
    if (linkOrcid && profile.links?.orcid) linkOrcid.href = profile.links.orcid;
    if (linkPublica && profile.links?.publica) linkPublica.href = profile.links.publica;

    // Experience (last entry has no bottom line)
    const expList = document.getElementById('experience-list');
    if (expList) {
      expList.innerHTML = '';
      (exp.items || []).forEach((item, idx, arr) => {
        const isLast = idx === arr.length - 1;
        expList.appendChild(makeTimelineCol(expIcon, idx, isLast));
        const title = item.role || '';
        const subtitleParts = [item.organization, item.location].filter(Boolean);
        const duration = [item.start, item.end].filter(Boolean).join(' - ');
        const subtitle = `${subtitleParts.join(', ')}${duration ? ', ' + duration : ''}`;
        expList.appendChild(makeTextCol(title, subtitle));
      });
    }

    // Education (same behavior)
    const eduList = document.getElementById('education-list');
    if (eduList) {
      eduList.innerHTML = '';
      (edu.items || []).forEach((item, idx, arr) => {
        const isLast = idx === arr.length - 1;
        eduList.appendChild(makeTimelineCol(eduIcon, idx, isLast));
        const title = item.degree || '';
        const subtitle = [item.institution, [item.start, item.end].filter(Boolean).join(' - ')].filter(Boolean).join(', ');
        eduList.appendChild(makeTextCol(title, subtitle));
      });
    }

    // Publications
    const pubsContainer = document.getElementById('publications-list');
    if (pubsContainer) {
      pubsContainer.innerHTML = '';
      (pubs.items || []).forEach(p => pubsContainer.appendChild(createPublicationEntry(p)));
    }

    // Search (supports DE and EN selectors)
    const searchInput =
      document.querySelector('input[aria-label="Publikationen suchen"], input[aria-label="Search publications"], input[placeholder="Suche nach Titel oder Autor"], input[placeholder="Search by title or author"]');
    if (searchInput && pubsContainer) {
      searchInput.addEventListener('input', e => {
        const q = (e.target.value || '').toLowerCase();
        pubsContainer.querySelectorAll('.publication-entry').forEach(entry => {
          const text = entry.innerText.toLowerCase();
          entry.style.display = text.includes(q) ? '' : 'none';
        });
      });
    }

    // Sorting
    const sortSel = document.getElementById('sort-publications');
    if (sortSel && pubsContainer) {
      sortSel.addEventListener('change', e => sortEntries(pubsContainer, e.target.value));
      sortEntries(pubsContainer, sortSel.value);
    }
  } catch (err) {
    console.error('Failed to load data:', err);
  }
})();