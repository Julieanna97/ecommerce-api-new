import { Request, Response } from "express";
import { Cart } from "../models/Cart";
import { logError } from "../utilities/logger";

const cartModel = new Cart();

export const getCart = async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    try {
        const items = await cartModel.getCartItems(userId);
        res.json(items);
        
    } catch (error) {
        res.status(500).json({ error: logError(error) });
        
    }
};

export const addToCart = async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    const item = req.body;
    try {
        await cartModel.addItem(userId, item);
        res.status(201).json({ message: "Item added "});
        
    } catch (error) {
        res.status(500).json({ error: logError(error) });
        
    }
};

export const clearCart = async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    try {
        await cartModel.clearCart(userId);
        res.json({ messaeg: "Cart cleared" });
        
    } catch (error) {
        res.status(500).json({ error: logError(error) });
        
    }
};