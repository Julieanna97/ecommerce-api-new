import { Request, Response } from "express";
import { IProduct } from "../models/interfaces/IProduct";
import { logError } from "../utilities/logger";
import { Product } from "../models/Product";

const productModel = new Product();

export const getProducts = async (_req: Request, res: Response) => {
  try {
    const products = await productModel.findAll<IProduct>();
    res.json(products);
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({ error: logError(error) });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.id);

    if (Number.isNaN(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await productModel.findById<IProduct>(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error("Get product by ID error:", error);
    res.status(500).json({ error: logError(error) });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const newId = await productModel.create(req.body);

    res.status(201).json({
      message: "Product created",
      id: newId,
    });
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({ error: logError(error) });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.id);

    if (Number.isNaN(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    await productModel.update(productId, req.body);

    res.json({ message: "Product updated" });
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({ error: logError(error) });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.id);

    if (Number.isNaN(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    await productModel.deleteById(productId);

    res.json({ message: "Product deleted" });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({ error: logError(error) });
  }
};