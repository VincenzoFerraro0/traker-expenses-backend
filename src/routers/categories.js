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

        // Individuazione categorie con parent non esistente
        const unknownCategories = categories.reduce((acc, cat) => {
            if (!cat.parentCategoryId) return acc;
            const parentExists = categories.find(c => c._id.toString() === cat.parentCategoryId.toString());
            const alreadyAdded = acc.find(c => c._id.toString() === cat.parentCategoryId.toString());

            if (!parentExists && !alreadyAdded) {
                acc.push({
                    _id: cat.parentCategoryId,
                    name: "Unknown Category",
                    parentCategoryId: null
                });
            }
            return acc;
        }, []);

        const allCategories = [...categories, ...unknownCategories];

        // Costruzione albero categorie
        const buildTree = (parentId = null) => {
            return allCategories
                .filter(cat => {
                    if (!parentId) return !cat.parentCategoryId;
                    return cat.parentCategoryId?.toString() === parentId.toString();
                })
                .map(cat => {
                    const subCategories = buildTree(cat._id.toString());
                    return {
                        _id: cat._id,
                        name: cat.name,
                        parentCategoryId: cat.parentCategoryId || null,
                        subCategories: subCategories.length ? subCategories : null
                    };
                });
        };

        res.send(buildTree());

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
// Creare una nuova Categoria ✅
router.post("/", async (req, res) => {
    try {
        const newCategory = await validateCategory(req.body);

        if (newCategory.error) {
            return res.status(400).json(newCategory);
        }

        const createdCategory = await Categories.create(newCategory);

        res.status(201).json({
            success: true,
            message: "Categoria creata con successo.",
            data: createdCategory,
        });
    } catch (error) {
        console.error("❌ Errore POST /categories:", error);
        res.status(500).json({ error: true, message: error.message });
    }
});

// Aggiornare una categoria per ID ✅
router.patch("/:id", async (req, res) => {
    const { id } = req.params;

    // Controllo se id è un ObjectId valido
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: true, message: "ID non valido." });
    }

    try {
        // Valida i dati in ingresso (solo i campi forniti)
        const updateData = await validateCategory(req.body, true); // true = aggiornamento parziale

        if (updateData.error) {
            return res.status(400).json(updateData);
        }

        // Aggiorna solo i campi forniti
        const updatedCategory = await Categories.findByIdAndUpdate(
            id,
            { $set: updateData },
            {
                new: true,         // Restituisce il documento aggiornato
                runValidators: true // Rispetta i validatori dello schema
            }
        );

        if (!updatedCategory) {
            return res.status(404).json({ error: true, message: "Categoria non trovata." });
        }

        res.json({
            success: true,
            message: "Categoria aggiornata con successo.",
            data: updatedCategory,
        });
    } catch (error) {
        console.error("❌ Errore PATCH /categories/:id:", error);
        res.status(500).json({ error: true, message: error.message });
    }
});


// Eliminare una Categoria per ID
router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    //controllo se id è un ObjectId valido
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({ error: true, message: "ID non valido." });
    }
    // Prova a trovare ed eliminare la spesa
    try {
        const deletedCategory = await Categories.findByIdAndDelete(id);
        if (!deletedCategory) {
            return res.status(404).send({ error: true, message: "Categoria non trovata." });
        }
        res.send({ message: "Categoria eliminata con successo.", deletedExpense });
    } catch (error) {
        res.status(500).send({ error: true, message: error.message });
    }
});



export default router;
