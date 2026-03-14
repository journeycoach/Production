document.addEventListener('DOMContentLoaded', () => {
    const blogListView = document.getElementById('blog-list-view');
    const singlePostView = document.getElementById('single-post-view');
    const blogGrid = document.getElementById('blog-grid');
    const backBtn = document.getElementById('back-to-blog');

    // DOM Elements for Single Post
    const postTitle = document.getElementById('post-title');
    const postDate = document.getElementById('post-date');
    const postAuthor = document.getElementById('post-author');
    const postContent = document.getElementById('post-content');

    let allPosts = [];

    // --- Utility: Render Simple Portable Text ---
    function renderPortableText(blocks) {
        if (!Array.isArray(blocks)) return '';
        
        let html = '';
        let inList = false;

        blocks.forEach((block, index) => {
            if (block._type !== 'block') return;
            
            // Extract text from children
            const text = (block.children || []).map(child => {
                let textContent = child.text || '';
                // Handle simple marks if needed (bold, italic)
                if (child.marks && child.marks.includes('strong')) textContent = `<strong>${textContent}</strong>`;
                if (child.marks && child.marks.includes('em')) textContent = `<em>${textContent}</em>`;
                return textContent;
            }).join('');

            // Handle lists
            const isListItem = block.listItem === 'bullet' || block.listItem === 'number';
            const isNextListItem = blocks[index + 1] && (blocks[index + 1].listItem === 'bullet' || blocks[index + 1].listItem === 'number');

            if (isListItem && !inList) {
                html += block.listItem === 'number' ? '<ol>' : '<ul>';
                inList = true;
            }

            if (isListItem) {
                html += `<li>${text}</li>`;
            } else {
                if (block.style === 'h2') html += `<h2>${text}</h2>`;
                else if (block.style === 'h3') html += `<h3>${text}</h3>`;
                else if (block.style === 'blockquote') html += `<blockquote>${text}</blockquote>`;
                else html += `<p>${text}</p>`;
            }

            if (inList && !isNextListItem) {
                html += block.listItem === 'number' ? '</ol>' : '</ul>';
                inList = false;
            }
        });

        return html;
    }

    // --- Utility: Convert a post title into a stable URL slug ---
    function toSlug(title) {
        return (title || '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-') // replace non-alphanumerics with hyphens
            .replace(/^-+|-+$/g, '');     // strip leading/trailing hyphens
    }

    // --- Utility: Find a post by slug ---
    function findPostBySlug(slug) {
        return allPosts.findIndex(p => toSlug(p.title) === slug);
    }

    // Check if we are loading a specific post from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const slugFromUrl = urlParams.get('post');

    // Fetch posts from Sanity
    sanityClient.fetch('*[_type == "post"]')
        .then(posts => {
            allPosts = posts || [];

            // Sort newest first
            allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

            if (slugFromUrl) {
                const index = findPostBySlug(slugFromUrl);
                if (index !== -1) {
                    renderSinglePost(index);
                } else {
                    renderList(); // Slug not found, fall back to list
                }
            } else {
                renderList();
            }
        })
        .catch(error => {
            console.error('Error fetching blog posts from Sanity:', error);
            if (blogGrid) {
                blogGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">No posts available yet. Check back soon!</p>';
            }
        });

    function renderList() {
        if (!blogListView || !singlePostView || !blogGrid) return;

        blogListView.style.display = 'block';
        singlePostView.style.display = 'none';

        // Remove URL parameter for a clean URL
        window.history.replaceState({}, document.title, window.location.pathname);

        blogGrid.innerHTML = '';

        if (allPosts.length === 0) {
            blogGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">No posts available yet. Check back soon!</p>';
            return;
        }

        allPosts.forEach((post, index) => {
            const card = document.createElement('div');
            card.className = 'blog-card fade-in-up';
            card.style.animationDelay = `${index * 0.1}s`;

            const dateObj = new Date(post.date);
            const formattedDate = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

            // Use textContent for user-provided text to prevent XSS
            const dateSpan = document.createElement('span');
            dateSpan.className = 'blog-date';
            dateSpan.textContent = formattedDate;

            const titleEl = document.createElement('h3');
            titleEl.textContent = post.title;

            const summaryEl = document.createElement('p');
            // Use summary if available, otherwise generate a plain-text excerpt from body
            const summaryText = post.summary || (post.body ? post.body.replace(/[#*`_\[\]]/g, '').substring(0, 120) + '...' : '');
            summaryEl.textContent = summaryText;

            const readMore = document.createElement('span');
            readMore.className = 'read-more';
            readMore.textContent = 'Read Article →';

            card.appendChild(dateSpan);
            card.appendChild(titleEl);
            card.appendChild(summaryEl);
            card.appendChild(readMore);

            card.addEventListener('click', () => navigateToPost(index));
            blogGrid.appendChild(card);
        });

        // Trigger reveal animations
        setTimeout(() => {
            document.querySelectorAll('.blog-card').forEach(el => el.classList.add('is-visible'));
        }, 100);
    }

    function renderSinglePost(index) {
        if (!blogListView || !singlePostView) return;

        const post = allPosts[index];
        blogListView.style.display = 'none';
        singlePostView.style.display = 'block';

        const dateObj = new Date(post.date);
        postDate.textContent = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        postTitle.textContent = post.title;
        postAuthor.textContent = post.author || 'Your Journey Coach';

        // Use custom renderer to parse the block content array into HTML
        if (Array.isArray(post.body)) {
            postContent.innerHTML = renderPortableText(post.body);
        } else if (typeof post.body === 'string') {
            postContent.textContent = post.body;
        } else {
            postContent.innerHTML = '<p><em>Content formatting error.</em></p>';
            console.warn('Body is not an array or string.', post.body);
        }

        // Update the URL to a human-readable slug
        const slug = toSlug(post.title);
        const newUrl = window.location.pathname + '?post=' + slug;
        window.history.pushState({ slug }, '', newUrl);

        backBtn.onclick = (e) => {
            e.preventDefault();
            renderList();
        };

        window.scrollTo({ top: 0, behavior: 'instant' });
    }

    function navigateToPost(index) {
        renderSinglePost(index);
    }

    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => {
        const params = new URLSearchParams(window.location.search);
        const slug = params.get('post');

        if (slug) {
            const index = findPostBySlug(slug);
            if (index !== -1) {
                renderSinglePost(index);
                return;
            }
        }
        renderList();
    });

});
