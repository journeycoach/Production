document.addEventListener('DOMContentLoaded', async () => {
    const toolsContainer = document.getElementById('tools-container');
    if (!toolsContainer) return;

    function normalizeTool(tool) {
        return {
            ...tool,
            fileUrl: tool.fileUrl || tool.file_url || null,
            externalUrl: tool.externalUrl || tool.external_url || null,
            imageUrl: tool.imageUrl || tool.image_url || null,
            isHidden: Boolean(tool.isHidden ?? tool.is_hidden),
        };
    }

    try {
        const [toolsRes, settingsRes] = await Promise.all([
            fetch('/api/content?type=tools'),
            fetch('/api/content?type=settings')
        ]);

        if (!toolsRes.ok) {
            throw new Error(`Tools request failed: ${toolsRes.status}`);
        }

        const result = await toolsRes.json();
        const settingsPayload = settingsRes.ok ? await settingsRes.json() : { data: {} };
        const resources = (result.data || []).map(normalizeTool);
        let categoryOrder = [];

        try {
            categoryOrder = JSON.parse(settingsPayload.data?.tools_category_order || '[]');
            if (!Array.isArray(categoryOrder)) categoryOrder = [];
        } catch {
            categoryOrder = [];
        }

        if (resources.length === 0) {
            toolsContainer.innerHTML = '<p style="text-align: center; margin-top: 4rem;">No resources available yet. Check back soon!</p>';
            return;
        }

        const visibleResources = resources.filter(resource => !resource.isHidden);

        if (visibleResources.length === 0) {
            toolsContainer.innerHTML = '<p style="text-align: center; margin-top: 4rem;">No resources available yet. Check back soon!</p>';
            return;
        }

        const categories = {};
        visibleResources.forEach(resource => {
            const category = resource.category || 'General';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(resource);
        });

        const orderedCategoryNames = [
            ...categoryOrder.filter(category => categories[category]),
            ...Object.keys(categories).filter(category => !categoryOrder.includes(category))
        ];

        toolsContainer.innerHTML = '';

        for (const categoryName of orderedCategoryNames) {
            const tools = categories[categoryName];
            const section = document.createElement('div');
            section.className = 'category-section fade-in-up';
            if ((categoryName || '').toLowerCase() === 'books') {
                section.classList.add('books-section');
            }

            section.innerHTML = `
                <h2 class="category-title">${categoryName}</h2>
                <div class="tools-grid"></div>
            `;

            const grid = section.querySelector('.tools-grid');

            tools.forEach(tool => {
                const isFile = tool.type === 'file' || tool.type === 'File Upload';
                const linkUrl = isFile ? tool.fileUrl : tool.externalUrl;
                const isBooksCategory = (categoryName || '').toLowerCase() === 'books';
                const renderImageOnly = isBooksCategory && !!tool.imageUrl;
                const renderTextAboveImage = !renderImageOnly && !!tool.imageUrl;

                if (!linkUrl) return;

                const card = document.createElement('a');
                card.className = `tool-card${renderImageOnly ? ' image-only' : ''}${renderTextAboveImage ? ' link-with-image' : ''}`;
                card.href = linkUrl;
                card.target = '_blank';
                card.rel = 'noopener noreferrer';
                card.setAttribute('aria-label', tool.title);
                card.title = tool.title;

                if (renderImageOnly) {
                    card.innerHTML = `
                        <img class="tool-card-image" src="${tool.imageUrl}" alt="${tool.title}" loading="lazy">
                    `;
                } else {
                    const imageMarkup = tool.imageUrl
                        ? `<img class="tool-card-image" src="${tool.imageUrl}" alt="${tool.title}" loading="lazy">`
                        : '';
                    const badgeMarkup = isFile
                        ? '<span class="tool-type-badge pdf">Download Resource</span>'
                        : '';
                    const bodyMarkup = `
                        <div class="tool-card-body">
                            ${badgeMarkup}
                            <h3>${tool.title}</h3>
                            ${tool.description ? `<p>${tool.description}</p>` : ''}
                        </div>
                    `;

                    card.innerHTML = renderTextAboveImage
                        ? `${bodyMarkup}${imageMarkup}`
                        : `${imageMarkup}${bodyMarkup}`;
                }

                grid.appendChild(card);
            });

            if (grid.children.length > 0) {
                toolsContainer.appendChild(section);
            }
        }

        setTimeout(() => {
            document.querySelectorAll('.category-section').forEach(el => el.classList.add('is-visible'));
        }, 100);
    } catch (err) {
        console.error('Error fetching tools:', err);
        toolsContainer.innerHTML = '<p style="text-align: center; margin-top: 4rem;">Unable to load resources at this time.</p>';
    }
});
