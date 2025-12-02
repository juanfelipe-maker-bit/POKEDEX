/* PokéFinder (correcciones) - Tabs visibles, logo grande, fondo desenfocado, responsive, 12 por página, favoritos */

const POKE_API_BASE = 'https://pokeapi.co/api/v2';
const LIMIT = 12;

// DOM
const tabs = document.querySelectorAll('.tab-btn');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const randomBtn = document.getElementById('randomBtn');
const cardsContainer = document.getElementById('cardsContainer');
const statusEl = document.getElementById('status');
const pagination = document.getElementById('pagination');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');

const typesSection = document.getElementById('typesSection');
const typeSelect = document.getElementById('typeSelect');

const themeToggle = document.getElementById('themeToggle');
const yearEl = document.getElementById('year');

let page = 0;
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
let currentView = 'all';

// Init
document.addEventListener('DOMContentLoaded', () => {
  yearEl && (yearEl.textContent = new Date().getFullYear());
  loadTheme();
  attachEvents();
  loadTypes();
  loadPage(page);
});

function attachEvents(){
  tabs.forEach(t => t.addEventListener('click', () => activateTab(t.dataset.tab)));

  searchForm && searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = searchInput.value.trim().toLowerCase();
    if (!q) return;
    pagination.classList.add('hidden');
    await searchPokemon(q);
    currentView = 'all';
    setActiveTab('all');
  });

  randomBtn && randomBtn.addEventListener('click', async () => {
    pagination.classList.add('hidden');
    const id = Math.floor(Math.random() * 898) + 1;
    await fetchAndRenderById(id);
    currentView = 'all';
    setActiveTab('all');
  });

  prevBtn && prevBtn.addEventListener('click', () => { if(page>0){ page--; loadPage(page); }});
  nextBtn && nextBtn.addEventListener('click', () => { page++; loadPage(page); });

  themeToggle && themeToggle.addEventListener('change', () => {
    const dark = themeToggle.checked;
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  });
}

function setActiveTab(name){
  tabs.forEach(t => {
    t.classList.toggle('active', t.dataset.tab === name);
    t.setAttribute('aria-selected', t.dataset.tab === name ? 'true' : 'false');
  });
}
function activateTab(name){
  setActiveTab(name);
  currentView = name;

  if(name === 'all'){
    document.getElementById('searchSection').classList.remove('hidden');
    typesSection.classList.add('hidden');
    pagination.classList.remove('hidden');
    page = 0;
    loadPage(page);
  } else if(name === 'favorites'){
    document.getElementById('searchSection').classList.add('hidden');
    typesSection.classList.add('hidden');
    pagination.classList.add('hidden');
    renderPokemons(favorites);
  } else if(name === 'types'){
    document.getElementById('searchSection').classList.add('hidden');
    typesSection.classList.remove('hidden');
    pagination.classList.add('hidden');
  }
}

/* Theme load */
function loadTheme(){
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const useDark = (saved === 'dark') || (!saved && prefersDark);
  document.documentElement.classList.toggle('dark', useDark);
  if(themeToggle) themeToggle.checked = useDark;
}

/* Load page */
async function loadPage(pageIndex){
  showStatus('Cargando...', false);
  const offset = pageIndex * LIMIT;
  try{
    const listResp = await fetch(`${POKE_API_BASE}/pokemon?limit=${LIMIT}&offset=${offset}`);
    if(!listResp.ok) throw new Error('list');
    const listJson = await listResp.json();
    const promises = listJson.results.map(r => fetch(r.url).then(res => res.json()));
    const pokemons = await Promise.all(promises);
    renderPokemons(pokemons);
    const totalPages = Math.ceil((listJson.count || 898) / LIMIT);
    pageInfo && (pageInfo.textContent = `Página ${pageIndex+1} / ${totalPages}`);
    pagination.classList.remove('hidden');
    showStatus('', true);
  }catch(err){
    console.error(err);
    showStatus('No se pudo cargar la página.', false);
  }
}

/* Fetch by id */
async function fetchAndRenderById(id){
  showStatus('Cargando...', false);
  try{
    const resp = await fetch(`${POKE_API_BASE}/pokemon/${id}`);
    if(!resp.ok) throw new Error('notfound');
    const p = await resp.json();
    renderPokemons([p]);
    showStatus('', true);
  }catch(e){
    console.error(e);
    showStatus('No se encontró ese Pokémon.', false);
  }
}

/* Search */
async function searchPokemon(query){
  showStatus('Buscando...', false);
  try{
    const resp = await fetch(`${POKE_API_BASE}/pokemon/${encodeURIComponent(query)}`);
    if(!resp.ok) throw new Error('notfound');
    const p = await resp.json();
    renderPokemons([p]);
    showStatus('', true);
  }catch(err){
    console.error(err);
    showStatus('No se encontró ese Pokémon.', false);
  }
}

/* Types */
async function loadTypes(){
  try{
    const resp = await fetch(`${POKE_API_BASE}/type`);
    if(!resp.ok) throw new Error('types');
    const json = await resp.json();
    if(typeSelect){
      typeSelect.innerHTML = `<option value="">— Elige un tipo —</option>`;
      json.results.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.url;
        opt.textContent = capitalize(t.name);
        typeSelect.appendChild(opt);
      });
      typeSelect.addEventListener('change', async () => {
        const url = typeSelect.value;
        if(!url) return;
        showStatus('Cargando por tipo...', false);
        try{
          const r = await fetch(url);
          if(!r.ok) throw new Error('tipo');
          const j = await r.json();
          const list = j.pokemon.slice(0, 48);
          const pokes = await Promise.all(list.map(item => fetch(item.pokemon.url).then(r=>r.json())));
          renderPokemons(pokes);
          showStatus('', true);
        }catch(e){ console.error(e); showStatus('Error al cargar tipo.', false); }
      });
    }
  }catch(e){ console.error(e); }
}

/* Favorites */
function toggleFavorite(pokemon){
  const exists = favorites.find(f => f.id === pokemon.id);
  if(exists) favorites = favorites.filter(f => f.id !== pokemon.id);
  else favorites.push(pokemon);
  localStorage.setItem('favorites', JSON.stringify(favorites));
  // update hearts in current view
  document.querySelectorAll('.card').forEach(card=>{
    const id = Number(card.dataset.id);
    const heart = card.querySelector('.favorite-btn');
    if(favorites.find(f=>f.id===id)) { heart.classList.add('active'); heart.textContent='❤️'; }
    else { heart.classList.remove('active'); heart.textContent='🤍'; }
  });
  if(currentView === 'favorites') renderPokemons(favorites);
}

/* Render */
function renderPokemons(list){
  cardsContainer.innerHTML = '';
  if(!list || list.length === 0){ cardsContainer.innerHTML = `<p style="text-align:center">No hay resultados</p>`; return; }
  list.forEach(p => {
    const imgSrc = p.sprites?.other?.['official-artwork']?.front_default || p.sprites?.front_default || '';
    const article = document.createElement('article');
    article.className = 'card';
    article.dataset.id = p.id;

    const favBtn = document.createElement('button');
    favBtn.className = 'favorite-btn';
    favBtn.setAttribute('aria-label','Marcar favorito');
    const isFav = favorites.find(f => f.id === p.id);
    favBtn.innerHTML = isFav ? '❤️' : '🤍';
    if(isFav) favBtn.classList.add('active');
    favBtn.addEventListener('click', ()=> toggleFavorite(p));

    const img = document.createElement('img');
    img.alt = p.name;
    img.loading = 'lazy';
    img.src = imgSrc;

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `<h3>#${p.id} ${capitalize(p.name)}</h3>`;

    const typesWrap = document.createElement('div');
    typesWrap.className = 'types';
    (p.types || []).forEach(t=>{ const sp = document.createElement('span'); sp.className='type'; sp.textContent = capitalize(t.type.name); typesWrap.appendChild(sp); });

    const ab = document.createElement('p'); ab.className = 'abilities'; ab.textContent = `Abilities: ${(p.abilities||[]).map(a=>capitalize(a.ability.name)).join(', ')}`;

    article.appendChild(favBtn);
    article.appendChild(img);
    article.appendChild(meta);
    article.appendChild(typesWrap);
    article.appendChild(ab);

    cardsContainer.appendChild(article);
  });
}

/* Helpers */
function capitalize(s){ if(!s) return ''; return s.charAt(0).toUpperCase()+s.slice(1); }
function showStatus(msg, hide=false, isError=false){
  if(hide || !msg){ statusEl && (statusEl.hidden = true); statusEl && (statusEl.textContent=''); statusEl && (statusEl.style.color=''); return; }
  statusEl.hidden = false; statusEl.textContent = msg; statusEl.style.color = isError ? '#b91c1c' : '';
}
