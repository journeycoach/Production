document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('testimonials-page-list');

    if (!container) return;

    fetch('/api/content?type=testimonials')
        .then(res => {
            if (!res.ok) throw new Error(`Testimonials request failed: ${res.status}`);
            return res.json();
        })
        .then(payload => {
            const testimonials = payload.data || [];
            
            if (testimonials.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--color-text-muted);">No testimonials available at this time.</p>';
                return;
            }

            container.innerHTML = '';
            
            testimonials.forEach(item => {
                const article = document.createElement('article');
                article.className = 'testimonial-item';
                article.id = 'testimonial-' + item.id;

                // Always show the longest version on this page
                const quoteText = item.long_quote?.trim() || item.full_quote?.trim() || item.quote || "";

                const quoteP = document.createElement('p');
                quoteP.className = 'testimonial-quote';
                quoteP.textContent = quoteText ? `\u201c${quoteText}\u201d` : "";
                
                const authorDiv = document.createElement('div');
                
                const authorH4 = document.createElement('div');
                authorH4.className = 'testimonial-author';
                authorH4.textContent = item.author;
                
                const metaParts = [item.client_role, item.industry].filter(Boolean);
                const metaDiv = document.createElement('div');
                metaDiv.className = 'testimonial-meta';
                metaDiv.textContent = metaParts.join(' | ');
                
                authorDiv.appendChild(authorH4);
                authorDiv.appendChild(metaDiv);
                
                article.appendChild(quoteP);
                article.appendChild(authorDiv);
                
                container.appendChild(article);
            });

            // Handle hash scrolling if a specific testimonial was linked
            if (window.location.hash) {
                const targetId = window.location.hash.substring(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    setTimeout(() => {
                        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 300);
                }
            }
        })
        .catch(error => {
            console.error('Error loading testimonials:', error);
            container.innerHTML = '<p style="text-align: center; color: var(--color-text-muted);">Error loading testimonials. Please try again later.</p>';
        });
});
