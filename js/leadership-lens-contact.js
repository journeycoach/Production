// Transfer only an explicitly requested result summary within this browser tab.
// Percentages represent shares of the original scored answers, not diagnostic confidence.
export const CONTACT_SUMMARY_KEY = 'leadership-lens-contact-v1';
export function buildContactSummary(config, outcome) {
  const centers = ['head', 'heart', 'gut'];
  const points = outcome.unit==='points';
  // Ranked results share out 3 points per question; older single-choice results share 1.
  const total = points ? outcome.total : (config.sections?.reduce((n,s)=>n+s.questions.length,0) || outcome.total);
  const unit = points ? 'points' : 'answers';
  if (!Number.isInteger(total) || total<=0 || !centers.includes(outcome.primary) || !centers.every(c => Number.isInteger(outcome.scores[c]) && outcome.scores[c] >= 0 && outcome.scores[c] <= total) || centers.reduce((total,c) => total + outcome.scores[c], 0) !== total) throw new Error('A completed result is required.');
  const names = Object.fromEntries(centers.map(c => [c, config.lenses.find(l => l.id === c)?.name || c]));
  return [
    'My Leadership Lens assessment results',
    `Primary lens: ${names[outcome.primary]}`,
    ...centers.map(c => `${names[c]}: ${Number((outcome.scores[c] / total * 100).toFixed(1))}% (${outcome.scores[c]} of ${total} ${unit})`),
    `Response pattern: ${outcome.strength}`,
    ...(outcome.usedClarification || outcome.usedTiebreaker ? ['Primary lens clarified through the final reflection; original scores unchanged.'] : []),
    points ? `Percentages show each lens's share of the ${total} points from my most-like-me and least-like-me choices, not diagnostic confidence. Rounded percentages may not total exactly 100%.` : `Percentages show the share of my ${total} answers, not diagnostic confidence. Rounded percentages may not total exactly 100%.`,
    '',
    'I would like to explore what these results mean for my leadership.'
  ].join('\n');
}
export function prefillContactSummary(storage, field, search) {
  if (!field || new URLSearchParams(search).get('assessment') !== 'leadership-lens') return false;
  try {
    const summary = storage.getItem(CONTACT_SUMMARY_KEY);
    if (!summary || summary.length > 5000) return false;
    // Preserve anything already written or restored by the browser.
    if (!field.value.includes(summary)) field.value = field.value.trim() ? `${field.value}\n\n${summary}` : summary;
    storage.removeItem(CONTACT_SUMMARY_KEY);
    return true;
  } catch { return false; }
}
