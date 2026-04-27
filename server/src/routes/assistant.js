import { Router } from 'express';
import axios from 'axios';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const FALLBACK_MODELS = String(process.env.GEMINI_FALLBACK_MODELS || 'gemini-2.5-flash-lite')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)
  .filter((value, index, list) => list.indexOf(value) === index && value !== MODEL);

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableGeminiError(error) {
  const status = Number(error?.response?.status || 0);
  const message = String(error?.response?.data?.error?.message || error?.message || '').toLowerCase();

  return status === 429
    || status === 500
    || status === 503
    || message.includes('high demand')
    || message.includes('overloaded')
    || message.includes('try again later')
    || message.includes('resource exhausted');
}

async function requestGeminiReply({ apiKey, model, systemContent, history }) {
  const geminiResponse = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      system_instruction: {
        parts: [{ text: systemContent }]
      },
      contents: history.map((entry) => ({
        role: entry.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: entry.content }]
      })),
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 800
      }
    },
    {
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 20000
    }
  );

  const parts = geminiResponse.data?.candidates?.[0]?.content?.parts;
  return Array.isArray(parts)
    ? parts
        .map((part) => (typeof part?.text === 'string' ? part.text : ''))
        .join('')
        .trim()
    : '';
}

function clampHistory(messages, maxMessages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return [];
  }
  const sliceStart = Math.max(0, messages.length - maxMessages);
  return messages.slice(sliceStart);
}

function buildMenuDigest(menuContext) {
  if (!Array.isArray(menuContext) || menuContext.length === 0) {
    return 'No menu data was provided. Say that you cannot see the live menu and suggest refreshing the page.';
  }

  const lines = menuContext.map((item) => {
    const name = item?.name ?? 'Unknown';
    const category = item?.category ?? '';
    const description = item?.description ?? '';
    const basePrice = item?.basePrice != null ? Number(item.basePrice).toFixed(2) : '?';
    const toppingSummary = Array.isArray(item?.toppings)
      ? item.toppings
          .map((t) => `${t?.name ?? 'topping'} (+$${Number(t?.price ?? 0).toFixed(2)})`)
          .join(', ')
      : '';
    return `- id ${item?.id}: ${name} [${category}] — $${basePrice}. ${description}${
      toppingSummary ? ` Toppings: ${toppingSummary}.` : ''
    }`;
  });

  return lines.join('\n');
}

export function createAssistantRouter() {
  const router = Router();

  router.post('/chat', async (request, response) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return response.status(503).json({
        error: 'Personal assistant is not configured.',
        details: 'Add GEMINI_API_KEY to the server environment (e.g. server/.env).'
      });
    }

    try {
      const { messages, menuContext, cartSummary, replyLanguage } = request.body ?? {};

      if (!Array.isArray(messages) || messages.length === 0) {
        return response.status(400).json({
          error: 'messages must be a non-empty array of { role, content }.'
        });
      }

      const sanitized = messages
        .filter(
          (entry) =>
            entry &&
            (entry.role === 'user' || entry.role === 'assistant') &&
            typeof entry.content === 'string' &&
            entry.content.trim().length > 0
        )
        .map((entry) => ({
          role: entry.role,
          content: entry.content.trim().slice(0, 8000)
        }));

      if (sanitized.length === 0) {
        return response.status(400).json({
          error: 'No valid chat messages were provided.'
        });
      }

      const history = clampHistory(sanitized, 24);
      const menuDigest = buildMenuDigest(menuContext);
      const cartLine =
        typeof cartSummary === 'string' && cartSummary.trim()
          ? cartSummary.trim().slice(0, 4000)
          : 'Cart is empty.';

      const lang = typeof replyLanguage === 'string' && replyLanguage.trim() ? replyLanguage.trim() : 'en';
      const languageHint =
        lang === 'en'
          ? 'Reply in English.'
          : `Reply in the same language/locale as the customer's app setting when possible (${lang}).`;

      const systemContent = `You are the friendly "Personal Assistant" for Moonwake Tea Atelier, a bubble tea cafe.
Your job is to help guests understand the menu, compare drinks, suggest items for their tastes, and explain pricing, sizes, toppings, sweetness, and ice options at a high level.

Rules:
- Use ONLY the MENU DATA below for facts about drinks, prices, toppings, and categories. If something is not listed, say you do not see it on the current menu.
- Do not invent new menu items, prices, or promotions.
- Ordering: Guests add items via the "Customize" flow, then checkout. You cannot place orders, charge cards, or see live inventory. Guide them to use the site to complete purchase.
- Be concise (a few short paragraphs or bullet lists). Warm, cafe tone.

${languageHint}

MENU DATA:
${menuDigest}

CURRENT CART (for recommendations; may be incomplete):
${cartLine}`;

      const modelsToTry = [MODEL, ...FALLBACK_MODELS];
      let reply = '';
      let lastError = null;

      for (const model of modelsToTry) {
        try {
          reply = await requestGeminiReply({
            apiKey,
            model,
            systemContent,
            history
          });
          if (reply) {
            break;
          }
        } catch (error) {
          lastError = error;
          if (isRetryableGeminiError(error)) {
            await sleep(600);
            try {
              reply = await requestGeminiReply({
                apiKey,
                model,
                systemContent,
                history
              });
              if (reply) {
                break;
              }
            } catch (retryError) {
              lastError = retryError;
            }
          } else {
            throw error;
          }
        }
      }

      if (!reply && lastError) {
        throw lastError;
      }

      if (!reply) {
        return response.status(502).json({
          error: 'Assistant returned an empty response. Try again.'
        });
      }

      response.json({ reply });
    } catch (error) {
      console.error('Assistant error:', error?.response?.data || error?.message || error);
      response.status(500).json({
        error: 'Assistant request failed.',
        details: error?.response?.data?.error?.message || error?.message || 'Unexpected error.'
      });
    }
  });

  return router;
}
