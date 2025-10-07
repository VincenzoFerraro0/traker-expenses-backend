import express from "express";

import dayjs from "dayjs";
import UTC from 'dayjs/plugin/utc.js';
import Categories from '../models/categoriesModel.js'
import mongoose from "mongoose";
import { validateCategory } from "../lib/validators.js";
dayjs.extend(UTC);


// Crea il router
const router = express.Router();


// Ottenere tutte le categorie, con opzione per raggrupparle in un albero di categorie e sottocategorie ✅
router.get("/", async (req, res) => {
    try {
        const categories = await Categories.find();
        const group = req.query.group === 'true';

        if (!group) {
            return res.send(categories);
        }

        // Funzione ricorsiva per costruire l'albero delle categorie
        const filterCategoriesParentId = (parentCategoryId) => {
            const filteredCategories = categories
                .filter(cat => {
                    // Gestione di parentCategoryId null o undefined
                    if (!parentCategoryId) return !cat.parentCategoryId;
                    return cat.parentCategoryId?.toString() === parentCategoryId;
                })
                .map(cat => {
                    // Ricorsione per trovare le sottocategorie
                    const subCategories = filterCategoriesParentId(cat._id.toString());
                    return {
                        _id: cat._id,
                        name: cat.name,
                        parentCategoryId: cat.parentCategoryId || null,
                        subCategories: subCategories.length === 0 ? null : subCategories
                    };
                });

            return filteredCategories;
        }


        res.send(filterCategoriesParentId(null));

    } catch (error) {
        console.error("❌ Errore GET /categories:", error);
        res.status(500).send({ error: true, message: error.message });
    }
});

// Ottenere una Categoria per ID ✅
router.get("/:id", async (req, res) => {
    const { id } = req.params;

    //controllo se id è un ObjectId valido
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({ error: true, message: "ID non valido." });
    }
    // Prova a trovare la categoria per ID
    try {
        const categories = await Categories.findById(id);
        if (!categories) {
            return res.status(404).send({ error: true, message: "Categoria non trovata." });
        }
        res.send(categories);
    } catch (error) {
        console.error("❌ Errore GET /categories/:id:", error);
        res.status(500).send({ error: true, message: error.message });
    }
});

// Creare una nuova Categoria ✅
router.post("/", async (req, res) => {
    try {
        const newCategory = await validateCategory(req.body);
        if (newCategory.error) {
            return res.status(400).send(newCategory);
        }
        const createdExpense = await Categories.create(newCategory);
        res.status(201).send(createdExpense);
    } catch (error) {
        res.status(500).send({ error: true, message: error.message });
    }
});

// Aggiornare una categoria per ID ✅
router.patch("/:id", async (req, res) => {
    const { id } = req.params;

    // Controllo se id è un ObjectId valido
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({ error: true, message: "ID non valido." });
    }

    try {
        // Valida i dati in ingresso (solo i campi forniti)
        const updateData = await validateCategory(req.body, true); // true indica validazione parziale

        if (updateData.error) {
            return res.status(400).send(updateData);
        }

        // Aggiorna solo i campi forniti
        const updatedCategory = await Categories.findByIdAndUpdate(
            id,
            { $set: updateData },
            {
                new: true,        // Restituisce il documento aggiornato
                runValidators: true  // Esegue i validatori dello schema
            }
        );

        if (!updatedCategory) {
            return res.status(404).send({ error: true, message: "Spesa non trovata." });
        }

        res.send(updatedCategory);
    } catch (error) {
        console.error("❌ Errore PATCH /categories/:id:", error);
        res.status(500).send({ error: true, message: error.message });
    }
});

// Eliminare una Categoria per ID
router.delete("/:id", async (req, res) => {
    const categoryId = req.params.id;

    try {
        // Trova la categoria da eliminare
        const categoryToDelete = await Categories.findById(categoryId);
        if (!categoryToDelete) {
            return res.status(404).json({ error: true, message: "Categoria non trovata." });
        }

        // Trova tutte le sottocategorie della categoria da eliminare
        const subCategories = await Categories.find({ parentCategoryId: categoryId });

        // Riassegna il parentCategoryId delle sottocategorie
        for (const subCat of subCategories) {
            subCat.parentCategoryId = categoryToDelete.parentCategoryId || null;
            await subCat.save();
        }

        // Elimina la categoria
        await Categories.findByIdAndDelete(categoryId);

        res.json({ error: false, message: "Categoria eliminata e sottocategorie riassegnate correttamente." });
    } catch (error) {
        console.error("❌ Errore DELETE /categories/:id:", error);
        res.status(500).json({ error: true, message: error.message });
    }
});



export default router;
