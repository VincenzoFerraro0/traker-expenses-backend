import express from 'express';
import dotenv from 'dotenv';

import connectDB from './src/config/db.js';

dotenv.config();

const PORT = process.env.PORT;
const app = express();

// Connessione al database
connectDB();

// Middleware per il parsing del corpo delle richieste
app.use(express.json());

// Rotta di test
app.get('/', (req, res) => {
  res.send('API sta funzionando...');
});


app.listen(PORT, () => {
  console.log(`🚀 Server in ascolto sulla porta ${PORT}`);
}); 
