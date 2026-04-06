export interface Book {
  id?: string;
  title: string;
  author: string;
  publisher: string;
  publishDate: string;
  toc?: string[];
  summary: string;
  coverURL?: string; // Future: Fetch from database
}

export interface UserStats {
  readingCount: number;
  totalQuestions: number;
  averageScore: number;
  abilityRadar: {
    memory: number;
    understanding: number;
    reasoning: number;
    dialectic: number;
    expression: number;
    appreciation: number;
  };
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  stats: UserStats;
  isVIP?: boolean;
  vipExpiry?: number;
  profile?: {
    ageGroup: string;
    readingPurpose: string;
    expertiseLevel: string;
    occupation: string;
    readingPreferences: string[];
  };
}

export interface Question {
  question: string;
  options: string[];
  correctAnswer: string | string[];
  isMultiple: boolean;
  analysis: string;
  bias: string;
  source: string;
}

export interface AnswerRecord {
  question: string;
  options: string[];
  userAnswer: string | string[];
  correctAnswer: string | string[];
  isCorrect: boolean;
  analysis: string;
  isMultiple: boolean;
  bias: string;
  source: string;
}

export interface TestSession {
  id?: string;
  userId: string;
  bookId: string;
  bookTitle: string;
  settings: {
    range: string[];
    count: number;
    type: string;
    bias: string | string[];
    examMode: boolean;
    language?: string;
  };
  score: number;
  timestamp: string;
  answers: AnswerRecord[];
  evaluation: string;
  correctRate?: number;
  completionRate?: number;
  timeUsed?: number;
  status?: 'active' | 'archived';
}

export interface UserBook {
  id?: string;
  userId: string;
  title: string;
  author: string;
  publisher: string;
  summary: string;
  toc: string[];
  coverURL?: string; // Future: Fetch from database
  testedChapters: string[];
  completionRate: number;
  averageScore: number;
  mastery: number;
  addedAt: number;
  isDeleted?: boolean;
}

export interface WrongQuestion {
  id?: string;
  userId: string;
  bookTitle: string;
  question: string;
  options: string[];
  correctAnswer: string | string[];
  userAnswer: string | string[];
  isMultiple: boolean;
  analysis: string;
  bias: string;
  source: string;
  wrongCount: number;
  nextReviewDate: number; // timestamp in ms
  reviewStage: number; // 0, 1, 2, 3...
  interval: number; // in days
  repetition: number; // number of successful repetitions
  efactor: number; // easiness factor
  createdAt: number;
  status?: 'active' | 'mastered';
}

export interface Folder {
  id?: string;
  userId: string;
  name: string;
  createdAt: number;
}
