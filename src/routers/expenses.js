import express from "express";
import Expenses from "../models/expenseModel.js";
import mongoose from "mongoose";
import { validateExpenseData, vallidateCurrency } from "../lib/validators.js";
import convertCurrency from "../lib/convertCurrency.js";

import dayjs from "dayjs";
import UTC from 'dayjs/plugin/utc.js';
dayjs.extend(UTC);


// Crea il router
const router = express.Router();


// Ottenere tutte le spese con conversione valuta
router.get("/", async (req, res) => {
    try {
        const { startDate, endDate, baseCurrency = "EUR" } = req.query;
        let start, end;

        // Validazione delle date se fornite
        if (startDate) {
            start = dayjs(startDate).utc(true).startOf("day");
            if (!start.isValid()) {
                return res.status(400).send({
                    error: true,
                    message: "La data di inizio non è valida."
                });
            }
        }

        if (endDate) {
            end = dayjs(endDate).utc(true).endOf("day");
            if (!end.isValid()) {
                return res.status(400).send({
                    error: true,
                    message: "La data di fine non è valida."
                });
            }
        }

        // Validazione della valuta base
        const currencyValidation = await vallidateCurrency({ currency: baseCurrency }, false);
        if (currencyValidation.error) {
            return res.status(400).send(currencyValidation);
        }

        // Query al database con filtro per date
        let query = {};
        if (start || end) {
            query.expenseDate = {};
            if (start) {
                query.expenseDate.$gte = start.toISOString();
            }
            if (end) {
                query.expenseDate.$lte = end.toISOString();
            }
        }

        const expenses = await Expenses.find(query).sort({ expenseDate: -1 });

        // Converti gli importi nella valuta base
        const convertedExpenses = await Promise.all(
            expenses.map(async (expense) => {
                const expenseObj = expense.toObject();

                try {
                    // Converti l'importo usando la data della spesa
                    const conversion = await convertCurrency(
                        expense.amount,
                        expense.currency,
                        baseCurrency,
                        expense.expenseDate
                    );

                    return {
                        ...expenseObj,
                        convertedAmount: {
                            amount: conversion.amount,
                            currency: conversion.currency,
                            isEstimated: conversion.isEsteem
                        }
                    };
                } catch (conversionError) {
                    console.error("⚠️ Errore conversione spesa:", expense._id, conversionError.message);
                    // In caso di errore nella conversione, mantieni l'importo originale
                    return {
                        ...expenseObj,
                        convertedAmount: {
                            amount: expense.amount,
                            currency: expense.currency,
                            isEstimated: false,
                            conversionError: true
                        }
                    };
                }
            })
        );

        console.log("📦 Expenses trovate:", convertedExpenses.length);
        res.send(convertedExpenses);
    } catch (error) {
        console.error("❌ Errore GET /expenses:", error);
        res.status(500).send({ error: true, message: error.message });
    }
});


// Ottenere una spesa per ID
router.get("/:id", async (req, res) => {
    const { id } = req.params;

    //controllo se id è un ObjectId valido
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({ error: true, message: "ID non valido." });
    }
    // Prova a trovare la spesa per ID
    try {
        const expense = await Expenses.findById(id);
        if (!expense) {
            return res.status(404).send({ error: true, message: "Spesa non trovata." });
        }
        res.send(expense);
    } catch (error) {
        console.error("❌ Errore GET /expenses/:id:", error);
        res.status(500).send({ error: true, message: error.message });
    }
});

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
})

// Aggiornare una spesa per ID
router.patch("/:id", async (req, res) => {
    const { id } = req.params;

    // Controllo se id è un ObjectId valido
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({ error: true, message: "ID non valido." });
    }

    try {
        // Valida i dati in ingresso (solo i campi forniti)
        const updateData = await validateExpenseData(req.body, true); // true indica validazione parziale

        if (updateData.error) {
            return res.status(400).send(updateData);
        }

        // Aggiorna solo i campi forniti
        const updatedExpense = await Expenses.findByIdAndUpdate(
            id,
            { $set: updateData },
            {
                new: true,        // Restituisce il documento aggiornato
                runValidators: true  // Esegue i validatori dello schema
            }
        );

        if (!updatedExpense) {
            return res.status(404).send({ error: true, message: "Spesa non trovata." });
        }

        res.send(updatedExpense);
    } catch (error) {
        console.error("❌ Errore PATCH /expenses/:id:", error);
        res.status(500).send({ error: true, message: error.message });
    }
});

// Eliminare una spesa per ID
router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    //controllo se id è un ObjectId valido
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({ error: true, message: "ID non valido." });
    }
    // Prova a trovare ed eliminare la spesa
    try {
        const deletedExpense = await Expenses.findByIdAndDelete(id);
        if (!deletedExpense) {
            return res.status(404).send({ error: true, message: "Spesa non trovata." });
        }
        res.send({ message: "Spesa eliminata con successo.", deletedExpense });
    } catch (error) {
        res.status(500).send({ error: true, message: error.message });
    }
});


export default router;
