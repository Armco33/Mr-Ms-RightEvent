export type Prefs = {
  city: string;
  distanceMiles: number;
  vibe: string;
  type: "tech" | "entrepreneurship" | "hobby" | "coffee";
  price: "free" | "paid";
  email: string;
};

export type EventCard = {
  id: string;
  title: string;
  start: string;
  venue: string;
  city: string;
  image: string;
  url: string;
  organizer: string;
  free: boolean;
};

export type EventsResponse = {
  source: "live" | "fallback";
  events: EventCard[];
};