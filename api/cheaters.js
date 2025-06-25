import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

const app = initializeApp({
  credential: cert(serviceAccount),
});
const db = getFirestore(app);

export default async function handler(req, res) {
  const snapshot = await db.collection('cheaters').get();
  const cheaters = [];
  snapshot.forEach(doc => cheaters.push(doc.data().username));
  res.status(200).json({ cheaters });
}
