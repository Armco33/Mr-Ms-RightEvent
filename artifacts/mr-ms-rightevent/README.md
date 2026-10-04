# Mr-Ms-RightEvent

A three-screen Taipei event-discovery demo guided by Co-Parrot. It uses session storage for the demo flow, has no authentication or database, and reads public event listings from Luma with local fallback data.

## Run

From the project root:

```sh
pnpm --filter @workspace/mr-ms-rightevent run dev
```

The managed Replit workflow provides the app port and base path.

## Event scraper

`app/api/events/route.ts` fetches the public Taipei Luma page server-side, parses its `__NEXT_DATA__` when available, and falls back to public event-card links and page metadata. If it finds fewer than ten free Taipei events, it checks the public discover and tech pages. Results are deduplicated, cached in memory for ten minutes, and returned as `{ source, events }`.

If scraping fails or returns fewer than ten matching events, the endpoint serves the ten demo events in `data/events.json`. The UI shows whether the API response came from live scraping or fallback data while running in development.

## Production notice

Demo only: scraping may violate Luma's terms; replace with the official API for production.