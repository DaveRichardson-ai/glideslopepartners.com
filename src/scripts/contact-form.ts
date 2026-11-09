// Progressive enhancement for the contact form. The form posts normally
// without this script; with it, the Turnstile spam check loads and the
// time-to-submit field is set.
const TURNSTILE = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
    };
  }
}

let loading: Promise<void> | undefined;
function loadTurnstile(): Promise<void> {
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = TURNSTILE;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Spam check failed to load'));
    document.head.append(s);
  });
  return loading;
}

async function mount(form: HTMLFormElement) {
  const slot = form.querySelector<HTMLElement>('[data-turnstile-slot]');
  if (!slot || slot.dataset.mounted) return;
  slot.dataset.mounted = '1';
  try {
    await loadTurnstile();
    window.turnstile?.render(slot, {
      sitekey: slot.dataset.sitekey,
      theme: 'dark',
      appearance: 'always',
      'response-field-name': 'cf-turnstile-response',
    });
  } catch {
    slot.textContent = 'The spam check did not load. Refresh the page, or email hello@glideslopepartners.com.';
  }
}

for (const form of document.querySelectorAll<HTMLFormElement>('form[data-contact-form]')) {
  const started = form.querySelector<HTMLInputElement>('[data-started]');
  if (started) started.value = String(Date.now());

  if (form.dataset.turnstile === 'eager') {
    void mount(form);
  } else {
    const go = () => void mount(form);
    form.addEventListener('focusin', go, { once: true });
    form.addEventListener('pointerenter', go, { once: true });
  }

  form.addEventListener('submit', () => {
    const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Sending…';
    }
  });
}

// Move focus to the error summary when the server sent us back with an error.
const summary = document.getElementById('form-errors');
if (summary && !summary.hidden) summary.focus();

export {};
