import dayjs from "dayjs";
import getLatestExchangeRate from "./getLatestExchangeRate.js";
import UTC from 'dayjs/plugin/utc.js';
import mongoose from "mongoose";
import Categories from "../models/categoriesModel.js"
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

    const validKeys = ["title", "description", "expenseDate", "amount", "currency", "categoryId"];
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

    // Validazione Categoria
    if (!expense.categoryId && expense.categoryId !== 0) {
        expense.categoryId = null;
    } else {
        // Verifica che la categoria esista
        const categories = await Categories.find();
        const categoryExists = categories.some(cat => cat._id.toString() === expense.categoryId.toString());

        if (!categoryExists) {
            return {
                error: true,
                message: "La categoria specificata non esiste.",
            };
        }

        // Validazione ObjectId
        if (!mongoose.Types.ObjectId.isValid(expense.categoryId)) {
            return {
                error: true,
                message: "L'ID della categoria non è valido.",
            };
        }
    }


    return expense;
}
export async function validateCategory(category, isPartialUpdate = false) {

    const categories = await Categories.find();

    const validKeys = ["_id", "name", "parentCategoryId"];

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

    if (!category._id && category._id !== 0) {
        category._id = null;
    } else {
        const categoryId = category._id;
        const availableIds = categories.reduce((acc, cat) => {
            if (cat.parentCategoryId === null) {
                return acc;
            }
            const parentCategory = categories.find(c => c._id.toString() === cat.parentCategoryId.toString());
            if (parentCategory) {
                return acc;
            }
            if (acc.includes(cat.parentCategoryId.toString())) {
                return acc;
            }
            return [...acc, cat.parentCategoryId.toString()];
        }, []);

        if (!availableIds.includes(categoryId.toString())) {
            return {
                error: true,
                message: 'Categoria non disponibile'
            };
        }
        category._id = categoryId;
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