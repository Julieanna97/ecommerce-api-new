import express from "express";
import { searchProducts } from "../controllers/searchController";
const router = express.Router();

router.get("/", searchProducts);

export default router;
