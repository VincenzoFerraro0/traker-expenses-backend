import dayjs from "dayjs";
import getLatestExchangeRate from "../lib/getLatestExchangeRate.js";
import UTC from 'dayjs/plugin/utc.js';
dayjs.extend(UTC);

export default async function validateExpenseData(expense, isPartialUpdate = false) {

    delete expense._id;
    delete expense.createdAt;
    delete expense.updatedAt;

    const validKeys = ["title", "description", "expenseDate", "amount", "currency"];
    // Rimuovi chiavi non valide
    Object.keys(expense).forEach((key) => {
        if (!validKeys.includes(key)) {
            delete expense[key];
        }
    });

    // Controlla se l'oggetto spesa è fornito
    if (!expense || typeof expense !== 'object') {
        return {
            error: true,
            message: "I dati sulle spese sono obbligatori e devono essere un oggetto.",
        }
    }

    // Verifica che ci sia almeno un campo da aggiornare nel caso di PATCH
    if (isPartialUpdate && Object.keys(expense).length === 0) {
        return {
            error: true,
            message: "Devi fornire almeno un campo da aggiornare.",
        };
    }

    // Validazione del titolo (obbligatorio solo in POST)
    if (expense.hasOwnProperty('title')) {
        if (typeof expense.title !== "string" || expense.title.trim() === "") {
            return {
                error: true,
                message: "Il titolo deve essere una stringa non vuota.",
            };
        }
        expense.title = expense.title.trim();
    } else if (!isPartialUpdate) {
        return {
            error: true,
            message: "Il titolo è obbligatorio.",
        };
    }

    // Validazione della descrizione (sempre opzionale)
    if (expense.hasOwnProperty('description')) {
        if (expense.description !== null && expense.description !== undefined && expense.description !== "") {
            if (typeof expense.description !== "string" || expense.description.trim() === "") {
                return {
                    error: true,
                    message: "La descrizione deve essere una stringa.",
                };
            }
            expense.description = expense.description.trim();
        } else {
            // Imposta a null se non fornita, vuota, null o undefined
            expense.description = null;
        }
    } else if (!isPartialUpdate) {
        // In POST, se non viene fornita, impostala a null
        expense.description = null;
    }

    // Validazione della data (obbligatoria solo in POST)
    if (expense.hasOwnProperty('expenseDate')) {
        if (!expense.expenseDate) {
            return { error: true, message: "La data della spesa non può essere vuota." };
        }

        // Parsing rigoroso con formato YYYY-MM-DD HH:mm:ss
        const expenseDate = dayjs(expense.expenseDate, "YYYY-MM-DD HH:mm:ss", true);
        if (!expenseDate.isValid()) {
            return {
                error: true,
                message: "La data della spesa deve essere una data valida nel formato YYYY-MM-DD HH:mm:ss."
            };
        }

        expense.expenseDate = expenseDate.utc(true).format(); // Salva in formato ISO 8601 in UTC
    } else if (!isPartialUpdate) {
        return { error: true, message: "La data della spesa è obbligatoria." };
    }

    // Validazione dell'importo (obbligatorio solo in POST)
    if (expense.hasOwnProperty('amount')) {
        if (typeof expense.amount !== "number" || isNaN(expense.amount) || expense.amount <= 0) {
            return {
                error: true,
                message: "L'importo deve essere un numero positivo.",
            };
        }
    } else if (!isPartialUpdate) {
        return {
            error: true,
            message: "L'importo è obbligatorio.",
        };
    }

    // Validazione della valuta (obbligatoria solo in POST)
    if (expense.hasOwnProperty('currency')) {
        const latestExchangeRate = await getLatestExchangeRate();
        if (latestExchangeRate?.error) {
            return latestExchangeRate;
        }

        const validCurrencies = Object.keys(latestExchangeRate.data);
        if (typeof expense.currency !== "string" || !validCurrencies.includes(expense.currency)) {
            return {
                error: true,
                message: "La valuta deve essere una delle seguenti: " + validCurrencies.join(", "),
            };
        }
    } else if (!isPartialUpdate) {
        // Verifica le valute solo se è un POST
        const latestExchangeRate = await getLatestExchangeRate();
        if (latestExchangeRate?.error) {
            return latestExchangeRate;
        }
        return {
            error: true,
            message: "La valuta è obbligatoria.",
        };
    }

    return expense;
}