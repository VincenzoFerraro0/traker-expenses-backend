import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
// Importa il client della libreria currencyapi
import currencyapi from '@everapi/currencyapi-js';

import getHistoricalExchangeRate from '../lib/getHistoricalExchangeRate.js';
import getLatestExchangeRate from '../lib/getLatestExchangeRate.js';

// Inizializza il client con la tua API key
const client = new currencyapi(process.env.CURRENCY_API_KEY);
// Crea il router
const router = express.Router();

// Rotta per ottenere i tassi di cambio attuali
router.get('/currency-api-status', async (req, res) => {
  const status = await client.status();
  res.send(status);
});


// Rotta per ottenere il tasso di cambio più recente
router.get('/latest', async (req, res) => {
   const latestExchangeRate = await getLatestExchangeRate();
    if (latestExchangeRate.error) {
         return res.status(400).send({ error: latestExchangeRate.message });
    }
    return res.send(latestExchangeRate);
}); 


// Rotta per ottenere il tasso di cambio storico per una data specifica
// Nei tuoi controller o route
router.get('/:date', async (req, res) => {
    const result = await getHistoricalExchangeRate(req.params.date);
    
    if (result.error) {
        return res.status(400).json(result);
    }
    
    res.json(result);
});

export default router;
