// QUESTO SCRIPT RECUPERA I TASSI DI CAMBIO STORICI E LI INSERISCE NEL DATABASE
import mongoose from 'mongoose';
import dayjs from 'dayjs';
import connectDB from '../config/db.js';
import  ExchangeRate  from '../models/ExchangeRateModel.js';

import dotenv from 'dotenv';

dotenv.config();

// -- CONFIGURAZIONE ---

const API_KEY = process.env.CURRENCY_API_KEY;
const BASE_URL = process.env.BASE_URL;

connectDB()
/**
 * Recupera i tassi di cambio storici per una data specifica dall'API usando 'fetch'.
 * @param {string} date - La data nel formato 'YYYY-MM-DD' per la richiesta API.
 * @returns {Object|null} I dati del tasso di cambio o null in caso di errore.
 */
async function fetchRatesForDate(date) {
    console.log(`📅 Recupero tassi di cambio per la data: ${date}`);

    // Costruisce la stringa URL con i parametri necessari
    const params = new URLSearchParams({
        apikey: API_KEY,
        date: date,
    }).toString();

    const url = `${BASE_URL}?${params}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`<- Errore HTTP ${response.status} per il giorno ${date}.`);
            return null;
        }
        const responseData = await response.json();
        if (responseData && responseData.data) {
            console.log(`<- Dati ricevuti con successo per il giorno ${date}.`);
            return responseData;
        } else {
            console.warn(`<- Risposta API inattesa o incompleta per il giorno ${date}.`);
            return null;
        }
    } catch (error) {
        console.error(`<- Errore di richiesta (fetch) per il giorno ${date}:`, error.message);
        return null;
    }
}

/**
 * Salva i dati dei tassi di cambio nel database, formattando la data.
 * @param {Object} ratesData - L'oggetto completo ricevuto dall'API.
 * @param {string} dateString - La data originale per l'indice di salvataggio (YYYY-MM-DD).
 */
async function saveRates(ratesData, dateString) {
    if (!ratesData) return;

    // Formatta la data nel "formato completo" (ISO 8601) all'inizio del giorno UTC
    const documentTitleDate = dayjs(dateString).startOf('day').toISOString();
    
    // Crea un documento Mongoose che rispecchia ESATTAMENTE la struttura JSON richiesta
    const newRate = new ExchangeRate({
        meta: {
            // Assegna la data formattata al campo last_updated_at (formato completo)
            last_updated_at: documentTitleDate 
        },
        // Aggiunge il campo data richiesto (AAAA-MM-GG)
        exchange_date: dateString, 
        data: ratesData.data
    });

    try {
        await newRate.save();
        console.log(`   [SUCCESS] Documento salvato per la data: ${dateString}`);
    } catch (error) {
        if (error.code === 11000) { // Codice per errore di duplicato (unique: true su meta.last_updated_at)
            console.warn(`   [SKIP] Documento per la data ${dateString} già presente.`);
        } else {
            console.error(`   [ERROR] Errore durante il salvataggio dei tassi di ${dateString}:`, error.message);
        }
    }
}

/**
 * Funzione principale per eseguire il fetch dei dati storici nell'ultimo anno.
 */
async function runHistoricDataFetch() {
    await connectDB();

    const daysToFetch = 365;
    // Inizia da ieri per avere dati "storici" completi.
    let currentDate = dayjs().subtract(1, 'day'); 
    // Pausa minima tra le richieste per rispettare il limite di 10 al minuto (1 richiesta ogni 6 secondi)
    const RATE_LIMIT_PAUSE_MS = 6100; 

    console.log(`\n--- Avvio del recupero dei dati storici per ${daysToFetch} giorni ---`);
    console.log(`--- Pausa tra richieste: ${RATE_LIMIT_PAUSE_MS}ms (per limite API 10/minuto) ---`);

    for (let i = 0; i < daysToFetch; i++) {
        const dateStringApi = currentDate.format('YYYY-MM-DD');
        // Usa il formato ISO completo per il controllo di unicità
        const documentTitleDate = currentDate.startOf('day').toISOString();

        // 1. Controlla se il dato è già presente nel DB usando il formato titolo/data
        const existingData = await ExchangeRate.findOne({ 'meta.last_updated_at': documentTitleDate });
        if (existingData) {
            console.warn(`-> [SKIP] Documento per la data ${dateStringApi} trovato nel DB. Passaggio al giorno precedente.`);
            currentDate = currentDate.subtract(1, 'day');
            continue;
        }

        // 2. Recupera i dati dall'API
        const ratesData = await fetchRatesForDate(dateStringApi);

        // 3. Salva nel DB con la data formattata come "titolo"
        if (ratesData) {
            await saveRates(ratesData, dateStringApi);
        }

        // Passaggio al giorno precedente
        currentDate = currentDate.subtract(1, 'day');
        
        // Pausa per rispettare i limiti di rate limit dell'API
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_PAUSE_MS)); 
    }

    console.log('\n--- Recupero dati storici completato! ---');
    await mongoose.disconnect();
    console.log('Disconnesso da MongoDB.');
}

// Avvia lo script
runHistoricDataFetch();