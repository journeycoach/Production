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
                    renderRotatingTestimonials(testimonials, testimonialsContainer);
                }
            })
            .catch(error => console.error('Error loading testimonials:', error));
    }

    function renderRotatingTestimonials(testimonials, container) {
        container.innerHTML = '';
        if (!testimonials.length) return;

        const createCard = (item) => {
            const card = document.createElement('article');
            card.className = 'testimonial-card';

            const quoteEl = document.createElement('p');
            quoteEl.className = 'quote';
            quoteEl.textContent = '\u201c' + item.quote + '\u201d';

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

        const rotator = document.createElement('div');
        rotator.className = 'testimonials-rotator';
        rotator.setAttribute('aria-roledescription', 'carousel');

        const track = document.createElement('div');
        track.className = 'testimonials-track';

        const cards = [], dots = [];
        testimonials.forEach((item, i) => {
            const card = createCard(item);
            if (i === 0) card.classList.add('is-active');
            track.appendChild(card);
            cards.push(card);
        });

        let current = 0;
        let timer = null;

        function goTo(n) {
            cards[current].classList.remove('is-active');
            if (dots[current]) dots[current].classList.remove('is-active');
            current = ((n % testimonials.length) + testimonials.length) % testimonials.length;
            cards[current].classList.add('is-active');
            if (dots[current]) dots[current].classList.add('is-active');
            track.style.height = cards[current].offsetHeight + 'px';
        }

        function startTimer() {
            clearInterval(timer);
            timer = setInterval(() => goTo(current + 1), 6000);
        }

        if (testimonials.length > 1) {
            const prevBtn = document.createElement('button');
            prevBtn.className = 'rotator-arrow prev';
            prevBtn.innerHTML = '&#8249;';
            prevBtn.setAttribute('aria-label', 'Previous testimonial');
            prevBtn.addEventListener('click', () => { goTo(current - 1); startTimer(); });

            const nextBtn = document.createElement('button');
            nextBtn.className = 'rotator-arrow next';
            nextBtn.innerHTML = '&#8250;';
            nextBtn.setAttribute('aria-label', 'Next testimonial');
            nextBtn.addEventListener('click', () => { goTo(current + 1); startTimer(); });

            const dotsEl = document.createElement('div');
            dotsEl.className = 'rotator-dots';
            testimonials.forEach((_, i) => {
                const dot = document.createElement('button');
                dot.className = 'rotator-dot' + (i === 0 ? ' is-active' : '');
                dot.setAttribute('aria-label', 'Go to testimonial ' + (i + 1));
                dot.addEventListener('click', () => { goTo(i); startTimer(); });
                dotsEl.appendChild(dot);
                dots.push(dot);
            });

            rotator.appendChild(prevBtn);
            rotator.appendChild(track);
            rotator.appendChild(nextBtn);
            rotator.appendChild(dotsEl);
        } else {
            rotator.appendChild(track);
        }

        rotator.addEventListener('mouseenter', () => clearInterval(timer));
        rotator.addEventListener('mouseleave', () => startTimer());

        container.appendChild(rotator);

        // Set initial track height after layout
        requestAnimationFrame(() => requestAnimationFrame(() => {
            track.style.height = cards[0].offsetHeight + 'px';
            if (testimonials.length > 1) startTimer();
        }));
    }


});
