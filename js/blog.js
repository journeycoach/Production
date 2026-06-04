document.addEventListener('DOMContentLoaded', () => {
    const blogListView = document.getElementById('blog-list-view');
    const blogGrid     = document.getElementById('blog-grid');
    if (!blogListView || !blogGrid) return;

    function safeUrl(value) {
        if (!value) return '';
        try {
            const url = new URL(String(value).trim(), window.location.origin);
            if (!['http:', 'https:'].includes(url.protocol)) return '';
            return url.href;
        } catch {
            return '';
        }
    }

    function renderList(posts) {
        blogGrid.innerHTML = '';
        if (posts.length === 0) {
            blogGrid.innerHTML = '<p style="text-align:center;width:100%;grid-column:1/-1;color:var(--color-text-muted);">No posts found.</p>';
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
                    img.style.cssText = 'width:100%;max-height:200px;object-fit:cover;border-radius:8px;margin-bottom:1rem;';
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
            readMore.textContent = 'Read Article →';

            card.appendChild(date);
            card.appendChild(title);
            card.appendChild(summary);
            card.appendChild(readMore);

            card.addEventListener('click', () => {
                if (post.slug) {
                    window.location.href = '/blog/' + post.slug;
                }
            });

            blogGrid.appendChild(card);
        });
    }

    async function fetchPosts() {
        try {
            const response = await fetch('/api/content?type=posts');
            if (!response.ok) throw new Error(`Posts request failed: ${response.status}`);
            const result = await response.json();
            renderList(result.data || []);
        } catch (error) {
            console.error('Error fetching blog posts:', error);
            blogGrid.innerHTML = '<p style="text-align:center;width:100%;">Unable to load blog posts. Please try again later.</p>';
        }
    }

    fetchPosts();
});
