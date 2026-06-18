// Main JavaScript for Executive Coach Website

document.addEventListener('DOMContentLoaded', () => {
    function getContactScrollOffset() {
        return window.innerWidth <= 768 ? 56 : 92;
    }

    function scrollToHashTarget(hash, behavior = 'smooth') {
        if (!hash || hash === '#') return;

        const targetElement = document.querySelector(hash);
        if (!targetElement) return;

        if (hash === '#contact') {
            const navbar = document.querySelector('.navbar');
            const navbarHeight = navbar ? navbar.offsetHeight : 0;
            const top = targetElement.getBoundingClientRect().top + window.scrollY - navbarHeight + getContactScrollOffset();

            window.scrollTo({
                top: Math.max(top, 0),
                behavior
            });
            return;
        }

        targetElement.scrollIntoView({
            behavior,
            block: 'start'
        });
    }

    // 1. Page Loader Logic
    const loader = document.querySelector('.loader-wrapper');
    if (loader) {
        loader.classList.add('hidden');
        document.body.style.overflow = 'auto';
        if (window.location.hash) {
            setTimeout(() => scrollToHashTarget(window.location.hash, 'auto'), 50);
        }
    } else if (window.location.hash) {
        setTimeout(() => scrollToHashTarget(window.location.hash, 'auto'), 50);
    }

    // 2. Smooth Scrolling for Anchor Links
    document.querySelectorAll('a[href*="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (!href || href === '#') return;

            const url = new URL(href, window.location.href);
            const isSamePage = url.origin === window.location.origin &&
                url.pathname === window.location.pathname;

            if (!isSamePage || !url.hash) return;

            e.preventDefault();
            history.replaceState(null, '', url.hash);
            scrollToHashTarget(url.hash);
        });
    });

    // 3. Advanced Scroll Reveal (Intersection Observer)
    const revealElements = document.querySelectorAll('.reveal-text, .reveal-img, .fade-in-up, .fade-in-scroll');

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target); // Only animate once
            }
        });
    }, {
        root: null,
        threshold: 0.15, // Trigger when 15% visible
        rootMargin: "0px 0px -50px 0px"
    });

    revealElements.forEach(el => revealObserver.observe(el));

    // 4. Navbar Scroll Effect + mobile hide-on-scroll-down
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        let lastScrollY = window.scrollY;

        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            const onMobile = window.innerWidth <= 768;

            // Scrolled state — triggers background on all screen sizes
            if (currentScrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }

            // Hide on scroll-down / show on scroll-up — mobile only
            if (onMobile) {
                const scrollingDown = currentScrollY > lastScrollY + 4; // small deadzone
                const scrollingUp  = currentScrollY < lastScrollY - 4;
                const menuOpen     = navbar.classList.contains('nav-open');

                if (scrollingDown && currentScrollY > 60 && !menuOpen) {
                    navbar.classList.add('nav-hidden');
                } else if (scrollingUp) {
                    navbar.classList.remove('nav-hidden');
                }

                // Always show at very top
                if (currentScrollY <= 10) {
                    navbar.classList.remove('nav-hidden');
                }
            } else {
                navbar.classList.remove('nav-hidden');
            }

            lastScrollY = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
    }

    // 4b. Hamburger Menu Toggle
    const hamburger = document.getElementById('hamburger');
    if (hamburger && navbar) {
        hamburger.addEventListener('click', () => {
            navbar.classList.toggle('nav-open');
        });

        // Close menu when a nav link is clicked
        // Use delegation on the parent since nav.js adds links dynamically
        const navLinksList = document.getElementById('nav-links-list');
        if (navLinksList) {
            navLinksList.addEventListener('click', (e) => {
                if (e.target.closest('a')) {
                    navbar.classList.remove('nav-open');
                }
            });
        }

        // Close menu when clicking outside the navbar
        document.addEventListener('click', (e) => {
            if (!navbar.contains(e.target)) {
                navbar.classList.remove('nav-open');
            }
        });
    }


    // 5. Dynamic Testimonials
    const testimonialsContainer = document.getElementById('testimonials-container');
    if (testimonialsContainer) {
        fetch('/api/content?type=testimonials')
            .then(res => {
                if (!res.ok) throw new Error(`Testimonials request failed: ${res.status}`);
                return res.json();
            })
            .then(payload => {
                const testimonials = payload.data || [];
                if (testimonials.length > 0) {
                    renderMarqueeTestimonials(testimonials, testimonialsContainer);
                }
            })
            .catch(error => console.error('Error loading testimonials:', error));
    }

    function renderMarqueeTestimonials(testimonials, container) {
        container.innerHTML = '';
        if (!testimonials.length) return;

        const createCard = (item, ariaHidden) => {
            const card = document.createElement('article');
            card.className = 'testimonial-card';
            if (ariaHidden) card.setAttribute('aria-hidden', 'true');

            // The API returns `quote` (already the short version) and `full_quote` (the original).
            let displayQuote = item.quote || "";
            let fullQuote = item.full_quote || item.quote || "";
            let hasLongQuote = (item.long_quote && item.long_quote.trim().length > 0);

            // There is a longer version if: a long_quote exists, or the full quote is longer than what we're showing
            let hasMore = hasLongQuote || (fullQuote.length > displayQuote.length);

            // Truncate the display quote if it's still long (no short_quote was set)
            if (displayQuote.length > 120) {
                displayQuote = displayQuote.substr(0, 120);
                displayQuote = displayQuote.substr(0, Math.min(displayQuote.length, displayQuote.lastIndexOf(" "))) + "...";
                hasMore = true;
            }

            const quoteEl = document.createElement('p');
            quoteEl.className = 'quote';

            if (hasMore) {
                // Make the quote text itself a link
                const quoteLink = document.createElement('a');
                quoteLink.href = '/testimonials.html#testimonial-' + item.id;
                quoteLink.style.color = 'inherit';
                quoteLink.style.textDecoration = 'none';
                quoteLink.style.borderBottom = '1px solid var(--color-accent-gold-dim)';
                quoteLink.style.transition = 'border-color 0.3s ease';
                quoteLink.textContent = '\u201c' + displayQuote + '\u201d';
                quoteLink.addEventListener('mouseenter', () => quoteLink.style.borderBottomColor = 'var(--color-accent-gold)');
                quoteLink.addEventListener('mouseleave', () => quoteLink.style.borderBottomColor = 'var(--color-accent-gold-dim)');
                quoteEl.appendChild(quoteLink);

                const readMore = document.createElement('span');
                readMore.className = 'read-more-link';
                readMore.textContent = ' Read more \u2192';
                readMore.style.color = 'var(--color-accent-gold)';
                readMore.style.fontSize = '0.85em';
                readMore.style.whiteSpace = 'nowrap';
                quoteEl.appendChild(readMore);
            } else {
                quoteEl.textContent = '\u201c' + displayQuote + '\u201d';
            }

            const authorDiv = document.createElement('div');
            authorDiv.className = 'author';
            const authorH4 = document.createElement('h4');
            authorH4.textContent = item.author;
            authorDiv.appendChild(authorH4);
            const detailParts = [item.client_role, item.industry].filter(Boolean);
            if (detailParts.length > 0) {
                const detailSpan = document.createElement('span');
                detailSpan.textContent = detailParts.join(' | ');
                authorDiv.appendChild(detailSpan);
            }
            card.appendChild(quoteEl);
            card.appendChild(authorDiv);
            return card;
        };

        // Interactive carousel wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'carousel-wrapper';

        const prevBtn = document.createElement('button');
        prevBtn.className = 'carousel-btn prev';
        prevBtn.innerHTML = '&#10094;';
        prevBtn.setAttribute('aria-label', 'Previous testimonial');

        const nextBtn = document.createElement('button');
        nextBtn.className = 'carousel-btn next';
        nextBtn.innerHTML = '&#10095;';
        nextBtn.setAttribute('aria-label', 'Next testimonial');

        const slider = document.createElement('div');
        slider.className = 'marquee-slider';
        slider.setAttribute('aria-label', 'Client testimonials');

        const track = document.createElement('div');
        track.className = 'marquee-track';

        // Original set only - no need for duplicates in snap-scroll
        testimonials.forEach(item => track.appendChild(createCard(item, false)));

        slider.appendChild(track);
        wrapper.appendChild(prevBtn);
        wrapper.appendChild(slider);
        wrapper.appendChild(nextBtn);

        container.appendChild(wrapper);

        // Navigation logic
        nextBtn.addEventListener('click', () => {
            const cardWidth = track.firstElementChild.offsetWidth + 24; // gap is 1.5rem ~ 24px
            slider.scrollBy({ left: cardWidth, behavior: 'smooth' });
        });

        prevBtn.addEventListener('click', () => {
            const cardWidth = track.firstElementChild.offsetWidth + 24;
            slider.scrollBy({ left: -cardWidth, behavior: 'smooth' });
        });
    }


});
