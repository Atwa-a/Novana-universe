
import React, { useEffect, useRef, useState } from 'react';
type FAQ = { id: string; q: string; a: React.ReactNode };

const FAQ_LIST: FAQ[] = [
  {
    id: 'what-is-novana',
    q: 'What is Novana Universe?',
    a: (
      <p className="text-gray-300 text-sm">
        Novana Universe is a place for memory‑keepers — tools and stories that help families
        collect, preserve, and share meaningful moments together.
      </p>
    ),
  },
  {
    id: 'response-time',
    q: 'How fast do you reply to messages?',
    a: (
      <p className="text-gray-300 text-sm">
        We aim to respond within 24 hours on weekdays. Urgent issues get prioritized; include
        “URGENT” in your subject for the fastest triage.
      </p>
    ),
  },
  {
    id: 'privacy',
    q: 'Is my data private and secure?',
    a: (
      <div className="text-gray-300 text-sm space-y-2">
        <p>
          Yes. Messages come straight to our support inbox. We never sell personal data and we
          access your content only for support and product improvement.
        </p>
        <p>
          If you prefer, you can redact names or attachments — just tell us what cannot be stored.
        </p>
      </div>
    ),
  },
  {
    id: 'share-photos',
    q: 'How do I share large files or lots of photos?',
    a: (
      <div className="text-gray-300 text-sm space-y-2">
        <p>
          For files over 25MB, send a public or expiring link (Google Drive, iCloud, Dropbox). Make
          sure the link is accessible to <code>support@novana.universe</code>.
        </p>
      </div>
    ),
  },
  
];

// --- URL hash helpers (sandbox-safe) ---
function canUseHistoryReplace(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const href = window.location?.href ?? '';
    if (!href || href.startsWith('about:')) return false; // sandbox srcdoc
    return typeof window.history?.replaceState === 'function';
  } catch {
    return false;
  }
}

function setUrlHash(hash: string | null) {
  if (typeof window === 'undefined') return;
  const normalized = hash ? `#${hash.replace(/^#/, '')}` : '';
  if (canUseHistoryReplace()) {
    try {
      const base = window.location.pathname + window.location.search;
      window.history.replaceState(null, '', normalized || base);
      return;
    } catch {
      // fall through to hash assignment
    }
  }
  try {
    window.location.hash = normalized; // safer fallback in sandbox
  } catch {
    // ignore silently
  }
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.17l3.71-2.94a.75.75 0 1 1 .94 1.16l-4.24 3.36a.75.75 0 0 1-.94 0L5.21 8.39a.75.75 0 0 1 .02-1.18z" />
    </svg>
  );
}

function FAQItem({
  item,
  open,
  onToggle,
  index,
}: {
  item: FAQ;
  open: boolean;
  onToggle: () => void;
  index: number;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [max, setMax] = useState(0);

  useEffect(() => {
    
    const el = contentRef.current;
    if (el) setMax(el.scrollHeight);
  }, [open]);

  const panelId = `faq-panel-${item.id}`;
  const buttonId = `faq-button-${item.id}`;

  return (
    <div className="border-b border-white/10">
      <button
        id={buttonId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="w-full py-3 text-left flex items-center justify-between gap-3 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/60"
      >
        <span className="text-sm font-medium text-gray-200">{item.q}</span>
        <Chevron open={open} />
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        ref={contentRef}
        style={{ maxHeight: open ? max : 0 }}
        className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
      >
        <div className="pb-4 pr-1">{item.a}</div>
      </div>
    </div>
  );
}

function FAQAccordion({ faqs }: { faqs: FAQ[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Deep-link handling (#faq-*)
  useEffect(() => {
    const pickFromHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (!hash) return;
      const idx = faqs.findIndex((f) => `faq-${f.id}` === hash || f.id === hash);
      if (idx >= 0) setOpenIndex(idx);
    };

    pickFromHash();
    window.addEventListener('hashchange', pickFromHash);
    return () => window.removeEventListener('hashchange', pickFromHash);
  }, [faqs]);

  const toggle = (i: number) => {
    setOpenIndex((prev) => {
      const next = prev === i ? null : i;
      const nextHash = next === null ? null : `faq-${faqs[i].id}`;
      // Why: keep URL shareable without breaking sandbox environments.
      setUrlHash(nextHash);
      return next;
    });
  };

  return (
    <div className="divide-y divide-white/10">
      {faqs.map((item, i) => (
        <FAQItem key={item.id} item={item} index={i} open={openIndex === i} onToggle={() => toggle(i)} />
      ))}
      <div className="pt-3 text-xs text-gray-400">
        Can’t find an answer? <a className="underline hover:text-gray-200" href="mailto:support@novana.universe">Email us</a> — we’re happy to help.
      </div>
    </div>
  );
}

const ContactPage: React.FC = () => {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [sent, setSent] = useState(false);

  const onChange =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    setSubmitting(true);

    try {
      const body = encodeURIComponent(
        `From: ${form.name} <${form.email}>\n\nSubject: ${form.subject || '(No subject)'}\n\n${form.message}`
      );
      if (typeof window !== 'undefined') {
        window.location.href = `mailto:support@novana.universe?subject=${encodeURIComponent(
          `[Contact] ${form.subject || 'General'}`
        )}&body=${body}`;
      }
      setSent(true);
      setForm({ name: '', email: '', subject: '', message: '' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="space-nav">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl sm:text-2xl font-bold text-gradient truncate">
              Novana Universe
            </span>
            <span className="hidden sm:block text-xs text-gray-400">Contact</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Using an anchor to avoid Router dependency. */}
            <a
              href="/dashboard"
              className="space-button text-xs sm:text-sm px-3 sm:px-4 py-2"
            >
              Dashboard
            </a>
          </div>
        </div>
      </div>

      {/* Main */}
      <main className="min-h-screen px-4 pt-16 sm:pt-20 z-10 relative">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Contact form */}
          <section className="lg:col-span-7">
            <div className="glass-card p-6 sm:p-8">
              <h1 className="text-xl sm:text-2xl font-semibold mb-1">Get in touch</h1>
              <p className="text-gray-400 text-sm mb-4">
                Whether it's a question, feedback, or just a hello — we'd love to hear from you.
              </p>

              {sent && (
                <div className="mb-4 rounded-lg border border-accent/40 bg-accent/10 p-3 text-accent text-sm">
                  Thanks! Your message was prepared in your email app. If it didn't open, email us directly at{' '}
                  <a href="mailto:support@novana.universe" className="underline">support@novana.universe</a>.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Your Name</label>
                    <input
                      className="space-input w-full"
                      placeholder="Jane Doe"
                      value={form.name}
                      onChange={onChange('name')}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Email</label>
                    <input
                      type="email"
                      className="space-input w-full"
                      placeholder="jane@example.com"
                      value={form.email}
                      onChange={onChange('email')}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Subject</label>
                  <input
                    className="space-input w-full"
                    placeholder="I have an idea…"
                    value={form.subject}
                    onChange={onChange('subject')}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Message</label>
                  <textarea
                    className="space-input w-full min-h-[140px] resize-y"
                    placeholder="Tell us everything ✨"
                    value={form.message}
                    onChange={onChange('message')}
                    required
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="space-button-primary px-5 py-2.5"
                  >
                    {submitting ? 'Sending…' : 'Send Message'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ name: '', email: '', subject: '', message: '' })}
                    className="space-button"
                  >
                    Clear
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* Sidebar contact info */}
          <aside className="lg:col-span-5 flex flex-col gap-6">
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold mb-2">Reach us directly</h2>
              <p className="text-gray-400 text-sm mb-2">
                Email{' '}
                <a href="mailto:support@novana.universe" className="text-accent hover:text-accent/80">
                  support@novana.universe
                </a>
              </p>
              <p className="text-gray-400 text-sm">We aim to respond within 24 hours ✨</p>
            </div>

            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold mb-2">Follow our journey</h2>
              <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                <span className="glass-chip">#memory-keepers</span>
                <span className="glass-chip">#families</span>
                <span className="glass-chip">#together</span>
              </div>
            </div>

            {/* Smart FAQ */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold mb-3">FAQ</h2>
              <FAQAccordion faqs={FAQ_LIST} />
            </div>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/10 px-4 sm:px-6 py-4 text-center text-[12px] text-gray-400 mt-8">
        © {new Date().getFullYear()} — All rights reserved • created by <span className="text-gradient font-semibold">A_ATWA</span>
      </footer>

    </>
  );
};

export default ContactPage;
