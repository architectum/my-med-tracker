# My Med Tracker

A simple medication dosage tracker built with React, Vite, and Firebase.

## Features

- Real-time synchronization with Firebase Firestore.
- Track dosages for multiple patients (AH and EI).
- Daily history view with navigation.
- Export/Import functionality for backups.
- Premium, mobile-friendly design.

## Tech Stack

- **Frontend**: React (Hooks, Context), Vite.
- **Backend/Database**: Firebase Firestore.
- **Hosting**: Firebase Hosting.
- **Styling**: TailwindCSS via CDN (in `index.html`).

## Getting Started

### 1. Prerequisites

- Node.js installed.
- [Firebase CLI](https://firebase.google.com/docs/cli) installed (`npm install -g firebase-tools`).

### 2. Setup Firebase

1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Firestore Database** (Production mode).
3. Create a **Web App** in Project Settings.
4. Copy the `firebaseConfig` and paste it into `src/firebase.js`.
5. Update your Project ID in `.firebaserc`.

### 3. Local Development

```bash
npm install
npm run dev
```

### 4. Deployment (Spark/Free Plan)

```bash
firebase login
npm run deploy
```

## Security Note

The initial `firestore.rules` are set to be public for development. **Important:** Before going live, update your rules to restrict access (e.g., using Firebase Authentication).
