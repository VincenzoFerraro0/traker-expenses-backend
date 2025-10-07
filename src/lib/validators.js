import dayjs from "dayjs";
import getLatestExchangeRate from "./getLatestExchangeRate.js";
import UTC from 'dayjs/plugin/utc.js';
import mongoose from "mongoose";
dayjs.extend(UTC);

export async function vallidateCurrency(expense, isPartialUpdate = false) {
    // Validazione della valuta
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

        // Validazione OK
        return { error: false };
    } else if (!isPartialUpdate) {
        // Campo obbligatorio mancante in POST
        return {
            error: true,
            message: "La valuta è obbligatoria.",
        };
    }

    // Campo non presente in PATCH - OK
    return { error: false };
}

export async function validateExpenseData(expense, isPartialUpdate = false) {

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
    const currencyValidation = await vallidateCurrency(expense, isPartialUpdate);
    if (currencyValidation.error) {
        return currencyValidation;
    }

    return expense;
}

export async function validateCategory(category, isPartialUpdate = false) {

    const validKeys = ["name", "parentCategoryId"];

    // Rimuovi eventuali chiavi non ammesse
    Object.keys(category).forEach((key) => {
        if (!validKeys.includes(key)) {
            delete category[key];
        }
    });

    // Controllo se l'oggetto categoria è valido
    if (!category || typeof category !== "object") {
        return {
            error: true,
            message: "I dati sulle categorie sono obbligatori e devono essere un oggetto.",
        };
    }

    // PATCH deve avere almeno un campo da aggiornare
    if (isPartialUpdate && Object.keys(category).length === 0) {
        return {
            error: true,
            message: "Devi fornire almeno un campo da aggiornare.",
        };
    }

    // Validazione del name (obbligatorio in POST)
    if (category.hasOwnProperty("name")) {
        if (typeof category.name !== "string" || category.name.trim() === "") {
            return {
                error: true,
                message: "Il titolo deve essere una stringa non vuota.",
            };
        }
        category.name = category.name.trim();
    } else if (!isPartialUpdate) {
        return {
            error: true,
            message: "Il titolo è obbligatorio.",
        };
    }

    // Validazione parentCategoryId (se presente)
    if (category.hasOwnProperty("parentCategoryId")) {
        if (
            category.parentCategoryId !== null &&
            !mongoose.Types.ObjectId.isValid(category.parentCategoryId)
        ) {
            return {
                error: true,
                message: "L'ID della categoria padre non è valido.",
            };
        }
    }

    // Tutto ok, ritorno l'oggetto "pulito"
    return category;
}