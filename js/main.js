// Main JavaScript for Executive Coach Website

document.addEventListener('DOMContentLoaded', () => {
    console.log('Executive Coach Site Loaded');

    // 1. Page Loader Logic
    const loader = document.querySelector('.loader-wrapper');
    if (loader) {
        // Force a minimum display time of 1.5s
        setTimeout(() => {
            loader.classList.add('hidden');
            // Allow body scroll after loader vanishes
            document.body.style.overflow = 'auto';
        }, 1500);
    }

    // 2. Smooth Scrolling for Anchor Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
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

    // 4. Navbar Scroll Effect
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        };
        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Check on initial load
    }


    // 5. Dynamic Testimonials Rotation
    const testimonialsContainer = document.getElementById('testimonials-container');
    if (testimonialsContainer) {
        // Query all testimonial documents from Sanity
        sanityClient.fetch('*[_type == "testimonial"]')
            .then(testimonials => {
                if (testimonials && testimonials.length > 0) {
                    renderRotatingTestimonials(testimonials, testimonialsContainer);
                }
            })
            .catch(error => console.error('Error loading testimonials from Sanity:', error));
    }

    function renderRotatingTestimonials(testimonials, container) {
        container.innerHTML = '';
        container.style.display = 'block'; // Override grid for a single rotator

        const card = document.createElement('div');
        card.className = 'testimonial-card rotator';
        card.style.maxWidth = '800px';
        card.style.margin = '0 auto';
        card.style.textAlign = 'center';
        // Safari safe: start completely hidden, rely strictly on CSS animations
        card.style.opacity = '0';

        container.appendChild(card);

        let currentIndex = 0;

        function showTestimonial(index) {
            const item = testimonials[index];

            // 1. Trigger Fade Out (if it's already visible)
            card.style.animation = 'rotatorFadeOut 0.6s ease-in forwards';

            // 2. Wait for fade out to finish, then swap content and Fade In
            setTimeout(() => {
                card.innerHTML = `
                    <p class="quote" style="font-size: 1.5rem;">"${item.quote}"</p>
                    <div class="author" style="justify-content: center; margin-top: 1.5rem;">
                        <h4>${item.author}</h4>
                    </div>
                `;

                // Clear animation state and force reflow (fixes Safari caching render states)
                card.style.animation = 'none';
                void card.offsetWidth;

                // Trigger Fade In
                card.style.animation = 'rotatorFadeIn 0.6s ease-out forwards';
            }, 600); // Wait 600ms for fade out
        }

        // Brief delay before first show
        setTimeout(() => showTestimonial(currentIndex), 50);

        if (testimonials.length > 1) {
            let rotateInterval = null;
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        // Start rotation
                        if (!rotateInterval) {
                            rotateInterval = setInterval(() => {
                                currentIndex = (currentIndex + 1) % testimonials.length;
                                showTestimonial(currentIndex);
                            }, 6000); // Rotate every 6 seconds
                        }
                    } else {
                        // Pause rotation
                        if (rotateInterval) {
                            clearInterval(rotateInterval);
                            rotateInterval = null;
                        }
                    }
                });
            }, { threshold: 0.1 }); // Trigger when at least 10% visible

            observer.observe(container);
        }
    }


});
