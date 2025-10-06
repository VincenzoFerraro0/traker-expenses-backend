import dayjs from "dayjs";
import getLatestExchangeRate from "./getLatestExchangeRate.js";
import getHistoricalExchangeRate from "./getHistoricalExchangeRate.js";

export default async function convertCurrency(amount, from, to, date) {
    // Se le valute sono uguali, non serve conversione
    if (from === to) {
        return {
            amount: Math.round(amount * 100) / 100,
            currency: to,
            isEsteem: false,
        };
    }

    const today = dayjs().startOf('day');
    const expenseDate = dayjs(date).startOf('day');
    const isHistorical = expenseDate.isBefore(today) || expenseDate.isSame(today);

    let exchangeRateResponse;
    
    try {
        if (isHistorical) {
            exchangeRateResponse = await getHistoricalExchangeRate(expenseDate.format('YYYY-MM-DD'));
        } else {
            exchangeRateResponse = await getLatestExchangeRate();
        }

        // Gestione errori dalla risposta
        if (exchangeRateResponse?.error) {
            throw new Error(exchangeRateResponse.message || "Errore nel recupero dei tassi di cambio");
        }

        // Verifica struttura dati - potrebbe essere .data o direttamente l'oggetto
        const rates = exchangeRateResponse.data || exchangeRateResponse;

        if (!rates) {
            throw new Error("Struttura dati dei tassi di cambio non valida");
        }

        // Verifica che le valute esistano nei tassi
        if (!rates[from]) {
            throw new Error(`Valuta di origine "${from}" non trovata nei tassi di cambio`);
        }
        if (!rates[to]) {
            throw new Error(`Valuta di destinazione "${to}" non trovata nei tassi di cambio`);
        }

        // Gestione diverse strutture possibili: rates[from].value o rates[from]
        const fromRate = typeof rates[from] === 'object' ? rates[from].value : rates[from];
        const toRate = typeof rates[to] === 'object' ? rates[to].value : rates[to];

        if (!fromRate || !toRate) {
            throw new Error(`Tassi di cambio non validi: ${from}=${fromRate}, ${to}=${toRate}`);
        }

        // Conversione: amount * (toRate / fromRate)
        const finalAmount = amount * (toRate / fromRate);
        const roundedAmount = Math.round(finalAmount * 100) / 100;

        console.log({
            amount,
            from,
            to,
            date: expenseDate.format('YYYY-MM-DD'),
            isHistorical,
            fromRate,
            toRate,
            finalAmount: roundedAmount
        });

        return {
            amount: roundedAmount,
            currency: to,
            isEsteem: !isHistorical, // true se è una stima futura
        };

    } catch (error) {
        console.error("❌ Errore in convertCurrency:", error.message);
        throw error; // Rilancia l'errore per gestirlo nella route
    }
}