# MealMates Project Context

MealMates is a Next.js-based web application designed to track shared meals and simplify splitting monthly bills within groups (called "Clubs"). It allows members to log their daily meal attendance and automatically calculates individual contributions based on actual consumption when a total bill is submitted.

## Core Technologies
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Backend/Database:** Firebase
  - **Firestore:** NoSQL database for application data.
  - **Auth:** Email-based user authentication.
  - **Analytics:** Usage tracking.

## Project Structure
```text
src/
├── app/                  # Next.js App Router routes
│   ├── club/[id]/        # Club-specific views
│   │   ├── bill/         # Admin: Submit monthly bill
│   │   ├── results/      # View monthly split results
│   │   └── page.tsx      # Main club meal tracking view
│   ├── dashboard/        # User dashboard (club list, create/join)
│   ├── login/            # Authentication page
│   ├── globals.css       # Tailwind & global styles
│   ├── layout.tsx        # Root layout with Navbar
│   └── page.tsx          # Auth-based redirect logic
├── components/           # Reusable React components (Navbar, etc.)
└── lib/                  # Library configurations (Firebase initialization)
```

## Key Workflows
1. **Authentication:** Users sign in via Firebase Auth. The root page (`/`) redirects to `/dashboard` if logged in, or `/login` otherwise.
2. **Club Management:** From the Dashboard, users can create a new club (becoming the Admin) or join an existing one via a unique Club ID.
3. **Meal Tracking:** Within a club, members mark their status ("I Ate" or "I Skipped") for any given date using a calendar interface.
4. **Billing & Splits:**
   - **Admins** can submit a total bill for a specific month.
   - The system calculates the `perMealCost` by dividing the total bill by the total number of "Ate" entries across all members.
   - Individual `results` are generated, showing how much each member owes the admin based on their meal count.

## Firestore Data Model
- **`users`**: `{ name: string, email: string, clubs: string[] }`
- **`clubs`**: `{ name: string, adminId: string, members: string[] }`
- **`meals`**: `{ clubId: string, userId: string, date: string, status: "ate" | "skipped" }` (Doc ID: `${clubId}_${userId}_${date}`)
- **`bills`**: `{ clubId: string, month: string, totalAmount: number, createdBy: string }`
- **`results`**: `{ clubId: string, month: string, userId: string, mealCount: number, amount: number }`

## Development Commands
- `npm run dev`: Starts the development server at `http://localhost:3000`.
- `npm run build`: Compiles the application for production.
- `npm run start`: Starts the production server.
- `npm run lint`: Runs ESLint for code quality checks.

## Conventions
- **Client Components:** Use `"use client";` at the top of files that utilize React hooks (useState, useEffect) or Firebase client-side SDKs.
- **Firebase initialization:** Always import `auth` and `db` from `@/lib/firebase`.
- **Styling:** Use Tailwind CSS utility classes for all styling. Maintain responsiveness using Tailwind's `md:`, `lg:` prefixes.
