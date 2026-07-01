import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const CACHE_FILE = "/tmp/tmt-paths.txt";
const REPO_URL = "https://github.com/IsThisMyRealName/too-many-tokens-dnd.git";
const BASE_RAW_URL =
  "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/";
const ENTRIES_DIR = path.resolve(__dirname, "../src/packs/entries");

const CATEGORY_FALLBACKS: Record<string, string> = {
  aberration: "Mindflayer Arcanist/MindflayerArcanist (1).webp",
  beast: "Wolf/Wolf (1).webp",
  celestial: "Pegasus/PegasusForest (1).webp",
  construct: "Animated Armor/AnimatedArmor (1).webp",
  dragon: "Red Dragon Wyrmling/RedDragonWyrmling (1).webp",
  elemental: "Fire Elemental/FireElemental (1).webp",
  fey: "Dryad/Dryad (1).webp",
  fiend: "Barbed Devil/BarbedDevil (1).webp",
  giant: "Hill Giant/HillGiantFemale (1).webp",
  goblinoid: "Goblin Boss/GoblinBossMaleGraygreenForest (1).webp",
  humanoid: "Acolyte/AcolyteHumanFemale (1).webp",
  monstrosity: "Owlbear/Owlbear (1).webp",
  ooze: "Gelatinous Cube/GelatinousCubeInvisible (1).webp",
  plant: "Treant/TreantEvil (1).webp",
  undead: "Wraith/Wraith (1).webp",
  "scifi-alien": "Mindflayer Arcanist/MindflayerArcanist (1).webp",
  "scifi-mech": "Duodrone/Duodrone (1).webp",
  "cyberpunk-cyborg": "Thug/ThugDragonbornMelee (1).webp",
  "cyberpunk-drone": "Monodrone/Monodrone (1).webp",
  "apocalyptic-mutant": "Ghoul/GhoulFemale (1).webp",
  "apocalyptic-raider": "Berserker/BerserkerDragonborn (1).webp",
  "horror-undead": "Vampire Spawn/VampireSpawnDragonborn (1).webp",
  "horror-eldritch": "Aboleth/AbolethAberration (1).webp",
  "steampunk-clockwork": "Animated Armor/AnimatedArmor (1).webp",
  "steampunk-frontier": "Bandit Captain/BanditCaptainDragonbornArctic (1).webp",
};

async function ensureTokenPaths(): Promise<string[]> {
  if (!fs.existsSync(CACHE_FILE) || fs.statSync(CACHE_FILE).size === 0) {
    console.log(
      "Fetching token file tree from Too-Many-Tokens-DND repository...",
    );
    const tmpDir = "/tmp/tmt-repo-" + Date.now();
    try {
      execSync(
        `git clone --depth 1 --filter=blob:none --no-checkout ${REPO_URL} ${tmpDir}`,
        { stdio: "ignore" },
      );
      const output = execSync(
        `cd ${tmpDir} && git ls-tree -r --name-only HEAD`,
      ).toString();
      const webpPaths = output
        .split("\n")
        .filter((line) => line.endsWith(".webp"));
      fs.writeFileSync(CACHE_FILE, webpPaths.join("\n"));
      execSync(`rm -rf ${tmpDir}`);
    } catch (err) {
      console.error("Failed to fetch repo tree:", err);
    }
  }
  const content = fs.readFileSync(CACHE_FILE, "utf-8");
  return content.split("\n").filter(Boolean);
}

function findBestMatch(
  title: string,
  category: string,
  paths: string[],
): string {
  const cleanTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
  const words = cleanTitle
    .split(" ")
    .filter(
      (w) =>
        w.length > 2 && !["giant", "greater", "lesser", "elder"].includes(w),
    );

  // 1. Exact folder match
  let matches = paths.filter(
    (p) =>
      p
        .split("/")[0]
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, "") === cleanTitle,
  );

  // 2. Exact basename prefix match
  if (!matches.length) {
    const compactTitle = cleanTitle.replace(/ /g, "");
    matches = paths.filter((p) => {
      const base =
        p
          .split("/")
          .pop()
          ?.toLowerCase()
          .replace(/[^a-z0-9]/g, "") || "";
      return base.startsWith(compactTitle);
    });
  }

  // 3. Folder contains all key words
  if (!matches.length && words.length > 0) {
    matches = paths.filter((p) => {
      const folder = p.split("/")[0].toLowerCase();
      return words.every((w) => folder.includes(w));
    });
  }

  // 4. Folder contains any key word
  if (!matches.length && words.length > 0) {
    matches = paths.filter((p) => {
      const folder = p.split("/")[0].toLowerCase();
      return words.some((w) => folder.includes(w));
    });
  }

  const fallback = CATEGORY_FALLBACKS[category] || "Wolf/Wolf (1).webp";
  if (!matches.length) return fallback;

  matches.sort((a, b) => {
    const aHas1 = a.includes("(1).webp") ? -1 : 1;
    const bHas1 = b.includes("(1).webp") ? -1 : 1;
    if (aHas1 !== bHas1) return aHas1 - bHas1;
    return a.length - b.length;
  });

  return matches[0];
}

async function run() {
  const paths = await ensureTokenPaths();
  console.log(`Loaded ${paths.length} token file paths.`);

  const files = fs
    .readdirSync(ENTRIES_DIR)
    .filter((f) => f.endsWith("-entries.ts") && f !== "index.ts");
  let totalUpdated = 0;

  for (const file of files) {
    const filePath = path.join(ENTRIES_DIR, file);
    const category = file.replace("-entries.ts", "");
    const lines = fs.readFileSync(filePath, "utf-8").split("\n");
    const newLines: string[] = [];

    let currentTitle: string | null = null;
    let currentBlockHasImage = false;
    let fileUpdated = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const titleMatch = line.match(/title:\s*"([^"]+)"/);
      if (titleMatch) {
        currentTitle = titleMatch[1];
        currentBlockHasImage = false;
      }

      if (line.match(/^\s*image:\s*"/)) {
        currentBlockHasImage = true;
      }

      if (line.match(/^\s{2}\},?/) && currentTitle) {
        if (!currentBlockHasImage) {
          const matchedPath = findBestMatch(currentTitle, category, paths);
          const fullUrl = BASE_RAW_URL + encodeURI(matchedPath);

          // Ensure previous line ends with comma
          let prevIdx = newLines.length - 1;
          while (prevIdx >= 0 && !newLines[prevIdx].trim()) prevIdx--;
          if (prevIdx >= 0 && !newLines[prevIdx].trim().endsWith(",")) {
            newLines[prevIdx] = newLines[prevIdx] + ",";
          }

          newLines.push(`    image: "${fullUrl}"`);
          fileUpdated = true;
          totalUpdated++;
        }
        currentTitle = null;
      }

      newLines.push(line);
    }

    if (fileUpdated) {
      fs.writeFileSync(filePath, newLines.join("\n"));
      console.log(`Updated ${file}`);
    }
  }

  console.log(`Successfully added images to ${totalUpdated} entries!`);
}

run();
