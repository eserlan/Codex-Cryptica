/** Runtime seams for the Cloudflare Worker boundary. */
export interface Clock {
  now(): number;
}

export interface IdGenerator {
  uuid(): string;
}

export const systemClock: Clock = {
  now: () => Date.now(),
};

export const systemIdGenerator: IdGenerator = {
  uuid: () => crypto.randomUUID(),
};
