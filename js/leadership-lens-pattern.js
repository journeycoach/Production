// Interpret answer patterns without changing scores or assigning another personality label.
export function describePattern(config, outcome) {
  const ranked = config.lenses.slice().sort((a,b)=>outcome.scores[b.id]-outcome.scores[a.id]);
  const top = outcome.scores[ranked[0].id];
  const tied = ranked.filter(l=>outcome.scores[l.id]===top);
  const gap = top-outcome.scores[ranked[1].id];
  const close = typeof outcome.needsReflection==='boolean' ? outcome.needsReflection : gap<=1;
  if (!close) return null;
  const points = outcome.unit==='points';
  const candidates = tied.length>1 ? tied : ranked.slice(0,2);
  const selected = config.lenses.find(l=>l.id===outcome.primary);
  const counts = ranked.map(l=>outcome.scores[l.id]).join('–');
  let title, explanation;
  if(tied.length===3) {
    title='An evenly distributed response pattern';
    explanation=`Your ${counts} scores give each lens equal weight in these answers. The scored questions do not point to a single leading lens. Different situations may bring different concerns forward, or several answers may have felt equally familiar.`;
  } else if(tied.length===2) {
    title='Two perspectives share the lead';
    explanation=points ? `${tied[0].name} and ${tied[1].name} each earned ${top} points.` : `${tied[0].name} and ${tied[1].name} each received ${top} of your ${outcome.total} answers.`;
    explanation+=` Neither leads on the scored questions. Consider what draws you to each perspective and when that concern becomes most noticeable.`;
  } else {
    title='Two perspectives are close';
    explanation=points
      ? `${ranked[0].name} earned ${top} points and ${ranked[1].name} earned ${outcome.scores[ranked[1].id]}. That small difference is a useful starting point for reflection, rather than a firm distinction between the two.`
      : `${ranked[0].name} received ${top} of your ${outcome.total} answers, and ${ranked[1].name} received ${outcome.scores[ranked[1].id]}. That one-answer difference is a useful starting point for reflection, rather than a firm distinction between the two.`;
  }
  const resolved=outcome.reflectionResolved || outcome.usedClarification;
  const reflection=resolved && selected
    ? `Your final reflection points toward ${selected.name} as a place to begin. It does not change your original scores.${selected.id!==ranked[0].id && tied.length===1 ? ` That is why this profile is shown even though ${ranked[0].name} has the higher original score.` : ''}`
    : 'Compare the concerns below before deciding which perspective feels most familiar.';
  const prompts={
    head:'Am I trying to gain enough understanding, clarity, or options to feel prepared?',
    heart:'Am I attending to what my contribution means and whether I feel valued or respected?',
    gut:'Am I trying to stay true to my own judgment, boundaries, or sense of what is right?'
  };
  return {title,explanation,reflection,candidates:candidates.map(l=>({id:l.id,name:l.name,prompt:prompts[l.id]})),question:'Recall a recent leadership situation. What mattered most underneath your first reaction? Does that same concern show up in other situations?',note:'These scores describe your choices in this assessment. A lower score does not mean you lack that capacity, and a mixed pattern does not by itself demonstrate greater balance or flexibility.'};
}
