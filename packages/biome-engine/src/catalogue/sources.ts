import type { BiomeSource } from "../model";

/**
 * Factual references cited by the catalogue. Broad classification schemes
 * (Köppen–Geiger, Whittaker) are cited as simplifications, never as rules.
 */
const SOURCES: BiomeSource[] = [
  {
    id: "beck-2018-koppen",
    title:
      "Present and future Köppen-Geiger climate classification maps at 1-km resolution",
    author: "Beck, H. E. et al.",
    year: 2018,
    url: "https://doi.org/10.1038/sdata.2018.214",
  },
  {
    id: "olson-2001-ecoregions",
    title: "Terrestrial Ecoregions of the World: A New Map of Life on Earth",
    author: "Olson, D. M. et al.",
    year: 2001,
    url: "https://doi.org/10.1641/0006-3568(2001)051[0933:TEOTWA]2.0.CO;2",
  },
  {
    id: "ricklefs-ecology",
    title: "The Economy of Nature",
    author: "Ricklefs, R. E. and Relyea, R.",
    year: 2018,
  },
  {
    id: "whittaker-1975",
    title: "Communities and Ecosystems",
    author: "Whittaker, R. H.",
    year: 1975,
  },
  {
    id: "iucn-habitats",
    title: "IUCN Habitats Classification Scheme",
    author: "IUCN",
    url: "https://www.iucnredlist.org/resources/habitat-classification-scheme",
  },
  {
    id: "fao-ecozones",
    title: "Global Ecological Zones for FAO Forest Reporting: 2010 Update",
    author: "FAO",
    year: 2012,
    url: "https://www.fao.org/4/ap861e/ap861e00.pdf",
  },
  {
    id: "ramsar-wetlands",
    title: "An Introduction to the Ramsar Convention on Wetlands",
    author: "Ramsar Convention Secretariat",
    url: "https://www.ramsar.org/",
  },
  {
    id: "korner-alpine",
    title:
      "Alpine Plant Life: Functional Plant Ecology of High Mountain Ecosystems",
    author: "Körner, C.",
    year: 2021,
  },
];

export const BIOME_SOURCES: Readonly<Record<string, BiomeSource>> =
  Object.freeze(
    Object.fromEntries(SOURCES.map((source) => [source.id, source])),
  );
