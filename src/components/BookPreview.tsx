import React, { useState } from 'react';
import { Book } from '../types';
import { addToBookshelf } from '../services/bookshelfService';

interface BookPreviewProps {
  book: Book;
  onClose: () => void;
}

export const BookPreview: React.FC<BookPreviewProps> = ({ book, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAdd = async () => {
    if (!book.id) return;
    setLoading(true);
    try {
      await addToBookshelf(book.id);
      setMessage('成功收藏到书架！');
      setTimeout(onClose, 1500);
    } catch (error) {
      setMessage('收藏失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
        <h2 className="text-2xl font-bold mb-2">{book.title}</h2>
        <p className="text-gray-600 mb-4">{book.author} | {book.publisher}</p>
        <p className="text-sm text-gray-700 mb-6 line-clamp-4">{book.summary}</p>
        
        {message && <p className="text-sm text-center mb-4 font-medium">{message}</p>}
        
        <div className="flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            关闭
          </button>
          <button 
            onClick={handleAdd}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading ? '收藏中...' : '收藏到书架'}
          </button>
        </div>
      </div>
    </div>
  );
};
