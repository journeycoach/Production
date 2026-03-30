document.addEventListener('DOMContentLoaded', () => {
    const toolsContainer = document.getElementById('tools-container');
    if (!toolsContainer) return;

    sanityClient.fetch('*[_type == "tool"]{..., "fileUrl": file.asset->url}')
        .then(resources => {
            if (!resources || resources.length === 0) {
                toolsContainer.innerHTML = '<p style="text-align: center; margin-top: 4rem;">No resources available yet. Check back soon!</p>';
                return;
            }

            // Filter out hidden resources before grouping
            const visibleResources = resources.filter(res => !res.isHidden);

            if (visibleResources.length === 0) {
                toolsContainer.innerHTML = '<p style="text-align: center; margin-top: 4rem;">No resources available yet. Check back soon!</p>';
                return;
            }

            // Group resources by category
            const categories = {};
            visibleResources.forEach(res => {
                const cat = res.category || 'General';
                if (!categories[cat]) {
                    categories[cat] = [];
                }
                categories[cat].push(res);
            });

            toolsContainer.innerHTML = ''; // Clear loading text

            // Render each category section
            for (const [categoryName, tools] of Object.entries(categories)) {

                const section = document.createElement('div');
                section.className = 'category-section fade-in-up';

                section.innerHTML = `
                    <h2 class="category-title">${categoryName}</h2>
                    <div class="tools-grid"></div>
                `;

                const grid = section.querySelector('.tools-grid');

                tools.forEach(tool => {
                    const isFile = tool.type === 'File Upload';
                    const linkUrl = isFile ? tool.fileUrl : tool.external_url;

                    // Do not render empty cards if URL is broken
                    if (!linkUrl) return;

                    const badgeClass = isFile ? 'pdf' : 'link';
                    const badgeText = isFile ? 'PDF Download' : 'External Link';

                    const actionText = isFile ? 'Download File' : 'Visit Site';
                    const actionIcon = isFile
                        ? `<svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`
                        : `<svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>`;

                    const card = document.createElement('a');
                    card.className = 'tool-card';
                    card.href = linkUrl;
                    card.target = "_blank"; // Always open tools in a new tab
                    card.rel = "noopener noreferrer";

                    card.innerHTML = `
                        <div>
                            <span class="tool-type-badge ${badgeClass}">${badgeText}</span>
                            <h3>${tool.title}</h3>
                            <p>${tool.description || ''}</p>
                        </div>
                        <span class="tool-action">
                            ${actionIcon}
                            ${actionText}
                        </span>
                    `;

                    grid.appendChild(card);
                });

                // Only append the section if it has valid cards
                if (grid.children.length > 0) {
                    toolsContainer.appendChild(section);
                }
            }

            // Trigger reveal animations
            setTimeout(() => {
                document.querySelectorAll('.category-section').forEach(el => el.classList.add('is-visible'));
            }, 100);

        })
        .catch(err => {
            console.error('Error fetching tools:', err);
            toolsContainer.innerHTML = '<p style="text-align: center; margin-top: 4rem;">Unable to load resources at this time.</p>';
        });
});
