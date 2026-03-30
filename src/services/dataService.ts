
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
  private isRefreshing = false;
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

  private async fetchWithTimeout(resource: string, options: any = {}) {
    const { timeout = 8000 } = options;
    
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(resource, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  }

  async loadBestiaryIndex(retries = 3) {
    if (this.bestiaryIndex) return this.bestiaryIndex;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[DataService] Loading bestiary index (attempt ${attempt}/${retries})...`);
        const response = await this.fetchWithTimeout('/data/bestiary/index.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        this.bestiaryIndex = await response.json();
        console.log("[DataService] Bestiary index loaded successfully.");
        return this.bestiaryIndex;
      } catch (e) {
        console.error(`[DataService] Failed to load bestiary index (attempt ${attempt}/${retries}):`, e);
        if (attempt === retries) return {};
        await new Promise(r => setTimeout(r, 500 * attempt));
      }
    }
    return {};
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

  private async fetchFile(path: string, retries = 3) {
    if (this.fileCache[path]) return this.fileCache[path];
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[DataService] Fetching file (attempt ${attempt}/${retries}): ${path}`);
        const response = await this.fetchWithTimeout(path);
        
        if (!response.ok) {
          console.error(`[DataService] Failed to fetch ${path}: ${response.status} ${response.statusText}`);
          if (attempt === retries) return null;
          await new Promise(r => setTimeout(r, 500 * attempt));
          continue;
        }
        
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          console.error(`[DataService] Invalid content type for ${path}: ${contentType}`);
          return null;
        }

        const data = await response.json();
        this.fileCache[path] = data;
        return data;
      } catch (e) {
        console.error(`[DataService] Error fetching ${path} (attempt ${attempt}/${retries}):`, e);
        if (attempt === retries) return null;
        await new Promise(r => setTimeout(r, 500 * attempt));
      }
    }
    return null;
  }

  private refreshPromise: Promise<{ name: string; source: string }[]> | null = null;

  async getMonsterList(onUpdate?: (list: { name: string; source: string }[]) => void): Promise<{ name: string; source: string }[]> {
    if (this.monsterList && this.monsterList.length > 0) {
      if (onUpdate) onUpdate(this.monsterList);
      return this.monsterList;
    }
    
    // Try loading from localStorage first
    const saved = localStorage.getItem("monster-list-cache");
    if (saved) {
      try {
        this.monsterList = JSON.parse(saved);
        if (this.monsterList && this.monsterList.length > 0) {
          if (onUpdate) onUpdate(this.monsterList);
          // Still trigger a background refresh to keep it up to date
          this.refreshMonsterList(onUpdate);
          return this.monsterList;
        }
      } catch (e) {
        console.error("Failed to parse cached monster list", e);
      }
    }

    return this.refreshMonsterList(onUpdate);
  }

  private async refreshMonsterList(onUpdate?: (list: { name: string; source: string }[]) => void): Promise<{ name: string; source: string }[]> {
    if (this.refreshPromise) {
      // If already refreshing, wait for it but also return current partial list if available
      if (onUpdate && this.monsterList) onUpdate(this.monsterList);
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      this.isRefreshing = true;
      try {
        console.log("[DataService] Refreshing monster list...");
        const index = await this.loadBestiaryIndex();
        const sources = Object.keys(index || {});
        
        if (sources.length === 0) {
          console.warn("[DataService] No sources found in bestiary index.");
          return [];
        }

        // Prioritize common sources to get a list quickly
        const prioritySources = ["XMM", "MM", "MPMM", "VGM", "MTF"];
        const otherSources = sources.filter(s => !prioritySources.includes(s));
        const sortedSources = [...prioritySources.filter(s => sources.includes(s)), ...otherSources];
        
        const allMonsters: { name: string; source: string }[] = [];
        
        // Fetch files in chunks to avoid overwhelming the browser
        const chunkSize = 10;
        for (let i = 0; i < sortedSources.length; i += chunkSize) {
          const chunk = sortedSources.slice(i, i + chunkSize);
          const promises = chunk.map(async (source) => {
            const fileName = index?.[source];
            if (!fileName) return;
            const data = await this.fetchFile(`/data/bestiary/${fileName}`);
            if (data && data.monster) {
              data.monster.forEach((m: any) => {
                if (m.name && typeof m.name === 'string') {
                  allMonsters.push({ name: m.name, source: m.source || source });
                }
              });
            }
          });
          await Promise.all(promises);
          
          // Update the list and notify callback
          this.monsterList = [...allMonsters].sort((a, b) => a.name.localeCompare(b.name));
          if (onUpdate) onUpdate(this.monsterList);
        }
        
        // Final sort and cache
        allMonsters.sort((a, b) => a.name.localeCompare(b.name));
        console.log(`[DataService] Loaded ${allMonsters.length} monsters from ${sources.length} sources.`);
        
        this.monsterList = allMonsters;
        localStorage.setItem("monster-list-cache", JSON.stringify(allMonsters));
        return allMonsters;
      } catch (error) {
        console.error("[DataService] Error refreshing monster list:", error);
        return this.monsterList || [];
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async getMonster(name: string, source: string): Promise<Monster | null> {
    const cacheKey = `monster-${name}-${source || "any"}`;
    if (this.entryCache[cacheKey]) return this.entryCache[cacheKey];

    console.log(`[DataService] getMonster called for "${name}" (${source || "any source"})`);
    const index = await this.loadBestiaryIndex();
    
    const trySource = async (s: string) => {
      const fileName = index?.[s];
      if (!fileName) {
        console.log(`[DataService] No filename for source "${s}" in index`);
        return null;
      }
      const data = await this.fetchFile(`/data/bestiary/${fileName}`);
      if (!data || !data.monster) {
        console.log(`[DataService] No monster data in ${fileName}`);
        return null;
      }
      const found = data.monster.find((m: any) => m.name.toLowerCase() === name.toLowerCase());
      if (found) {
        console.log(`[DataService] Found "${name}" in source "${s}" (${fileName})`);
      }
      return found;
    };

    const priorityMap: Record<string, string> = { 
      "MM": "XMM", 
      "PHB": "XPHB", 
      "DMG": "XDMG",
      "MM'25": "XMM",
      "PHB'24": "XPHB",
      "DMG'24": "XDMG",
      "VGM": "MPMM",
      "MTF": "MPMM"
    };
    let monster = null;

    // 1. Try requested source
    if (source) {
      monster = await trySource(source);
    }

    // 2. Try priority version of requested source if not found
    if (!monster && source && priorityMap[source]) {
      console.log(`[DataService] "${name}" not found in "${source}", trying priority alternative "${priorityMap[source]}"`);
      monster = await trySource(priorityMap[source]);
    }

    // 3. If no source or not found, try global priority sources
    if (!monster) {
      console.log(`[DataService] "${name}" not found in requested source, searching global priority sources...`);
      for (const ps of ["XMM", "XPHB", "XDMG", "MM", "MPMM"]) {
        if (ps === source) continue;
        monster = await trySource(ps);
        if (monster) break;
      }
    }

    // 4. Fallback to any match in index
    if (!monster) {
      console.log(`[DataService] "${name}" still not found, searching all sources...`);
      const sources = Object.keys(index || {});
      for (const s of sources) {
        if (s === source) continue;
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
        console.log(`[DataService] Processing _copy for "${name}": base="${copyMeta.name}", source="${copyMeta.source}"`);
        const baseMonster = await this.getMonster(copyMeta.name, copyMeta.source);
        if (baseMonster) {
          const mods = copyMeta._mod;
          const preserve = copyMeta._preserve || {};
          
          // Start with base monster
          let merged = JSON.parse(JSON.stringify(baseMonster));
          
          // Apply templates if any
          if (copyMeta._templates) {
            for (const t of copyMeta._templates) {
              console.log(`[DataService] Applying template "${t.name}" from "${t.source}" to "${name}"`);
              const template = await this.getTemplate(t.name, t.source);
              if (template && template.apply) {
                // Apply _root changes
                if (template.apply._root) {
                  merged = { ...merged, ...template.apply._root };
                }
                // Apply _mod changes
                if (template.apply._mod) {
                  merged = this.applyModifications(merged, template.apply._mod);
                }
              }
            }
          }
          
          // Apply modifications from _copy
          if (mods) {
            console.log(`[DataService] Applying monster-specific modifications to "${name}"`);
            merged = this.applyModifications(merged, mods);
          }

          // Calculate skill bonuses if they are numbers (1=proficient, 2=expert)
          if (merged.skill) {
            const pb = this.calculatePB(merged.cr);
            for (const skill in merged.skill) {
              const val = merged.skill[skill];
              if (typeof val === 'number') {
                const ability = this.getSkillAbility(skill);
                const abilityVal = merged[ability] || 10;
                const mod = Math.floor((abilityVal - 10) / 2);
                const bonus = mod + (val * pb);
                merged.skill[skill] = bonus >= 0 ? `+${bonus}` : `${bonus}`;
              }
            }
          }

          // Merge current monster overrides into the modified base
          const finalMonster = { ...merged };
          for (const key in monster) {
            if (key === "_copy") continue;
            if (preserve[key]) continue; // Skip if preserved from base
            finalMonster[key] = monster[key];
          }
          
          // Ensure name and source are from the original entry
          finalMonster.name = monster.name;
          finalMonster.source = monster.source || source;
          
          monster = finalMonster;
        } else {
          console.warn(`[DataService] Could not find base monster "${copyMeta.name}" for "${name}"`);
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

      // Replace placeholders like <$name$>, <$short_name$>, etc.
      monster = this.replacePlaceholders(monster, monster);

      this.entryCache[cacheKey] = monster;
    } else {
      console.warn(`[DataService] Monster "${name}" not found in any source.`);
    }
    return monster;
  }

  private replacePlaceholders(obj: any, monster: any): any {
    if (!obj) return obj;
    const name = monster.name || "";
    const shortName = monster.shortName || name;
    const titleName = name.split(',')[0].trim();
    const titleShortName = shortName.split(',')[0].trim();

    const replaceStr = (s: string) => {
      if (typeof s !== 'string') return s;
      return s.replace(/<\$name\$>/g, name)
              .replace(/<\$short_name\$>/g, shortName)
              .replace(/<\$title_name\$>/g, titleName)
              .replace(/<\$title_short_name\$>/g, titleShortName);
    };

    const traverse = (o: any): any => {
      if (typeof o === 'string') return replaceStr(o);
      if (Array.isArray(o)) return o.map(traverse);
      if (typeof o === 'object' && o !== null) {
        const newObj: any = {};
        for (const key in o) {
          newObj[key] = traverse(o[key]);
        }
        return newObj;
      }
      return o;
    };

    return traverse(obj);
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

  async getTemplate(name: string, source: string): Promise<any | null> {
    const cacheKey = `template-${name}-${source}`;
    if (this.entryCache[cacheKey]) return this.entryCache[cacheKey];

    const data = await this.fetchFile("/data/bestiary/template.json");
    if (!data || !data.monsterTemplate) return null;

    const template = data.monsterTemplate.find((t: any) => 
      t.name.toLowerCase() === name.toLowerCase() && t.source === source
    );

    if (template) {
      this.entryCache[cacheKey] = template;
    }
    return template;
  }

  private applyModifications(target: any, mods: any): any {
    let merged = JSON.parse(JSON.stringify(target));

    const applyMod = (fieldTarget: any, mod: any, isRoot = false): any => {
      if (!mod || !mod.mode) return fieldTarget;
      
      if (mod.mode === "replaceTxt") {
        let flags = mod.flags || "g";
        if (!flags.includes("g")) flags += "g";
        const search = new RegExp(mod.replace, flags);
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
        return replaceInObject(fieldTarget);
      }
      
      if (mod.mode === "appendArr" || mod.mode === "prependArr") {
        if (isRoot) return fieldTarget; // Cannot append to root object
        const currentArr = Array.isArray(fieldTarget) ? fieldTarget : [];
        const items = Array.isArray(mod.items) ? mod.items : [mod.items];
        return mod.mode === "appendArr" ? [...currentArr, ...items] : [...items, ...currentArr];
      }
      
      if (mod.mode === "replaceArr") {
        if (isRoot || !Array.isArray(fieldTarget)) return fieldTarget;
        const replaceVal = mod.replace;
        const withVal = mod.with;
        return fieldTarget.map(item => {
          if (typeof item === "object" && item !== null && item.name === replaceVal) return withVal;
          if (typeof item === "string" && item === replaceVal) return withVal;
          return item;
        });
      }
      
      if (mod.mode === "removeArr") {
        if (isRoot || !Array.isArray(fieldTarget)) return fieldTarget;
        const names = Array.isArray(mod.names) ? mod.names : [mod.names];
        return fieldTarget.filter(item => {
          const itemName = typeof item === "object" && item !== null ? item.name : item;
          return !names.includes(itemName);
        });
      }
      
      if (mod.mode === "insertArr") {
        if (isRoot) return fieldTarget;
        const currentArr = Array.isArray(fieldTarget) ? fieldTarget : [];
        const items = Array.isArray(mod.items) ? mod.items : [mod.items];
        const index = mod.index || 0;
        const newArr = [...currentArr];
        newArr.splice(index, 0, ...items);
        return newArr;
      }
      
      if (mod.mode === "addProp") {
        const newObj = typeof fieldTarget === "object" && fieldTarget !== null && !Array.isArray(fieldTarget) 
          ? { ...fieldTarget } 
          : (isRoot ? { ...merged } : {});
        newObj[mod.prop] = mod.with;
        return newObj;
      }
      
      if (mod.mode === "removeProp") {
        if (typeof fieldTarget !== "object" || fieldTarget === null || Array.isArray(fieldTarget)) return fieldTarget;
        const newObj = { ...fieldTarget };
        delete newObj[mod.prop];
        return newObj;
      }

      if (mod.mode === "addSenses") {
        const targetObj = (isRoot || (typeof fieldTarget === 'object' && fieldTarget !== null && !Array.isArray(fieldTarget))) ? fieldTarget : null;
        if (targetObj) {
          const currentSenses = Array.isArray(targetObj.senses) ? targetObj.senses : (typeof targetObj.senses === 'string' ? [targetObj.senses] : []);
          const newSenses = Array.isArray(mod.senses) ? mod.senses : [mod.senses];
          const formattedSenses = newSenses.map(s => typeof s === 'string' ? s : `${s.type} ${s.range} ft.`);
          targetObj.senses = [...currentSenses, ...formattedSenses];
          return targetObj;
        }
        return fieldTarget;
      }

      if (mod.mode === "addSkills") {
        const targetObj = (isRoot || (typeof fieldTarget === 'object' && fieldTarget !== null && !Array.isArray(fieldTarget))) ? fieldTarget : null;
        if (targetObj) {
          const currentSkills = typeof targetObj.skill === 'object' && targetObj.skill !== null ? { ...targetObj.skill } : {};
          const newSkills = mod.skills || {};
          for (const skill in newSkills) {
            const val = newSkills[skill];
            currentSkills[skill] = typeof val === 'number' ? (val >= 0 ? `+${val}` : `${val}`) : val;
          }
          targetObj.skill = currentSkills;
          return targetObj;
        }
        return fieldTarget;
      }

      if (mod.mode === "appendIfNotExistsArr") {
        if (isRoot) return fieldTarget;
        const currentArr = Array.isArray(fieldTarget) ? fieldTarget : (fieldTarget ? [fieldTarget] : []);
        const items = Array.isArray(mod.items) ? mod.items : [mod.items];
        const toAdd = items.filter(item => !currentArr.includes(item));
        return [...currentArr, ...toAdd];
      }

      return fieldTarget;
    };

    // Apply global mods (*) or (_)
    const globalKeys = ["*", "_"];
    globalKeys.forEach(gk => {
      if (mods[gk]) {
        const globalMods = Array.isArray(mods[gk]) ? mods[gk] : [mods[gk]];
        globalMods.forEach(m => {
          merged = applyMod(merged, m, true);
        });
      }
    });

    // Apply specific field mods
    for (const field in mods) {
      if (globalKeys.includes(field)) continue;
      const fieldMods = Array.isArray(mods[field]) ? mods[field] : [mods[field]];
      fieldMods.forEach(m => {
        merged[field] = applyMod(merged[field], m, false);
      });
    }

    return merged;
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

  calculatePB(cr: any): number {
    let crStr = "";
    if (typeof cr === 'string') crStr = cr;
    else if (cr && cr.cr) crStr = cr.cr;
    
    let numericCr = 0;
    if (crStr.includes('/')) {
      const [num, den] = crStr.split('/').map(Number);
      numericCr = num / den;
    } else {
      numericCr = Number(crStr);
    }
    
    if (numericCr < 5) return 2;
    if (numericCr < 9) return 3;
    if (numericCr < 13) return 4;
    if (numericCr < 17) return 5;
    if (numericCr < 21) return 6;
    if (numericCr < 25) return 7;
    if (numericCr < 29) return 8;
    return 9;
  }

  getSkillAbility(skill: string): string {
    const map: Record<string, string> = {
      'athletics': 'str',
      'acrobatics': 'dex',
      'sleight of hand': 'dex',
      'stealth': 'dex',
      'arcana': 'int',
      'history': 'int',
      'investigation': 'int',
      'nature': 'int',
      'religion': 'int',
      'animal handling': 'wis',
      'insight': 'wis',
      'medicine': 'wis',
      'perception': 'wis',
      'survival': 'wis',
      'deception': 'cha',
      'intimidation': 'cha',
      'performance': 'cha',
      'persuasion': 'cha'
    };
    return map[skill.toLowerCase()] || 'int';
  }

  clearCache() {
    this.fileCache = {};
    this.entryCache = {};
    localStorage.removeItem("monster-cache");
    localStorage.removeItem("monster-list-cache");
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

    // 1. Try requested source
    if (source) {
      spell = await trySource(source);
    }

    // 2. Try priority version of requested source if not found
    if (!spell && source && priorityMap[source]) {
      spell = await trySource(priorityMap[source]);
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
      } else if (type === "action") {
        data = await this.fetchFile("/data/actions.json");
        list = data?.action || [];
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

      // 1. Try requested source
      if (source) {
        entry = findEntry(source);
      }

      // 2. Try priority version of requested source if not found
      if (!entry && source && priorityMap[source]) {
        entry = findEntry(priorityMap[source]);
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
