
import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { dataService, Monster, Entry } from "../services/dataService";

interface TagProps {
  tag: string;
  name: string;
  source?: string;
  displayText?: string;
}

const xpMap: Record<string, string> = {
  "0": "0 eller 10",
  "1/8": "25",
  "1/4": "50",
  "1/2": "100",
  "1": "200",
  "2": "450",
  "3": "700",
  "4": "1.100",
  "5": "1.800",
  "6": "2.300",
  "7": "2.900",
  "8": "3.900",
  "9": "5.000",
  "10": "5.900",
  "11": "7.200",
  "12": "8.400",
  "13": "10.000",
  "14": "11.500",
  "15": "13.000",
  "16": "15.000",
  "17": "18.000",
  "18": "20.000",
  "19": "22.000",
  "20": "25.000",
  "21": "33.000",
  "22": "41.000",
  "23": "50.000",
  "24": "62.000",
  "25": "75.000",
  "26": "90.000",
  "27": "105.000",
  "28": "120.000",
  "29": "135.000",
  "30": "155.000"
};

const calculatePB = (cr: string) => {
  let numericCr = 0;
  if (!cr) return 2;
  if (cr.includes('/')) {
    const [num, den] = cr.split('/').map(Number);
    numericCr = num / den;
  } else {
    numericCr = Number(cr);
  }
  if (numericCr < 5) return 2;
  if (numericCr < 9) return 3;
  if (numericCr < 13) return 4;
  if (numericCr < 17) return 5;
  if (numericCr < 21) return 6;
  if (numericCr < 25) return 7;
  if (numericCr < 29) return 8;
  return 9;
};

const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

const TagComponent: React.FC<TagProps> = ({ tag, name, source, displayText }) => {
  const [hovered, setHovered] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = async (e: React.MouseEvent) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // Calculate position relative to mouse
    const x = e.clientX + 15;
    const y = e.clientY;
    
    // Check if popup would go off screen
    const popupWidth = 320; // Matches w-80 in className
    const popupHeight = 300; // Estimated max height
    
    let finalX = x;
    let finalY = y;
    
    if (x + popupWidth > window.innerWidth) {
      finalX = window.innerWidth - popupWidth - 10;
    }
    if (finalY + popupHeight > window.innerHeight) {
      finalY = window.innerHeight - popupHeight - 10;
    }
    
    setPosition({ x: finalX, y: finalY });
    setHovered(true);

    if (!data && !loading) {
      setLoading(true);
      
      const fetchData = async (t: string, n: string, s: string) => {
        if (t === "spell") return await dataService.getSpell(n, s);
        if (t === "creature") return await dataService.getMonster(n, s);
        if (t === "condition" || t === "disease" || t === "status") return await dataService.getEntry(t, n, s);
        if (t === "variantrule") return await dataService.getEntry("variantrules", n, s);
        if (t === "language" || t === "sense") return await dataService.getEntry(t, n, s);
        if (["item", "loot", "name", "race", "skill"].includes(t)) return await dataService.getEntry(t, n, s);
        return null;
      };

      const fetchedData = await fetchData(tag, name, source || "");
      setData(fetchedData);
      setLoading(false);
    }
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setHovered(false), 200);
  };

  const renderContent = (text: string) => {
    return <span className="text-[var(--accent)] font-semibold underline decoration-dotted cursor-help hover:text-[var(--accent-hover)] transition-colors" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>{text}</span>;
  };

  if (tag === "dice" || tag === "damage" || tag === "hit" || tag === "dc" || tag === "atk" || tag === "h" || tag === "recharge" || tag === "language") {
    // These are simple tags that don't need popups for now, just styling
    let label = displayText || name;
    if (tag === "hit") label = `+${name}`;
    if (tag === "dc") label = `DC ${name}`;
    if (tag === "atk") label = name === "mw" ? "Melee Weapon Attack:" : "Ranged Weapon Attack:";
    if (tag === "h") label = "Hit: ";
    if (tag === "recharge") label = `(Recharge ${name}${name === "6" ? "" : "–6"})`;
    
    if (tag === "atk") return <span className="italic">{label}</span>;
    if (tag === "language") return <span className="text-inherit font-normal">{label}</span>;
    return <span className="font-bold text-[var(--accent)]">{label}</span>;
  }

  return (
    <>
      {renderContent(displayText || name)}
      {hovered && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed z-[10000] w-80 max-h-96 overflow-y-auto bg-[#fdfaf3] border border-[#d1c9b8] rounded-sm shadow-2xl p-4 text-sm pointer-events-auto font-serif text-[#1a1a1a]"
            style={{ 
              left: Math.min(position.x, window.innerWidth - 340), 
              top: position.y + 10 > window.innerHeight - 200 ? position.y - 200 : position.y + 10 
            }}
            onMouseEnter={() => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }}
            onMouseLeave={handleMouseLeave}
          >
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--accent)]"></div>
              </div>
            ) : data ? (
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-[var(--accent)] border-b border-[var(--border)] pb-1 uppercase">{data.name}</h3>
                <div className="opacity-90 leading-relaxed">
                  {tag === "spell" && (
                    <div className="mb-2 italic text-xs opacity-70">
                      Level {data.level} {data.school}
                    </div>
                  )}
                  <EntryRenderer entry={data.entries || data.text || data.description || "Ingen beskrivelse fundet."} />
                </div>
                <div className="mt-2 pt-2 border-t border-[#d1c9b8] text-[10px] italic opacity-60">
                  Source: {dataService.getSourceName(data.source)}{data.page ? `, page ${data.page}` : ""}
                </div>
              </div>
            ) : (
              <div className="text-red-500 italic p-2">Data ikke fundet for {name}</div>
            )}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export const parseTags = (text: string): (string | React.ReactNode)[] => {
  if (!text) return [""];
  const parts: (string | React.ReactNode)[] = [];
  let lastIndex = 0;
  const regex = /\{@(\w+)(?:\s+([^}]+))?\}/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const tag = match[1];
    const content = match[2] ? match[2].split("|") : [];
    const name = content[0] || "";
    const source = content[1] || "";
    const displayText = content[2] || name;

    parts.push(<TagComponent key={match.index} tag={tag} name={name} source={source} displayText={displayText} />);
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
};

export const EntryRenderer: React.FC<{ entry: any; inline?: boolean }> = ({ entry, inline }) => {
  if (typeof entry === "string") {
    return <>{parseTags(entry)}</>;
  }

  if (Array.isArray(entry)) {
    return (
      <div className={inline ? "inline" : "space-y-2"}>
        {entry.map((e, i) => (
          <span key={i} className={inline ? "inline" : "block"}>
            <EntryRenderer entry={e} inline={inline} />
            {inline && i < entry.length - 1 && " "}
          </span>
        ))}
      </div>
    );
  }

  if (typeof entry === "object" && entry !== null) {
    // Handle traits/actions/entries with names
    if (entry.name && (entry.entries || entry.text)) {
      return (
        <div className={inline ? "inline mb-1" : "mb-2"}>
          <span className="font-bold italic mr-1">{parseTags(entry.name)}.</span>
          <span className="inline">
            <EntryRenderer entry={entry.entries || entry.text} inline={true} />
          </span>
        </div>
      );
    }

    switch (entry.type) {
      case "entries":
        return (
          <div className={inline ? "inline" : "mb-2"}>
            {entry.name && <span className="font-bold italic mr-1">{parseTags(entry.name)}.</span>}
            <span className="inline">
              <EntryRenderer entry={entry.entries} inline={inline} />
            </span>
          </div>
        );
      case "spellcasting":
        return (
          <div className={inline ? "inline mb-1" : "mb-2"}>
            <span className="font-bold italic mr-1">{parseTags(entry.name)}.</span>
            <div className="inline">
              {entry.headerEntries && <EntryRenderer entry={entry.headerEntries} inline />}
              {entry.will && (
                <div className="mt-1">
                  <span className="italic">At will: </span>
                  {entry.will.map((s: string, i: number) => (
                    <React.Fragment key={i}>
                      {i > 0 && ", "}{parseTags(s)}
                    </React.Fragment>
                  ))}
                </div>
              )}
              {entry.daily && (
                <div className="mt-1">
                  {Object.entries(entry.daily).map(([freq, spells]: [string, any], i) => (
                    <div key={i}>
                      <span className="italic">{freq.replace('e', '/day each')}: </span>
                      {spells.map((s: string, j: number) => (
                        <React.Fragment key={j}>
                          {j > 0 && ", "}{parseTags(s)}
                        </React.Fragment>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              {entry.spells && (
                <div className="mt-1">
                  {Object.entries(entry.spells).map(([level, data]: [string, any], i) => (
                    <div key={i}>
                      <span className="italic">{level === "0" ? "Cantrips (at will)" : `Level ${level} (${data.slots} slots)`}: </span>
                      {data.spells.map((s: string, j: number) => (
                        <React.Fragment key={j}>
                          {j > 0 && ", "}{parseTags(s)}
                        </React.Fragment>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              {entry.footerEntries && <EntryRenderer entry={entry.footerEntries} inline />}
            </div>
          </div>
        );
      case "list":
        return (
          <ul className="list-disc ml-5 mt-1 space-y-1">
            {entry.items.map((item: any, i: number) => (
              <li key={i}>
                <EntryRenderer entry={item} />
              </li>
            ))}
          </ul>
        );
      case "table":
        return (
          <div className="overflow-x-auto my-2">
            <table className="w-full text-xs border-collapse border border-[var(--border)]">
              {entry.caption && <caption className="font-bold p-1 text-left">{entry.caption}</caption>}
              <thead>
                <tr className="bg-[var(--bg)]">
                  {entry.colLabels.map((label: string, i: number) => (
                    <th key={i} className="border border-[var(--border)] p-1 text-left">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entry.rows.map((row: any[], i: number) => (
                  <tr key={i}>
                    {row.map((cell: any, j: number) => (
                      <td key={j} className="border border-[var(--border)] p-1">
                        <EntryRenderer entry={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case "abilityDc":
        return <span>save DC {entry.dc}</span>;
      case "abilityAttackMod":
        return <span>{entry.amount >= 0 ? "+" : ""}{entry.amount} to hit</span>;
      case "dice":
        return <span className="font-bold text-[var(--accent)]">{entry.number}d{entry.faces}{entry.modifier ? (entry.modifier >= 0 ? `+${entry.modifier}` : entry.modifier) : ""}</span>;
      case "bonus":
        return <span>{entry.value >= 0 ? "+" : ""}{entry.value}</span>;
      default:
        if (entry.entries) return <EntryRenderer entry={entry.entries} />;
        return null;
    }
  }

  return null;
};

const sizeMap: Record<string, string> = {
  'T': 'Tiny',
  'S': 'Small',
  'M': 'Medium',
  'L': 'Large',
  'H': 'Huge',
  'G': 'Gargantuan'
};

const alignmentMap: Record<string, string> = {
  'L': 'Lawful',
  'N': 'Neutral',
  'C': 'Chaotic',
  'G': 'Good',
  'E': 'Evil',
  'U': 'Unaligned',
  'A': 'Any'
};

export const MonsterStatBlock: React.FC<{ monster: Monster; isPopup?: boolean }> = ({ monster, isPopup }) => {
  const [fluff, setFluff] = useState<any>(null);
  const [tokenUrl, setTokenUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchFluff = async () => {
      const fluffData = await dataService.getFluff(monster.name, monster.source);
      setFluff(fluffData);
      
      // Try to find a token image
      let tokenPath = "";
      if (fluffData?.images) {
        const tokenImg = fluffData.images.find((img: any) => img.token || img.href?.path?.includes("token"));
        if (tokenImg?.href?.path) {
          tokenPath = tokenImg.href.path;
        } else if (fluffData.images[0]?.href?.path) {
          tokenPath = fluffData.images[0].href.path;
        }
      }

      if (tokenPath) {
        // Construct token URL: https://5e.tools/img/bestiary/tokens/SOURCE/NAME.webp
        // The path in fluff is usually "bestiary/SOURCE/NAME.webp"
        const cleanPath = tokenPath.replace(/^bestiary\//, "");
        setTokenUrl(`https://5e.tools/img/bestiary/tokens/${cleanPath}`);
      } else {
        // Ultimate fallback: try to guess the URL
        setTokenUrl(`https://5e.tools/img/bestiary/tokens/${monster.source}/${encodeURIComponent(monster.name)}.webp`);
      }
    };
    fetchFluff();
  }, [monster.name, monster.source]);

  const formatSize = (size: string[]) => {
    if (!size) return "Unknown";
    return size.map(s => sizeMap[s] || s).join("/");
  };

  const formatAlignment = (alignment: string[]) => {
    if (!alignment || alignment.length === 0) return "Unknown";
    if (alignment.length === 1 && alignment[0] === "N") return "Neutral";
    return alignment.map(a => alignmentMap[a] || a).join(" ");
  };

  const formatType = (type: any) => {
    if (!type) return "Unknown";
    if (typeof type === "string") return type;
    if (type.type) return `${type.type} (${type.tags?.join(", ")})`;
    return JSON.stringify(type);
  };

  const formatAc = (ac: any[]) => {
    if (!ac) return "Unknown";
    return ac.map((a, i) => {
      if (typeof a === "number") return <React.Fragment key={i}>{i > 0 && ", "}{a}</React.Fragment>;
      if (typeof a === "object") {
        let acVal = a.ac;
        if (typeof acVal === 'object' && acVal !== null) {
          const num = acVal.number ?? acVal.value ?? "";
          const cond = acVal.condition ? ` (${acVal.condition})` : "";
          acVal = `${num}${cond}`;
        }
        return (
          <React.Fragment key={i}>
            {i > 0 && ", "}
            {acVal}
            {a.from && <span> ({a.from.map((f: string, j: number) => <React.Fragment key={j}>{j > 0 && ", "}{parseTags(f)}</React.Fragment>)})</span>}
            {a.condition && <span> while {parseTags(a.condition)}</span>}
          </React.Fragment>
        );
      }
      return <React.Fragment key={i}>{i > 0 && ", "}{a}</React.Fragment>;
    });
  };

  const formatSpeed = (speed: any) => {
    if (!speed) return "Unknown";
    if (typeof speed === 'string') return speed;
    return Object.entries(speed).map(([k, v], i, arr) => {
      const type = k === 'walk' ? '' : k.charAt(0).toUpperCase() + k.slice(1) + ' ';
      let val = v;
      if (typeof v === 'object' && v !== null) {
        const num = (v as any).number ?? (v as any).value ?? "";
        const cond = (v as any).condition ? ` ${(v as any).condition}` : "";
        val = `${num}${cond}`;
      }
      return (
        <React.Fragment key={k}>
          {type}{val} ft.{i < arr.length - 1 ? ", " : ""}
        </React.Fragment>
      );
    });
  };

  const formatObjectEntries = (obj: any) => {
    if (!obj) return null;
    return Object.entries(obj).map(([k, v], i, arr) => {
      let displayValue = v;
      if (typeof v === 'object' && v !== null) {
        const val = (v as any).number ?? (v as any).value ?? "";
        const cond = (v as any).condition ? ` (${(v as any).condition})` : "";
        displayValue = `${val}${cond}`;
      }
      return (
        <React.Fragment key={k}>
          {capitalize(k)} {displayValue}{i < arr.length - 1 ? ", " : ""}
        </React.Fragment>
      );
    });
  };

  const dexVal = monster.dex || 10;
  const dexMod = Math.floor((dexVal - 10) / 2);
  const initiative = (dexMod >= 0 ? "+" : "") + dexMod + " (" + dexVal + ")";

  const renderStatsTable = () => {
    const stats = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
    return (
      <div className="grid grid-cols-12 gap-0 border border-[#d1c9b8]/50 rounded-sm overflow-hidden mb-4 bg-white shadow-sm">
        {/* Row 1: Headers */}
        <div className="col-span-2"></div>
        <div className="col-span-1 text-[9px] font-bold text-[#6b6b6b] uppercase flex items-center justify-center bg-transparent border-b border-[#d1c9b8]/30">Mod</div>
        <div className="col-span-1 text-[9px] font-bold text-[#6b6b6b] uppercase flex items-center justify-center bg-transparent border-b border-[#d1c9b8]/30">Save</div>
        <div className="col-span-2"></div>
        <div className="col-span-1 text-[9px] font-bold text-[#6b6b6b] uppercase flex items-center justify-center bg-transparent border-b border-[#d1c9b8]/30">Mod</div>
        <div className="col-span-1 text-[9px] font-bold text-[#6b6b6b] uppercase flex items-center justify-center bg-transparent border-b border-[#d1c9b8]/30">Save</div>
        <div className="col-span-2"></div>
        <div className="col-span-1 text-[9px] font-bold text-[#6b6b6b] uppercase flex items-center justify-center bg-transparent border-b border-[#d1c9b8]/30">Mod</div>
        <div className="col-span-1 text-[9px] font-bold text-[#6b6b6b] uppercase flex items-center justify-center bg-transparent border-b border-[#d1c9b8]/30">Save</div>

        {/* Row 2: STR, DEX, CON */}
        {stats.slice(0, 3).map(s => {
          const statKey = s.toLowerCase();
          const val = (monster[statKey as keyof Monster] as number) || 10;
          const mod = Math.floor((val - 10) / 2);
          const save = monster.save?.[statKey];
          let saveDisplay: any = (mod >= 0 ? "+" : "") + mod;
          
          if (save !== undefined) {
            if (typeof save === 'string') {
              saveDisplay = save;
            } else if (typeof save === 'object' && save !== null) {
              const num = (save as any).number ?? (save as any).value ?? "";
              const cond = (save as any).condition ? ` (${(save as any).condition})` : "";
              saveDisplay = `${num}${cond}`;
            } else {
              saveDisplay = save;
            }
          }

          return (
            <React.Fragment key={s}>
              <div className="col-span-1 bg-[#f2efeb] py-1 text-center font-bold text-[#7a200d] uppercase text-[10px] border-r border-[#d1c9b8]/30">{s}</div>
              <div className="col-span-1 bg-[#f2efeb] text-center font-bold text-sm py-1 border-r border-[#d1c9b8]/30 text-[#1a1a1a]">{val}</div>
              <div className="col-span-1 bg-[#e0d9d1] py-1 text-center font-bold text-[#7a200d] text-xs border-r border-[#d1c9b8]/30">{mod >= 0 ? "+" : ""}{mod}</div>
              <div className="col-span-1 bg-[#e0d9d1] py-1 text-center font-bold text-[#7a200d] text-xs border-r last:border-r-0 border-[#d1c9b8]/30">{saveDisplay}</div>
            </React.Fragment>
          );
        })}

        {/* Row 3: INT, WIS, CHA */}
        {stats.slice(3, 6).map(s => {
          const statKey = s.toLowerCase();
          const val = (monster[statKey as keyof Monster] as number) || 10;
          const mod = Math.floor((val - 10) / 2);
          const save = monster.save?.[statKey];
          let saveDisplay: any = (mod >= 0 ? "+" : "") + mod;
          
          if (save !== undefined) {
            if (typeof save === 'string') {
              saveDisplay = save;
            } else if (typeof save === 'object' && save !== null) {
              const num = (save as any).number ?? (save as any).value ?? "";
              const cond = (save as any).condition ? ` (${(save as any).condition})` : "";
              saveDisplay = `${num}${cond}`;
            } else {
              saveDisplay = save;
            }
          }

          return (
            <React.Fragment key={s}>
              <div className="col-span-1 bg-[#f2efeb] py-1 text-center font-bold text-[#7a200d] uppercase text-[10px] border-t border-r border-[#d1c9b8]/30">{s}</div>
              <div className="col-span-1 bg-[#f2efeb] text-center font-bold text-sm py-1 border-t border-r border-[#d1c9b8]/30 text-[#1a1a1a]">{val}</div>
              <div className="col-span-1 bg-[#e0d9d1] py-1 text-center font-bold text-[#7a200d] text-xs border-t border-r border-[#d1c9b8]/30">{mod >= 0 ? "+" : ""}{mod}</div>
              <div className="col-span-1 bg-[#e0d9d1] py-1 text-center font-bold text-[#7a200d] text-xs border-t border-r last:border-r-0 border-[#d1c9b8]/30">{saveDisplay}</div>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`monster-stat-block text-sm leading-relaxed max-w-2xl mx-auto font-serif ${isPopup ? "" : "bg-[#fdfaf3] p-6 shadow-lg border border-[#d1c9b8] rounded-sm"}`}>
      <div className="border-b-2 border-[var(--accent)] mb-2">
        <h2 className="text-2xl font-bold text-[var(--accent)] uppercase">{monster.name}</h2>
        <div className="italic opacity-80 mb-1">
          {formatSize(monster.size)} {formatType(monster.type)}, {monster.alignmentPrefix || ""}{formatAlignment(monster.alignment)}
        </div>
      </div>

      <div className="space-y-1 pb-2 mb-2">
        <div><span className="font-bold">Armor Class</span> {formatAc(monster.ac)}</div>
        <div><span className="font-bold">Initiative</span> {initiative}</div>
        {monster.hp && (
          <div>
            <span className="font-bold">Hit Points</span> {monster.hp.average || monster.hp.special || "Unknown"}
            {monster.hp.formula && (
              <span className="font-bold text-[var(--accent)]"> ({monster.hp.formula})</span>
            )}
          </div>
        )}
        <div><span className="font-bold">Speed</span> {formatSpeed(monster.speed)}</div>
      </div>

      {renderStatsTable()}

      <div className="space-y-1 mb-2">
        {monster.skill && (
          <div><span className="font-bold">Skills</span> {formatObjectEntries(monster.skill)}</div>
        )}
        {monster.resist && (
          <div><span className="font-bold">Damage Resistances</span> {monster.resist.map((r: any, i: number) => <React.Fragment key={i}>{i > 0 ? ", " : ""}{typeof r === 'string' ? parseTags(capitalize(r)) : parseTags(capitalize(r.resist.join(", ")))}</React.Fragment>)}</div>
        )}
        {monster.immune && (
          <div><span className="font-bold">Damage Immunities</span> {monster.immune.map((r: any, i: number) => <React.Fragment key={i}>{i > 0 ? ", " : ""}{typeof r === 'string' ? parseTags(capitalize(r)) : parseTags(capitalize(r.immune.join(", ")))}</React.Fragment>)}</div>
        )}
        {monster.conditionImmune && (
          <div><span className="font-bold">Immunities</span> {monster.conditionImmune.map((c: any, i: number) => (
            <React.Fragment key={i}>
              {i > 0 ? ", " : ""}
              {typeof c === 'string' 
                ? parseTags(`{@condition ${c}||${capitalize(c)}}`) 
                : parseTags(c.condition.map((cc: string) => `{@condition ${cc}||${capitalize(cc)}}`).join(", "))
              }
            </React.Fragment>
          ))}</div>
        )}
        <div><span className="font-bold">Senses</span> {monster.senses?.map((s: string, i: number) => {
          const senseBase = s.split(' ')[0].toLowerCase();
          return (
            <React.Fragment key={i}>
              {i > 0 ? ", " : ""}
              {parseTags(`{@sense ${senseBase}||${capitalize(s)}}`)}
            </React.Fragment>
          );
        })}, Passive Perception {monster.passive}</div>
        <div><span className="font-bold">Languages</span> {monster.languages?.map((l: string, i: number) => <React.Fragment key={i}>{i > 0 ? ", " : ""}{capitalize(l)}</React.Fragment>)}</div>
        <div>
          <span className="font-bold">CR</span> {typeof monster.cr === 'string' ? monster.cr : monster.cr?.cr} 
          {(() => {
            const crVal = typeof monster.cr === 'string' ? monster.cr : monster.cr?.cr;
            if (!crVal) return null;
            return ` (XP ${xpMap[crVal] || '?'}; PB +${calculatePB(crVal)})`;
          })()}
        </div>
      </div>

      {monster.trait && (
        <div className="space-y-3 mb-4">
          <h3 className="text-xl font-bold text-[var(--accent)] mb-1">Traits</h3>
          <hr className="border-t-2 border-[var(--accent)] mb-2" />
          {monster.trait.map((t, i) => (
            <div key={i}>
              <EntryRenderer entry={t} />
            </div>
          ))}
        </div>
      )}

      {monster.action && (
        <div className="space-y-3 mb-4">
          <h3 className="text-xl font-bold text-[var(--accent)] mb-1">Actions</h3>
          <hr className="border-t-2 border-[var(--accent)] mb-2" />
          {monster.action.map((a, i) => (
            <div key={i}>
              <EntryRenderer entry={a} />
            </div>
          ))}
        </div>
      )}

      {monster.bonus && (
        <div className="space-y-3 mb-4 pb-2">
          <h3 className="text-xl font-bold text-[var(--accent)] mb-1">Bonus Actions</h3>
          <hr className="border-t-2 border-[var(--accent)] mb-2" />
          {monster.bonus.map((b, i) => (
            <div key={i}>
              <EntryRenderer entry={b} />
            </div>
          ))}
        </div>
      )}

      {monster.reaction && (
        <div className="space-y-3 mb-4 pb-2">
          <h3 className="text-xl font-bold text-[var(--accent)] mb-1">Reactions</h3>
          <hr className="border-t-2 border-[var(--accent)] mb-2" />
          {monster.reaction.map((r, i) => (
            <div key={i}>
              <EntryRenderer entry={r} />
            </div>
          ))}
        </div>
      )}

      {monster.legendary && (
        <div className="space-y-3 mb-4 pb-2">
          <h3 className="text-xl font-bold text-[var(--accent)] mb-1">Legendary Actions</h3>
          <hr className="border-t-2 border-[var(--accent)] mb-2" />
          {monster.legendary.map((l, i) => (
            <div key={i}>
              <EntryRenderer entry={l} />
            </div>
          ))}
        </div>
      )}

      {monster.mythic && (
        <div className="space-y-3 mb-4 pb-2">
          <h3 className="text-xl font-bold text-[var(--accent)] mb-1">Mythic Actions</h3>
          <hr className="border-t-2 border-[var(--accent)] mb-2" />
          {monster.mythic.map((m, i) => (
            <div key={i}>
              <EntryRenderer entry={m} />
            </div>
          ))}
        </div>
      )}

      {monster.lairActions && (
        <div className="space-y-3 mb-4 pb-2">
          <h3 className="text-xl font-bold text-[var(--accent)] mb-1">Lair Actions</h3>
          <hr className="border-t-2 border-[var(--accent)] mb-2" />
          <EntryRenderer entry={monster.lairActions} />
        </div>
      )}

      {monster.regionalEffects && (
        <div className="space-y-3 mb-4 pb-2">
          <h3 className="text-xl font-bold text-[var(--accent)] mb-1">Regional Effects</h3>
          <hr className="border-t-2 border-[var(--accent)] mb-2" />
          <EntryRenderer entry={monster.regionalEffects} />
        </div>
      )}

      {monster.spellcasting && (
        <div className="space-y-3 mb-4">
          {monster.spellcasting.map((s, i) => (
            <div key={i} className="mb-2">
              <span className="font-bold italic mr-1">{parseTags(s.name)}.</span>
              <div className="inline">
                {s.headerEntries && <EntryRenderer entry={s.headerEntries} inline />}
                {s.will && (
                  <div className="mt-1">
                    <span className="italic">At will: </span>
                    {s.will.map((sp: string, idx: number) => (
                      <React.Fragment key={idx}>
                        {idx > 0 && ", "}{parseTags(sp)}
                      </React.Fragment>
                    ))}
                  </div>
                )}
                {s.daily && (
                  <div className="mt-1">
                    {Object.entries(s.daily).map(([freq, spells]: [string, any], idx) => (
                      <div key={idx}>
                        <span className="italic">{freq.replace('e', '/day each')}: </span>
                        {spells.map((sp: string, j: number) => (
                          <React.Fragment key={j}>
                            {j > 0 && ", "}{parseTags(sp)}
                          </React.Fragment>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                {s.spells && (
                  <div className="mt-1">
                    {Object.entries(s.spells).map(([level, data]: [string, any], idx) => (
                      <div key={idx}>
                        <span className="italic">{level === "0" ? "Cantrips (at will)" : `Level ${level} (${data.slots} slots)`}: </span>
                        {data.spells.map((sp: string, j: number) => (
                          <React.Fragment key={j}>
                            {j > 0 && ", "}{parseTags(sp)}
                          </React.Fragment>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                {s.footerEntries && <EntryRenderer entry={s.footerEntries} inline />}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 pt-4 border-t-2 border-[var(--accent)] text-xs italic opacity-60 flex justify-between">
        <span>Source: {dataService.getSourceName(monster.source)}{monster.page ? `, page ${monster.page}` : ""}</span>
        <span>© Wizards of the Coast</span>
      </div>
    </div>
  );
};
