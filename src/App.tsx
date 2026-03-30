import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Minus, Trash2, RotateCcw, ChevronRight, ChevronLeft, ChevronDown, X, Search } from "lucide-react";
import { TrackerRow, Theme, AppState } from "./types";
import { dataService, Monster } from "./services/dataService";
import { MonsterStatBlock } from "./components/StatBlockRenderer";

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
  const [monsterList, setMonsterList] = useState<{ name: string; source: string }[]>([]);
  const [monsterCache, setMonsterCache] = useState<Record<string, string | Monster>>(() => {
    const saved = localStorage.getItem("monster-cache");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return {};
      }
    }
    return {};
  });
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

  // Save monster cache to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("monster-cache", JSON.stringify(monsterCache));
  }, [monsterCache]);

  // Load state from localStorage
  useEffect(() => {
    const loadList = async () => {
      console.log("Loading monster list...");
      const list = await dataService.getMonsterList((partialList) => {
        setMonsterList(partialList);
      });
      console.log(`Monster list loaded: ${list.length} monsters.`);
      setMonsterList(list);
    };
    loadList();

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

  const fetchMonsterInfo = useCallback(async (slug: string) => {
    if (monsterCache[slug] || loadingSlugs.has(slug)) return;

    // The slug is expected to be "Name|Source" or just "Name"
    const [name, source] = slug.includes('|') ? slug.split('|') : [slug, ""];

    try {
      const monster = await dataService.getMonster(name, source);
      if (monster) {
        setMonsterCache(prev => ({ ...prev, [slug]: monster }));
        return;
      }
    } catch (e) {
      console.warn(`Monster lookup failed for ${name} (${source})`, e);
    }

    setMonsterCache(prev => ({ ...prev, [slug]: `<div class='p-4 text-red-500 font-bold'>Monsteret blev ikke fundet.</div>` }));
  }, [monsterCache, loadingSlugs]);

  // Fetch monster info for all rows that have a monsterSlug
  useEffect(() => {
    rows.forEach(row => {
      if (row.monsterSlug && !monsterCache[row.monsterSlug]) {
        fetchMonsterInfo(row.monsterSlug);
      }
    });
  }, [rows, monsterCache, fetchMonsterInfo]);

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

  const getLargeMonsterImageUrl = (name: string, source: string) => {
    let finalName = name;
    const dragonColors = ["black", "blue", "brass", "bronze", "copper", "deep", "gold", "green", "red", "silver", "spirit", "white"];
    const lowerName = name.toLowerCase();
    
    if (lowerName.startsWith("young ") || lowerName.startsWith("adult ")) {
      const parts = name.split(" ");
      const baseName = parts.slice(1).join(" ");
      const lowerBase = baseName.toLowerCase();
      
      if (dragonColors.some(color => lowerBase === `${color} dragon`)) {
        finalName = baseName;
      }
    }
    
    return `https://5e.tools/img/bestiary/${source}/${encodeURIComponent(finalName)}.webp`;
  };

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
          <a href="https://skolechips.dk/?dnd=true" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
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
            <option value="cormanthor">Cormanthor</option>
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
                <div className="bg-black/10 dark:bg-white/10 rounded-lg px-2 py-1">
                  <input
                    type="number"
                    value={row.initiative}
                    spellCheck={false}
                    onChange={(e) => updateRow(row.id, { initiative: e.target.value === "" ? "" : Number(e.target.value) })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        sortRows();
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="w-full bg-transparent border-none focus:outline-none text-center font-bold text-lg no-spinner"
                  />
                </div>

                {/* Image / Initials */}
                <div 
                  className="relative w-12 h-12 flex items-center justify-center cursor-pointer group mx-auto"
                  onMouseEnter={(e) => {
                    if (row.monsterSlug) {
                      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                      setHoveredMonster({ slug: row.monsterSlug, x: e.clientX, y: e.clientY });
                    }
                  }}
                  onMouseLeave={() => {
                    hoverTimeoutRef.current = setTimeout(() => {
                      if (!isHoveringPopupRef.current) setHoveredMonster(null);
                    }, 150);
                  }}
                >
                  {row.monsterSlug && !row.imageError ? (
                    <img 
                      key={`${row.id}-${row.monsterSlug}`}
                      src={(() => {
                        const m = monsterCache[row.monsterSlug];
                        if (m && typeof m !== 'string') {
                          return `https://5e.tools/img/bestiary/tokens/${m.source}/${encodeURIComponent(m.name)}.webp`;
                        }
                        const monsterEntry = monsterList.find(m => `${m.name}|${m.source}` === row.monsterSlug);
                        if (monsterEntry) {
                           return `https://5e.tools/img/bestiary/tokens/${monsterEntry.source || 'MM'}/${encodeURIComponent(monsterEntry.name)}.webp`;
                        }
                        return `https://www.aidedd.org/monster/img/${row.monsterSlug}.jpg`;
                      })()} 
                      alt={row.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onClick={(e) => {
                        e.stopPropagation();
                        const m = monsterCache[row.monsterSlug!];
                        if (m && typeof m !== 'string') {
                          window.open(getLargeMonsterImageUrl(m.name, m.source), "_blank");
                        } else {
                          const monsterEntry = monsterList.find(me => `${me.name}|${me.source}` === row.monsterSlug);
                          if (monsterEntry) {
                            window.open(getLargeMonsterImageUrl(monsterEntry.name, monsterEntry.source || 'MM'), "_blank");
                          } else {
                            window.open(`https://www.aidedd.org/monster/img/${row.monsterSlug}.jpg`, "_blank");
                          }
                        }
                      }}
                      onError={(e) => {
                        // Fallback to aidedd if token fails
                        const target = e.target as HTMLImageElement;
                        if (!target.src.includes('aidedd.org') && row.monsterSlug) {
                          const nameOnly = row.monsterSlug.split('|')[0].toLowerCase().replace(/\s+/g, '-');
                          target.src = `https://www.aidedd.org/monster/img/${nameOnly}.jpg`;
                        } else {
                          updateRow(row.id, { imageError: true });
                        }
                      }}
                    />
                  ) : (
                    <span className="font-bold text-sm">{getInitials(row.name)}</span>
                  )}
                </div>

                {/* Name with Dropdown */}
                <div className="relative bg-black/10 dark:bg-white/10 rounded-lg px-2 py-1">
                  <input
                    type="text"
                    value={row.name}
                    onFocus={() => setActiveDropdownId(row.id)}
                    onBlur={() => setTimeout(() => setActiveDropdownId(null), 200)}
                    onChange={(e) => {
                      const newName = e.target.value;
                      const updates: Partial<TrackerRow> = { name: newName };
                      // If the name is changed manually, we clear the monster connection
                      if (row.monsterSlug && row.name !== newName) {
                        updates.monsterSlug = undefined;
                        updates.imageError = false;
                      }
                      updateRow(row.id, updates);
                      if (activeDropdownId !== row.id) setActiveDropdownId(row.id);
                    }}
                    className="w-full bg-transparent border-none focus:outline-none text-lg shadow-none ring-0 focus:ring-0"
                    spellCheck={false}
                    placeholder="Navn..."
                  />
                  {activeDropdownId === row.id && (row.name.length > 0 || row.monsterSlug) && (() => {
                    const filtered = monsterList.filter(m => m.name && m.name.toLowerCase().includes(row.name.toLowerCase())).slice(0, 50);
                    if (filtered.length === 0) {
                      if (monsterList.length === 0) {
                        return (
                          <div className="absolute top-full left-0 w-full p-4 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-2xl z-[200] mt-1 text-center italic opacity-50 text-xs text-[var(--text)]">
                            Indlæser monstre...
                          </div>
                        );
                      }
                      return null;
                    }
                    return (
                      <div className="absolute top-full left-0 w-full max-h-64 overflow-y-auto bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-2xl z-[200] mt-1 scrollbar-thin">
                        {filtered.map(m => (
                          <button
                            key={`${m.name}|${m.source}`}
                            onMouseDown={(e) => e.preventDefault()} // Prevent blur before click
                            onClick={() => {
                              updateRow(row.id, { 
                                name: m.name, 
                                monsterSlug: `${m.name}|${m.source}`,
                                imageError: false 
                              });
                              setActiveDropdownId(null);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-[var(--accent)] hover:text-white transition-colors text-sm text-[var(--text)] border-b border-[var(--border)] last:border-0 flex justify-between items-center"
                          >
                            <span className="font-medium">{m.name}</span>
                            <span className="text-xs opacity-60 ml-2 shrink-0">{dataService.getSourceName(m.source)}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* HP */}
                <div className="bg-black/10 dark:bg-white/10 rounded-lg px-2 py-1">
                  <input
                    type="number"
                    value={row.hp}
                    spellCheck={false}
                    onChange={(e) => updateRow(row.id, { hp: e.target.value === "" ? "" : Number(e.target.value) })}
                    className="w-full bg-transparent border-none focus:outline-none text-center font-bold"
                  />
                </div>

                {/* Damage/Heal */}
                <div className="bg-black/10 dark:bg-white/10 rounded-lg px-2 py-1">
                  <input
                    type="number"
                    placeholder="±"
                    spellCheck={false}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => e.target.focus()} // Ensure focus when using arrows
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleDamageHeal(row.id, (e.target as HTMLInputElement).value, row.hp);
                        (e.target as HTMLInputElement).value = "";
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="w-full bg-transparent border-none focus:outline-none text-center"
                  />
                </div>

                {/* Notes */}
                <div className="bg-black/10 dark:bg-white/10 rounded-lg px-2 py-1">
                  <textarea
                    value={row.notes}
                    spellCheck={false}
                    onChange={(e) => updateRow(row.id, { notes: e.target.value })}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = target.scrollHeight + 'px';
                    }}
                    ref={(el) => {
                      if (el) {
                        el.style.height = 'auto';
                        el.style.height = el.scrollHeight + 'px';
                      }
                    }}
                    className="w-full bg-transparent border-none focus:outline-none text-sm resize-none min-h-[2rem] overflow-hidden"
                    placeholder="Noter..."
                  />
                </div>

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
                (typeof monsterCache[hoveredMonster?.slug || ""] === "string" ? (monsterCache[hoveredMonster?.slug || ""] as string).length : 2000) > 1500 ? 1100 : (typeof monsterCache[hoveredMonster?.slug || ""] === "string" ? (monsterCache[hoveredMonster?.slug || ""] as string).length : 2000) > 600 ? 750 : 400,
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
            ) : monsterCache[hoveredMonster?.slug || ""] ? (
              <div 
                className="monster-info-content custom-scrollbar"
                style={{ height: "100%" }}
              >
                {typeof monsterCache[hoveredMonster?.slug || ""] === "string" ? (
                  <div dangerouslySetInnerHTML={{ __html: monsterCache[hoveredMonster?.slug || ""] as string }} />
                ) : (
                  <MonsterStatBlock monster={monsterCache[hoveredMonster?.slug || ""] as Monster} isPopup={true} />
                )}
              </div>
            ) : (
              <div className="p-8 text-center italic opacity-50">
                Ingen information fundet.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer info */}
      <footer className="mt-8 text-center opacity-10 hover:opacity-100 transition-opacity text-[10px] pb-8">
        <div className="flex flex-col items-center justify-center gap-4 max-w-md mx-auto">
          <div className="flex items-center gap-4">
            <span className="text-gray-500">Genveje: Enter (Næste), Backspace (Forrige), + (Tilføj), - (Fjern)</span>
            <button
              onClick={() => {
                if (window.confirm("Vil du rydde monster-cachen? Dette vil genindlæse siden.")) {
                  dataService.clearCache();
                  setMonsterCache({});
                  localStorage.removeItem("monster-cache");
                  localStorage.removeItem("monster-list-cache");
                  window.location.reload();
                }
              }}
              className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
              title="Ryd monster-cache"
            >
              <Trash2 size={10} />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
