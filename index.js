import express from 'express';
import dotenv from 'dotenv';
import connectDB from './src/config/db.js';

//ROTTE
import expensesRouter from './src/routers/expenses.js'
import exchangeRatesRouter from './src/routers/exchangeRates.js';
import categoriesRouter from './src/routers/categories.js';

// Configurazione delle variabili d'ambiente

dotenv.config();

const PORT = process.env.PORT;
const app = express();

// Connessione al database
await connectDB();

// Middleware per il parsing del corpo delle richieste
app.use(express.json());

// Rotte per i tassi di cambio
app.use('/api/exchange-rates', exchangeRatesRouter);

// Rotte per le spese
app.use('/api/expenses', expensesRouter);

//Rotte per le categorie
app.use('/api/categories', categoriesRouter);

// // Rotta di test
// app.get('/', (req, res) => {
//   res.send('API sta funzionando...');
// });

app.listen(PORT, () => {
  console.log(`🚀 Server in ascolto sulla porta ${PORT}`);
}); 
