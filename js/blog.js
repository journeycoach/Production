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
                const img = document.createElement('img');
                img.src = post.image_url;
                img.alt = post.title || '';
                img.style.width = '100%';
                img.style.maxHeight = '200px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '8px';
                img.style.marginBottom = '1rem';
                card.appendChild(img);
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
                renderSinglePost(index);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                window.location.hash = 'post-' + index;
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
            const img = document.createElement('img');
            img.src = post.image_url;
            img.alt = post.title || '';
            img.style.cssText = 'width:100%;max-height:400px;object-fit:cover;border-radius:8px;margin-bottom:2rem;';
            postContent.appendChild(img);
        }

        const bodyHtml = typeof post.body === 'string' && post.body.trim()
            ? post.body
            : '<p><em>Content could not be loaded.</em></p>';

        const bodyContainer = document.createElement('div');
        bodyContainer.innerHTML = bodyHtml;
        postContent.appendChild(bodyContainer);
    }

    backBtn.addEventListener('click', () => {
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
                const idx = parseInt(hash.replace('#post-', ''), 10);
                if (!isNaN(idx) && allPosts[idx]) renderSinglePost(idx);
            }
        } catch (error) {
            console.error('Error fetching blog posts:', error);
            blogGrid.innerHTML = '<p style="text-align: center; width: 100%;">Unable to load blog posts. Please try again later.</p>';
        }
    }

    fetchPosts();
});
