import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  onSnapshot,
  doc,
  getDoc,
  updateDoc
} from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { Folder } from "../types";

export const addToBookshelf = async (bookId: string, folderId?: string) => {
  if (!auth.currentUser) {
    throw new Error("用户未登录");
  }

  const userBookRef = collection(db, "userBooks");
  
  try {
    await addDoc(userBookRef, {
      userId: auth.currentUser.uid,
      bookId,
      folderId: folderId || "default",
      mastery: 0,
      planConfig: {
          dailyGoal: 1,
          questionCount: 5,
          timerMode: "正计时",
          isExamMode: false
      },
      lastActiveAt: serverTimestamp(),
      roadmapData: []
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "userBooks");
  }
};

export const createFolder = async (name: string) => {
  console.log("createFolder called with name:", name);
  if (!auth.currentUser) throw new Error("用户未登录");
  try {
    console.log("Attempting to add folder to Firestore...");
    await addDoc(collection(db, "folders"), {
      userId: auth.currentUser.uid,
      name,
      createdAt: Date.now()
    });
    console.log("Folder added successfully!");
  } catch (error) {
    console.error("Error adding folder:", error);
    handleFirestoreError(error, OperationType.CREATE, "folders");
  }
};

export const getUserFolders = (onUpdate: (folders: Folder[]) => void) => {
  if (!auth.currentUser) return () => {};
  const q = query(collection(db, "folders"), where("userId", "==", auth.currentUser.uid));
  return onSnapshot(q, (snapshot) => {
    const folders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Folder));
    onUpdate(folders);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, "folders");
  });
};

export const moveBookToFolder = async (userBookId: string, folderId: string) => {
  try {
    await updateDoc(doc(db, "userBooks", userBookId), { folderId });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `userBooks/${userBookId}`);
  }
};

/**
 * 获取当前用户的书架列表（实时监听）
 */
export const getUserBookshelf = (onUpdate: (books: any[]) => void) => {
  if (!auth.currentUser) return () => {};

  const q = query(
    collection(db, "userBooks"),
    where("userId", "==", auth.currentUser.uid)
  );

  return onSnapshot(q, (snapshot) => {
    const books = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    onUpdate(books);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, "userBooks");
  });
};

/**
 * 根据 ID 获取书籍详情
 */
export const getBookDetails = async (bookId: string) => {
  try {
    const bookRef = doc(db, "books", bookId);
    const bookSnap = await getDoc(bookRef);
    
    if (bookSnap.exists()) {
      return { id: bookSnap.id, ...bookSnap.data() };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `books/${bookId}`);
    return null;
  }
};
