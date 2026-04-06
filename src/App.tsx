/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Book as BookIcon, 
  Search, 
  Settings, 
  Play, 
  CheckCircle2, 
  BarChart3, 
  User as UserIcon,
  LogOut,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Volume2,
  Clock,
  Trophy,
  Target,
  AlertCircle,
  ClipboardList,
  Loader2,
  X,
  Home,
  History,
  RotateCcw,
  Trash2,
  Eye,
  EyeOff,
  WifiOff,
  Share2,
  Globe2,
  ChevronsDown,
  MessageCircle,
  Send,
  Download,
  Library,
  Crown
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc,
  getDocFromServer,
  orderBy,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { QRCodeSVG } from 'qrcode.react';
import * as htmlToImage from 'html-to-image';

import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { geminiService } from './services/geminiService';
import * as srsService from './services/srsService';
import { Book, UserProfile, TestSession, Question, AnswerRecord, UserStats, WrongQuestion, UserBook } from './types';
import { Onboarding } from './components/Onboarding';
import { LibraryView } from './components/LibraryView';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

// --- Constants & Types ---

const WAITING_QUOTES = [
  { text: "耐心是苦涩的，但它的果实是甜美的。", author: "卢梭" },
  { text: "最强大的战士是耐心和时间。", author: "列夫·托尔斯泰" },
  { text: "慢生长的树木结出最好的果实。", author: "莫里哀" },
  { text: "耐心不仅仅是等待的能力，更是我们在等待时的表现。", author: "乔伊斯·迈耶" },
  { text: "凡事只要耐心等待，终会如愿以偿——只要他知道自己在等什么。", author: "伍德罗·威尔逊" },
  { text: "有耐心的人，能得到他想要的一切。", author: "本杰明·富兰克林" },
  { text: "等待是灵魂的锈迹。", author: "卡洛斯·鲁依斯·萨丰" },
  { text: "希望是醒着的人的梦。", author: "亚里士多德" },
  { text: "在所有的批评中，最伟大、最正确、最天才的是时间。", author: "别林斯基" },
  { text: "耐心和恒心总会得到报酬的。", author: "爱因斯坦" }
];

const OfflineOverlay = ({ onRetry }: { onRetry: () => void }) => {
  const [quote, setQuote] = useState(WAITING_QUOTES[0]);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const randomQuote = WAITING_QUOTES[Math.floor(Math.random() * WAITING_QUOTES.length)];
    setQuote(randomQuote);

    // Auto-check connection every 5 seconds
    const interval = setInterval(() => {
      if (navigator.onLine) {
        onRetry();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [onRetry]);

  const handleManualRetry = async () => {
    setIsChecking(true);
    // Give a small delay for the animation feel
    await new Promise(resolve => setTimeout(resolve, 800));
    onRetry();
    setIsChecking(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[9999] bg-stone-900/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
    >
      <div className="relative mb-12">
        <motion.div
          animate={{
            scale: isChecking ? [1, 1.8, 1] : [1, 1.5, 1],
            opacity: isChecking ? [0.2, 0.5, 0.2] : [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: isChecking ? 1 : 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 bg-[#064e3b] rounded-full blur-3xl"
        />
        <div className="relative w-24 h-24 bg-[#064e3b]/20 rounded-full flex items-center justify-center border border-[#064e3b]/30">
          {isChecking ? (
            <Loader2 className="w-10 h-10 text-[#064e3b] animate-spin" />
          ) : (
            <WifiOff className="w-10 h-10 text-[#064e3b]" />
          )}
        </div>
      </div>

      <div className="max-w-md space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">网络连接已中断</h2>
          <p className="text-stone-400 text-sm">
            {isChecking ? '正在尝试重新连接...' : '正在尝试自动恢复连接，请稍候...'}
          </p>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="p-8 bg-white/5 rounded-3xl border border-white/10 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-[#064e3b]/50" />
          <p className="text-lg text-stone-200 italic leading-relaxed mb-4">
            “{quote.text}”
          </p>
          <p className="text-sm text-[#064e3b] font-bold tracking-widest uppercase">
            —— {quote.author}
          </p>
        </motion.div>

        <div className="flex flex-col items-center gap-4">
          <div className="flex justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
                className="w-2 h-2 bg-[#064e3b] rounded-full"
              />
            ))}
          </div>
          <button 
            onClick={handleManualRetry}
            disabled={isChecking}
            className="text-xs text-stone-500 hover:text-[#064e3b] transition-colors uppercase tracking-widest font-bold disabled:opacity-50"
          >
            {isChecking ? '检修中...' : '手动重试'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const Button = ({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  isLoading,
  children, 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}) => {
  const variants = {
    primary: 'bg-[#064e3b] text-white hover:bg-[#043d2e] shadow-md shadow-[#064e3b]/20 border border-[#064e3b] hover:shadow-lg hover:shadow-[#064e3b]/30 hover:-translate-y-0.5',
    secondary: 'bg-white text-stone-800 hover:bg-stone-50 border border-stone-200/80 shadow-sm hover:shadow-md hover:border-stone-300 hover:-translate-y-0.5',
    outline: 'border-2 border-stone-200/80 text-stone-600 hover:bg-stone-50 hover:border-stone-300 hover:shadow-sm hover:-translate-y-0.5',
    ghost: 'text-stone-600 hover:bg-stone-100 hover:text-stone-900',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 hover:shadow-sm hover:-translate-y-0.5',
  };
  const sizes = {
    sm: 'px-4 py-2 text-sm rounded-xl',
    md: 'px-6 py-3 text-base rounded-2xl',
    lg: 'px-8 py-4 text-lg font-medium rounded-3xl',
  };

  return (
    <motion.button 
      whileTap={{ scale: 0.97 }}
      className={cn(
        'inline-flex items-center justify-center transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none font-medium',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={isLoading}
      {...props as any}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </motion.button>
  );
};

const Card = ({ children, className, onClick, ...props }: { children: React.ReactNode; className?: string; onClick?: () => void } & React.HTMLAttributes<HTMLDivElement>) => {
  const isClickable = !!onClick;
  
  if (isClickable) {
    return (
      <motion.div 
        onClick={onClick}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'bg-white rounded-3xl border border-stone-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-6 transition-all duration-300',
          'cursor-pointer hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.08)] hover:border-stone-300/80 hover:-translate-y-1',
          className
        )}
        {...props as any}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div 
      className={cn(
        'bg-white rounded-3xl border border-stone-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-6 transition-all duration-300 hover:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.06)]',
        className
      )}
      {...props as any}
    >
      {children}
    </div>
  );
};

// --- Error Boundary ---

class ErrorBoundary extends React.Component<any, any> {
  state: any;
  props: any;

  constructor(props: any) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
          <Card className="max-w-md w-full text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold">出错了</h2>
            <p className="text-stone-500 text-sm">抱歉，应用遇到了一个错误。请尝试刷新页面。</p>
            <div className="p-4 bg-stone-100 rounded-xl text-left overflow-auto max-h-40">
              <code className="text-xs text-red-600">{this.state.errorInfo}</code>
            </div>
            <Button className="w-full" onClick={() => window.location.reload()}>刷新页面</Button>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Main App ---

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

const LANGUAGES = [
  { name: '中文', flag: '🇨🇳', code: 'zh-CN' },
  { name: '英文', flag: '🇺🇸', code: 'en-US' },
  { name: '西班牙语', flag: '🇪🇸', code: 'es-ES' },
  { name: '法语', flag: '🇫🇷', code: 'fr-FR' },
  { name: '德语', flag: '🇩🇪', code: 'de-DE' },
  { name: '日语', flag: '🇯🇵', code: 'ja-JP' },
  { name: '韩语', flag: '🇰🇷', code: 'ko-KR' },
  { name: '俄语', flag: '🇷🇺', code: 'ru-RU' },
  { name: '葡萄牙语', flag: '🇵🇹', code: 'pt-PT' },
  { name: '阿拉伯语', flag: '🇸🇦', code: 'ar-SA' },
];

const QuizTimer = ({ startTime, mode, value, onTimeUp }: { startTime: number, mode: 'COUNT_UP' | 'COUNT_DOWN', value?: number, onTimeUp?: () => void }) => {
  const [displayTime, setDisplayTime] = useState(0);
  const [isTimeUp, setIsTimeUp] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      if (mode === 'COUNT_DOWN' && value) {
        const totalSeconds = value * 60;
        const remaining = Math.max(0, totalSeconds - elapsed);
        setDisplayTime(remaining);
        if (remaining === 0 && !isTimeUp) {
          setIsTimeUp(true);
          onTimeUp?.();
        }
      } else {
        setDisplayTime(elapsed);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, mode, value, onTimeUp, isTimeUp]);

  const isLowTime = mode === 'COUNT_DOWN' && displayTime < 60 && displayTime > 0;

  return (
    <div className={cn(
      "flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 rounded-full transition-colors",
      isLowTime ? "bg-red-100 text-red-600 animate-pulse" : "bg-stone-100/50 text-stone-500",
      isTimeUp && "bg-red-500 text-white"
    )}>
      <Clock className={cn("w-3.5 h-3.5", isLowTime && "animate-spin-slow")} />
      {Math.floor(displayTime / 60)}:{(displayTime % 60).toString().padStart(2, '0')}
    </div>
  );
};

const ScrollIndicator = ({ containerRef }: { containerRef: React.RefObject<HTMLDivElement> }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      if (containerRef.current) {
        const { scrollHeight, clientHeight, scrollTop } = containerRef.current;
        // Show if content is taller than container AND we are not at the bottom (with a 20px threshold)
        setShow(scrollHeight > clientHeight && scrollHeight - clientHeight - scrollTop > 20);
      }
    };

    checkScroll();
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      // Re-check when content might have changed (e.g., after a short delay)
      const timeout = setTimeout(checkScroll, 100);
      return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
        clearTimeout(timeout);
      };
    }
  }, [containerRef]);

  if (!show) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: 10 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
    >
      <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg border border-stone-200/50 text-stone-400 animate-bounce">
        <ChevronsDown className="w-5 h-5" />
      </div>
    </motion.div>
  );
};

function MainApp() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [view, setView] = useState<'AUTH' | 'MAIN' | 'QUIZ' | 'RESULT' | 'ONBOARDING'>('AUTH');
  const [activeTab, setActiveTab] = useState<'HOME' | 'QUESTION_BOOK' | 'LIBRARY' | 'PROFILE'>('HOME');
  const [homeSubView, setHomeSubView] = useState<'SEARCH' | 'SETTINGS'>('SEARCH');
  const [answerBookSubView, setAnswerBookSubView] = useState<'RECORDS' | 'MISTAKES'>('RECORDS');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // App State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [searchCache, setSearchCache] = useState<Record<string, Book[]>>({});
  const [bookCache, setBookCache] = useState<Record<string, Book>>({});
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isBookDetailModalOpen, setIsBookDetailModalOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmationText, setResetConfirmationText] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<UserBook | null>(null);
  const [isVipModalOpen, setIsVipModalOpen] = useState(false);
  const [isVipLoading, setIsVipLoading] = useState(false);
  
  // Batch Edit State
  const [isBatchEditMode, setIsBatchEditMode] = useState(false);
  const [selectedBatchItems, setSelectedBatchItems] = useState<Set<string>>(new Set());
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [isBookActionModalOpen, setIsBookActionModalOpen] = useState(false);
  const [settingsBackTarget, setSettingsBackTarget] = useState<'SEARCH' | 'QUESTION_BOOK'>('SEARCH');
  const [bookForAction, setBookForAction] = useState<UserBook | null>(null);
  const [batchDeleteCascade, setBatchDeleteCascade] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  const [testSettings, setTestSettings] = useState(() => {
    const saved = localStorage.getItem('tongbao_test_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migrate old string bias to array
        if (typeof parsed.bias === 'string') {
          if (parsed.bias === '均衡') parsed.bias = ['记忆力', '理解力', '推理力'];
          else if (parsed.bias === '全面') parsed.bias = ['记忆力', '理解力', '推理力', '辩证力', '表达力', '文学鉴赏'];
          else parsed.bias = [parsed.bias];
        }
        // Ensure robust defaults for count, type, bias, and language
        const count = parsed.count || 5;
        const type = parsed.type || '单选';
        const bias = (parsed.bias && Array.isArray(parsed.bias) && parsed.bias.length > 0) ? parsed.bias : ['记忆力', '理解力', '推理力'];
        const language = parsed.language || '中文';
        
        return { 
          ...parsed, 
          count,
          type,
          bias,
          language,
          timerMode: parsed.timerMode || 'COUNT_UP',
          timerValue: parsed.timerValue || 0,
          range: [] 
        }; // Don't persist range across different books
      } catch (e) {
        console.error('Failed to parse saved settings', e);
      }
    }
    return {
      range: [] as string[],
      count: 5,
      type: '单选', // '单选' | '多选' | '填空' | '判断' | '主观' | '混合'
      bias: ['记忆力', '理解力', '推理力'],
      examMode: false,
      language: '中文',
      timerMode: 'COUNT_UP',
      timerValue: 0
    };
  });

  const [selectedLanguage, setSelectedLanguage] = useState(testSettings.language || '中文');

  // Persist settings whenever they change
  useEffect(() => {
    const { range, ...rest } = testSettings;
    localStorage.setItem('tongbao_test_settings', JSON.stringify(rest));
  }, [testSettings]);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(string | string[])[]>([]);
  const [quizStartTime, setQuizStartTime] = useState<number>(0);
  const [sessionResult, setSessionResult] = useState<TestSession | null>(null);
  const [loadingText, setLoadingText] = useState<string>('');
  const [isTocExpanded, setIsTocExpanded] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isWrongQuestionRetest, setIsWrongQuestionRetest] = useState<WrongQuestion | null>(null);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  // Records State
  const [records, setRecords] = useState<TestSession[]>([]);
  const [allRecords, setAllRecords] = useState<TestSession[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<TestSession | null>(null);
  const [userBooks, setUserBooks] = useState<UserBook[]>([]);

  // Smart Next Chapter Logic
  useEffect(() => {
    if (selectedBook && homeSubView === 'SETTINGS') {
      const userBook = userBooks.find(b => b.title === selectedBook.title);
      if (userBook && userBook.testedChapters.length > 0 && selectedBook.toc && selectedBook.toc.length > 0) {
        // Find the first untested chapter
        const nextChapter = selectedBook.toc.find(chapter => !userBook.testedChapters.includes(chapter));
        if (nextChapter) {
          setTestSettings(prev => ({ ...prev, range: [nextChapter] }));
        } else {
          // If all tested, default to the last chapter or empty
          setTestSettings(prev => ({ ...prev, range: [] }));
        }
      } else if (selectedBook.toc && selectedBook.toc.length > 0) {
        // New book, default to first chapter
        setTestSettings(prev => ({ ...prev, range: [selectedBook.toc[0]] }));
      }
    }
  }, [selectedBook, homeSubView, userBooks]);
  
  // Wrong Book State
  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestion[]>([]);
  const hasDueQuestions = wrongQuestions.some(q => q.nextReviewDate <= Date.now());
  const [selectedAnswerBook, setSelectedAnswerBook] = useState<string | null>(null);
  const [previousTab, setPreviousTab] = useState<string | null>(null);
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [posterImage, setPosterImage] = useState<string | null>(null);
  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false);
  const [expandedAnalysisIndices, setExpandedAnalysisIndices] = useState<Set<number>>(new Set());
  const [expandedMistakeIndices, setExpandedMistakeIndices] = useState<Set<string>>(new Set());
  const [manualRangeText, setManualRangeText] = useState('');
  const [showManualRange, setShowManualRange] = useState(false);
  const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    setIsBatchEditMode(false);
    setSelectedBatchItems(new Set());
  }, [activeTab, selectedAnswerBook, selectedRecord]);

  const handlePlayAudio = (text: string, id: string) => {
    if (isPlayingAudio === id) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Set immediately to allow toggling off even if onstart hasn't fired
    setIsPlayingAudio(id);
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Select voice based on language
    const voices = window.speechSynthesis.getVoices();
    let langCode = 'zh-CN';
    if (selectedLanguage === '英文') langCode = 'en-US';
    else if (selectedLanguage === '日语') langCode = 'ja-JP';
    else if (selectedLanguage === '韩语') langCode = 'ko-KR';
    else if (selectedLanguage === '法语') langCode = 'fr-FR';
    else if (selectedLanguage === '德语') langCode = 'de-DE';
    else if (selectedLanguage === '西班牙语') langCode = 'es-ES';
    
    utterance.lang = langCode;
    const voice = voices.find(v => v.lang.startsWith(langCode.split('-')[0]));
    if (voice) utterance.voice = voice;
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => setIsPlayingAudio(id);
    utterance.onend = () => setIsPlayingAudio(null);
    utterance.onerror = () => setIsPlayingAudio(null);
    
    window.speechSynthesis.speak(utterance);
  };

  // Cleanup audio and errors on view/tab change
  useEffect(() => {
    window.speechSynthesis.cancel();
    setIsPlayingAudio(null);
    setError(null);
  }, [view, activeTab, selectedBook, selectedRecord, isBookModalOpen, isBookDetailModalOpen, isLanguageModalOpen]);

  // --- Auth & Profile ---

  useEffect(() => {
    // Connection Test
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const profileData = await fetchProfile(user.uid);
        const fetchedRecords = await fetchRecords(user.uid);
        const fetchedBooks = await fetchUserBooks(user.uid);
        
        // Sync logic: if bookshelf is empty but records exist, sync them
        if (fetchedBooks.length === 0 && fetchedRecords.length > 0) {
          await syncBooksFromRecords(user.uid, fetchedRecords, fetchedBooks);
        }
        
        await fetchWrongQuestions(user.uid);
        
        // Check if onboarding is needed
        if (!profileData?.profile) {
          setView('ONBOARDING');
        } else {
          setView('MAIN');
          setActiveTab('HOME');
        }
      } else {
        setView('AUTH');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleOnboardingComplete = async (surveyData: {
    ageGroup: string;
    readingPurpose: string;
    expertiseLevel: string;
  }) => {
    if (!user || !profile) return;

    setLoading(true);
    setLoadingText('正在为您定制阅读方案...');
    try {
      const updatedProfile = {
        ...profile,
        profile: surveyData
      };
      await setDoc(doc(db, 'users', user.uid), updatedProfile);
      setProfile(updatedProfile);

      // Map to test settings
      let count = 5;
      let type = '混合';
      let bias = ['记忆力', '理解力', '推理力'];

      if (profile.isVIP) {
        count = 10;
        if (surveyData.expertiseLevel === '专家') count = 15;
      } else {
        if (surveyData.expertiseLevel === '专家') count = 5; // Still 5 for non-VIP
        else if (surveyData.expertiseLevel === '进阶') count = 5; // Still 5 for non-VIP
      }

      if (surveyData.readingPurpose === '考试考证') {
        type = '单选';
        bias = ['记忆力', '理解力'];
      } else if (surveyData.readingPurpose === '学术研究') {
        bias = ['推理力', '辩证力', '理解力'];
      } else if (surveyData.readingPurpose === '兴趣爱好') {
        bias = ['文学鉴赏', '表达力', '理解力'];
      }

      const newSettings = {
        ...testSettings,
        count,
        type,
        bias,
        language: '中文'
      };
      setTestSettings(newSettings);
      
      setView('MAIN');
      setActiveTab('HOME');
    } catch (err) {
      console.error('Onboarding error:', err);
      setError('保存偏好失败，请重试');
    } finally {
      setLoading(false);
      setLoadingText('');
    }
  };

  const fetchUserBooks = async (uid: string) => {
    try {
      const q = query(
        collection(db, 'userBooks'),
        where('userId', '==', uid),
        orderBy('addedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const fetched = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as UserBook))
        .filter(book => book.isDeleted !== true);
      setUserBooks(fetched);
      return fetched;
    } catch (err) {
      console.error('Error fetching user books:', err);
      return [];
    }
  };

  const fetchRecords = async (uid: string) => {
    try {
      const q = query(
        collection(db, 'testSessions'),
        where('userId', '==', uid),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const allFetchedRecords = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TestSession));
      const fetchedRecords = allFetchedRecords.filter(record => record.status !== 'archived');
      setAllRecords(allFetchedRecords);
      setRecords(fetchedRecords);
      return fetchedRecords;
    } catch (err) {
      console.error('Error fetching records:', err);
      return [];
    }
  };

  const syncBooksFromRecords = async (uid: string, currentRecords: TestSession[], currentBooks: UserBook[]) => {
    const bookTitlesInBookshelf = new Set(currentBooks.map(b => b.title));
    const uniqueBooksFromRecords = currentRecords.reduce((acc, record) => {
      if (!bookTitlesInBookshelf.has(record.bookTitle)) {
        if (!acc.find(b => b.title === record.bookTitle)) {
          acc.push({
            title: record.bookTitle,
            author: '历史记录书籍',
            publisher: '未知出版社',
            summary: '从历史测试记录中同步的书籍。',
            toc: record.settings.range || []
          });
        }
      }
      return acc;
    }, [] as any[]);

    if (uniqueBooksFromRecords.length > 0) {
      for (const book of uniqueBooksFromRecords) {
        // Try to find the actual book to get the TOC
        const bookQuery = query(collection(db, 'books'), where('title', '==', book.title));
        const bookSnapshot = await getDocs(bookQuery);
        let fullToc: string[] = [];
        let author = book.author;
        let publisher = book.publisher;
        let summary = book.summary;

        if (!bookSnapshot.empty) {
          const bookData = bookSnapshot.docs[0].data() as Book;
          fullToc = bookData.toc || [];
          author = bookData.author;
          publisher = bookData.publisher;
          summary = bookData.summary;
        }

        const bookRecords = currentRecords.filter(r => r.bookTitle === book.title);
        const testedChapters = Array.from(new Set(bookRecords.flatMap(r => r.settings.range || [])));
        const allScores = bookRecords.map(r => r.score);
        const averageScore = allScores.length > 0 ? Math.round(allScores.reduce((sum, s) => sum + s, 0) / allScores.length) : 0;
        
        const completionRate = fullToc.length > 0 ? Math.round((testedChapters.length / fullToc.length) * 100) : 0;
        
        let mastery = 0;
        if (fullToc.length > 0) {
          const chapterMaxScores: Record<string, number> = {};
          fullToc.forEach(chapter => { chapterMaxScores[chapter] = 0; });
          bookRecords.forEach(record => {
            const range = record.settings.range || [];
            range.forEach(chapter => {
              if (chapterMaxScores[chapter] !== undefined) {
                chapterMaxScores[chapter] = Math.max(chapterMaxScores[chapter], record.score);
              }
            });
          });
          const totalScore = Object.values(chapterMaxScores).reduce((sum, s) => sum + s, 0);
          mastery = Math.round(totalScore / fullToc.length);
        }

        const newUb: UserBook = {
          userId: uid,
          title: book.title,
          author,
          publisher,
          summary,
          toc: fullToc,
          addedAt: Date.now(),
          testedChapters: testedChapters,
          completionRate,
          averageScore,
          mastery
        };
        
        await addDoc(collection(db, 'userBooks'), newUb);
      }
      await fetchUserBooks(uid);
    }
  };

  const deleteBook = async (bookId: string, cascade: boolean) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'userBooks', bookId), { isDeleted: true });
      if (cascade) {
        const q = query(collection(db, 'testSessions'), where('bookId', '==', bookId));
        const snapshot = await getDocs(q);
        for (const d of snapshot.docs) {
          await updateDoc(d.ref, { status: 'archived' });
        }
      }
      setUserBooks(prev => prev.filter(b => b.id !== bookId));
      if (cascade) {
        setRecords(prev => prev.filter(r => r.bookId !== bookId));
      }
      await fetchUserBooks(user.uid);
      await fetchRecords(user.uid);
    } catch (err) {
      console.error('Error deleting book:', err);
    }
  };

  const batchDeleteBooks = async (bookIds: Set<string>, cascade: boolean) => {
    if (!user) return;
    setLoading(true);
    setLoadingText('正在批量删除...');
    try {
      for (const bookId of bookIds) {
        await updateDoc(doc(db, 'userBooks', bookId), { isDeleted: true });
        if (cascade) {
          const q = query(collection(db, 'testSessions'), where('bookId', '==', bookId));
          const snapshot = await getDocs(q);
          for (const d of snapshot.docs) {
            await updateDoc(d.ref, { status: 'archived' });
          }
        }
      }
      setUserBooks(prev => prev.filter(b => !bookIds.has(b.id!)));
      setRecords(prev => prev.filter(r => !bookIds.has(r.bookId))); // If cascade, records should also disappear
      await fetchUserBooks(user.uid);
      await fetchRecords(user.uid);
      setSelectedBatchItems(new Set());
      setIsBatchDeleteModalOpen(false);
      setIsBatchEditMode(false);
    } catch (err) {
      console.error('Error batch deleting books:', err);
    } finally {
      setLoading(false);
    }
  };

  const batchDeleteRecords = async (recordIds: Set<string>) => {
    if (!user) return;
    setLoading(true);
    setLoadingText('正在批量删除...');
    try {
      for (const recordId of recordIds) {
        await updateDoc(doc(db, 'testSessions', recordId), { status: 'archived' });
      }
      setRecords(prev => prev.filter(r => !recordIds.has(r.id!)));
      await fetchRecords(user.uid);
      setSelectedBatchItems(new Set());
      setIsBatchDeleteModalOpen(false);
      setIsBatchEditMode(false);
    } catch (err) {
      console.error('Error batch deleting records:', err);
    } finally {
      setLoading(false);
    }
  };

  const batchDeleteMistakes = async (mistakeIds: Set<string>) => {
    if (!user) return;
    setLoading(true);
    setLoadingText('正在批量删除...');
    try {
      for (const mistakeId of mistakeIds) {
        await deleteDoc(doc(db, 'wrongQuestions', mistakeId));
      }
      setWrongQuestions(prev => prev.filter(q => !mistakeIds.has(q.id!)));
      await fetchWrongQuestions(user.uid);
      setSelectedBatchItems(new Set());
      setIsBatchDeleteModalOpen(false);
      setIsBatchEditMode(false);
    } catch (err) {
      console.error('Error batch deleting mistakes:', err);
    } finally {
      setLoading(false);
    }
  };

  const batchDeleteRecordAnswers = async (recordId: string, answerIndices: Set<string>) => {
    if (!user || !selectedRecord) return;
    setLoading(true);
    setLoadingText('正在批量删除...');
    try {
      const newAnswers = selectedRecord.answers.filter((_, idx) => !answerIndices.has(idx.toString()));
      const newScore = newAnswers.length > 0 ? Math.round((newAnswers.filter(a => a.isCorrect).length / newAnswers.length) * 100) : 0;
      await updateDoc(doc(db, 'testSessions', recordId), { answers: newAnswers, score: newScore });
      
      const updatedRecord = { ...selectedRecord, answers: newAnswers, score: newScore };
      setSelectedRecord(updatedRecord);
      
      await fetchRecords(user.uid);
      setSelectedBatchItems(new Set());
      setIsBatchDeleteModalOpen(false);
      setIsBatchEditMode(false);
    } catch (err) {
      console.error('Error batch deleting record answers:', err);
    } finally {
      setLoading(false);
    }
  };

  const archiveRecord = async (recordId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'testSessions', recordId), { status: 'archived' });
      setRecords(prev => prev.filter(r => r.id !== recordId));
      await fetchRecords(user.uid);
    } catch (err) {
      console.error('Error archiving record:', err);
    }
  };

  const markAsMastered = async (questionId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'wrongQuestions', questionId), { status: 'mastered' });
      setWrongQuestions(prev => prev.filter(q => q.id !== questionId));
      await fetchWrongQuestions(user.uid);
    } catch (err) {
      console.error('Error marking as mastered:', err);
    }
  };

  const fetchWrongQuestions = async (uid: string) => {
    try {
      const q = query(
        collection(db, 'wrongQuestions'),
        where('userId', '==', uid),
        orderBy('nextReviewDate', 'asc')
      );
      const querySnapshot = await getDocs(q);
      const fetched = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as WrongQuestion))
        .filter(q => q.status !== 'mastered');
      setWrongQuestions(fetched);
    } catch (err) {
      console.error('Error fetching wrong questions:', err);
    }
  };
  const deleteAccount = async () => {
    if (!profile || !user) return;
    
    const confirm = window.confirm('确定要注销账号吗？这将永久删除您的所有数据，且无法恢复。');
    if (!confirm) return;
    
    setLoading(true);
    setLoadingText('正在注销账号并清理数据...');
    try {
      // 1. Delete testSessions
      const sessionsQuery = query(collection(db, 'testSessions'), where('userId', '==', user.uid));
      const sessionsSnap = await getDocs(sessionsQuery);
      for (const d of sessionsSnap.docs) {
        await deleteDoc(d.ref);
      }

      // 2. Delete userBooks
      const booksQuery = query(collection(db, 'userBooks'), where('userId', '==', user.uid));
      const booksSnap = await getDocs(booksQuery);
      for (const d of booksSnap.docs) {
        await deleteDoc(d.ref);
      }

      // 3. Delete wrongQuestions
      const wrongQuery = query(collection(db, 'wrongQuestions'), where('userId', '==', user.uid));
      const wrongSnap = await getDocs(wrongQuery);
      for (const d of wrongSnap.docs) {
        await deleteDoc(d.ref);
      }

      // 4. Delete user profile
      await deleteDoc(doc(db, 'users', user.uid));
      
      // 5. Sign out
      await signOut(auth);
      
      // 6. Reset state
      setProfile(null);
      setUser(null);
      setView('AUTH');
    } catch (err) {
      console.error('Delete account failed:', err);
      handleFirestoreError(err, OperationType.DELETE, 'users');
    } finally {
      setLoading(false);
      setLoadingText('');
    }
  };

  const fetchProfile = async (uid: string) => {
    const path = `users/${uid}`;
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        // Check VIP expiry
        if (data.isVIP && data.vipExpiry && data.vipExpiry < Date.now()) {
          data.isVIP = false;
          await setDoc(doc(db, 'users', uid), data);
        }
        setProfile(data);
        return data;
      } else {
        const newProfile: UserProfile = {
          uid,
          displayName: auth.currentUser?.displayName || '新伙伴',
          photoURL: auth.currentUser?.photoURL || '',
          stats: {
            readingCount: 0,
            totalQuestions: 0,
            averageScore: 0,
            abilityRadar: {
              memory: 50,
              understanding: 50,
              reasoning: 50,
              dialectic: 50,
              expression: 50,
              appreciation: 50
            }
          },
          isVIP: false
        };
        await setDoc(docRef, newProfile);
        setProfile(newProfile);
        return newProfile;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
      return null;
    }
  };

  const toggleAnalysis = (idx: number) => {
    setExpandedAnalysisIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError('登录失败，请重试');
    }
  };

  const handleLogout = () => signOut(auth);

  const handleBuyVip = async () => {
    if (!profile || !user) return;
    setIsVipLoading(true);
    try {
      const updatedProfile = { 
        ...profile, 
        isVIP: true,
        vipExpiry: Date.now() + 365 * 24 * 60 * 60 * 1000 // 1 year
      };
      await setDoc(doc(db, 'users', user.uid), updatedProfile);
      setProfile(updatedProfile);
      setIsVipModalOpen(false);
      setToastMessage('恭喜！您已成功开通 VIP 会员');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Failed to update VIP status', err);
      setError('开通失败，请稍后重试');
    } finally {
      setIsVipLoading(false);
    }
  };

  const applyManualRange = () => {
    if (!selectedBook) return;
    const ranges = manualRangeText.split(/[,，]/);
    const newRange: string[] = [];
    const toc = selectedBook.toc || [];
    
    ranges.forEach(r => {
      const range = r.trim();
      if (range.includes('-') || range.includes('~')) {
        const parts = range.split(/[-~]/).map(n => parseInt(n.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          const s = Math.max(1, Math.min(parts[0], parts[1]));
          const e = Math.min(toc.length, Math.max(parts[0], parts[1]));
          for (let i = s; i <= e; i++) {
            newRange.push(toc[i - 1]);
          }
        }
      } else {
        const n = parseInt(range);
        if (!isNaN(n) && n >= 1 && n <= toc.length) {
          newRange.push(toc[n - 1]);
        }
      }
    });
    
    if (newRange.length > 0) {
      const combined = Array.from(new Set([...testSettings.range, ...newRange]));
      if (combined.length > 3) {
        setToastMessage('单次测试最多选择3个章节');
        setTimeout(() => setToastMessage(null), 2000);
        return;
      }
      setTestSettings(prev => ({ ...prev, range: combined }));
      setShowManualRange(false);
      setManualRangeText('');
    }
  };

  // --- Helpers ---
  const getAnswerLetters = (answer: string | string[], options: string[]) => {
    if (!options) return '-';
    if (Array.isArray(answer)) {
      return answer.map(a => String.fromCharCode(65 + options.indexOf(a))).sort().join(', ');
    }
    const idx = options.indexOf(answer);
    return idx !== -1 ? String.fromCharCode(65 + idx) : '-';
  };

  // --- Voice Narration ---
  useEffect(() => {
    // Warm up voices
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const speak = (question: Question) => {
    try {
      stopSpeaking();
      setIsSpeaking(true);

      const getLangCode = (langName: string) => {
        const map: Record<string, string> = {
          '中文': 'zh-CN',
          '英文': 'en-US',
          '西班牙语': 'es-ES',
          '法语': 'fr-FR',
          '德语': 'de-DE',
          '日语': 'ja-JP',
          '韩语': 'ko-KR',
          '俄语': 'ru-RU',
          '葡萄牙语': 'pt-BR',
          '阿拉伯语': 'ar-SA'
        };
        return map[langName] || 'zh-CN';
      };

      const getOptionsText = (langName: string) => {
        const map: Record<string, string> = {
          '中文': '选项如下：',
          '英文': 'Options: ',
          '西班牙语': 'Opciones: ',
          '法语': 'Options: ',
          '德语': 'Optionen: ',
          '日语': '選択肢：',
          '韩语': '옵션:',
          '俄语': 'Варианты:',
          '葡萄牙语': 'Opções:',
          '阿拉伯语': 'الخيارات:'
        };
        return map[langName] || 'Options: ';
      };

      let textToRead = question.question;
      if (question.options && question.options.length > 0) {
        textToRead += " " + getOptionsText(selectedLanguage);
        question.options.forEach((opt, idx) => {
          textToRead += ` ${String.fromCharCode(65 + idx)}. ${opt}.`;
        });
      }

      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.lang = getLangCode(selectedLanguage);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("TTS Error:", error);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // --- Quiz Timer ---

  // Timer logic moved to QuizTimer component

  // --- Business Logic ---

  const resetUserData = () => {
    setResetConfirmationText('');
    setIsResetModalOpen(true);
  };

  const confirmResetData = async () => {
    if (!profile || !user) return;
    
    setIsResetModalOpen(false);
    
    setLoading(true);
    setLoadingText('正在彻底清理数据...');
    try {
      // 1. Delete testSessions
      const sessionsQuery = query(collection(db, 'testSessions'), where('userId', '==', user.uid));
      const sessionsSnap = await getDocs(sessionsQuery);
      for (const d of sessionsSnap.docs) {
        await deleteDoc(d.ref);
      }

      // 2. Delete userBooks
      const booksQuery = query(collection(db, 'userBooks'), where('userId', '==', user.uid));
      const booksSnap = await getDocs(booksQuery);
      for (const d of booksSnap.docs) {
        await deleteDoc(d.ref);
      }

      // 3. Delete wrongQuestions
      const wrongQuery = query(collection(db, 'wrongQuestions'), where('userId', '==', user.uid));
      const wrongSnap = await getDocs(wrongQuery);
      for (const d of wrongSnap.docs) {
        await deleteDoc(d.ref);
      }

      // 4. Reset profile stats and onboarding
      const resetStats: UserStats = {
        readingCount: 0,
        totalQuestions: 0,
        averageScore: 0,
        abilityRadar: {
          memory: 50,
          understanding: 50,
          reasoning: 50,
          dialectic: 50,
          expression: 50,
          appreciation: 50
        }
      };
      const updatedProfile = { ...profile, stats: resetStats };
      delete updatedProfile.profile; // Remove onboarding data
      
      await setDoc(doc(db, 'users', user.uid), updatedProfile);
      setProfile(updatedProfile);
      
      // 5. Refresh local state & Reset UI to initial state
      setRecords([]);
      setAllRecords([]);
      setWrongQuestions([]);
      setUserBooks([]);
      
      // 6. Trigger onboarding again
      setView('ONBOARDING');
      setActiveTab('HOME');
      setSearchQuery('');
      setSearchResults([]);
      setSelectedBook(null);
      setSessionResult(null);
      setQuestions([]);
      setUserAnswers([]);
      setSelectedRecord(null);
      setSelectedAnswerBook(null);
      setIsWrongQuestionRetest(null);
      
      // Reset navigation
      setView('MAIN');
      setActiveTab('HOME');
      setHomeSubView('SEARCH');
      
    } catch (err) {
      console.error('Error resetting data:', err);
      setError(`清理过程中发生错误: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
      setLoadingText('');
    }
  };

  const recalculateStats = async () => {
    if (!profile || !user) return;
    
    setLoading(true);
    setLoadingText('正在重新核算数据...');
    try {
      const sessionsQuery = query(collection(db, 'testSessions'), where('userId', '==', user.uid));
      const sessionsSnap = await getDocs(sessionsQuery);
      const allRecords = sessionsSnap.docs
        .map(d => d.data() as TestSession)
        .filter(r => r.status !== 'archived');
      
      const booksQuery = query(collection(db, 'userBooks'), where('userId', '==', user.uid));
      const booksSnap = await getDocs(booksQuery);
      const allUserBooks = booksSnap.docs
        .map(d => d.data() as UserBook)
        .filter(b => !b.isDeleted);

      const totalQuestions = allRecords.reduce((sum, r) => sum + r.answers.length, 0);
      const averageScore = allRecords.length > 0 
        ? Math.round(allRecords.reduce((sum, r) => sum + r.score, 0) / allRecords.length) 
        : 0;
      const uniqueBooks = new Set(allRecords.map(r => r.bookTitle));
      const readingCount = uniqueBooks.size;

      // Recalculate Ability Radar
      const abilityRadar = {
        memory: 50,
        understanding: 50,
        reasoning: 50,
        dialectic: 50,
        expression: 50,
        appreciation: 50
      };

      const biasMap: Record<string, keyof typeof abilityRadar> = {
        '记忆力': 'memory',
        '理解力': 'understanding',
        '推理力': 'reasoning',
        '辩证力': 'dialectic',
        '表达力': 'expression',
        '文学鉴赏': 'appreciation'
      };

      allRecords.forEach(r => {
        const biases = Array.isArray(r.settings.bias) ? r.settings.bias : [r.settings.bias];
        biases.forEach(b => {
          const key = biasMap[b];
          if (key) {
            abilityRadar[key] = Math.min(100, abilityRadar[key] + (r.score / (10 * biases.length)));
          }
        });
      });

      const updatedStats: UserStats = {
        readingCount,
        totalQuestions,
        averageScore,
        abilityRadar
      };

      await setDoc(doc(db, 'users', user.uid), { ...profile, stats: updatedStats });
      setProfile({ ...profile, stats: updatedStats });
      
    } catch (err) {
      console.error('Error recalculating stats:', err);
      setError('核算失败，请重试。');
    } finally {
      setLoading(false);
      setLoadingText('');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    const cacheKey = `${searchQuery.trim()}-${selectedLanguage}`;
    if (searchCache[cacheKey]) {
      setSearchResults(searchCache[cacheKey]);
      return;
    }

    setLoading(true);
    setLoadingText('正在知识库中匹配书籍...');
    setError(null);
    setSearchResults([]);
    
    try {
      // Use Gemini to search for books
      const results = await geminiService.searchBooks(searchQuery.trim(), selectedLanguage);
      setSearchResults(results);
      
      // Cache results
      setSearchCache(prev => ({ ...prev, [cacheKey]: results }));
      
      if (results.length === 0) {
        setError('未找到相关书籍，请尝试其他关键词');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('搜索失败，请稍后重试');
    } finally {
      setLoading(false);
      setLoadingText('');
    }
  };

  const handleSelectBook = async (book: Book) => {
    const cacheKey = `${book.title}-${book.author}-full`;
    if (bookCache[cacheKey]) {
      setSelectedBook(bookCache[cacheKey]);
    } else {
      setSelectedBook(book);
    }
    
    // Reset range for new book, but preserve other settings
    setTestSettings(prev => ({ ...prev, range: [] }));
    setIsTocExpanded(false);
    setIsBookModalOpen(true);
  };

  const handleConfirmBook = async () => {
    if (!selectedBook) return;

    setIsBookModalOpen(false);

    const cacheKey = `${selectedBook.title}-${selectedBook.author}-full`;
    if (bookCache[cacheKey]) {
      setSelectedBook(bookCache[cacheKey]);
      setSettingsBackTarget('SEARCH');
      setHomeSubView('SETTINGS');
      setTestSettings(prev => ({ ...prev, range: [] }));
      return;
    }

    setLoading(true);
    setLoadingText('正在生成完整目录...');
    try {
      const details = await geminiService.generateBookDetails({ title: selectedBook.title, author: selectedBook.author }, (chunk) => {
        setLoadingText('正在深度解析书籍目录...');
      });
      const fullBook = { ...selectedBook, toc: details.toc };
      setSelectedBook(fullBook);
      
      // Cache details
      setBookCache(prev => ({ ...prev, [cacheKey]: fullBook }));
      
      setSettingsBackTarget('SEARCH');
      setHomeSubView('SETTINGS');
      setTestSettings(prev => ({ ...prev, range: [] }));
    } catch (err) {
      console.error('Error generating TOC:', err);
      setError('获取书籍目录失败');
    } finally {
      setLoading(false);
      setLoadingText('');
    }
  };

  const addToBookshelf = async (book: Book) => {
    if (!user) return;
    try {
      const existingBook = userBooks.find(b => b.title === book.title);
      if (!existingBook) {
        const newBook: UserBook = {
          userId: user.uid,
          title: book.title,
          author: book.author,
          publisher: book.publisher,
          summary: book.summary,
          toc: book.toc || [],
          testedChapters: [],
          completionRate: 0,
          averageScore: 0,
          mastery: 0,
          addedAt: Date.now()
        };
        await addDoc(collection(db, 'userBooks'), newBook);
        await fetchUserBooks(user.uid);
      }
    } catch (err) {
      console.error('Error adding book to bookshelf:', err);
    }
  };

  const collectBook = async () => {
    if (!profile || !selectedBook) return;
    setLoading(true);
    setLoadingText('正在收藏书籍...');
    try {
      // Check if book already exists
      const existingBook = userBooks.find(b => b.title === selectedBook.title);
      if (!existingBook) {
        const newBook: UserBook = {
          userId: profile.uid,
          title: selectedBook.title,
          author: selectedBook.author,
          publisher: selectedBook.publisher,
          summary: selectedBook.summary,
          toc: selectedBook.toc || [],
          testedChapters: [],
          completionRate: 0,
          averageScore: 0,
          mastery: 0,
          addedAt: Date.now(),
          isDeleted: false
        };
        await addDoc(collection(db, 'userBooks'), newBook);
        await fetchUserBooks(profile.uid);
      }
      setToastMessage(`《${selectedBook.title}》已经成功收藏`);
      setTimeout(() => {
        setToastMessage(null);
      }, 1500);
    } catch (err) {
      console.error('Error collecting book:', err);
      setError('收藏书籍失败');
    } finally {
      setLoading(false);
      setLoadingText('');
    }
  };

  const startQuiz = async () => {
    if (!selectedBook) return;
    
    // Validation
    const missingFields = [];
    if (testSettings.range.length === 0) missingFields.push('测试范围');
    if (testSettings.count === 0) missingFields.push('题量');
    if (!testSettings.type) missingFields.push('题型');
    if (!testSettings.bias || testSettings.bias.length === 0) missingFields.push('偏向');

    if (missingFields.length > 0) {
      setError(`请先完成以下必填设置：${missingFields.join('、')}`);
      setTimeout(() => setError(null), 4000);
      return;
    }

    setLoading(true);
    setLoadingText('AI 正在为您精心构思题目...');
    try {
      const generatedQuestions = await geminiService.generateQuestions({
        bookTitle: selectedBook.title,
        range: testSettings.range,
        count: testSettings.count,
        type: testSettings.type,
        bias: Array.isArray(testSettings.bias) ? testSettings.bias.join('+') : testSettings.bias,
        examMode: testSettings.examMode,
        language: selectedLanguage,
        userProfile: profile?.profile
      }, (chunk) => {
        setLoadingText('AI 正在为您精心出题...');
      });
      setQuestions(generatedQuestions);
      // Initialize answers based on question type
      setUserAnswers(generatedQuestions.map(q => q.isMultiple ? [] : ''));
      setCurrentQuestionIndex(0);
      setQuizStartTime(Date.now());
      setView('QUIZ');
    } catch (err) {
      setError('生成题目失败，请重试');
    } finally {
      setLoading(false);
      setLoadingText('');
    }
  };

  const submitQuiz = async () => {
    if (!selectedBook || !profile) return;

    // 1. Handle Wrong Question Retest (Optimized: No AI, Local Judgment)
    if (isWrongQuestionRetest) {
      setLoading(true);
      setLoadingText('正在保存测试结果...');
      
      try {
        const uAns = userAnswers[0];
        const q = questions[0];
        const cAns = q.correctAnswer;
        
        let isCorrect = false;
        if (q.isMultiple) {
          const uArr = Array.isArray(uAns) ? [...uAns].sort() : [];
          const cArr = Array.isArray(cAns) ? [...cAns].sort() : [];
          isCorrect = JSON.stringify(uArr) === JSON.stringify(cArr);
        } else {
          isCorrect = uAns === cAns;
        }

        const answer: AnswerRecord = {
          question: q.question,
          options: q.options,
          userAnswer: uAns,
          correctAnswer: cAns,
          isCorrect,
          analysis: q.analysis,
          isMultiple: q.isMultiple,
          bias: q.bias,
          source: q.source
        };

        // Update wrong question record (SRS logic)
        const qScore = isCorrect ? 5 : 1; // 5 for correct, 1 for wrong
        await srsService.updateWrongQuestionSRS(
          isWrongQuestionRetest.id!, 
          qScore, 
          { 
            n: isWrongQuestionRetest.repetition || 0, 
            ef: isWrongQuestionRetest.efactor || 2.5, 
            i: isWrongQuestionRetest.interval || 1 
          }
        );
        
        await fetchWrongQuestions(profile.uid);

        const session: TestSession = {
          userId: profile.uid,
          bookId: selectedBook.id || 'unknown',
          bookTitle: selectedBook.title,
          settings: { ...testSettings, language: selectedLanguage },
          score: isCorrect ? 100 : 0,
          timestamp: new Date().toISOString(),
          answers: [answer],
          evaluation: isCorrect ? '恭喜你，这道错题已经被你攻克了！' : '很遗憾，这道题还需要继续巩固。',
          correctRate: isCorrect ? 100 : 0,
          completionRate: 100,
          timeUsed: Math.floor((Date.now() - quizStartTime) / 1000)
        };
        
        setSessionResult(session);
        setIsWrongQuestionRetest(null);
        setView('RESULT');
      } catch (err) {
        console.error('Retest submission failed:', err);
        handleFirestoreError(err, OperationType.WRITE, 'wrongQuestions');
      } finally {
        setLoading(false);
        setLoadingText('');
      }
      return;
    }

    // 2. Handle Regular Quiz
    setLoading(true);
    setLoadingText('正在判定答案并生成评价...');
    try {
      const answers: AnswerRecord[] = questions.map((q, i) => {
        const uAns = userAnswers[i];
        const cAns = q.correctAnswer;
        
        let isCorrect = false;
        if (q.isMultiple) {
          const uArr = Array.isArray(uAns) ? [...uAns].sort() : [];
          const cArr = Array.isArray(cAns) ? [...cAns].sort() : [];
          isCorrect = JSON.stringify(uArr) === JSON.stringify(cArr);
        } else {
          isCorrect = uAns === cAns;
        }

        return {
          question: q.question,
          options: q.options,
          userAnswer: uAns,
          correctAnswer: cAns,
          isCorrect,
          analysis: q.analysis,
          isMultiple: q.isMultiple,
          bias: q.bias,
          source: q.source
        };
      });

      const correctCount = answers.filter(a => a.isCorrect).length;
      const score = Math.round((correctCount / questions.length) * 100);
      const correctRate = score;
      const answeredCount = answers.filter(a => {
        if (Array.isArray(a.userAnswer)) return a.userAnswer.length > 0;
        return a.userAnswer !== '';
      }).length;
      const completionRate = Math.round((answeredCount / questions.length) * 100);
      const timeUsed = Math.floor((Date.now() - quizStartTime) / 1000);

      let evaluation = '评价生成中...';
      try {
        evaluation = await geminiService.generateEvaluation(answers, profile?.profile);
      } catch (aiErr) {
        console.error('AI Evaluation failed:', aiErr);
        evaluation = '评价生成失败，请稍后查看。';
      }

      const session: TestSession = {
        userId: profile.uid,
        bookId: selectedBook.id || 'unknown',
        bookTitle: selectedBook.title,
        settings: { ...testSettings, language: selectedLanguage },
        score,
        timestamp: new Date().toISOString(),
        answers,
        evaluation,
        correctRate,
        completionRate,
        timeUsed
      };

      // Save to Firestore
      await addDoc(collection(db, 'testSessions'), session);

      // Save wrong questions
      const wrongAnswers = answers.filter(a => !a.isCorrect);
      for (const wa of wrongAnswers) {
        await srsService.addWrongQuestion(profile.uid, {
          bookTitle: selectedBook.title,
          question: wa.question,
          options: wa.options,
          correctAnswer: wa.correctAnswer,
          userAnswer: wa.userAnswer,
          isMultiple: wa.isMultiple,
          analysis: wa.analysis,
          bias: wa.bias,
          source: wa.source
        });
      }
      await fetchWrongQuestions(profile.uid);

      setSessionResult(session);
      
      const newStats = { ...profile.stats };
      newStats.totalQuestions += questions.length;
      
      // Correctly calculate readingCount (unique books)
      const uniqueBooks = new Set(records.map(r => r.bookTitle));
      uniqueBooks.add(selectedBook.title);
      newStats.readingCount = uniqueBooks.size;
      
      // Correctly calculate averageScore
      const totalScore = records.reduce((sum, r) => sum + r.score, 0) + score;
      newStats.averageScore = Math.round(totalScore / (records.length + 1));
      
      const biasMap: Record<string, keyof UserStats['abilityRadar']> = {
        '记忆力': 'memory',
        '理解力': 'understanding',
        '推理力': 'reasoning',
        '辩证力': 'dialectic',
        '表达力': 'expression',
        '文学鉴赏': 'appreciation'
      };
      
      const biases = Array.isArray(testSettings.bias) ? testSettings.bias : [testSettings.bias];
      biases.forEach(b => {
        const key = biasMap[b];
        if (key) {
          newStats.abilityRadar[key] = Math.min(100, newStats.abilityRadar[key] + (score / (10 * biases.length)));
        }
      });

      await setDoc(doc(db, 'users', profile.uid), { ...profile, stats: newStats });
      setProfile({ ...profile, stats: newStats });
      await fetchRecords(profile.uid);
      
      // Update UserBook
      const ubQuery = query(
        collection(db, 'userBooks'),
        where('userId', '==', profile.uid),
        where('title', '==', selectedBook.title)
      );
      const ubSnapshot = await getDocs(ubQuery);
      
      const bookRecords = records.filter(r => r.bookTitle === selectedBook.title);
      // Include the current session in the average calculation
      const allScores = [...bookRecords.map(r => r.score), score];
      const averageScore = Math.round(allScores.reduce((sum, s) => sum + s, 0) / allScores.length);

      let testedChapters = [...testSettings.range];
      const toc = selectedBook.toc || [];
      
      let mastery = 0;
      if (toc.length > 0) {
        const chapterMaxScores: Record<string, number> = {};
        toc.forEach(chapter => { chapterMaxScores[chapter] = 0; });
        
        // Include past records
        bookRecords.forEach(record => {
          const range = record.settings.range || [];
          range.forEach(chapter => {
            if (chapterMaxScores[chapter] !== undefined) {
              chapterMaxScores[chapter] = Math.max(chapterMaxScores[chapter], record.score);
            }
          });
        });
        
        // Include current session
        testSettings.range.forEach(chapter => {
          if (chapterMaxScores[chapter] !== undefined) {
            chapterMaxScores[chapter] = Math.max(chapterMaxScores[chapter], score);
          }
        });
        
        const totalScore = Object.values(chapterMaxScores).reduce((sum, s) => sum + s, 0);
        mastery = Math.round(totalScore / toc.length);
      }

      if (!ubSnapshot.empty) {
        const existingUb = ubSnapshot.docs[0].data() as UserBook;
        testedChapters = Array.from(new Set([...existingUb.testedChapters, ...testSettings.range]));
        const completionRate = toc.length > 0 
          ? Math.round((testedChapters.length / toc.length) * 100) 
          : 0;
        
        await setDoc(ubSnapshot.docs[0].ref, {
          ...existingUb,
          testedChapters,
          completionRate,
          averageScore,
          mastery
        });
      } else {
        const completionRate = toc.length > 0 
          ? Math.round((testedChapters.length / toc.length) * 100) 
          : 0;
        
        const newUb: UserBook = {
          userId: profile.uid,
          title: selectedBook.title,
          author: selectedBook.author,
          publisher: selectedBook.publisher,
          summary: selectedBook.summary,
          toc: toc,
          testedChapters,
          completionRate,
          averageScore,
          mastery,
          addedAt: Date.now()
        };
        await addDoc(collection(db, 'userBooks'), newUb);
      }
      await fetchUserBooks(profile.uid);

      setView('RESULT');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'testSessions');
    } finally {
      setLoading(false);
      setLoadingText('');
    }
  };

  const generatePoster = async () => {
    const element = document.getElementById('result-poster');
    if (!element) return;
    
    try {
      setIsGeneratingPoster(true);
      setError(null);
      
      // html-to-image is more robust against modern CSS like oklab/oklch
      const image = await htmlToImage.toPng(element, {
        quality: 1,
        pixelRatio: 3,
        backgroundColor: '#ffffff'
      });
      
      setPosterImage(image);
      setIsPosterModalOpen(true);
    } catch (error) {
      console.error('Failed to generate poster:', error);
      setError('生成海报失败，请重试');
    } finally {
      setIsGeneratingPoster(false);
    }
  };

  if (loading && view === 'AUTH') {
    return (
      <div className="min-h-screen bg-stone-200 flex items-center justify-center sm:p-4">
        <div className="w-full max-w-[430px] h-[100dvh] sm:h-[90dvh] bg-[#fafaf9] relative overflow-hidden flex items-center justify-center shadow-2xl sm:rounded-[40px] sm:border-[12px] sm:border-stone-800">
          <Loader2 className="w-8 h-8 text-[#064e3b] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-200 flex items-center justify-center sm:p-4 font-sans selection:bg-[#064e3b]/20 text-[#1c1917]">
      <div className="w-full max-w-[430px] h-[100dvh] sm:h-[90dvh] bg-[#fafaf9] relative overflow-hidden flex flex-col shadow-2xl sm:rounded-[40px] sm:border-[12px] sm:border-stone-800 transform-gpu">
        {user && (
          <header className="sticky top-0 left-0 right-0 h-16 bg-white/70 backdrop-blur-xl border-b border-stone-200/50 z-50 px-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('SEARCH')}>
              <div className="w-9 h-9 bg-[#064e3b] rounded-[14px] flex items-center justify-center shadow-sm shadow-[#064e3b]/10 group-hover:scale-105 transition-transform">
                <BookIcon className="w-5 h-5 text-white" />
              </div>
              <span className="font-serif font-bold text-xl tracking-tight text-[#064e3b]">彤宝阅读伙伴</span>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsShareModalOpen(true)}
                className="p-2 text-stone-400 hover:text-[#064e3b] transition-colors rounded-full hover:bg-stone-50"
                title="分享"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <div className="w-9 h-9 rounded-full bg-stone-200 overflow-hidden border-2 border-white shadow-sm">
                <img src={profile?.photoURL || 'https://picsum.photos/seed/user/100/100'} alt="Avatar" referrerPolicy="no-referrer" />
              </div>
              <button onClick={handleLogout} className="p-2 text-stone-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </header>
        )}

        <main 
          ref={mainScrollRef}
          className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden px-4 w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]", 
          (view === 'QUIZ' || (view === 'MAIN' && activeTab === 'QUESTION_BOOK' && selectedRecord)) && 'max-w-4xl',
          (view === 'MAIN' && activeTab === 'HOME' && homeSubView === 'SETTINGS') ? 'pb-0' : 'pb-24'
        )}>
          {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-[100] flex flex-col items-center justify-center text-center p-6">
            <div className="w-12 h-12 bg-[#064e3b] rounded-2xl flex items-center justify-center mb-4 animate-bounce shadow-lg shadow-[#064e3b]/20">
              <BookIcon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-stone-800 mb-1">请稍候</h3>
            <p className="text-stone-500 text-xs max-w-[200px]">{loadingText || '正在处理中...'}</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {view === 'AUTH' && (
            <motion.div 
              key="auth"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center min-h-[80vh] text-center"
            >
              <div className="w-28 h-28 bg-[#064e3b] rounded-[32px] flex items-center justify-center mb-10 shadow-xl shadow-[#064e3b]/20">
                <BookIcon className="w-14 h-14 text-white" />
              </div>
              <h1 className="text-4xl font-serif font-bold mb-6 tracking-tight text-[#064e3b]">开启深度阅读之旅</h1>
              <p className="text-stone-500 mb-12 max-w-sm text-lg leading-relaxed">AI 驱动的智能阅读测评系统，伴你读懂每一本书。</p>
              <Button size="lg" onClick={handleLogin}>使用 Google 账号登录</Button>
            </motion.div>
          )}

          {view === 'ONBOARDING' && user && (
            <Onboarding 
              displayName={user.displayName || '新伙伴'} 
              onComplete={handleOnboardingComplete} 
            />
          )}

          {view === 'MAIN' && (
            <motion.div
              key="main"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              {selectedRecord ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => {
                          setSelectedRecord(null);
                          setExpandedAnalysisIndices(new Set());
                        }}
                        className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                      >
                        <ChevronLeft className="w-6 h-6 text-stone-600" />
                      </button>
                      <h2 className="text-2xl font-bold">测试详情</h2>
                    </div>
                    <button 
                      onClick={() => setIsBatchEditMode(!isBatchEditMode)}
                      className={cn("p-2 rounded-full transition-colors", isBatchEditMode ? "bg-red-50 text-red-500" : "text-stone-400 hover:bg-stone-50")}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <Card className="p-6 space-y-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold text-stone-800">《{selectedRecord.bookTitle}》</h3>
                        <p className="text-stone-400 text-sm mt-1">{new Date(selectedRecord.timestamp).toLocaleString()}</p>
                      </div>
                      <div className={cn(
                        "text-4xl font-black",
                        selectedRecord.score >= 90 ? "text-[#064e3b]" :
                        selectedRecord.score >= 60 ? "text-amber-500" : "text-red-500"
                      )}>
                        {selectedRecord.score}<span className="text-sm font-bold ml-1">分</span>
                      </div>
                    </div>

                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 italic text-stone-600 text-sm leading-relaxed">
                      “{selectedRecord.evaluation}”
                    </div>

                    <div className="flex gap-3">
                      <Button 
                        size="lg" 
                        className="flex-1 bg-[#064e3b] hover:bg-[#043d2e] text-white shadow-lg shadow-[#064e3b]/20"
                        onClick={() => {
                          const book = userBooks.find(b => b.title === selectedRecord.bookTitle);
                          if (book) {
                            setSelectedBook({
                              title: book.title,
                              author: book.author,
                              publisher: book.publisher,
                              summary: book.summary,
                              toc: book.toc
                            });
                          } else {
                            setSelectedBook({ title: selectedRecord.bookTitle, author: '', publisher: '', summary: '', toc: selectedRecord.settings.range || [] });
                          }
                          
                          setTestSettings({
                            range: selectedRecord.settings.range,
                            count: selectedRecord.settings.count,
                            type: selectedRecord.settings.type,
                            bias: selectedRecord.settings.bias,
                            examMode: selectedRecord.settings.examMode,
                            language: selectedRecord.settings.language || '中文'
                          });
                          setSelectedLanguage(selectedRecord.settings.language || '中文');
                          
                          const retestQuestions: Question[] = selectedRecord.answers.map(ans => ({
                            question: ans.question,
                            options: ans.options,
                            correctAnswer: ans.correctAnswer,
                            isMultiple: ans.isMultiple,
                            analysis: ans.analysis,
                            bias: ans.bias,
                            source: ans.source
                          }));
                          
                          setQuestions(retestQuestions);
                          setUserAnswers(retestQuestions.map(q => q.isMultiple ? [] : ''));
                          setCurrentQuestionIndex(0);
                          setQuizStartTime(Date.now());
                          setView('QUIZ');
                        }}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" /> 全部重测
                      </Button>
                      {selectedRecord.answers.some(a => !a.isCorrect) && (
                        <Button 
                          size="lg" 
                          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20"
                          onClick={() => {
                            const book = userBooks.find(b => b.title === selectedRecord.bookTitle);
                            if (book) {
                              setSelectedBook({
                                title: book.title,
                                author: book.author,
                                publisher: book.publisher,
                                summary: book.summary,
                                toc: book.toc
                              });
                            } else {
                              setSelectedBook({ title: selectedRecord.bookTitle, author: '', publisher: '', summary: '', toc: selectedRecord.settings.range || [] });
                            }
                            
                            setTestSettings({
                              range: selectedRecord.settings.range,
                              count: selectedRecord.settings.count,
                              type: selectedRecord.settings.type,
                              bias: selectedRecord.settings.bias,
                              examMode: selectedRecord.settings.examMode,
                              language: selectedRecord.settings.language || '中文'
                            });
                            setSelectedLanguage(selectedRecord.settings.language || '中文');
                            
                            const mistakeQuestions: Question[] = selectedRecord.answers
                              .filter(ans => !ans.isCorrect)
                              .map(ans => ({
                                question: ans.question,
                                options: ans.options,
                                correctAnswer: ans.correctAnswer,
                                isMultiple: ans.isMultiple,
                                analysis: ans.analysis,
                                bias: ans.bias,
                                source: ans.source
                              }));
                            
                            setQuestions(mistakeQuestions);
                            setUserAnswers(mistakeQuestions.map(q => q.isMultiple ? [] : ''));
                            setCurrentQuestionIndex(0);
                            setQuizStartTime(Date.now());
                            setView('QUIZ');
                          }}
                        >
                          <AlertCircle className="w-4 h-4 mr-2" /> 只测错题
                        </Button>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest">答题回顾</h4>
                      <div className="space-y-4">
                        {selectedRecord.answers.map((ans, idx) => {
                          const isExpanded = expandedAnalysisIndices.has(idx);
                          return (
                            <div key={idx} className="flex items-start gap-3">
                              {isBatchEditMode && (
                                <div 
                                  className="flex-shrink-0 cursor-pointer p-2 mt-2"
                                  onClick={() => {
                                    const newSet = new Set(selectedBatchItems);
                                    const key = idx.toString();
                                    if (newSet.has(key)) newSet.delete(key);
                                    else newSet.add(key);
                                    setSelectedBatchItems(newSet);
                                  }}
                                >
                                  <div className={cn(
                                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                                    selectedBatchItems.has(idx.toString()) ? "bg-red-500 border-red-500" : "border-stone-300"
                                  )}>
                                    {selectedBatchItems.has(idx.toString()) && <CheckCircle2 className="w-4 h-4 text-white" />}
                                  </div>
                                </div>
                              )}
                              <div className="p-4 rounded-2xl border border-stone-100 space-y-2 flex-grow">
                                <div 
                                  className="flex items-start gap-3 cursor-pointer group"
                                  onClick={() => {
                                    if (isBatchEditMode) {
                                      const newSet = new Set(selectedBatchItems);
                                      const key = idx.toString();
                                      if (newSet.has(key)) newSet.delete(key);
                                      else newSet.add(key);
                                      setSelectedBatchItems(newSet);
                                      return;
                                    }
                                    toggleAnalysis(idx);
                                  }}
                                >
                                <div className={cn(
                                  "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                                  ans.isCorrect ? "bg-[#064e3b]/10 text-[#064e3b]" : "bg-red-100 text-red-600"
                                )}>
                                  {ans.isCorrect ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                </div>
                                <div className="flex-grow">
                                  <div className="flex items-center gap-2">
                                    <div className="font-medium text-stone-800 text-sm group-hover:text-[#064e3b] transition-colors">{ans.question}</div>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePlayAudio(ans.question, `rec-q-${idx}`);
                                      }}
                                      className={cn(
                                        "p-1 rounded-full transition-colors",
                                        isPlayingAudio === `rec-q-${idx}` ? "bg-[#064e3b] text-white" : "text-stone-300 hover:bg-stone-100"
                                      )}
                                    >
                                      <Volume2 className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                  <div className="text-[9px] text-stone-300 mt-0.5 group-hover:text-[#064e3b]/60 transition-colors flex items-center gap-1">
                                    {isExpanded ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                                    {isExpanded ? '点击收起解析' : '点击查看解析'}
                                  </div>
                                </div>
                                <ChevronDown className={cn(
                                  "w-4 h-4 text-stone-300 transition-transform duration-300",
                                  isExpanded && "rotate-180"
                                )} />
                              </div>
                              
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="pl-8 pt-2 space-y-1">
                                      <div className="text-xs text-stone-500">
                                        <span className="font-bold">你的答案：</span>
                                        <span className={ans.isCorrect ? "text-[#064e3b]" : "text-red-600"}>
                                          {Array.isArray(ans.userAnswer) ? ans.userAnswer.join('、') : ans.userAnswer}
                                        </span>
                                      </div>
                                      {!ans.isCorrect && (
                                        <div className="text-xs text-stone-500">
                                          <span className="font-bold">正确答案：</span>
                                          <span className="text-[#064e3b]">
                                            {Array.isArray(ans.correctAnswer) ? ans.correctAnswer.join('、') : ans.correctAnswer}
                                          </span>
                                        </div>
                                      )}
                                      <div className="mt-2 p-3 bg-stone-50 rounded-xl text-[11px] text-stone-500 leading-relaxed">
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="font-bold text-stone-700 block">解析：</span>
                                          <button 
                                            onClick={() => handlePlayAudio(ans.analysis, `rec-a-${idx}`)}
                                            className={cn(
                                              "p-1 rounded-full transition-colors",
                                              isPlayingAudio === `rec-a-${idx}` ? "bg-[#064e3b] text-white" : "text-stone-300 hover:bg-stone-200"
                                            )}
                                          >
                                            <Volume2 className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                        {ans.analysis}
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-stone-100">
                      <p className="text-[10px] text-stone-400 text-center uppercase tracking-widest">
                        测试结束，建议根据解析进行针对性复习
                      </p>
                    </div>
                  </Card>
                  
                  {isBatchEditMode && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="fixed bottom-24 left-0 right-0 px-4 z-40"
                    >
                      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-stone-200 p-4 flex items-center justify-between">
                        <div className="text-sm font-medium text-stone-600">
                          已选择 <span className="text-[#064e3b] font-bold">{selectedBatchItems.size}</span> 项
                        </div>
                        <div className="flex gap-3">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              if (selectedBatchItems.size === selectedRecord.answers.length) {
                                setSelectedBatchItems(new Set());
                              } else {
                                setSelectedBatchItems(new Set(selectedRecord.answers.map((_, idx) => idx.toString())));
                              }
                            }}
                          >
                            {selectedBatchItems.size === selectedRecord.answers.length ? '取消全选' : '全选'}
                          </Button>
                          <Button 
                            variant="danger" 
                            size="sm"
                            disabled={selectedBatchItems.size === 0}
                            onClick={() => setIsBatchDeleteModalOpen(true)}
                          >
                            批量删除
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setIsBatchEditMode(false);
                              setSelectedBatchItems(new Set());
                            }}
                          >
                            关闭
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              ) : (
                <>
                  {activeTab === 'HOME' && (
                <div className="space-y-8">
                  {homeSubView === 'SEARCH' && (
                    <div className="space-y-8">
                      <div className="text-center space-y-3 mt-4">
                        <h2 className="text-3xl font-serif font-bold tracking-tight text-[#064e3b]">今天读了哪本书？</h2>
                        <p className="text-stone-500 text-lg">输入书名，开启你的深度阅读测试</p>
                      </div>

                      <div className="space-y-5">
                          <div className="relative group">
                            <input 
                              type="text" 
                              placeholder="输入书名，例如《西游记》..."
                              className="w-full h-16 pl-14 pr-16 bg-white border border-stone-200/80 rounded-[24px] shadow-sm focus:ring-4 focus:ring-[#064e3b]/10 focus:border-[#064e3b] transition-all outline-none text-lg group-hover:border-stone-300 placeholder:text-stone-400"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-stone-400" />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                              {searchQuery && (
                                <button 
                                  onClick={() => {
                                    setSearchQuery('');
                                    setSearchResults([]);
                                  }}
                                  className="p-2 text-stone-300 hover:text-stone-500 transition-colors"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              )}
                              <Button 
                                size="sm"
                                onClick={handleSearch}
                                isLoading={loading}
                              >
                                搜索
                              </Button>
                            </div>
                          </div>
                      </div>

                      {error && (
                        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-xl text-sm">
                          <AlertCircle className="w-4 h-4" />
                          {error}
                        </div>
                      )}

                      <div className="space-y-4">
                        {searchResults.length > 0 ? (
                          searchResults.map((book, index) => (
                            <Card 
                              key={index} 
                              className="p-5 hover:border-[#064e3b]/30 transition-all cursor-pointer group flex gap-5 items-center"
                              onClick={() => handleSelectBook(book)}
                            >
                              <div className="w-20 h-28 bg-stone-100 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center border border-stone-200/50 shadow-inner">
                                <img 
                                  src={book.coverURL || `https://picsum.photos/seed/${encodeURIComponent(book.title)}/200/300`} 
                                  alt={book.title} 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              <div className="flex-grow min-w-0 py-1">
                                {/* Future: Book details (title, author, publisher, summary) can be fetched from database */}
                                <h3 className="font-serif font-bold text-xl text-stone-800 group-hover:text-[#064e3b] transition-colors truncate">{book.title}</h3>
                                <div className="flex gap-3 text-xs text-stone-500 mt-1.5 font-medium">
                                  <span className="bg-stone-100 px-2 py-0.5 rounded-md">{book.author}</span>
                                  <span className="bg-stone-100 px-2 py-0.5 rounded-md">{book.publisher}</span>
                                </div>
                                <p className="text-sm text-stone-500 mt-3 line-clamp-2 leading-relaxed">
                                  {book.summary}
                                </p>
                              </div>
                              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-stone-50 group-hover:bg-[#064e3b]/5 transition-colors flex-shrink-0">
                                <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-[#064e3b] transition-colors" />
                              </div>
                            </Card>
                          ))
                        ) : searchQuery && !loading && !error && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center py-16 space-y-5"
                          >
                            <div className="w-20 h-20 bg-stone-100 rounded-[24px] flex items-center justify-center mx-auto shadow-inner">
                              <Search className="w-8 h-8 text-stone-300" />
                            </div>
                            <div className="space-y-2">
                              <p className="text-[#1c1917] font-serif font-bold text-lg">未找到相关书籍</p>
                              <p className="text-stone-500 text-sm">尝试输入更准确的书名或作者名</p>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  )}

                  {homeSubView === 'SETTINGS' && selectedBook && (
                    <div className="space-y-6 relative">
                      <div className="sticky top-0 z-10 bg-[#fafaf9]/95 backdrop-blur-md pb-3 pt-2 border-b border-stone-200/50 flex items-center justify-between -mx-4 px-4">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            if (settingsBackTarget === 'QUESTION_BOOK') {
                              setActiveTab('QUESTION_BOOK');
                            }
                            setHomeSubView('SEARCH');
                          }} 
                          className="rounded-[16px]"
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" /> {settingsBackTarget === 'QUESTION_BANK' ? '返回题库' : '返回搜索'}
                        </Button>
                        <span className="text-[#064e3b] text-sm font-bold font-serif">《{selectedBook.title}》</span>
                      </div>

                      <div className="space-y-6">
                        <section className="space-y-2">
                          <label className="text-sm font-bold text-stone-500 uppercase tracking-wider">
                            书籍简介
                          </label>
                          <div 
                            onClick={() => setIsBookDetailModalOpen(true)}
                            className="bg-white rounded-[24px] p-4 border border-stone-100 shadow-sm flex items-center gap-4 cursor-pointer hover:bg-stone-50 transition-all group relative active:scale-[0.98]"
                          >
                            <div 
                              className="flex-shrink-0 rounded-lg overflow-hidden shadow-sm border border-stone-100"
                              style={{ height: '2.4cm', width: '1.7cm' }}
                            >
                              <img 
                                src={selectedBook.coverURL || `https://picsum.photos/seed/${encodeURIComponent(selectedBook.title)}/200/300`} 
                                alt={selectedBook.title} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                              <h3 className="font-serif font-bold text-stone-800 truncate mb-0.5">《{selectedBook.title}》</h3>
                              <p className="text-stone-500 text-[10px] truncate mb-1.5">{selectedBook.author}</p>
                              <div className="relative">
                                <p className="text-stone-400 text-[10px] leading-relaxed line-clamp-2">
                                  {selectedBook.summary}
                                </p>
                                <div className="text-[10px] text-stone-400 font-bold mt-1 flex items-center">
                                  <span>...点击查看详情</span>
                                  <ChevronRight className="w-3 h-3 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </section>

                        {/* Test Range section */}
                        <section className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                              <span>测试范围 (最多3章) 
                                { (selectedBook.toc && selectedBook.toc.length > 0) ? (
                                  <span className={cn(
                                    "font-normal ml-1",
                                    testSettings.range.length > 3 ? "text-red-500 font-bold" : "text-[#064e3b]"
                                  )}>
                                    ({testSettings.range.length}/{selectedBook.toc.length})
                                  </span>
                                ) : (
                                  <span className="text-stone-400 font-normal ml-1">(全书)</span>
                                )}
                                <span className="text-red-500">*</span>
                              </span>
                              {testSettings.range.length > 0 && testSettings.range.length <= 3 && <CheckCircle2 className="w-4 h-4 text-[#064e3b]" />}
                              {testSettings.range.length > 3 && <AlertCircle className="w-4 h-4 text-red-500" />}
                            </label>
                            <div className="flex gap-3">
                              <button 
                                onClick={() => setShowManualRange(!showManualRange)}
                                className="text-xs font-bold text-stone-500 hover:text-stone-700 transition-colors"
                              >
                                {showManualRange ? '关闭输入' : '手动输入'}
                              </button>
                            </div>
                          </div>
                          
                          <AnimatePresence>
                            {showManualRange && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-stone-50 p-3 rounded-2xl border border-stone-100 flex gap-2 items-center overflow-hidden"
                              >
                                <input 
                                  type="text"
                                  value={manualRangeText}
                                  onChange={(e) => setManualRangeText(e.target.value)}
                                  placeholder="如: 1, 3, 5 (最多3个)"
                                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm placeholder:text-stone-300 p-0"
                                  onKeyDown={(e) => e.key === 'Enter' && applyManualRange()}
                                  autoFocus
                                />
                                <Button size="sm" onClick={applyManualRange} className="h-8 px-3 text-xs rounded-xl">应用</Button>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div 
                            className="grid grid-cols-1 gap-2 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-stone-200"
                            style={{ maxHeight: '250px' }}
                          >
                            {(selectedBook.toc || []).map((chapter) => {
                              const isTested = userBooks.find(b => b.title === selectedBook.title)?.testedChapters.includes(chapter);
                              const isSelected = testSettings.range.includes(chapter);
                              return (
                                <button
                                  key={chapter}
                                  onClick={() => {
                                    let newRange;
                                    if (isSelected) {
                                      newRange = testSettings.range.filter(r => r !== chapter);
                                    } else {
                                      if (testSettings.range.length >= 3) {
                                        setToastMessage('单次测试最多选择3个章节');
                                        setTimeout(() => setToastMessage(null), 2000);
                                        return;
                                      }
                                      newRange = [...testSettings.range, chapter];
                                    }
                                    setTestSettings({ ...testSettings, range: newRange });
                                  }}
                                  className={cn(
                                    "flex items-center justify-between p-4 rounded-[18px] border transition-all text-left",
                                    isSelected 
                                      ? "bg-[#064e3b]/5 border-[#064e3b]/30 text-[#064e3b] shadow-sm" 
                                      : "bg-white border-stone-200/80 hover:border-stone-300 hover:bg-stone-50"
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">{chapter}</span>
                                    {isTested && <span className="px-1.5 py-0.5 bg-stone-100 text-stone-500 text-[10px] font-bold rounded uppercase tracking-wider">已测</span>}
                                  </div>
                                  {isSelected && <CheckCircle2 className="w-4 h-4" />}
                                </button>
                              );
                            })}
                          </div>
                        </section>

                        <section className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                              <span>计时设置</span>
                            </label>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => setTestSettings({ ...testSettings, timerMode: 'COUNT_UP' })}
                              className={cn(
                                "flex flex-col items-center gap-1 p-3 rounded-2xl border transition-all",
                                testSettings.timerMode === 'COUNT_UP' ? "bg-[#064e3b]/5 border-[#064e3b] text-[#064e3b]" : "bg-white border-stone-100 text-stone-500"
                              )}
                            >
                              <Clock className="w-4 h-4" />
                              <span className="text-xs font-bold">正计时</span>
                            </button>
                            <button
                              onClick={() => setTestSettings({ ...testSettings, timerMode: 'COUNT_DOWN' })}
                              className={cn(
                                "flex flex-col items-center gap-1 p-3 rounded-2xl border transition-all",
                                testSettings.timerMode === 'COUNT_DOWN' ? "bg-[#064e3b]/5 border-[#064e3b] text-[#064e3b]" : "bg-white border-stone-100 text-stone-500"
                              )}
                            >
                              <History className="w-4 h-4" />
                              <span className="text-xs font-bold">倒计时</span>
                            </button>
                          </div>
                          {testSettings.timerMode === 'COUNT_DOWN' && (
                            <div className="flex items-center gap-3 bg-stone-50 p-3 rounded-2xl border border-stone-100">
                              <span className="text-xs text-stone-500 whitespace-nowrap">时长 (分钟)</span>
                              <input 
                                type="range"
                                min="5"
                                max="60"
                                step="5"
                                value={testSettings.timerValue || 20}
                                onChange={(e) => setTestSettings({ ...testSettings, timerValue: parseInt(e.target.value) })}
                                className="flex-1 accent-[#064e3b]"
                              />
                              <span className="text-sm font-bold text-[#064e3b] w-8">{testSettings.timerValue || 20}</span>
                            </div>
                          )}
                        </section>

                        <section className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                              <span>测试设置</span>
                              {!isAdvancedSettingsOpen && (
                                <span className="text-[10px] text-stone-400 font-normal lowercase flex items-center gap-1">
                                  <span className={cn(
                                    "px-1 rounded-[4px] font-bold text-[9px] uppercase",
                                    testSettings.bias.length === 6 ? "bg-amber-100 text-amber-700" : 
                                    testSettings.bias.length >= 3 ? "bg-blue-100 text-blue-700" : "bg-stone-100 text-stone-500"
                                  )}>
                                    {testSettings.bias.length === 6 ? '全面' : testSettings.bias.length >= 3 ? '进阶' : '基础'}
                                  </span>
                                  <span>· {testSettings.count}题 · {testSettings.type} · {testSettings.language}</span>
                                </span>
                              )}
                            </label>
                            <button 
                              onClick={() => setIsAdvancedSettingsOpen(!isAdvancedSettingsOpen)}
                              className="text-xs font-bold text-[#064e3b] hover:text-[#043d2e] transition-colors"
                            >
                              {isAdvancedSettingsOpen ? '收起高级设置' : '展开高级设置'}
                            </button>
                          </div>

                          <AnimatePresence>
                            {isAdvancedSettingsOpen && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-6 overflow-hidden pt-2"
                              >
                                <section className="space-y-2">
                                  <label className="text-sm font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                                    <span>快捷模式</span>
                                  </label>
                                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                                    {[
                                      { name: '快速热身（基础）', count: 5, type: '单选', bias: ['记忆力'], language: '中文' },
                                      { name: '标准自测（均衡）', count: 10, type: '混合', bias: ['记忆力', '理解力', '推理力'], language: '中文' },
                                      { name: '深度挑战（全面）', count: 15, type: '混合', bias: ['记忆力', '理解力', '推理力', '辩证力', '表达力', '文学鉴赏'], language: '中文' },
                                    ].map(preset => {
                                      const isActive = testSettings.count === preset.count && 
                                                      testSettings.type === preset.type &&
                                                      testSettings.language === preset.language &&
                                                      testSettings.bias.length === preset.bias.length && 
                                                      testSettings.bias.every(b => preset.bias.includes(b));
                                      return (
                                        <button
                                          key={preset.name}
                                          onClick={() => {
                                            setTestSettings({ ...testSettings, ...preset });
                                            setSelectedLanguage(preset.language);
                                          }}
                                          className={cn(
                                            "whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-bold transition-all",
                                            isActive
                                              ? "bg-[#064e3b] text-white shadow-sm"
                                              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                                          )}
                                        >
                                          {preset.name}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </section>

                                <section className="space-y-2">
                                  <label className="text-sm font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                                    <span>题量选择 <span className="text-red-500">*</span></span>
                                    {testSettings.count > 0 && <CheckCircle2 className="w-4 h-4 text-[#064e3b]" />}
                                  </label>
                                  <div className="flex gap-3">
                                    {[5, 10, 15].map(n => {
                                      const isVIPOnly = n > 5;
                                      const canSelect = !isVIPOnly || profile?.isVIP;
                                      return (
                                        <button
                                          key={n}
                                          onClick={() => {
                                            if (!canSelect) {
                                              setToastMessage('10题及以上需开通 VIP 会员');
                                              setTimeout(() => setToastMessage(null), 2000);
                                              return;
                                            }
                                            setTestSettings({ ...testSettings, count: n });
                                          }}
                                          className={cn(
                                            "flex-1 py-3 rounded-xl border font-medium transition-all relative overflow-hidden",
                                            testSettings.count === n ? "bg-[#064e3b] border-[#064e3b] text-white" : "bg-white border-stone-100",
                                            !canSelect && "opacity-60"
                                          )}
                                        >
                                          {n} 题
                                          {isVIPOnly && !profile?.isVIP && (
                                            <div className="absolute top-0 right-0 bg-amber-400 text-[8px] px-1 font-black text-white rounded-bl-lg">VIP</div>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </section>

                                <section className="space-y-2">
                                  <label className="text-sm font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                                    <span>题型选择 <span className="text-red-500">*</span></span>
                                    {testSettings.type !== '' && <CheckCircle2 className="w-4 h-4 text-[#064e3b]" />}
                                  </label>
                                  <div className="grid grid-cols-3 gap-3">
                                    {['单选', '多选', '填空', '判断', '主观', '混合'].map(t => (
                                      <button
                                        key={t}
                                        onClick={() => setTestSettings({ ...testSettings, type: t })}
                                        className={cn(
                                          "py-3 rounded-xl border font-medium transition-all text-sm",
                                          testSettings.type === t ? "bg-[#064e3b] border-[#064e3b] text-white" : "bg-white border-stone-100"
                                        )}
                                      >
                                        {t}
                                      </button>
                                    ))}
                                  </div>
                                </section>

                                <section className="space-y-2">
                                  <label className="text-sm font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                                    <span>出题偏向 <span className="text-red-500">*</span></span>
                                    {testSettings.bias.length > 0 && <CheckCircle2 className="w-4 h-4 text-[#064e3b]" />}
                                  </label>
                                  <div className="grid grid-cols-3 gap-2">
                                    {['记忆力', '理解力', '推理力', '辩证力', '表达力', '文学鉴赏'].map(b => (
                                      <button
                                        key={b}
                                        onClick={() => {
                                          const newBias = testSettings.bias.includes(b)
                                            ? testSettings.bias.filter(item => item !== b)
                                            : [...testSettings.bias, b];
                                          setTestSettings({ ...testSettings, bias: newBias });
                                        }}
                                        className={cn(
                                          "py-3 rounded-xl border text-xs transition-all",
                                          testSettings.bias.includes(b) ? "bg-[#064e3b] border-[#064e3b] text-white" : "bg-white border-stone-100"
                                        )}
                                      >
                                        {b}
                                      </button>
                                    ))}
                                  </div>
                                  
                                  {testSettings.bias.length === 6 && (
                                    <motion.div 
                                      initial={{ opacity: 0, y: 5 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2"
                                    >
                                      <div className="w-4 h-4 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 text-[10px] font-bold mt-0.5">!</div>
                                      <div className="text-[10px] text-amber-700 leading-relaxed">
                                        <b>深度挑战模式：</b>将开启全维度测评（记忆/理解/推理/辩证/表达/鉴赏）。建议预留 10-15 分钟专注思考。
                                      </div>
                                    </motion.div>
                                  )}
                                </section>

                                <section className="space-y-2">
                                  <label className="text-sm font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                                    <span>测试语言</span>
                                  </label>
                                  <div 
                                    onClick={() => setIsLanguageModalOpen(true)}
                                    className="bg-white rounded-xl p-3 border border-stone-100 shadow-sm flex items-center justify-between cursor-pointer hover:bg-stone-50 transition-all"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-[#064e3b]/5 flex items-center justify-center text-[#064e3b]">
                                        <Globe2 className="w-4 h-4" />
                                      </div>
                                      <div>
                                        <div className="text-xs font-bold text-stone-800">选择语言</div>
                                        <div className="text-[10px] text-stone-400">当前: {LANGUAGES.find(l => l.name === selectedLanguage)?.flag} {selectedLanguage}</div>
                                      </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-stone-300" />
                                  </div>
                                </section>

                                <section className="space-y-2">
                                  <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100 relative overflow-hidden">
                                    {!profile?.isVIP && (
                                      <div className="absolute top-0 right-0 bg-amber-400 text-[8px] px-2 py-0.5 font-black text-white rounded-bl-lg">VIP 专属</div>
                                    )}
                                    <div>
                                      <div className="text-sm font-bold text-stone-800">应试强化模式</div>
                                      <div className="text-[10px] text-stone-400">侧重网络真题与高频考点 (非必选)</div>
                                    </div>
                                    <button 
                                      onClick={() => {
                                        if (!profile?.isVIP) {
                                          setToastMessage('应试强化模式需开通 VIP 会员');
                                          setTimeout(() => setToastMessage(null), 2000);
                                          return;
                                        }
                                        setTestSettings({ ...testSettings, examMode: !testSettings.examMode });
                                      }}
                                      className={cn(
                                        "w-12 h-6 rounded-full transition-all relative",
                                        testSettings.examMode ? "bg-[#064e3b]" : "bg-stone-200",
                                        !profile?.isVIP && "opacity-60"
                                      )}
                                    >
                                      <div className={cn(
                                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                        testSettings.examMode ? "left-7" : "left-1"
                                      )} />
                                    </button>
                                  </div>
                                </section>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </section>
                      </div>

                      <div className="sticky bottom-0 left-0 right-0 -mx-4 px-4 pt-4 pb-28 bg-[#fafaf9]/95 backdrop-blur-md border-t border-stone-200/50 z-40 mt-6">
                        <div className="max-w-2xl mx-auto">
                          <Button 
                            className="w-full" 
                            size="lg" 
                            onClick={startQuiz} 
                            isLoading={loading}
                          >
                            开始答题
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'QUESTION_BOOK' && !selectedRecord && (
                <div className="space-y-6">
                  {selectedAnswerBook ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => setSelectedAnswerBook(null)}
                            className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                          >
                            <ArrowLeft className="w-5 h-5 text-stone-600" />
                          </button>
                          <div>
                            <h2 className="text-2xl font-bold text-stone-800">
                              {answerBookSubView === 'RECORDS' ? '答题记录' : '错题集'}
                            </h2>
                            <p className="text-xs text-stone-400 font-medium">{selectedAnswerBook}</p>
                          </div>
                        </div>
                        {!isBatchEditMode && (
                          <div className="flex items-center gap-2">
                            <div className="flex bg-stone-100 p-1 rounded-xl">
                              <button
                                onClick={() => setAnswerBookSubView('RECORDS')}
                                className={cn(
                                  "px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all",
                                  answerBookSubView === 'RECORDS' ? "bg-white text-[#064e3b] shadow-sm" : "text-stone-400"
                                )}
                              >
                                记录
                              </button>
                              <button
                                onClick={() => setAnswerBookSubView('MISTAKES')}
                                className={cn(
                                  "px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1",
                                  answerBookSubView === 'MISTAKES' ? "bg-white text-[#064e3b] shadow-sm" : "text-stone-400"
                                )}
                              >
                                错题
                                {wrongQuestions.filter(q => q.bookTitle === selectedAnswerBook && q.status !== 'mastered').length > 0 && (
                                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                                )}
                              </button>
                            </div>
                            {answerBookSubView === 'RECORDS' && records.filter(r => r.bookTitle === selectedAnswerBook).length > 0 && (
                              <button 
                                onClick={() => {
                                  setIsBatchEditMode(true);
                                  setAnswerBookSubView('RECORDS');
                                }}
                                className="p-2 text-stone-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        {answerBookSubView === 'RECORDS' ? (
                          records.filter(r => r.bookTitle === selectedAnswerBook).length === 0 ? (
                            <div className="text-center py-20 bg-stone-50 rounded-[32px] border-2 border-dashed border-stone-200">
                              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                                <History className="w-8 h-8 text-stone-300" />
                              </div>
                              <p className="text-stone-400 font-medium">暂无测试记录</p>
                              <Button 
                                variant="ghost" 
                                className="mt-4 text-[#064e3b]"
                                onClick={() => {
                                  const book = userBooks.find(b => b.title === selectedAnswerBook);
                                  if (book) {
                                    setSelectedBook({
                                      title: book.title,
                                      author: book.author,
                                      publisher: book.publisher,
                                      summary: book.summary,
                                      toc: book.toc
                                    });
                                    setView('HOME');
                                    setActiveTab('HOME');
                                  }
                                }}
                              >
                                去测试一次
                              </Button>
                            </div>
                          ) : (
                            records.filter(r => r.bookTitle === selectedAnswerBook).map((record, i) => (
                              <div key={record.id || i} className="flex items-center gap-3">
                                {isBatchEditMode && (
                                  <div 
                                    className="flex-shrink-0 cursor-pointer p-2"
                                    onClick={() => {
                                      const newSet = new Set(selectedBatchItems);
                                      if (newSet.has(record.id!)) newSet.delete(record.id!);
                                      else newSet.add(record.id!);
                                      setSelectedBatchItems(newSet);
                                    }}
                                  >
                                    <div className={cn(
                                      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                                      selectedBatchItems.has(record.id!) ? "bg-red-500 border-red-500" : "border-stone-300"
                                    )}>
                                      {selectedBatchItems.has(record.id!) && <CheckCircle2 className="w-4 h-4 text-white" />}
                                    </div>
                                  </div>
                                )}
                                <Card 
                                  className="p-5 flex items-center justify-between cursor-pointer group hover:border-[#064e3b]/30 transition-all flex-grow"
                                  onClick={() => {
                                    if (isBatchEditMode) {
                                      const newSet = new Set(selectedBatchItems);
                                      if (newSet.has(record.id!)) newSet.delete(record.id!);
                                      else newSet.add(record.id!);
                                      setSelectedBatchItems(newSet);
                                      return;
                                    }
                                    setSelectedRecord(record);
                                  }}
                                >
                                  <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 bg-stone-50 rounded-2xl flex flex-col items-center justify-center border border-stone-100 group-hover:bg-[#064e3b]/5 transition-colors">
                                      <div className="text-lg font-black text-stone-800 group-hover:text-[#064e3b]">{record.score}</div>
                                      <div className="text-[8px] font-bold text-stone-400 uppercase tracking-widest">分</div>
                                    </div>
                                    <div>
                                      <div className="font-bold text-stone-800 text-lg group-hover:text-[#064e3b] transition-colors">
                                        {new Date(record.timestamp).toLocaleString()}
                                      </div>
                                      <div className="text-xs text-stone-500 mt-1 font-medium">
                                        范围: {record.settings.range.join('、')} | {record.settings.count}题 | {record.settings.bias}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-stone-50 group-hover:bg-[#064e3b]/5 transition-colors flex-shrink-0">
                                    <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-[#064e3b] transition-colors" />
                                  </div>
                                </Card>
                              </div>
                            ))
                          )
                        ) : (
                          // Mistakes View
                          <div className="space-y-4">
                            {wrongQuestions.filter(q => q.bookTitle === selectedAnswerBook && q.status !== 'mastered').length === 0 ? (
                              <div className="text-center py-20 bg-stone-50 rounded-[32px] border-2 border-dashed border-stone-200">
                                <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                                  <Trophy className="w-8 h-8 text-amber-400" />
                                </div>
                                <p className="text-stone-400 font-medium">太棒了！目前没有错题</p>
                              </div>
                            ) : (
                              <>
                                {(() => {
                                  const due = wrongQuestions.filter(q => q.bookTitle === selectedAnswerBook && q.status !== 'mastered' && q.nextReviewDate <= Date.now());
                                  if (due.length > 0) {
                                    return (
                                      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                                            <Clock className="w-5 h-5 text-amber-600" />
                                          </div>
                                          <div>
                                            <div className="text-sm font-bold text-amber-900">有 {due.length} 道错题到期</div>
                                            <div className="text-[10px] text-amber-700">根据 SRS 算法，现在是复习的最佳时机</div>
                                          </div>
                                        </div>
                                        <Button 
                                          size="sm" 
                                          className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl h-9 text-xs font-bold"
                                          onClick={() => {
                                            setIsWrongQuestionRetest(due[0]);
                                            setQuestions([due[0] as any]);
                                            setUserAnswers(['']);
                                            setCurrentQuestionIndex(0);
                                            setQuizStartTime(Date.now());
                                            setView('QUIZ');
                                          }}
                                        >
                                          立即复习
                                        </Button>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                                
                                {wrongQuestions.filter(q => q.bookTitle === selectedAnswerBook && q.status !== 'mastered').map((wq, i) => (
                                  <Card key={wq.id || i} className="p-5 border-stone-200/60 hover:border-[#064e3b]/30 transition-all group">
                                    <div className="flex justify-between items-start mb-3">
                                      <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 bg-red-50 text-red-500 text-[10px] font-bold rounded uppercase tracking-wider">
                                          错误 {wq.wrongCount} 次
                                        </span>
                                        <span className="px-2 py-0.5 bg-stone-100 text-stone-500 text-[10px] font-bold rounded uppercase tracking-wider">
                                          阶段 {wq.reviewStage}
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-stone-400 font-medium">
                                        下次复习: {new Date(wq.nextReviewDate).toLocaleDateString()}
                                      </div>
                                    </div>
                                    <h4 className="font-bold text-stone-800 mb-4 line-clamp-2 leading-relaxed">{wq.question}</h4>
                                    <div className="flex items-center justify-between pt-4 border-t border-stone-50">
                                      <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                                        <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{wq.bias}</span>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-8 text-[10px] font-bold text-stone-400 hover:text-stone-600"
                                          onClick={() => {
                                            // View analysis
                                            setSelectedRecord({
                                              question: wq.question,
                                              options: wq.options,
                                              userAnswer: wq.userAnswer,
                                              correctAnswer: wq.correctAnswer,
                                              isCorrect: false,
                                              analysis: wq.analysis,
                                              isMultiple: wq.isMultiple,
                                              bias: wq.bias,
                                              source: wq.source
                                            } as any);
                                          }}
                                        >
                                          查看解析
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          className="h-8 bg-[#064e3b] hover:bg-[#043d2e] text-white text-[10px] font-bold rounded-lg"
                                          onClick={() => {
                                            setIsWrongQuestionRetest(wq);
                                            setQuestions([wq as any]);
                                            setUserAnswers(['']);
                                            setCurrentQuestionIndex(0);
                                            setQuizStartTime(Date.now());
                                            setView('QUIZ');
                                          }}
                                        >
                                          重测
                                        </Button>
                                      </div>
                                    </div>
                                  </Card>
                                ))}
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {isBatchEditMode && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="fixed bottom-24 left-0 right-0 px-4 z-40"
                        >
                          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-stone-200 p-4 flex items-center justify-between">
                            <div className="text-sm font-medium text-stone-600">
                              已选择 <span className="text-[#064e3b] font-bold">{selectedBatchItems.size}</span> 项
                            </div>
                            <div className="flex gap-3">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  const items = records.filter(r => r.bookTitle === selectedAnswerBook);
                                  if (selectedBatchItems.size === items.length) {
                                    setSelectedBatchItems(new Set());
                                  } else {
                                    setSelectedBatchItems(new Set(items.map(i => i.id!)));
                                  }
                                }}
                              >
                                {selectedBatchItems.size === records.filter(r => r.bookTitle === selectedAnswerBook).length ? '取消全选' : '全选'}
                              </Button>
                              <Button 
                                variant="danger" 
                                size="sm"
                                disabled={selectedBatchItems.size === 0}
                                onClick={() => setIsBatchDeleteModalOpen(true)}
                              >
                                批量删除
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setIsBatchEditMode(false);
                                  setSelectedBatchItems(new Set());
                                }}
                              >
                                关闭
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="relative text-center space-y-3 mt-4">
                        <h2 className="text-3xl font-serif font-bold tracking-tight text-[#064e3b]">我的题库</h2>
                        <p className="text-stone-500 text-lg">记录每一次思考，攻克每一个难点</p>
                        
                        {wrongQuestions.filter(q => q.status !== 'mastered' && q.nextReviewDate <= Date.now()).length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-full text-amber-700 text-xs font-bold shadow-sm"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            有 {wrongQuestions.filter(q => q.status !== 'mastered' && q.nextReviewDate <= Date.now()).length} 道错题到期复习
                          </motion.div>
                        )}
                        {userBooks.length > 0 && (
                          <button 
                            onClick={() => setIsBatchEditMode(!isBatchEditMode)}
                            className={cn("absolute right-0 top-0 p-2 rounded-full transition-colors", isBatchEditMode ? "bg-red-50 text-red-500" : "text-stone-400 hover:bg-stone-50")}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-5">
                        {userBooks.length > 0 ? (
                          userBooks.map((ub, index) => (
                            <motion.div
                              key={ub.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="flex items-center gap-3"
                            >
                              {isBatchEditMode && (
                                <div 
                                  className="flex-shrink-0 cursor-pointer p-2"
                                  onClick={() => {
                                    const newSet = new Set(selectedBatchItems);
                                    if (newSet.has(ub.id!)) newSet.delete(ub.id!);
                                    else newSet.add(ub.id!);
                                    setSelectedBatchItems(newSet);
                                  }}
                                >
                                  <div className={cn(
                                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                                    selectedBatchItems.has(ub.id!) ? "bg-red-500 border-red-500" : "border-stone-300"
                                  )}>
                                    {selectedBatchItems.has(ub.id!) && <CheckCircle2 className="w-4 h-4 text-white" />}
                                  </div>
                                </div>
                              )}
                              <Card 
                                className="p-5 hover:border-[#064e3b]/30 transition-all cursor-pointer group flex gap-5 items-start flex-grow relative overflow-hidden"
                                onClick={() => {
                                  if (isBatchEditMode) {
                                    const newSet = new Set(selectedBatchItems);
                                    if (newSet.has(ub.id!)) newSet.delete(ub.id!);
                                    else newSet.add(ub.id!);
                                    setSelectedBatchItems(newSet);
                                    return;
                                  }
                                  setBookForAction(ub);
                                  setIsBookActionModalOpen(true);
                                }}
                              >
                                {/* Top Creation Date */}
                                <div className="absolute top-3 right-4 text-[10px] text-stone-400 font-medium">
                                  创建日期 {new Date(ub.addedAt).toLocaleDateString()}
                                </div>

                                <div className="w-20 h-28 bg-stone-100 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center border border-stone-200/50 shadow-inner mt-2">
                                  <img 
                                    src={ub.coverURL || `https://picsum.photos/seed/${encodeURIComponent(ub.title)}/200/300`} 
                                    alt={ub.title} 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <div className="flex-grow min-w-0 py-1 mt-2 pr-8">
                                  <h3 className="font-serif font-bold text-xl text-stone-800 group-hover:text-[#064e3b] transition-colors truncate pr-16">{ub.title}</h3>
                                  <div className="flex gap-3 text-xs text-stone-500 mt-1.5 font-medium">
                                    <span className="bg-stone-100 px-2 py-0.5 rounded-md">{ub.author}</span>
                                    <span className="bg-stone-100 px-2 py-0.5 rounded-md">{ub.publisher}</span>
                                  </div>
                                  <p className="text-sm text-stone-500 mt-3 line-clamp-2 leading-relaxed">
                                    {ub.summary}
                                  </p>
                                  <div className="mt-4 flex items-center justify-between w-full">
                                    <div className="flex flex-col gap-0.5">
                                      <div className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">测试章节</div>
                                      <div className="text-sm font-bold text-stone-700">{ub.testedChapters.length}/{ub.toc.length}</div>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                      <div className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">测试题量</div>
                                      <div className="text-sm font-bold text-stone-700">
                                        {(() => {
                                          const bookRecords = records.filter(r => r.bookTitle === ub.title);
                                          return bookRecords.reduce((acc, r) => acc + (r.answers?.length || 0), 0);
                                        })()}
                                      </div>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                      <div className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">掌握度</div>
                                      <div className="text-sm font-bold text-[#064e3b]">
                                        {ub.mastery}%
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                {!isBatchEditMode && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setBookToDelete(ub);
                                      setIsDeleteModalOpen(true);
                                    }}
                                    className="absolute bottom-3 right-3 text-stone-300 hover:text-red-500 p-2 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-stone-50 group-hover:bg-[#064e3b]/5 transition-colors flex-shrink-0">
                                  <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-[#064e3b] transition-colors" />
                                </div>
                              </Card>
                            </motion.div>
                          ))
                        ) : (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center py-20 bg-white rounded-[32px] border border-stone-200/60 shadow-sm"
                          >
                            <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                              <BookIcon className="w-8 h-8 text-stone-300" />
                            </div>
                            <p className="text-[#1c1917] font-serif font-bold text-lg mb-2">题库空空如也</p>
                            <p className="text-stone-500 text-sm">去搜索一本好书，开启阅读之旅吧</p>
                          </motion.div>
                        )}
                      </div>
                      
                      {isBatchEditMode && userBooks.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="fixed bottom-24 left-0 right-0 px-4 z-40"
                        >
                          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-stone-200 p-4 flex items-center justify-between">
                            <div className="text-sm font-medium text-stone-600">
                              已选择 <span className="text-[#064e3b] font-bold">{selectedBatchItems.size}</span> 项
                            </div>
                            <div className="flex gap-3">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  if (selectedBatchItems.size === userBooks.length) {
                                    setSelectedBatchItems(new Set());
                                  } else {
                                    setSelectedBatchItems(new Set(userBooks.map(b => b.id!)));
                                  }
                                }}
                              >
                                {selectedBatchItems.size === userBooks.length ? '取消全选' : '全选'}
                              </Button>
                              <Button 
                                variant="danger" 
                                size="sm"
                                disabled={selectedBatchItems.size === 0}
                                onClick={() => setIsBatchDeleteModalOpen(true)}
                              >
                                批量删除
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setIsBatchEditMode(false);
                                  setSelectedBatchItems(new Set());
                                }}
                              >
                                关闭
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </>
                  )}
                </div>
              )}



              {activeTab === 'LIBRARY' && (
                <LibraryView 
                  profile={profile} 
                  onSelectBook={(book) => {
                    setBookForAction(book);
                    setIsBookActionModalOpen(true);
                  }}
                  onAddBook={() => {
                    setActiveTab('HOME');
                    setHomeSubView('SEARCH');
                  }}
                />
              )}

              {activeTab === 'PROFILE' && profile && (
                <div className="space-y-8">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-3xl bg-[#064e3b] flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-[#064e3b]/20 overflow-hidden">
                      {profile.photoURL ? (
                        <img src={profile.photoURL} alt={profile.displayName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      ) : profile.displayName[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold">{profile.displayName}</h2>
                        {profile.isVIP && (
                          <div className="bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-md flex items-center gap-1 border border-amber-200">
                            <Crown className="w-3 h-3 fill-amber-600" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">VIP</span>
                          </div>
                        )}
                        <span className="px-2 py-0.5 bg-[#064e3b]/10 text-[#064e3b] text-[10px] font-bold rounded-full uppercase tracking-wider">
                          {profile.stats.readingCount >= 10 ? '博学大师' : profile.stats.readingCount >= 5 ? '资深书虫' : '阅读先锋'}
                        </span>
                      </div>
                      <p className="text-stone-400 text-sm mt-1">伴你读懂每一本书</p>
                      <div className="flex flex-wrap gap-4 mt-2">
                        <button onClick={handleLogout} className="text-xs text-stone-400 hover:text-red-500 transition-colors">退出登录</button>
                        <button onClick={recalculateStats} className="text-xs text-stone-400 hover:text-[#064e3b] transition-colors">核算数据</button>
                        <button onClick={resetUserData} className="text-xs text-stone-400 hover:text-orange-500 transition-colors">重置数据</button>
                        <button onClick={deleteAccount} className="text-xs text-stone-400 hover:text-red-600 transition-colors">注销账号</button>
                      </div>
                    </div>
                  </div>

                  {/* VIP Card */}
                  {!profile.isVIP ? (
                    <Card className="p-5 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 shadow-sm relative overflow-hidden group cursor-pointer" onClick={() => setIsVipModalOpen(true)}>
                      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                        <Crown className="w-16 h-16 text-amber-600" />
                      </div>
                      <div className="relative z-10 space-y-3">
                        <div className="flex items-center gap-2">
                          <Crown className="w-5 h-5 text-amber-600" />
                          <h3 className="text-lg font-bold text-amber-900">开通 VIP 会员</h3>
                        </div>
                        <p className="text-amber-700 text-xs leading-relaxed">
                          解锁 15 题深度测试、应试强化模式、多语言答题等专属特权，开启深度阅读之旅。
                        </p>
                        <div className="pt-2">
                          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white rounded-full px-6">立即开通</Button>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <Card className="p-5 bg-gradient-to-br from-[#064e3b] to-[#043d2e] border-[#064e3b] shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3 opacity-10">
                        <Crown className="w-16 h-16 text-white" />
                      </div>
                      <div className="relative z-10 space-y-2">
                        <div className="flex items-center gap-2">
                          <Crown className="w-5 h-5 text-amber-400" />
                          <h3 className="text-lg font-bold text-white">尊贵 VIP 会员</h3>
                        </div>
                        <p className="text-white/70 text-xs">
                          您已解锁所有专属特权，正在享受极致的阅读测试体验。
                        </p>
                      </div>
                    </Card>
                  )}

                  <div className="grid grid-cols-3 gap-4">
                    <Card className="p-4 text-center space-y-1">
                      <div className="text-2xl font-black text-stone-800">{profile.stats.readingCount}</div>
                      <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">阅读书籍</div>
                    </Card>
                    <Card className="p-4 text-center space-y-1">
                      <div className="text-2xl font-black text-stone-800">{records.length}</div>
                      <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">完成测试</div>
                    </Card>
                    <Card className="p-4 text-center space-y-1">
                      <div className="text-2xl font-black text-stone-800">{profile.stats.averageScore}%</div>
                      <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">平均正确率</div>
                    </Card>
                  </div>

                  <section className="space-y-4">
                    <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider">阅读成长能力</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <Card className="p-6">
                        <h4 className="text-xs font-bold text-stone-400 uppercase mb-4">六维能力雷达</h4>
                        <div className="h-[250px]">
                          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                              { subject: '记忆', A: profile.stats.abilityRadar.memory },
                              { subject: '理解', A: profile.stats.abilityRadar.understanding },
                              { subject: '推理', A: profile.stats.abilityRadar.reasoning },
                              { subject: '辩证', A: profile.stats.abilityRadar.dialectic },
                              { subject: '表达', A: profile.stats.abilityRadar.expression },
                              { subject: '鉴赏', A: profile.stats.abilityRadar.appreciation },
                            ]}>
                              <PolarGrid stroke="#e5e7eb" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                              <Radar name="能力值" dataKey="A" stroke="#064e3b" fill="#064e3b" fillOpacity={0.15} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>

                      <Card className="p-6">
                        <h4 className="text-xs font-bold text-stone-400 uppercase mb-4">最近七次测试趋势</h4>
                        <div className="h-[250px]">
                          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                            <LineChart data={records.slice(0, 7).reverse().map((r, i) => ({
                              name: `T${i+1}`,
                              score: r.score
                            }))}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                              <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              />
                              <Line type="monotone" dataKey="score" stroke="#064e3b" strokeWidth={3} dot={{ r: 6, fill: '#064e3b', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider">我的成就</h3>
                    <div className="grid grid-cols-4 gap-4">
                      {[
                        { id: 'pioneer', name: '阅读先锋', icon: <Target className="w-6 h-6" />, unlocked: profile.stats.readingCount >= 1 },
                        { id: 'scholar', name: '博学大师', icon: <Trophy className="w-6 h-6" />, unlocked: profile.stats.readingCount >= 10 },
                        { id: 'perfect', name: '满分达人', icon: <CheckCircle2 className="w-6 h-6" />, unlocked: profile.stats.averageScore >= 90 },
                        { id: 'streak', name: '坚持不懈', icon: <Clock className="w-3 h-3" />, unlocked: records.length >= 5 },
                      ].map(badge => (
                        <div key={badge.id} className={cn(
                          "flex flex-col items-center text-center p-4 rounded-2xl border transition-all",
                          badge.unlocked ? "bg-white border-[#064e3b]/20 shadow-sm" : "bg-stone-50 border-stone-100 opacity-40 grayscale"
                        )}>
                          <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center mb-2",
                            badge.unlocked ? "bg-[#064e3b]/10 text-[#064e3b]" : "bg-stone-200 text-stone-400"
                          )}>
                            {badge.icon}
                          </div>
                          <span className="text-[10px] font-bold text-stone-600">{badge.name}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}
            </>
          )}
        </motion.div>
      )}

      {view === 'QUIZ' && questions.length > 0 && (
            <motion.div 
              key="quiz"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col min-h-full pb-32"
            >
              {/* Fixed Progress Bar */}
              <div className="absolute top-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-b border-stone-200/50 p-4 z-[60]">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                      进度 {currentQuestionIndex + 1} / {questions.length}
                    </div>
                    <div className="w-32 h-1 bg-stone-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#064e3b] transition-all duration-500 ease-out" 
                        style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <QuizTimer 
                      startTime={quizStartTime} 
                      mode={testSettings.timerMode} 
                      value={testSettings.timerValue} 
                      onTimeUp={() => {
                        setToastMessage('考试时间到，正在自动提交...');
                        setTimeout(() => setToastMessage(null), 3000);
                        submitQuiz();
                      }}
                    />
                    <button 
                      onClick={() => {
                        stopSpeaking();
                        setIsExitModalOpen(true);
                      }} 
                      className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-24 px-4">
                <Card className="p-6 flex flex-col shadow-sm border-stone-200/60">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex gap-2">
                      <span className="px-2.5 py-1 bg-stone-100 text-stone-600 text-[10px] font-bold rounded-md uppercase tracking-widest">
                        {questions[currentQuestionIndex].bias}
                      </span>
                      <span className={cn(
                        "px-2.5 py-1 text-[10px] font-bold rounded-md uppercase tracking-widest",
                        questions[currentQuestionIndex].isMultiple 
                          ? "bg-[#064e3b]/10 text-[#064e3b]" 
                          : "bg-stone-100 text-stone-600"
                      )}>
                        {questions[currentQuestionIndex].isMultiple ? "多选题" : "单选题"}
                      </span>
                    </div>
                    <button 
                      onClick={() => {
                        if (isSpeaking) {
                          stopSpeaking();
                        } else {
                          speak(questions[currentQuestionIndex]);
                        }
                      }}
                      className={cn(
                        "p-2.5 rounded-full transition-all",
                        isSpeaking ? "bg-[#064e3b]/10 text-[#064e3b] animate-pulse" : "bg-stone-50 text-stone-400 hover:bg-stone-100 hover:text-[#064e3b]"
                      )}
                      title={isSpeaking ? "停止朗读" : "朗读题目"}
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-2xl font-serif font-medium mb-10 leading-relaxed text-[#1c1917]">
                    {questions[currentQuestionIndex].question}
                  </h3>

                  <div className="space-y-3 flex-grow">
                    {questions[currentQuestionIndex].options?.map((option, i) => {
                      const isSelected = questions[currentQuestionIndex].isMultiple
                        ? (userAnswers[currentQuestionIndex] as string[]).includes(option)
                        : userAnswers[currentQuestionIndex] === option;

                      return (
                        <motion.button
                          key={i}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            const newAnswers = [...userAnswers];
                            if (questions[currentQuestionIndex].isMultiple) {
                              const currentArr = newAnswers[currentQuestionIndex] as string[];
                              if (currentArr.includes(option)) {
                                newAnswers[currentQuestionIndex] = currentArr.filter(a => a !== option);
                              } else {
                                newAnswers[currentQuestionIndex] = [...currentArr, option];
                              }
                            } else {
                              newAnswers[currentQuestionIndex] = option;
                            }
                            setUserAnswers(newAnswers);
                          }}
                          className={cn(
                            "w-full p-5 text-left rounded-[20px] border transition-all duration-300 flex items-center gap-4 group",
                            isSelected 
                              ? "bg-[#064e3b]/5 border-[#064e3b]/30 text-[#064e3b]" 
                              : "bg-white border-stone-200/60 hover:border-[#064e3b]/20 hover:bg-stone-50/50 text-stone-700"
                          )}
                        >
                          <motion.div 
                            initial={false}
                            animate={{ 
                              scale: isSelected ? 1.1 : 1,
                              backgroundColor: isSelected ? "#064e3b" : "#f5f5f4" // bg-stone-100
                            }}
                            className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-all duration-300",
                              isSelected ? "text-white shadow-md shadow-[#064e3b]/20" : "text-stone-400 group-hover:bg-stone-200 group-hover:text-stone-600"
                            )}>
                            {String.fromCharCode(65 + i)}
                          </motion.div>
                          <span className="leading-relaxed text-[15px]">{option}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </Card>
              </div>
                
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-stone-200/50 z-[70]">
                <div className="max-w-2xl mx-auto flex flex-row gap-3">
                  <div className="flex flex-1 gap-3 sm:gap-4">
                    {currentQuestionIndex > 0 ? (
                      <Button variant="outline" className="flex-1 border-stone-200 hover:bg-stone-50 text-stone-700" onClick={() => {
                        stopSpeaking();
                        setCurrentQuestionIndex(i => i - 1);
                      }}>
                        上一题
                      </Button>
                    ) : <div className="flex-1" />}
                    
                    {currentQuestionIndex < questions.length - 1 ? (
                      <Button 
                        className="flex-1 bg-[#064e3b] hover:bg-[#043d2e] text-white"
                        onClick={() => {
                          stopSpeaking();
                          setCurrentQuestionIndex(i => i + 1);
                        }}
                        disabled={questions[currentQuestionIndex].isMultiple 
                          ? (userAnswers[currentQuestionIndex] as string[]).length === 0
                          : !userAnswers[currentQuestionIndex]
                        }
                      >
                        下一题
                      </Button>
                    ) : (
                      <Button 
                        className="flex-1 bg-[#064e3b] hover:bg-[#043d2e] text-white"
                        onClick={() => {
                          stopSpeaking();
                          submitQuiz();
                        }}
                        disabled={questions[currentQuestionIndex].isMultiple 
                          ? (userAnswers[currentQuestionIndex] as string[]).length === 0
                          : !userAnswers[currentQuestionIndex]
                        }
                        isLoading={loading}
                      >
                        提交答卷
                      </Button>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-auto px-4 border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200"
                    onClick={() => setIsExitModalOpen(true)}
                  >
                    退出测试
                  </Button>
                </div>
              </div>

              {/* Exit Confirmation Modal */}
              {isExitModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
                    <h3 className="text-lg font-bold mb-2">确认退出测试？</h3>
                    <p className="text-stone-600 mb-6">
                      退出后当前测试进度将丢失{selectedBook && !userBooks.find(b => b.title === selectedBook.title) ? '，但书籍会自动添加到题库' : ''}。
                    </p>
                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" onClick={() => setIsExitModalOpen(false)}>取消</Button>
                      <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={() => {
                        stopSpeaking();
                        if (selectedBook) {
                          addToBookshelf(selectedBook);
                        }
                        if (settingsBackTarget === 'QUESTION_BOOK') {
                          setActiveTab('QUESTION_BOOK');
                        } else {
                          setActiveTab('HOME');
                        }
                        setHomeSubView('SEARCH');
                        setView('MAIN');
                        setIsExitModalOpen(false);
                      }}>确认退出</Button>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          )}

          {view === 'RESULT' && sessionResult && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8"
            >
              <div id="result-poster" className="bg-white p-8 rounded-[32px] border border-stone-200/60 shadow-sm space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#064e3b]/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                <div className="text-center space-y-5 relative z-10">
                  <div className="inline-flex items-center justify-center w-24 h-24 bg-[#064e3b]/5 text-[#064e3b] rounded-full mb-2">
                    <Trophy className="w-12 h-12" />
                  </div>
                  <h2 className="text-4xl font-serif font-medium text-[#1c1917]">测试完成</h2>
                  <div className="grid grid-cols-2 gap-4 py-6 border-y border-stone-100">
                    <div className="text-center">
                      <div className="text-3xl font-black text-[#064e3b] mb-1">{sessionResult.score}</div>
                      <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">得分</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-black text-[#064e3b] mb-1">{sessionResult.correctRate}%</div>
                      <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">正确率</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-black text-[#064e3b]/80 mb-1">{sessionResult.completionRate}%</div>
                      <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">完成度</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-black text-stone-700 mb-1">{Math.floor((sessionResult.timeUsed || 0) / 60)}:{(sessionResult.timeUsed || 0) % 60}</div>
                      <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">用时</div>
                    </div>
                  </div>
                </div>

                <Card className="p-8 bg-stone-50/50 border-none shadow-none">
                  <h4 className="text-xs font-bold text-stone-400 uppercase mb-6 text-center tracking-widest">当前阅读能力雷达</h4>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={[
                        { subject: '记忆', A: profile?.stats.abilityRadar.memory || 0 },
                        { subject: '理解', A: profile?.stats.abilityRadar.understanding || 0 },
                        { subject: '推理', A: profile?.stats.abilityRadar.reasoning || 0 },
                        { subject: '辩证', A: profile?.stats.abilityRadar.dialectic || 0 },
                        { subject: '表达', A: profile?.stats.abilityRadar.expression || 0 },
                        { subject: '鉴赏', A: profile?.stats.abilityRadar.appreciation || 0 },
                      ]}>
                        <PolarGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#78716c', fontSize: 12, fontWeight: 600 }} />
                        <Radar name="能力值" dataKey="A" stroke="#064e3b" strokeWidth={2} fill="#064e3b" fillOpacity={0.15} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="bg-[#064e3b]/5 border-[#064e3b]/10 p-8">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xs font-bold text-[#064e3b] uppercase tracking-widest flex items-center gap-3">
                      <div className="w-1.5 h-4 bg-[#064e3b] rounded-full" />
                      AI 综合评价
                    </h3>
                    <button 
                      onClick={() => handlePlayAudio(sessionResult.evaluation, 'eval')}
                      className={cn(
                        "p-2 rounded-full transition-colors",
                        isPlayingAudio === 'eval' ? "bg-[#064e3b] text-white" : "text-[#064e3b]/40 hover:bg-[#064e3b]/10"
                      )}
                    >
                      {isPlayingAudio === 'eval' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[#064e3b]/90 leading-relaxed text-[15px] italic font-serif">"{sessionResult.evaluation}"</p>
                </Card>

                {/* Promotion QR Code Section */}
                <div className="pt-8 border-t border-stone-100 flex items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[#064e3b] font-bold text-sm">
                      <div className="w-1.5 h-1.5 bg-[#064e3b] rounded-full" />
                      阅见 AI · 深度阅读
                    </div>
                    <p className="text-stone-400 text-[11px] leading-relaxed">
                      扫码开启你的 AI 深度阅读之旅<br />
                      提升 6 大核心阅读维度
                    </p>
                  </div>
                  <div className="p-2 bg-white border border-stone-100 rounded-2xl shadow-sm">
                    <QRCodeSVG 
                      value={window.location.origin} 
                      size={80}
                      level="H"
                      includeMargin={false}
                      imageSettings={{
                        src: "https://picsum.photos/seed/reading/40/40",
                        x: undefined,
                        y: undefined,
                        height: 20,
                        width: 20,
                        excavate: true,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="font-serif text-2xl font-medium text-[#1c1917] px-2">答题详情</h3>
                {sessionResult.answers.map((answer, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.1 }}
                  >
                    <Card className={cn("p-6 border-l-4 transition-all duration-300", answer.isCorrect ? "border-l-[#064e3b]" : "border-l-red-500")}>
                      <div className="flex items-start justify-between mb-6">
                        <div className="space-y-3">
                          <div className="flex gap-2 items-center">
                            <span className="px-2.5 py-1 bg-stone-100 text-stone-500 text-[10px] font-bold rounded-md uppercase tracking-widest">#{i + 1}</span>
                            <span className="px-2.5 py-1 bg-stone-100 text-stone-600 text-[10px] font-bold rounded-md uppercase tracking-widest">{answer.isMultiple ? '多选' : '单选'}</span>
                            <span className="px-2.5 py-1 bg-[#064e3b]/10 text-[#064e3b] text-[10px] font-bold rounded-md uppercase tracking-widest">{answer.source}</span>
                            <button 
                              onClick={() => handlePlayAudio(answer.question, `res-q-${i}`)}
                              className={cn(
                                "p-1 rounded-full transition-colors",
                                isPlayingAudio === `res-q-${i}` ? "bg-[#064e3b] text-white" : "text-stone-300 hover:bg-stone-100"
                              )}
                            >
                              {isPlayingAudio === `res-q-${i}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 className="w-3 h-3" />}
                            </button>
                          </div>
                          <h4 className="font-serif text-lg font-medium text-[#1c1917] leading-relaxed">{answer.question}</h4>
                        </div>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 200, damping: 10, delay: i * 0.1 + 0.2 }}
                        >
                          {answer.isCorrect ? (
                            <CheckCircle2 className="w-6 h-6 text-[#064e3b] flex-shrink-0 mt-1" />
                          ) : (
                            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                          )}
                        </motion.div>
                      </div>

                      <div className="space-y-3 mb-8">
                        {answer.options.map((opt, idx) => (
                          <div key={idx} className="text-[13px] text-stone-500 flex gap-3 items-start">
                            <span className="font-bold text-stone-400 mt-0.5">{String.fromCharCode(65 + idx)}.</span>
                            <span className="leading-relaxed">{opt}</span>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 gap-3 text-sm mb-6">
                        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                          <span className="block text-stone-400 text-[10px] font-bold uppercase mb-2 tracking-widest">你的答案</span>
                          <span className={cn("font-bold text-lg", !answer.isCorrect ? "text-red-600" : "text-[#064e3b]")}>
                            {getAnswerLetters(answer.userAnswer, answer.options)}
                          </span>
                        </div>
                        <div className="p-4 bg-[#064e3b]/5 rounded-2xl border border-[#064e3b]/10">
                          <span className="block text-[#064e3b]/60 text-[10px] font-bold uppercase mb-2 tracking-widest">正确答案</span>
                          <span className="font-bold text-lg text-[#064e3b]">
                            {getAnswerLetters(answer.correctAnswer, answer.options)}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-stone-600 bg-stone-50 p-5 rounded-2xl border border-stone-100">
                        <div className="flex justify-between items-center mb-2">
                          <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">正确解析</div>
                          <button 
                            onClick={() => handlePlayAudio(answer.analysis, `ans-${i}`)}
                            className={cn(
                              "p-1.5 rounded-full transition-colors",
                              isPlayingAudio === `ans-${i}` ? "bg-[#064e3b] text-white" : "text-stone-400 hover:bg-stone-200"
                            )}
                          >
                            {isPlayingAudio === `ans-${i}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <p className="leading-relaxed">{answer.analysis}</p>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <div className="h-28" /> {/* Spacer for fixed button */}

              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-white/80 backdrop-blur-xl border-t border-stone-200/50 z-50">
                <div className="max-w-2xl mx-auto space-y-4 px-4">
                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-sm mb-2">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}
                  {/* Primary Action: Generate Poster */}
                  <Button 
                    className="w-full bg-[#064e3b] hover:bg-[#043d2e] text-white py-5 rounded-[24px] shadow-xl shadow-[#064e3b]/20" 
                    size="lg" 
                    onClick={generatePoster} 
                    isLoading={isGeneratingPoster}
                  >
                    <Trophy className="w-6 h-6 mr-3" /> 生成海报
                  </Button>

                  {/* Secondary Actions: Retest */}
                  <div className={cn(
                    "grid gap-3",
                    sessionResult && sessionResult.answers.some(a => !a.isCorrect) ? "grid-cols-2" : "grid-cols-1"
                  )}>
                    <Button 
                      variant="secondary"
                      className="h-14 rounded-[20px] border-stone-100" 
                      onClick={() => {
                        if (sessionResult) {
                          setQuestions(sessionResult.answers.map(ans => ({
                            question: ans.question,
                            options: ans.options,
                            correctAnswer: ans.correctAnswer,
                            isMultiple: ans.isMultiple,
                            analysis: ans.analysis,
                            bias: ans.bias,
                            source: ans.source
                          })));
                          setUserAnswers(sessionResult.answers.map(ans => ans.isMultiple ? [] : ''));
                          setCurrentQuestionIndex(0);
                          setQuizStartTime(Date.now());
                          setView('QUIZ');
                        }
                      }}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" /> 重测全部
                    </Button>
                    
                    {sessionResult && sessionResult.answers.some(a => !a.isCorrect) && (
                      <Button 
                        className="h-14 rounded-[20px] bg-amber-500 hover:bg-amber-600 text-white border-none shadow-lg shadow-amber-500/20" 
                        onClick={() => {
                          if (sessionResult) {
                            const mistakeQuestions = sessionResult.answers
                              .filter(ans => !ans.isCorrect)
                              .map(ans => ({
                                question: ans.question,
                                options: ans.options,
                                correctAnswer: ans.correctAnswer,
                                isMultiple: ans.isMultiple,
                                analysis: ans.analysis,
                                bias: ans.bias,
                                source: ans.source
                              }));
                            setQuestions(mistakeQuestions);
                            setUserAnswers(mistakeQuestions.map(ans => ans.isMultiple ? [] : ''));
                            setCurrentQuestionIndex(0);
                            setQuizStartTime(Date.now());
                            setView('QUIZ');
                          }
                        }}
                      >
                        <AlertCircle className="w-4 h-4 mr-2" /> 重测错题
                      </Button>
                    )}
                  </div>

                  {/* Tertiary Action: Back to Home */}
                  <Button 
                    variant="ghost"
                    className="w-full text-stone-400 hover:text-stone-600 h-12 rounded-xl" 
                    size="sm" 
                    onClick={() => {
                      if (settingsBackTarget === 'QUESTION_BOOK') {
                        setActiveTab('QUESTION_BOOK');
                      } else {
                        setActiveTab('HOME');
                      }
                      setView('MAIN');
                      setHomeSubView('SEARCH');
                    }}
                  >
                    {settingsBackTarget === 'QUESTION_BANK' ? '返回题库' : '返回首页'}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {isDeleteModalOpen && bookToDelete && (
            <div className="absolute inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsDeleteModalOpen(false)}
                className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl relative z-10 border border-stone-100"
              >
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6 mx-auto">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-center mb-3 text-stone-800">确认提示</h3>
                <p className="text-stone-500 text-center mb-8 leading-relaxed">
                  删除书籍后，其相关测试记录也将被一并删除，<br/>且不得恢复，请知晓。
                </p>
                <div className="flex flex-col gap-3">
                  <Button className="w-full bg-stone-800 hover:bg-stone-900 text-white shadow-md shadow-stone-800/20 h-12 rounded-2xl" onClick={() => {
                    deleteBook(bookToDelete.id!, true);
                    setIsDeleteModalOpen(false);
                    setBookToDelete(null);
                  }}>坚持删除</Button>
                  <Button variant="ghost" className="w-full text-stone-500 hover:text-stone-700 hover:bg-stone-100 h-12 rounded-2xl" onClick={() => setIsDeleteModalOpen(false)}>取消</Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Batch Delete Modal */}
        <AnimatePresence>
          {isBatchDeleteModalOpen && (
            <div className="absolute inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl relative z-10 border border-stone-100"
              >
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6 mx-auto">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-center mb-3 text-stone-800">确认提示</h3>
                <p className="text-stone-500 text-center mb-8 leading-relaxed">
                  您已选中 {selectedBatchItems.size} 项内容。<br/>
                  {activeTab === 'QUESTION_BOOK' && !selectedRecord && !selectedAnswerBook && "删除书籍后，其相关测试记录也将被一并删除，且不得恢复，请知晓。"}
                  {(selectedRecord || selectedAnswerBook) && "删除后这些答题记录将无法恢复，请知晓。"}
                </p>
                <div className="flex flex-col gap-3">
                  {activeTab === 'QUESTION_BANK' && !selectedRecord && !selectedAnswerBook ? (
                    <Button className="w-full bg-stone-800 hover:bg-stone-900 text-white shadow-md shadow-stone-800/20 h-12 rounded-2xl" onClick={() => {
                      setIsBatchDeleteModalOpen(false);
                      batchDeleteBooks(selectedBatchItems, true);
                    }}>坚持删除</Button>
                  ) : activeTab === 'QUESTION_BANK' && !selectedRecord && selectedAnswerBook ? (
                    <Button className="w-full bg-stone-800 hover:bg-stone-900 text-white shadow-md shadow-stone-800/20 h-12 rounded-2xl" onClick={() => {
                      setIsBatchDeleteModalOpen(false);
                      batchDeleteRecords(selectedBatchItems);
                    }}>坚持删除</Button>
                  ) : (
                    <Button className="w-full bg-stone-800 hover:bg-stone-900 text-white shadow-md shadow-stone-800/20 h-12 rounded-2xl" onClick={() => {
                      setIsBatchDeleteModalOpen(false);
                      if (selectedRecord) {
                        batchDeleteRecordAnswers(selectedRecord.id!, selectedBatchItems);
                      }
                    }}>坚持删除</Button>
                  )}
                  <Button variant="ghost" className="w-full text-stone-500 hover:text-stone-700 hover:bg-stone-100 h-12 rounded-2xl" onClick={() => setIsBatchDeleteModalOpen(false)}>取消</Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Book Action Modal (Test vs Review) */}
        <AnimatePresence>
          {isBookActionModalOpen && bookForAction && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsBookActionModalOpen(false)}
                className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="bg-[#064e3b] p-6 text-white relative flex gap-5">
                  <button 
                    onClick={() => setIsBookActionModalOpen(false)}
                    className="absolute right-3 top-3 p-1.5 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="w-20 h-28 bg-white/20 rounded-lg flex-shrink-0 overflow-hidden shadow-lg">
                    <img 
                      src={bookForAction.coverURL || `https://picsum.photos/seed/${encodeURIComponent(bookForAction.title)}/200/300`} 
                      alt={bookForAction.title} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <h2 className="text-2xl font-bold mb-1 leading-tight">《{bookForAction.title}》</h2>
                    <div className="flex flex-col gap-0.5 text-white/80 text-xs">
                      <span>作者：{bookForAction.author}</span>
                    </div>
                  </div>
                </div>
                <div className="p-6 text-center">
                  <p className="text-stone-500 text-sm mb-8 line-clamp-2 px-4">{bookForAction.summary}</p>
                </div>
                
                <div className="p-4 bg-stone-50 border-t border-stone-100 flex flex-col gap-2">
                  {(() => {
                    const nextChapter = bookForAction.toc.find(c => !bookForAction.testedChapters.includes(c));
                    if (nextChapter) {
                      return (
                        <Button 
                          onClick={() => {
                            setSelectedBook({
                              title: bookForAction.title,
                              author: bookForAction.author,
                              publisher: bookForAction.publisher,
                              summary: bookForAction.summary,
                              toc: bookForAction.toc,
                              coverURL: bookForAction.coverURL
                            });
                            setTestSettings(prev => ({ ...prev, range: [nextChapter] }));
                            setIsBookActionModalOpen(false);
                            // We need to wait for state updates, so we'll go to settings first but with a flag to auto-start if we wanted.
                            // For now, let's just go to settings with the next chapter pre-selected.
                            setSettingsBackTarget('QUESTION_BOOK');
                            setHomeSubView('SETTINGS');
                            setActiveTab('HOME');
                          }}
                          className="w-full h-12 text-sm bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 font-bold"
                        >
                          <Play className="w-4 h-4 mr-2" /> 继续下一章：{nextChapter}
                        </Button>
                      );
                    }
                    return null;
                  })()}
                  
                  <Button 
                    onClick={() => {
                      setSelectedBook({
                        title: bookForAction.title,
                        author: bookForAction.author,
                        publisher: bookForAction.publisher,
                        summary: bookForAction.summary,
                        toc: bookForAction.toc,
                        coverURL: bookForAction.coverURL
                      });
                      setSettingsBackTarget('QUESTION_BANK');
                      setHomeSubView('SETTINGS');
                      setActiveTab('HOME');
                      setIsBookActionModalOpen(false);
                    }}
                    className="w-full h-10 text-sm bg-[#064e3b] hover:bg-[#043d2e] text-white"
                  >
                    <Play className="w-4 h-4 mr-2" /> 开始测试
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      onClick={() => {
                        setSelectedAnswerBook(bookForAction.title);
                        setAnswerBookSubView('RECORDS');
                        setActiveTab('QUESTION_BOOK');
                        setIsBookActionModalOpen(false);
                      }}
                      className="w-full h-10 text-sm bg-stone-100 hover:bg-stone-200 text-stone-700"
                    >
                      <History className="w-4 h-4 mr-2" /> 记录
                    </Button>
                    <Button 
                      onClick={() => {
                        setSelectedAnswerBook(bookForAction.title);
                        setAnswerBookSubView('MISTAKES');
                        setActiveTab('QUESTION_BOOK');
                        setIsBookActionModalOpen(false);
                      }}
                      className="w-full h-10 text-sm bg-stone-100 hover:bg-stone-200 text-stone-700"
                    >
                      <AlertCircle className="w-4 h-4 mr-2" /> 错题
                    </Button>
                  </div>
                  
                  <Button 
                    variant="ghost"
                    onClick={() => setIsBookActionModalOpen(false)}
                    className="w-full h-10 text-sm text-stone-500 hover:text-stone-700 hover:bg-stone-100"
                  >
                    取消
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Book Detail Modal */}
        <AnimatePresence>
          {isBookModalOpen && selectedBook && (
            <div className="absolute inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsBookModalOpen(false)}
                className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="bg-[#064e3b] p-6 text-white relative flex gap-5">
                  <button 
                    onClick={() => setIsBookModalOpen(false)}
                    className="absolute right-3 top-3 p-1.5 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="w-20 h-28 bg-white/20 rounded-lg flex-shrink-0 overflow-hidden shadow-lg">
                    {/* Future: Book cover and details can be fetched from database */}
                    <img 
                      src={selectedBook.coverURL || `https://picsum.photos/seed/${encodeURIComponent(selectedBook.title)}/200/300`} 
                      alt={selectedBook.title} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <h2 className="text-2xl font-bold mb-1 leading-tight">{selectedBook.title}</h2>
                    <div className="flex flex-col gap-0.5 text-white/80 text-xs">
                      <span>作者：{selectedBook.author}</span>
                      <span>出版社：{selectedBook.publisher}</span>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4 max-h-[40vh] overflow-y-auto scrollbar-thin scrollbar-thumb-stone-200">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">AI 深度简介</h3>
                      <button 
                        onClick={() => handlePlayAudio(selectedBook.summary, 'book-summary')}
                        className={cn(
                          "p-1.5 rounded-full transition-colors",
                          isPlayingAudio === 'book-summary' ? "bg-[#064e3b] text-white" : "text-stone-400 hover:bg-stone-200"
                        )}
                      >
                        {isPlayingAudio === 'book-summary' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="text-stone-700 leading-relaxed space-y-3 text-xs">
                      {selectedBook.summary.split('\n').map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-stone-50 border-t border-stone-100 flex flex-col gap-2">
                  <Button 
                    className="w-full bg-stone-200 hover:bg-stone-300 text-stone-800 h-10 text-sm" 
                    onClick={collectBook}
                  >
                    <BookIcon className="w-4 h-4 mr-2" /> 收藏书籍
                  </Button>
                  <Button className="w-full h-10 text-sm bg-[#064e3b] hover:bg-[#043d2e] text-white" onClick={handleConfirmBook}>
                    确认书籍，进入设置 <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* VIP Purchase Modal */}
        <AnimatePresence>
          {isVipModalOpen && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsVipModalOpen(false)}
                className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-8 text-white text-center relative">
                  <button 
                    onClick={() => setIsVipModalOpen(false)}
                    className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="inline-flex p-4 bg-white/20 rounded-3xl mb-4">
                    <Crown className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">开通通宝 VIP</h2>
                  <p className="text-amber-50/80 text-sm">解锁深度阅读的所有可能</p>
                </div>

                <div className="p-8 space-y-6">
                  <div className="space-y-4">
                    {[
                      { icon: <Target className="w-5 h-5" />, title: "深度测试", desc: "单次测试题目上限提升至 15 题" },
                      { icon: <Trophy className="w-5 h-5" />, title: "应试强化", desc: "开启真题模拟模式，深度还原考试场景" },
                      { icon: <Globe2 className="w-5 h-5" />, title: "全球视野", desc: "支持英、日、法等多种语言答题" },
                      { icon: <MessageCircle className="w-5 h-5" />, title: "专属顾问", desc: "AI 深度解析，针对性提供阅读建议" },
                    ].map((feature, i) => (
                      <div key={i} className="flex items-start gap-4">
                        <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                          {feature.icon}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-stone-800">{feature.title}</h4>
                          <p className="text-xs text-stone-500">{feature.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4">
                    <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-stone-400 font-medium">年度会员</div>
                          <div className="text-2xl font-black text-stone-800">¥ 199 <span className="text-sm font-normal text-stone-400">/ 年</span></div>
                        </div>
                        <div className="bg-amber-100 text-amber-600 text-[10px] font-bold px-2 py-1 rounded-full">限时 5 折</div>
                      </div>
                    </div>

                    <Button 
                      onClick={handleBuyVip}
                      disabled={isVipLoading}
                      className="w-full bg-[#064e3b] hover:bg-[#043d2e] text-white py-6 rounded-2xl text-lg font-bold shadow-lg shadow-[#064e3b]/20"
                    >
                      {isVipLoading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        "立即支付并开通"
                      )}
                    </Button>
                    <p className="text-center text-[10px] text-stone-400 mt-4">
                      支付即代表同意《通宝会员服务协议》与《隐私政策》
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <ScrollIndicator containerRef={mainScrollRef} />

        {/* Bottom Navigation */}
        {view === 'MAIN' && (
          <nav className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-stone-200/50 px-6 py-3 z-50 pb-safe">
            <div className="max-w-2xl mx-auto flex justify-between items-center">
              <button 
                onClick={() => { setActiveTab('HOME'); setHomeSubView('SEARCH'); setSelectedRecord(null); setSelectedAnswerBook(null); }}
                className={cn(
                  "flex flex-col items-center gap-1.5 transition-all px-4 py-2 rounded-2xl",
                  activeTab === 'HOME' ? "text-[#064e3b] bg-[#064e3b]/5" : "text-stone-400 hover:text-stone-600 hover:bg-stone-50"
                )}
              >
                <Home className={cn("w-6 h-6", activeTab === 'HOME' && "fill-[#064e3b]/10")} />
                <span className="text-[10px] font-bold uppercase tracking-widest">首页</span>
              </button>
              <button 
                onClick={() => { setActiveTab('LIBRARY'); setSelectedRecord(null); setSelectedAnswerBook(null); }}
                className={cn(
                  "flex flex-col items-center gap-1.5 transition-all px-4 py-2 rounded-2xl",
                  activeTab === 'LIBRARY' ? "text-[#064e3b] bg-[#064e3b]/5" : "text-stone-400 hover:text-stone-600 hover:bg-stone-50"
                )}
              >
                <Library className={cn("w-6 h-6", activeTab === 'LIBRARY' && "fill-[#064e3b]/10")} />
                <span className="text-[10px] font-bold uppercase tracking-widest">书架</span>
              </button>
              <button 
                onClick={() => { setActiveTab('QUESTION_BOOK'); setSelectedRecord(null); setSelectedAnswerBook(null); }}
                className={cn(
                  "flex flex-col items-center gap-1.5 transition-all px-4 py-2 rounded-2xl",
                  activeTab === 'QUESTION_BOOK' ? "text-[#064e3b] bg-[#064e3b]/5" : "text-stone-400 hover:text-stone-600 hover:bg-stone-50"
                )}
              >
                <BookIcon className={cn("w-6 h-6", activeTab === 'QUESTION_BOOK' && "fill-[#064e3b]/10")} />
                <span className="text-[10px] font-bold uppercase tracking-widest">题库</span>
              </button>
              <button 
                onClick={() => { setActiveTab('PROFILE'); setSelectedRecord(null); setSelectedAnswerBook(null); }}
                className={cn(
                  "flex flex-col items-center gap-1.5 transition-all px-4 py-2 rounded-2xl",
                  activeTab === 'PROFILE' ? "text-[#064e3b] bg-[#064e3b]/5" : "text-stone-400 hover:text-stone-600 hover:bg-stone-50"
                )}
              >
                <UserIcon className={cn("w-6 h-6", activeTab === 'PROFILE' && "fill-[#064e3b]/10")} />
                <span className="text-[10px] font-bold uppercase tracking-widest">我的</span>
              </button>
            </div>
          </nav>
        )}
      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {isResetModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-stone-900 mb-2">重置所有数据？</h3>
                  <p className="text-sm text-stone-500 leading-relaxed mb-4">
                    此操作将彻底清零您的所有个人历史数据、答题记录和成就。本程序将被完全重置至首次使用的状态（<b>包括重新进行入职调研</b>），此操作不可撤销。
                    <br/><br/>
                    为防止误操作，请输入<strong className="text-red-500 font-bold mx-1">同意重置</strong>以确认执行。
                  </p>
                  <input
                    type="text"
                    value={resetConfirmationText}
                    onChange={(e) => setResetConfirmationText(e.target.value)}
                    placeholder="请输入 同意重置"
                    className="w-full px-4 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-center"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setIsResetModalOpen(false);
                    setResetConfirmationText('');
                  }}
                >
                  取消
                </Button>
                <Button 
                  variant="danger" 
                  className="flex-1"
                  onClick={confirmResetData}
                  disabled={resetConfirmationText !== '同意重置'}
                >
                  确认重置
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

        {/* Book Detail Modal */}
        <AnimatePresence>
          {isBookDetailModalOpen && selectedBook && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
              onClick={() => setIsBookDetailModalOpen(false)}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="bg-[#064e3b] p-6 text-white relative flex gap-5">
                  <button 
                    onClick={() => setIsBookDetailModalOpen(false)}
                    className="absolute right-3 top-3 p-1.5 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="w-20 h-28 bg-white/20 rounded-lg flex-shrink-0 overflow-hidden shadow-lg">
                    <img 
                      src={selectedBook.coverURL || `https://picsum.photos/seed/${encodeURIComponent(selectedBook.title)}/300/450`} 
                      alt={selectedBook.title} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <h2 className="text-2xl font-bold mb-1 leading-tight">《{selectedBook.title}》</h2>
                    <div className="flex flex-col gap-0.5 text-white/80 text-xs">
                      <span>作者：{selectedBook.author}</span>
                      <span>出版社：{selectedBook.publisher}</span>
                    </div>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-stone-100">
                  {/* Formatted Info List */}
                  <div className="grid grid-cols-1 gap-3 bg-stone-50 p-4 rounded-2xl border border-stone-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-400">作者</span>
                      <span className="text-stone-700 font-medium">{selectedBook.author}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-400">出版社</span>
                      <span className="text-stone-700 font-medium">{selectedBook.publisher}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-400">出版时间</span>
                      <span className="text-stone-700 font-medium">{selectedBook.publishDate}</span>
                    </div>
                  </div>

                  {/* Summary with Audio */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-stone-500 uppercase tracking-wider">书籍简介</h4>
                      <button 
                        onClick={() => handlePlayAudio(selectedBook.summary, 'book-summary-modal')}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-xs font-bold",
                          isPlayingAudio === 'book-summary-modal' 
                            ? "bg-[#064e3b] text-white shadow-md shadow-[#064e3b]/20" 
                            : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                        )}
                      >
                        {isPlayingAudio === 'book-summary-modal' ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>停止播放</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>播放简介</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="text-stone-600 leading-relaxed text-sm bg-stone-50/50 p-4 rounded-2xl border border-stone-50">
                      {selectedBook.summary.split('\n').map((para, i) => (
                        <p key={i} className="mb-3 last:mb-0">{para}</p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-stone-100 bg-stone-50/50">
                  <Button 
                    className="w-full" 
                    onClick={() => setIsBookDetailModalOpen(false)}
                  >
                    返回设置
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Language Selection Modal */}
        <AnimatePresence>
          {isLanguageModalOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
              onClick={() => setIsLanguageModalOpen(false)}
            >
              <motion.div 
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white rounded-t-[32px] sm:rounded-[32px] p-6 w-full max-w-sm shadow-2xl space-y-6"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-1.5 bg-stone-200 rounded-full mb-2 sm:hidden" />
                  <h3 className="text-xl font-bold text-stone-800">选择测试语言</h3>
                  <p className="text-sm text-stone-500 text-center">选择您希望生成题目和解析的语言</p>
                </div>

                <div className="grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto p-1">
                  {LANGUAGES.map(lang => {
                    const isVipOnly = lang.name !== '中文';
                    const isRestricted = isVipOnly && !profile?.isVIP;
                    return (
                      <button
                        key={lang.name}
                        onClick={() => {
                          if (isRestricted) {
                            setToastMessage('多语言答题仅支持VIP用户');
                            setTimeout(() => setToastMessage(null), 2000);
                            return;
                          }
                          setSelectedLanguage(lang.name);
                          setTestSettings(prev => ({ ...prev, language: lang.name }));
                          setIsLanguageModalOpen(false);
                        }}
                        className={cn(
                          "flex items-center justify-center gap-2 p-4 rounded-2xl transition-all border-2 relative",
                          selectedLanguage === lang.name 
                            ? "bg-[#064e3b]/5 border-[#064e3b] text-[#064e3b] font-bold shadow-sm" 
                            : "bg-white border-stone-100 text-stone-600 hover:bg-stone-50 hover:border-stone-200",
                          isRestricted && "opacity-80 grayscale-[0.5]"
                        )}
                      >
                        <span className="text-xl">{lang.flag}</span>
                        <span>{lang.name}</span>
                        {isVipOnly && (
                          <span className={cn(
                            "absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider shadow-sm",
                            profile?.isVIP ? "bg-amber-100 text-amber-700" : "bg-stone-200 text-stone-500"
                          )}>
                            VIP
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <Button 
                  className="w-full h-12 rounded-2xl text-base" 
                  onClick={() => setIsLanguageModalOpen(false)}
                >
                  确认
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Share Modal */}
        <AnimatePresence>
          {isPosterModalOpen && posterImage && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-md z-[150] flex flex-col items-center justify-center p-4 sm:p-8"
              onClick={() => setIsPosterModalOpen(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-white sticky top-0 z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#064e3b] rounded-xl flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-serif font-bold text-[#064e3b]">阅读成就海报</span>
                  </div>
                  <button 
                    onClick={() => setIsPosterModalOpen(false)}
                    className="p-2 text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Poster Preview */}
                <div className="flex-1 overflow-y-auto p-4 bg-stone-100/50">
                  <div className="relative group">
                    <img 
                      src={posterImage} 
                      alt="Reading Report Poster" 
                      className="w-full rounded-2xl shadow-lg border border-stone-200"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-medium border border-white/30">
                        长按图片保存或分享
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-white space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline"
                      className="rounded-2xl border-stone-200 h-12"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = posterImage;
                        link.download = `reading-report-${Date.now()}.png`;
                        link.click();
                        setToastMessage('已开始下载海报');
                        setTimeout(() => setToastMessage(null), 2000);
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" /> 保存图片
                    </Button>
                    <Button 
                      className="rounded-2xl bg-[#07c160] hover:bg-[#06ae56] text-white border-none h-12"
                      onClick={async () => {
                        if (navigator.share) {
                          try {
                            await navigator.share({
                              title: '阅见 AI · 我的阅读成就',
                              text: `我在阅见 AI 完成了阅读测试，得分 ${sessionResult.score}！`,
                              url: window.location.origin,
                            });
                          } catch (err) {
                            // User cancelled or error
                            navigator.clipboard.writeText(window.location.origin);
                            setToastMessage('链接已复制，去微信分享吧');
                            setTimeout(() => setToastMessage(null), 2000);
                          }
                        } else {
                          navigator.clipboard.writeText(window.location.origin);
                          setToastMessage('链接已复制，去微信分享吧');
                          setTimeout(() => setToastMessage(null), 2000);
                        }
                      }}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" /> 微信分享
                    </Button>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-[11px] text-stone-400 leading-relaxed">
                      提示：长按上方海报图片可直接发送给微信好友或朋友圈<br/>
                      海报内含专属二维码，好友扫码即可加入阅读
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isShareModalOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
              onClick={() => setIsShareModalOpen(false)}
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl text-center space-y-6"
                onClick={e => e.stopPropagation()}
              >
                <div className="space-y-2">
                  <h3 className="text-xl font-serif font-bold text-[#064e3b]">分享给好友</h3>
                  <p className="text-stone-500 text-sm">让朋友扫码，一起开启阅读之旅</p>
                </div>

                <div className="bg-stone-50 p-6 rounded-3xl inline-block border border-stone-100">
                  <QRCodeCanvas 
                    value={window.location.href} 
                    size={200}
                    level="H"
                    includeMargin={true}
                    imageSettings={{
                      src: 'https://picsum.photos/seed/book/40/40',
                      x: undefined,
                      y: undefined,
                      height: 40,
                      width: 40,
                      excavate: true,
                    }}
                  />
                </div>

                <div className="space-y-3">
                  <Button 
                    className="w-full" 
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      alert('链接已复制到剪贴板！');
                    }}
                  >
                    复制链接
                  </Button>
                  <button 
                    onClick={() => setIsShareModalOpen(false)}
                    className="text-stone-400 text-sm font-medium hover:text-stone-600 transition-colors"
                  >
                    返回
                  </button>
                </div>
                
                <div className="pt-4 border-t border-stone-100">
                  <p className="text-[10px] text-stone-400 leading-relaxed">
                    提示：在微信中打开时，点击右上角“...”<br/>
                    选择“添加到桌面”可获得类似小程序的体验
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!isOnline && <OfflineOverlay onRetry={() => setIsOnline(navigator.onLine)} />}
        </AnimatePresence>

        {/* Toast Message */}
        <AnimatePresence>
          {toastMessage && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-[#2a2a2a] text-white px-6 py-3.5 rounded-full shadow-2xl flex items-center gap-3 max-w-[80vw] text-center pointer-events-auto border border-white/10"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.1 }}
                  className="flex items-center justify-center"
                >
                  <CheckCircle2 className="w-5 h-5 text-[#10b981]" />
                </motion.div>
                <span className="text-sm font-medium whitespace-nowrap">{toastMessage}</span>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
      </div>
    </div>
  );
}

