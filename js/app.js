// ============================================================
// GUNPLA COMPARE — app.js
// ============================================================

const state = {
  allModels: [],
  selectedIds: new Set(),
  activeGrade: 'ALL',
  searchQuery: '',
  sortBy: 'name-asc',
  priceMin: null, priceMax: null,
  heightMin: null, heightMax: null,
  yearMin: null, yearMax: null,
  isListView: false,
  meta: {}
};

const $ = id => document.getElementById(id);

const els = {
  catalogGrid:     $('catalogGrid'),
  searchInput:     $('searchInput'),
  searchClear:     $('searchClear'),
  gradeFilters:    $('gradeFilters'),
  sortSelect:      $('sortSelect'),
  resultCount:     $('resultCount'),
  activeFilters:   $('activeFilters'),
  compareBar:      $('compareBar'),
  compareBarCount: $('compareBarCount'),
  compareThumbs:   $('compareThumbs'),
  openCompareBtn:  $('openCompareBtn'),
  compareOverlay:  $('compareOverlay'),
  closeCompareBtn: $('closeCompareBtn'),
  compareTableWrap:$('compareTableWrap'),
  detailOverlay:   $('detailOverlay'),
  closeDetailBtn:  $('closeDetailBtn'),
  detailBody:      $('detailBody'),
  detailTitle:     $('detailTitle'),
  rateChip:        $('rateChip'),
  updatedChip:     $('updatedChip'),
  viewGrid:        $('viewGrid'),
  viewList:        $('viewList'),
  resetFilters:    $('resetFilters'),
  priceMin:        $('priceMin'),
  priceMax:        $('priceMax'),
  heightMin:       $('heightMin'),
  heightMax:       $('heightMax'),
  yearMin:         $('yearMin'),
  yearMax:         $('yearMax'),
};

// ── helpers ──────────────────────────────────────────────────
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
function fmt(n) { return n.toLocaleString('en-US'); }
function thb(yen) { return Math.round(yen * (state.meta.exchangeRate || 0.2045)); }
function gradeKey(grade) { return grade === 'MEGA SIZE' ? 'MEGA' : grade; }

function placeholderSVG(grade) {
  const color = grade === 'PG' ? '#B8860B' : grade === 'RG' ? '#2E7D32' : '#1565C0';
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="${color}" stroke-width="2.5" opacity="0.7">
      <path d="M50 10 L74 24 L74 54 L50 90 L26 54 L26 24 Z" stroke-linejoin="round"/>
      <path d="M38 36 L46 42 L46 52 L38 58 Z"/>
      <path d="M62 36 L54 42 L54 52 L62 58 Z"/>
      <circle cx="50" cy="47" r="4" fill="${color}" stroke="none" opacity="0.5"/>
    </g>
  </svg>`;
}

function imgTag(m) {
  if (m.image) {
    return `<img src="${esc(m.image)}" alt="${esc(m.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
            <div class="placeholder-svg" style="display:none;position:absolute;inset:0;align-items:center;justify-content:center;">${placeholderSVG(m.grade)}</div>`;
  }
  return `<div class="placeholder-svg">${placeholderSVG(m.grade)}</div>`;
}

// ── data ──────────────────────────────────────────────────────
async function loadData() {
  try {
    const res = await fetch('gundam-data.json');
    const json = await res.json();
    state.allModels = json.models;
    state.meta = json.meta;
    if (state.meta.exchangeRate) {
      els.rateChip.textContent = `1 JPY ≈ ${state.meta.exchangeRate} THB`;
    }
    if (state.meta.lastUpdated) {
      els.updatedChip.textContent = `อัพเดต ${state.meta.lastUpdated.replace(/-/g,'.')}`;
    }
    updateGradeCounts();
    render();
  } catch (err) {
    els.catalogGrid.innerHTML = `<div class="empty-state">
      <strong>โหลดข้อมูลไม่สำเร็จ</strong>
      <p>ต้องรันผ่าน local server เช่น <code>python3 -m http.server</code><br>${esc(err.message)}</p>
    </div>`;
  }
}

// ── filter / sort ─────────────────────────────────────────────
function getFiltered() {
  let list = state.allModels.slice();

  if (state.activeGrade !== 'ALL')
    list = list.filter(m => m.grade === state.activeGrade);

  if (state.searchQuery.trim()) {
    const q = state.searchQuery.trim().toLowerCase();
    list = list.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.series.toLowerCase().includes(q)
    );
  }
  if (state.priceMin != null) list = list.filter(m => m.priceYen >= state.priceMin);
  if (state.priceMax != null) list = list.filter(m => m.priceYen <= state.priceMax);
  if (state.heightMin != null) list = list.filter(m => m.heightMm >= state.heightMin);
  if (state.heightMax != null) list = list.filter(m => m.heightMm <= state.heightMax);
  if (state.yearMin != null) list = list.filter(m => m.releaseYear >= state.yearMin);
  if (state.yearMax != null) list = list.filter(m => m.releaseYear <= state.yearMax);

  switch (state.sortBy) {
    case 'name-asc':    list.sort((a,b)=>a.name.localeCompare(b.name)); break;
    case 'price-asc':   list.sort((a,b)=>a.priceYen-b.priceYen); break;
    case 'price-desc':  list.sort((a,b)=>b.priceYen-a.priceYen); break;
    case 'height-asc':  list.sort((a,b)=>a.heightMm-b.heightMm); break;
    case 'height-desc': list.sort((a,b)=>b.heightMm-a.heightMm); break;
    case 'year-desc':   list.sort((a,b)=>b.releaseYear-a.releaseYear); break;
  }
  return list;
}

// ── grade counts ──────────────────────────────────────────────
function updateGradeCounts() {
  const counts = { ALL: state.allModels.length, PG:0, RG:0, MEGA:0 };
  state.allModels.forEach(m => {
    if (m.grade === 'PG') counts.PG++;
    else if (m.grade === 'RG') counts.RG++;
    else if (m.grade === 'MEGA SIZE') counts.MEGA++;
  });
  Object.entries(counts).forEach(([k,v]) => {
    const el = $(`count-${k}`);
    if (el) el.textContent = v;
  });
}

// ── active filter tags ────────────────────────────────────────
function renderFilterTags() {
  const tags = [];
  if (state.priceMin != null) tags.push({ label:`ราคา ≥ ¥${fmt(state.priceMin)}`, clear:()=>{state.priceMin=null;els.priceMin.value='';} });
  if (state.priceMax != null) tags.push({ label:`ราคา ≤ ¥${fmt(state.priceMax)}`, clear:()=>{state.priceMax=null;els.priceMax.value='';} });
  if (state.heightMin != null) tags.push({ label:`สูง ≥ ${state.heightMin}mm`, clear:()=>{state.heightMin=null;els.heightMin.value='';} });
  if (state.heightMax != null) tags.push({ label:`สูง ≤ ${state.heightMax}mm`, clear:()=>{state.heightMax=null;els.heightMax.value='';} });
  if (state.yearMin != null) tags.push({ label:`ปี ≥ ${state.yearMin}`, clear:()=>{state.yearMin=null;els.yearMin.value='';} });
  if (state.yearMax != null) tags.push({ label:`ปี ≤ ${state.yearMax}`, clear:()=>{state.yearMax=null;els.yearMax.value='';} });

  els.activeFilters.innerHTML = tags.map((t,i)=>`
    <span class="filter-tag">${esc(t.label)}<button data-tag-idx="${i}">✕</button></span>
  `).join('');

  els.activeFilters.querySelectorAll('[data-tag-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      tags[+btn.dataset.tagIdx].clear();
      renderCatalog();
      renderFilterTags();
    });
  });
}

// ── catalog ───────────────────────────────────────────────────
function renderCatalog() {
  const list = getFiltered();
  els.resultCount.textContent = `${list.length} รุ่น`;

  if (list.length === 0) {
    els.catalogGrid.innerHTML = `<div class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <strong>ไม่พบรุ่นที่ตรงกัน</strong>
      <p>ลองเปลี่ยนคำค้นหาหรือปรับตัวกรอง</p>
    </div>`;
    renderFilterTags();
    return;
  }

  const gk = m => gradeKey(m.grade);
  els.catalogGrid.innerHTML = list.map(m => {
    const sel = state.selectedIds.has(m.id);
    return `<article class="card ${sel?'is-selected':''}" data-id="${m.id}" tabindex="0" role="button" aria-pressed="${sel}" aria-label="${esc(m.name)}">
      <span class="card-grade card-grade--${gk(m)}">${m.grade}</span>
      <span class="card-check" aria-hidden="true">
        <svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4.5L3.5 7L10 1" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
      <div class="card-img">${imgTag(m)}</div>
      <div class="card-body">
        <span class="card-series">${esc(m.series)}</span>
        <span class="card-name">${esc(m.name)}</span>
        <div class="card-specs">
          <span class="card-spec">${m.scale}</span>
          <span class="card-spec" style="margin-left:4px">·</span>
          <span class="card-spec">${m.heightMm}mm</span>
          <span class="card-spec" style="margin-left:4px">·</span>
          <span class="card-spec">${m.releaseYear}</span>
        </div>
        <div class="card-price">
          <span class="card-yen">¥${fmt(m.priceYen)}</span>
          <span class="card-thb">฿${fmt(thb(m.priceYen))}</span>
        </div>
      </div>
      <div class="card-actions">
        <button class="btn-detail" data-detail-id="${m.id}">ดูรายละเอียด</button>
        <button class="btn-select" data-sel-id="${m.id}">${sel?'✓ เลือกแล้ว':'+ เปรียบเทียบ'}</button>
      </div>
    </article>`;
  }).join('');

  // wire action buttons (don't bubble to card toggle)
  els.catalogGrid.querySelectorAll('.btn-detail').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); openDetail(btn.dataset.detailId); });
  });
  els.catalogGrid.querySelectorAll('.btn-select').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); toggleSelect(btn.dataset.selId); });
  });

  renderFilterTags();
}

// ── select ────────────────────────────────────────────────────
function toggleSelect(id) {
  if (state.selectedIds.has(id)) {
    state.selectedIds.delete(id);
  } else {
    if (state.selectedIds.size >= 4) { flashCap(); return; }
    state.selectedIds.add(id);
  }
  renderCatalog();
  updateCompareBar();
  if (els.compareOverlay.classList.contains('is-open')) renderCompareTable();
}

function flashCap() {
  const label = els.compareBar.querySelector('.compare-label');
  label.style.color = '#ef5350';
  label.innerHTML = 'เลือกได้สูงสุด 4 ตัว';
  setTimeout(() => { updateCompareBar(); }, 1600);
}

function updateCompareBar() {
  const n = state.selectedIds.size;
  els.compareBarCount.textContent = n;
  els.openCompareBtn.disabled = n < 2;
  if (n > 0) {
    els.compareBar.classList.add('is-visible');
  } else {
    els.compareBar.classList.remove('is-visible');
  }
  // thumbnails
  const models = state.allModels.filter(m => state.selectedIds.has(m.id));
  els.compareThumbs.innerHTML = models.map(m => `
    <div class="compare-thumb">${m.image
      ? `<img src="${esc(m.image)}" alt="${esc(m.name)}">`
      : placeholderSVG(m.grade)
    }</div>
  `).join('');
}

// ── compare table ─────────────────────────────────────────────
const ROWS = [
  { key:'grade',       label:'เกรด' },
  { key:'scale',       label:'สเกล' },
  { key:'heightMm',    label:'ความสูง' },
  { key:'material',    label:'วัสดุ' },
  { key:'priceYen',    label:'ราคา (เยน)' },
  { key:'priceThb',    label:'ราคา (บาท)' },
  { key:'releaseYear', label:'ปีวางจำหน่าย' },
  { key:'highlights',  label:'จุดเด่น' },
  { key:'goodFor',     label:'เหมาะกับ' },
];

function renderCompareTable() {
  const selected = state.allModels.filter(m => state.selectedIds.has(m.id));
  if (!selected.length) {
    els.compareTableWrap.innerHTML = `<div class="compare-empty">ยังไม่ได้เลือกตัวเปรียบเทียบ — ปิดแล้วเลือกจากรายการ</div>`;
    return;
  }
  const gk = m => gradeKey(m.grade);
  let html = `<table class="compare-table"><thead><tr><th class="row-label"></th>`;
  selected.forEach(m => {
    html += `<th>
      <div class="col-header">
        <div class="col-header-img">
          <button class="col-remove" data-remove-id="${m.id}" title="เอาออก">✕</button>
          ${m.image ? `<img src="${esc(m.image)}" alt="${esc(m.name)}" onerror="this.style.display='none'">` : placeholderSVG(m.grade)}
        </div>
        <span class="col-series">${esc(m.series)}</span>
        <span class="col-name">${esc(m.name)}</span>
      </div>
    </th>`;
  });
  html += `</tr></thead><tbody>`;
  ROWS.forEach(row => {
    html += `<tr><td class="row-label">${row.label}</td>`;
    selected.forEach(m => { html += `<td>${renderCell(row.key, m)}</td>`; });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  els.compareTableWrap.innerHTML = html;

  els.compareTableWrap.querySelectorAll('[data-remove-id]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      state.selectedIds.delete(btn.dataset.removeId);
      renderCatalog();
      updateCompareBar();
      renderCompareTable();
    });
  });
}

function renderCell(key, m) {
  switch(key) {
    case 'grade': return `<span class="grade-tag grade-tag--${gradeKey(m.grade)}">${m.grade}</span>`;
    case 'heightMm': return `${m.heightMm} mm`;
    case 'priceYen': return `<span class="price-yen">¥${fmt(m.priceYen)}</span>`;
    case 'priceThb': return `<span class="price-thb">฿${fmt(thb(m.priceYen))}</span>`;
    case 'highlights': return `<ul class="highlights-list">${m.highlights.map(h=>`<li>${esc(h)}</li>`).join('')}</ul>`;
    case 'goodFor': return `<div class="goodfor-text">${esc(m.goodFor)}</div>`;
    default: return esc(String(m[key] ?? '—'));
  }
}

// ── detail overlay ────────────────────────────────────────────
function openDetail(id) {
  const m = state.allModels.find(x => x.id === id);
  if (!m) return;
  els.detailTitle.textContent = m.name;
  const gk = gradeKey(m.grade);
  els.detailBody.innerHTML = `
    <div class="detail-img">
      ${m.image
        ? `<img src="${esc(m.image)}" alt="${esc(m.name)}" onerror="this.style.display='none'">`
        : `<div style="width:50%;height:50%">${placeholderSVG(m.grade)}</div>`}
    </div>
    <div class="detail-meta">
      <div class="detail-row">
        <div class="label">เกรด</div>
        <div class="value"><span class="grade-tag grade-tag--${gk}">${m.grade}</span></div>
      </div>
      <div class="detail-row">
        <div class="label">สเกล</div>
        <div class="value">${esc(m.scale)}</div>
      </div>
      <div class="detail-row">
        <div class="label">ความสูง</div>
        <div class="value">${m.heightMm} mm</div>
      </div>
      <div class="detail-row">
        <div class="label">ปีวางจำหน่าย</div>
        <div class="value">${m.releaseYear}</div>
      </div>
      <div class="detail-row">
        <div class="label">ราคา (เยน)</div>
        <div class="value price-yen">¥${fmt(m.priceYen)}</div>
      </div>
      <div class="detail-row">
        <div class="label">ราคา (บาท)</div>
        <div class="value price-thb">฿${fmt(thb(m.priceYen))}</div>
      </div>
      <div class="detail-row span2">
        <div class="label">วัสดุ</div>
        <div class="value">${esc(m.material)}</div>
      </div>
    </div>
    <div class="detail-highlights">
      <h4>จุดเด่น</h4>
      <ul>${m.highlights.map(h=>`<li>${esc(h)}</li>`).join('')}</ul>
    </div>
    <div class="detail-goodfor">${esc(m.goodFor)}</div>
  `;
  els.detailOverlay.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

// ── events ────────────────────────────────────────────────────
els.catalogGrid.addEventListener('click', e => {
  const card = e.target.closest('.card');
  if (!card || e.target.closest('.btn-detail') || e.target.closest('.btn-select')) return;
  toggleSelect(card.dataset.id);
});
els.catalogGrid.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') {
    const card = e.target.closest('.card');
    if (!card) return;
    e.preventDefault();
    toggleSelect(card.dataset.id);
  }
});

els.searchInput.addEventListener('input', e => {
  state.searchQuery = e.target.value;
  els.searchClear.style.display = e.target.value ? 'block' : 'none';
  renderCatalog();
});
els.searchClear.addEventListener('click', () => {
  state.searchQuery = '';
  els.searchInput.value = '';
  els.searchClear.style.display = 'none';
  renderCatalog();
});

els.gradeFilters.addEventListener('click', e => {
  const btn = e.target.closest('.grade-btn');
  if (!btn) return;
  state.activeGrade = btn.dataset.grade;
  els.gradeFilters.querySelectorAll('.grade-btn').forEach(b => b.classList.remove('is-active'));
  btn.classList.add('is-active');
  renderCatalog();
});

els.sortSelect.addEventListener('change', e => {
  state.sortBy = e.target.value;
  renderCatalog();
});

// range filters
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
const onRangeInput = debounce(() => {
  state.priceMin  = els.priceMin.value  ? +els.priceMin.value  : null;
  state.priceMax  = els.priceMax.value  ? +els.priceMax.value  : null;
  state.heightMin = els.heightMin.value ? +els.heightMin.value : null;
  state.heightMax = els.heightMax.value ? +els.heightMax.value : null;
  state.yearMin   = els.yearMin.value   ? +els.yearMin.value   : null;
  state.yearMax   = els.yearMax.value   ? +els.yearMax.value   : null;
  renderCatalog();
}, 400);
[els.priceMin, els.priceMax, els.heightMin, els.heightMax, els.yearMin, els.yearMax]
  .forEach(el => el.addEventListener('input', onRangeInput));

els.resetFilters.addEventListener('click', () => {
  state.priceMin = state.priceMax = null;
  state.heightMin = state.heightMax = null;
  state.yearMin = state.yearMax = null;
  state.activeGrade = 'ALL';
  state.searchQuery = '';
  els.searchInput.value = '';
  els.searchClear.style.display = 'none';
  els.sortSelect.value = 'name-asc';
  state.sortBy = 'name-asc';
  [els.priceMin, els.priceMax, els.heightMin, els.heightMax, els.yearMin, els.yearMax]
    .forEach(el => el.value = '');
  els.gradeFilters.querySelectorAll('.grade-btn').forEach((b,i) => b.classList.toggle('is-active', i===0));
  renderCatalog();
});

// view toggle
els.viewGrid.addEventListener('click', () => {
  state.isListView = false;
  els.catalogGrid.classList.remove('list-view');
  els.viewGrid.classList.add('is-active');
  els.viewList.classList.remove('is-active');
});
els.viewList.addEventListener('click', () => {
  state.isListView = true;
  els.catalogGrid.classList.add('list-view');
  els.viewList.classList.add('is-active');
  els.viewGrid.classList.remove('is-active');
});

// compare bar
$('clearSelection').addEventListener('click', () => {
  state.selectedIds.clear();
  renderCatalog();
  updateCompareBar();
});
els.openCompareBtn.addEventListener('click', () => {
  renderCompareTable();
  els.compareOverlay.classList.add('is-open');
  document.body.style.overflow = 'hidden';
});
els.closeCompareBtn.addEventListener('click', closeCompare);
els.compareOverlay.addEventListener('click', e => { if (e.target === els.compareOverlay) closeCompare(); });

// detail
els.closeDetailBtn.addEventListener('click', closeDetail);
els.detailOverlay.addEventListener('click', e => { if (e.target === els.detailOverlay) closeDetail(); });

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (els.compareOverlay.classList.contains('is-open')) closeCompare();
    if (els.detailOverlay.classList.contains('is-open')) closeDetail();
  }
});

function closeCompare() {
  els.compareOverlay.classList.remove('is-open');
  document.body.style.overflow = '';
}
function closeDetail() {
  els.detailOverlay.classList.remove('is-open');
  document.body.style.overflow = '';
}

// ── init ──────────────────────────────────────────────────────
loadData();
