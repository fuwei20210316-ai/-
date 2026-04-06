import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  FolderPlus, 
  MoreVertical, 
  BookOpen, 
  TrendingUp, 
  Clock, 
  ChevronRight,
  Filter,
  LayoutGrid,
  List,
  Trash2,
  Folder
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { UserProfile, UserBook, Folder as FolderType } from '../types';
import { getUserBookshelf, getUserFolders, createFolder, moveBookToFolder } from '../services/bookshelfService';

interface LibraryViewProps {
  profile: UserProfile | null;
  onSelectBook: (book: UserBook) => void;
  onAddBook?: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ profile, onSelectBook, onAddBook }) => {
  const [books, setBooks] = useState<UserBook[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFolder, setActiveFolder] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeBooks = getUserBookshelf((fetchedBooks) => {
      setBooks(fetchedBooks as UserBook[]);
      setLoading(false);
    });
    const unsubscribeFolders = getUserFolders((fetchedFolders) => {
      setFolders(fetchedFolders);
    });

    return () => {
      unsubscribeBooks();
      unsubscribeFolders();
    };
  }, []);

  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await createFolder(newFolderName);
      setNewFolderName('');
      setIsFolderModalOpen(false);
    } catch (error) {
      console.error("Error in handleCreateFolder:", error);
    }
  };

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         book.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = activeFolder ? book.folderId === activeFolder : (activeFolder === null ? true : book.folderId === 'default');
    return matchesSearch && matchesFolder;
  });

  const stats = {
    total: books.length,
    avgMastery: books.length > 0 
      ? Math.round(books.reduce((acc, b) => acc + (b.mastery || 0), 0) / books.length) 
      : 0,
    completed: books.filter(b => b.completionRate === 100).length
  };

  return (
    <div className="flex flex-col h-full bg-[#f5f5f0] pb-20 overflow-hidden">
      {/* Header Section */}
      <div className="px-6 pt-12 pb-6 bg-white/50 backdrop-blur-sm border-b border-stone-200/50">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-serif font-bold text-[#064e3b]">书架</h1>
            <p className="text-stone-500 text-sm mt-1">管理您的精读计划与学习进度</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-full w-10 h-10 p-0" onClick={() => setIsFolderModalOpen(true)}>
              <FolderPlus className="w-4 h-4" />
            </Button>
            {/* Folder Creation Modal */}
            {isFolderModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm">
                  <h2 className="text-lg font-bold mb-4 text-[#064e3b]">创建文件夹</h2>
                  <input
                    type="text"
                    placeholder="请输入文件夹名称"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="w-full p-2 border border-stone-200 rounded-lg mb-6"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsFolderModalOpen(false)}>取消</Button>
                    <Button variant="primary" onClick={handleCreateFolder}>确定</Button>
                  </div>
                </div>
              </div>
            )}
            <Button 
              variant="primary" 
              size="sm" 
              className="rounded-full px-4"
              onClick={onAddBook}
            >
              <Plus className="w-4 h-4 mr-1" />
              添加书籍
            </Button>
          </div>
        </div>

        {/* Folder Switcher */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
          <Button
            variant={activeFolder === null ? "primary" : "outline"}
            size="sm"
            className="rounded-full px-4"
            onClick={() => setActiveFolder(null)}
          >
            全部
          </Button>
          <Button
            variant={activeFolder === 'default' ? "primary" : "outline"}
            size="sm"
            className="rounded-full px-4"
            onClick={() => setActiveFolder('default')}
          >
            未分类
          </Button>
          {folders.map(folder => (
            <Button
              key={folder.id}
              variant={activeFolder === folder.id ? "primary" : "outline"}
              size="sm"
              className="rounded-full px-4"
              onClick={() => setActiveFolder(folder.id || null)}
            >
              <Folder className="w-3 h-3 mr-1" />
              {folder.name}
            </Button>
          ))}
        </div>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-2xl border border-stone-200/60 shadow-sm">
            <div className="flex items-center gap-2 text-stone-400 text-xs mb-1">
              <BookOpen className="w-3 h-3" />
              <span>在读数目</span>
            </div>
            <div className="text-xl font-bold text-[#064e3b]">{stats.total}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-stone-200/60 shadow-sm">
            <div className="flex items-center gap-2 text-stone-400 text-xs mb-1">
              <TrendingUp className="w-3 h-3" />
              <span>平均掌握度</span>
            </div>
            <div className="text-xl font-bold text-[#064e3b]">{stats.avgMastery}%</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-stone-200/60 shadow-sm">
            <div className="flex items-center gap-2 text-stone-400 text-xs mb-1">
              <Clock className="w-3 h-3" />
              <span>已完成</span>
            </div>
            <div className="text-xl font-bold text-[#064e3b]">{stats.completed}</div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input 
              type="text" 
              placeholder="搜索书名或作者..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20"
            />
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full px-3"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-stone-400">
            <div className="w-8 h-8 border-2 border-[#064e3b] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm">正在整理书架...</p>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-20 h-20 bg-stone-200/50 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="w-10 h-10 text-stone-300" />
            </div>
            <h3 className="text-stone-600 font-medium">书架空空如也</h3>
            <p className="text-stone-400 text-sm mt-1 max-w-[200px] mb-6">
              {searchQuery ? '没有找到匹配的书籍' : '快去题库挑选您感兴趣的书籍并加入书架吧'}
            </p>
            {!searchQuery && (
              <Button 
                variant="primary" 
                size="sm" 
                className="rounded-full px-6 h-10"
                onClick={onAddBook}
              >
                去添加书籍
              </Button>
            )}
          </div>
        ) : (
          <div className={cn(
            "grid gap-6",
            viewMode === 'grid' ? "grid-cols-2" : "grid-cols-1"
          )}>
            <AnimatePresence mode="popLayout">
              {filteredBooks.map((book) => (
                <BookCard 
                  key={book.id} 
                  book={book} 
                  viewMode={viewMode}
                  onClick={() => onSelectBook(book)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

interface BookCardProps {
  book: UserBook;
  viewMode: 'grid' | 'list';
  onClick: () => void;
}

const BookCard: React.FC<BookCardProps> = ({ book, viewMode, onClick }) => {
  const handleMove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const folderId = prompt("请输入目标文件夹ID (暂时使用ID):");
    if (folderId) {
      await moveBookToFolder(book.id!, folderId);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onClick={onClick}
      className={cn(
        "group bg-white rounded-3xl border border-stone-200/60 shadow-sm overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-md hover:border-stone-300 hover:-translate-y-1",
        viewMode === 'list' ? "flex h-32" : "flex flex-col"
      )}
    >
      {/* Book Cover Placeholder */}
      <div className={cn(
        "bg-stone-100 flex items-center justify-center overflow-hidden relative",
        viewMode === 'list' ? "w-24 h-full" : "aspect-[3/4] w-full"
      )}>
        {book.coverURL ? (
          <img src={book.coverURL} alt={book.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="flex flex-col items-center text-stone-300">
            <BookOpen className="w-8 h-8 mb-1" />
            <span className="text-[10px] uppercase tracking-widest font-bold">No Cover</span>
          </div>
        )}
        {/* Progress Overlay */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-stone-200">
          <div 
            className="h-full bg-[#064e3b]" 
            style={{ width: `${book.completionRate || 0}%` }}
          />
        </div>
        <button 
          onClick={handleMove}
          className="absolute top-2 right-2 p-1 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Folder className="w-4 h-4 text-stone-600" />
        </button>
      </div>

      {/* Book Info */}
      <div className="p-4 flex flex-col justify-between flex-1">
        <div>
          <h4 className="font-serif font-bold text-[#064e3b] line-clamp-1 group-hover:text-[#043d2e] transition-colors">
            {book.title}
          </h4>
          <p className="text-stone-400 text-xs mt-0.5 line-clamp-1">{book.author}</p>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[10px] text-stone-400 mb-1">
            <span>掌握度</span>
            <span className="font-bold text-[#064e3b]">{book.mastery || 0}%</span>
          </div>
          <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${book.mastery || 0}%` }}
              className="h-full bg-gradient-to-r from-[#064e3b] to-[#059669]"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
