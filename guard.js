export function trustedFunctions(config) {
  if (!config || typeof config !== 'object') return null;
  const functionsUrl = String(config.functionsUrl || '').trim().replace(/\/$/, '');
  const supabaseOrigin = String(config.supabaseOrigin || '').trim();
  const anonKey = String(config.anonKey || '').trim();
  if (!functionsUrl || !supabaseOrigin || !anonKey) return null;
  try {
    const fn = new URL(functionsUrl);
    const origin = new URL(supabaseOrigin);
    if (origin.pathname !== '/' || origin.search || origin.hash) return null;
    if (fn.username || fn.password || origin.username || origin.password) return null;
    if (fn.search || fn.hash) return null;
    const localHost = fn.hostname === 'localhost' || fn.hostname === '127.0.0.1';
    const originLocal = origin.hostname === 'localhost' || origin.hostname === '127.0.0.1';
    const httpsOk = fn.protocol === 'https:' && origin.protocol === 'https:';
    const localOk = fn.protocol === 'http:' && origin.protocol === 'http:' && localHost && originLocal;
    if (!httpsOk && !localOk) return null;
    if (fn.origin !== origin.origin) return null;
    return { functionsUrl, anonKey };
  } catch {
    return null;
  }
}

export function allowedStripeHref(url) {
  if (typeof url !== 'string' || !url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) return '';
    if (parsed.origin === 'https://checkout.stripe.com' || parsed.origin === 'https://billing.stripe.com') {
      return parsed.href;
    }
  } catch {
    /* Fail closed on unparseable redirects. */
  }
  return '';
}

export function ticketEmail(ticket) {
  if (typeof ticket !== 'string' || !ticket) return '';
  try {
    const dot = ticket.lastIndexOf('.');
    if (dot <= 0) return '';
    const body = ticket.slice(0, dot);
    const padded = body.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((body.length + 3) % 4);
    const claims = JSON.parse(atob(padded));
    return claims && typeof claims.email === 'string' ? claims.email : '';
  } catch {
    return '';
  }
}

export function shouldAutoStartCheckout(input) {
  return Boolean(
    input
    && typeof input.ticket === 'string'
    && input.ticket
    && typeof input.functionsUrl === 'string'
    && input.functionsUrl
    && !input.canceled,
  );
}

export function subscribeFallbackMessage(input) {
  if (!input || typeof input.ticket !== 'string' || !input.ticket || typeof input.functionsUrl !== 'string' || !input.functionsUrl) {
    return 'Open this page from BibleBubby to subscribe.';
  }
  if (typeof input.error === 'string' && input.error.trim()) return input.error.trim();
  return 'Checkout could not start.';
}

function el(document, tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function txt(document, tag, className, text) {
  const node = el(document, tag, className);
  node.textContent = typeof text === 'string' ? text : '';
  return node;
}

export function buildSubscribe(document, root, input) {
  root.textContent = '';
  root.appendChild(txt(document, 'h1', '', input.headline));
  if (input.email) root.appendChild(txt(document, 'p', 'email', input.email));
  const list = el(document, 'ul', 'outcomes');
  for (const line of input.outcomes) {
    const item = el(document, 'li');
    const check = txt(document, 'span', 'check', '✓');
    check.setAttribute('aria-hidden', 'true');
    item.appendChild(check);
    item.appendChild(txt(document, 'span', '', line));
    list.appendChild(item);
  }
  root.appendChild(list);
  const plan = el(document, 'div', 'plan');
  if (input.badge) plan.appendChild(txt(document, 'div', 'badge', input.badge));
  plan.appendChild(txt(document, 'strong', '', input.label));
  plan.appendChild(txt(document, 'p', 'price', input.detail));
  root.appendChild(plan);
  const button = el(document, 'button', '');
  button.type = 'button';
  button.id = 'pay';
  button.textContent = input.cta;
  root.appendChild(button);
  const error = el(document, 'p', 'error hidden');
  error.id = 'error';
  root.appendChild(error);
  return { button, error };
}
