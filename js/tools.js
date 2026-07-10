document.addEventListener('DOMContentLoaded', async () => {
    const toolsContainer = document.getElementById('tools-container');
    if (!toolsContainer) return;

    const HIDDEN_CEILING_IMAGE_URL = '/assets/images/hidden-ceiling-guide.webp';

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

    function isHiddenCeilingTool(tool) {
        const values = [
            tool.title,
            tool.category,
            tool.description,
            tool.fileUrl,
            tool.file_url,
            tool.externalUrl,
            tool.external_url,
        ].filter(Boolean).join(' ').toLowerCase();

        return values.includes('hidden ceiling')
            || values.includes('hidden-ceiling')
            || values.includes('leadership center assessment');
    }

    function getToolImageUrl(tool) {
        if (isHiddenCeilingTool(tool)) return HIDDEN_CEILING_IMAGE_URL;
        return tool.imageUrl || tool.image_url || null;
    }

    function configureToolImage(image, tool) {
        image.className = 'tool-card-image';
        image.src = safeUrl(getToolImageUrl(tool));
        image.alt = tool.title || '';
        image.decoding = 'async';

        if (isHiddenCeilingTool(tool)) {
            image.loading = 'eager';
            image.fetchPriority = 'high';
        } else {
            image.loading = 'lazy';
        }
    }

    function renderEmptyState(message) {
        toolsContainer.textContent = '';
        const paragraph = document.createElement('p');
        paragraph.style.textAlign = 'center';
        paragraph.style.marginTop = '4rem';
        paragraph.textContent = message;
        toolsContainer.appendChild(paragraph);
    }

    function normalizeTool(tool) {
        return {
            ...tool,
            fileUrl: tool.fileUrl || tool.file_url || null,
            externalUrl: tool.externalUrl || tool.external_url || null,
            imageUrl: getToolImageUrl(tool),
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
            renderEmptyState('No resources available yet. Check back soon!');
            return;
        }

        const visibleResources = resources.filter(resource => !resource.isHidden);

        if (visibleResources.length === 0) {
            renderEmptyState('No resources available yet. Check back soon!');
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

            const title = document.createElement('h2');
            title.className = 'category-title';
            title.textContent = categoryName;

            const grid = document.createElement('div');
            grid.className = 'tools-grid';

            section.appendChild(title);
            section.appendChild(grid);

            tools.forEach(tool => {
                const isFile = tool.type === 'file' || tool.type === 'File Upload';
                const linkUrl = safeUrl(isFile ? tool.fileUrl : tool.externalUrl);
                const isBooksCategory = (categoryName || '').toLowerCase() === 'books';
                const imageUrl = safeUrl(tool.imageUrl);
                const renderImageOnly = isBooksCategory && !!imageUrl;
                const renderTextAboveImage = !renderImageOnly && !!imageUrl;

                if (!linkUrl) return;

                const card = document.createElement('a');
                card.className = `tool-card${renderImageOnly ? ' image-only' : ''}${renderTextAboveImage ? ' link-with-image' : ''}`;
                card.href = linkUrl;
                card.target = '_blank';
                card.rel = 'noopener noreferrer';
                card.setAttribute('aria-label', tool.title);
                card.title = tool.title;

                if (renderImageOnly) {
                    const image = document.createElement('img');
                    configureToolImage(image, tool);
                    card.appendChild(image);
                } else {
                    const body = document.createElement('div');
                    body.className = 'tool-card-body';

                    const heading = document.createElement('h3');
                    heading.textContent = tool.title || '';
                    body.appendChild(heading);

                    if (tool.description) {
                        const description = document.createElement('p');
                        description.textContent = tool.description;
                        body.appendChild(description);
                    }

                    let image = null;
                    if (imageUrl) {
                        image = document.createElement('img');
                        configureToolImage(image, tool);
                    }

                    if (renderTextAboveImage) {
                        card.appendChild(body);
                        if (image) card.appendChild(image);
                    } else {
                        if (image) card.appendChild(image);
                        card.appendChild(body);
                    }
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
        renderEmptyState('Unable to load resources at this time.');
    }
});
