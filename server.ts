import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { MONSTER_LIST } from "./src/constants";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Load monster data from file if it exists
  let monsterData: Record<string, string> = {};
  const loadMonsterData = () => {
    const paths = [
      path.join(process.cwd(), "public", "monster-data.json"),
      path.join(process.cwd(), "monster-data.json"),
      path.join(__dirname, "public", "monster-data.json"),
      path.join(__dirname, "monster-data.json")
    ];
    
    for (const filePath of paths) {
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, "utf-8");
          monsterData = JSON.parse(content);
          console.log(`Loaded ${Object.keys(monsterData).length} monsters from ${filePath}`);
          return true;
        } catch (e) {
          console.error(`Failed to parse ${filePath}:`, e);
        }
      }
    }
    return false;
  };

  loadMonsterData();

  // API Route to serve the whole monster data file
  app.get("/monster-data.json", (req, res) => {
    if (Object.keys(monsterData).length === 0) {
      loadMonsterData();
    }
    
    if (Object.keys(monsterData).length > 0) {
      return res.json(monsterData);
    }
    
    res.status(404).json({ error: "Monster data file not found" });
  });

  app.get("/api/test-connection", async (req, res) => {
    try {
      const response = await fetch("https://www.aidedd.org/monster/aboleth", {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      res.json({ 
        status: response.status, 
        ok: response.ok, 
        message: response.ok ? "Connected to aidedd.org" : "Failed to connect to aidedd.org" 
      });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.get("/api/monster/:slug", async (req, res) => {
    const { slug } = req.params;
    
    // Check local data first
    if (Object.keys(monsterData).length === 0) {
      loadMonsterData();
    }
    
    if (monsterData[slug]) {
      return res.json({ html: monsterData[slug] });
    }

    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
    
    const tryFetch = async (url: string, name: string) => {
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": userAgent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
          }
        });
        if (response.ok) {
          const html = await response.text();
          // More lenient content check: look for standard monster block indicators
          const commonMarkers = [
            'class="jaune"', 
            'id="monstre"', 
            'class="red"', 
            'class="bloc"',
            'Armor Class',
            'Hit Points',
            'Classe d\'armure',
            'Points de vie',
            'Actions',
            'Traits',
            'Reactions',
            'Challenge',
            'Multiattack',
            'Spellcasting',
            'STR',
            'DEX',
            'CON',
            'INT',
            'WIS',
            'CHA',
            'Speed',
            'Senses'
          ];
          
          const hasContent = commonMarkers.some(marker => html.includes(marker));
            
          // Also check if the monster name or slug is present to avoid redirects to generic pages
          const nameLower = name.toLowerCase();
          const slugLower = slug.toLowerCase();
          const slugWithSpaces = slugLower.replace(/-/g, ' ');
          
          const containsName = 
            html.toLowerCase().includes(nameLower) || 
            html.toLowerCase().includes(slugLower) ||
            html.toLowerCase().includes(slugWithSpaces);

          if (hasContent && containsName) {
            return html;
          }
          // Only warn if it's a 200 but we didn't find what we expected
          if (response.status === 200) {
            console.warn(`Fetch to ${url} returned 200 but content check failed. hasContent: ${hasContent}, containsName: ${containsName}`);
          }
        }
        return null;
      } catch (e) {
        console.error(`Error fetching from ${url}:`, e);
        return null;
      }
    };

    try {
      const monster = MONSTER_LIST.find(m => m.slug === slug);
      const name = monster ? monster.name : slug;

      // Strategy 1: Direct monster path (User confirmed this is often correct)
      let html = await tryFetch(`https://www.aidedd.org/monster/${slug}`, name);
      
      // Strategy 2: Standard vo= parameter with hyphens
      if (!html) {
        html = await tryFetch(`https://www.aidedd.org/dnd/monstres.php?vo=${slug}`, name);
      }
      
      // Strategy 3: vo= parameter with spaces
      if (!html) {
        const spaceSlug = slug.replace(/-/g, '%20');
        html = await tryFetch(`https://www.aidedd.org/dnd/monstres.php?vo=${spaceSlug}`, name);
      }

      // Strategy 4: vo= parameter with pluses
      if (!html) {
        const plusSlug = slug.replace(/-/g, '+');
        html = await tryFetch(`https://www.aidedd.org/dnd/monstres.php?vo=${plusSlug}`, name);
      }
      
      // Strategy 5: vo= parameter with capitalized words and spaces
      if (!html) {
        const capSlug = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('%20');
        html = await tryFetch(`https://www.aidedd.org/dnd/monstres.php?vo=${capSlug}`, name);
      }

      // Strategy 6: vo= parameter with capitalized words and hyphens
      if (!html) {
        const capHyphenSlug = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-');
        html = await tryFetch(`https://www.aidedd.org/dnd/monstres.php?vo=${capHyphenSlug}`, name);
      }

      // Strategy 7: vo= parameter with underscores
      if (!html) {
        const underscoreSlug = slug.replace(/-/g, '_');
        html = await tryFetch(`https://www.aidedd.org/dnd/monstres.php?vo=${underscoreSlug}`, name);
      }

      // Strategy 8: vo= parameter with no separators
      if (!html) {
        const noSepSlug = slug.replace(/-/g, '');
        html = await tryFetch(`https://www.aidedd.org/dnd/monstres.php?vo=${noSepSlug}`, name);
      }

      if (html) {
        res.json({ html });
      } else {
        console.error(`Final failure: Monster ${slug} not found after all strategies.`);
        res.status(404).json({ error: "Monster not found on aidedd.org after multiple attempts" });
      }
    } catch (error) {
      console.error(`Proxy error for ${slug}:`, error);
      res.status(500).json({ error: "Internal server error during proxy fetch" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Running in DEVELOPMENT mode");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Running in PRODUCTION mode");
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
