import express from 'express';

import currencyapi from '@everapi/currencyapi-js';

const client = new currencyapi(process.env.CURRENCY_API_KEY);

const router = express.Router();

router.get('/currency-api-status', async (req, res) => {
  const status = await client.status();
  res.json(status);
});

export default router;
