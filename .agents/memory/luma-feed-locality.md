---
name: Luma feed locality
description: How city defaults should be applied when combining Luma event feeds.
---

Only apply Taipei as an implicit city to events scraped from the dedicated `/taipei` listing. General `discover` and `tech` feeds are global and must carry their own location data to qualify for Taipei filtering.

**Why:** General Luma feeds returned events from other cities when they were treated as Taipei by default.

**How to apply:** When adding a Luma feed, first determine whether it is city-scoped. Only city-scoped feeds may supply a default event location.