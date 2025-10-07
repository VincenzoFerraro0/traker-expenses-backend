// QUESTO SCRIPT RECUPERA I TASSI DI CAMBIO PER UNA DATA SPECIFICA E LI INSERISCE NEL DATABASE
import mongoose from 'mongoose';
import dayjs from 'dayjs';
import connectDB from '../config/db.js';
import ExchangeRate from '../models/exchangeRateModel.js';

import dotenv from 'dotenv';

dotenv.config();

// -- CONFIGURAZIONE ---

const API_KEY = process.env.CURRENCY_API_KEY;
const BASE_URL = process.env.BASE_URL;

connectDB();

/**
 * Recupera i tassi di cambio per una data specifica dall'API usando 'fetch'.
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
            console.error(`❌ Errore HTTP ${response.status} per il giorno ${date}.`);
            return null;
        }
        const responseData = await response.json();
        if (responseData && responseData.data) {
            console.log(`✅ Dati ricevuti con successo per il giorno ${date}.`);
            return responseData;
        } else {
            console.warn(`⚠️  Risposta API inattesa o incompleta per il giorno ${date}.`);
            return null;
        }
    } catch (error) {
        console.error(`❌ Errore di richiesta (fetch) per il giorno ${date}:`, error.message);
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
        console.log(`✅ [SUCCESS] Documento salvato per la data: ${dateString}`);
        return true;
    } catch (error) {
        if (error.code === 11000) { // Codice per errore di duplicato (unique: true su meta.last_updated_at)
            console.warn(`⚠️  [SKIP] Documento per la data ${dateString} già presente.`);
            return false;
        } else {
            console.error(`❌ [ERROR] Errore durante il salvataggio dei tassi di ${dateString}:`, error.message);
            return false;
        }
    }
}

/**
 * Funzione principale per eseguire il fetch dei dati per una data specifica.
 * @param {string} targetDate - La data da recuperare in formato 'YYYY-MM-DD'. Se non fornita, usa la data odierna.
 */
async function fetchDataForSpecificDate(targetDate = null) {
    await connectDB();

    // Se non viene fornita una data, usa la data odierna
    const dateToFetch = targetDate ? dayjs(targetDate) : dayjs();
    const dateStringApi = dateToFetch.format('YYYY-MM-DD');
    const documentTitleDate = dateToFetch.startOf('day').toISOString();

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 Avvio recupero dati per la data: ${dateStringApi}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // 1. Controlla se il dato è già presente nel DB
    const existingData = await ExchangeRate.findOne({ 'meta.last_updated_at': documentTitleDate });
    if (existingData) {
        console.warn(`⚠️  [SKIP] Documento per la data ${dateStringApi} già presente nel database.`);
        console.log(`ℹ️  Usa l'opzione --force per sovrascrivere il dato esistente.\n`);
        await mongoose.disconnect();
        console.log('🔌 Disconnesso da MongoDB.');
        return;
    }

    // 2. Recupera i dati dall'API
    const ratesData = await fetchRatesForDate(dateStringApi);

    // 3. Salva nel DB
    if (ratesData) {
        const saved = await saveRates(ratesData, dateStringApi);
        if (saved) {
            console.log(`\n✅ Operazione completata con successo!`);
        }
    } else {
        console.error(`\n❌ Impossibile recuperare i dati per la data ${dateStringApi}.`);
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    await mongoose.disconnect();
    console.log('🔌 Disconnesso da MongoDB.');
}

// Gestione degli argomenti da linea di comando
const args = process.argv.slice(2);
let targetDate = null;

// Cerca l'argomento --date o prende il primo argomento come data
const dateArgIndex = args.indexOf('--date');
if (dateArgIndex !== -1 && args[dateArgIndex + 1]) {
    targetDate = args[dateArgIndex + 1];
} else if (args.length > 0 && !args[0].startsWith('--')) {
    // Se il primo argomento non è un flag, usalo come data
    targetDate = args[0];
}

// Valida il formato della data se fornita
if (targetDate && !dayjs(targetDate, 'YYYY-MM-DD', true).isValid()) {
    console.error('❌ Formato data non valido. Usa il formato YYYY-MM-DD (es. 2024-01-15)');
    process.exit(1);
}

// Avvia lo script
console.log(`\n🚀 Avvio script di recupero tassi di cambio...`);
if (targetDate) {
    console.log(`📅 Data specificata: ${targetDate}`);
} else {
    console.log(`📅 Nessuna data specificata, uso la data odierna: ${dayjs().format('YYYY-MM-DD')}`);
}

fetchDataForSpecificDate(targetDate);