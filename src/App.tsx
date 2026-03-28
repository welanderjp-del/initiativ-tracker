import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Minus, Trash2, RotateCcw, ChevronRight, ChevronLeft, X, Search } from "lucide-react";
import { MONSTER_LIST } from "./constants";
import { TrackerRow, Theme, AppState } from "./types";

const LOCAL_STORAGE_KEY = "dd-initiative-tracker-state";

export default function App() {
  const [rows, setRows] = useState<TrackerRow[]>([]);
  const [currentTurnId, setCurrentTurnId] = useState<string | null>(null);
  const [round, setRound] = useState(1);
  const [theme, setTheme] = useState<Theme>("surface");
  const [resetConfirm, setResetConfirm] = useState(false);
  const [hoveredMonster, setHoveredMonster] = useState<{ slug: string; x: number; y: number } | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [monsterCache, setMonsterCache] = useState<Record<string, string>>({});
  const [isHoveringPopup, setIsHoveringPopup] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Apply theme to body
  useEffect(() => {
    document.body.className = `theme-${theme}`;
  }, [theme]);

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

  const fetchMonsterInfo = async (slug: string) => {
    if (monsterCache[slug]) return;
    setIsLoadingInfo(true);
    try {
      // Try corsproxy.io first as it's often more reliable
      const url = `https://www.aidedd.org/monster/${slug}`;
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const jaune = doc.querySelector(".jaune");
      
      if (jaune) {
        // Find all potential stat blocks
        let carBlocks = Array.from(jaune.querySelectorAll('[class*="car-block"], [class*="car_block"]'));
        
        // Fallback: if no car-block class, look for a div containing "STR"
        if (carBlocks.length === 0) {
          const allDivs = Array.from(jaune.querySelectorAll('div'));
          const strDiv = allDivs.find(d => d.textContent?.trim() === 'STR');
          if (strDiv && strDiv.parentElement) {
            carBlocks = [strDiv.parentElement];
          }
        }

        carBlocks.forEach(carBlock => {
          let stats = Array.from(carBlock.children);
          
          // Normalize if possible (12 elements = Label + Score(+Mod), 18 = Label + Score + Mod)
          if (stats.length === 12 || stats.length === 18) {
            const newStats: Element[] = [];
            const step = stats.length / 6;
            for (let i = 0; i < stats.length; i += step) {
              const label = stats[i];
              const value = stats[i+1];
              if (!label || !value) continue;
              
              newStats.push(label);
              const text = value.textContent?.trim() || "";
              const match = text.match(/^(\d+)\s*\(([-+]\d+)\)$/);
              
              if (match) {
                const score = document.createElement('div');
                score.textContent = match[1];
                const mod = document.createElement('div');
                mod.textContent = match[2];
                const save = document.createElement('div');
                save.textContent = match[2];
                newStats.push(score, mod, save);
              } else {
                const parts = text.split(/\s+/);
                const score = document.createElement('div');
                score.textContent = parts[0] || "10";
                const mod = document.createElement('div');
                mod.textContent = parts[1]?.replace(/[()]/g, '') || "+0";
                const save = document.createElement('div');
                save.textContent = mod.textContent;
                newStats.push(score, mod, save);
              }
            }
            stats = newStats;
          }
          
          const newGrid = document.createElement('div');
          
          if (stats.length >= 24) {
            newGrid.className = 'car-block-grid';
            
            // Row 1: Headers
            for (let i = 0; i < 3; i++) {
              const b1 = document.createElement('div');
              const b2 = document.createElement('div');
              const mod = document.createElement('div');
              mod.textContent = 'MOD';
              const save = document.createElement('div');
              save.textContent = 'SAVE';
              newGrid.appendChild(b1);
              newGrid.appendChild(b2);
              newGrid.appendChild(mod);
              newGrid.appendChild(save);
            }
            
            // Row 2: STR, DEX, CON
            for (let i = 0; i < 12; i++) {
              newGrid.appendChild(stats[i]);
            }
            
            // Row 3: INT, WIS, CHA
            for (let i = 12; i < 24; i++) {
              newGrid.appendChild(stats[i]);
            }
          } else {
            newGrid.className = 'car-block-grid-simple';
            stats.forEach(s => newGrid.appendChild(s));
          }
          carBlock.replaceWith(newGrid);
        });
        setMonsterCache(prev => ({ ...prev, [slug]: jaune.innerHTML }));
      } else {
        // Fallback to allorigins if first one fails to find content
        throw new Error("Content not found with primary proxy");
      }
    } catch (e) {
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
          setMonsterCache(prev => ({ ...prev, [slug]: jaune.innerHTML }));
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
            setMonsterCache(prev => ({ ...prev, [slug]: jaune.innerHTML }));
          }
        } catch (thirdError) {
          console.error("All proxies failed:", thirdError);
          setMonsterCache(prev => ({ ...prev, [slug]: "<div class='p-4 text-red-500 font-bold'>Fejl ved hentning af monster info. Alle proxyer fejlede. Prøv igen senere eller tjek din internetforbindelse.</div>" }));
        }
      }
    } finally {
      setIsLoadingInfo(false);
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
            <img src="https://res.cloudinary.com/dtw8jfk0k/image/upload/v1774287946/ikon_m2x8mj.png" alt="Logo" className="w-10 h-10" referrerPolicy="no-referrer" />
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
            <option value="underdark">Underdark</option>
            <option value="feywild">Feywild</option>
            <option value="shadowfell">Shadowfell</option>
          </select>
        </div>
      </header>

      {/* Tracker Table */}
      <main className="w-full">
        <div className="w-full space-y-1">
          {/* Table Header */}
          <div className="tracker-grid px-4 py-2 font-bold text-sm uppercase tracking-wider opacity-70 hidden md:grid">
            <div>Init</div>
            <div>Billede</div>
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
                      if (!isHoveringPopup) setHoveredMonster(null);
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
        {(hoveredMonster || isHoveringPopup) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, x: 10 }}
            className="monster-info-popup"
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
              setIsHoveringPopup(true);
            }}
            onMouseLeave={() => {
              setIsHoveringPopup(false);
              setHoveredMonster(null);
            }}
            style={{
              left: (hoveredMonster?.x || 0) + 15,
              top: (hoveredMonster?.y || 0) < window.innerHeight / 2 ? Math.max(10, (hoveredMonster?.y || 0) - 100) : "auto",
              bottom: (hoveredMonster?.y || 0) >= window.innerHeight / 2 ? Math.max(10, window.innerHeight - (hoveredMonster?.y || 0) - 100) : "auto",
              width: (monsterCache[hoveredMonster?.slug || ""]?.length || 0) > 2000 ? "1100px" : (monsterCache[hoveredMonster?.slug || ""]?.length || 0) > 800 ? "750px" : "450px",
              minWidth: "450px",
              maxWidth: Math.min(1100, window.innerWidth - (hoveredMonster?.x || 0) - 60),
              maxHeight: (hoveredMonster?.y || 0) < window.innerHeight / 2 
                ? `calc(100vh - ${Math.max(10, (hoveredMonster?.y || 0) - 100) + 20}px)` 
                : `calc(100vh - ${Math.max(10, window.innerHeight - (hoveredMonster?.y || 0) - 100) + 20}px)`,
              overflowX: "auto"
            }}
          >
            {isLoadingInfo && !monsterCache[hoveredMonster?.slug || ""] ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9c2b1b]"></div>
              </div>
            ) : (
              <div 
                className="monster-info-content"
                style={{ height: "100%" }}
                dangerouslySetInnerHTML={{ __html: monsterCache[hoveredMonster?.slug || ""] || "Henter information..." }} 
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer info */}
      <footer className="mt-4 text-center opacity-50 text-sm">
        <p>Genveje: Enter (Næste), Backspace (Forrige), + (Tilføj), - (Fjern)</p>
      </footer>
    </div>
  );
}
