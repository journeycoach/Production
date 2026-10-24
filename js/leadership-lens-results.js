import {describePattern} from './leadership-lens-pattern.js?v=3';
import {buildContactSummary,CONTACT_SUMMARY_KEY} from './leadership-lens-contact.js?v=4';
import {loadConfig,score,validateConfig,upgradeConfig} from './leadership-lens-core.js?v=8';
(async function () {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const status = document.getElementById('load-status');
  const params = new URLSearchParams(location.search);
  const preview = params.has('lens');
  let draft, outcome, key;
  try {
    if (preview) {
      draft = await loadConfig(); key = params.get('lens');
      try { const r=await fetch('/api/admin/settings',{cache:'no-store'}); if(r.ok){const b=await r.json();if(b.data?.leadership_lens_draft_v1) draft=upgradeConfig(JSON.parse(b.data.leadership_lens_draft_v1));} } catch {}
      outcome={mode:'ranked',unit:'points',questions:9,total:27,max:18,scores:Object.fromEntries(['head','heart','gut'].map(c=>[c,c===key?15:6])),strength:'Strong preference',gap:9,usedTiebreaker:false};
    } else {
      const session=JSON.parse(sessionStorage.getItem('leadership-lens-result-v1'));
      draft=validateConfig(session?.config);outcome=score(draft,session.answers,session.tie);key=outcome.primary;
      if(!key) throw new Error();
      document.querySelector('.draft-banner').hidden=true;
      document.querySelector('.profile-tabs').hidden=true;
      const back=document.querySelector('.lens-header a:last-child');back.href='/Leadership-Lens.html';back.textContent='Retake assessment';
    }
  } catch { status.innerHTML='Complete the assessment to see your results. <a href="/Leadership-Lens.html">Begin Leadership-Lens</a>';return; }
  const lens = draft.lenses.find(l => l.id === key);
  if (!lens) { status.textContent = 'This profile is unavailable. Choose a lens above or return to Assessment Studio.'; return; }
  document.querySelector(`.profile-tabs a[href="?lens=${['head','heart','gut'].includes(key) ? key : ''}"]`)?.setAttribute('aria-current','page');
  document.title = `${lens.name} | Your Journey Coach`;
  const others = draft.lenses.filter(l => l.id !== key);
  const panel = (title, text, cls='') => `<section class="panel ${cls}"><h2>${title}</h2><p>${esc(text)}</p></section>`;
  const pattern = describePattern(draft,outcome);
  const patternPanel = pattern ? `<section class="panel mixed-pattern" aria-labelledby="pattern-title"><h2 id="pattern-title">${esc(pattern.title)}</h2><p>${esc(pattern.explanation)}</p><p>${esc(pattern.reflection)}</p><h3>Compare the concerns underneath your reactions</h3><div class="pattern-prompts">${pattern.candidates.map(l=>`<div><h4>${esc(l.name)}</h4><p>${esc(l.prompt)}</p></div>`).join('')}</div><p class="pattern-question">${esc(pattern.question)}</p><p class="muted">${esc(pattern.note)}</p></section>` : '';
  document.getElementById('result').innerHTML = `<p class="eyebrow">Your Leadership Lens</p><h1>${esc(lens.name)}</h1><p class="headline">${esc(lens.description)}</p><p class="muted">Your lens reflects one of the three centers of intelligence in the Enneagram: Head, Heart, and Gut. You can draw on all three.</p><div class="scores">${draft.lenses.map(l => `<div class="score ${l.id === key ? 'primary' : ''}"><span>${esc(l.name)}</span><strong>${outcome.scores[l.id] || 0}<small> / ${outcome.max || outcome.total}${outcome.unit==='points' ? ' pts' : ''}</small></strong><progress max="${outcome.max || outcome.total}" value="${outcome.scores[l.id] || 0}" aria-label="${esc(l.name)} ${preview ? 'illustrative ' : ''}score"></progress></div>`).join('')}</div><p class="muted">${preview ? 'Preview scores only. ' : ''}${esc(outcome.strength)}${outcome.usedClarification ? '. Your final reflection suggests this profile as a starting point; original scores unchanged.' : outcome.usedTiebreaker ? '. Your final reflection suggests this profile as a starting point; original scores unchanged.' : '.'} Preference reflects how consistent your answers were, not a fixed type.</p>${outcome.unit==='points' ? '<p class="muted">For each question, Most like me earns 2 points, the unmarked answer earns 1, and Least like me earns 0. Each lens can earn up to 18 points. Your three scores together total 27. The contact summary expresses each score as a share of those 27 points, so its percentages use a different denominator from these bars.</p>' : ''}${patternPanel}${panel('Where Your Attention Goes',lens.attention)}<div class="sides">${panel('The High Side',lens.high)}${panel('The Low Side',lens.low)}</div>${panel('Your Leadership Opportunity',lens.opportunity,'opportunity')}<p class="reflection">${esc(lens.reflection)}</p><details><summary>Explore your other lenses</summary><p>${(() => { if(pattern) return 'Compare these perspectives with the profile above.'; const top=Math.max(...others.map(l=>outcome.scores[l.id])); const second=others.filter(l=>outcome.scores[l.id]===top); return second.length===1 ? 'Your secondary perspective is '+esc(second[0].name)+'.' : 'Your other two lenses are tied; there is no single secondary lens.'; })()} ${pattern ? '' : 'Explore what these other perspectives could add.'}</p>${others.map(l => `<h3>${esc(l.name)}</h3><p>${esc(l.attention)}</p>`).join('')}</details><h2>From recognition to greater choice</h2><p>Your responses suggest a pattern. Coaching explores its impact and helps you develop greater awareness and choice.</p><div class="coaching">${[['Recognize','Where do you see this pattern showing up?'],['Appreciate','How has this perspective contributed to your success?'],['Examine','When has this same strength worked against you?'],['Expand','What might you see if you brought another lens into the situation?']].map(([t,q]) => `<section class="panel"><h3>${t}</h3><p>${q}</p></section>`).join('')}</div><section class="closing"><h2>What are you not seeing because of the way you naturally see?</h2><p>Explore that question through executive coaching with Your Journey Coach.</p><a id="leadership-contact" href="/${preview ? '' : '?assessment=leadership-lens'}#contact">Let’s talk about your leadership</a></section><p class="muted">An Enneagram-informed leadership reflection that helps you recognize your natural perspective, appreciate its strengths, and explore opportunities for greater awareness and choice.</p>`;
  if (!preview) document.getElementById('leadership-contact').addEventListener('click', () => {
    try { sessionStorage.setItem(CONTACT_SUMMARY_KEY, buildContactSummary(draft, outcome)); } catch { /* Contact remains available if storage is blocked. */ }
  });
})();
