# Project Progress Update: Dynamic Cloud Riddle Buffer

## Completed Objectives
1. **Firestore Migration**
   - Transferred the riddle array structure to a centralized `game_config/riddles` Firestore document using YAML format.
   - Built an `/admin` portal allowing live valid-YAML editing of the global game state.
2. **State Management Hook (`useRiddleBuffer`)**
   - Created a robust custom React hook that pulls the YAML config natively.
   - Designed a FIFO consumption loop: When a user finds an object, the riddle flips to `used` status, triggering a background loop.
   - Added an automated Background AI "Refill" trigger when `activeRiddles` drops below 10.
3. **AI Repetition Bug Fix**
   - Replaced state-unaware prompting with Contextual Prompts.
   - The AI is now fed a list of the *last 20 used* riddles and strictly forbidden from reusing those Target Labels.
4. **Resiliency and Fallbacks**
   - Added an **Offline Local Storage Fallback** if Firebase Firestore is unreachable or permissions drag out.
   - Upgraded API dependencies to natively support **both Gemini 2.0 Flash and Groq Llama-3.3-70b-versatile**.
   - Built a robust Regex parser to bypass "Conversational Filler" crashing the YAML extraction logic.
   - Implemented a final hardcoded static fallback injection to protect against 429 API Rate Limit exhaustion.
5. **UI State Sync Fix**
   - Fixed a UI blocker where `HomeView.jsx` rendered "No riddles available right now" despite successful AI generations. 
   - Implemented Optimistic UI Updates in `useRiddleBuffer.js` by syncing local React state before awaiting remote Firestore writes, bypassing potential sync hangs or permission failures.
   - Resolved a stale closure issue to ensure accurate history tracking on the initial AI buffer refill.
6. **Database & Environment Setup**
   - Configured the project to use a free-tier Firebase setup (Spark plan).
   - Resolved Firestore connection errors (`Missing or insufficient permissions`) by implementing explicit Test Mode security rules.
   - Finalized local environment configs (`.env.local`) to bridge the app to the cloud database successfully.

## Riddle Storage Architecture
The game utilizes a three-tier system for storing and managing AI-generated riddles:
1. **Cloud Database (Primary):** New riddles are immediately serialized to YAML and pushed to Firebase Firestore (`game_config/riddles` document). This acts as the global single source of truth.
2. **Local App State (Runtime):** Riddles are pulled from Firestore into the device's RAM via React `useState` in the `useRiddleBuffer` hook for zero-latency gameplay.
3. **Local Storage (Offline Fallback):** If Firestore is unreachable (network drop or permission failure), the app automatically writes the YAML array to the browser's `localStorage` (`fallback_riddles_yaml`), ensuring uninterrupted gameplay.

## Current Blocker
- None. The core game loop successfully fetches, consumes, and natively replenishes from the cloud or offline fallbacks!
