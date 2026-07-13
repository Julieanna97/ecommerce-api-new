import { Request, Response } from "express";
import { IProduct } from "../models/interfaces/IProduct";
import { logError } from "../utilities/logger";
import { ResultSetHeader } from "mysql2";
import { Product } from "../models/Product";

const productModel = new Product();

export const getProducts = async (_: any, res: Response) => { 
  try {
    const products = await productModel.findAll<IProduct>();
    res.json(products);

  } catch (error) {
    res.status(500).json({error: logError(error)});
  }
};

export const getProductById = async (req: Request, res: Response) => { 
  
  try {
    const product = await productModel.findById<IProduct>(parseInt(String(req.params.id)));
    product ? res.json(product) : res.status(404).json({ message: "Not found" });
  } catch (error) {
    res.status(500).json({error: logError(error)})
  }
};

export const createProduct = async (req: Request, res: Response) => {
  
  try {
    const newId = await productModel.create(req.body);
    res.status(201).json({ message: "Created", id: newId });
  } catch(error) {
    res.status(500).json({error: logError(error)})
  }
}

export const updateProduct = async (req: Request, res: Response) => { 

  try {
    await productModel.update(parseInt(String(req.params.id)), req.body);
    res.json({ message: "Updated" });
    
  } catch(error) {
    res.status(500).json({error: logError(error)})
  }
}

export const updateProduct = async (req: Request, res: Response) => {
  try {
    console.log("PATCH /products/:id body:", req.body);
    await productModel.update(parseInt(req.params.id), req.body);
    res.json({ message: "Updated" });
  } catch (error: any) {
    console.error("Update error:", error);  // This line will help catch SQL or data problems
    res.status(500).json({ error: error.message || "Server error" });
  }
};


export const deleteProduct = async (req: Request, res: Response) => { 
  
  try {
    await productModel.deleteById(parseInt(String(req.params.id)));
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({error: logError(error)})
  }
}
