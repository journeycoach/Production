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

    // Utility: Get Sanity image URL from asset _ref
    // ref format: image-{id}-{dimensions}-{format}
    // e.g. image-e4aaa8f4ff0d91664ad3e5a613ef358a546f17ea-1200x1200-png
    function sanityImageUrl(ref) {
        if (!ref) return '';
        const withoutPrefix = ref.replace(/^image-/, '');
        const lastDash = withoutPrefix.lastIndexOf('-');
        const format = withoutPrefix.substring(lastDash + 1);
        const withoutFormat = withoutPrefix.substring(0, lastDash);
        return 'https://cdn.sanity.io/images/9ksnhows/production/' + withoutFormat + '.' + format;
    }

    // Utility: Render Portable Text (full-featured)
    function renderPortableText(blocks) {
        if (!Array.isArray(blocks)) return '';

        // Build a lookup map for mark definitions (annotations like links, colors)
        const markDefs = {};
        blocks.forEach(block => {
            if (block._type === 'block' && Array.isArray(block.markDefs)) {
                block.markDefs.forEach(def => { markDefs[def._key] = def; });
            }
        });

        let html = '';
        let inList = false;
        let listType = '';

        blocks.forEach((block, index) => {
            // ── Non-block types ───────────────────────────────────────────────
            if (block._type === 'image') {
                // Close any open list first
                if (inList) { html += listType === 'bullet' ? '</ul>' : '</ol>'; inList = false; listType = ''; }
                if (block.asset && block.asset._ref) {
                    const imgUrl = sanityImageUrl(block.asset._ref);
                    const alt = block.alt || '';
                    const caption = block.caption ? `<figcaption style="text-align:center;font-size:0.875rem;color:var(--color-text-muted);margin-top:0.5rem;">${block.caption}</figcaption>` : '';
                    html += `<figure style="margin:2rem 0;">\n  <img src="${imgUrl}" alt="${alt}" style="max-width:100%;border-radius:8px;">\n  ${caption}\n</figure>`;
                }
                return;
            }

            if (block._type === 'codeBlock') {
                if (inList) { html += listType === 'bullet' ? '</ul>' : '</ol>'; inList = false; listType = ''; }
                const lang = block.language || 'text';
                const code = (block.code || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                html += `<div class="code-block-wrapper" style="margin:1.5rem 0;">\n  <div class="code-block-header" style="background:#1a1a1a;border-radius:8px 8px 0 0;padding:0.4rem 1rem;font-size:0.75rem;color:#888;letter-spacing:0.5px;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,0.08);">${lang}</div>\n  <pre style="background:#111;border-radius:0 0 8px 8px;padding:1.25rem 1.5rem;overflow-x:auto;margin:0;"><code style="font-family:'Fira Code','Courier New',monospace;font-size:0.9rem;color:#e0e0e0;line-height:1.6;">${code}</code></pre>\n</div>`;
                return;
            }

            if (block._type !== 'block') return;

            // ── Render inline children ────────────────────────────────────────
            const text = (block.children || []).map(child => {
                let txt = (child.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                if (!Array.isArray(child.marks) || child.marks.length === 0) return txt;

                // Apply decorator marks (order matters — code first to avoid double-escaping)
                if (child.marks.includes('code')) txt = `<code style="font-family:'Fira Code','Courier New',monospace;font-size:0.88em;background:rgba(255,255,255,0.07);padding:0.15em 0.4em;border-radius:4px;">${txt}</code>`;
                if (child.marks.includes('strong')) txt = `<strong>${txt}</strong>`;
                if (child.marks.includes('em')) txt = `<em>${txt}</em>`;
                if (child.marks.includes('underline')) txt = `<span style="text-decoration:underline;">${txt}</span>`;
                if (child.marks.includes('strike-through')) txt = `<span style="text-decoration:line-through;">${txt}</span>`;

                // Apply annotation marks
                child.marks.forEach(markKey => {
                    const def = markDefs[markKey];
                    if (!def) return;
                    if (def._type === 'link') {
                        const target = def.blank ? ' target="_blank" rel="noopener noreferrer"' : '';
                        txt = `<a href="${def.href || '#'}"${target} style="color:var(--color-accent-gold);text-decoration:underline;">${txt}</a>`;
                    }
                    if (def._type === 'highlight' && def.color) {
                        txt = `<span style="color:${def.color};">${txt}</span>`;
                    }
                });

                return txt;
            }).join('');

            // ── Block-level rendering ─────────────────────────────────────────
            // Handle list items
            if (block.listItem) {
                const newListType = block.listItem === 'bullet' ? 'bullet' : 'number';
                if (!inList || listType !== newListType) {
                    if (inList) html += listType === 'bullet' ? '</ul>' : '</ol>';
                    html += newListType === 'bullet' ? '<ul>' : '<ol>';
                    inList = true;
                    listType = newListType;
                }
                html += `<li>${text}</li>`;
                const nextBlock = blocks[index + 1];
                if (!nextBlock || !nextBlock.listItem) {
                    html += listType === 'bullet' ? '</ul>' : '</ol>';
                    inList = false;
                    listType = '';
                }
                return;
            }

            // Not a list item — close any open list
            if (inList) { html += listType === 'bullet' ? '</ul>' : '</ol>'; inList = false; listType = ''; }

            if (block.style === 'h1') html += `<h1>${text}</h1>`;
            else if (block.style === 'h2') html += `<h2>${text}</h2>`;
            else if (block.style === 'h3') html += `<h3>${text}</h3>`;
            else if (block.style === 'h4') html += `<h4>${text}</h4>`;
            else if (block.style === 'blockquote') html += `<blockquote>${text}</blockquote>`;
            else html += `<p>${text}</p>`;
        });

        // Close any unclosed lists
        if (inList) html += listType === 'bullet' ? '</ul>' : '</ol>';

        return html;
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

            // Add image if available
            if (post.image && post.image.asset && post.image.asset._ref) {
                const img = document.createElement('img');
                img.src = sanityImageUrl(post.image.asset._ref);
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
            date.textContent = new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

            const title = document.createElement('h3');
            title.textContent = post.title;

            const summary = document.createElement('p');
            summary.textContent = post.summary || 'Click to read more...';

            const readMore = document.createElement('span');
            readMore.className = 'read-more';
            readMore.textContent = 'Read More ->';

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

        postDate.textContent = new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        postTitle.textContent = post.title;
        postAuthor.textContent = post.author || 'Your Journey Coach';

        let imageHtml = '';
        if (post.image && post.image.asset && post.image.asset._ref) {
            const imageUrl = sanityImageUrl(post.image.asset._ref);
            imageHtml = '<img src="' + imageUrl + '" alt="' + (post.title || '') + '" style="width:100%; max-height:400px; object-fit:cover; border-radius:8px; margin-bottom:2rem;">';
        }

        let bodyHtml = '';
        if (Array.isArray(post.body)) {
            bodyHtml = renderPortableText(post.body);
        } else if (typeof post.body === 'string') {
            bodyHtml = '<p>' + post.body + '</p>';
        } else {
            bodyHtml = '<p><em>Content could not be loaded.</em></p>';
        }

        postContent.innerHTML = imageHtml + bodyHtml;
    }

    backBtn.addEventListener('click', () => {
        singlePostView.style.display = 'none';
        blogListView.style.display = 'block';
        window.location.hash = '';
    });

    async function fetchPosts() {
        try {
            const query = encodeURIComponent('*[_type == "post"] | order(date desc) { title, date, author, summary, body, image }');
            const url = 'https://9ksnhows.api.sanity.io/v2021-10-21/data/query/production?query=' + query;
            const response = await fetch(url);
            const result = await response.json();
            if (result.result) {
                allPosts = result.result;
                renderList(allPosts);
                const hash = window.location.hash;
                if (hash.startsWith('#post-')) {
                    const idx = parseInt(hash.replace('#post-', ''));
                    if (!isNaN(idx) && allPosts[idx]) renderSinglePost(idx);
                }
            } else {
                throw new Error('No posts found');
            }
        } catch (error) {
            console.error('Error fetching blog posts:', error);
            blogGrid.innerHTML = '<p style="text-align: center; width: 100%;">Unable to load blog posts. Please try again later.</p>';
        }
    }

    fetchPosts();
});
