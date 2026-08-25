// Firestore instance. Lazy — no network calls until a document is read/written.
import { getFirestore, type Firestore } from "firebase/firestore";
import { firebaseApp } from "./app";

/** The Firestore instance, or null when Signal is running in local mode. */
export const db: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null;
