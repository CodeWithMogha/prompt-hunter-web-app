# PromptHunter WebApp 🎯🕵️‍♂️

PromptHunter is an interactive, AI-powered scavenger hunt web application. It challenges users to find real-world objects using their device's camera, leveraging real-time computer vision and generative AI to create dynamic gameplay.

## 🚀 Features

- **Real-time Object Detection:** Uses TensorFlow.js and the COCO-SSD model to identify objects through your camera.
- **AI-Powered Prompts:** Integrates with Google Generative AI (Gemini) to generate creative and challenging hunt prompts.
- **User Profiles & Scoring:** Tracks user progress, scores, and past hunts using Firebase.
- **Mobile-First Design:** A sleek, responsive UI optimized for mobile devices with a bottom navigation bar.

## 🛠️ Technologies Used

- **Frontend:** React 19, Vite, React Router v7
- **AI/ML:** `@tensorflow/tfjs`, `@tensorflow-models/coco-ssd`, `@google/generative-ai`
- **Backend/Services:** Firebase
- **Styling:** Custom CSS, `lucide-react` for icons

## 🏃‍♂️ Getting Started

### Prerequisites

- Node.js installed on your machine.
- A Firebase project set up.
- A Google Gemini API Key.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/meamritanshu/prompt-hunter-web-app.git
   cd prompt-hunter-web-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory and add your Firebase and Generative AI API keys:
   ```env
   VITE_FIREBASE_API_KEY="your-api-key"
   VITE_FIREBASE_AUTH_DOMAIN="your-auth-domain"
   VITE_FIREBASE_PROJECT_ID="your-project-id"
   VITE_FIREBASE_STORAGE_BUCKET="your-storage-bucket"
   VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
   VITE_FIREBASE_APP_ID="your-app-id"

   # Add Gemini or Groq API keys based on your preference
   VITE_GEMINI_API_KEY="your-gemini-key"
   # VITE_GROQ_API_KEY="your-groq-key"
   ```

4. Set up Firebase Firestore:
   - Create a free Firebase project and register a Web App.
   - Go to **Build > Firestore Database** and create a new database.
   - Update your **Rules** to allow read/write during development:
     ```javascript
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         match /{document=**} {
           allow read, write: if true;
         }
       }
     }
     ```

5. Run the development server:
   ```bash
   npm run dev
   ```
   Or use the included Windows batch script:
   ```bash
   .\start-dev.bat
   ```

## 🎮 How to Play

1. **Home:** View your current status and available quests.
2. **Hunt:** Open the camera view. The AI will give you a prompt (e.g., "Find a cup"). Point your camera at the object to capture and analyze it.
3. **Profile:** Check your stats and leaderboard ranking.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
