import {prefillContactSummary} from './leadership-lens-contact.js?v=3';
const field = document.getElementById('cf-message');
try {
  if (prefillContactSummary(sessionStorage, field, location.search)) {
    field.dispatchEvent(new Event('input', {bubbles:true}));
    const url = new URL(location.href);
    url.searchParams.delete('assessment');
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  }
} catch { /* The contact form works normally without browser storage. */ }
