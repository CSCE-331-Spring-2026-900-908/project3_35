import express from 'express';
import axios from 'axios';

export function createTranslateRouter() {
  const router = express.Router();

  router.post('/', async (request, response) => {
    try {
      const { texts, targetLanguage } = request.body;

      if (!Array.isArray(texts) || texts.length === 0) {
        return response.status(400).json({
          error: 'texts must be a non-empty array.'
        });
      }

      if (!targetLanguage) {
        return response.status(400).json({
          error: 'targetLanguage is required.'
        });
      }

      const apiKey = process.env.TRANSLATE_API_KEY;

      if (!apiKey) {
        return response.status(500).json({
          error: 'Missing TRANSLATE_API_KEY in server .env'
        });
      }

      const params = new URLSearchParams();
      params.append('key', apiKey);
      params.append('target', targetLanguage);
      params.append('format', 'text');

      for (const text of texts) {
        params.append('q', text);
      }

      const googleResponse = await axios.post(
        'https://translation.googleapis.com/language/translate/v2',
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const translations =
        googleResponse.data?.data?.translations?.map((item) => item.translatedText) || [];

      response.json({ translations });
    } catch (error) {
      console.error('Translation error:', error.response?.data || error.message);
      response.status(500).json({
        error: 'Translation request failed.'
      });
    }
  });

  return router;
}