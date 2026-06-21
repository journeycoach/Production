import { sql } from './_db.js';

let migrated = false;

const ASSESSMENT_COPY_FIXES = {
  q4: {
    oldTitles: [
      'Two high-performing members of your team are in a sustained conflict that is starting to affect results. What is your first move?',
      'When a peer gives you hard feedback, what is your first instinct?',
      'When an important issue is being avoided, what is your natural leadership response?',
    ],
    title: 'When an important issue is being avoided, what is your natural leadership response?',
    oldOptions: {
      heart: [
        'You sit down with each person individually first — you want to understand what each one is experiencing before you address it as a group.',
        'You focus on the relational context. You want to understand what is behind the feedback before you respond.',
      ],
      head: [
        'You analyze what is underneath the conflict — whether it is structural, a clarity gap, or a deeper incompatibility — before deciding how to intervene.',
        'Step back and assess whether the feedback is accurate and logically sound.',
        'I look for the assumptions, missing information, or competing interpretations that may be keeping it unresolved.',
      ],
      action: [
        'You address it directly and promptly with both of them — you are clear about expectations and focus on what needs to change in the work dynamic.',
        'You address it directly. If it does not hold up, you say so and explain why.',
      ],
    },
    options: {
      heart: 'I pay attention to the relational context and what people may be protecting, feeling, or needing before I respond.',
      head: 'I look for the assumptions, missing information, or competing interpretations that may be keeping it unresolved.',
      action: 'I address it directly, name what needs to be faced, and clarify what has to happen next.',
    },
  },
  q7: {
    oldTitles: [
      'A trusted colleague gives you critical feedback about your leadership style. What is your most natural first response?',
    ],
    title: 'A trusted colleague gives you critical feedback about your leadership style. What is your most natural first response?',
    oldOptions: {
      heart: [
        'You feel it personally — you reflect on whether you have let this person or your team down, and want to make sure the relationship is okay.',
        'You immediately wonder how the feedback may have affected your relationship or how others may be experiencing you.',
      ],
      action: [
        'You acknowledge it, ask one clarifying question, and start thinking about what you will do differently.',
        'Your immediate impulse is to operationalize it — you focus on what concrete change is being requested so you can make it, or your guard goes up about who is questioning your approach.',
        'You instinctively focus on what needs to change, improve, or be addressed moving forward.',
      ],
      head: [
        'You mentally compare the feedback against other observations before deciding how much weight to give it.',
        'You internally analyze the feedback and compare it against other data points before fully accepting it.',
      ],
    },
    options: {
      heart: 'I first consider how the feedback may affect the relationship and how others may be experiencing me.',
      action: 'I focus on what needs to change, improve, or be addressed moving forward.',
      head: 'I analyze the feedback and compare it against other data points before fully accepting it.',
    },
  },
};

function applyAssessmentCopyFixes(config) {
  if (!config || typeof config !== 'object' || !Array.isArray(config.questions)) {
    return { config, changed: false };
  }

  let changed = false;
  const questions = config.questions.map((question) => {
    const fix = ASSESSMENT_COPY_FIXES[question?.id];
    if (!fix || !question || typeof question !== 'object') return question;

    const nextQuestion = { ...question };
    if (fix.oldTitles.includes(nextQuestion.title) && nextQuestion.title !== fix.title) {
      nextQuestion.title = fix.title;
      changed = true;
    }

    if (Array.isArray(nextQuestion.options)) {
      nextQuestion.options = nextQuestion.options.map((option) => {
        const text = fix.options[option?.center];
        const oldTexts = fix.oldOptions[option?.center] || [];
        if (!text || option.text === text || !oldTexts.includes(option.text)) return option;
        changed = true;
        return { ...option, text };
      });
    }

    return nextQuestion;
  });

  return { config: { ...config, questions }, changed };
}

export async function runMigrations() {
  if (migrated) return;

  await sql`
    CREATE TABLE IF NOT EXISTS subscribers (
      id             SERIAL PRIMARY KEY,
      email          TEXT UNIQUE NOT NULL,
      name           TEXT,
      source         TEXT DEFAULT 'website',
      created_at     TIMESTAMPTZ DEFAULT NOW(),
      result_center  TEXT,
      score_heart    INT,
      score_head     INT,
      score_action   INT
    )
  `;
  await sql`
    ALTER TABLE subscribers
      ADD COLUMN IF NOT EXISTS result_center             TEXT,
      ADD COLUMN IF NOT EXISTS score_heart               INT,
      ADD COLUMN IF NOT EXISTS score_head                INT,
      ADD COLUMN IF NOT EXISTS score_action              INT,
      ADD COLUMN IF NOT EXISTS source_history            JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS drip_step                 INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_email_sent_at        TIMESTAMPTZ DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS is_unsubscribed           BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS notes                     TEXT,
      ADD COLUMN IF NOT EXISTS attribution_source        TEXT,
      ADD COLUMN IF NOT EXISTS first_attribution_source  TEXT,
      ADD COLUMN IF NOT EXISTS landing_page              TEXT,
      ADD COLUMN IF NOT EXISTS referrer                  TEXT,
      ADD COLUMN IF NOT EXISTS utm_source                TEXT,
      ADD COLUMN IF NOT EXISTS utm_medium                TEXT,
      ADD COLUMN IF NOT EXISTS utm_campaign              TEXT,
      ADD COLUMN IF NOT EXISTS utm_term                  TEXT,
      ADD COLUMN IF NOT EXISTS utm_content               TEXT,
      ADD COLUMN IF NOT EXISTS attribution               JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS assessment_scores         JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS email_status              TEXT,
      ADD COLUMN IF NOT EXISTS email_status_at           TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS lead_status               TEXT,
      ADD COLUMN IF NOT EXISTS has_booked_call           BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS booked_call_at            TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS assessment_call_clicked_at TIMESTAMPTZ
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS contact_submissions (
      id         SERIAL PRIMARY KEY,
      name       TEXT,
      email      TEXT,
      phone      TEXT,
      interest   TEXT,
      message    TEXT,
      source     TEXT DEFAULT 'website',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    ALTER TABLE contact_submissions
      ADD COLUMN IF NOT EXISTS submitted_at              TIMESTAMPTZ DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS attribution_source        TEXT,
      ADD COLUMN IF NOT EXISTS first_attribution_source  TEXT,
      ADD COLUMN IF NOT EXISTS landing_page              TEXT,
      ADD COLUMN IF NOT EXISTS referrer                  TEXT,
      ADD COLUMN IF NOT EXISTS utm_source                TEXT,
      ADD COLUMN IF NOT EXISTS utm_medium                TEXT,
      ADD COLUMN IF NOT EXISTS utm_campaign              TEXT,
      ADD COLUMN IF NOT EXISTS utm_term                  TEXT,
      ADD COLUMN IF NOT EXISTS utm_content               TEXT,
      ADD COLUMN IF NOT EXISTS attribution               JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS email_status              TEXT,
      ADD COLUMN IF NOT EXISTS email_status_at           TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS is_read                   BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS lead_status               TEXT,
      ADD COLUMN IF NOT EXISTS has_booked_call           BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS booked_call_at            TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS has_contact               BOOLEAN DEFAULT FALSE
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS posts (
      id        SERIAL PRIMARY KEY,
      title     TEXT,
      post_date DATE,
      author    TEXT,
      image_url TEXT,
      summary   TEXT,
      body      TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS slug TEXT`;

  await sql`
    CREATE TABLE IF NOT EXISTS testimonials (
      id         SERIAL PRIMARY KEY,
      quote      TEXT,
      author     TEXT,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    ALTER TABLE testimonials
      ADD COLUMN IF NOT EXISTS short_quote      TEXT,
      ADD COLUMN IF NOT EXISTS long_quote       TEXT,
      ADD COLUMN IF NOT EXISTS client_role      TEXT,
      ADD COLUMN IF NOT EXISTS industry         TEXT,
      ADD COLUMN IF NOT EXISTS display_location TEXT DEFAULT 'homepage',
      ADD COLUMN IF NOT EXISTS is_featured      BOOLEAN DEFAULT FALSE
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS campaign_emails (
      id            SERIAL PRIMARY KEY,
      campaign_name TEXT NOT NULL,
      step_number   INT NOT NULL,
      subject       TEXT,
      body_html     TEXT,
      delay_days    INT DEFAULT 2,
      is_active     BOOLEAN DEFAULT TRUE,
      UNIQUE(campaign_name, step_number)
    )
  `;
  await sql`ALTER TABLE campaign_emails ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`;

  await sql`
    CREATE TABLE IF NOT EXISTS submission_attempts (
      id         SERIAL PRIMARY KEY,
      action     TEXT NOT NULL,
      ip_hash    TEXT NOT NULL,
      email_hash TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS admin_login_attempts (
      id         SERIAL PRIMARY KEY,
      ip_hash    TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS navigation (
      id          SERIAL PRIMARY KEY,
      nav_links   JSONB DEFAULT '[]'::jsonb,
      footer_links JSONB DEFAULT '[]'::jsonb,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    ALTER TABLE navigation
      ADD COLUMN IF NOT EXISTS footer_links  JSONB    DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS brand_name    TEXT,
      ADD COLUMN IF NOT EXISTS cta_button    JSONB    DEFAULT '{}'::jsonb
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS page_sections (
      id           SERIAL PRIMARY KEY,
      page         TEXT NOT NULL,
      section_key  TEXT NOT NULL,
      label        TEXT,
      is_visible   BOOLEAN DEFAULT TRUE,
      sort_order   INT DEFAULT 0,
      status       TEXT DEFAULT 'published',
      content      JSONB DEFAULT '{}'::jsonb,
      admin_notes  TEXT,
      UNIQUE(page, section_key)
    )
  `;

  // Seed default sections — ON CONFLICT DO NOTHING keeps existing rows intact
  const defaultSections = [
    { page: 'home', section_key: 'hero',               label: 'Hero',                sort_order: 0  },
    { page: 'home', section_key: 'lead-magnet-strip',  label: 'Lead Magnet Strip',   sort_order: 1  },
    { page: 'home', section_key: 'welcome',            label: 'Welcome',             sort_order: 2  },
    { page: 'home', section_key: 'methodology',        label: 'Methodology',         sort_order: 3  },
    { page: 'home', section_key: 'services',           label: 'Services',            sort_order: 4  },
    { page: 'home', section_key: 'recognition-strip',  label: 'Recognition Strip',   sort_order: 5  },
    { page: 'home', section_key: 'results',            label: 'Results / Testimonials', sort_order: 6 },
    { page: 'home', section_key: 'about',              label: 'About',               sort_order: 7  },
    { page: 'home', section_key: 'contact',            label: 'Contact',             sort_order: 8  },
    { page: 'enneagram', section_key: 'hero',          label: 'Hero',                sort_order: 0  },
    { page: 'blog',      section_key: 'assessment-cta', label: 'Assessment CTA (Sidebar)', sort_order: 0 },
  ];
  for (const s of defaultSections) {
    await sql`
      INSERT INTO page_sections (page, section_key, label, sort_order, is_visible, status)
      VALUES (${s.page}, ${s.section_key}, ${s.label}, ${s.sort_order}, true, 'published')
      ON CONFLICT (page, section_key) DO NOTHING
    `;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS calendly_events (
      id                  SERIAL PRIMARY KEY,
      calendly_event_uuid TEXT UNIQUE NOT NULL,
      email               TEXT,
      created_at          TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tools (
      id          SERIAL PRIMARY KEY,
      title       TEXT NOT NULL,
      category    TEXT DEFAULT 'General',
      description TEXT,
      type        TEXT,
      file_url    TEXT,
      external_url TEXT,
      image_url   TEXT,
      is_hidden   BOOLEAN DEFAULT FALSE,
      sort_order  INT DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS bookmark_categories (
      id         SERIAL PRIMARY KEY,
      title      TEXT NOT NULL,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id          SERIAL PRIMARY KEY,
      title       TEXT NOT NULL,
      url         TEXT NOT NULL,
      category_id INT REFERENCES bookmark_categories(id) ON DELETE SET NULL,
      description TEXT,
      sort_order  INT DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Ensure site_settings table exists (may have been created outside migrations)
  await sql`
    CREATE TABLE IF NOT EXISTS site_settings (
      setting_key   TEXT PRIMARY KEY,
      setting_value TEXT,
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Seed correct 9-question assessment config if DB has a stale version (< 9 questions)
  try {
    const existing = await sql`SELECT setting_value FROM site_settings WHERE setting_key = 'assessment_form_config'`;
    let isStale = true;
    if (existing.length > 0 && existing[0].setting_value) {
      try {
        const c = JSON.parse(existing[0].setting_value);
        if (Array.isArray(c.questions) && c.questions.length >= 9) isStale = false;
      } catch (_) {}
    }
    if (isStale) {
      const correctConfig = JSON.stringify({
        intro: {
          eyebrow: 'Start Here',
          title: 'Tell me where to send your guide',
          copy: 'You will see your result immediately on the page, and I will also email the matching Hidden Ceiling guide so you can revisit it later.',
        },
        questions: [
          {
            id: 'q1',
            title: 'When a high-stakes initiative suddenly goes off track, what is your first internal reaction?',
            options: [
              { text: 'You pull back to analyze the data and find where the logic failed.', center: 'head' },
              { text: 'You move quickly to take charge and get things back on track.', center: 'action' },
              { text: 'Your focus goes immediately to the team — you want to understand how they are being affected and what they need from you.', center: 'heart' },
            ],
          },
          {
            id: 'q2',
            title: 'Under pressure, what do others most often tell you that you need to do differently?',
            options: [
              { text: 'You need to move forward with less over-analysis and trust your judgment sooner.', center: 'head' },
              { text: 'You need to be more direct about priorities instead of managing everyone\'s feelings first.', center: 'heart' },
              { text: 'You need to slow down long enough to consider how decisions are affecting people.', center: 'action' },
            ],
          },
          {
            id: 'q3',
            title: 'In high-level leadership conversations, where do you naturally contribute most?',
            options: [
              { text: 'You track how people will experience the decision and what it will mean relationally.', center: 'heart' },
              { text: 'You name the system-level risks, the long-term implications, and what others may be missing.', center: 'head' },
              { text: 'You focus on what needs to happen next, who owns it, and how to keep things moving.', center: 'action' },
            ],
          },
          {
            id: 'q4',
            title: 'When an important issue is being avoided, what is your natural leadership response?',
            options: [
              { text: 'I address it directly, name what needs to be faced, and clarify what has to happen next.', center: 'action' },
              { text: 'I look for the assumptions, missing information, or competing interpretations that may be keeping it unresolved.', center: 'head' },
              { text: 'I pay attention to the relational context and what people may be protecting, feeling, or needing before I respond.', center: 'heart' },
            ],
          },
          {
            id: 'q5',
            title: 'In leadership meetings, what kind of contribution do you instinctively value most?',
            options: [
              { text: 'You value awareness of people, tone, and how decisions affect the room.', center: 'heart' },
              { text: 'You value directness, conviction, and the ability to move things forward.', center: 'action' },
              { text: 'You value clear thinking, objectivity, and well-reasoned ideas.', center: 'head' },
            ],
          },
          {
            id: 'q6',
            title: 'When faced with a dense set of details, metrics, or analysis, what is your natural response?',
            options: [
              { text: 'You lose patience when it slows decisions down or gets in the way of moving forward.', center: 'action' },
              { text: 'You enjoy it when it helps you understand patterns, structure, and what is really going on.', center: 'head' },
              { text: 'You can do it, but you would rather focus on the people and context behind the numbers.', center: 'heart' },
            ],
          },
          {
            id: 'q7',
            title: 'A trusted colleague gives you critical feedback about your leadership style. What is your most natural first response?',
            options: [
              { text: 'I first consider how the feedback may affect the relationship and how others may be experiencing me.', center: 'heart' },
              { text: 'I focus on what needs to change, improve, or be addressed moving forward.', center: 'action' },
              { text: 'I analyze the feedback and compare it against other data points before fully accepting it.', center: 'head' },
            ],
          },
          {
            id: 'q8',
            title: 'You need to make a decision that you know will disappoint someone you respect. What do you do?',
            options: [
              { text: 'You make the call, communicate it directly, and focus on moving forward — you believe clarity is more respectful than delay.', center: 'action' },
              { text: 'You invest real time preparing how to deliver the news, prioritizing the relationship even after the decision is made.', center: 'heart' },
              { text: 'You review your reasoning one more time before acting, wanting to be fully confident you can justify the choice.', center: 'head' },
            ],
          },
          {
            id: 'q9',
            title: 'When the pressure is high, what most naturally guides your leadership decisions?',
            options: [
              { text: 'You return to truth — understanding what is accurate, objective, and really happening.', center: 'head' },
              { text: 'You return to connection — staying aligned with people, meaning, and shared purpose.', center: 'heart' },
              { text: 'You return to action — moving with conviction, clarity, and grounded instinct.', center: 'action' },
            ],
          },
        ],
      });
      await sql`
        INSERT INTO site_settings (setting_key, setting_value, updated_at)
        VALUES ('assessment_form_config', ${correctConfig}, NOW())
        ON CONFLICT (setting_key) DO UPDATE
          SET setting_value = EXCLUDED.setting_value,
              updated_at    = NOW()
      `;
    }
  } catch (seedErr) {
    console.error('assessment config seed error:', seedErr);
  }

  try {
    const existing = await sql`SELECT setting_value FROM site_settings WHERE setting_key = 'assessment_form_config'`;
    if (existing.length > 0 && existing[0].setting_value) {
      const parsed = JSON.parse(existing[0].setting_value);
      const { config, changed } = applyAssessmentCopyFixes(parsed);
      if (changed) {
        await sql`
          UPDATE site_settings
          SET setting_value = ${JSON.stringify(config)},
              updated_at = NOW()
          WHERE setting_key = 'assessment_form_config'
        `;
      }
    }
  } catch (copyErr) {
    console.error('assessment copy correction error:', copyErr);
  }

  await sql`
    CREATE TABLE IF NOT EXISTS identity_ceiling_config (
      setting_key   TEXT PRIMARY KEY,
      setting_value JSONB,
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  const IDENTITY_CEILING_CONFIG_VERSION = '2';

  const identityCeilingQuestions = [
    {
      id: "q1",
      title: "When a high-stakes project starts to drift, which inner pull shows up first?",
      options: [
        { text: "I feel responsible for creating visible momentum, and I want to help the team regain traction quickly.", ceiling: "achiever" },
        { text: "I feel responsible for understanding what is really happening, and I want the team to move from a sound read of the facts.", ceiling: "expert" },
        { text: "I feel responsible for noticing the relational temperature, and I want the team to stay connected while we address the issue.", ceiling: "harmony" }
      ]
    },
    {
      id: "q2",
      title: "When the team is stuck and the room feels flat, what responsibility do you most naturally take on?",
      options: [
        { text: "I take responsibility for tightening the work, clarifying standards, and making sure important details do not slip.", ceiling: "control" },
        { text: "I take responsibility for opening possibility, reframing the problem, and helping people see a path with more energy.", ceiling: "visionary" },
        { text: "I take responsibility for supporting the people carrying the most pressure, especially when someone seems overwhelmed.", ceiling: "rescuer" }
      ]
    },
    {
      id: "q3",
      title: "When pressure rises and ambiguity increases, which move feels most stabilizing to you?",
      options: [
        { text: "I create momentum through concrete progress, so people can feel that something is moving forward.", ceiling: "achiever" },
        { text: "I create steadiness through clear ownership, quality bars, and closer attention to execution.", ceiling: "control" },
        { text: "I create energy through a new frame, direction, or possibility that helps people get unstuck.", ceiling: "visionary" }
      ]
    },
    {
      id: "q4",
      title: "When you delegate a difficult assignment, which part takes the most discipline for you?",
      options: [
        { text: "Letting them reason through complexity before I offer the framework or answer I can already see.", ceiling: "expert" },
        { text: "Letting the accountability conversation stay clear if they struggle, even when I care about preserving trust.", ceiling: "harmony" },
        { text: "Letting them carry the productive pressure of the work before I step in to make it easier.", ceiling: "rescuer" }
      ]
    },
    {
      id: "q5",
      title: "As your scope expands, which shift feels like the biggest stretch?",
      options: [
        { text: "Being valued less for what I personally push across the line and more for the outcomes others own.", ceiling: "achiever" },
        { text: "Being valued less for having the strongest answer and more for developing stronger judgment around me.", ceiling: "expert" },
        { text: "Being valued less for close oversight and more for making success clear enough that others can lead the process.", ceiling: "control" }
      ]
    },
    {
      id: "q6",
      title: "When a transition creates uncertainty, what do you most want to protect for the team?",
      options: [
        { text: "I want to protect trust and emotional safety, so people can stay honest and engaged through the change.", ceiling: "harmony" },
        { text: "I want to protect possibility and forward imagination, so the change does not shrink what people believe is possible.", ceiling: "visionary" },
        { text: "I want to protect people from unnecessary strain, so they do not feel alone with more than they can carry.", ceiling: "rescuer" }
      ]
    },
    {
      id: "q7",
      title: "Which feedback would be hardest to receive because it touches something you care about?",
      options: [
        { text: "Your drive helps the team deliver, but people may rely on your pace instead of building their own.", ceiling: "achiever" },
        { text: "Your care for the room builds trust, but people may wait too long for the direct truth.", ceiling: "harmony" },
        { text: "Your support helps people feel safe, but they may not build the strength that comes from carrying the work themselves.", ceiling: "rescuer" }
      ]
    },
    {
      id: "q8",
      title: "Which feedback would be hardest to receive because it names a strength that may be overused?",
      options: [
        { text: "Your insight raises the quality of thinking, but people may defer to your analysis before testing their own.", ceiling: "expert" },
        { text: "Your standards protect important outcomes, but people may wait for your instructions before fully owning the result.", ceiling: "control" },
        { text: "Your ideas create momentum and possibility, but people may struggle to finish before the next direction appears.", ceiling: "visionary" }
      ]
    },
    {
      id: "q9",
      title: "When you feel secure as a leader, which signal tends to reassure you most?",
      options: [
        { text: "There is visible progress I can point to, and my contribution has clearly helped move things forward.", ceiling: "achiever" },
        { text: "The thinking is rigorous, I understand the issue deeply, and the logic behind the decision holds up.", ceiling: "expert" },
        { text: "The room feels connected and honest enough that people can stay aligned without unnecessary relational damage.", ceiling: "harmony" }
      ]
    },
    {
      id: "q10",
      title: "When your leadership is helping the team, which contribution do you most want to be known for?",
      options: [
        { text: "I bring clarity, standards, and reliable follow-through so important work is done well.", ceiling: "control" },
        { text: "I bring vision, fresh perspective, and energy so the team can see what is possible next.", ceiling: "visionary" },
        { text: "I bring support, steadiness, and protection so people can keep going when things are hard.", ceiling: "rescuer" }
      ]
    },
    {
      id: "q11",
      title: "When your strength becomes too central to execution, which cost are you most likely to miss at first?",
      options: [
        { text: "My pace can become the informal standard, even when the team needs shared ownership more than extra effort from me.", ceiling: "achiever" },
        { text: "My involvement can become the quality checkpoint, even when the team needs room to own the process without me.", ceiling: "control" },
        { text: "My availability can become the relief valve, even when the team needs to build capacity by carrying appropriate pressure.", ceiling: "rescuer" }
      ]
    },
    {
      id: "q12",
      title: "When your strength becomes too central to team conversations, which cost are you most likely to miss at first?",
      options: [
        { text: "My insight can become the final word, even when the team needs to practice reaching sound judgment together.", ceiling: "expert" },
        { text: "My steadiness can keep things pleasant, even when the team needs clearer truth to move forward.", ceiling: "harmony" },
        { text: "My ideas can become the next exciting direction, even when the team needs focus long enough to finish.", ceiling: "visionary" }
      ]
    },
    {
      id: "tie-breaker",
      title: "If you had to name the fear that most quietly shapes your leadership under pressure, which one resonates most?",
      options: [
        { text: "Losing momentum and becoming less visibly useful or productive.", ceiling: "achiever" },
        { text: "Not having the answer and being seen as less prepared or competent.", ceiling: "expert" },
        { text: "Creating conflict or damaging a relationship that matters.", ceiling: "harmony" },
        { text: "Losing oversight of something important and having it fail under my watch.", ceiling: "control" },
        { text: "Getting trapped in routine and losing the freedom to explore what is possible.", ceiling: "visionary" },
        { text: "Becoming unnecessary and losing my sense of purpose or contribution.", ceiling: "rescuer" }
      ]
    }
  ];

  const identityCeilingResults = {
    achiever: {
      label: "The Achiever's Ceiling",
      diagnosis: "You built your leadership identity around results, delivery, execution, and being the person who gets things done. People trust you because you are dependable, productive, and willing to push through to ensure the finish line is crossed.",
      ceiling: "The ceiling appears when the next level of leadership requires less personal output and more alignment, vision, and shared ownership. You keep increasing your own effort, but the work has changed. The organization no longer needs you to simply \"do more.\" It needs you to grow by harnessing the horsepower of others so that you can help the entire organization scale.",
      pattern: "I prove my value by producing.",
      cost: "Your team may admire your drive, but they stay dependent on your pace.",
      shift: "Move from personal output to collective alignment.",
      steps: [
        "Notice the trigger: Catch yourself the next time you feel the subconscious need to prove your value by constantly pushing for forward momentum.",
        "Pause the instinct: Instead of diving in and taking over the work, take a breath.",
        "Take a new action: Ask yourself: \"How can I align the team to solve this instead of just solving it for them?\""
      ]
    },
    expert: {
      label: "The Expert's Ceiling",
      diagnosis: "You became credible because you knew your craft. You saw patterns, solved problems, gave strong answers, and earned trust through your deep competence. People came to you because you understood things at a level others didn't.",
      ceiling: "The ceiling appears when senior leadership requires influence across domains where you are no longer the expert. If you keep needing to be the smartest or most prepared person in the room, you unintentionally narrow the conversation. The organization no longer needs you to have all the answers. It needs you to grow by elevating the thinking of others so that you can help the organization solve increasingly complex problems.",
      pattern: "I prove my value by knowing.",
      cost: "Others may defer to your judgment instead of developing their own.",
      shift: "Move from giving the best answer to asking the best question.",
      steps: [
        "Notice the trigger: Catch yourself the next time you feel the subconscious need to feel secure by demonstrating superior knowledge.",
        "Pause the instinct: Instead of immediately providing the perfect solution, take a breath.",
        "Take a new action: Ask yourself: \"What question can I ask right now that will help the team uncover the answer for themselves?\""
      ]
    },
    harmony: {
      label: "The Harmony Ceiling",
      diagnosis: "You built trust by being steady, relationally aware, and able to keep people connected. You notice the tone, tension, morale, and the emotional weather in the room. People often experience you as thoughtful, safe, and deeply considerate.",
      ceiling: "The ceiling appears when preserving comfort starts replacing telling the truth. Hard decisions get softened, delayed, or over-explained. Conflict avoidance compounds quietly, and the team pays for clarity you have not yet named. The organization no longer needs you to just keep the peace. It needs you to grow by leaning into productive friction so that you can build authentic trust and clarity.",
      pattern: "I protect value by keeping the peace.",
      cost: "People may feel cared for, but high performers will eventually grow frustrated by the lack of accountability.",
      shift: "Choose clarity over comfort.",
      steps: [
        "Notice the trigger: Catch yourself the next time you feel the subconscious need to prevent relational tension at the expense of the truth.",
        "Pause the instinct: Instead of softening the message or over-explaining the decision, take a breath.",
        "Take a new action: Ask yourself: \"What is the kindest, clearest truth I need to name in this room right now?\""
      ]
    },
    control: {
      label: "The Control Ceiling",
      diagnosis: "You built your reputation by owning important outcomes and making sure things were done well. Your standards are exceptionally high. You see what can go wrong, and you know how much quality, timing, and follow-through actually matter.",
      ceiling: "The ceiling appears when your span of responsibility exceeds what one person can personally oversee. Delegation feels risky, so you stay too close. You may call it excellence, responsibility, or quality control, but the result is the same: the team cannot grow beyond your grip. The organization no longer needs you to oversee every detail. It needs you to grow by empowering others to lead the process so that you can help scale beyond your personal capacity.",
      pattern: "I protect value by staying involved.",
      cost: "Others may comply with your instructions without truly owning the outcome.",
      shift: "Move from dictating the process to defining the outcome.",
      steps: [
        "Notice the trigger: Catch yourself the next time you feel the subconscious need to ensure flawless execution by managing the details.",
        "Pause the instinct: Instead of jumping in to dictate exactly *how* the work should be done, take a breath.",
        "Take a new action: Ask yourself: \"Have I clearly defined what success looks like here, and can I step back to let them figure out how to achieve it?\""
      ]
    },
    visionary: {
      label: "The Visionary's Ceiling",
      diagnosis: "You built trust by seeing the future, casting a compelling vision, and spotting opportunities others missed. People are drawn to your energy, your ability to innovate, and your unique talent for getting things started. You are a natural catalyst who thrives on possibility.",
      ceiling: "The ceiling appears when the organization needs operational depth, focus, and follow-through more than it needs another pivot. If your default response to feeling constrained or bored is to introduce a new initiative, you unintentionally create chaos. The organization no longer needs another immediate pivot. It needs you to grow by protecting the team's focus so that you can turn your big ideas into actualized results.",
      pattern: "I prove my value by inventing what is next.",
      cost: "Your team may feel constantly inspired, but quietly exhausted by initiative fatigue.",
      shift: "Move from launching the next idea to protecting the focus on the current one.",
      steps: [
        "Notice the trigger: Catch yourself the next time you feel the subconscious urge to introduce a new idea because the current work feels too routine.",
        "Pause the instinct: Instead of immediately sharing the new possibility with the team, take a breath.",
        "Take a new action: Ask yourself: \"What is the most important thing we are executing right now, and how can my energy help the team stay fiercely focused on it?\""
      ]
    },
    rescuer: {
      label: "The Rescuer's Ceiling",
      diagnosis: "You built trust by being helpful, available, protective, and willing to carry pressure for others. People experience you as deeply supportive and dependable. You often see what someone needs before they even ask, and stepping in feels like care, responsibility, or leadership to you.",
      ceiling: "The ceiling appears when your help prevents others from developing ownership, resilience, or capacity. You absorb tension that actually belongs elsewhere. You solve problems too quickly and relieve pressure that might have actually grown someone. The organization no longer needs you to carry the weight for everyone. It needs you to grow by allowing others to navigate their own challenges so that you can build a self-sufficient team.",
      pattern: "I prove my value by being needed.",
      cost: "Others feel cared for, but lack the muscle to solve their own problems.",
      shift: "Stop carrying what others need to strengthen.",
      steps: [
        "Notice the trigger: Catch yourself the next time you feel the subconscious need to feel valued by making yourself indispensable to a struggling team member.",
        "Pause the instinct: Instead of jumping in to fix the problem or carry the pressure, take a breath.",
        "Take a new action: Ask yourself: \"Is my 'help' right now actually preventing this person from building the resilience and ownership they need?\""
      ]
    }
  };

  const identityVersionRows = await sql`
    SELECT setting_value
    FROM identity_ceiling_config
    WHERE setting_key = 'config_version'
  `;
  const currentIdentityVersion = identityVersionRows[0]?.setting_value;
  const shouldUpdateIdentityConfig = currentIdentityVersion !== IDENTITY_CEILING_CONFIG_VERSION;

  await sql`
    INSERT INTO identity_ceiling_config (setting_key, setting_value, updated_at)
    VALUES ('questions', ${JSON.stringify(identityCeilingQuestions)}::jsonb, NOW())
    ON CONFLICT (setting_key) DO NOTHING
  `;

  await sql`
    INSERT INTO identity_ceiling_config (setting_key, setting_value, updated_at)
    VALUES ('results', ${JSON.stringify(identityCeilingResults)}::jsonb, NOW())
    ON CONFLICT (setting_key) DO NOTHING
  `;

  if (shouldUpdateIdentityConfig) {
    await sql`
      UPDATE identity_ceiling_config
      SET setting_value = ${JSON.stringify(identityCeilingQuestions)}::jsonb,
          updated_at = NOW()
      WHERE setting_key = 'questions'
    `;

    await sql`
      UPDATE identity_ceiling_config
      SET setting_value = ${JSON.stringify(identityCeilingResults)}::jsonb,
          updated_at = NOW()
      WHERE setting_key = 'results'
    `;

    await sql`
      INSERT INTO identity_ceiling_config (setting_key, setting_value, updated_at)
      VALUES ('config_version', ${JSON.stringify(IDENTITY_CEILING_CONFIG_VERSION)}::jsonb, NOW())
      ON CONFLICT (setting_key) DO UPDATE
      SET setting_value = EXCLUDED.setting_value,
          updated_at = NOW()
    `;
  }

  migrated = true;
}
