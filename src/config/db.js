import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();
// Funzione per connettersi al database MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
    });
    console.log(`✅ Database connesso:${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;

