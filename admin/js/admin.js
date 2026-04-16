// Shared admin utilities

const API_BASE = '/api/admin';
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
  'settings.html': 'Site Settings',
  'sections.html': 'Page Sections',
  'posts.html': 'Blog Posts',
  'post-edit.html': 'Post Editor',
  'testimonials.html': 'Testimonials',
  'tools.html': 'Tools & Resources',
  'navigation.html': 'Navigation',
  'bookmarks.html': 'Bookmarks',
  'contacts.html': 'Contact Submissions'
};

// Check auth on page load — also validates token expiration
function requireAdminAuth() {
  const token = localStorage.getItem('admin_token');
  if (!token) {
    window.location.href = '/admin/index.html';
    return null;
  }
  // Verify token hasn't expired (payload is base64-encoded expiry timestamp)
  try {
    const [payload] = token.split('.');
    if (payload) {
      const expires = parseInt(atob(payload), 10);
      if (Date.now() >= expires) {
        localStorage.removeItem('admin_token');
        window.location.href = '/admin/index.html';
        return null;
      }
    }
  } catch {
    // If token can't be parsed, let the API reject it
  }
  return token;
}

// HTML-escape a string (used across all admin pages)
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Authenticated fetch wrapper
function adminFetch(path, options = {}) {
  const token = localStorage.getItem('admin_token');
  return fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {})
    }
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

  saveRecentAdminItems(recent.slice(0, 6));
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
  const token = localStorage.getItem('admin_token');
  if (!token) return null;

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
function logout() {
  localStorage.removeItem('admin_token');
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
  if (typeof Sortable === 'undefined') return;
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

applyAdminTheme(getCachedAdminTheme());
if (localStorage.getItem('admin_token')) {
  loadAdminTheme();
  trackRecentAdminPage();
}
