import { useEffect, useRef, useState } from 'react';
import { apiUrl } from '../apiBase';

function buildMenuContext(menu) {
  if (!Array.isArray(menu)) {
    return [];
  }

  return menu.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    description: item.description,
    basePrice: item.basePrice,
    toppings: (item.toppings || []).map((topping) => ({
      name: topping.name,
      price: topping.price
    }))
  }));
}

function buildCartSummary(cart) {
  if (!Array.isArray(cart) || cart.length === 0) {
    return '';
  }

  return cart
    .map((line) => {
      const qty = line.quantity ?? 1;
      const title = line.displayName || line.name || 'Drink';
      const toppings =
        Array.isArray(line.displayToppings) && line.displayToppings.length > 0
          ? line.displayToppings.join(', ')
          : Array.isArray(line.toppings)
            ? line.toppings.join(', ')
            : '';
      const toppingPart = toppings ? `; toppings: ${toppings}` : '';
      const notePart = line.notes ? `; note: ${line.notes}` : '';
      const total = Number(line.total ?? 0).toFixed(2);
      return `${qty}× ${title} — ${line.size}, sweetness ${line.sweetness}, ice ${line.ice}${toppingPart}${notePart}; $${total}`;
    })
    .join('\n');
}

export default function PersonalAssistant({
  menu,
  cart,
  language,
  labels,
  ttsEnabled,
  speakText
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    return undefined;
  }, [messages, open, loading]);

  useEffect(() => {
    if (!open || messages.length > 0) {
      return undefined;
    }

    const welcome =
      labels?.assistantWelcome ||
      'Hi! Ask me about our drinks, toppings, dietary questions, or how checkout works.';

    setMessages([{ role: 'assistant', content: welcome }]);

    if (ttsEnabled && typeof speakText === 'function') {
      speakText(welcome);
    }

    return undefined;
  }, [open, messages.length, labels?.assistantWelcome, ttsEnabled, speakText]);

  async function handleSend(event) {
    event.preventDefault();

    const text = draft.trim();
    if (!text || loading) {
      return;
    }

    const userMessage = { role: 'user', content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft('');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiUrl('/api/assistant/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          menuContext: buildMenuContext(menu),
          cartSummary: buildCartSummary(cart),
          replyLanguage: language || 'en'
        })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const detail = payload.details || payload.error || 'Assistant unavailable.';
        throw new Error(detail);
      }

      const reply = typeof payload.reply === 'string' ? payload.reply.trim() : '';
      if (!reply) {
        throw new Error('Assistant returned an empty reply.');
      }

      setMessages((current) => [...current, { role: 'assistant', content: reply }]);

      if (ttsEnabled && typeof speakText === 'function') {
        speakText(reply);
      }
    } catch (sendError) {
      const errorMessage = sendError.message || 'Something went wrong.';
      setError(errorMessage);

      if (ttsEnabled && typeof speakText === 'function') {
        speakText(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }

  const title = labels?.assistantTitle || 'Personal Assistant';
  const placeholder = labels?.assistantPlaceholder || 'Ask about the menu or ordering…';
  const sendLabel = labels?.assistantSend || 'Send';
  const thinkingLabel = labels?.assistantThinking || 'Thinking…';

  return (
    <div className="personal-assistant">
      <button
        type="button"
        className="personal-assistant__launcher"
        aria-label={title}
        aria-expanded={open}
        aria-controls="personal-assistant-panel"
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="personal-assistant__launcher-icon" aria-hidden>
          ✦
        </span>
        <span className="personal-assistant__launcher-text">{title}</span>
      </button>

      <div
        className="personal-assistant__panel"
        id="personal-assistant-panel"
        role="dialog"
        aria-label={title}
        hidden={!open}
        aria-hidden={!open}
      >
          <div className="personal-assistant__header">
            <div>
              <p className="personal-assistant__eyebrow">Gemini</p>
              <h3 className="personal-assistant__title">{title}</h3>
            </div>
            <button
              type="button"
              className="personal-assistant__close"
              onClick={() => setOpen(false)}
              aria-label={labels?.assistantClose || 'Close assistant'}
            >
              ×
            </button>
          </div>

          <div className="personal-assistant__messages" role="log" aria-live="polite">
            {messages.map((entry, index) => (
              <div
                key={`${entry.role}-${index}-${entry.content.slice(0, 12)}`}
                className={`personal-assistant__bubble personal-assistant__bubble--${entry.role}`}
              >
                <p className="personal-assistant__bubble-meta">
                  {entry.role === 'user' ? labels?.assistantYou || 'You' : title}
                </p>
                <p className="personal-assistant__bubble-body">{entry.content}</p>
              </div>
            ))}
            {loading ? (
              <div className="personal-assistant__bubble personal-assistant__bubble--assistant personal-assistant__bubble--pending">
                <p className="personal-assistant__bubble-body">{thinkingLabel}</p>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          {error ? <p className="personal-assistant__error">{error}</p> : null}

          <form className="personal-assistant__composer" onSubmit={handleSend}>
            <label className="visually-hidden" htmlFor="assistant-input">
              {placeholder}
            </label>
            <textarea
              id="assistant-input"
              className="personal-assistant__input"
              rows={2}
              value={draft}
              placeholder={placeholder}
              onChange={(event) => setDraft(event.target.value)}
              disabled={loading}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSend(event);
                }
              }}
            />
            <button type="submit" className="personal-assistant__send" disabled={loading || !draft.trim()}>
              {sendLabel}
            </button>
          </form>
      </div>
    </div>
  );
}
