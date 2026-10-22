import type { ReferenceBiome } from "../model";
import { mainIllustration, pattern, simplification } from "./helpers";

const base: Omit<ReferenceBiome, "images"> = {
  id: "semi-arid-desert",
  name: "Semi-arid desert",
  category: "climate-zone",
  summary:
    "Arid scrublands, sandstone mesas and dry washes with seasonal cloudbursts, hardy brush and rugged canyon terrain.",
  filters: ["dry", "open", "hot"],
  conditions: {
    temperature: {
      low: 10,
      high: 38,
      unit: "°C",
      note: "Large daily swings between scorching midday heat and chilled desert nights.",
    },
    precipitation: {
      low: 200,
      high: 450,
      unit: "mm per year",
      note: "Rain arrives in erratic, intense cloudbursts rather than steady showers.",
    },
    seasonality: [
      pattern(
        "Blistering summers with occasional torrential monsoon storms; crisp, cold winters with rare highland frosts.",
        "beck-2018-koppen",
      ),
    ],
    waterAvailability: [
      pattern(
        "Dry river washes and arroyos remain baked clay most of the year, transforming into lethal torrents within minutes during rain.",
        "ricklefs-ecology",
      ),
    ],
    notes: [
      simplification(
        "Thin, rocky aridisol soils with biological soil crusts that take decades to recover once disturbed.",
        "ricklefs-ecology",
      ),
    ],
  },
  landscape: [
    pattern(
      "Sandstone mesas, isolated buttes, deep box canyons, alluvial fans and broad desert washes.",
      "olson-2001-ecoregions",
    ),
    pattern(
      "Exposed bedrock, talus slopes and gravel plains where wind sweeps loose silt away.",
      "iucn-habitats",
    ),
  ],
  vegetation: [
    pattern(
      "Deep-rooted sagebrush, hardy creosote shrubs, scrub juniper and drought-tolerant bunchgrasses.",
      "whittaker-1975",
    ),
    simplification(
      "Thorny shrubs, agaves and yuccas store moisture in thick flesh or drop leaves during severe droughts.",
      "ricklefs-ecology",
    ),
  ],
  wildlife: [
    pattern(
      "Burrowing rodents, jackrabbits, coyotes, kit foxes, rattlesnakes, and raptors hunting over canyon rims.",
      "iucn-habitats",
    ),
    pattern(
      "Agile ungulates like bighorn sheep and mountain gazelles navigate sheer canyon ledges to escape predators.",
      "olson-2001-ecoregions",
    ),
  ],
  resources: [
    pattern(
      "Abundant building stone, clay deposits, placer minerals in dry washes, and aromatic medicinal herbs.",
      "iucn-habitats",
    ),
    pattern(
      "Sheltered alcoves in cliff faces provide natural cisterns that hold water long after storms.",
      "ricklefs-ecology",
    ),
  ],
  hazards: [
    pattern(
      "Sudden flash floods roaring down dry canyons from storms miles away with zero local warning.",
      "ricklefs-ecology",
    ),
    pattern(
      "Severe dehydration, sunstroke, disorienting mirages and crumbly, unstable canyon rimrock.",
      "beck-2018-koppen",
    ),
  ],
  variations: [
    simplification(
      "Higher plateau borders support open pinyon-juniper woodland before rising into montane pine forests.",
      "olson-2001-ecoregions",
    ),
  ],
  sourceIds: [
    "beck-2018-koppen",
    "olson-2001-ecoregions",
    "ricklefs-ecology",
    "whittaker-1975",
    "iucn-habitats",
  ],
};

export const semiAridDesert: ReferenceBiome = {
  ...base,
  images: [
    mainIllustration(
      base,
      "A rugged semi-arid landscape with sandstone mesas, dry gravel washes, sagebrush and sunlit canyon walls.",
      {
        tool: "gpt-6-luna",
        generatedAt: "2026-10-22",
        review: {
          reviewedBy: "Espen Erlandsen",
          reviewedAt: "2026-10-22",
          notes:
            "Rugged semi-arid landscape with sandstone mesas, dry washes, sagebrush and distant sunlit canyon walls under a wide pale sky.",
        },
      },
    ),
  ],
};
