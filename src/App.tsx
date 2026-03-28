import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Minus, Trash2, RotateCcw, ChevronRight, ChevronLeft, X, Search, LogIn, Database } from "lucide-react";
import { MONSTER_LIST } from "./constants";
import { TrackerRow, Theme, AppState } from "./types";
import { db, auth, signIn } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

const LOCAL_STORAGE_KEY = "dd-initiative-tracker-state";

export default function App() {
  const [rows, setRows] = useState<TrackerRow[]>([]);
  const [currentTurnId, setCurrentTurnId] = useState<string | null>(null);
  const [round, setRound] = useState(1);
  const [theme, setTheme] = useState<Theme>("surface");
  const [resetConfirm, setResetConfirm] = useState(false);
  const [hoveredMonster, setHoveredMonster] = useState<{ slug: string; x: number; y: number } | null>(null);
  const [loadingSlugs, setLoadingSlugs] = useState<Set<string>>(new Set());
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [monsterCache, setMonsterCache] = useState<Record<string, string>>({});
  const [user, setUser] = useState<User | null>(null);
  const [isCachingAll, setIsCachingAll] = useState(false);
  const [cacheProgress, setCacheProgress] = useState(0);
  const [isHoveringPopup, setIsHoveringPopup] = useState(false);
  const isHoveringPopupRef = useRef(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync ref with state
  useEffect(() => {
    isHoveringPopupRef.current = isHoveringPopup;
  }, [isHoveringPopup]);

  // Apply theme to body
  useEffect(() => {
    document.body.className = `theme-${theme}`;
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Load state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed: any = JSON.parse(saved);
        setRows(parsed.rows);
        // Migration for old state using index
        if (typeof parsed.currentTurnIndex === 'number' && parsed.rows[parsed.currentTurnIndex]) {
          setCurrentTurnId(parsed.rows[parsed.currentTurnIndex].id);
        } else {
          setCurrentTurnId(parsed.currentTurnId || (parsed.rows[0]?.id || null));
        }
        setRound(parsed.round);
        setTheme(parsed.theme);
      } catch (e) {
        console.error("Failed to parse saved state", e);
      }
    } else {
      const id = crypto.randomUUID();
      setRows([{ id, initiative: "", name: "", hp: "", notes: "" }]);
      setCurrentTurnId(id);
    }
  }, []);

  // Save state to localStorage
  useEffect(() => {
    const state = { rows, currentTurnId, round, theme };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }, [rows, currentTurnId, round, theme]);

  const addRow = useCallback(() => {
    const id = crypto.randomUUID();
    setRows((prev) => [...prev, { id, initiative: "", name: "", hp: "", notes: "" }]);
    if (!currentTurnId) setCurrentTurnId(id);
  }, [currentTurnId]);

  const cacheAllMonsters = async () => {
    if (!user) {
      alert("Du skal være logget ind for at cache monstre.");
      return;
    }
    setIsCachingAll(true);
    let count = 0;
    for (const monster of MONSTER_LIST) {
      try {
        const monsterDocRef = doc(db, "monsters", monster.slug);
        const monsterDoc = await getDoc(monsterDocRef);
        if (!monsterDoc.exists()) {
          await fetchMonsterInfo(monster.slug);
          // Small delay to avoid rate limiting
          await new Promise(r => setTimeout(r, 500));
        }
      } catch (err) {
        console.error(`Failed to cache ${monster.name}:`, err);
      }
      count++;
      setCacheProgress(Math.round((count / MONSTER_LIST.length) * 100));
    }
    setIsCachingAll(false);
    alert("Caching færdig!");
  };

  const removeRow = useCallback((id: string) => {
    setRows((prev) => {
      const newRows = prev.filter((r) => r.id !== id);
      if (currentTurnId === id) {
        const index = prev.findIndex(r => r.id === id);
        const nextRow = newRows[index] || newRows[index - 1] || newRows[0];
        setCurrentTurnId(nextRow?.id || null);
      }
      return newRows;
    });
  }, [currentTurnId]);

  const handleRemoveLast = useCallback(() => {
    setRows((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (!last.name && last.initiative === "" && last.hp === "") {
        if (currentTurnId === last.id) {
          setCurrentTurnId(prev[prev.length - 2]?.id || null);
        }
        return prev.slice(0, -1);
      }
      return prev;
    });
  }, [currentTurnId]);

  const nextTurn = useCallback(() => {
    if (rows.length === 0) return;
    const currentIndex = rows.findIndex(r => r.id === currentTurnId);
    const nextIndex = currentIndex + 1;
    
    if (nextIndex >= rows.length) {
      setRound((r) => r + 1);
      setCurrentTurnId(rows[0].id);
    } else {
      setCurrentTurnId(rows[nextIndex].id);
    }
  }, [rows, currentTurnId]);

  const prevTurn = useCallback(() => {
    if (rows.length === 0) return;
    const currentIndex = rows.findIndex(r => r.id === currentTurnId);
    const prevIndex = currentIndex - 1;
    
    if (prevIndex < 0) {
      setRound((r) => Math.max(1, r - 1));
      setCurrentTurnId(rows[rows.length - 1].id);
    } else {
      setCurrentTurnId(rows[prevIndex].id);
    }
  }, [rows, currentTurnId]);

  const resetTracker = () => {
    if (resetConfirm) {
      const id = crypto.randomUUID();
      setRows([{ id, initiative: "", name: "", hp: "", notes: "" }]);
      setCurrentTurnId(id);
      setRound(1);
      setResetConfirm(false);
    } else {
      setResetConfirm(true);
      setTimeout(() => setResetConfirm(false), 3000);
    }
  };

  const processJaune = (jaune: Element) => {
    const statLabelsMap: { [key: string]: string } = {
      "STR": "STR", "FOR": "STR",
      "DEX": "DEX",
      "CON": "CON",
      "INT": "INT",
      "WIS": "WIS", "SAG": "WIS",
      "CHA": "CHA"
    };
    const statLabels = Object.keys(statLabelsMap);

    // Remove loose MOD/SAVE headers that often appear in aidedd.org blocks
    jaune.querySelectorAll('div, b, span, td, p').forEach(el => {
      const t = el.textContent?.trim().toUpperCase();
      if (t === 'MOD' || t === 'SAVE') {
        el.remove();
      }
    });

    // Find all potential stat blocks
    let carBlocks = Array.from(jaune.querySelectorAll('[class*="car-block"], [class*="car_block"]'));
    
    // If no car-block container, look for the loose .car elements
    if (carBlocks.length === 0) {
      const looseStats = Array.from(jaune.querySelectorAll('.car, .car1, .car2, .car3, .car4, .car5, .car6'));
      if (looseStats.length >= 6) {
        const wrapper = document.createElement('div');
        wrapper.className = 'car-block';
        const first = looseStats[0];
        const parent = first.parentElement;
        if (parent) {
          parent.insertBefore(wrapper, first);
          // Move all found loose stats into the wrapper
          looseStats.forEach(stat => wrapper.appendChild(stat));
          carBlocks = [wrapper];
        }
      }
    }

    // Fallback: if still no car-block class, look for a div containing a stat label
    if (carBlocks.length === 0) {
      const allElements = Array.from(jaune.querySelectorAll('div, b, span, td, p'));
      const firstStatEl = allElements.find(d => {
        const t = d.textContent?.trim().toUpperCase() || "";
        return statLabels.includes(t);
      });
      
      if (firstStatEl && firstStatEl.parentElement) {
        // Try to find a common parent that contains most stats, but stay inside jaune
        let bestParent = firstStatEl.parentElement;
        while (bestParent && bestParent.parentElement && bestParent.parentElement !== jaune && 
               bestParent.textContent && 
               statLabels.filter(l => bestParent.textContent!.toUpperCase().includes(l)).length < 4) {
          bestParent = bestParent.parentElement as HTMLElement;
        }
        if (bestParent && bestParent !== jaune) carBlocks = [bestParent];
      }
    }

    carBlocks.forEach(carBlock => {
      // Flatten all text content from the block
      const flattenedTexts: string[] = [];
      const extract = (el: Node) => {
        if (el.nodeType === Node.TEXT_NODE) {
          const t = el.textContent?.trim();
          if (t) flattenedTexts.push(t);
        } else if (el.nodeType === Node.ELEMENT_NODE) {
          const element = el as Element;
          // If it's a script or style, skip
          if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') return;
          
          if (element.children.length === 0) {
            const t = element.textContent?.trim();
            if (t) flattenedTexts.push(t);
          } else {
            Array.from(element.childNodes).forEach(extract);
          }
        }
      };
      extract(carBlock);
      
      const filteredTexts = flattenedTexts.filter(t => {
        const ut = t.toUpperCase();
        return ut !== 'MOD' && ut !== 'SAVE' && ut !== '';
      });
      
      const stats: { label: string, score: string, mod: string, save: string }[] = [];
      let currentStat: any = null;

      filteredTexts.forEach(text => {
        const upper = text.toUpperCase();
        if (statLabels.includes(upper)) {
          if (currentStat) {
            if (currentStat.mod && !currentStat.save) currentStat.save = currentStat.mod;
            stats.push(currentStat);
          }
          currentStat = { label: statLabelsMap[upper], score: "", mod: "", save: "" };
        } else if (currentStat) {
          const fullMatch = text.match(/^(\d+)\s*\(([-+]\d+)\)$/);
          if (fullMatch) {
            currentStat.score = fullMatch[1];
            currentStat.mod = fullMatch[2];
            currentStat.save = fullMatch[2];
          } else {
            const scoreMatch = text.match(/^\d+$/);
            const modMatch = text.match(/^[-+]\d+$/);
            if (scoreMatch && !currentStat.score) {
              currentStat.score = text;
            } else if (modMatch) {
              if (!currentStat.mod) currentStat.mod = text;
              else if (!currentStat.save) currentStat.save = text;
            }
          }
        }
      });
      if (currentStat) {
        if (currentStat.mod && !currentStat.save) currentStat.save = currentStat.mod;
        stats.push(currentStat);
      }

      // We should have 6 stats for a full table, but let's render whatever we find
      if (stats.length > 0) {
        const wrapper = document.createElement('div');
        wrapper.className = 'monster-stat-wrapper';
        
        let tableHtml = `<table class="monster-stat-table">`;
        
        // Headers Row
        tableHtml += `<tr>`;
        for (let i = 0; i < 3; i++) {
          tableHtml += `<th class="stat-header-empty"></th><th class="stat-header-empty"></th><th class="stat-header">MOD</th><th class="stat-header">SAVE</th>`;
        }
        tableHtml += `</tr>`;
        
        // Data Rows
        for (let row = 0; row < Math.ceil(stats.length / 3); row++) {
          tableHtml += `<tr>`;
          for (let col = 0; col < 3; col++) {
            const i = row * 3 + col;
            if (i < stats.length) {
              const s = stats[i];
              tableHtml += `
                <td class="stat-label">${s.label}</td>
                <td class="stat-score">${s.score}</td>
                <td class="stat-mod">${s.mod || "+0"}</td>
                <td class="stat-save">${s.save || s.mod || "+0"}</td>
              `;
            } else if (row === 0) {
               // Fill empty cells if first row is not full
               tableHtml += `<td colspan="4"></td>`;
            }
          }
          tableHtml += `</tr>`;
        }
        
        tableHtml += `</table>`;
        wrapper.innerHTML = tableHtml;
        
        // Final safety check: if carBlock is jaune, don't replace it, replace its children
        if (carBlock === jaune) {
          // This case should be avoided by the fallback logic, but just in case:
          // We find the first and last stat elements and replace that range
          const first = Array.from(jaune.querySelectorAll('*')).find(el => statLabels.includes(el.textContent?.trim().toUpperCase() || ""));
          if (first && first.parentElement) {
             first.parentElement.insertBefore(wrapper, first);
             // We can't easily remove the others without knowing where they end, 
             // but at least the table will be there.
          }
        } else {
          carBlock.replaceWith(wrapper);
        }
      }
    });

    // FINAL AGGRESSIVE CLEANUP: Remove all empty nodes and redundant line breaks
    const cleanNodes = (root: Element) => {
      // First, remove any BR tags that are immediately after the stat table wrapper
      const wrappers = root.querySelectorAll('.monster-stat-wrapper');
      wrappers.forEach(w => {
        let next = w.nextSibling;
        while (next && (next.nodeName === 'BR' || (next.nodeType === Node.TEXT_NODE && !next.textContent?.trim()))) {
          const toRemove = next;
          next = next.nextSibling;
          toRemove.remove();
        }
      });

      const all = Array.from(root.querySelectorAll('*'));
      // Process backwards to handle nested empty elements
      all.reverse().forEach(el => {
        if (el.classList.contains('monster-stat-wrapper')) return;
        if (el.querySelector('img, table, iframe, .monster-stat-wrapper, canvas, svg')) return;
        
        // Handle non-breaking spaces and other whitespace
        const text = el.textContent?.replace(/\u00a0/g, ' ').trim();
        if (!text && !['BR', 'HR', 'IMG', 'IFRAME', 'CANVAS', 'SVG', 'TH', 'TD'].includes(el.tagName)) {
          el.remove();
        }
      });

      // Remove redundant BRs and BRs at start/end of containers
      root.querySelectorAll('br').forEach(br => {
        const next = br.nextSibling;
        
        // Remove if it's followed by another BR or if it's the last child
        if (!next || next.nodeName === 'BR' || (next.nodeType === Node.ELEMENT_NODE && (next as Element).tagName === 'BR')) {
          br.remove();
        }
      });
      
      // Remove BRs at the very beginning
      while (root.firstChild && root.firstChild.nodeName === 'BR') {
        root.removeChild(root.firstChild);
      }
    };
    cleanNodes(jaune);
  };

  useEffect(() => {
    if (!hoveredMonster) {
      isHoveringPopupRef.current = false;
      setIsHoveringPopup(false);
    }
  }, [hoveredMonster]);

  const fetchMonsterInfo = async (slug: string) => {
    if (monsterCache[slug] || loadingSlugs.has(slug)) return;
    setLoadingSlugs(prev => new Set(prev).add(slug));
    
    try {
      // 1. Try Firestore Cache first
      const monsterDocRef = doc(db, "monsters", slug);
      const monsterDoc = await getDoc(monsterDocRef);
      
      if (monsterDoc.exists()) {
        const data = monsterDoc.data();
        setMonsterCache(prev => ({ ...prev, [slug]: data.htmlContent }));
        setLoadingSlugs(prev => {
          const next = new Set(prev);
          next.delete(slug);
          return next;
        });
        return;
      }

      // 2. If not in Firestore, fetch from aidedd via proxy
      const url = `https://www.aidedd.org/monster/${slug}`;
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const html = await response.text();
      const parser = new DOMParser();
      const docObj = parser.parseFromString(html, "text/html");
      const jaune = docObj.querySelector(".jaune");
      
      if (jaune) {
        processJaune(jaune);
        const content = jaune.innerHTML;
        setMonsterCache(prev => ({ ...prev, [slug]: content }));
        
        // 3. Save to Firestore for future users
        if (auth.currentUser) {
          try {
            const monsterData = MONSTER_LIST.find(m => m.slug === slug);
            await setDoc(monsterDocRef, {
              slug,
              name: monsterData?.name || slug,
              htmlContent: content,
              lastUpdated: serverTimestamp()
            });
          } catch (err) {
            console.warn("Failed to cache to Firestore:", err);
          }
        }
      } else {
        throw new Error("Content not found with primary proxy");
      }
    } catch (e) {
      // ... existing fallback logic ...
      console.warn("Primary proxy failed, trying fallback...", e);
      try {
        const url = `https://www.aidedd.org/monster/${slug}`;
        const fallbackUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const response = await fetch(fallbackUrl);
        const data = await response.json();
        const html = data.contents;
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const jaune = doc.querySelector(".jaune");
        if (jaune) {
          processJaune(jaune);
          setMonsterCache(prev => ({ ...prev, [slug]: jaune.innerHTML }));
        } else {
          throw new Error("Content not found with secondary proxy");
        }
      } catch (fallbackError) {
        console.warn("Second proxy failed, trying third fallback...", fallbackError);
        try {
          const url = `https://www.aidedd.org/monster/${slug}`;
          const thirdUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
          const response = await fetch(thirdUrl);
          const html = await response.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          const jaune = doc.querySelector(".jaune");
          if (jaune) {
            processJaune(jaune);
            setMonsterCache(prev => ({ ...prev, [slug]: jaune.innerHTML }));
          } else {
            setMonsterCache(prev => ({ ...prev, [slug]: "<div class='p-4 text-red-500 font-bold'>Ingen information fundet for dette monster på aidedd.org.</div>" }));
          }
        } catch (thirdError) {
          console.error("All proxies failed:", thirdError);
          setMonsterCache(prev => ({ ...prev, [slug]: "<div class='p-4 text-red-500 font-bold'>Fejl ved hentning af monster info. Alle proxyer fejlede. Prøv igen senere eller tjek din internetforbindelse.</div>" }));
        }
      }
    } finally {
      setLoadingSlugs(prev => {
        const next = new Set(prev);
        next.delete(slug);
        return next;
      });
    }
  };

  const sortRows = () => {
    setRows((prev) => {
      return [...prev].sort((a, b) => {
        const initA = Number(a.initiative) || 0;
        const initB = Number(b.initiative) || 0;
        return initB - initA;
      });
    });
  };

  const updateRow = (id: string, updates: Partial<TrackerRow>) => {
    setRows((prev) => {
      const newRows = prev.map((r) => (r.id === id ? { ...r, ...updates } : r));
      
      if (updates.monsterSlug) {
        fetchMonsterInfo(updates.monsterSlug);
      }

      return newRows;
    });
  };

  const handleDamageHeal = (id: string, value: string, currentHp: number | "") => {
    const amount = parseInt(value);
    if (isNaN(amount)) return;
    const baseHp = currentHp === "" ? 0 : currentHp;
    updateRow(id, { hp: baseHp - amount });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName);
      
      if (isInput) {
        if (e.key === "Enter") {
          const target = e.target as HTMLInputElement;
          if (target.type === "number" && target.classList.contains("no-spinner")) {
            sortRows();
          }
          // Don't blur for notes/conditions
          if (target.tagName !== "TEXTAREA") {
            target.blur();
            e.preventDefault();
          }
        }
        return;
      }

      if (e.key === "Enter") {
        nextTurn();
        e.preventDefault();
      }
      if (e.key === "Backspace") {
        prevTurn();
        e.preventDefault();
      }
      if (e.key === "+") {
        addRow();
        e.preventDefault();
      }
      if (e.key === "-") {
        handleRemoveLast();
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextTurn, prevTurn, addRow, handleRemoveLast]);

  // Monster Info Fetching (Legacy/Fallback)
  useEffect(() => {
    if (!hoveredMonster || monsterCache[hoveredMonster.slug]) {
      return;
    }

    fetchMonsterInfo(hoveredMonster.slug);
  }, [hoveredMonster, monsterCache]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Auto-scroll to current turn
  useEffect(() => {
    if (currentTurnId) {
      const element = document.getElementById(`row-${currentTurnId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTurnId]);

  return (
    <div className={`min-h-screen p-4 md:p-8 font-sans transition-colors duration-300`}>
      {/* Header */}
      <header className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4 bg-[var(--card)] p-4 rounded-xl border border-[var(--border)] shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <a href="https://skolechips.dk" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="https://res.cloudinary.com/dtw8jfk0k/image/upload/v1774706790/d4b01caa-2d0a-405a-b893-1a04cfefab27_qf9jsx.png" alt="Logo" className="w-10 h-10" referrerPolicy="no-referrer" />
            <h1 className="text-2xl font-bold text-[var(--accent)]">D&D Initiativ</h1>
          </a>
          <div className="h-8 w-px bg-[var(--border)] mx-2" />
          <div className="text-lg font-semibold">Runde: {round}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={prevTurn} className="p-2 rounded-lg bg-[var(--bg)] hover:bg-[var(--accent)] hover:text-white transition-all border border-[var(--border)]" title="Forrige tur (Backspace)">
            <ChevronLeft size={20} />
          </button>
          <button onClick={nextTurn} className="p-2 rounded-lg bg-[var(--bg)] hover:bg-[var(--accent)] hover:text-white transition-all border border-[var(--border)]" title="Næste tur (Enter)">
            <ChevronRight size={20} />
          </button>
          
          <div className="w-px h-8 bg-[var(--border)] mx-1" />

          <button onClick={addRow} className="p-2 rounded-lg bg-[var(--bg)] hover:bg-[var(--accent)] hover:text-white transition-all border border-[var(--border)]" title="Tilføj række (+)">
            <Plus size={20} />
          </button>
          <button onClick={handleRemoveLast} className="p-2 rounded-lg bg-[var(--bg)] hover:bg-[var(--accent)] hover:text-white transition-all border border-[var(--border)]" title="Fjern række (-)">
            <Minus size={20} />
          </button>

          <div className="w-px h-8 bg-[var(--border)] mx-1" />

          <button 
            onClick={resetTracker} 
            className={`px-4 py-2 rounded-lg transition-all border border-[var(--border)] flex items-center gap-2 ${resetConfirm ? "bg-red-600 text-white" : "bg-[var(--bg)] hover:bg-red-500 hover:text-white"}`}
          >
            <RotateCcw size={18} />
            {resetConfirm ? "Sikker?" : "Nulstil"}
          </button>

          <select 
            value={theme} 
            onChange={(e) => setTheme(e.target.value as Theme)}
            className="p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="surface">Surface</option>
            <option value="faerun">Faerûn</option>
            <option value="underdark">Underdark</option>
            <option value="feywild">Feywild</option>
            <option value="shadowfell">Shadowfell</option>
            <option value="nine-hells">The Nine Hells</option>
            <option value="mount-celestia">Mount Celestia</option>
          </select>
        </div>
      </header>

      {/* Tracker Table */}
      <main className="w-full">
        <div className="w-full space-y-1">
          {/* Table Header */}
          <div className="tracker-grid px-4 py-2 font-bold text-sm uppercase tracking-wider opacity-70 hidden md:grid">
            <div>Init</div>
            <div>Ikon</div>
            <div>Navn</div>
            <div>HP</div>
            <div>Skade/Heal</div>
            <div>Noter & conditions</div>
            <div className="text-center">Slet</div>
          </div>

          <AnimatePresence mode="popLayout">
            {rows.map((row) => (
              <motion.div
                key={row.id}
                id={`row-${row.id}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className={`tracker-grid p-4 rounded-xl border items-center relative ${
                  row.id === currentTurnId 
                    ? "bg-[var(--accent)] text-white border-[var(--accent)] shadow-lg scale-[1.01] z-10" 
                    : "bg-[var(--card)] border-[var(--border)]"
                }`}
                style={{ zIndex: activeDropdownId === row.id ? 100 : (row.id === currentTurnId ? 10 : 1) }}
              >
                {/* Initiative */}
                <input
                  type="number"
                  value={row.initiative}
                  onChange={(e) => updateRow(row.id, { initiative: e.target.value === "" ? "" : Number(e.target.value) })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      sortRows();
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="w-full bg-transparent border-b border-current focus:outline-none text-center font-bold text-lg no-spinner"
                />

                {/* Image / Initials */}
                <div 
                  className="relative w-12 h-12 rounded-full overflow-hidden bg-black/10 flex items-center justify-center cursor-help group mx-auto"
                  onMouseEnter={(e) => {
                    if (row.monsterSlug) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                      setHoveredMonster({ slug: row.monsterSlug, x: rect.right, y: rect.top });
                    }
                  }}
                  onMouseLeave={() => {
                    hoverTimeoutRef.current = setTimeout(() => {
                      if (!isHoveringPopupRef.current) setHoveredMonster(null);
                    }, 150);
                  }}
                >
                  {row.monsterSlug ? (
                    <img 
                      src={`https://www.aidedd.org/monster/img/${row.monsterSlug}.jpg`} 
                      alt={row.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="font-bold text-sm">${getInitials(row.name)}</span>`;
                      }}
                    />
                  ) : (
                    <span className="font-bold text-sm">{getInitials(row.name)}</span>
                  )}
                </div>

                {/* Name with Dropdown */}
                <div className="relative">
                  <input
                    type="text"
                    value={row.name}
                    onFocus={() => setActiveDropdownId(row.id)}
                    onBlur={() => setTimeout(() => setActiveDropdownId(null), 200)}
                    onChange={(e) => {
                      updateRow(row.id, { name: e.target.value });
                      if (activeDropdownId !== row.id) setActiveDropdownId(row.id);
                    }}
                    className="w-full bg-transparent border-b border-current focus:outline-none text-lg"
                    placeholder="Navn..."
                  />
                  {activeDropdownId === row.id && (row.name.length > 0 || row.monsterSlug) && (
                    <div className="absolute top-full left-0 w-full max-h-64 overflow-y-auto bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-2xl z-[200] mt-1 scrollbar-thin">
                      {MONSTER_LIST.filter(m => m.name.toLowerCase().includes(row.name.toLowerCase())).map(m => (
                        <button
                          key={m.slug}
                          onMouseDown={(e) => e.preventDefault()} // Prevent blur before click
                          onClick={() => {
                            updateRow(row.id, { name: m.name, monsterSlug: m.slug });
                            setActiveDropdownId(null);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-[var(--accent)] hover:text-white transition-colors text-sm text-[var(--text)] border-b border-[var(--border)] last:border-0"
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* HP */}
                <input
                  type="number"
                  value={row.hp}
                  onChange={(e) => updateRow(row.id, { hp: e.target.value === "" ? "" : Number(e.target.value) })}
                  className="w-full bg-transparent border-b border-current focus:outline-none text-center font-bold"
                />

                {/* Damage/Heal */}
                <input
                  type="number"
                  placeholder="±"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => e.target.focus()} // Ensure focus when using arrows
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleDamageHeal(row.id, (e.target as HTMLInputElement).value, row.hp);
                      (e.target as HTMLInputElement).value = "";
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="w-full bg-black/5 dark:bg-white/5 rounded px-2 py-1 focus:outline-none text-center"
                />

                {/* Notes */}
                <textarea
                  value={row.notes}
                  onChange={(e) => updateRow(row.id, { notes: e.target.value })}
                  className="w-full bg-transparent border-b border-current focus:outline-none text-sm resize-none h-8"
                  placeholder="Noter..."
                />

                {/* Delete */}
                <button
                  onClick={() => removeRow(row.id)}
                  className="mx-auto p-2 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                >
                  <Trash2 size={20} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </main>

      {/* Monster Info Popup */}
      <AnimatePresence>
        {hoveredMonster?.slug && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, x: 10 }}
            className="monster-info-popup"
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
              setIsHoveringPopup(true);
              isHoveringPopupRef.current = true;
            }}
            onMouseLeave={() => {
              setIsHoveringPopup(false);
              isHoveringPopupRef.current = false;
              setHoveredMonster(null);
            }}
            style={{
              left: (hoveredMonster?.x || 0) + 15,
              top: 20,
              bottom: 20,
              width: "100%",
              minWidth: "400px",
              maxWidth: Math.min(
                (monsterCache[hoveredMonster?.slug || ""]?.length || 0) > 1500 ? 1100 : (monsterCache[hoveredMonster?.slug || ""]?.length || 0) > 600 ? 750 : 400,
                window.innerWidth - (hoveredMonster?.x || 0) - 60
              ),
              maxHeight: "calc(100vh - 40px)",
              overflowX: "auto"
            }}
          >
            {loadingSlugs.has(hoveredMonster?.slug || "") && !monsterCache[hoveredMonster?.slug || ""] ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9c2b1b]"></div>
                <span className="ml-3 font-serif">Henter information...</span>
              </div>
            ) : (
              <div 
                className="monster-info-content"
                style={{ height: "100%" }}
                dangerouslySetInnerHTML={{ __html: monsterCache[hoveredMonster?.slug || ""] || (loadingSlugs.has(hoveredMonster?.slug || "") ? "Henter information..." : "Ingen information fundet.") }} 
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer info */}
      <footer className="mt-8 text-center opacity-20 hover:opacity-100 transition-opacity text-[10px]">
        <p className="flex items-center justify-center gap-2">
          <span>Genveje: Enter (Næste), Backspace (Forrige), + (Tilføj), - (Fjern)</span>
          <span className="opacity-30">|</span>
          {user ? (
            <span className="flex items-center gap-2">
              <span className="opacity-50">{user.email}</span>
              {user.email === "welander.jp@gmail.com" && (
                <button 
                  onClick={cacheAllMonsters} 
                  disabled={isCachingAll} 
                  className="hover:text-[var(--accent)] transition-colors flex items-center gap-1"
                >
                  <Database size={10} />
                  {isCachingAll ? `Caching ${cacheProgress}%` : "Cache"}
                </button>
              )}
              <button onClick={() => auth.signOut()} className="hover:text-red-500 transition-colors">Log ud</button>
            </span>
          ) : (
            <button onClick={signIn} className="hover:text-[var(--accent)] transition-colors opacity-50 hover:opacity-100">Admin</button>
          )}
        </p>
      </footer>
    </div>
  );
}
