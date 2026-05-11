document.addEventListener('DOMContentLoaded', () => {
    const blogListView = document.getElementById('blog-list-view');
    const singlePostView = document.getElementById('single-post-view');
    const blogGrid = document.getElementById('blog-grid');
    const backBtn = document.getElementById('back-to-blog');
    const postTitle = document.getElementById('post-title');
    const postDate = document.getElementById('post-date');
    const postAuthor = document.getElementById('post-author');
    const postContent = document.getElementById('post-content');
    let allPosts = [];

    function safeUrl(value) {
        if (!value) return '';
        try {
            const url = new URL(String(value).trim(), window.location.origin);
            if (!['http:', 'https:'].includes(url.protocol)) {
                return '';
            }
            return url.href;
        } catch {
            return '';
        }
    }

    function sanitizeHtml(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
        const allowedTags = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'UL', 'OL', 'LI', 'A', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'HR', 'IMG']);

        function sanitizeNode(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                return document.createTextNode(node.textContent || '');
            }

            if (node.nodeType !== Node.ELEMENT_NODE) {
                return document.createDocumentFragment();
            }

            const tagName = node.tagName.toUpperCase();
            if (!allowedTags.has(tagName)) {
                const fragment = document.createDocumentFragment();
                Array.from(node.childNodes).forEach(child => {
                    fragment.appendChild(sanitizeNode(child));
                });
                return fragment;
            }

            const clean = document.createElement(tagName.toLowerCase());

            if (tagName === 'A') {
                const href = safeUrl(node.getAttribute('href'));
                if (href) {
                    clean.setAttribute('href', href);
                    clean.setAttribute('rel', 'noopener noreferrer');
                    if (href.startsWith('http')) {
                        clean.setAttribute('target', '_blank');
                    }
                }
            }

            if (tagName === 'IMG') {
                const src = safeUrl(node.getAttribute('src'));
                if (!src) {
                    return document.createDocumentFragment();
                }
                clean.setAttribute('src', src);
                clean.setAttribute('alt', node.getAttribute('alt') || '');
                clean.setAttribute('loading', 'lazy');
            }

            Array.from(node.childNodes).forEach(child => {
                clean.appendChild(sanitizeNode(child));
            });

            return clean;
        }

        const wrapper = document.createElement('div');
        Array.from(doc.body.firstChild?.childNodes || []).forEach(child => {
            wrapper.appendChild(sanitizeNode(child));
        });
        return wrapper;
    }

    function renderList(posts) {
        blogGrid.innerHTML = '';
        if (posts.length === 0) {
            blogGrid.innerHTML = '<p style="text-align: center; width: 100%; grid-column: 1 / -1; color: var(--color-text-muted);">No posts found.</p>';
            return;
        }

        posts.forEach((post, index) => {
            const card = document.createElement('div');
            card.className = 'blog-card fade-in-up';
            card.style.animationDelay = (index * 0.1) + 's';

            if (post.image_url) {
                const safeImageUrl = safeUrl(post.image_url);
                if (safeImageUrl) {
                const img = document.createElement('img');
                img.src = safeImageUrl;
                img.alt = post.title || '';
                img.style.width = '100%';
                img.style.maxHeight = '200px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '8px';
                img.style.marginBottom = '1rem';
                card.appendChild(img);
                }
            }

            const date = document.createElement('span');
            date.className = 'blog-date';
            date.textContent = post.date
                ? new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                : '';

            const title = document.createElement('h3');
            title.textContent = post.title;

            const summary = document.createElement('p');
            summary.textContent = post.summary || 'Click to read more...';

            const readMore = document.createElement('span');
            readMore.className = 'read-more';
            readMore.textContent = 'Read Article \u2192';

            card.appendChild(date);
            card.appendChild(title);
            card.appendChild(summary);
            card.appendChild(readMore);

            card.addEventListener('click', () => {
                if (post.slug) {
                    window.location.href = '/blog/' + post.slug;
                } else {
                    renderSinglePost(index);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    window.location.hash = 'post-' + (post.id || index);
                }
            });

            blogGrid.appendChild(card);
        });
    }

    function renderSinglePost(index) {
        const post = allPosts[index];
        blogListView.style.display = 'none';
        singlePostView.style.display = 'block';

        postDate.textContent = post.date
            ? new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            : '';
        postTitle.textContent = post.title;
        postAuthor.textContent = post.author || 'Journey Coach';

        postContent.innerHTML = '';

        if (post.image_url) {
            const safeImageUrl = safeUrl(post.image_url);
            if (safeImageUrl) {
            const img = document.createElement('img');
            img.src = safeImageUrl;
            img.alt = post.title || '';
            img.style.cssText = 'width:100%;max-height:400px;object-fit:cover;border-radius:8px;margin-bottom:2rem;';
            postContent.appendChild(img);
            }
        }

        const bodyHtml = typeof post.body === 'string' && post.body.trim()
            ? post.body
            : '<p><em>Content could not be loaded.</em></p>';

        const bodyContainer = sanitizeHtml(bodyHtml);
        postContent.appendChild(bodyContainer);

        // Update OG meta tags for this post
        const postUrl = post.slug
            ? 'https://journeycoach.co/blog/' + post.slug
            : 'https://journeycoach.co/blog.html#post-' + (post.id || index);
        const setMeta = (prop, val) => {
            const el = document.querySelector(`meta[property="${prop}"]`);
            if (el) el.setAttribute('content', val);
        };
        setMeta('og:title', post.title + ' | Your Journey Coach');
        setMeta('og:description', post.summary || 'Insights on leadership and Enneagram from Your Journey Coach.');
        setMeta('og:image', post.image_url || 'https://journeycoach.co/assets/images/about_john.jpg');
        setMeta('og:url', postUrl);
        const canonical = document.getElementById('canonical-url');
        if (canonical) canonical.setAttribute('href', postUrl);

        // Wire up share buttons
        const shareUrl  = encodeURIComponent(postUrl);
        const shareText = encodeURIComponent(post.title + ' — Your Journey Coach');

        document.getElementById('share-linkedin').href =
            'https://www.linkedin.com/sharing/share-offsite/?url=' + shareUrl;

        document.getElementById('share-x').href =
            'https://twitter.com/intent/tweet?url=' + shareUrl + '&text=' + shareText;

        const copyBtn = document.getElementById('share-copy');
        copyBtn.classList.remove('copied');
        copyBtn.innerHTML = copyBtn.innerHTML.replace(/Copy Link|Copied!/, 'Copy Link');
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(decodeURIComponent(shareUrl)).then(() => {
                copyBtn.classList.add('copied');
                copyBtn.innerHTML = copyBtn.innerHTML.replace('Copy Link', 'Copied!');
                setTimeout(() => {
                    copyBtn.classList.remove('copied');
                    copyBtn.innerHTML = copyBtn.innerHTML.replace('Copied!', 'Copy Link');
                }, 2500);
            });
        };
    }

    backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        singlePostView.style.display = 'none';
        blogListView.style.display = 'block';
        window.location.hash = '';
    });

    async function fetchPosts() {
        try {
            const response = await fetch('/api/content?type=posts');
            if (!response.ok) throw new Error(`Posts request failed: ${response.status}`);

            const result = await response.json();
            allPosts = result.data || [];
            renderList(allPosts);

            const hash = window.location.hash;
            if (hash.startsWith('#post-')) {
                const id = parseInt(hash.replace('#post-', ''), 10);
                if (!isNaN(id)) {
                    // Try to find by stable post.id first, fall back to array index
                    let idx = allPosts.findIndex(p => p.id === id);
                    if (idx === -1 && allPosts[id]) idx = id;
                    if (idx !== -1) renderSinglePost(idx);
                }
            }
        } catch (error) {
            console.error('Error fetching blog posts:', error);
            blogGrid.innerHTML = '<p style="text-align: center; width: 100%;">Unable to load blog posts. Please try again later.</p>';
        }
    }

    fetchPosts();
});
