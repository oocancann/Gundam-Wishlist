// ===========================================================
// GUNPLA COMPARE — app logic (Apple Style Edition)
// ===========================================================

const state = {
  allModels: [],
  selectedIds: new Set(),
  activeGrade: 'ALL',
  searchQuery: '',
  sortBy: 'name-asc',
  meta: {}
};

const els = {
  catalogGrid: document.getElementById('catalogGrid'),
  searchInput: document.getElementById('searchInput'),
  gradeFilters: document.getElementById('gradeFilters'),
  sortSelect: document.getElementById('sortSelect'),
  selectedCount: document.getElementById('selectedCount'),
  clearSelection: document.getElementById('clearSelection'),
  compareBar: document.getElementById('compareBar'),
  compareBarCount: document.getElementById('compareBarCount'),
  openCompareBtn: document.getElementById('openCompareBtn'),
  compareOverlay: document.getElementById('compareOverlay'),
  closeCompareBtn: document.getElementById('closeCompareBtn'),
  compareTableWrap: document.getElementById('compareTableWrap'),
  rateChip: document.getElementById('rateChip'),
  updatedChip: document.getElementById('updatedChip'),
};

// -------- grade helpers --------
function gradeClassSuffix(grade){
  return grade.toLowerCase().replace(/\s+/g, '-');
}

// -------- SVG placeholder generator (blueprint mecha glyph) --------
function placeholderSVG(grade){
  const color = grade === 'PG' ? '#C9A961' : grade === 'RG' ? '#5B8C5A' : '#4A7FA8';
  return `
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g fill="none" stroke="${color}" stroke-width="2" opacity="0.85">
      <path d="M50 8 L72 22 L72 50 L50 92 L28 50 L28 22 Z" stroke-linejoin="round"/>
      <path d="M38 34 L46 40 L46 50 L38 56 Z" />
      <path d="M62 34 L54 40 L54 50 L62 56 Z" />
      <line x1="50" y1="8" x2="50" y2="0" />
      <circle cx="50" cy="45" r="3" fill="${color}" stroke="none" opacity="0.6"/>
      <line x1="28" y1="22" x2="18" y2="30" />
      <line x1="72" y1="22" x2="82" y2="30" />
    </g>
  </svg>`;
}

// -------- data loading --------
async function loadData(){
  try{
    const res = await fetch('data/gundam-data.json');
    const json = await res.json();
    state.allModels = json.models;
    state.meta = json.meta;
    if(state.meta.exchangeRate && els.rateChip){
      els.rateChip.textContent = `1 JPY ≈ ${state.meta.exchangeRate} THB`;
    }
    if(state.meta.lastUpdated && els.updatedChip){
      els.updatedChip.textContent = `UPDATED ${state.meta.lastUpdated.replace(/-/g,'.')}`;
    }
    render();
  }catch(err){
    if(els.catalogGrid) {
      els.catalogGrid.innerHTML = `<div class="empty-state">โหลดข้อมูลไม่สำเร็จ — ตรวจสอบไฟล์ข้อมููล<br><span style="opacity:.6">${err.message}</span></div>`;
    }
    console.error(err);
  }
}

function priceToThb(yen){
  const rate = state.meta.exchangeRate || 0.2045;
  return Math.round(yen * rate);
}

function formatNum(n){
  return n.toLocaleString('en-US');
}

// -------- filtering / sorting --------
function getFilteredModels(){
  let list = state.allModels.slice();

  if(state.activeGrade !== 'ALL'){
    list = list.filter(m => m.grade === state.activeGrade);
  }

  if(state.searchQuery.trim()){
    const q = state.searchQuery.trim().toLowerCase();
    list = list.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.series.toLowerCase().includes(q)
    );
  }

  switch(state.sortBy){
    case 'name-asc': list.sort((a,b)=>a.name.localeCompare(b.name)); break;
    case 'price-asc': list.sort((a,b)=>a.priceYen-b.priceYen); break;
    case 'price-desc': list.sort((a,b)=>b.priceYen-a.priceYen); break;
    case 'height-asc': list.sort((a,b)=>a.heightMm-b.heightMm); break;
    case 'height-desc': list.sort((a,b)=>b.heightMm-a.heightMm); break;
    case 'year-desc': list.sort((a,b)=>b.releaseYear-a.releaseYear); break;
  }

  return list;
}

// -------- render catalog --------
function renderCatalog(){
  if(!els.catalogGrid) return;
  const list = getFilteredModels();
  if(list.length === 0){
    els.catalogGrid.innerHTML = `<div class="empty-state">ไม่พบรุ่นที่ตรงกับคำค้นหา ลองคำอื่นหรือเปลี่ยนตัวกรองเกรด</div>`;
    return;
  }

  els.catalogGrid.innerHTML = list.map(m => {
    const isSelected = state.selectedIds.has(m.id);
    const thb = priceToThb(m.priceYen);
    const gSuffix = gradeClassSuffix(m.grade);
    return `
    <article class="card ${isSelected ? 'is-selected':''}" data-id="${m.id}" tabindex="0" role="button" aria-pressed="${isSelected}" aria-label="เลือก ${m.name}">
      <span class="card-grade-tag card-grade-tag--${gSuffix}">${m.grade}</span>
      <div class="card-image">${placeholderSVG(m.grade)}</div>
      <div class="card-body">
        <span class="card-series">${escapeHtml(m.series)}</span>
        <span class="card-name">${escapeHtml(m.name)}</span>
        <div class="card-specs">
          <span>${m.scale}</span>
          <span>·</span>
          <span>${m.heightMm}mm</span>
        </div>
        <div class="card-price">
          <span class="card-price-yen">¥${formatNum(m.priceYen)}</span>
          <span class="card-price-thb">฿${formatNum(thb)}</span>
        </div>
      </div>
    </article>`;
  }).join('');
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// -------- selection handling --------
function toggleSelect(id){
  if(state.selectedIds.has(id)){
    state.selectedIds.delete(id);
  } else {
    if(state.selectedIds.size >= 4){
      flashCapWarning();
      return;
    }
    state.selectedIds.add(id);
  }
  renderCatalog();
  updateCompareBar();
  if(els.compareOverlay && els.compareOverlay.classList.contains('is-open')){
    renderCompareTable();
  }
}

function flashCapWarning(){
  if(!els.compareBarCount || !els.selectedCount) return;
  els.compareBarCount.style.color = 'red';
  els.selectedCount.textContent = 'เลือกได้สูงสุด 4 ตัว';
  setTimeout(()=>{ updateCompareBar(); }, 1400);
}

function updateCompareBar(){
  if(!els.selectedCount || !els.compareBarCount || !els.openCompareBtn || !els.compareBar) return;
  const n = state.selectedIds.size;
  els.selectedCount.textContent = `เลือกแล้ว ${n} ตัว`;
  els.compareBarCount.textContent = n;
  els.openCompareBtn.disabled = n < 2;
  if(n > 0){
    els.compareBar.classList.add('is-visible');
  } else {
    els.compareBar.classList.remove('is-visible');
  }
}

// -------- compare table --------
const ROWS = [
  { key:'grade', label:'เกรด' },
  { key:'scale', label:'สเกล' },
  { key:'heightMm', label:'ความสูง' },
  { key:'material', label:'วัสดุ' },
  { key:'priceYen', label:'ราคา (เยน)' },
  { key:'priceThb', label:'ราคา (บาท)' },
  { key:'releaseYear', label:'ปีวางจำหน่าย' },
  { key:'highlights', label:'จุดเด่น' },
  { key:'goodFor', label:'อะไรดี / เหมาะกับใคร' },
];

function renderCompareTable(){
  if(!els.compareTableWrap) return;
  const selected = state.allModels.filter(m => state.selectedIds.has(m.id));
  if(selected.length === 0){
    els.compareTableWrap.innerHTML = `<div class="compare-empty">ยังไม่ได้เลือกตัวเปรียบเทียบ — ปิดหน้าต่างนี้แล้วเลือกจากรายการ</div>`;
    return;
  }

  let html = `<table class="compare-table"><thead><tr><th class="row-label">รุ่น</th>`;
  selected.forEach(m => {
    html += `<th>
      <div class="col-header">
        <div class="col-header-image">
          <button class="col-remove-btn" data-remove-id="${m.id}" aria-label="เอา ${escapeHtml(m.name)} ออก">✕</button>
          ${placeholderSVG(m.grade)}
        </div>
        <span class="col-header-series">${escapeHtml(m.series)}</span>
        <span class="col-header-name">${escapeHtml(m.name)}</span>
      </div>
    </th>`;
  });
  html += `</tr></thead><tbody>`;

  ROWS.forEach(row => {
    html += `<tr><td class="row-label">${row.label}</td>`;
    selected.forEach(m => {
      html += `<td>${renderCell(row.key, m)}</td>`;
    });
    html += `</tr>`;
  });

  html += `</tbody></table>`;
  els.compareTableWrap.innerHTML = html;

  els.compareTableWrap.querySelectorAll('[data-remove-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-remove-id');
      state.selectedIds.delete(id);
      renderCatalog();
      updateCompareBar();
      renderCompareTable();
    });
  });
}

function renderCell(key, m){
  switch(key){
    case 'grade': {
      const gSuffix = gradeClassSuffix(m.grade);
      return `<span class="grade-pill grade-pill--${gSuffix}">${m.grade}</span>`;
    }
    case 'heightMm':
      return `${m.heightMm} mm`;
    case 'priceYen':
      return `<span class="cell-price-yen">¥${formatNum(m.priceYen)}</span>`;
    case 'priceThb':
      return `<span class="cell-price-thb">฿${formatNum(priceToThb(m.priceYen))}</span>`;
    case 'highlights':
      return `<div class="cell-highlights"><ul>${m.highlights.map(h=>`<li>${escapeHtml(h)}</li>`).join('')}</ul></div>`;
    case 'goodFor':
      return `<div class="cell-goodfor">${escapeHtml(m.goodFor)}</div>`;
    default:
      return escapeHtml(String(m[key] ?? '—'));
  }
}

// -------- event wiring --------
function render(){
  renderCatalog();
  updateCompareBar();
}

if(els.catalogGrid){
  els.catalogGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if(!card) return;
    toggleSelect(card.dataset.id);
  });
  els.catalogGrid.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' || e.key === ' '){
      const card = e.target.closest('.card');
      if(!card) return;
      e.preventDefault();
      toggleSelect(card.dataset.id);
    }
  });
}

if(els.searchInput){
  els.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderCatalog();
  });
}

if(els.gradeFilters){
  els.gradeFilters.addEventListener('click', (e) => {
    const btn = e.target.closest('.grade-chip');
    if(!btn) return;
    state.activeGrade = btn.dataset.grade;
    els.gradeFilters.querySelectorAll('.grade-chip').forEach(c => c.classList.remove('is-active'));
    btn.classList.add('is-active');
    renderCatalog();
  });
}

if(els.sortSelect){
  els.sortSelect.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    renderCatalog();
  });
}

if(els.clearSelection){
  els.clearSelection.addEventListener('click', () => {
    state.selectedIds.clear();
    renderCatalog();
    updateCompareBar();
  });
}

if(els.openCompareBtn){
  els.openCompareBtn.addEventListener('click', () => {
    renderCompareTable();
    if(els.compareOverlay){
      els.compareOverlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }
  });
}

if(els.closeCompareBtn) els.closeCompareBtn.addEventListener('click', closeCompare);

if(els.compareOverlay){
  els.compareOverlay.addEventListener('click', (e) => {
    if(e.target === els.compareOverlay) closeCompare();
  });
}

document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape' && els.compareOverlay && els.compareOverlay.classList.contains('is-open')) closeCompare();
});

function closeCompare(){
  if(els.compareOverlay){
    els.compareOverlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }
}

// -------- init --------
loadData();
