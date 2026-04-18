# MealMates: Project Blueprint & Implementation Guide

## 1. The Core Idea
**MealMates** is a "Fair-Share" meal tracking and bill splitting application designed specifically for college roommates or groups sharing a mess/tiffin service.

### The Problem
Traditional bill splitting (like Splitwise) usually divides costs equally. However, in a shared mess, consumption varies:
- Person A might eat all 30 days.
- Person B might go home for 10 days and only eat 20 meals.
- Splitting the bill 50/50 is unfair to Person B.

### The Solution
An app where users check-in daily ("Ate" or "Skipped"). At the end of the month, the total bill is divided by the *total number of meals actually consumed* by the group to find the **Per-Meal Cost**. Each person then pays only for what they ate.

---

## 2. Tech Stack
- **Frontend**: React Native with Expo (TypeScript) for cross-platform (iOS, Android, Web) support.
- **Backend/Database**: Firebase (Firestore) for real-time updates and NoSQL flexibility.
- **Authentication**: Firebase Auth (Email/Password or Google).
- **State Management**: Zustand (with Persistence) for a lightweight, fast global state.
- **Icons**: Lucide React Native.

---

## 3. Data Architecture (Firestore)

### `users` Collection
```json
{
  "uid": "string",
  "name": "string",
  "email": "string",
  "avatar": "url_string",
  "clubs": ["clubId1", "clubId2"]
}
```

### `clubs` Collection
```json
{
  "clubId": "string",
  "name": "string",
  "adminUid": "string",
  "inviteCode": "string (6-digit)",
  "members": ["uid1", "uid2"]
}
```

### `mealEntries` Collection (The "Transaction" Log)
*Document ID format: `{uid}_{clubId}_{yyyy-mm-dd}` for O(1) lookups.*
```json
{
  "uid": "string",
  "clubId": "string",
  "date": "string (ISO)",
  "ate": "boolean"
}
```

### `bills` Collection
```json
{
  "clubId": "string",
  "month": "string (YYYY-MM)",
  "totalAmount": "number",
  "status": "pending | settled",
  "splits": [
    { "uid": "string", "mealCount": "number", "amount": "number" }
  ]
}
```

---

## 4. Step-by-Step Implementation Guide

### Phase 1: Environment & Setup
1.  **Initialize Expo**: `npx create-expo-app MealMates -template expo-template-blank-typescript`.
2.  **Install Dependencies**: Navigation (Bottom Tabs), Zustand, Lucide Icons, and Firebase SDK.
3.  **Firebase Project**: Create a project in Firebase Console, enable Firestore and Auth.
4.  **Service Init**: Create `src/services/firebase.ts` to initialize the app and export `db`, `auth`.

### Phase 2: Global State & Auth
1.  **Zustand Store**: Create `src/store/useAppStore.ts` to hold the `user` and `activeClub` objects.
2.  **Login Flow**: Build a `LoginScreen` that handles both Sign In and Sign Up.
3.  **Auth Wrapper**: In `App.tsx`, use `onAuthStateChanged` to listen for users and redirect to Login or Main App.

### Phase 3: Club Management (The "Container")
1.  **Create Club**: A function to generate a 6-digit code and create a Firestore doc.
2.  **Join Club**: Use `query` to find a club by `inviteCode` and add the user's UID to the `members` array.
3.  **Real-time Sync**: Use `onSnapshot` in the `ClubScreen` so when a roommate joins, everyone sees it instantly.

### Phase 4: The Daily Interaction (Today Screen)
1.  **Toggle Logic**: Create two big buttons: "Ate" and "Skipped".
2.  **Atomic Writes**: Clicking a button saves a doc to `mealEntries`. 
3.  **Date Management**: Use `new Date().toISOString().split('T')[0]` to ensure consistent date keys.

### Phase 5: The Math (Bill Split Logic)
1.  **Admin Submission**: Only the `adminUid` can enter the total bill amount.
2.  **Calculation Trigger**: 
    - Fetch all `mealEntries` for the specific `clubId` and `month`.
    - `totalMeals = mealEntries.filter(e => e.ate).length`.
    - `perMealCost = totalBill / totalMeals`.
    - For each member: `memberCost = memberMealCount * perMealCost`.
3.  **Display**: Show a breakdown list with amounts for each roommate.

### Phase 6: Refinement
1.  **Mock Mode**: Implement a flag `isFirebaseConfigured` that allows the app to run with local state for testing without a backend.
2.  **UI/UX**: Use a soft color palette (e.g., `#FF6B6B` Coral) and card-based layouts for a modern feel.

---

## 5. Critical Success Factors
- **Surgical Firestore Queries**: Avoid fetching the whole database. Query by `clubId` and `month`.
- **Zustand Persistence**: Ensure that even if the app closes, the user remains logged in and the `activeClub` is remembered.
- **Empty States**: Always design for the "No Club Joined" or "No Meals Tracked" scenarios to guide the user.
