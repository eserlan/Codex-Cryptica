/**
 * Business / Enterprise Generator (#3627, spec 180) — curated, genre-aware
 * tables. Data only: every entry is written so that a document built from it
 * passes the deterministic checks in business-checks.ts.
 */

import type {
  BusinessDependencyKind,
  BusinessRelationshipKind,
  BusinessRelationshipLabel,
} from "./business-state";

export type BusinessGenreGroup =
  | "fantasy"
  | "scifi"
  | "cyberpunk"
  | "modern"
  | "horror"
  | "western"
  | "pirate";

/** Price-looking text (currency symbols or coin/credit words) is never allowed in a business. */
export const PRICE_PATTERN =
  /(\d\s?(gp|sp|cp|cr|credits?|eddies|coins?)\b)|[$£€]\s?\d/i;

/** Words that make a secret read as a criminal secret. Legitimate businesses never carry these. */
export const CRIMINAL_WORDS = [
  "smuggl",
  "bribe",
  "extort",
  "racket",
  "criminal",
  "illegal",
  "gang",
  "kidnap",
  "forg",
  "blackmail",
  "black market",
  "poison",
  "stolen",
  "protection money",
];

export function genreGroup(genre: string): BusinessGenreGroup {
  const g = genre.toLowerCase();
  if (/cyber|corporate/.test(g)) return "cyberpunk";
  if (/sci|space|starport|star/.test(g)) return "scifi";
  if (/horror|cosmic|gothic/.test(g)) return "horror";
  if (/west|frontier/.test(g)) return "western";
  if (/pirate|nautical|swash|sea/.test(g)) return "pirate";
  if (/modern|urban|contemporary/.test(g)) return "modern";
  return "fantasy";
}

export const BUSINESS_TYPES: Record<BusinessGenreGroup, readonly string[]> = {
  fantasy: [
    "Blacksmith",
    "Apothecary",
    "Inn",
    "Caravan company",
    "Trading house",
    "Mercenary company",
    "Bathhouse",
    "Moneylender",
    "Shipyard",
    "Courier service",
    "Guild workshop",
    "Tannery",
  ],
  scifi: [
    "Starport freight company",
    "Salvage firm",
    "Ship repair yard",
    "Biotech clinic",
    "Courier service",
    "Mining concern",
    "Orbital hospitality business",
    "Transport company",
    "Data brokerage",
    "Private security company",
  ],
  cyberpunk: [
    "Ripper clinic",
    "Fixer front",
    "Nightclub",
    "Private security firm",
    "Courier outfit",
    "Repair shop",
    "Noodle bar",
    "Data broker",
    "Grey-market importer",
    "Shell corporation",
  ],
  modern: [
    "Family restaurant",
    "Courier firm",
    "Private investigation agency",
    "Tattoo parlour",
    "Auto repair shop",
    "Pawnshop",
    "Newsagent",
    "Bookmaker",
    "Dry cleaner",
    "Shipping agent",
  ],
  horror: [
    "Undertaker",
    "Occult bookshop",
    "Curio dealer",
    "Boarding house",
    "Coffin maker",
    "Chapel of rest",
    "Sanatorium",
    "Apothecary",
  ],
  western: [
    "Freight wagon company",
    "General store",
    "Saloon",
    "Assay office",
    "Livery stable",
    "Hotel",
    "Telegraph office",
    "Bank",
    "Dry goods supplier",
    "Rail spur contractor",
  ],
  pirate: [
    "Ship chandlery",
    "Fencing house",
    "Victualling company",
    "Privateer fleet",
    "Harbour bathhouse",
    "Sailmaker",
    "Rum distillery",
    "Pilot service",
  ],
};

const SHARED_LEGIT_SECRETS = [
  "The founder's first licence rests on a recommendation that nobody has checked since.",
  "Half the staff are paying off a loan the owner arranged quietly, and they do not know the lender's name.",
  "The business's most loyal supplier is a relative of the owner, and the family tie has never been written down.",
  "A surveyor's report that condemned the premises was buried, and the building has been unsafe ever since.",
  "The original owner left a sealed will that names a different heir, and only one clerk knows where it is.",
  "The best-selling product was copied from a rival's design, and the rival is still unaware.",
];

const SHARED_CRIMINAL_SECRETS = [
  "A back room is used to smuggle goods past the customs officers, and the owner takes a cut of every shipment.",
  "The owner bribes the inspector who signs the safety certificates, and has done for years.",
  "A protection racket is run through the business, and the staff have been told to pay without asking why.",
  "Stolen stock is re-labelled and sold on through a shell buyer, with the books kept just clean enough to pass.",
  "A loan from a lender with a bad name was repaid with stolen goods, and the owner has paid the interest in silence ever since.",
  "Cargo is quietly moved after dark through a side gate the council never inspected, and the proceeds are kept off the books.",
];

const SHARED_NAMES = {
  first: [
    "Mara",
    "Tal",
    "Brin",
    "Sela",
    "Oren",
    "Iska",
    "Dace",
    "Lumen",
    "Halle",
    "Corwin",
    "Nessa",
    "Pell",
  ],
  last: [
    "Venn",
    "Ashcombe",
    "Doran",
    "Quill",
    "Marrow",
    "Teague",
    "Sallow",
    "Brandt",
    "Okafor",
    "Vance",
  ],
};

export const BUSINESS_POOLS: Record<
  BusinessGenreGroup,
  {
    pressures: readonly string[];
    assets: readonly string[];
    opportunities: readonly string[];
    complications: readonly string[];
    dependencies: ReadonlyArray<{
      input: string;
      kind: BusinessDependencyKind;
      ifItFails: string;
    }>;
    parties: ReadonlyArray<{
      name: string;
      kind: BusinessRelationshipKind;
      partyKind: "organisation" | "individual";
      reason: string;
      /** The graph label, when the kind's default would misdescribe this party. */
      label?: BusinessRelationshipLabel;
    }>;
    legitSecrets: readonly string[];
    criminalSecrets: readonly string[];
    names: typeof SHARED_NAMES;
  }
> = {
  fantasy: {
    pressures: [
      "Charcoal and coal prices have doubled since the mine flooded.",
      "A new toll on the river road is cutting into every delivery.",
      "The guild has sent an inspector who is looking for a reason to close the workshop.",
      "Two apprentices have left for a rival house and taken the customer list with them.",
      "A fever has taken half the crew, and the busy season starts in a week.",
      "The landlord wants double the rent at the next quarter day.",
    ],
    assets: [
      "A water-powered hammer that no rival can afford to copy.",
      "A walled yard with a private well that never runs dry.",
      "A charter from the old king that exempts it from the market tax.",
      "A cellar of rare reagents bought at a bankrupt estate.",
      "A wagon fleet with a reputation for arriving on time in any weather.",
      "A ledger of every customer's debts, kept in a hand no one else can read.",
    ],
    opportunities: [
      "The garrison wants a standing contract for a season of supplies.",
      "A merchant consortium is buying up failing rivals and needs a local partner.",
      "A noble's funeral has created a sudden demand for fine work.",
      "A caravan route has reopened and needs an escort and a warehouse.",
      "The city is hiring a supplier for a public works project.",
      "An ailing rival is willing to sell its customer list for cash.",
    ],
    complications: [
      "A debt collector arrived this morning asking for the owner by name.",
      "A customer's cart went missing with a sealed package that was never meant for the business.",
      "A fire in the next street has left the shop without its usual supplier.",
      "A guild runner was found injured outside the back door.",
      "A magistrate has summoned the owner to explain a shipment that was never logged.",
      "A rival has spread a rumour that the goods are watered down.",
    ],
    dependencies: [
      {
        input: "Charcoal from the eastern mines",
        kind: "materials",
        ifItFails: "The forge goes cold within a week and every order slips.",
      },
      {
        input: "A licensed carter's guild",
        kind: "transport",
        ifItFails:
          "Deliveries stop, and the premises lose their regular custom.",
      },
      {
        input: "Journeymen who know the older techniques",
        kind: "labour",
        ifItFails: "Quality drops and the best orders go to a rival.",
      },
      {
        input: "The guild's trading licence",
        kind: "licence",
        ifItFails: "The business may not sell in the market square at all.",
      },
      {
        input: "A priest's blessing for the healing salves",
        kind: "magic",
        ifItFails: "Customers stop trusting the product and sales fall away.",
      },
      {
        input: "A patron's protection at court",
        kind: "protection",
        ifItFails: "The first rival with a grudge can close the doors.",
      },
    ],
    parties: [
      {
        name: "The Crown Dispatch Company",
        kind: "competitor",
        partyKind: "organisation",
        reason: "Wants the business bought out or discredited.",
      },
      {
        name: "The Guild of Ashes",
        kind: "regulator",
        partyKind: "organisation",
        reason: "Licenses every forge and can revoke the licence.",
      },
      {
        name: "Lady Orla Penhallow",
        kind: "patron",
        partyKind: "individual",
        reason: "Pays for work in advance and expects discretion.",
      },
      {
        name: "The Saltmarsh Gang",
        kind: "criminal",
        partyKind: "organisation",
        reason: "Collects a quiet fee for keeping the carts moving.",
        label: "protected by",
      },
      {
        name: "Hob Grennick",
        kind: "supplier",
        partyKind: "individual",
        reason: "Sells charcoal below market and asks no questions.",
      },
      {
        name: "The Weavers' Hall",
        kind: "neighbour",
        partyKind: "organisation",
        reason: "Shares the yard and resents every late delivery.",
      },
    ],
    legitSecrets: SHARED_LEGIT_SECRETS,
    criminalSecrets: SHARED_CRIMINAL_SECRETS,
    names: SHARED_NAMES,
  },
  scifi: {
    pressures: [
      "A docking fee hike at the orbital port has doubled overheads overnight.",
      "A hull breach in the last shipment means the insurer is refusing claims.",
      "A licensing board is auditing the cargo manifests this quarter.",
      "A rival fleet has undercut every standard rate on the main route.",
      "Life support on the one working ship needs a part that is out of stock.",
      "A crew member has gone missing with the only copy of the route charts.",
    ],
    assets: [
      "A dry dock with its own fabrication shop and a rare certified welder.",
      "A long-range transponder that sends and receives on a restricted band.",
      "A licensed contract with the colony's medical service.",
      "A warehouse on a shadowed moon that no inspector has ever mapped.",
      "A fleet of old freighters that are cheap to run and hard to track.",
      "A proprietary decoder for old navigation beacons.",
    ],
    opportunities: [
      "A mining consortium needs a freight partner for a six-month contract.",
      "A colony has sent an urgent request for medical supply runs.",
      "A rival has gone bankrupt and its docking slot is up for auction.",
      "A research station wants an escorted delivery through contested space.",
      "The port authority is handing out a grant for green hull refits.",
      "A passenger line has lost its maintenance contract and needs cover.",
    ],
    complications: [
      "A customs cutter is holding a manifest that does not match the cargo.",
      "A client's ship arrived with its crew sick and no one to treat them.",
      "A sensor glitch has put the next launch window in doubt.",
      "A union representative has demanded a meeting before the next shift.",
      "A stowaway was found in a cargo pod and claims to have been hired.",
      "The main airlock failed during a routine inspection.",
    ],
    dependencies: [
      {
        input: "Refined fuel from the orbital refinery",
        kind: "materials",
        ifItFails: "Ships stay grounded and contracts are forfeited.",
      },
      {
        input: "A certified pilot pool",
        kind: "labour",
        ifItFails: "Routes stop, and the fleet sits idle at the dock.",
      },
      {
        input: "Trade lane clearance from the port authority",
        kind: "licence",
        ifItFails:
          "Every departure needs a manual inspection, and the schedule collapses.",
      },
      {
        input: "A shared navigation data feed",
        kind: "data",
        ifItFails: "Ships fly blind on the outer lanes and insurance is void.",
      },
      {
        input: "A mining cartel's ore contracts",
        kind: "finance",
        ifItFails: "The cash flow dries up within a quarter.",
      },
      {
        input: "A private security escort",
        kind: "protection",
        ifItFails: "Pirates will take the next cargo unprotected.",
      },
    ],
    parties: [
      {
        name: "Orbital Freight Consortium",
        kind: "competitor",
        partyKind: "organisation",
        reason: "Runs the same lanes at a lower margin.",
      },
      {
        name: "Port Authority Customs",
        kind: "regulator",
        partyKind: "organisation",
        reason: "Inspects every manifest and sets the licence terms.",
      },
      {
        name: "Admiral Yuen Sato",
        kind: "patron",
        partyKind: "individual",
        reason: "Gives the business its contracts in exchange for favours.",
      },
      {
        name: "The Belt Syndicate",
        kind: "criminal",
        partyKind: "organisation",
        reason:
          "Takes a share of anything that passes through the outer lanes.",
        label: "owes",
      },
      {
        name: "Kessa Dran",
        kind: "supplier",
        partyKind: "individual",
        reason: "Sells surplus parts from a salvaged hulk.",
      },
      {
        name: "The Dockside Workers' Union",
        kind: "neighbour",
        partyKind: "organisation",
        reason: "Shares the berth and watches every shift.",
      },
    ],
    legitSecrets: SHARED_LEGIT_SECRETS,
    criminalSecrets: SHARED_CRIMINAL_SECRETS,
    names: SHARED_NAMES,
  },
  cyberpunk: {
    pressures: [
      "A corporate audit has flagged three of the shop's accounts for review.",
      "A rival clinic is offering the same implants for half the price.",
      "A gang has started charging the street protection fee again.",
      "The city's power grid failed, and the backup generators are running low.",
      "A key supplier was seized by the city's corporate security.",
      "Your best technician has taken a job across town and left no handover.",
    ],
    assets: [
      "A back room with clean surgical kit and no registered serial numbers.",
      "A data node that routes traffic through three dead relays.",
      "A licensed corporate contract that nobody else in the district can get.",
      "A rooftop garden that grows the only clean water filter in the block.",
      "A fleet of unmarked vans with fresh plates every month.",
      "A signal jammer that keeps the owner's shop off the city's sensors.",
    ],
    opportunities: [
      "A corporate exec needs quiet work done before a board meeting.",
      "A rival gang's territory has collapsed and the street is up for grabs.",
      "A new arcology is hiring a regular supplier of street-level services.",
      "A courier job has come in with a very generous, very vague brief.",
      "A grey-market buyer wants a bulk order delivered by the weekend.",
      "The city council has opened a tender for public repair contracts.",
    ],
    complications: [
      "A corporate drone followed a delivery back to the front door.",
      "A client's implant failed mid-procedure and the family is threatening a lawsuit.",
      "Someone has leaked the shop's client list to a news feed.",
      "Police raided the next building and the shop's stock is in the wrong place.",
      "A courier went silent with the package still in his bag.",
      "The power bill is overdue and the district meter has been cut.",
    ],
    dependencies: [
      {
        input: "Black-clinic-grade replacement parts",
        kind: "materials",
        ifItFails: "Repairs stop and the regulars go elsewhere.",
      },
      {
        input: "Freelance couriers who ride the old tunnels",
        kind: "transport",
        ifItFails: "Deliveries get seen by the drones and the cargo is lost.",
      },
      {
        input: "A licensed medic willing to sign off the work",
        kind: "licence",
        ifItFails: "Every procedure becomes a liability the shop cannot carry.",
      },
      {
        input: "A neural data feed from the city network",
        kind: "data",
        ifItFails: "The diagnostics go blind and the shop cannot price a job.",
      },
      {
        input: "A loan shark who covers the rent",
        kind: "finance",
        ifItFails: "The shutters go down within the month.",
      },
      {
        input: "A gang's guarantee of safe passage",
        kind: "protection",
        ifItFails: "The first crew with a grudge can burn the front down.",
      },
    ],
    parties: [
      {
        name: "Helix Medical Corp",
        kind: "competitor",
        partyKind: "organisation",
        reason:
          "Sells sanctioned implants at a premium and wants this block closed.",
      },
      {
        name: "District Health Board",
        kind: "regulator",
        partyKind: "organisation",
        reason: "Inspects every procedure and can pull the licence.",
      },
      {
        name: "Vesna Crowl",
        kind: "patron",
        partyKind: "individual",
        reason: "Pays well for discreet work and never signs a contract.",
      },
      {
        name: "The Wire Saints",
        kind: "criminal",
        partyKind: "organisation",
        reason: "Runs the streets and expects a cut of every sale.",
        label: "owes",
      },
      {
        name: "Dev Tanaka",
        kind: "supplier",
        partyKind: "individual",
        reason: "Sells salvaged parts from a dead factory.",
      },
      {
        name: "The Night Market Vendors",
        kind: "neighbour",
        partyKind: "organisation",
        reason: "Share the alley and report every visitor to the police.",
      },
    ],
    legitSecrets: SHARED_LEGIT_SECRETS,
    criminalSecrets: SHARED_CRIMINAL_SECRETS,
    names: SHARED_NAMES,
  },
  modern: {
    pressures: [
      "The landlord has served notice and wants the building cleared by spring.",
      "A chain store across the road is undercutting every price on the menu.",
      "A health inspection is due and the kitchen has a known problem.",
      "A supplier has stopped answering the phone and a delivery is overdue.",
      "The bank has frozen the credit line until the accounts are straightened out.",
      "A former employee is posting angry reviews every night.",
    ],
    assets: [
      "A lease on the corner unit with a loyal regular customer base.",
      "A van with a loyal driver who knows every shortcut in the city.",
      "A stock of rare collectibles bought cheaply at an estate sale.",
      "A small loyal following built over two decades on the same street.",
      "A licence to sell in the market hall that new traders cannot get.",
      "A backroom computer with records nobody else has bothered to back up.",
    ],
    opportunities: [
      "A local council is hiring a supplier for its public events.",
      "A film crew needs a location and a steady stream of props.",
      "A failing competitor is selling its equipment and client list.",
      "A corporate office has offered a standing contract for weekly service.",
      "A festival committee wants a sponsor for the summer weekend.",
      "A new housing estate is opening and needs a neighbourhood service.",
    ],
    complications: [
      "A regular customer has not paid for a month and is now avoiding the shop.",
      "A complaint has gone viral and the owner is being named in it.",
      "A delivery van was impounded for a missing permit.",
      "A tenant upstairs is threatening to sue over a water leak.",
      "The card terminal has been hacked and customer data may be exposed.",
      "A journalist is asking about a missing payment from last year.",
    ],
    dependencies: [
      {
        input: "A reliable wholesale supplier",
        kind: "materials",
        ifItFails: "The shelves empty and regulars drift to the chain store.",
      },
      {
        input: "A dependable delivery driver",
        kind: "transport",
        ifItFails: "Orders go out late and the reviews turn sour.",
      },
      {
        input: "A qualified tradesperson for the licence renewal",
        kind: "licence",
        ifItFails:
          "The business cannot legally trade until the renewal is done.",
      },
      {
        input: "The card processing service",
        kind: "data",
        ifItFails: "Sales stop and the owner's cash flow dies within days.",
      },
      {
        input: "A bank overdraft facility",
        kind: "finance",
        ifItFails: "Payroll cannot be met and staff walk out.",
      },
      {
        input: "The local councillor's goodwill",
        kind: "protection",
        ifItFails: "Every inspection becomes slow and expensive.",
      },
    ],
    parties: [
      {
        name: "Fresh Corner Grocers",
        kind: "competitor",
        partyKind: "organisation",
        reason: "Undercuts every price and runs a loyalty card.",
      },
      {
        name: "City Trading Standards",
        kind: "regulator",
        partyKind: "organisation",
        reason: "Inspects labelling and can close the shop.",
      },
      {
        name: "Councillor Ruth Adeyemi",
        kind: "patron",
        partyKind: "individual",
        reason: "Steers council contracts the business's way.",
      },
      {
        name: "The Nightwatch Collectors",
        kind: "criminal",
        partyKind: "organisation",
        reason: "Chases debts on behalf of a lender the owner once used.",
        label: "owes",
      },
      {
        name: "Sam Okoro",
        kind: "supplier",
        partyKind: "individual",
        reason: "Sells stock at a discount through a private arrangement.",
      },
      {
        name: "The Parade Street Traders' Group",
        kind: "neighbour",
        partyKind: "organisation",
        reason: "Shares the car park and argues about it weekly.",
      },
    ],
    legitSecrets: SHARED_LEGIT_SECRETS,
    criminalSecrets: SHARED_CRIMINAL_SECRETS,
    names: SHARED_NAMES,
  },
  horror: {
    pressures: [
      "The parish has stopped sending bodies and the reserve of coffins is running dry.",
      "Two guests have not checked out and their rooms have been locked from inside.",
      "A rival has started offering cheap rites that the family says do not work.",
      "The town watch wants an inquest into the last three burials.",
      "A landlord's agent is pressing for the house to be emptied by the new moon.",
      "The stock of blessed candles has been stolen from the back store.",
    ],
    assets: [
      "A cellar with a cold store that keeps bodies for a week without ice.",
      "A library of parish registers that no one else has permission to read.",
      "A chapel with a bell that the town has agreed never to ring.",
      "A set of silver tools blessed by a priest who never came back.",
      "A sealed room in the attic that the owners say is for storage.",
      "A rare grimoire bought from an estate sale, its pages still uncut.",
    ],
    opportunities: [
      "A wealthy family's mourning is about to begin and they need the best service.",
      "A distant relative has inherited the building and wants it sold quickly.",
      "A research society offers a standing fee for any unusual remains.",
      "The town council is paying for a clean-up of the old plague pits.",
      "A travelling troupe needs a safe place to store its stage props.",
      "A bishop's office is looking for a discreet supplier for its records.",
    ],
    complications: [
      "A guest has arrived with a letter that names one of the family.",
      "A body was returned to the wrong house and the family is furious.",
      "The night bell rang on its own and two lodgers have packed their trunks.",
      "The watch has come to ask about a missing child from the last funeral.",
      "A dog has refused to enter the cellar for three nights running.",
      "A mourner collapsed during the service and is now asking for the owner.",
    ],
    dependencies: [
      {
        input: "Blessed oils and salts from the cathedral",
        kind: "magic",
        ifItFails: "The rites are unwanted and the families look elsewhere.",
      },
      {
        input: "Gravediggers who will work at night",
        kind: "labour",
        ifItFails: "Burials stop and the cellar fills up.",
      },
      {
        input: "A licence from the parish registrar",
        kind: "licence",
        ifItFails:
          "Every burial becomes a legal question the owner cannot answer.",
      },
      {
        input: "The parish register and its records",
        kind: "data",
        ifItFails:
          "No one can prove who is buried where, and the families sue.",
      },
      {
        input: "A moneylender who holds the deeds",
        kind: "finance",
        ifItFails: "The house is taken for debt within the season.",
      },
      {
        input: "A cathedral chaplain who vouches for the trade",
        kind: "protection",
        ifItFails: "The town turns on the house at the first bad night.",
      },
    ],
    parties: [
      {
        name: "The Silver Lantern Undertakers",
        kind: "competitor",
        partyKind: "organisation",
        reason: "Cheaper services and a better reputation with the gentry.",
      },
      {
        name: "The Parish Registrar's Office",
        kind: "regulator",
        partyKind: "organisation",
        reason: "Signs every burial licence and reads every record.",
      },
      {
        name: "Mrs Honora Vane",
        kind: "patron",
        partyKind: "individual",
        reason:
          "Pays for discreet burials and asks awkward questions about the cellar.",
      },
      {
        name: "The Ashfield Resurrection Men",
        kind: "criminal",
        partyKind: "organisation",
        reason:
          "Sells bodies to the anatomists and expects the house to look away.",
        label: "owes",
      },
      {
        name: "Father Anselm Crook",
        kind: "supplier",
        partyKind: "individual",
        reason:
          "Sells blessed oils at a markup and keeps the cellar's secrets.",
      },
      {
        name: "The Mourning Ribbon Mercers",
        kind: "neighbour",
        partyKind: "organisation",
        reason: "Share the lane and blame every bad night on the house.",
      },
    ],
    legitSecrets: SHARED_LEGIT_SECRETS,
    criminalSecrets: SHARED_CRIMINAL_SECRETS,
    names: SHARED_NAMES,
  },
  western: {
    pressures: [
      "The railroad survey has moved the line a mile away from the depot.",
      "Cattle buyers have stopped coming to town after the last drought.",
      "A bank examiner is looking at the ledgers this month.",
      "A feud over water rights has spilled into the street twice this week.",
      "The telegraph line is down and orders are piling up unanswered.",
      "A key wagon driver has quit for a claim in the hills.",
    ],
    assets: [
      "A stone warehouse with a reinforced roof that has never leaked.",
      "A string of mules that can cross the high pass in any weather.",
      "A franchise with the territory's only freight contract.",
      "A safe that the last owner left behind, its combination still unknown.",
      "A telegraph key and a direct line to the state capital.",
      "A corral of prize horses with papers that every buyer trusts.",
    ],
    opportunities: [
      "A mining company needs a freight contractor for next season's ore.",
      "A new town is forming on the river and wants a general store.",
      "A railway survey crew needs supplies and a bunk for the summer.",
      "A rancher is selling his herd cheap and his brand is up for grabs.",
      "The territory is offering a government contract for mail delivery.",
      "A rival outfit is pulling out of the valley and leaving its customers behind.",
    ],
    complications: [
      "A stage coach was robbed on the trail and the mail sacks are missing.",
      "A customer is claiming the goods were never delivered and wants a refund.",
      "A sheriff's deputy is asking who has been buying the new rifles.",
      "A wagon overturned in the river crossing and the cargo is ruined.",
      "A drover arrived with a bullet wound and no explanation.",
      "The bank has called in the note early and wants it paid this month.",
    ],
    dependencies: [
      {
        input: "Freight wagons and mules from the valley",
        kind: "transport",
        ifItFails: "Goods stop moving and the town runs short of everything.",
      },
      {
        input: "Experienced teamsters for the mountain road",
        kind: "labour",
        ifItFails: "The cargo waits at the depot until spring.",
      },
      {
        input: "A territorial trading permit",
        kind: "licence",
        ifItFails: "The store is shut down until the permit is renewed.",
      },
      {
        input: "The telegraph line for orders and prices",
        kind: "data",
        ifItFails: "Orders go stale and the best deals are lost to rivals.",
      },
      {
        input: "A bank loan for the autumn stock",
        kind: "finance",
        ifItFails: "The shelves stay empty through the harvest.",
      },
      {
        input: "The marshal's protection on the trail",
        kind: "protection",
        ifItFails: "Outlaws take the next wagon train without a fight.",
      },
    ],
    parties: [
      {
        name: "The Pinnacle Freight Line",
        kind: "competitor",
        partyKind: "organisation",
        reason: "Runs a faster route over the pass and wants the contract.",
      },
      {
        name: "The Territorial Land Office",
        kind: "regulator",
        partyKind: "organisation",
        reason: "Holds the permits and reviews every claim.",
      },
      {
        name: "Judge Amos Keller",
        kind: "patron",
        partyKind: "individual",
        reason: "Sends the business the court's freight in return for a share.",
      },
      {
        name: "The Red Butte Riders",
        kind: "criminal",
        partyKind: "organisation",
        reason: "Hold the pass and charge a toll on every wagon.",
        label: "owes",
      },
      {
        name: "Lena Whitcomb",
        kind: "supplier",
        partyKind: "individual",
        reason: "Buys pelts and sells supplies on the old trail.",
      },
      {
        name: "The Cattlemen's Association",
        kind: "neighbour",
        partyKind: "organisation",
        reason: "Share the stockyards and fight over every water right.",
      },
    ],
    legitSecrets: SHARED_LEGIT_SECRETS,
    criminalSecrets: SHARED_CRIMINAL_SECRETS,
    names: SHARED_NAMES,
  },
  pirate: {
    pressures: [
      "A navy patrol has been searching the harbour for three nights running.",
      "A rival chandlery has bought up every rope in the port.",
      "The harbourmaster is demanding a fee for every berth until the dredging is done.",
      "A crew has deserted with the advance payment and a valuable map.",
      "A storm damaged the stock store and the spoiled goods must be written off.",
      "A creditor has come to collect the loan on the ship's hull.",
    ],
    assets: [
      "A dry dock with a sheltered slip that no one else can book.",
      "A warehouse by the water with a hidden loading door.",
      "A ship's bell and papers from a famous merchant vessel.",
      "A charter from a neutral port that protects the cargo in the bay.",
      "A stock of the finest sail canvas in three harbours.",
      "A harbour pilot who knows every reef on the coast.",
    ],
    opportunities: [
      "A merchant fleet is short of crew and will pay a bonus for skilled hands.",
      "A privateer captain needs a fast sloop refitted before the next tide.",
      "The port is auctioning a bankrupt rival's warehouse and berth.",
      "A governor's household is ordering a yacht and wants a discreet builder.",
      "A convoy needs a victualler to fill its stores before the long crossing.",
      "A new settlement across the bay needs regular supply runs.",
    ],
    complications: [
      "A ship's cargo came ashore with the wrong markings on every crate.",
      "A crew member has been arrested in the next port and names the owner.",
      "A fire broke out in the rigging loft during the night.",
      "A customs boat is tying up at the quay and asking for the manifests.",
      "A fishing fleet has blocked the channel and wants compensation.",
      "A rival has offered the crew double pay to switch ships.",
    ],
    dependencies: [
      {
        input: "Good hemp and tarred rope from the inland mills",
        kind: "materials",
        ifItFails: "Ships cannot be fitted out and the orders slip.",
      },
      {
        input: "A harbour pilot for the reef passage",
        kind: "transport",
        ifItFails: "Vessels run aground on the reefs.",
      },
      {
        input: "A port licence to victual ships",
        kind: "licence",
        ifItFails: "The chandlery is shut and the ships sail elsewhere.",
      },
      {
        input: "A ledger of tides and harbour dues",
        kind: "data",
        ifItFails: "Every arrival is a gamble and the fees are paid twice.",
      },
      {
        input: "A moneylender who will carry the stock",
        kind: "finance",
        ifItFails:
          "The yard cannot meet its wage bill at the end of the month.",
      },
      {
        input: "A governor's favour in the harbour office",
        kind: "protection",
        ifItFails: "Every inspection becomes a shakedown.",
      },
    ],
    parties: [
      {
        name: "The Sable Anchor Chandlery",
        kind: "competitor",
        partyKind: "organisation",
        reason: "Under-sells every rope and sail in the port.",
      },
      {
        name: "The Harbour Office",
        kind: "regulator",
        partyKind: "organisation",
        reason: "Sets the berth fees and signs the sailing papers.",
      },
      {
        name: "Captain Idris Vale",
        kind: "patron",
        partyKind: "individual",
        reason: "Brings a steady stream of refits and pays in advance.",
      },
      {
        name: "The Black Tern Crew",
        kind: "criminal",
        partyKind: "organisation",
        reason:
          "Runs contraband through the back channel and wants a quiet berth.",
        label: "serves",
      },
      {
        name: "Nell Harrow",
        kind: "supplier",
        partyKind: "individual",
        reason: "Sells salvaged timber from wrecks.",
      },
      {
        name: "The Fishers' Guild",
        kind: "neighbour",
        partyKind: "organisation",
        reason: "Share the quay and complain about every late tide.",
      },
    ],
    legitSecrets: SHARED_LEGIT_SECRETS,
    criminalSecrets: SHARED_CRIMINAL_SECRETS,
    names: SHARED_NAMES,
  },
};

/** Generic pools shared by every genre group. */
export const GENERIC_POOLS = {
  nameAdjectives: [
    "Brass",
    "Iron",
    "Silver",
    "Gilded",
    "Copper",
    "Quiet",
    "Crooked",
    "Honest",
    "Red",
    "Grey",
  ],
  nameNouns: [
    "Finch",
    "Anvil",
    "Lantern",
    "Compass",
    "Kettle",
    "Crow",
    "Hearth",
    "Ledger",
    "Wren",
    "Mill",
  ],
  reputations: [
    "Respected and a little expensive.",
    "Cheap, cheerful and never on time.",
    "Exclusive; you have to be recommended to get in.",
    "Shady in the eyes of the guild, but everyone uses it.",
    "Politically connected, and it shows.",
    "Unreliable on a bad week, indispensable on a good one.",
    "Notorious for the one job that went badly wrong.",
    "Fashionable with the young and the restless.",
  ],
  reputationConsequences: [
    "Rivals quote lower prices to win the regulars back.",
    "Strangers come in only on a recommendation, which opens doors and closes others.",
    "The guild gives it the first look at new licences, and the rivals resent it.",
    "Customers pay in advance, so the cash flow is steady but the margin is thin.",
    "Inspectors visit more often, which costs time but keeps the place clean.",
    "Anyone seen leaving the back door is quickly gossiped about across the district.",
  ],
  providesTemplates: [
    "The {type} does its core work for anyone who can pay the right price.",
    "The {type} takes on jobs that the bigger houses turn away.",
    "The {type} is the first place people go when something has gone wrong.",
    "The {type} runs a steady trade in ordinary work, with a few specialist jobs.",
    "The {type} is known for doing it properly, even when no one checks.",
    "The {type} fills the gap between the big houses and the back alleys.",
  ],
  whyHereTemplates: [
    "It sits where the trade passes through {location}, so custom finds it without effort.",
    "Rents are cheap here and the neighbours are used to a steady stream of visitors.",
    "The owners grew up nearby, and the regulars have known them for years.",
    "It was the only empty building with a yard large enough for the work.",
    "It is the first stop for anyone heading out of the district.",
    "The building came cheap and the owners have never moved since.",
  ],
  mainIncomeTemplates: [
    "Regular repeat work for a small set of loyal customers.",
    "A few large contracts a year, paid late but reliably.",
    "Walk-in trade, paid on the spot and steady through the season.",
    "A standing retainer from one dependable client.",
    "Subscriptions from a handful of loyal households.",
    "Commission on every job brought in by a trusted middleman.",
  ],
  leaderPressures: [
    "Owes money to a lender and hides it from the family.",
    "Recently lost a partner and does not talk about it.",
    "Health is failing, and no successor has been chosen.",
    "Gambling debts have tempted the owner toward a bad deal.",
    "A rival from the old days is back in town asking questions.",
    "Drinks more than anyone knows, and is starting to slip.",
  ],
  modelTemplates: [
    "It earns on a steady margin from regular work, and owns what it sells.",
    "It earns a fee for arranging and carrying other people's goods, and owns none of them.",
    "It buys in, adds its own work or markup, and sells on to regular customers.",
    "It works to order for a few large clients and bills when the job is done.",
    "It earns a little from many small customers and a lot from one or two large ones.",
    "It rents out what it owns and takes a fee for looking after it.",
  ],
  // By scale, so the wording never contradicts the staff roster (0 to 1 key
  // staff for tiny, 1 to 2 small, 2 to 3 established, 3 to 4 regional/major).
  sizeTemplates: {
    tiny: [
      "One cramped premises, the owner, and casual help when work comes in.",
      "A stall or back room, with the owner doing most of the work and friends lending a hand.",
      "A single room and a cart, run by the owner with day labour as needed.",
    ],
    small: [
      "A single premises with a yard or store, the owner, and a small permanent crew.",
      "One building, a couple of regular staff, and a few part-timers in busy seasons.",
      "A small outfit: the owner, a few staff, and borrowed space for the overflow.",
    ],
    established: [
      "A modest operation: one main site, a few vehicles or tools, and a loyal core of workers.",
      "A well-known name in its district, with two sites and more work than hands.",
      "A steady concern with its own premises, a dependable crew and a waiting list of customers.",
    ],
    regional: [
      "A mid-sized concern with several crews, its own store, and a reputation beyond the district.",
      "Several sites across the region, a sizeable crew and its own transport.",
      "A busy enterprise with a head office, working yards and agents in neighbouring towns.",
    ],
    major: [
      "A large enterprise with many sites, its own fleet and a payroll the district depends on.",
      "A household name across the region, with crews, warehouses and a board that argues about all of it.",
      "A sprawling concern whose offices, yards and agents reach well beyond the home district.",
    ],
  } as Record<
    "tiny" | "small" | "established" | "regional" | "major",
    string[]
  >,
  positionTemplates: [
    "Profitable in ordinary seasons, but short of ready cash right now.",
    "Comfortable on paper, though one bad month would change that.",
    "Barely breaking even, and hiding it from customers.",
    "Doing well, and starting to attract the wrong kind of attention.",
    "Solvent, but carrying a debt that grows every quarter.",
    "Recovering from a bad year, with its best customers still loyal.",
  ],
  leaderGoals: [
    "Keep the business in the family and pass it on intact.",
    "Get out from under the debt before the next inspection.",
    "Prove the business can grow beyond the district.",
    "Buy out the partner who wants to sell up.",
    "Make the place safe for the people who depend on it.",
    "Win the approval of the guild or council before retiring.",
  ],
  leaderStyles: [
    "Hands-on and the first in each morning.",
    "Delegates everything and checks every ledger at night.",
    "Warm with customers, ruthless with suppliers.",
    "Cautious, forever asking for a second opinion.",
    "Charming in public, and sharp when the books are closed.",
    "Leads by example and expects the same of everyone.",
    "Keeps the books personally and trusts no one with the cash.",
  ],
  leaderTraits: [
    "Stubborn and proud of it.",
    "Generous to a fault, which keeps being exploited.",
    "Quick with a joke and slow to forgive.",
    "Loyal to staff and suspicious of everyone else.",
    "Ambitious, and hiding how tired they are.",
    "Honest to a fault, which makes some clients nervous.",
  ],
  staffRoles: [
    "Trusted specialist",
    "Overworked employee",
    "Ambitious deputy",
    "Unreliable hire",
    "Bookkeeper",
    "Security and muscle",
    "Apprentice",
    "Family member",
  ],
  staffGoals: [
    "Learn the trade well enough to open their own shop.",
    "Earn enough to send money home each month.",
    "Stay out of trouble and keep the job.",
    "Pay off a private debt before the next season.",
    "Prove themselves to the owner.",
    "Earn a bit more each year than the year before.",
    "Win a place in a better shop across the city.",
  ],
  staffTraits: [
    "Quick hands and a sharp eye for quality.",
    "Knows every customer by name and their debts too.",
    "Dependable, but drinks a little more than is wise.",
    "Brilliant at planning, hopeless at selling.",
    "Keeps the books clean and the gossip close.",
    "Nervous around strangers, fearless with a rival.",
  ],
  clienteleTypical: [
    "Local people with regular errands.",
    "Traders who need something fixed, moved or sold quickly.",
    "Families who come back every season.",
    "Passing travellers who want a fair price.",
    "Neighbours who trust the place and nothing else.",
    "Workers from the nearby yards.",
    "Anyone with a problem that needs an honest answer.",
  ],
  clienteleValuable: [
    "A few big accounts that pay well and expect discretion.",
    "The local council, when it has a budget to spend.",
    "A wealthy patron who sends work through a steward.",
    "Guild members who bring their friends.",
    "The garrison or the watch, when the money is there.",
    "Outsiders with money who need a local guide.",
    "A steady account from a nearby merchant house.",
  ],
  clienteleUndesirable: [
    "Customers who pay late and complain about it.",
    "People who arrive drunk and leave in a fight.",
    "Anyone who wants a receipt for something that never happened.",
    "Rivals sent in to look for weaknesses.",
    "Debt collectors who come to the counter, not the back door.",
    "Anyone who starts a fight over the price.",
    "People who come back only to complain.",
  ],
  clienteleExcluded: [
    "Known thieves and anyone who has robbed the place before.",
    "Guild inspectors on a bad day.",
    "Anyone who insists on paying in cash without a receipt.",
    "Rival traders looking to copy the work.",
    "Anyone the owner has caught cheating before.",
    "Customers still owing money from an earlier visit.",
  ],
  mgmtStrengths: [
    "A crew that stays through hard seasons.",
    "A reputation for fair dealing in the district.",
    "Good relations with the local carters.",
    "A loyal core of regular customers.",
    "Strong word of mouth in the district.",
    "Reliable access to the trade they need.",
  ],
  mgmtLiabilities: [
    "The premises need repairs that nobody has budgeted for.",
    "One key supplier is unreliable and everyone knows it.",
    "Staffing is thin for the busy season.",
    "A guild dispute is still open and could resurface.",
    "Too much of the work rests on one person.",
    "The ledgers are behind and the owner knows it.",
  ],
  mgmtUpgrades: [
    "Better premises with a secure storeroom.",
    "A second worker trained to cover the busy season.",
    "A dedicated route for deliveries across the district.",
    "A small showroom to win new clients from the high street.",
    "A bigger workshop next door, if the lease can be bought.",
    "Better tools bought from a retiring craftsman.",
  ],
  mgmtObligations: [
    "Payroll for the crew",
    "Rent on the premises",
    "Guild dues",
    "Repayment of the start-up loan",
    "Licences and inspections",
    "Supplier contracts",
  ],
  mgmtSuccess: [
    "Stronger rivals who want the market for themselves.",
    "The guild taking a closer interest in the trade.",
    "Criminal groups offering protection in return for a cut.",
    "Larger clients who expect faster, bigger work.",
    "New expansion opportunities across the district.",
    "A need to hire more people than the owner can vet.",
  ],
} as const;
