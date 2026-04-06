import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc,
  serverTimestamp,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { WrongQuestion } from '../types';

/**
 * SM-2 Algorithm implementation
 * @param q Quality of response (0-5)
 * @param n Repetition number
 * @param ef Easiness factor
 * @param i Interval in days
 */
export function calculateNextReview(q: number, n: number, ef: number, i: number) {
  let nextN = n;
  let nextEf = ef;
  let nextI = i;

  if (q >= 3) {
    if (n === 0) {
      nextI = 1;
    } else if (n === 1) {
      nextI = 6;
    } else {
      nextI = Math.round(i * ef);
    }
    nextN++;
  } else {
    nextN = 0;
    nextI = 1;
  }

  nextEf = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (nextEf < 1.3) nextEf = 1.3;

  const nextReviewDate = Date.now() + nextI * 24 * 60 * 60 * 1000;

  return {
    repetition: nextN,
    efactor: nextEf,
    interval: nextI,
    nextReviewDate
  };
}

export async function addWrongQuestion(uid: string, question: Omit<WrongQuestion, 'id' | 'userId' | 'createdAt' | 'wrongCount' | 'nextReviewDate' | 'reviewStage' | 'interval' | 'repetition' | 'efactor'>) {
  const wrongQuestion: WrongQuestion = {
    ...question,
    userId: uid,
    wrongCount: 1,
    nextReviewDate: Date.now() + 1 * 24 * 60 * 60 * 1000, // Review tomorrow
    reviewStage: 1,
    interval: 1,
    repetition: 0,
    efactor: 2.5,
    createdAt: Date.now(),
    status: 'active'
  };

  try {
    // Check if question already exists for this user
    const q = query(
      collection(db, 'wrongQuestions'), 
      where('userId', '==', uid), 
      where('question', '==', question.question)
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
      const existingDoc = snap.docs[0];
      const existingData = existingDoc.data() as WrongQuestion;
      await updateDoc(doc(db, 'wrongQuestions', existingDoc.id), {
        wrongCount: existingData.wrongCount + 1,
        status: 'active' // Re-activate if mastered
      });
    } else {
      await addDoc(collection(db, 'wrongQuestions'), wrongQuestion);
    }
  } catch (error) {
    console.error('Error adding wrong question:', error);
  }
}

export async function getDueWrongQuestions(uid: string, limitCount: number = 20) {
  const now = Date.now();
  const q = query(
    collection(db, 'wrongQuestions'),
    where('userId', '==', uid),
    where('status', '==', 'active'),
    where('nextReviewDate', '<=', now),
    orderBy('nextReviewDate', 'asc'),
    limit(limitCount)
  );

  try {
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as WrongQuestion));
  } catch (error) {
    console.error('Error fetching due wrong questions:', error);
    return [];
  }
}

export async function updateWrongQuestionSRS(questionId: string, q: number, currentSRS: { n: number, ef: number, i: number }) {
  const nextSRS = calculateNextReview(q, currentSRS.n, currentSRS.ef, currentSRS.i);
  
  try {
    const docRef = doc(db, 'wrongQuestions', questionId);
    await updateDoc(docRef, {
      ...nextSRS,
      reviewStage: nextSRS.repetition,
      status: nextSRS.repetition >= 5 ? 'mastered' : 'active' // Example: master after 5 successful repetitions
    });
  } catch (error) {
    console.error('Error updating wrong question SRS:', error);
  }
}
