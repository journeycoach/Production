(function () {
    const ASSESSMENT_STEPS = [
        {
            id: 'intro',
            type: 'intro',
            eyebrow: 'Start Here',
            title: 'Tell me where to send your guide',
            copy: 'You will see your result immediately on the page, and I will also email the matching Hidden Ceiling guide so you can revisit it later.',
        },
        {
            id: 'q1',
            eyebrow: 'Question 1 of 7',
            title: 'When a high-stakes project hits a major roadblock, what is your first internal reaction?',
            options: [
                { title: 'Option 1', text: 'I pull back to analyze the data and find where the logic failed.' },
                { title: 'Option 2', text: 'I immediately look for who is responsible and how to fix the momentum.' },
                { title: 'Option 3', text: 'I worry about how this failure reflects on the team\'s reputation.' },
            ],
        },
        {
            id: 'q2',
            eyebrow: 'Question 2 of 7',
            title: 'What does your team likely wish you did more of?',
            options: [
                { title: 'Option 1', text: 'Trusted your gut and took a risk without needing a 20-page report.' },
                { title: 'Option 2', text: 'Focused on the bottom line instead of trying to keep everyone happy.' },
                { title: 'Option 3', text: 'Paused to consider the emotional impact of fast decisions.' },
            ],
        },
        {
            id: 'q3',
            eyebrow: 'Question 3 of 7',
            title: 'In strategic meetings, you feel most in your element when discussing:',
            options: [
                { title: 'Option 1', text: 'Systems, long-term strategy, and potential risk mitigation.' },
                { title: 'Option 2', text: 'Culture, vision, and how the brand is perceived externally.' },
                { title: 'Option 3', text: 'Execution, clear boundaries, and immediate next steps.' },
            ],
        },
        {
            id: 'q4',
            eyebrow: 'Question 4 of 7',
            title: 'When you receive critical feedback from a peer, what is your instinct?',
            options: [
                { title: 'Option 1', text: 'Wonder if they still like you or if the relationship is damaged.' },
                { title: 'Option 2', text: 'Process it privately and look for the objective truth in their statement.' },
                { title: 'Option 3', text: 'Challenge it immediately with proof of results.' },
            ],
        },
        {
            id: 'q5',
            eyebrow: 'Question 5 of 7',
            title: 'In a team meeting, what do you value most in others\' contributions?',
            options: [
                { title: 'Option 1', text: 'Objectivity and the clarity of thought behind their arguments.' },
                { title: 'Option 2', text: 'Empathy and the consideration of how decisions affect everyone.' },
                { title: 'Option 3', text: 'Decisiveness and the ability to move the group from talk to action.' },
            ],
        },
        {
            id: 'q6',
            eyebrow: 'Question 6 of 7',
            title: 'How do you feel about working with a complex, detailed spreadsheet?',
            options: [
                { title: 'Option 1', text: 'It feels impersonal; I\'d rather talk to the people behind the numbers.' },
                { title: 'Option 2', text: 'It\'s satisfying; I love finding the patterns and stories the data tells.' },
                { title: 'Option 3', text: 'It\'s a waste of time unless it shows immediate ROI.' },
            ],
        },
        {
            id: 'q7',
            eyebrow: 'Question 7 of 7',
            title: 'Ultimately, what is the "true north" for your leadership style?',
            options: [
                { title: 'Option 1', text: 'Connection; it\'s about the people and the common goal.' },
                { title: 'Option 2', text: 'Logic; it\'s about the data and the objective truth.' },
                { title: 'Option 3', text: 'Momentum; things must keep moving forward.' },
            ],
        }
    ];

    const RESULT_META = {
        heart: {
            centerLabel: 'Heart Center',
            title: 'You lead like a Connection-Oriented Leader',
            summary: 'Your responses point to a leadership pattern that instinctively tracks people, morale, and the emotional temperature of the room.',
            description: 'You are often the person who can sense the undercurrent nobody else is naming. That makes you a stabilizing presence in culture, trust, and relationship repair.',
            blindspot: 'Under pressure, that same strength can turn into over-identifying with how others are feeling, over-functioning relationally, or softening hard decisions until the moment has passed.',
            nextSteps: [
                'Notice where harmony is becoming more important than clarity.',
                'Name the decision before you manage everyone\'s reaction to it.',
                'Use the guide to spot the situations where connection quietly turns into self-protection.'
            ],
            guideUrl: '/assets/downloads/hidden_ceiling_connection_oriented_leader.pdf',
            guideLabel: 'Hidden Ceiling Guide for the Connection-Oriented Leader'
        },
        head: {
            centerLabel: 'Head Center',
            title: 'You lead like a Thinking-Oriented Leader',
            summary: 'Your responses point to a leadership pattern that instinctively searches for clarity, logic, and the cleanest explanation of what is happening.',
            description: 'You likely bring rigor, objectivity, and strong pattern recognition to complex systems. People rely on you to see risk, ask the smart question, and think around corners.',
            blindspot: 'Under pressure, that strength can become over-analysis, emotional distance, or a subtle dependence on certainty before moving. The room can feel managed by logic but not fully led through tension.',
            nextSteps: [
                'Watch for the moment information-gathering becomes a delay tactic.',
                'Pair your analysis with a visible relational read on the team.',
                'Use the guide to identify where objectivity is protecting you from discomfort rather than serving the decision.'
            ],
            guideUrl: '/assets/downloads/hidden_ceiling_thinking_oriented_leader.pdf',
            guideLabel: 'Hidden Ceiling Guide for the Thinking-Oriented Leader'
        },
        action: {
            centerLabel: 'Action Center',
            title: 'You lead like an Action-Oriented Leader',
            summary: 'Your responses point to a leadership pattern that instinctively values movement, decisiveness, and the ability to convert energy into results.',
            description: 'You likely create traction quickly. People experience you as someone who can cut through noise, set direction, and keep a team from stalling out in uncertainty.',
            blindspot: 'Under pressure, that strength can harden into impatience, over-control, or the urge to move faster than the system around you can metabolize. Speed starts solving anxiety instead of solving the right problem.',
            nextSteps: [
                'Notice where urgency is outrunning reflection or buy-in.',
                'Slow down long enough to separate momentum from reactivity.',
                'Use the guide to spot where force and clarity are getting conflated inside your leadership.'
            ],
            guideUrl: '/assets/downloads/hidden_ceiling_action_oriented_leader.pdf',
            guideLabel: 'Hidden Ceiling Guide for the Action-Oriented Leader'
        }
    };

    const SCORE_MAP = {
        q1: ['head', 'action', 'heart'],
        q2: ['head', 'heart', 'action'],
        q3: ['head', 'heart', 'action'],
        q4: ['heart', 'head', 'action'],
        q5: ['head', 'heart', 'action'],
        q6: ['heart', 'head', 'action'],
        q7: ['heart', 'head', 'action']
    };

    const state = {
        stepIndex: 0,
        name: '',
        email: '',
        company: '',
        answers: {
            q1: null,
            q2: null,
            q3: null,
            q4: null,
            q5: null,
            q6: null,
            q7: null
        }
    };

    const shell = document.getElementById('hc-assessment-shell');
    if (!shell) return;

    const form = document.getElementById('hc-assessment-form');
    const stepContainer = document.getElementById('hc-step-container');
    const errorEl = document.getElementById('hc-form-error');
    const backBtn = document.getElementById('hc-back-btn');
    const nextBtn = document.getElementById('hc-next-btn');
    const submitBtn = document.getElementById('hc-submit-btn');
    const progressLabel = document.getElementById('hc-progress-label');
    const progressCaption = document.getElementById('hc-progress-caption');
    const progressBar = document.getElementById('hc-progress-bar');
    const resultCard = document.getElementById('hc-result-card');

    function render() {
        const step = ASSESSMENT_STEPS[state.stepIndex];
        const totalSteps = ASSESSMENT_STEPS.length;
        const progressPercent = ((state.stepIndex + 1) / totalSteps) * 100;

        progressLabel.textContent = `Step ${state.stepIndex + 1} of ${totalSteps}`;
        progressCaption.textContent = step.type === 'intro' ? 'Getting started' : 'Assessment';
        progressBar.style.width = `${progressPercent}%`;
        errorEl.textContent = '';

        backBtn.hidden = state.stepIndex === 0;
        nextBtn.hidden = state.stepIndex === totalSteps - 1;
        submitBtn.hidden = true;

        if (step.type === 'intro') {
            stepContainer.innerHTML = `
                <span class="hc-step-eyebrow">${step.eyebrow}</span>
                <h3 class="hc-step-title">${step.title}</h3>
                <p class="hc-step-copy">${step.copy}</p>
                <div class="hc-field-grid">
                    <div class="hc-field">
                        <label for="hc-name">Name</label>
                        <input class="hc-input" id="hc-name" name="name" type="text" value="${escapeAttr(state.name)}" autocomplete="name" placeholder="Your name">
                    </div>
                    <div class="hc-field">
                        <label for="hc-email">Email</label>
                        <input class="hc-input" id="hc-email" name="email" type="email" value="${escapeAttr(state.email)}" autocomplete="email" placeholder="you@example.com">
                    </div>
                </div>
            `;
            document.getElementById('hc-name')?.focus();
            return;
        }

        const selected = state.answers[step.id];
        stepContainer.innerHTML = `
            <span class="hc-step-eyebrow">${step.eyebrow}</span>
            <h3 class="hc-step-title">${step.title}</h3>
            <div class="hc-choice-list">
                ${step.options.map((option, index) => `
                    <label class="hc-choice ${selected === index ? 'is-selected' : ''}">
                        <input type="radio" name="${step.id}" value="${index}" ${selected === index ? 'checked' : ''}>
                        <div>
                            <strong>${option.title}</strong>
                            <span>${option.text}</span>
                        </div>
                    </label>
                `).join('')}
            </div>
        `;

        const isLastQuestion = state.stepIndex === ASSESSMENT_STEPS.length - 1;
        stepContainer.querySelectorAll(`input[name="${step.id}"]`).forEach((input) => {
            input.addEventListener('change', () => {
                state.answers[step.id] = Number(input.value);
                render();
                if (isLastQuestion) {
                    setTimeout(() => submitAssessment(), 350);
                }
            });
        });
    }

    function validateCurrentStep() {
        const step = ASSESSMENT_STEPS[state.stepIndex];
        errorEl.textContent = '';

        if (step.type === 'intro') {
            const nameInput = document.getElementById('hc-name');
            const emailInput = document.getElementById('hc-email');
            const companyInput = document.getElementById('hc-company');
            state.name = nameInput.value.trim();
            state.email = emailInput.value.trim();
            state.company = companyInput?.value?.trim() || '';

            if (state.company) return false;
            if (!state.name) {
                errorEl.textContent = 'Please enter your name.';
                nameInput.focus();
                return false;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) {
                errorEl.textContent = 'Please enter a valid email address.';
                emailInput.focus();
                return false;
            }
            return true;
        }

        if (state.answers[step.id] === null || state.answers[step.id] === undefined) {
            errorEl.textContent = 'Choose the response that feels most true before continuing.';
            return false;
        }
        return true;
    }

    async function submitAssessment() {
        if (!validateCurrentStep()) return;

        nextBtn.disabled = true;
        backBtn.disabled = true;
        stepContainer.innerHTML = `
            <div style="text-align:center;padding:2.5rem 1rem;">
                <div style="width:36px;height:36px;border:3px solid rgba(201,169,110,0.2);border-top-color:var(--color-accent-gold);border-radius:50%;animation:hc-spin 0.7s linear infinite;margin:0 auto 1.25rem;"></div>
                <p style="color:var(--color-text-muted);font-size:0.9rem;margin:0;">Scoring your results…</p>
            </div>`;

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'hidden_ceiling',
                    name: state.name,
                    email: state.email,
                    company: state.company,
                    source: new URLSearchParams(window.location.search).get('source') || 'website',
                    answers: state.answers
                })
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || 'Unable to process your assessment right now.');
            }

            showResult(data);
        } catch (error) {
            errorEl.textContent = error.message || 'Something went wrong while submitting your assessment.';
            nextBtn.disabled = false;
            backBtn.disabled = false;
            render();
        }
    }

    function showResult(data) {
        const { result, scores, emailSent } = data;
        const meta = RESULT_META[result.center];
        if (!meta) return;

        document.getElementById('hc-result-center').textContent = meta.centerLabel;
        document.getElementById('hc-result-title').textContent = meta.title;
        document.getElementById('hc-result-summary').textContent = emailSent
            ? `${meta.summary} Your personalized guide is already on its way to ${state.email}.`
            : `${meta.summary} I could not send the email automatically, so your guide is available below right away.`;
        document.getElementById('hc-result-description').textContent = meta.description;
        document.getElementById('hc-result-blindspot').textContent = meta.blindspot;

        const actionsList = document.getElementById('hc-result-actions');
        actionsList.innerHTML = meta.nextSteps.map((item) => `<li>${item}</li>`).join('');

        document.getElementById('hc-score-grid').innerHTML = [
            { label: 'Heart', value: scores.heart },
            { label: 'Head', value: scores.head },
            { label: 'Action', value: scores.action }
        ].map((score) => `
            <div class="hc-score-card">
                <strong>${score.label} score</strong>
                <span>${score.value}</span>
            </div>
        `).join('');

        form.hidden = true;
        resultCard.classList.add('is-visible');
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    backBtn.addEventListener('click', () => {
        if (state.stepIndex === 0) return;
        state.stepIndex -= 1;
        render();
    });

    nextBtn.addEventListener('click', () => {
        if (!validateCurrentStep()) return;
        if (state.stepIndex < ASSESSMENT_STEPS.length - 1) {
            state.stepIndex += 1;
            render();
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        await submitAssessment();
    });

    render();

    function escapeAttr(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
})();
