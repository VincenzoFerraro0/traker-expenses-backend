// getLatestExchangeRate.js

import connectDB from '../config/db.js';
import  ExchangeRate  from '../models/ExchangeRateModel.js';

/**
 * Recupera l'ultimo tasso di cambio disponibile dal database.
 * @returns {Object} Un oggetto contenente i dati più recenti o un messaggio di errore.
 */
export default async function getLatestExchangeRate() {
    try {
        // 1. Connessione al Database
        await connectDB();

        // 2. Trova il più recente per exchange_date
        const latestRate = await ExchangeRate.findOne()
            .sort({ exchange_date: -1 }) // Ordina decrescente per data
            .lean();

        if (!latestRate) {
            return {
                error: true,
                message: 'Nessun tasso di cambio trovato nel database.'
            };
        }

        return {
            meta: latestRate.meta.last_updated_at,
            exchange_date: latestRate.exchange_date,
            data: latestRate.data
        };

    } catch (error) {
        return {
            error: true,
            message: `Errore durante il recupero del tasso più recente: ${error.message}`
        };
    }
}
