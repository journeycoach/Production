import { sql } from './_db.js';
import { runMigrations } from './_migrate.js';

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Strip dangerous tags and attributes from admin-entered post HTML.
// Uses a denylist so legitimate formatting (h2, blockquote, img, etc.) is preserved.
function sanitizePostHtml(html) {
  if (!html) return '';
  let sanitized = html;
  let prev;
  do {
    prev = sanitized;
    sanitized = sanitized
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<iframe[\s\S]*?\/?>(\s*<\/iframe>)?/gi, '')
      .replace(/<object[\s\S]*?\/?>(\s*<\/object>)?/gi, '')
      .replace(/<embed[^>]*\/?>/gi, '')
      .replace(/<form[\s\S]*?<\/form>/gi, '')
      .replace(/\s+on\w+\s*=\s*(['"])[^'"]*\1/gi, '')
      .replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '')
      .replace(/(href|src|action)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, '$1=$2#$2');
  } while (sanitized !== prev);
  return sanitized;
}

// Keys from site_settings that are safe to expose to the public frontend.
// Email templates, admin theme, campaign flags, and operational toggles are intentionally excluded.
const PUBLIC_SETTINGS_KEYS = [
  'color_accent',
  'color_green',
  'color_bg',
  'color_text',
  'font_heading',
  'font_body',
  'cta_primary_text',
  'cta_primary_url',
  'cta_secondary_text',
  'cta_secondary_url',
  'lead_magnet_enabled',
  'tools_category_order',
  'recognition_title',
  'recognition_organization',
  'recognition_year',
  'recognition_url',
  'recognition_full_text',
  'recognition_show_homepage',
  'recognition_show_about',
  'recognition_show_footer',
  'recognition_show_trust_bar',
  'show_verified_impact',
  'testimonial_speed',
];

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const type = req.query?.type ?? new URL(req.url, 'http://localhost').searchParams.get('type');

  try {
    await runMigrations();
    switch (type) {
      case 'testimonials': {
        const rows = await sql`
          SELECT id,
            COALESCE(NULLIF(short_quote, ''), quote) as quote,
            quote as full_quote,
            long_quote,
            author,
            client_role,
            industry,
            display_location,
            is_featured
          FROM testimonials
          WHERE COALESCE(display_location, 'homepage') IN ('homepage', 'all')
          ORDER BY is_featured DESC, sort_order ASC, created_at ASC
        `;
        return res.status(200).json({ data: rows });
      }

      case 'navigation': {
        const rows = await sql`SELECT * FROM navigation LIMIT 1`;
        return res.status(200).json({ data: rows[0] || null });
      }

      case 'tools': {
        const rows = await sql`
          SELECT id, title, category, description, type,
            file_url as "fileUrl",
            external_url as "externalUrl",
            image_url as "imageUrl"
          FROM tools
          WHERE is_hidden IS NOT TRUE
          ORDER BY sort_order ASC, created_at ASC
        `;
        return res.status(200).json({ data: rows });
      }

      case 'posts': {
        const rows = await sql`
          SELECT id, title, post_date as date, author, image_url, summary, body, slug
          FROM posts
          ORDER BY post_date DESC
        `;
        return res.status(200).json({ data: rows });
      }

      case 'post': {
        const slug = req.query?.slug ?? new URL(req.url, 'http://localhost').searchParams.get('slug');
        if (!slug) return res.status(400).json({ error: 'slug is required' });
        const [rows, ctaRows] = await Promise.all([
          sql`SELECT id, title, post_date, author, image_url, summary, body, slug
              FROM posts WHERE slug = ${slug} LIMIT 1`,
          sql`SELECT is_visible FROM page_sections
              WHERE page = 'blog' AND section_key = 'assessment-cta' LIMIT 1`,
        ]);
        if (!rows.length) {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          return res.status(404).send(render404Html());
        }
        const showAssessmentCta = ctaRows.length === 0 || ctaRows[0].is_visible !== false;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(renderPostHtml(rows[0], showAssessmentCta));
      }

      case 'sitemap': {
        const posts = await sql`
          SELECT slug, post_date FROM posts
          WHERE slug IS NOT NULL AND slug != ''
          ORDER BY post_date DESC
        `;
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        return res.status(200).send(buildSitemapXml(posts));
      }

      case 'settings': {
        const rows = await sql`
          SELECT setting_key, setting_value FROM site_settings
          WHERE setting_key = ANY(${PUBLIC_SETTINGS_KEYS})
        `;
        const data = Object.fromEntries(rows.map(r => [r.setting_key, r.setting_value]));
        return res.status(200).json({ data });
      }

      case 'sections': {
        const page = req.query?.page ?? new URL(req.url, 'http://localhost').searchParams.get('page');
        const rows = page
          ? await sql`SELECT id, page, section_key, label, is_visible, sort_order, status
              FROM page_sections WHERE page = ${page} ORDER BY sort_order ASC`
          : await sql`SELECT id, page, section_key, label, is_visible, sort_order, status
              FROM page_sections ORDER BY page ASC, sort_order ASC`;
        return res.status(200).json({ data: rows });
      }

      case 'bookmarks': {
        const rows = await sql`
          SELECT b.id, b.title, b.url, b.description, b.sort_order,
            bc.id as category_id, bc.title as category_title
          FROM bookmarks b
          LEFT JOIN bookmark_categories bc ON b.category_id = bc.id
          ORDER BY bc.sort_order ASC, b.sort_order ASC
        `;
        return res.status(200).json({ data: rows });
      }

      default:
        return res.status(400).json({ error: 'Unknown content type' });
    }
  } catch (err) {
    console.error(`content[${type}] GET error:`, err);
    return res.status(500).json({ error: 'Database error' });
  }
}

function renderPostHtml(post, showAssessmentCta = true) {
  const { title, summary, body, author, post_date, image_url, slug } = post;
  const esc = escHtml;
  const postUrl = `https://journeycoach.co/blog/${slug}`;
  const ogImage = image_url || 'https://journeycoach.co/assets/images/about_john.jpg';
  const formattedDate = post_date
    ? new Date(post_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: summary || '',
    image: ogImage,
    datePublished: post_date ? new Date(post_date).toISOString() : '',
    author: { '@type': 'Person', name: author || 'John Paine', url: 'https://journeycoach.co' },
    publisher: { '@type': 'Organization', name: 'Your Journey Coach', url: 'https://journeycoach.co' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
    url: postUrl,
  });
  const heroHtml = image_url
    ? `<img src="${esc(image_url)}" alt="${esc(title)}" style="width:100%;max-height:420px;object-fit:cover;border-radius:8px;margin-bottom:2.5rem;" loading="eager">`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-ZM9X6CN8YK"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-ZM9X6CN8YK');</script>
  <title>${esc(title)} | Your Journey Coach</title>
  <meta name="description" content="${esc(summary || 'Insights on leadership from Your Journey Coach.')}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${esc(title)} | Your Journey Coach">
  <meta property="og:description" content="${esc(summary || '')}">
  <meta property="og:image" content="${esc(ogImage)}">
  <meta property="og:url" content="${esc(postUrl)}">
  <meta property="article:published_time" content="${esc(post_date ? new Date(post_date).toISOString() : '')}">
  <meta property="article:author" content="${esc(author || 'John Paine')}">
  <link rel="canonical" href="${esc(postUrl)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/variables.css?v=11">
  <link rel="stylesheet" href="/css/style.css?v=11">
  <link rel="stylesheet" href="/css/responsive.css?v=11">
  <link rel="icon" type="image/x-icon" href="/assets/icons/favicon.ico">
  <link rel="icon" type="image/png" href="/assets/images/favicon.png">
  <link rel="apple-touch-icon" href="/assets/images/favicon.png">
  <script type="application/ld+json">${schema}</script>
  <style>
    .back-link{color:var(--color-accent-gold);text-transform:uppercase;letter-spacing:1px;font-size:.9rem;font-weight:500;display:inline-flex;align-items:center;gap:.5rem;margin-bottom:2rem;text-decoration:none;transition:color .3s}
    .back-link:hover{color:var(--color-text-primary)}
    .post-header{margin-bottom:3rem;border-bottom:1px solid rgba(255,255,255,.05);padding-bottom:2rem}
    .post-title{font-size:clamp(2rem,5vw,3rem);margin-bottom:1rem;line-height:1.2}
    .post-meta{color:var(--color-text-muted);font-size:.9rem;letter-spacing:.5px}
    .post-content{font-size:1.15rem;line-height:1.8;color:var(--color-text-secondary)}
    .post-content h2,.post-content h3{color:var(--color-text-primary);margin-top:2.5rem;margin-bottom:1rem}
    .post-content p{margin-bottom:1.5rem}
    .post-content ul,.post-content ol{margin-bottom:1.5rem;padding-left:2rem}
    .post-content li{margin-bottom:.5rem}
    .post-content blockquote{border-left:4px solid var(--color-accent-gold);padding-left:1.5rem;margin:0 0 1.5rem;font-style:italic;color:var(--color-text-primary)}
    .post-content img{max-width:100%;border-radius:4px;margin:2rem 0}
    .post-content a{color:var(--color-accent-gold)}
    .post-article{max-width:1140px;margin:0 auto;padding:8rem 1.5rem 4rem}
    .post-layout{display:grid;grid-template-columns:1fr 300px;gap:3.5rem;align-items:start}
    .post-sidebar-inner{position:sticky;top:100px}
    .sidebar-cta{background:color-mix(in srgb,var(--color-accent-gold) 8%,var(--color-bg-secondary));border:1px solid rgba(199,169,107,.18);border-top:3px solid var(--color-accent-gold);border-radius:0 0 8px 8px;padding:1.75rem}
    .sidebar-cta-eyebrow{font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:var(--color-accent-gold);font-weight:600;margin-bottom:.6rem}
    .sidebar-cta h3{font-family:var(--font-heading);font-size:1.2rem;color:var(--color-text-primary);margin-bottom:.75rem;line-height:1.3}
    .sidebar-cta p{color:var(--color-text-secondary);font-size:.88rem;line-height:1.65;margin-bottom:1.25rem}
    .sidebar-cta .btn-primary{display:block;text-align:center;font-size:.85rem;padding:.65rem 1rem}
    @media(max-width:860px){.post-layout{grid-template-columns:1fr}.post-sidebar{order:-1}.post-sidebar-inner{position:static}}
    .post-share{display:flex;align-items:center;gap:.75rem;margin-top:3rem;padding-top:2rem;border-top:1px solid rgba(255,255,255,.07);flex-wrap:wrap}
    .post-share-label{font-size:.8rem;text-transform:uppercase;letter-spacing:.1em;color:var(--color-text-muted);margin-right:.25rem}
    .share-btn{display:inline-flex;align-items:center;gap:.45rem;padding:.45rem 1rem;border-radius:4px;font-size:.82rem;font-weight:500;text-decoration:none;border:1px solid transparent;cursor:pointer;background:none;transition:opacity .2s,background .2s}
    .share-btn svg{width:15px;height:15px;flex-shrink:0}
    .share-btn-linkedin{background:#0A66C2;color:#fff}
    .share-btn-linkedin:hover{opacity:.88}
    .share-btn-x{background:#000;color:#fff;border-color:rgba(255,255,255,.15)}
    .share-btn-x:hover{opacity:.82}
    .share-btn-copy{background:rgba(255,255,255,.06);color:var(--color-text-secondary);border-color:rgba(255,255,255,.1)}
    .share-btn-copy:hover{background:rgba(255,255,255,.1);color:var(--color-text-primary)}
    .share-btn-copy.copied{color:#6fcf97;border-color:rgba(111,207,151,.3)}
  </style>
</head>
<body>
  <div class="loader-wrapper"><div class="breathing-circle"></div></div>
  <nav class="navbar">
    <div class="container">
      <a href="/" class="logo" id="nav-logo">
        <img src="/assets/images/logo.webp" alt="Your Journey Coach" class="logo-img">
        <span class="logo-brand">Your Journey Coach</span>
      </a>
      <ul class="nav-links" id="nav-links-list">
        <li><a href="/#welcome">About</a></li>
        <li><a href="/enneagram.html">Enneagram</a></li>
        <li><a href="/blog.html">Blog</a></li>
        <li><a href="/tools.html">Resources</a></li>
        <li><a href="/#contact" class="btn-primary" data-site-cta="smart">Let's Talk</a></li>
      </ul>
      <div class="hamburger" id="hamburger" aria-label="Open navigation menu" role="button">
        <span></span><span></span><span></span>
      </div>
    </div>
  </nav>
  <main>
    <article class="post-article">
      <a href="/blog.html" class="back-link">
        <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        Back to all posts
      </a>
      <div class="post-layout">
        <!-- Main content -->
        <div class="post-main">
          ${heroHtml}
          <header class="post-header">
            <h1 class="post-title">${esc(title)}</h1>
            <div class="post-meta">${formattedDate ? esc(formattedDate) + ' &nbsp;|&nbsp; ' : ''}By ${esc(author || 'John Paine')}</div>
          </header>
          <div class="post-content">${sanitizePostHtml(body) || '<p><em>Content could not be loaded.</em></p>'}</div>
          <div class="post-share">
            <span class="post-share-label">Share</span>
            <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}" target="_blank" rel="noopener noreferrer" class="share-btn share-btn-linkedin">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46C23.21 24 24 23.23 24 22.28V1.72C24 .77 23.21 0 22.23 0z"/></svg>
              LinkedIn
            </a>
            <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent((title || '') + ' \u2014 Your Journey Coach')}" target="_blank" rel="noopener noreferrer" class="share-btn share-btn-x">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              X
            </a>
            <button id="share-copy" class="share-btn share-btn-copy" data-url="${esc(postUrl)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy Link
            </button>
          </div>
        </div><!-- /.post-main -->

        ${showAssessmentCta ? `<!-- Sidebar -->
        <aside class="post-sidebar">
          <div class="post-sidebar-inner">
            <div class="sidebar-cta">
              <p class="sidebar-cta-eyebrow">Free · 2 Minutes</p>
              <h3>Discover your leadership blind spot</h3>
              <p>The Hidden Ceiling Assessment reveals the specific pattern that limits leaders in your center — and what to do about it.</p>
              <a href="/Hidden-Ceiling.html" class="btn-primary">Take the Free Assessment</a>
            </div>
          </div>
        </aside>` : ''}
      </div><!-- /.post-layout -->
    </article>
  </main>
  <footer style="padding:3rem 0;background:var(--color-bg-primary);border-top:1px solid rgba(255,255,255,.05);margin-top:4rem;">
    <div class="container" style="display:flex;flex-direction:column;align-items:center;gap:2rem;">
      <a href="/"><img src="/assets/images/logo.webp" alt="Your Journey Coach" class="footer-logo"></a>
      <nav id="footer-nav-links" style="display:flex;gap:2rem;flex-wrap:wrap;justify-content:center;"></nav>
      <p style="color:var(--color-text-muted);font-size:.9rem;">&copy; <span id="footer-year"></span> Your Journey Coach. All Rights Reserved.</p>
      <div style="display:flex;gap:1.5rem;">
        <a href="/privacy.html" style="color:var(--color-text-muted);font-size:.8rem;text-decoration:none;" onmouseover="this.style.color='var(--color-accent-gold)'" onmouseout="this.style.color='var(--color-text-muted)'">Privacy Policy</a>
        <a href="/admin" style="color:var(--color-text-muted);font-size:.8rem;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;" onmouseover="this.style.color='var(--color-accent-gold)'" onmouseout="this.style.color='var(--color-text-muted)'">Admin Login</a>
      </div>
    </div>
  </footer>
  <script src="/js/nav.js" defer></script>
  <script src="/js/main.js?v=6" defer></script>
  <script src="/js/site-styles.js?v=2" defer></script>
  <script>
    document.getElementById('footer-year').textContent = new Date().getFullYear();
    document.getElementById('share-copy').addEventListener('click', function() {
      var btn = this;
      navigator.clipboard.writeText(btn.dataset.url).then(function() {
        btn.classList.add('copied');
        btn.querySelector('svg').insertAdjacentHTML('afterend', 'Copied!');
        btn.querySelector('svg').nextSibling.textContent = 'Copied!';
        setTimeout(function() {
          btn.classList.remove('copied');
          btn.childNodes.forEach(function(n){ if(n.nodeType===3) n.textContent=''; });
          btn.insertAdjacentHTML('beforeend', 'Copy Link');
        }, 2500);
      }).catch(function() {});
    });
  </script>
</body>
</html>`;
}

function render404Html() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Post Not Found | Your Journey Coach</title>
  <link rel="stylesheet" href="/css/variables.css?v=11">
  <link rel="stylesheet" href="/css/style.css?v=11">
  <link rel="stylesheet" href="/css/responsive.css?v=11">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
</head>
<body>
  <div class="loader-wrapper"><div class="breathing-circle"></div></div>
  <nav class="navbar">
    <div class="container">
      <a href="/" class="logo" id="nav-logo">
        <img src="/assets/images/logo.webp" alt="Your Journey Coach" class="logo-img">
        <span class="logo-brand">Your Journey Coach</span>
      </a>
      <ul class="nav-links" id="nav-links-list">
        <li><a href="/#welcome">About</a></li>
        <li><a href="/enneagram.html">Enneagram</a></li>
        <li><a href="/blog.html">Blog</a></li>
        <li><a href="/tools.html">Resources</a></li>
        <li><a href="/#contact" class="btn-primary" data-site-cta="smart">Let's Talk</a></li>
      </ul>
      <div class="hamburger" id="hamburger" role="button"><span></span><span></span><span></span></div>
    </div>
  </nav>
  <main style="max-width:600px;margin:0 auto;padding:10rem 1.5rem;text-align:center;">
    <p style="color:var(--color-accent-gold);text-transform:uppercase;letter-spacing:.12em;font-size:.8rem;">404</p>
    <h1 style="font-size:2.5rem;margin:1rem 0;">Post not found</h1>
    <p style="color:var(--color-text-secondary);margin-bottom:2rem;">This post may have moved or been removed.</p>
    <a href="/blog.html" style="color:var(--color-accent-gold);text-decoration:none;font-size:.9rem;text-transform:uppercase;letter-spacing:.08em;">&larr; Back to all posts</a>
  </main>
  <script src="/js/nav.js" defer></script>
  <script src="/js/main.js?v=6" defer></script>
</body>
</html>`;
}

function buildSitemapXml(posts) {
  const today = new Date().toISOString().split('T')[0];
  const postEntries = posts.map(p => `
  <url>
    <loc>https://journeycoach.co/blog/${p.slug}</loc>
    <lastmod>${p.post_date ? new Date(p.post_date).toISOString().split('T')[0] : today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://journeycoach.co/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://journeycoach.co/blog.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://journeycoach.co/tools.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://journeycoach.co/enneagram.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://journeycoach.co/Hidden-Ceiling.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://journeycoach.co/privacy.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>${postEntries}
</urlset>`;
}
