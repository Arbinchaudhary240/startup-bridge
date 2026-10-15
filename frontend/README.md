# StartupBridge frontend

React and Vite frontend for the Django REST API.

## Run locally

From this directory, run `npm install`, then `npm run dev`. The API defaults to
`http://localhost:8000/api`; set `VITE_API_BASE_URL` when the API uses another
origin. The API must use HTTPS when the website is served over HTTPS.

## Pages

- `/` — landing page and role-specific process guide
- `/startups` — startup discovery for signed-in users; sponsors see startups in their country, other roles see all countries
- `/startups/:startupId` — startup details and connection request
- `/login` and `/register` — account access
- `/dashboard` — startup listings and sent/received connection requests
- `/profile` — edit bio, skills, and organization
- `/startups/new` and `/startups/:startupId/edit` — publish or update a startup
- Unknown routes show a not-found page instead of silently redirecting home

Startup discovery and details require sign-in. Sponsor accounts see startups
from their registered country, using the founder's country as the startup's
country for this MVP. Founders, Founder-and-Sponsor accounts, developers, and
mentors can discover startups across countries. The API enforces the sponsor
country restriction for listings, details, and connection requests. Session
tokens are stored for the current browser tab.

The landing hero fills at least the visible viewport below the navigation.
Startup discovery uses server-side search and stage filters, with six startups
per API page and Previous/Next controls. Founders publish an idea using its
title, problem, solution, and founder-selected stage (Idea, Development, or
Completed). Idea and Development listings welcome developers, mentors, and
sponsors; Completed listings welcome sponsors. Connection requests include
one or more interest types and a required note to the founder (up to 300
words). After the founder accepts a request, both people can exchange messages
from the workspace conversation section. StartupBridge facilitates the
introduction; collaboration and project tracking happen outside the platform.
Accepted-connection conversations include an optional shortcut to create a
Google Meet and a suggested invitation message; users share the generated Meet
link in chat themselves.
Workspace startup listings and sent/received connections use user-scoped,
server-paginated API filters.

Startup titles are limited to 12 words, while problem and solution descriptions
are limited to 100 words each. Discovery cards clamp the title and descriptions
to keep their height manageable; selecting a card or its “Read full idea” link
opens the complete startup detail page.

List APIs return the Django REST Framework page-number format (`count`, `next`,
`previous`, and `results`). The API defaults to 20 results per page and accepts
`page_size` up to 100; the frontend requests six results per page. Expired
access tokens are refreshed automatically while the tab-scoped refresh token
remains valid (seven days).
