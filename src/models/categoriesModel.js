import mongoose from "mongoose";

const { Schema, model } = mongoose;

const CategoriesSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  parentCategoryId: {
    type: Schema.Types.ObjectId,
    ref: "Categories", // riferimento al modello Categories stesso
    default: null,     // opzionale, così una categoria root non ha parent
  },
});

export default model("Categories", CategoriesSchema);
