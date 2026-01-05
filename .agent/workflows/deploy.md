---
description: Steps to deploy the Med Tracker application to Firebase (Spark/Free Tier)
---

# Firebase Deployment (Free Tier)

1. **Configure Firebase Project:**
    - Go to the [Firebase Console](https://console.firebase.google.com/).
    - Create a new project (e.g., `my-med-tracker`).
    - Enable **Firestore Database** in the "Build" menu. Choose "Production mode" and a location near you.
    - Enable **Hosting**.

2. **Add Firebase Configuration:**
    - In Firebase Console, go to **Project Settings**.
    - Find the **Web App** section (add one if it doesn't exist).
    - Copy the `firebaseConfig` object.
    - Open `src/firebase.js` in your project and replace the placeholder config with your copied values.

3. **Update Project ID:**
    - Open `.firebaserc` and replace `my-med-tracker-app` with your actual Firebase Project ID.

4. **Login to Firebase CLI:**

    ```bash
    firebase login
    ```

5. **Deploy Everything:**

    ```bash
    npm run deploy
    ```

6. **Verify Firestore Rules:**
    Ensure your `firestore.rules` allow the frontend to read/write data. For development, the current rules allow public access, but you should secure them with Firebase Auth eventually.
