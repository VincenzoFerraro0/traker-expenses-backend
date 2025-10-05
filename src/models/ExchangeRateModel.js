// Definisce lo schema della collezione 'historical-exchange-rates'.
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// Definisce lo schema della collezione 'traker_expenses' come richiesto.
const ExchangeRateSchema = new Schema({
    meta: {
        // Formato completo (ISO 8601).
        last_updated_at: { 
            type: String, 
            required: true,
            unique: true 
        },
    },
    // Nuovo campo aggiunto: data del tasso di cambio in formato AAAA-MM-GG.
    exchange_date: {
        type: String,
        required: true,
        index: true
    },
    data: {
        type: Object, 
        required: true
    }
});
// Crea il modello
export const ExchangeRate = model('ExchangeRate', ExchangeRateSchema);
