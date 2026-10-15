import {loadConfig,score,validateConfig} from './leadership-lens-core.js';
(async function () {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const status = document.getElementById('load-status');
  const params = new URLSearchParams(location.search);
  const preview = params.has('lens');
  let draft, outcome, key;
  try {
    if (preview) {
      draft = await loadConfig(); key = params.get('lens');
      try { const r=await fetch('/api/admin/settings',{cache:'no-store'}); if(r.ok){const b=await r.json();if(b.data?.leadership_lens_draft_v1) draft=JSON.parse(b.data.leadership_lens_draft_v1);} } catch {}
      outcome={scores:Object.fromEntries(['head','heart','gut'].map(c=>[c,c===key?4:1])),strength:'Strong preference',gap:3,usedTiebreaker:false};
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
  document.getElementById('result').innerHTML = `<p class="eyebrow">Your Leadership Lens</p><h1>${esc(lens.name)}</h1><p class="headline">${esc(lens.description)}</p><p class="muted">A natural way of seeing, not a fixed identity. You can draw on all three lenses.</p><div class="scores">${draft.lenses.map(l => `<div class="score ${l.id === key ? 'primary' : ''}"><span>${esc(l.name)}</span><strong>${outcome.scores[l.id] || 0}<small> / 6</small></strong><progress max="6" value="${outcome.scores[l.id] || 0}" aria-label="${esc(l.name)} ${preview ? 'illustrative ' : ''}score"></progress></div>`).join('')}</div><p class="muted">${preview ? 'Preview scores only. ' : ''}${esc(outcome.strength)}${outcome.usedTiebreaker ? ' — selected through the final reflection; original scores unchanged.' : '.'} Preference describes consistency of answers, not statistical confidence or diagnostic accuracy.</p>${panel('Where Your Attention Goes',lens.attention)}<div class="sides">${panel('The High Side',lens.high)}${panel('The Low Side',lens.low)}</div>${panel('Your Leadership Opportunity',lens.opportunity,'opportunity')}<p class="reflection">${esc(lens.reflection)}</p><details><summary>Explore your other lenses</summary><p>${(() => { const top=Math.max(...others.map(l=>outcome.scores[l.id])); const second=others.filter(l=>outcome.scores[l.id]===top); return second.length===1 ? 'Your secondary perspective is '+esc(second[0].name)+'.' : 'Your other two lenses are tied; there is no single secondary lens.'; })()} These are perspectives you can access, not separate personality categories. ${outcome.gap<=1 ? 'Your scores are close, suggesting you may draw on multiple lenses.' : 'Explore what these other perspectives could add.'}</p>${others.map(l => `<h3>${esc(l.name)}</h3><p>${esc(l.attention)}</p>`).join('')}</details><h2>From recognition to greater choice</h2><p>The assessment identifies a pattern. Coaching explores its impact and helps you develop greater awareness and choice.</p><div class="coaching">${[['Recognize','Where do you see this pattern showing up?'],['Appreciate','How has this perspective contributed to your success?'],['Examine','When has this same strength worked against you?'],['Expand','What might you see if you brought another lens into the situation?']].map(([t,q]) => `<section class="panel"><h3>${t}</h3><p>${q}</p></section>`).join('')}</div><section class="closing"><h2>What are you not seeing because of the way you naturally see?</h2><p>Explore that question through executive coaching with Your Journey Coach.</p><a href="/#contact">Let’s talk about your leadership</a></section><p class="muted">An Enneagram-informed reflection tool, not an Enneagram typing assessment or a validated psychological instrument.</p>`;
})();
