# StartupBridge frontend

The StartupBridge web app helps founders share startup ideas and connect with
potential sponsors, developers, and mentors. It is built with React and Vite
and uses the Django API in the repository root.

For backend setup, database configuration, and deployment settings, see the
[backend README](../README.md).

## Getting started

### Requirements

- Node.js and npm
- The StartupBridge API running locally, unless you are connecting to another
  API environment

Install dependencies and start the Vite development server:

```bash
npm install
npm run dev
```

By default, the frontend expects the API at `http://localhost:8000/api`. Start
the Django backend before signing in or loading API-backed pages.

To use a different API origin, create a `.env.local` file in this directory:

```dotenv
VITE_API_BASE_URL=http://localhost:8000/api
```

Set this to the full API base URL, including `/api`. When serving the frontend
over HTTPS, the API must also use HTTPS.

## App pages

| Path | Description |
| --- | --- |
| `/` | Landing page and role-specific guide |
| `/login` | Sign in |
| `/register` | Create an account |
| `/startups` | Search and browse startup ideas |
| `/startups/:startupId` | View a startup and send a connection request |
| `/dashboard` | Manage startup listings, connection requests, and conversations |
| `/profile` | Edit profile bio, skills, and organization |
| `/startups/new` | Publish a startup idea |
| `/startups/:startupId/edit` | Update one of your startup listings |

Unknown paths show a not-found page. Startup discovery, details, and workspace
pages require sign-in.

## Collaboration flow

1. A founder publishes an idea with its title, problem, solution, and stage.
2. A sponsor, developer, or mentor discovers an idea and submits a connection
   request with one or more interests and a message.
3. The founder accepts or rejects the request from the dashboard.
4. Once accepted, both participants can exchange messages in the dashboard
   conversation.

Idea and Development listings can receive developer, mentor, and sponsor
interests. Completed listings accept sponsor interest only. Sponsors see
listings and may connect only within their registered country; the MVP uses the
founder's country as the startup's country.

## Dashboard and discovery behavior

- Discovery uses server-side text search and stage filters, with six startups
  per page.
- Dashboard ideas, sent requests, received requests, and accepted conversations
  are shown in fixed-size, scrollable cards. Lists show newest items first.
- Dashboard idea and request lists use server pagination and request up to 100
  items per page.
- Startup titles are limited to 12 words. Problem and solution descriptions
  allow up to 100 words each. Connection messages allow up to 300 words.
- Selecting a discovery card opens the full startup detail page.
- An accepted conversation optionally offers a Google Meet shortcut and a
  suggested invitation message. Participants share the Meet link in chat.

StartupBridge facilitates introductions; collaboration and project tracking
happen outside the platform.

## Authentication and API

The frontend communicates with the Django API using JSON and JWT bearer
tokens. Access and refresh tokens are stored in `sessionStorage`, scoped to the
current browser tab. Expired access tokens are refreshed automatically while
the refresh token is valid; signing out clears the tokens from that tab.

The API uses Django REST Framework page-number responses:
`count`, `next`, `previous`, and `results`. Its default page size is 20, with a
maximum of 100.

## Development scripts

```bash
npm run dev      # Start the local development server
npm run lint     # Run ESLint
npm run build    # Create a production build in dist/
npm run preview  # Preview the production build locally
```
