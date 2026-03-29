
export interface Entry {
  type?: string;
  name?: string;
  entries?: any[];
  items?: any[];
  caption?: string;
  colLabels?: string[];
  rows?: any[][];
  [key: string]: any;
}

export interface Monster {
  name: string;
  source: string;
  size: string[];
  type: any;
  alignment: string[];
  ac: any[];
  hp: any;
  speed: any;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  save?: any;
  skill?: any;
  senses?: string[];
  passive: number;
  resist?: any[];
  immune?: any[];
  conditionImmune?: any[];
  languages?: string[];
  cr?: string;
  trait?: Entry[];
  action?: Entry[];
  reaction?: Entry[];
  legendary?: Entry[];
  legendaryGroup?: { name: string; source: string };
  lairActions?: Entry[];
  regionalEffects?: Entry[];
  spellcasting?: any[];
  [key: string]: any;
}

class DataService {
  private bestiaryIndex: Record<string, string> | null = null;
  private fluffIndex: Record<string, string> | null = null;
  private monsterList: { name: string; source: string }[] | null = null;
  private spellsIndex: Record<string, string> | null = null;
  private fileCache: Record<string, any> = {};
  private entryCache: Record<string, any> = {};
  private sourceNames: Record<string, string> = {
    "AATM": "Acquisitions Incorporated: Anthologies of the Mad Mage",
    "ABH": "Adventures in the Borderlands",
    "AI": "Acquisitions Incorporated",
    "AitFR-ISF": "Adventures in the Forgotten Realms: In Search of Floon",
    "AitFR-THP": "Adventures in the Forgotten Realms: The Hidden Page",
    "AitFR-DN": "Adventures in the Forgotten Realms: Darker Night",
    "AitFR-FCD": "Adventures in the Forgotten Realms: From City to Dungeon",
    "AWM": "Adventures with Monsters",
    "BAM": "Boo's Astral Menagerie",
    "BGDIA": "Baldur's Gate: Descent into Avernus",
    "BGG": "Bigby Presents: Glory of the Giants",
    "BMT": "The Book of Many Things",
    "CM": "Candlekeep Mysteries",
    "CoA": "Crown of Avalon",
    "CoS": "Curse of Strahd",
    "CRCotN": "Critical Role: Call of the Netherdeep",
    "DC": "Divine Contention",
    "DIP": "Dragon of Icespire Peak",
    "DitLCoT": "Dungeons in the Land of Chaos and Terror",
    "DMG": "Dungeon Master's Guide",
    "DoD": "Dungeons of Dread",
    "DoSI": "Dragons of Stormwreck Isle",
    "DSotDQ": "Dragonlance: Shadow of the Dragon Queen",
    "EFA": "Elemental Evil: Fire Ashari",
    "EGW": "Explorer's Guide to Wildemount",
    "ERLW": "Eberron: Rising from the Last War",
    "ESK": "Essentials Kit",
    "FRAiF": "Forgotten Realms: Adventures in Faerûn",
    "FTD": "Fizban's Treasury of Dragons",
    "GGR": "Guildmasters' Guide to Ravnica",
    "GoS": "Ghosts of Saltmarsh",
    "GotSF": "Giants of the Star Forge",
    "HAT-TG": "Honor Among Thieves: The Gathering",
    "HftT": "Hunt for the Thessalhydra",
    "HoL": "Hunt of Legends",
    "HotB": "Hoard of the Blight",
    "HotDQ": "Hoard of the Dragon Queen",
    "IDRotF": "Icewind Dale: Rime of the Frostmaiden",
    "IMR": "Infernal Machine Rebuild",
    "JttRC": "Journeys through the Radiant Citadel",
    "KftGV": "Keys from the Golden Vault",
    "KKW": "Krenko's Way",
    "LFL": "Legendary Foes and Lairs",
    "LLK": "Locathah Rising",
    "LMoP": "Lost Mine of Phandelver",
    "LoX": "Light of Xaryxis",
    "LR": "Legendary Resistance",
    "LRDT": "Legendary Resistance: Dragon Turtle",
    "MaBJoV": "Minsc and Boo's Journal of Villainy",
    "MCV1SC": "Monstrous Compendium Volume 1: Spelljammer Creatures",
    "MCV2DC": "Monstrous Compendium Volume 2: Dragonlance Creatures",
    "MCV3MC": "Monstrous Compendium Volume 3: Minecraft Creatures",
    "MCV4EC": "Monstrous Compendium Volume 4: Eldritch Creatures",
    "MisMV1": "Misfit Monsters Volume 1",
    "MFF": "Mordenkainen's Fiendish Folio",
    "MGELFT": "Mordenkainen's Guide to Elemental Lords and Fiendish Terrors",
    "MM": "Monster Manual",
    "MPMM": "Mordenkainen Presents: Monsters of the Multiverse",
    "MPP": "Mordenkainen's Tome of Foes",
    "MOT": "Mythic Odysseys of Theros",
    "MTF": "Mordenkainen's Tome of Foes",
    "NF": "Nerdarchy: Faction",
    "NRH-TCMC": "Nocturnal Revels: The Crimson Moon Cult",
    "NRH-AVitW": "Nocturnal Revels: A Voice in the Wilderness",
    "NRH-ASS": "Nocturnal Revels: A Shadowy Secret",
    "NRH-CoI": "Nocturnal Revels: Circle of Iron",
    "NRH-TLT": "Nocturnal Revels: The Lost Tomb",
    "NRH-AWoL": "Nocturnal Revels: A Web of Lies",
    "NRH-AT": "Nocturnal Revels: Ancient Terrors",
    "OotA": "Out of the Abyss",
    "OoW": "One-Shot Wonders",
    "PaBTSO": "Phandelver and Below: The Shattered Obelisk",
    "PSA": "Plane Shift: Amonkhet",
    "PSD": "Plane Shift: Dominaria",
    "PSI": "Plane Shift: Innistrad",
    "PSK": "Plane Shift: Kaladesh",
    "PSX": "Plane Shift: Ixalan",
    "PSZ": "Plane Shift: Zendikar",
    "PHB": "Player's Handbook",
    "PotA": "Princes of the Apocalypse",
    "QftIS": "Quests from the Infinite Staircase",
    "RMBRE": "Rime of the Frostmaiden: Battle for the Ten-Towns",
    "RoT": "Rise of Tiamat",
    "RtG": "Return to Glory",
    "SADS": "Sapphire Anniversary Dice Set",
    "SCC": "Strixhaven: A Curriculum of Chaos",
    "SDW": "Sleeping Dragon's Wake",
    "SKT": "Storm King's Thunder",
    "SLW": "Storm Lord's Wrath",
    "TCE": "Tasha's Cauldron of Everything",
    "TTP": "The Tortle Package",
    "TftYP": "Tales from the Yawning Portal",
    "ToA": "Tomb of Annihilation",
    "ToFW": "Tomb of Fane and Water",
    "VD": "Volo's Guide to Monsters",
    "VEoR": "Vecna: Eve of Ruin",
    "VGM": "Volo's Guide to Monsters",
    "VRGR": "Van Richten's Guide to Ravenloft",
    "XGE": "Xanathar's Guide to Everything",
    "WBtW": "The Wild Beyond the Witchlight",
    "WDH": "Waterdeep: Dragon Heist",
    "WDMM": "Waterdeep: Dungeon of the Mad Mage",
    "WttHC": "Wayfinder's Guide to Eberron",
    "XDMG": "Dungeon Master's Guide (2024)",
    "XMM": "Monster Manual (2024)",
    "XPHB": "Player's Handbook (2024)"
  };

  async loadBestiaryIndex() {
    if (this.bestiaryIndex) return this.bestiaryIndex;
    try {
      const response = await fetch('/data/bestiary/index.json');
      this.bestiaryIndex = await response.json();
      return this.bestiaryIndex;
    } catch (e) {
      console.error("Failed to load bestiary index", e);
      return {};
    }
  }

  async loadFluffIndex() {
    if (this.fluffIndex) return this.fluffIndex;
    try {
      const response = await fetch('/data/bestiary/fluff-index.json');
      this.fluffIndex = await response.json();
      return this.fluffIndex;
    } catch (e) {
      console.error("Failed to load fluff index", e);
      return {};
    }
  }

  async loadSpellsIndex() {
    if (this.spellsIndex) return this.spellsIndex;
    try {
      const response = await fetch('/data/spells/index.json');
      this.spellsIndex = await response.json();
      return this.spellsIndex;
    } catch (e) {
      console.error("Failed to load spells index", e);
      return {};
    }
  }

  private async fetchFile(path: string) {
    if (this.fileCache[path]) return this.fileCache[path];
    try {
      const response = await fetch(path);
      if (!response.ok) return null;
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return null;
      }

      const data = await response.json();
      this.fileCache[path] = data;
      return data;
    } catch (e) {
      // Silently fail for missing or malformed files to avoid console spam
      return null;
    }
  }

  async getMonsterList(): Promise<{ name: string; source: string }[]> {
    if (this.monsterList) return this.monsterList;
    
    const index = await this.loadBestiaryIndex();
    const sources = Object.keys(index || {});
    const allMonsters: { name: string; source: string }[] = [];
    
    const promises = sources.map(async (source) => {
      const fileName = index?.[source];
      if (!fileName) return;
      const data = await this.fetchFile(`/data/bestiary/${fileName}`);
      if (data && data.monster) {
        data.monster.forEach((m: any) => {
          allMonsters.push({ name: m.name, source: m.source });
        });
      }
    });
    
    await Promise.all(promises);
    
    // Sort by name
    allMonsters.sort((a, b) => a.name.localeCompare(b.name));
    
    this.monsterList = allMonsters;
    return allMonsters;
  }

  async getMonster(name: string, source: string): Promise<Monster | null> {
    const cacheKey = `monster-${name}-${source || "any"}`;
    if (this.entryCache[cacheKey]) return this.entryCache[cacheKey];

    const index = await this.loadBestiaryIndex();
    
    const trySource = async (s: string) => {
      const fileName = index?.[s];
      if (!fileName) return null;
      const data = await this.fetchFile(`/data/bestiary/${fileName}`);
      if (!data || !data.monster) return null;
      return data.monster.find((m: any) => m.name.toLowerCase() === name.toLowerCase());
    };

    const priorityMap: Record<string, string> = { 
      "MM": "XMM", 
      "PHB": "XPHB", 
      "DMG": "XDMG",
      "MM'25": "XMM",
      "PHB'24": "XPHB",
      "DMG'24": "XDMG"
    };
    let monster = null;

    // 1. Try priority version of requested source
    if (source && priorityMap[source]) {
      monster = await trySource(priorityMap[source]);
    }
    
    // 2. Try requested source
    if (!monster && source) {
      monster = await trySource(source);
    }

    // 3. If no source or not found, try global priority sources
    if (!monster) {
      for (const ps of ["XMM", "XPHB", "XDMG"]) {
        monster = await trySource(ps);
        if (monster) break;
      }
    }

    // 4. Fallback to any match in index
    if (!monster) {
      const sources = Object.keys(index || {});
      for (const s of sources) {
        monster = await trySource(s);
        if (monster) break;
      }
    }

    if (monster) {
      // Create a deep copy to avoid mutating cached file data
      monster = JSON.parse(JSON.stringify(monster));

      // Handle _copy logic
      if (monster._copy) {
        const copyMeta = monster._copy;
        const baseMonster = await this.getMonster(copyMeta.name, copyMeta.source);
        if (baseMonster) {
          const mods = copyMeta._mod;
          const preserve = copyMeta._preserve || {};
          
          // Start with base monster
          let merged = JSON.parse(JSON.stringify(baseMonster));
          
          // Apply modifications
          if (mods) {
            const applyMod = (target: any, mod: any): any => {
              if (!mod || !mod.mode) return target;
              
              if (mod.mode === "replaceTxt") {
                const search = new RegExp(mod.replace, mod.flags || "g");
                const replace = mod.with;
                
                const replaceInObject = (obj: any): any => {
                  if (typeof obj === "string") {
                    return obj.replace(search, replace);
                  } else if (Array.isArray(obj)) {
                    return obj.map(replaceInObject);
                  } else if (typeof obj === "object" && obj !== null) {
                    const newObj: any = {};
                    for (const key in obj) {
                      newObj[key] = replaceInObject(obj[key]);
                    }
                    return newObj;
                  }
                  return obj;
                };
                return replaceInObject(target);
              }
              
              if (mod.mode === "appendArr" || mod.mode === "prependArr") {
                const currentArr = Array.isArray(target) ? target : [];
                const items = Array.isArray(mod.items) ? mod.items : [mod.items];
                return mod.mode === "appendArr" ? [...currentArr, ...items] : [...items, ...currentArr];
              }
              
              if (mod.mode === "replaceArr") {
                if (!Array.isArray(target)) return target;
                const replaceVal = mod.replace;
                const withVal = mod.with;
                return target.map(item => {
                  if (typeof item === "object" && item !== null && item.name === replaceVal) return withVal;
                  if (typeof item === "string" && item === replaceVal) return withVal;
                  return item;
                });
              }

              if (mod.mode === "removeArr") {
                if (!Array.isArray(target)) return target;
                const names = Array.isArray(mod.names) ? mod.names : [mod.names];
                return target.filter(item => {
                  const itemName = typeof item === "object" && item !== null ? item.name : item;
                  return !names.includes(itemName);
                });
              }

              if (mod.mode === "insertArr") {
                const currentArr = Array.isArray(target) ? target : [];
                const items = Array.isArray(mod.items) ? mod.items : [mod.items];
                const index = mod.index || 0;
                const newArr = [...currentArr];
                newArr.splice(index, 0, ...items);
                return newArr;
              }

              if (mod.mode === "addProp") {
                const newObj = typeof target === "object" && target !== null ? { ...target } : {};
                newObj[mod.prop] = mod.with;
                return newObj;
              }

              if (mod.mode === "removeProp") {
                if (typeof target !== "object" || target === null) return target;
                const newObj = { ...target };
                delete newObj[mod.prop];
                return newObj;
              }

              return target;
            };

            // Apply global mods (*)
            if (mods["*"]) {
              const starMods = Array.isArray(mods["*"]) ? mods["*"] : [mods["*"]];
              starMods.forEach(m => {
                merged = applyMod(merged, m);
              });
            }

            // Apply specific field mods
            for (const field in mods) {
              if (field === "*") continue;
              const fieldMods = Array.isArray(mods[field]) ? mods[field] : [mods[field]];
              fieldMods.forEach(m => {
                merged[field] = applyMod(merged[field], m);
              });
            }
          }

          // Merge current monster overrides into the modified base
          const finalMonster = { ...merged };
          for (const key in monster) {
            if (key === "_copy") continue;
            if (preserve[key]) continue; // Skip if preserved from base
            finalMonster[key] = monster[key];
          }
          monster = finalMonster;
        }
      }
      
      // Fetch legendary group if applicable
      const lgRef = monster.legendaryGroup;
      if (lgRef) {
        const lg = await this.getLegendaryGroup(lgRef.name, lgRef.source);
        if (lg) {
          if (lg.lairActions) monster.lairActions = lg.lairActions;
          if (lg.regionalEffects) monster.regionalEffects = lg.regionalEffects;
          if (lg.mythic) monster.mythic = lg.mythic;
          // Sometimes legendary actions are also in the group
          if (lg.legendaryActions && !monster.legendary) monster.legendary = lg.legendaryActions;
        }
      } else {
        // Try matching by name and source as fallback
        const lg = await this.getLegendaryGroup(monster.name, monster.source);
        if (lg) {
          if (lg.lairActions) monster.lairActions = lg.lairActions;
          if (lg.regionalEffects) monster.regionalEffects = lg.regionalEffects;
          if (lg.mythic) monster.mythic = lg.mythic;
        }
      }

      this.entryCache[cacheKey] = monster;
    }
    return monster;
  }

  async getLegendaryGroup(name: string, source: string): Promise<any | null> {
    const cacheKey = `legendary-${name}-${source}`;
    if (this.entryCache[cacheKey]) return this.entryCache[cacheKey];

    const data = await this.fetchFile("/data/bestiary/legendarygroups.json");
    if (!data || !data.legendaryGroup) return null;

    const group = data.legendaryGroup.find((g: any) => 
      g.name.toLowerCase() === name.toLowerCase() && g.source === source
    );

    if (group) {
      this.entryCache[cacheKey] = group;
    }
    return group;
  }

  async getFluff(name: string, source: string): Promise<any | null> {
    const cacheKey = `fluff-${name}-${source}`;
    if (this.entryCache[cacheKey]) return this.entryCache[cacheKey];

    const index = await this.loadFluffIndex();
    const fileName = index?.[source];
    
    let fluff = null;
    if (fileName) {
      const fluffFile = `/data/bestiary/${fileName}`;
      const data = await this.fetchFile(fluffFile);
      
      if (data) {
        const list = data.monsterFluff || data.monster || [];
        fluff = list.find((m: any) => m.name.toLowerCase() === name.toLowerCase());
      }
    }

    // If no fluff found, check if it's a copy and try base monster fluff
    if (!fluff) {
      const monster = await this.getMonster(name, source);
      if (monster && monster._copy) {
        fluff = await this.getFluff(monster._copy.name, monster._copy.source);
      }
    }

    if (fluff) {
      this.entryCache[cacheKey] = fluff;
    }
    return fluff;
  }

  getSourceName(source: string): string {
    return this.sourceNames[source] || source;
  }

  async getSpell(name: string, source: string): Promise<any | null> {
    const cacheKey = `spell-${name}-${source || "any"}`;
    if (this.entryCache[cacheKey]) return this.entryCache[cacheKey];

    const index = await this.loadSpellsIndex();
    
    const trySource = async (s: string) => {
      const fileName = index?.[s];
      if (!fileName) return null;
      const data = await this.fetchFile(`/data/spells/${fileName}`);
      if (!data || !data.spell) return null;
      return data.spell.find((sp: any) => sp.name.toLowerCase() === name.toLowerCase());
    };

    const priorityMap: Record<string, string> = { 
      "PHB": "XPHB", 
      "MM": "XMM", 
      "DMG": "XDMG",
      "PHB'24": "XPHB",
      "MM'25": "XMM",
      "DMG'24": "XDMG"
    };
    let spell = null;

    // 1. Try priority version of requested source
    if (source && priorityMap[source]) {
      spell = await trySource(priorityMap[source]);
    }
    
    // 2. Try requested source
    if (!spell && source) {
      spell = await trySource(source);
    }

    // 3. If no source or not found, try global priority sources
    if (!spell) {
      for (const ps of ["XPHB", "XMM", "XDMG"]) {
        spell = await trySource(ps);
        if (spell) break;
      }
    }

    // 4. Fallback to any match in index
    if (!spell) {
      const sources = Object.keys(index || {});
      for (const s of sources) {
        spell = await trySource(s);
        if (spell) break;
      }
    }

    if (spell) {
      this.entryCache[cacheKey] = spell;
    }
    return spell;
  }
  
  // Generic lookup for other types (conditions, items, etc.)
  async getEntry(type: string, name: string, source?: string): Promise<any | null> {
    const cacheKey = `entry-${type}-${name}-${source || "any"}`;
    if (this.entryCache[cacheKey]) return this.entryCache[cacheKey];

    try {
      let data: any = null;
      let list: any[] = [];

      if (type === "condition" || type === "disease" || type === "status") {
        data = await this.fetchFile("/data/conditionsdiseases.json");
        list = data?.[type === "status" ? "condition" : type] || [];
      } else if (type === "variantrules") {
        data = await this.fetchFile("/data/variantrules.json");
        list = data?.variantrule || [];
      } else if (type === "item") {
        data = await this.fetchFile("/data/items.json");
        list = data?.item || [];
      } else if (type === "language") {
        data = await this.fetchFile("/data/languages.json");
        list = data?.language || [];
      } else if (type === "sense") {
        data = await this.fetchFile("/data/senses.json");
        list = data?.sense || [];
      } else if (type === "race") {
        data = await this.fetchFile("/data/races.json");
        list = data?.race || [];
      } else if (type === "skill") {
        data = await this.fetchFile("/data/skills.json");
        list = data?.skill || [];
      } else if (type === "loot") {
        data = await this.fetchFile("/data/loot.json");
        list = data?.loot || [];
      } else if (type === "name") {
        data = await this.fetchFile("/data/names.json");
        list = data?.name || [];
      } else {
        // Fallback for other types
        const path = `/data/${type}.json`;
        data = await this.fetchFile(path);
        if (data) {
          list = data[type] || data.entry || data.data || [];
        }
      }

      if (!list || !Array.isArray(list)) return null;
      
      const findEntry = (s?: string) => {
        return list.find((e: any) => {
          const nameMatch = e.name.toLowerCase() === name.toLowerCase();
          if (!nameMatch) return false;
          if (s) return e.source === s;
          return true;
        });
      };

      const priorityMap: Record<string, string> = { 
        "PHB": "XPHB", 
        "MM": "XMM", 
        "DMG": "XDMG",
        "PHB'24": "XPHB",
        "MM'25": "XMM",
        "DMG'24": "XDMG"
      };
      let entry = null;

      // 1. Try priority version of requested source
      if (source && priorityMap[source]) {
        entry = findEntry(priorityMap[source]);
      }

      // 2. Try requested source
      if (!entry && source) {
        entry = findEntry(source);
      }

      // 3. Try global priority sources
      if (!entry) {
        const prioritySources = ["XPHB", "XMM", "XDMG"];
        for (const ps of prioritySources) {
          entry = findEntry(ps);
          if (entry) break;
        }
      }

      // 4. Fallback to first match
      if (!entry) {
        entry = findEntry();
      }

      if (entry) {
        this.entryCache[cacheKey] = entry;
        return entry;
      }
      return null;
    } catch (error) {
      console.error(`Error fetching entry ${type}:${name}`, error);
      return null;
    }
  }
}

export const dataService = new DataService();
