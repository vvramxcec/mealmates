# MealMates Project Context

MealMates is a cross-platform mobile application designed for college roommates to track shared mess meals and split monthly bills fairly based on actual consumption.

## Project Overview

- **Purpose**: Automate meal tracking and bill splitting for roommate groups ("Clubs").
- **Core Workflow**:
  1. Users mark themselves as "Ate" or "Skipped" daily.
  2. At the end of the month, a bill is submitted.
  3. A Cloud Function calculates the split based on the formula: `perMealCost = totalBill / totalMealsEaten`.
  4. Each person pays: `perMealCost × theirMealCount`.

## Tech Stack

- **Frontend**: React Native + Expo (TypeScript)
- **Database**: Firebase Firestore (NoSQL)
- **Authentication**: Firebase Auth (Google Sign-In)
- **State Management**: Zustand
- **Backend Logic**: Firebase Cloud Functions
- **Icons**: Lucide React Native

## Architecture & Data Model

### Firestore Collections
- `users`: `{ uid, name, email, avatar, clubs[] }`
- `clubs`: `{ clubId, name, adminUid, inviteCode, members[] }`
- `mealEntries`: `{ uid, clubId, date, ate: boolean }` (Unique per uid+clubId+date)
- `bills`: `{ clubId, month, totalAmount, splits[], status }`

### Directory Structure
- `App.tsx`: Main entry point with Tab Navigation.
- `src/screens/`: Individual app screens (Today, Calendar, Club, BillSplit, Profile).
- `src/services/`: External service initializations (Firebase).
- `src/store/`: Global state management (Zustand).
- `src/types/`: TypeScript interface definitions.
- `functions/src/`: Firebase Cloud Functions (e.g., `calcBillSplit`).

## Development Commands

- **Start Project**: `npm start`
- **Android**: `npm run android`
- **iOS**: `npm run ios`
- **Web**: `npm run web`
- **Build Functions**: `cd functions && npm run build` (Inferred)
- **Deploy Rules/Functions**: `firebase deploy` (Inferred)

## Coding Conventions

- **TypeScript**: Strictly used for all source files.
- **Surgical Updates**: Prefer targeted edits to specific components or functions.
- **Styling**: Vanilla React Native `StyleSheet` is preferred.
- **Navigation**: Uses `@react-navigation/bottom-tabs`.
- **Firebase Security**: Managed via `firestore.rules` in the root directory.

## Current Progress (Phase 4 Complete)
- Project scaffolded with Expo and TypeScript.
- Core types and state store defined with persistence.
- Firebase service initialized (Auth, Firestore, Storage).
- Navigation structure implemented (Tab Navigator).
- All screens (Today, Calendar, Club, BillSplit, Profile) functional with real-time Firestore integration.
- `calcBillSplit` logic implemented and verified.
- Club Management (Advanced) fully functional: Create, Join, Kick, Delete.
- Mock mode support for development without Firebase config.

## Next Steps
- **Phase 5: Refinement & Polish**
  - Improved Multi-Club switching UI.
  - Profile enhancements (Avatar upload, name changes).
  - Bill settlement workflow (Marking as paid).
  - Push notification integration for new bills.
  - Offline persistence optimization.
