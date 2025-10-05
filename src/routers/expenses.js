import express from "express";
import { Expenses } from "../models/ExpenseModel.js"; // attenzione al default export che avevi, io lo cambio in named
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
            message: "Expense data is required and must be an object.",
        }
    }
    // validazione del titolo
    if (typeof expense.title !== "string" || expense.title.trim() === "") {
        return {
            error: true,
            message: "Title is required and must be a non-empty string.",
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
            message: "Description must be a string.",
        };
    }
    if (expense.description) {
        expense.description = expense.description.trim();
    }

    // Data spesa obbligatoria
    if (!expense.expenseDate) {
        return { error: true, message: "Expense date is required." };
    }

  // Data spesa obbligatoria
  if (!expense.expenseDate) {
    return { error: true, message: "Expense date is required." };
  }

  // Parsing rigoroso con formato YYYY-MM-DD HH:mm:ss
  const expenseDate = dayjs(expense.expenseDate, "YYYY-MM-DD HH:mm:ss", true);
  if (!expenseDate.isValid()) {
    return { error: true, message: "Expense date must be a valid date in format YYYY-MM-DD HH:mm:ss." };
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
            message: "Amount is required and must be a positive number.",
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
            message: "Currency is required and must be one of the following: " + validCurrencies.join(", "),
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
