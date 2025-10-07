// Importa le dipendenze essenziali
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import dotenv from 'dotenv';
dayjs.extend(customParseFormat);

dotenv.config();

import ExchangeRate from '../models/ExchangeRateModel.js';

// Configurazione API
const API_KEY = process.env.CURRENCY_API_KEY;
const BASE_URL = process.env.BASE_URL;

/**
 * Recupera i tassi di cambio dall'API per una data specifica.
 * @param {string} date - La data nel formato 'YYYY-MM-DD'.
 * @returns {Object|null} I dati del tasso di cambio o null in caso di errore.
 */
async function fetchRatesFromAPI(date) {
    console.log(`📡 Recupero tassi di cambio dall'API per la data: ${date}`);

    const params = new URLSearchParams({
        apikey: API_KEY,
        date: date,
    }).toString();

    const url = `${BASE_URL}?${params}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`❌ Errore HTTP ${response.status} per il giorno ${date}.`);
            return null;
        }
        const responseData = await response.json();
        if (responseData && responseData.data) {
            console.log(`✅ Dati ricevuti con successo dall'API per il giorno ${date}.`);
            return responseData;
        } else {
            console.warn(`⚠️  Risposta API inattesa o incompleta per il giorno ${date}.`);
            return null;
        }
    } catch (error) {
        console.error(`❌ Errore di richiesta per il giorno ${date}:`, error.message);
        return null;
    }
}

/**
 * Salva i dati dei tassi di cambio nel database.
 * @param {Object} ratesData - L'oggetto completo ricevuto dall'API.
 * @param {string} dateString - La data nel formato 'YYYY-MM-DD'.
 * @returns {Object|null} Il documento salvato o null in caso di errore.
 */
async function saveRatesToDB(ratesData, dateString) {
    if (!ratesData) return null;

    // 🔹 Usiamo direttamente la stringa della data, senza toISOString()
    const documentTitleDate = dateString;

    const newRate = new ExchangeRate({
        meta: {
            last_updated_at: documentTitleDate
        },
        exchange_date: dateString,
        data: ratesData.data
    });

    try {
        const savedRate = await newRate.save();
        console.log(`✅ [SUCCESS] Documento salvato per la data: ${dateString}`);
        return savedRate;
    } catch (error) {
        if (error.code === 11000) {
            console.warn(`⚠️  [SKIP] Documento per la data ${dateString} già presente.`);
            // Se è già presente, recuperalo
            return await ExchangeRate.findOne({ exchange_date: dateString }).lean();
        } else {
            console.error(`❌ [ERROR] Errore durante il salvataggio dei tassi di ${dateString}:`, error.message);
            return null;
        }
    }
}

/**
 * Recupera i tassi di cambio storici per una data specifica salvati nel database.
 * Se non trova i dati, li recupera automaticamente dall'API e li salva.
 * @param {string} dateString - La data nel formato 'YYYY-MM-DD' per la richiesta.
 * @returns {Object} Un oggetto contenente i dati del tasso di cambio o un messaggio di errore.
 */
export default async function getHistoricalExchangeRate(dateString) {
    // Validazione della data
    const date = dayjs(dateString, 'YYYY-MM-DD', true); 
    const today = dayjs().startOf('day'); 

    if (!date.isValid()) {
        return {
            error: true,
            message: 'Data non valida o formato errato. Usa il formato rigoroso AAAA-MM-GG (es: 2024-10-05).'
        };
    }

    if (date.isAfter(today) || date.isSame(today)) {
        return {
            error: true,
            message: 'La data non può essere nel futuro o oggi.'
        };
    }

    // Preparazione per la Ricerca
    const simpleDate = date.format('YYYY-MM-DD');

    // Ricerca nel Database
    try {
        let foundRate = await ExchangeRate.findOne({ 
            exchange_date: simpleDate 
        }).lean();

        if (foundRate) {
            console.log(`✅ Tasso trovato nel database per la data: ${simpleDate}`);
            return {
                error: false,
                meta: foundRate.exchange_date,
                data: foundRate.data
            };
        }

        // Se non trova i dati, avvia il recupero automatico
        console.log(`⚠️  Dati non trovati per la data ${simpleDate}`);
        console.log(`🚀 Avvio recupero automatico dall'API...`);

        // Recupera i dati dall'API
        const ratesData = await fetchRatesFromAPI(simpleDate);

        if (!ratesData) {
            return {
                error: true,
                message: `Impossibile recuperare i dati dall'API per la data ${simpleDate}. L'API potrebbe non avere dati disponibili per questa data.`
            };
        }

        // Salva i dati nel database
        const savedRate = await saveRatesToDB(ratesData, simpleDate);

        if (!savedRate) {
            return {
                error: true,
                message: `Dati recuperati dall'API ma errore durante il salvataggio nel database per la data ${simpleDate}.`
            };
        }

        console.log(`✅ Dati recuperati e salvati con successo per la data: ${simpleDate}`);

        // Ritorna i dati appena salvati
        return {
            error: false,
            meta: savedRate.meta?.last_updated_at || simpleDate,
            data: savedRate.data || ratesData.data,
            autoFetched: true // Flag per indicare che i dati sono stati recuperati automaticamente
        };

    } catch (searchError) {
        return {
            error: true,
            message: `Errore durante la ricerca nel database: ${searchError.message}`
        };
    }
}
