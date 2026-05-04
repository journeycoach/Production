// Shared admin utilities

const API_BASE = '/api/admin';
const ADMIN_SESSION_MARKER_KEY = 'admin_session_active';
const LEGACY_ADMIN_TOKEN_KEY = 'admin_token';
const ADMIN_THEME_CACHE_KEY = 'admin_theme_settings';
const ADMIN_RECENT_ITEMS_KEY = 'admin_recent_items';
const ADMIN_THEME_SETTING_KEYS = [
  'admin_color_accent',
  'admin_color_bg',
  'admin_color_card',
  'admin_color_text',
  'admin_color_muted',
  'admin_color_border',
  'admin_success',
  'admin_success_bg',
  'admin_notice_bg',
  'admin_notice_text',
  'admin_notice_accent',
  'admin_font_heading',
  'admin_font_body',
  'admin_dashboard_columns'
];

const ADMIN_PAGE_LABELS = {
  'dashboard.html': 'Dashboard',
  'site.html': 'Site Console',
  'posts.html': 'Blog Posts',
  'post-edit.html': 'Post Editor',
  'lead-dashboard.html': 'Lead Dashboard',
  'testimonials.html': 'Testimonials',
  'tools.html': 'Tools & Resources',
  'bookmarks.html': 'Bookmarks',
  'contacts.html': 'Contact Submissions'
};

// Check auth on page load — also validates token expiration
function requireAdminAuth() {
  const marker = localStorage.getItem(ADMIN_SESSION_MARKER_KEY);
  if (!marker && !consumeLegacyAdminToken()) {
    window.location.href = '/admin/index.html';
    return null;
  }
  return marker || localStorage.getItem(ADMIN_SESSION_MARKER_KEY);
}

function hasAdminSessionMarker() {
  return localStorage.getItem(ADMIN_SESSION_MARKER_KEY) === '1';
}

function setAdminSessionMarker(active) {
  if (active) {
    localStorage.setItem(ADMIN_SESSION_MARKER_KEY, '1');
  } else {
    localStorage.removeItem(ADMIN_SESSION_MARKER_KEY);
  }
}

function consumeLegacyAdminToken() {
  const token = localStorage.getItem(LEGACY_ADMIN_TOKEN_KEY);
  if (!token) return false;

  try {
    const [payload] = token.split('.');
    if (!payload) throw new Error('Invalid token');

    const expires = parseInt(atob(payload), 10);
    if (!Number.isFinite(expires) || Date.now() >= expires) {
      throw new Error('Expired token');
    }

    setAdminSessionMarker(true);
    localStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY);
    return true;
  } catch {
    localStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY);
    return false;
  }
}

// HTML-escape a string (used across all admin pages)
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Authenticated fetch wrapper
function adminFetch(path, options = {}) {
  return fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  }).then((res) => {
    if (res.status === 401) {
      setAdminSessionMarker(false);
      localStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY);
      if (!window.location.pathname.endsWith('/admin/index.html')) {
        window.location.href = '/admin/index.html';
      }
    }
    return res;
  });
}

function loadGoogleFont(name, idPrefix = 'admin-gf') {
  if (!name) return;
  const id = `${idPrefix}-${name.replace(/\s/g, '-')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

function normalizeDashboardColumns(value) {
  const parsed = parseInt(value, 10);
  return [2, 3, 4].includes(parsed) ? String(parsed) : '3';
}

function cacheAdminTheme(settings = {}) {
  const theme = Object.fromEntries(
    ADMIN_THEME_SETTING_KEYS
      .filter(key => settings[key] !== undefined && settings[key] !== null && settings[key] !== '')
      .map(key => [key, settings[key]])
  );

  if (Object.keys(theme).length === 0) {
    localStorage.removeItem(ADMIN_THEME_CACHE_KEY);
    return;
  }

  localStorage.setItem(ADMIN_THEME_CACHE_KEY, JSON.stringify(theme));
}

function getCachedAdminTheme() {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_THEME_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function getRecentAdminItems() {
  try {
    const items = JSON.parse(localStorage.getItem(ADMIN_RECENT_ITEMS_KEY) || '[]');
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function saveRecentAdminItems(items) {
  localStorage.setItem(ADMIN_RECENT_ITEMS_KEY, JSON.stringify(items));
}

function trackRecentAdminPage() {
  const pathname = window.location.pathname.split('/').pop() || 'dashboard.html';
  if (pathname === 'index.html' || pathname === 'dashboard.html') return;

  const label = ADMIN_PAGE_LABELS[pathname];
  if (!label) return;

  const recent = getRecentAdminItems().filter(item => item.path !== pathname);
  recent.unshift({
    path: pathname,
    label,
    timestamp: Date.now()
  });

  saveRecentAdminItems(recent.slice(0, 3));
}

function applyAdminTheme(settings = {}) {
  const root = document.documentElement;

  const colorMap = {
    admin_color_accent: '--admin-accent',
    admin_color_bg: '--admin-bg',
    admin_color_card: '--admin-card-bg',
    admin_color_text: '--admin-text',
    admin_color_muted: '--admin-muted',
    admin_color_border: '--admin-border',
    admin_success: '--admin-success',
    admin_success_bg: '--admin-success-bg',
    admin_notice_bg: '--admin-notice-bg',
    admin_notice_text: '--admin-notice-text',
    admin_notice_accent: '--admin-notice-accent'
  };

  [
    '--admin-accent',
    '--admin-bg',
    '--admin-card-bg',
    '--admin-card-bg-soft',
    '--admin-text',
    '--admin-muted',
    '--admin-border',
    '--admin-success',
    '--admin-success-bg',
    '--admin-notice-bg',
    '--admin-notice-text',
    '--admin-notice-accent',
    '--admin-accent-soft',
    '--admin-accent-faint',
    '--admin-heading-font',
    '--admin-body-font',
    '--admin-dashboard-columns'
  ].forEach(cssVar => root.style.removeProperty(cssVar));

  Object.entries(colorMap).forEach(([key, cssVar]) => {
    if (settings[key]) {
      root.style.setProperty(cssVar, settings[key]);
    }
  });

  if (settings.admin_color_card) {
    root.style.setProperty('--admin-card-bg-soft', settings.admin_color_card);
  }

  if (settings.admin_color_accent) {
    root.style.setProperty('--admin-accent-soft', `${settings.admin_color_accent}26`);
    root.style.setProperty('--admin-accent-faint', `${settings.admin_color_accent}10`);
  }

  if (settings.admin_font_heading) {
    if (settings.admin_font_heading === 'Default Serif') {
      root.style.setProperty('--admin-heading-font', 'Georgia, "Times New Roman", serif');
    } else {
      loadGoogleFont(settings.admin_font_heading);
      root.style.setProperty('--admin-heading-font', `'${settings.admin_font_heading}', serif`);
    }
  }

  if (settings.admin_font_body) {
    if (settings.admin_font_body === 'System UI') {
      root.style.setProperty('--admin-body-font', 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
    } else {
      loadGoogleFont(settings.admin_font_body);
      root.style.setProperty('--admin-body-font', `'${settings.admin_font_body}', sans-serif`);
    }
  }

  if (settings.admin_dashboard_columns) {
    root.style.setProperty(
      '--admin-dashboard-columns',
      normalizeDashboardColumns(settings.admin_dashboard_columns)
    );
  }
}

async function loadAdminTheme() {
  if (!hasAdminSessionMarker() && !consumeLegacyAdminToken()) return null;

  try {
    const res = await adminFetch('/api/admin/settings');
    if (!res.ok) return null;
    const data = await res.json();
    const settings = data.data || {};
    applyAdminTheme(settings);
    cacheAdminTheme(settings);
    return settings;
  } catch {
    return null;
  }
}

// Show a flash message
function showFlash(message, type = 'success') {
  const existing = document.querySelector('.flash');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = `flash flash-${type}`;
  el.textContent = message;
  document.querySelector('.admin-main')?.prepend(el);
  setTimeout(() => el.remove(), 4000);
}

// Logout
async function logout() {
  setAdminSessionMarker(false);
  localStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY);

  try {
    await fetch('/api/admin/auth?action=logout', {
      method: 'POST',
      credentials: 'same-origin'
    });
  } catch {
    // Ignore network errors during logout.
  }

  window.location.href = '/admin/index.html';
}

// Format date for display
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Make a tab bar drag-sortable. Requires SortableJS to be loaded on the page.
 * Persists and restores tab order per page via localStorage.
 *
 * @param {string} tabBarSelector  CSS selector for the flex container holding the tab buttons
 * @param {string} storageKey      localStorage key used to persist the order
 * @param {string} [tabAttr='tab'] data-* attribute on each button that holds its value
 */
function makeTabsSortable(tabBarSelector, storageKey, tabAttr = 'tab') {
  const tabBar = document.querySelector(tabBarSelector);
  if (!tabBar) return;

  // Restore saved order on load
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (Array.isArray(saved) && saved.length) {
      saved.forEach(val => {
        const btn = tabBar.querySelector(`[data-${tabAttr}="${CSS.escape(val)}"]`);
        if (btn) tabBar.appendChild(btn);
      });
    }
  } catch {}

  if (typeof Sortable === 'undefined') return;

  // Disable drag-sort on touch/mobile to avoid scroll conflicts
  if (window.matchMedia('(pointer: coarse), (max-width: 768px)').matches) return;

  // Activate drag-to-sort
  Sortable.create(tabBar, {
    animation: 150,
    ghostClass:  'tab-sort-ghost',
    chosenClass: 'tab-sort-chosen',
    onEnd() {
      const order = Array.from(tabBar.querySelectorAll(`[data-${tabAttr}]`))
        .map(b => b.dataset[tabAttr]);
      localStorage.setItem(storageKey, JSON.stringify(order));
    }
  });
}

function initAdminNavSortable() {
  const nav = document.querySelector('.admin-nav');
  if (!nav) return;
  
  // Assign data-nav attributes based on href
  const links = nav.querySelectorAll('a');
  links.forEach(link => {
    const href = link.getAttribute('href') || '';
    const key = href.split('?')[0].replace('.html', '').replace('/', '');
    link.setAttribute('data-nav', key);
  });
  
  // Make sortable
  makeTabsSortable('.admin-nav', 'admin_nav_order', 'nav');
}

applyAdminTheme(getCachedAdminTheme());
if (hasAdminSessionMarker() || consumeLegacyAdminToken()) {
  loadAdminTheme();
  trackRecentAdminPage();
}

initAdminNavSortable();

// ── Global Admin Search ──────────────────────────────────────────────────
function initGlobalSearch() {
  const input = document.getElementById('globalSearchInput');
  const resultsBox = document.getElementById('globalSearchResults');
  if (!input || !resultsBox) return;

  const baseIndex = [
    { title: 'Dashboard', desc: 'Overview and recent activity', url: 'dashboard.html' },
    { title: 'Blog', desc: 'Manage blog posts and articles', url: 'posts.html' },
    { title: 'New Post', desc: 'Write a new blog post', url: 'post-edit.html' },
    { title: 'Testimonials', desc: 'Manage client testimonials', url: 'testimonials.html' },
    { title: 'Tools & Resources', desc: 'Manage tools, guides, and resources', url: 'tools.html' },
    { title: 'Bookmarks', desc: 'Manage saved bookmarks', url: 'bookmarks.html' },
    { title: 'Leads Dashboard', desc: 'View assessment leads and data', url: 'lead-dashboard.html' },
    { title: 'Site Console', desc: 'Manage page sections, navigation, and brand', url: 'site.html' },
    { title: 'Contacts', desc: 'View contact form submissions', url: 'contacts.html' },
    { title: 'Subscribers & Campaigns', desc: 'Manage email subscribers and campaigns', url: 'subscribers.html' },
    { title: 'Drip Campaigns', desc: 'Edit hidden ceiling drip emails', url: 'subscribers.html?tab=drip-campaigns' }
  ];

  let dynamicIndex = null;
  let searchIndex = [...baseIndex];
  let selectedIndex = -1;
  let items = [];

  async function loadDynamicData() {
    if (dynamicIndex) return;
    dynamicIndex = [];
    try {
      const [postsRes, toolsRes] = await Promise.all([
        adminFetch('/api/admin/posts').catch(()=>null),
        adminFetch('/api/admin/tools').catch(()=>null)
      ]);
      if (postsRes && postsRes.ok) {
        const data = await postsRes.json();
        (data.data || []).forEach(p => {
          dynamicIndex.push({ title: p.title, desc: 'Blog Post', url: `post-edit.html?id=${p.id}` });
        });
      }
      if (toolsRes && toolsRes.ok) {
        const data = await toolsRes.json();
        (data.data || []).forEach(t => {
          dynamicIndex.push({ title: t.title, desc: 'Tool / Resource', url: `tools.html?id=${t.id}` });
        });
      }
      searchIndex = [...baseIndex, ...dynamicIndex];
      // re-trigger search if input has value
      if (input.value.trim()) handleSearch();
    } catch (e) {
      console.warn('Failed to load dynamic search data', e);
    }
  }

  function renderResults(query) {
    if (!query) {
      resultsBox.classList.remove('active');
      return;
    }
    const q = query.toLowerCase();
    const matches = searchIndex.filter(item => 
      item.title.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q)
    ).slice(0, 10); // show top 10

    if (matches.length === 0) {
      resultsBox.innerHTML = '<div class="search-no-results">No matches found for "' + escHtml(query) + '"</div>';
    } else {
      resultsBox.innerHTML = matches.map((m, i) => `
        <a href="${m.url}" class="search-result-item" data-index="${i}">
          <span class="search-result-title">${escHtml(m.title)}</span>
          <span class="search-result-desc">${escHtml(m.desc)}</span>
        </a>
      `).join('');
    }
    
    resultsBox.classList.add('active');
    items = Array.from(resultsBox.querySelectorAll('.search-result-item'));
    selectedIndex = -1;
  }

  function handleSearch() {
    renderResults(input.value.trim());
  }

  input.addEventListener('focus', () => {
    loadDynamicData();
    if (input.value.trim()) resultsBox.classList.add('active');
  });

  input.addEventListener('input', handleSearch);

  input.addEventListener('keydown', (e) => {
    if (!resultsBox.classList.contains('active') || items.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % items.length;
      updateSelection();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + items.length) % items.length;
      updateSelection();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < items.length) {
        items[selectedIndex].click();
      } else if (items.length > 0) {
        items[0].click();
      }
    }
  });

  function updateSelection() {
    items.forEach((el, i) => {
      el.classList.toggle('selected', i === selectedIndex);
      if (i === selectedIndex) el.scrollIntoView({ block: 'nearest' });
    });
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.global-search')) {
      resultsBox.classList.remove('active');
    }
  });
}

initGlobalSearch();
