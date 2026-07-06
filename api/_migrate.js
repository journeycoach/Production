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

  await sql`
    CREATE TABLE IF NOT EXISTS page_visits (
      id         SERIAL PRIMARY KEY,
      page_key   TEXT NOT NULL,
      path       TEXT,
      visited_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_page_visits_page_key_visited_at ON page_visits (page_key, visited_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_page_visits_visited_at ON page_visits (visited_at DESC)`;

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

  const IDENTITY_CEILING_CONFIG_VERSION = '6';

  const identityCeilingQuestions = [
    {
      id: "q1",
      title: "When a high-stakes project starts to drift, which inner pull shows up first?",
      options: [
        { text: "I feel pulled to create visible momentum so the team can regain traction quickly.", ceiling: "achiever" },
        { text: "I feel pulled to understand what is really happening so the team moves with enough clarity.", ceiling: "expert" },
        { text: "I feel pulled to notice the relational temperature so the team stays connected while we address the problem.", ceiling: "harmony" },
        { text: "I feel pulled to clarify ownership so the team can execute with confidence.", ceiling: "control" }
      ]
    },
    {
      id: "q2",
      title: "When the team is stuck and the room feels flat, what responsibility do you most naturally take on?",
      options: [
        { text: "I open up possibility and reframe the problem so people can see a path with more energy.", ceiling: "visionary" },
        { text: "I make sure people have the support they need so they can stay effective under pressure.", ceiling: "rescuer" },
        { text: "I create visible progress so the team can feel momentum again.", ceiling: "achiever" },
        { text: "I diagnose the real issue so the team can move from a stronger understanding.", ceiling: "expert" }
      ]
    },
    {
      id: "q3",
      title: "When a high-stakes assignment you've delegated starts to wobble, what takes the most discipline for you?",
      options: [
        { text: "I hold back from providing the framework so they can strengthen their own judgment.", ceiling: "expert" },
        { text: "I keep the conversation clear so trust and accountability can both stay intact.", ceiling: "harmony" },
        { text: "I define the outcome clearly so they can own the path to getting there.", ceiling: "control" },
        { text: "I give them room to carry the work so they can build capacity through the challenge.", ceiling: "rescuer" }
      ]
    },
    {
      id: "q4",
      title: "When a transition creates uncertainty, what do you most want to protect for the team?",
      options: [
        { text: "I protect trust and emotional safety so people can stay honest and engaged through the change.", ceiling: "harmony" },
        { text: "I protect possibility and forward imagination so the change doesn't shrink what people believe is possible.", ceiling: "visionary" },
        { text: "I protect clarity, standards, and ownership so the change remains coordinated.", ceiling: "control" },
        { text: "I protect momentum so the team can keep confidence and forward movement.", ceiling: "achiever" }
      ]
    },
    {
      id: "q5",
      title: "A strategic conversation is moving too quickly toward a decision. What do you most naturally contribute?",
      options: [
        { text: "I slow the room down to test the assumptions and improve the quality of the thinking.", ceiling: "expert" },
        { text: "I clarify what must be true operationally so the decision can actually be executed well.", ceiling: "control" },
        { text: "I widen the frame so we don't miss a better possibility or a more ambitious direction.", ceiling: "visionary" },
        { text: "I watch the room carefully so the conversation stays candid, connected, and inclusive.", ceiling: "harmony" }
      ]
    },
    {
      id: "q6",
      title: "The team has three competing priorities and limited capacity under pressure. What do you instinctively emphasize?",
      options: [
        { text: "I define the standards, owners, and execution path so the most important work gets done well.", ceiling: "control" },
        { text: "I reframe the priorities around the bigger opportunity so the team has energy and direction.", ceiling: "visionary" },
        { text: "I make sure capacity and support are realistic so people can sustain the work.", ceiling: "rescuer" },
        { text: "I create immediate progress on the most visible priority so the team regains traction.", ceiling: "achiever" }
      ]
    },
    {
      id: "q7",
      title: "A direct report is struggling to deliver under pressure. What do you most naturally do first?",
      options: [
        { text: "I move quickly to recover momentum and get the work back on track.", ceiling: "achiever" },
        { text: "I name what needs attention so the relationship and the accountability both stay clear.", ceiling: "harmony" },
        { text: "I check what support they need so they can recover and stay effective.", ceiling: "rescuer" },
        { text: "I seek to understand what broke down so the real cause can be addressed.", ceiling: "expert" }
      ]
    },
    {
      id: "q8",
      title: "When execution is under strain, which pattern are you most likely to rationalize as good leadership?",
      options: [
        { text: "I increase pace and focus so the team can regain traction.", ceiling: "achiever" },
        { text: "I stay close to execution so the team can protect quality.", ceiling: "control" },
        { text: "I introduce a new angle so the team can recover energy and movement.", ceiling: "visionary" },
        { text: "I increase support so people can stay steady under pressure.", ceiling: "rescuer" }
      ]
    },
    {
      id: "tie-breaker",
      title: "If you had to name what most unsettles you as a leader under pressure, which one resonates most?",
      options: [
        { text: "I am most unsettled by losing momentum and becoming less visibly useful or productive.", ceiling: "achiever" },
        { text: "I am most unsettled by not having the answer and being seen as less prepared or competent.", ceiling: "expert" },
        { text: "I am most unsettled by creating conflict or damaging a relationship that matters.", ceiling: "harmony" },
        { text: "I am most unsettled by losing oversight of something important and having it fail under my watch.", ceiling: "control" },
        { text: "I am most unsettled by getting trapped in routine and losing the freedom to explore what's possible.", ceiling: "visionary" },
        { text: "I am most unsettled by becoming unnecessary and losing my sense of purpose or contribution.", ceiling: "rescuer" }
      ]
    }
  ];

  const identityCeilingResults = {
    achiever: {
      label: "The Achiever's Ceiling",
      diagnosis: "Your strongest signal suggests you have built much of your leadership identity around results, delivery, execution, and being the person who gets things done. People likely trust you because you are dependable, productive, and willing to push through to ensure the finish line is crossed.",
      ceiling: "This ceiling may appear when the next level of leadership requires less personal output and more alignment, vision, and shared ownership. If you keep increasing your own effort after the work has changed, the organization may stay dependent on your horsepower instead of scaling through others.",
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
      diagnosis: "Your strongest signal suggests you became credible because you knew your craft. You likely see patterns, solve problems, give strong answers, and earn trust through deep competence. People may come to you because you understand things at a level others do not.",
      ceiling: "This ceiling may appear when senior leadership requires influence across domains where you are no longer the expert. If you keep needing to be the smartest or most prepared person in the room, you can unintentionally narrow the conversation when the organization needs you to elevate the thinking of others.",
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
      diagnosis: "Your strongest signal suggests you build trust by being steady, relationally aware, and able to keep people connected. You likely notice the tone, tension, morale, and emotional weather in the room, and people may experience you as thoughtful, safe, and considerate.",
      ceiling: "This ceiling may appear when preserving comfort starts replacing telling the truth. Hard decisions can get softened, delayed, or over-explained, and the team may pay for clarity that has not yet been named. The growth edge is productive friction in service of authentic trust.",
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
      diagnosis: "Your strongest signal suggests you have built your reputation by owning important outcomes and making sure things are done well. Your standards are likely high, and you probably see what can go wrong before others do.",
      ceiling: "This ceiling may appear when your span of responsibility exceeds what one person can personally oversee. Delegation can feel risky, so you may stay too close. What begins as excellence, responsibility, or quality control can limit the team's ownership if the process remains too dependent on you.",
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
      diagnosis: "Your strongest signal suggests you build trust by seeing the future, casting a compelling vision, and spotting opportunities others miss. People may be drawn to your energy, your ability to innovate, and your talent for getting things started.",
      ceiling: "This ceiling may appear when the organization needs operational depth, focus, and follow-through more than it needs another pivot. If your default response to constraint or boredom is a new initiative, you can create churn where the team needs protected focus to turn big ideas into actual results.",
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
      diagnosis: "Your strongest signal suggests you build trust by being helpful, available, protective, and willing to carry pressure for others. People may experience you as supportive and dependable, and you may notice what someone needs before they ask.",
      ceiling: "This ceiling may appear when help prevents others from developing ownership, resilience, or capacity. You may absorb tension that belongs elsewhere or relieve pressure that could have grown someone. The growth edge is allowing others to navigate appropriate challenges so the team becomes more self-sufficient.",
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
