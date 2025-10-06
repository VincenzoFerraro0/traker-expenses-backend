import express from "express";
import { Expenses } from "../models/ExpenseModel.js"; 
import dayjs from "dayjs";
import getLatestExchangeRate from "../lib/getLatestExchangeRate.js";

const router = express.Router();

// Ottenere tutte le spese
router.get("/", async (req, res) => {
    try {
        const expenses = await Expenses.find().sort({ expenseDate: -1 }); // ordino dalla più recente
        res.status(200).json(expenses);
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
});

// Validazione dei dati della spesa 
async function validateExpenseData(expense) {

    if (!expense || typeof expense !== 'object') {
        return {
            error: true,
            message: "I dati sulle spese sono obbligatori e devono essere un oggetto.",
        }
    }
    // validazione del titolo
    if (typeof expense.title !== "string" || expense.title.trim() === "") {
        return {
            error: true,
            message: "Il titolo è obbligatorio e deve essere una stringa non vuota.",
        };
    }
    expense.title = expense.title.trim();

    // validazione della descrizione (opzionale)
    if (
        expense.description &&
        (typeof expense.description !== "string" || expense.description.trim() === "")
    ) {
        return {
            error: true,
            message: "La descrizione deve essere una stringa.",
        };
    }
    if (expense.description) {
        expense.description = expense.description.trim();
    }

    // Data spesa obbligatoria
    if (!expense.expenseDate) {
        return { error: true, message: "La data della spesa è obbligatoria." };
    }

  // Data spesa obbligatoria
  if (!expense.expenseDate) {
    return { error: true, message: "La data della spesa è obbligatoria." };
  }

  // Parsing rigoroso con formato YYYY-MM-DD HH:mm:ss
  const expenseDate = dayjs(expense.expenseDate, "YYYY-MM-DD HH:mm:ss", true);
  if (!expenseDate.isValid()) {
    return { error: true, message: "La data della spesa deve essere una data valida nel formato YYYY-MM-DD HH:mm:ss." };
  }
  
  expense.expenseDate = expenseDate.format();
    // validazione dell'importo
    if (
        typeof expense.amount !== "number" ||
        isNaN(expense.amount) ||
        expense.amount <= 0
    ) {
        return {
            error: true,
            message: "L'importo è obbligatorio e deve essere un numero positivo.",
        };
    }

    // validazione della valuta
    const latestExchangeRate = await getLatestExchangeRate();
    if (latestExchangeRate?.error) {
        return latestExchangeRate;
    }

    const validCurrencies = Object.keys(latestExchangeRate.data);
    if (
        typeof expense.currency !== "string" || !validCurrencies.includes(expense.currency)
    ) {
        return {
            error: true,
            message: "La valuta è obbligatoria e deve essere una delle seguenti:" + validCurrencies.join(", "),
        };
    }

    return expense
}

// Creare una nuova spesa
router.post("/", async (req, res) => {
    try {
        const newExpense = await validateExpenseData(req.body);
        if (newExpense.error) {
            return res.status(400).send(newExpense);
        }
        const createdExpense = await Expenses.create(newExpense);
        res.status(201).send(createdExpense);
    } catch (error) {
        res.status(500).send({ error: true, message: error.message });
    }
});

export default router;
