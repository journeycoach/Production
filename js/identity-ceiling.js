(function () {
    let ASSESSMENT_STEPS = [];
    let RESULT_PROFILES = {};
    let configLoaded = false;
    
    // Default fallback steps (in case API fails)
    const DEFAULT_STEPS = [
        {
            id: 'intro',
            type: 'intro',
            eyebrow: 'Start Here',
            title: 'Uncover Your Leadership Pattern',
            copy: 'Answer these 10 questions to discover the hidden ceiling limiting your impact. Be honest about how you naturally operate under pressure.',
        }
    ];

    // State
    let currentStepIndex = 0;
    let answers = {};
    let turnstileToken = null;
    let isTieBreakerActive = false;

    // Elements
    const container = document.getElementById('assessment-container');
    const stepsContainer = document.getElementById('steps-container');
    const resultView = document.getElementById('result-view');
    const progressWrapper = document.getElementById('progress-wrapper');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const loadingOverlay = document.getElementById('loading-overlay');

    // Setup Turnstile callback
    window.onTurnstileSuccess = function(token) {
        turnstileToken = token;
        const submitBtn = document.getElementById('btn-submit');
        if (submitBtn) submitBtn.disabled = false;
        
        // Auto submit if clicked before captcha loaded
        if (window.pendingSubmit) {
            window.pendingSubmit = false;
            submitAssessment();
        }
    };

    // Load state from local storage
    function loadSavedProgress() {
        try {
            const saved = localStorage.getItem('hc_identity_progress');
            if (saved) {
                const parsed = JSON.parse(saved);
                answers = parsed.answers || {};
                
                // Ensure index is valid
                if (parsed.currentStepIndex && parsed.currentStepIndex > 0) {
                    currentStepIndex = Math.min(parsed.currentStepIndex, ASSESSMENT_STEPS.length - 1);
                }
            }
        } catch (err) {
            console.error('Could not load saved progress', err);
        }
    }

    function saveProgress() {
        try {
            localStorage.setItem('hc_identity_progress', JSON.stringify({
                answers,
                currentStepIndex
            }));
        } catch (err) {
            console.error('Could not save progress', err);
        }
    }

    function clearProgress() {
        try {
            localStorage.removeItem('hc_identity_progress');
        } catch (err) {}
    }

    // ── Data Fetching ───────────────────────────────────────────

    async function loadConfig() {
        try {
            loadingOverlay.classList.add('active');
            const res = await fetch('/api/identity-ceiling');
            const data = await res.json();
            
            if (data.questions && Array.isArray(data.questions)) {
                // Intro is step 0
                ASSESSMENT_STEPS = [DEFAULT_STEPS[0]];
                
                // 10 main questions
                const mainQs = data.questions.slice(0, 10).map((q, idx) => ({
                    ...q,
                    id: q.id || `q${idx+1}`
                }));
                ASSESSMENT_STEPS.push(...mainQs);
                
                // tie breaker is stored, but not added to steps array initially
                if (data.questions.length > 10) {
                    window.tieBreakerQuestion = data.questions[10];
                    window.tieBreakerQuestion.id = 'tie_breaker';
                }
            } else {
                ASSESSMENT_STEPS = DEFAULT_STEPS;
            }
            
            if (data.results) {
                RESULT_PROFILES = data.results;
            }
            
            configLoaded = true;
            loadSavedProgress();
            renderSteps();
            showStep(currentStepIndex);
        } catch (err) {
            console.error('Error loading config', err);
            // Fallback
            ASSESSMENT_STEPS = DEFAULT_STEPS;
            renderSteps();
            showStep(0);
        } finally {
            loadingOverlay.classList.remove('active');
        }
    }

    // ── Rendering ───────────────────────────────────────────────

    function renderSteps() {
        stepsContainer.innerHTML = '';
        
        ASSESSMENT_STEPS.forEach((step, index) => {
            const stepEl = document.createElement('div');
            stepEl.className = 'step';
            stepEl.id = `step-${index}`;

            let contentHtml = '';

            if (step.type === 'intro') {
                contentHtml = `
                    <span class="step-eyebrow">${step.eyebrow}</span>
                    <h2 class="step-title">${step.title}</h2>
                    <p class="step-copy">${step.copy}</p>

                    <div class="lead-capture-form">
                        <div class="form-group">
                            <input type="text" id="lead-name" placeholder="First Name" required value="${answers.name || ''}">
                        </div>
                        <div class="form-group">
                            <input type="email" id="lead-email" placeholder="Email Address" required value="${answers.email || ''}">
                        </div>
                        <input type="text" id="lead-company" style="display:none" tabindex="-1" autocomplete="off">
                        
                        <div id="intro-error" class="error-message">Please enter a valid name and email.</div>

                        <div class="step-navigation" style="border-top:none; margin-top:1rem; padding-top:0;">
                            <button type="button" class="btn-next" onclick="handleNextClick(${index})">Begin Assessment</button>
                        </div>
                    </div>
                `;
            } else {
                // Question step
                const qNum = index; // Intro is 0, Q1 is index 1
                const totalQs = isTieBreakerActive ? 11 : 10;
                
                contentHtml = `
                    <span class="step-eyebrow">Question ${qNum} of ${totalQs}</span>
                    <h2 class="step-title">${step.title}</h2>
                    
                    <div class="options-list">
                        ${(step.options || []).map((opt, optIdx) => `
                            <label class="option-label ${answers[step.id] === optIdx ? 'selected' : ''}" data-qid="${step.id}" data-optidx="${optIdx}">
                                <input type="radio" name="${step.id}" value="${optIdx}" ${answers[step.id] === optIdx ? 'checked' : ''}>
                                <span class="option-text">${opt.text}</span>
                            </label>
                        `).join('')}
                    </div>

                    <div id="q-error-${index}" class="error-message">Please select an option before continuing.</div>

                    <div class="step-navigation">
                        <button type="button" class="btn-prev" onclick="handlePrevClick(${index})">Back</button>
                        ${index === ASSESSMENT_STEPS.length - 1 
                            ? `<div id="cf-turnstile-container"></div>
                               <button type="button" id="btn-submit" class="btn-submit" onclick="handleSubmitClick()" disabled>Reveal My Ceiling</button>`
                            : `<button type="button" class="btn-next" onclick="handleNextClick(${index})">Next Question</button>`
                        }
                    </div>
                `;
            }

            stepEl.innerHTML = contentHtml;
            stepsContainer.appendChild(stepEl);
        });

        // Attach event listeners for options
        const optionLabels = stepsContainer.querySelectorAll('.option-label');
        optionLabels.forEach(label => {
            label.addEventListener('click', function(e) {
                if(e.target.type !== 'radio') {
                    const radio = this.querySelector('input[type="radio"]');
                    radio.checked = true;
                }
                
                // Clear selected class from siblings
                const siblings = this.parentElement.querySelectorAll('.option-label');
                siblings.forEach(s => s.classList.remove('selected'));
                
                // Add selected to this
                this.classList.add('selected');

                // Save answer
                const qid = this.getAttribute('data-qid');
                const optidx = parseInt(this.getAttribute('data-optidx'), 10);
                answers[qid] = optidx;
                saveProgress();
                
                // Clear error
                const errorEl = this.closest('.step').querySelector('.error-message');
                if (errorEl) errorEl.style.display = 'none';
            });
        });

        // Initialize Turnstile on the last step if it exists
        const tsContainer = document.getElementById('cf-turnstile-container');
        if (tsContainer && window.turnstile) {
            turnstile.render(tsContainer, {
                sitekey: '0x4AAAAAAAi7L9v8aBstBq6Y',
                callback: 'onTurnstileSuccess',
                theme: 'dark'
            });
        }
    }

    function showStep(index) {
        document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
        const target = document.getElementById(`step-${index}`);
        if (target) {
            target.classList.add('active');
            currentStepIndex = index;
            saveProgress();
            
            // Scroll to top of assessment container on step change
            const offsetTop = container.getBoundingClientRect().top + window.scrollY - 100;
            if (window.scrollY > offsetTop) {
                window.scrollTo({ top: offsetTop, behavior: 'smooth' });
            }

            // Update Progress Bar
            if (index === 0 || index > 10 + (isTieBreakerActive ? 1 : 0)) {
                progressWrapper.style.display = 'none';
            } else {
                progressWrapper.style.display = 'block';
                const totalQs = isTieBreakerActive ? 11 : 10;
                const percent = Math.round((index / totalQs) * 100);
                progressBar.style.width = `${percent}%`;
                progressText.textContent = `Question ${index} of ${totalQs}`;
            }
        }
    }

    // ── Navigation Logic ────────────────────────────────────────

    window.handlePrevClick = function(currentIndex) {
        if (currentIndex > 0) {
            showStep(currentIndex - 1);
        }
    };

    window.handleNextClick = function(currentIndex) {
        const step = ASSESSMENT_STEPS[currentIndex];
        
        if (step.type === 'intro') {
            const name = document.getElementById('lead-name').value.trim();
            const email = document.getElementById('lead-email').value.trim();
            const errorEl = document.getElementById('intro-error');
            
            const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
            if (!name || !emailRegex.test(email)) {
                errorEl.style.display = 'block';
                return;
            }
            
            answers.name = name;
            answers.email = email;
            answers.company = document.getElementById('lead-company').value.trim();
            errorEl.style.display = 'none';
        } else {
            const errorEl = document.getElementById(`q-error-${currentIndex}`);
            if (answers[step.id] === undefined) {
                errorEl.style.display = 'block';
                return;
            }
        }
        
        // If we are at Q10 (index 10) and need a tie breaker, inject it before showing next
        if (currentIndex === 10 && !isTieBreakerActive) {
            if (checkForTie()) {
                isTieBreakerActive = true;
                ASSESSMENT_STEPS.push(window.tieBreakerQuestion);
                renderSteps();
                showStep(11);
                return;
            }
        }

        showStep(currentIndex + 1);
    };

    function checkForTie() {
        const tallies = {};
        // Tally ceilings for Q1-Q10
        for (let i = 1; i <= 10; i++) {
            const step = ASSESSMENT_STEPS[i];
            const selectedIdx = answers[step.id];
            if (selectedIdx !== undefined) {
                const ceilingKey = step.options[selectedIdx].ceiling;
                if (ceilingKey) {
                    tallies[ceilingKey] = (tallies[ceilingKey] || 0) + 1;
                }
            }
        }

        // Find max
        let maxCount = 0;
        let tieExists = false;
        
        for (const [key, count] of Object.entries(tallies)) {
            if (count > maxCount) {
                maxCount = count;
                tieExists = false;
            } else if (count === maxCount) {
                tieExists = true;
            }
        }
        
        return tieExists;
    }

    function getUtmParams() {
        const urlParams = new URLSearchParams(window.location.search);
        return {
            source: urlParams.get('utm_source'),
            medium: urlParams.get('utm_medium'),
            campaign: urlParams.get('utm_campaign'),
            term: urlParams.get('utm_term'),
            content: urlParams.get('utm_content')
        };
    }

    window.handleSubmitClick = async function() {
        const lastStepIdx = ASSESSMENT_STEPS.length - 1;
        const lastStep = ASSESSMENT_STEPS[lastStepIdx];
        
        if (answers[lastStep.id] === undefined) {
            const errorEl = document.getElementById(`q-error-${lastStepIdx}`);
            if (errorEl) errorEl.style.display = 'block';
            return;
        }

        if (!turnstileToken) {
            window.pendingSubmit = true;
            return;
        }

        try {
            loadingOverlay.classList.add('active');
            
            // Extract just the question answers
            const qAnswers = {};
            for (const key of Object.keys(answers)) {
                if (key.startsWith('q') || key === 'tie_breaker') {
                    qAnswers[key] = answers[key];
                }
            }

            const payload = {
                name: answers.name,
                email: answers.email,
                company: answers.company,
                answers: qAnswers,
                'cf-turnstile-response': turnstileToken,
                attribution: {
                    ...getUtmParams(),
                    landing_page: window.location.pathname,
                    referrer: document.referrer
                }
            };

            const response = await fetch('/api/identity-ceiling', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || 'There was a problem submitting your assessment. Please try again.');
                if (window.turnstile) turnstile.reset();
                turnstileToken = null;
                document.getElementById('btn-submit').disabled = true;
                loadingOverlay.classList.remove('active');
                return;
            }

            // Success
            clearProgress();
            renderResult(data.result);

        } catch (err) {
            console.error(err);
            alert('A network error occurred. Please try again.');
            loadingOverlay.classList.remove('active');
        }
    }

    // ── Result Rendering ────────────────────────────────────────

    function renderResult(resultData) {
        stepsContainer.style.display = 'none';
        progressWrapper.style.display = 'none';
        
        const ceilingKey = resultData.center;
        const profile = RESULT_PROFILES[ceilingKey];
        
        if (!profile) {
            alert('Error loading result profile.');
            return;
        }

        document.getElementById('res-title').textContent = `The ${capitalize(ceilingKey)} Ceiling`;
        document.getElementById('res-diagnosis').textContent = profile.diagnosis;
        document.getElementById('res-ceiling').textContent = profile.ceiling;
        
        const guideList = document.getElementById('res-guide');
        guideList.innerHTML = '';
        if (Array.isArray(profile.guide)) {
            profile.guide.forEach(step => {
                const li = document.createElement('li');
                li.textContent = step;
                guideList.appendChild(li);
            });
        }
        
        document.getElementById('res-cta-text').textContent = profile.cta_text || 'Schedule an Alignment Call';
        document.getElementById('res-cta-url').href = profile.cta_url || '#';

        resultView.classList.add('active');
        loadingOverlay.classList.remove('active');
        
        const offsetTop = container.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: offsetTop, behavior: 'smooth' });
    }
    
    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Init
    document.addEventListener('DOMContentLoaded', loadConfig);

})();
