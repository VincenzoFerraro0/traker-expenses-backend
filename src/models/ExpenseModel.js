import mongoose from "mongoose";

const { Schema, model} = mongoose;

const expenseSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    expenseDate: { type: Date, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true }
  },
  { timestamps: true }
 
);

export const Expenses = model('Expenses', expenseSchema);