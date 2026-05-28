/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ListTodo, Check, Plus, Trash2, Tag, Calendar } from 'lucide-react';
import { Todo } from '../types/dashboard';

interface TodoWidgetProps {
  size: 'small' | 'medium' | 'large' | 'wide';
  width?: number;
  height?: number;
}

const CATEGORIES = ['전체', '행정업무', '수업준비', '생활지도', '개인'];
const CATEGORY_COLORS: { [key: string]: string } = {
  '행정업무': 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300 border-pink-200/50',
  '수업준비': 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200/50',
  '생활지도': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/50',
  '개인': 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200/50',
};

export default function TodoWidget({ size, width, height }: TodoWidgetProps) {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem('widget_todos_list');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [
      { id: 'todo-1', text: '1교시 수학 수행평가 채점하기', completed: false, category: '수업준비' },
      { id: 'todo-2', text: '학부모 상담 일지 기록하기', completed: true, category: '생활지도' },
      { id: 'todo-3', text: '교육청 학교 정보 공문 회신', completed: false, category: '행정업무' },
      { id: 'todo-4', text: '퇴근 전 컴퓨터 끄기 및 보안 점검', completed: false, category: '개인' }
    ];
  });

  const [newText, setNewText] = useState('');
  const [selectedCat, setSelectedCat] = useState('행정업무');
  const [filterCat, setFilterCat] = useState('전체');

  useEffect(() => {
    localStorage.setItem('widget_todos_list', JSON.stringify(todos));
  }, [todos]);

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newText.trim()) return;

    const newTodo: Todo = {
      id: `todo-${Date.now()}`,
      text: newText.trim(),
      completed: false,
      category: selectedCat
    };

    setTodos([newTodo, ...todos]);
    setNewText('');
  };

  const handleToggle = (id: string) => {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleDelete = (id: string) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  const filteredTodos = filterCat === '전체' 
    ? todos 
    : todos.filter(t => t.category === filterCat);

  return (
    <div className="flex flex-col h-full justify-between select-none p-0.5">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 dark:border-black/5 pb-2 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-100">
          <ListTodo className="w-4 h-4 text-pink-500" />
          <span>오늘의 할 일</span>
        </div>
        <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400 bg-pink-50/50 dark:bg-pink-950/30 px-1.5 py-0.5 rounded">
          {todos.filter(t => !t.completed).length}개 대기
        </span>
      </div>

      {/* Tabs / Filters */}
      <div className="flex gap-1 overflow-x-auto no-drag py-1.5 border-b border-slate-200/40 dark:border-slate-800/20 scrollbar-none shrink-0">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`cursor-pointer text-[10px] px-2 py-0.5 rounded-full border transition-all shrink-0 ${
              filterCat === cat
                ? 'bg-pink-500 text-white border-pink-500 font-bold'
                : 'bg-white/40 dark:bg-black/25 text-slate-600 dark:text-slate-350 border-slate-200 dark:border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Scrollable Todo List */}
      <div className="flex-1 overflow-y-auto my-2 space-y-2 max-h-48 pr-1">
        {filteredTodos.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 py-6 text-center text-[11px]">
            <Check className="w-5 h-5 text-slate-300 dark:text-slate-700 mb-1" />
            <span>등록된 {filterCat === '전체' ? '' : `[${filterCat}] `}할 일이 없습니다!</span>
          </div>
        ) : (
          filteredTodos.map(todo => (
            <div
              key={todo.id}
              className={`flex items-center justify-between p-2 rounded-xl transition-all border ${
                todo.completed
                  ? 'bg-slate-100/30 dark:bg-black/10 border-slate-200/30 opacity-60'
                  : 'bg-white/40 dark:bg-slate-850/30 border-white/20 dark:border-slate-800/10 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <button
                  onClick={() => handleToggle(todo.id)}
                  className={`cursor-pointer w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                    todo.completed
                      ? 'bg-pink-500 border-pink-500 text-white'
                      : 'border-slate-350 dark:border-slate-600 hover:border-pink-400'
                  }`}
                >
                  {todo.completed && <Check className="w-2.5 h-2.5 stroke-[3px]" />}
                </button>
                <div className="min-w-0 pr-1 flex-1">
                  <p className={`text-[11px] font-semibold truncate text-slate-800 dark:text-slate-150 ${
                    todo.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''
                  }`}>
                    {todo.text}
                  </p>
                  <span className={`inline-block text-[8px] font-bold px-1 rounded-sm mt-0.5 border ${
                    CATEGORY_COLORS[todo.category] || 'bg-slate-100 text-slate-600'
                  }`}>
                    {todo.category}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleDelete(todo.id)}
                className="cursor-pointer p-1 rounded hover:bg-red-500/10 hover:text-red-500 text-slate-400 dark:text-slate-500 transition-all shrink-0 no-drag"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Bottom Inputs */}
      <form onSubmit={handleAdd} className="flex gap-1.5 items-center mt-auto shrink-0 no-drag pt-1.5 border-t border-slate-200/40 dark:border-slate-800/20">
        <select
          value={selectedCat}
          onChange={(e) => setSelectedCat(e.target.value)}
          className="text-[10px] bg-white/50 dark:bg-black/30 border border-slate-200 dark:border-slate-800 rounded px-1 py-1 cursor-pointer font-bold shrink-0 outline-none focus:ring-1 focus:ring-pink-300"
        >
          {CATEGORIES.slice(1).map(cat => (
            <option key={cat} value={cat} className="bg-white dark:bg-slate-900">{cat}</option>
          ))}
        </select>
        <div className="relative flex-1">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="새 할 일 입력..."
            className="w-full text-[11px] bg-white/50 dark:bg-black/30 border border-slate-200 dark:border-slate-850 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-100 placeholder-slate-450 outline-none focus:ring-1 focus:ring-pink-400 font-semibold"
          />
        </div>
        <button
          type="submit"
          className="cursor-pointer bg-pink-500 hover:bg-pink-600 active:bg-pink-700 text-white rounded-lg p-1 transition-all shrink-0 shadow-sm"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
