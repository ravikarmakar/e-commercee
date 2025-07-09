import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { PrismaClient } from "@prisma/client";

import authRoutes from "./routes/authRoutes";
import productRoutes from "./routes/productRoutes";
import couponRoutes from "./routes/couponRoutes";
import settingRoutes from "./routes/settingRoutes";
import cartRoutes from "./routes/cartRoutes";
import addressRoutes from "./routes/addressRoutes";
import orderRoutes from "./routes/orderRoutes";

const app = express();
const PORT = process.env.PORT || 3001;

const corsOptions = {
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

export const prisma = new PrismaClient();

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/coupon", couponRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/address", addressRoutes);
app.use("/api/order", orderRoutes);

app.get("/", (req, res) => {
  res.send("Hello form E-Commerce backend");
});

app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  console.log("Prisma Client disconnected");
  process.exit(0);
});
