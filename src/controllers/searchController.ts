import { Request, Response } from "express";
import axios from "axios";

export const searchProducts = async (req: Request, res: Response) => {
  const query = req.query.q as string;

  if (!query || query.length < 3) {
    return res.status(400).json({ error: "Query must be at least 3 characters." });
  }

  try {
    const { GOOGLE_SEARCH_API_KEY, GOOGLE_SEARCH_CX } = process.env;

    if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_CX) {
      return res.status(500).json({ error: "Search API configuration missing." });
    }

    const response = await axios.get("https://www.googleapis.com/customsearch/v1", {
      params: {
        key: GOOGLE_SEARCH_API_KEY,
        cx: GOOGLE_SEARCH_CX,
        q: query,
      },
    });

    res.json({ items: response.data.items || [] });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Failed to fetch search results." });
  }
};
