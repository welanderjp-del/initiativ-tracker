import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Route to proxy monster data from aidedd (avoids CORS)
  app.get("/api/monster/:slug", async (req, res) => {
    const { slug } = req.params;
    
    try {
      const url = `https://www.aidedd.org/monster/${slug}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Aidedd returned ${response.status}`);
      
      const html = await response.text();
      res.json({ html });
    } catch (error) {
      console.error(`Error fetching monster ${slug}:`, error);
      res.status(500).json({ error: "Failed to fetch monster" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
