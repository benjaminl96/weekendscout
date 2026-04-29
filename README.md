# Weekend Scout

A web app for seeing Google Calendar events that fall on the long-weekend window: Friday through Monday.

The core question is:

> When do we have a free weekend to plan something?

## Product Goals

- Show upcoming Friday-through-Monday weekend blocks at a glance.
- Pull data from the signed-in person's Google Calendar account.
- Include calendars shared with that person, not only their primary calendar.
- Make it easy to spot free weekends, busy weekends, weddings, trips, birthdays, and other planning anchors.
- Start read-only, while keeping the architecture open for creating or editing Google Calendar events later.

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- Google Identity Services OAuth
- Google Calendar API

## License

Copyright (c) 2026 Benjamin Lee. All rights reserved.

This repository is public for visibility and development, but it is not currently
open source. A more permissive license can be chosen later if that becomes the
right product decision.

## Local Development

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in a Google OAuth browser client ID when wiring real calendar data.

## Calendar Approach

The first production version should:

- Sign in with Google in the browser.
- Request calendar access from the user.
- Fetch the user's calendar list.
- Fetch events across the visible/selected calendars.
- Group events into Friday-through-Monday weekend blocks.

For v1, the app can request read-only access. Later, event creation/editing can use broader Google Calendar scopes without adding a custom backend.
