// Importa le dipendenze essenziali
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
dayjs.extend(customParseFormat);

import connectDB from '../config/db.js';
import ExchangeRate  from '../models/ExchangeRateModel.js'; 
// Assicurati che questi percorsi di importazione siano corretti per la tua struttura di progetto!

/**
 * Recupera i tassi di cambio storici per una data specifica salvati nel database.
 * @param {string} dateString - La data nel formato 'YYYY-MM-DD' per la richiesta.
 * @returns {Object} Un oggetto contenente i dati del tasso di cambio o un messaggio di errore.
 */
export default async function(dateString) {

    // 1. Validazione della data
    const date = dayjs(dateString, 'YYYY-MM-DD', true); 
    
    const today = dayjs(dayjs().format('YYYY-MM-DD')); 

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

    // 2. Connessione al Database
    try {
        await connectDB(); 
    } catch (dbError) {
        return {
            error: true,
            message: `Impossibile connettersi al database: ${dbError.message}`
        };
    }

    // 3. Preparazione per la Ricerca
    const simpleDate = date.format('YYYY-MM-DD');

    // 4. Ricerca nel Database
    try {
        const foundRate = await ExchangeRate.findOne({ 
            exchange_date: simpleDate 
        }).lean();

        if (foundRate) {
            console.log(`Tasso trovato per la data: ${simpleDate}`);
            return {
                meta: foundRate.meta.last_updated_at,
                data: foundRate.data
                
            };
        } else {
            return {
                error: true,
                message: `Dati non trovati nel database per la data ${simpleDate}. Potrebbe non essere ancora stata scaricata.`
            };
        }

    } catch (searchError) {
        return {
            error: true,
            message: `Errore durante la ricerca nel database: ${searchError.message}`
        };
    }
}
