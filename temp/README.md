# Project 3: Moonwake Tea Atelier Web POS

`project3` is a customer-facing web POS inspired by the existing Java GUI cashier flow in this repository.

It reimagines the original desktop system as a hosted SaaS-style ordering experience with:

- a React storefront for customers
- an Express.js backend API
- a PostgreSQL schema designed for the TAMU AWS database
- accessible ordering and checkout interactions

## Concept

The imaginary vendor for this project is **Moonwake Tea Atelier**, a late-night bubble tea studio with a tidal/ocean-inspired brand.

The design takes inspiration from the current GUI POS by preserving:

- category-based browsing
- drink customization
- topping selection
- cart and order summary flow

It expands the experience by adding:

- a mobile-friendly customer ordering interface
- clearer visual hierarchy
- accessibility-focused controls and labels
- a backend structure that can evolve without rewriting the frontend

## Folder Structure

```text
project3/
  client/              React frontend
  server/              Express API
  README.md
```

## Tech Stack

- Frontend: JavaScript, React, HTML, CSS
- Backend: Express.js
- Database: PostgreSQL

## Frontend Highlights

- Category filters for milk tea, fruit tea, seasonal, and slush drinks
- Accessible customization drawer with:
  - size selection
  - sweetness
  - ice level
  - toppings
  - special instructions
- Real-time cart totals and itemized pricing
- Checkout form with pickup details
- API fallback sample menu so UI development can continue before the database is live

## Backend Highlights

- `GET /api/health`
- `GET /api/menu`
- `POST /api/orders`

The server supports two modes:

- **database mode** when PostgreSQL environment variables are configured
- **sample-data mode** when the database is unavailable

This makes local development easier while still aligning with the project requirement of maintaining a real backend/database architecture.

## PostgreSQL Setup

The SQL schema is located at:

- `server/db/schema.sql`

Create a `.env` file inside `server/` using `.env.example` as a guide.

## Suggested Run Flow

Because Node is not installed in the current environment, dependencies were not installed here. Once Node is available:

1. Install frontend dependencies in `client/`
2. Install backend dependencies in `server/`
3. Start the backend server
4. Start the React frontend

Suggested commands:

```bash
cd project3/server
npm install
npm run dev
```

```bash
cd project3/client
npm install
npm run dev
```

## Accessibility Notes

The UI is designed with:

- keyboard-friendly button groups
- clear section headings
- strong color contrast
- visible focus states
- form labels and helper text
- non-color cues for status and pricing

## Next Good Steps

- connect the menu API to your live TAMU PostgreSQL tables
- add authentication for staff and admin tools
- add order history and loyalty features
- wire inventory availability to disable sold-out ingredients dynamically
