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

  // API Route to get monster data (checks local cache first, then fetches from aidedd)
  app.get("/api/monster/:slug", async (req, res) => {
    const { slug } = req.params;
    const filePath = path.join(__dirname, "public", "monsters.json");
    
    try {
      let monsters: Record<string, string> = {};
      if (fs.existsSync(filePath)) {
        monsters = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      }

      if (monsters[slug]) {
        return res.json({ source: "cache", html: monsters[slug] });
      }

      // If not in cache, fetch from aidedd (server-side fetch avoids CORS)
      const url = `https://www.aidedd.org/monster/${slug}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Aidedd returned ${response.status}`);
      
      const html = await response.text();
      res.json({ source: "remote", html });
    } catch (error) {
      console.error(`Error fetching monster ${slug}:`, error);
      res.status(500).json({ error: "Failed to fetch monster" });
    }
  });

  // API Route to save a single processed monster to the local cache
  app.post("/api/save-monster", (req, res) => {
    try {
      const { slug, html } = req.body;
      const filePath = path.join(__dirname, "public", "monsters.json");
      
      let monsters: Record<string, string> = {};
      if (fs.existsSync(filePath)) {
        monsters = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      }

      monsters[slug] = html;
      fs.writeFileSync(filePath, JSON.stringify(monsters, null, 2));
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving monster:", error);
      res.status(500).json({ error: "Failed to save monster" });
    }
  });

  // API Route to save all monster data (legacy support)
  app.post("/api/save-monsters", (req, res) => {
    try {
      const monsters = req.body;
      const filePath = path.join(__dirname, "public", "monsters.json");
      fs.writeFileSync(filePath, JSON.stringify(monsters, null, 2));
      console.log(`Successfully saved ${Object.keys(monsters).length} monsters to ${filePath}`);
      res.json({ success: true, count: Object.keys(monsters).length });
    } catch (error) {
      console.error("Error saving monsters:", error);
      res.status(500).json({ error: "Failed to save monsters" });
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
