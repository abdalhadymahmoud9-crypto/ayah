/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { formatContent } from './utils/format';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './lib/firebase';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
}

interface Chat {
  id: string;
  title: string;
  msgs: Message[];
  updatedAt: number;
}

interface Settings {
  theme: 'system' | 'light' | 'dark';
  size: 's' | 'm' | 'l';
  style: 'short' | 'detailed';
  madhhab: 'none' | 'hanafi' | 'maliki' | 'shafii' | 'hanbali';
}

const TOPICS: Record<string, string[]> = {
  'العقيدة': ['ما معنى لا إله إلا الله وشروطها؟', 'ما هي أركان الإيمان الستة؟'],
  'الطهارة': ['ما هي نواقض الوضوء؟', 'كيف يتيمم من لم يجد الماء؟'],
  'الصلاة': ['ما حكم من فاتته صلاة حتى خرج وقتها؟', 'ما هي السنن الرواتب؟'],
  'الزكاة': ['ما هو نصاب زكاة الذهب؟', 'لمن تُصرف الزكاة؟']
};

const SUGGESTIONS = [
  'ما حكم صلاة الجماعة للرجال؟',
  'ما هي شروط الصلاة وأركانها؟',
  'كيف أحسب زكاة المال والحلي؟',
  'ما فضل أذكار الصباح والمساء؟'
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const saved = localStorage.getItem('hujja_s');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { theme: 'system', size: 'm', style: 'detailed', madhhab: 'none' };
  });

  const [chats, setChats] = useState<Chat[]>(() => {
    try {
      const saved = localStorage.getItem('hujja_c');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputQuestion, setInputQuestion] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [expandedRefs, setExpandedRefs] = useState<Record<number, boolean>>({});
  const [copiedRefKey, setCopiedRefKey] = useState<string | null>(null);

  const toggleRefs = (index: number) => {
    setExpandedRefs(prev => ({
      ...prev,
      [index]: prev[index] === undefined ? false : !prev[index],
    }));
  };

  const handleCopyRef = async (refText: string, key: string) => {
    try {
      await navigator.clipboard.writeText(refText);
      setCopiedRefKey(key);
      setTimeout(() => setCopiedRefKey(null), 2000);
    } catch {}
  };

  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Monitor Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Sync chats with Firestore when user is authenticated
  useEffect(() => {
    if (!currentUser) return;

    const chatsColRef = collection(db, 'users', currentUser.uid, 'chats');
    const unsubscribe = onSnapshot(
      chatsColRef,
      snapshot => {
        const syncedChats: Chat[] = [];
        snapshot.forEach(docSnap => {
          const d = docSnap.data();
          syncedChats.push({
            id: d.id,
            title: d.title,
            msgs: d.msgs || [],
            updatedAt: d.updatedAt || Date.now(),
          });
        });

        // Sort by updatedAt descending
        syncedChats.sort((a, b) => b.updatedAt - a.updatedAt);

        // If Firestore had records, update state
        if (syncedChats.length > 0) {
          setChats(syncedChats);
        } else if (chats.length > 0) {
          // Migrate local chats to Firestore on first sync
          chats.forEach(async c => {
            try {
              await setDoc(doc(db, 'users', currentUser.uid, 'chats', c.id), {
                id: c.id,
                userId: currentUser.uid,
                title: c.title,
                msgs: c.msgs,
                updatedAt: c.updatedAt,
                createdAt: new Date().toISOString(),
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}/chats/${c.id}`);
            }
          });
        }
      },
      error => {
        handleFirestoreError(error, OperationType.LIST, `users/${currentUser.uid}/chats`);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Apply theme and font size to document root
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', settings.theme);
    }

    const fontSizes: Record<string, string> = { s: '15px', m: '17px', l: '19px' };
    root.style.setProperty('--fs', fontSizes[settings.size] || '17px');

    try {
      localStorage.setItem('hujja_s', JSON.stringify(settings));
    } catch {}

    // Sync settings to Firestore if signed in
    if (currentUser) {
      setDoc(
        doc(db, 'users', currentUser.uid, 'settings', 'preferences'),
        {
          userId: currentUser.uid,
          theme: settings.theme,
          size: settings.size,
          style: settings.style,
          madhhab: settings.madhhab,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch(() => {});
    }
  }, [settings, currentUser]);

  // Persist chats locally
  useEffect(() => {
    try {
      localStorage.setItem('hujja_c', JSON.stringify(chats));
    } catch {}
  }, [chats]);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chats, currentChatId, isGenerating]);

  // Handle textarea autosize
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputQuestion(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const currentChat = chats.find(c => c.id === currentChatId);

  const startNewChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setCurrentChatId(null);
    setIsSidebarOpen(false);
    setInputQuestion('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const deleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChats(prev => prev.filter(c => c.id !== id));
    if (currentChatId === id) {
      setCurrentChatId(null);
    }

    if (currentUser) {
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'chats', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${currentUser.uid}/chats/${id}`);
      }
    }
  };

  const clearAllChats = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);

    if (currentUser) {
      chats.forEach(async c => {
        try {
          await deleteDoc(doc(db, 'users', currentUser.uid, 'chats', c.id));
        } catch {}
      });
    }

    setChats([]);
    setCurrentChatId(null);
    setIsSettingsOpen(false);
  };

  const handleCopyMessage = async (content: string, index: number) => {
    try {
      const clean = content
        .replace(/\[\[نازلة\]\]/g, '')
        .replace(/\[\[مراجع\]\][\s\S]*$/, '')
        .replace(/\[\[متابعة\]\][\s\S]*$/, '')
        .trim();
      await navigator.clipboard.writeText(clean);
      setCopiedId(index);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Sign-in error:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setIsSettingsOpen(false);
    } catch (err: any) {
      console.error('Sign-out error:', err);
    }
  };

  const ask = async (questionText: string) => {
    const text = questionText.trim();
    if (!text || isGenerating) return;

    let targetChatId = currentChatId;
    let targetChat = chats.find(c => c.id === targetChatId);

    if (!targetChat) {
      const newChat: Chat = {
        id: Date.now().toString(36),
        title: text.length > 40 ? text.slice(0, 40) + '…' : text,
        msgs: [],
        updatedAt: Date.now(),
      };
      targetChatId = newChat.id;
      setChats(prev => [newChat, ...prev]);
      setCurrentChatId(newChat.id);
      targetChat = newChat;
    }

    const userMessage: Message = { role: 'user', content: text };
    const initialAssistantMessage: Message = { role: 'assistant', content: '' };

    setChats(prev =>
      prev.map(c => {
        if (c.id === targetChatId) {
          return {
            ...c,
            msgs: [...c.msgs, userMessage, initialAssistantMessage],
            updatedAt: Date.now(),
          };
        }
        return c;
      })
    );

    setInputQuestion('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setIsGenerating(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const validHistory = (targetChat?.msgs || [])
        .filter(m => !m.isError && m.content && m.content.trim().length > 0)
        .map(m => ({ role: m.role, content: m.content }));
      const historyToSend = [...validHistory, userMessage];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyToSend,
          style: settings.style,
          madhhab: settings.madhhab,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `تعذر الاتصال بالخادم (${response.status})`);
      }

      if (!response.body) {
        throw new Error('لم يتم استلام استجابة من الخادم.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let assistantText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.slice(5).trim();

          if (dataStr === '[DONE]') {
            break;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.error) {
              let errText = parsed.error;
              try {
                const sub = JSON.parse(errText);
                if (sub.error?.message) errText = sub.error.message;
              } catch {}
              throw new Error(errText);
            }
            if (parsed.text) {
              assistantText += parsed.text;
              setChats(prev =>
                prev.map(c => {
                  if (c.id === targetChatId) {
                    const newMsgs = [...c.msgs];
                    const lastIdx = newMsgs.length - 1;
                    if (lastIdx >= 0) {
                      newMsgs[lastIdx] = {
                        role: 'assistant',
                        content: assistantText,
                      };
                    }
                    return { ...c, msgs: newMsgs, updatedAt: Date.now() };
                  }
                  return c;
                })
              );
            }
          } catch (e: any) {
            if (e.message && e.message !== 'Unexpected end of JSON input') {
              throw e;
            }
          }
        }
      }

      // Sync completed chat to Firestore
      if (currentUser && targetChatId) {
        const finalMsgs = [...(targetChat?.msgs || []), userMessage, { role: 'assistant' as const, content: assistantText }];
        setDoc(doc(db, 'users', currentUser.uid, 'chats', targetChatId), {
          id: targetChatId,
          userId: currentUser.uid,
          title: targetChat?.title || text.slice(0, 40),
          msgs: finalMsgs,
          updatedAt: Date.now(),
        }).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}/chats/${targetChatId}`);
        });
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User stopped generation manually
      } else {
        const errorMsg = err.message || 'حدث خطأ أثناء البحث في المسألة. يرجى المحاولة مرة أخرى.';
        setChats(prev =>
          prev.map(c => {
            if (c.id === targetChatId) {
              const newMsgs = [...c.msgs];
              const lastIdx = newMsgs.length - 1;
              if (lastIdx >= 0) {
                newMsgs[lastIdx] = {
                  role: 'assistant',
                  content: 'حدث خطأ: ' + errorMsg,
                  isError: true,
                };
              }
              return { ...c, msgs: newMsgs };
            }
            return c;
          })
        );
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ask(inputQuestion);
    }
  };

  const filteredChats = chats.filter(c =>
    !searchQuery.trim() || c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedCards = selectedTopic ? TOPICS[selectedTopic] : SUGGESTIONS;

  return (
    <>
      <aside id="side" className={isSidebarOpen ? 'on' : ''}>
        <div className="brand" style={{display:'flex',alignItems:'center',gap:6}}><img src="/assets/aistudio/App_icon_and_favicon_1x_8a38fada.png" alt="" aria-hidden="true" width={40} height={40} style={{width:40,height:40,objectFit:'contain',flexShrink:0}} /><span>AYAH (آية)</span></div>

        <button className="sbtn" id="new" onClick={startNewChat}>
          ✎ محادثة جديدة
        </button>

        <input
          id="search"
          placeholder="ابحث في المحادثات"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />

        <div id="list">
          <div className="lbl">المحادثات</div>
          {filteredChats.map(c => (
            <div
              key={c.id}
              className={`item ${c.id === currentChatId ? 'on' : ''}`}
            >
              <button
                className="t"
                onClick={() => {
                  setCurrentChatId(c.id);
                  setIsSidebarOpen(false);
                }}
              >
                {c.title}
              </button>
              <button
                className="x"
                title="حذف المحادثة"
                onClick={e => deleteChat(c.id, e)}
              >
                🗑
              </button>
            </div>
          ))}
        </div>

        {/* Account and Sync Status */}
        <div className="acct" id="acct">
          {currentUser ? (
            <div>
              <div style={{ fontWeight: 500, color: 'var(--text)' }}>
                {currentUser.displayName || currentUser.email}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                المزامنة السحابية مفعلة ✓
              </div>
            </div>
          ) : (
            <div>نسخة أولية تجريبية</div>
          )}
        </div>

        {/* Google Sign In / Account Button */}
        {!currentUser ? (
          <button className="sbtn" onClick={handleSignIn}>
            👤 تسجيل الدخول والمزامنة
          </button>
        ) : null}

        <button className="sbtn" id="gear" onClick={() => setIsSettingsOpen(true)}>
          ⚙ الإعدادات
        </button>
      </aside>

      <main>
        <div className="top">
          <button
            id="menu"
            className={isSidebarOpen ? 'on' : ''}
            onClick={() => setIsSidebarOpen(prev => !prev)}
            aria-label="القائمة الجانبية"
          >
            ☰
          </button>
          <span className="name" style={{display:'inline-flex',alignItems:'center',gap:4}}><img src="/assets/aistudio/App_icon_and_favicon_1x_8a38fada.png" alt="" aria-hidden="true" width={32} height={32} style={{width:32,height:32,objectFit:'contain',flexShrink:0}} /><span>AYAH (آية)</span></span>
        </div>

        <div id="scroll" ref={scrollContainerRef}>
          <div className="col" id="col">
            {!currentChat || currentChat.msgs.length === 0 ? (
              <div className="welcome">
                <div className="bis">بسم الله الرحمن الرحيم</div>
                <h2>بماذا أستطيع خدمتك؟</h2>
                <div className="topics">
                  {Object.keys(TOPICS).map(topic => (
                    <button
                      key={topic}
                      className={`card ${selectedTopic === topic ? 'on' : ''}`}
                      style={{ padding: '6px 14px' }}
                      onClick={() =>
                        setSelectedTopic(prev => (prev === topic ? null : topic))
                      }
                    >
                      {topic}
                    </button>
                  ))}
                </div>
                <div className="cards">
                  {displayedCards.map((suggestion, index) => (
                    <button
                      key={index}
                      className="card"
                      onClick={() => ask(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              currentChat.msgs.map((m, index) => {
                if (m.role === 'user') {
                  return (
                    <div key={index} className="row u">
                      <div className="bubble">{m.content}</div>
                    </div>
                  );
                }

                const isCurrentlyStreaming =
                  isGenerating &&
                  index === currentChat.msgs.length - 1 &&
                  m.content === '';

                const formatted = formatContent(m.content);

                const isRefsOpen = expandedRefs[index] !== false;

                return (
                  <div key={index} className="row">
                    <div className="av">آ</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        className={`body ${m.isError ? 'err' : ''}`}
                        dangerouslySetInnerHTML={{
                          __html: isCurrentlyStreaming
                            ? 'جارٍ البحث في المسألة وتوثيق المتون الشرعية…'
                            : formatted.html,
                        }}
                      />

                      {/* Scholarly References & Classical Matn Shelf */}
                      {formatted.references && formatted.references.length > 0 && (
                        <div className="ref-shelf">
                          <button
                            type="button"
                            className="ref-toggle"
                            onClick={() => toggleRefs(index)}
                            title="عرض أو طي المتون والمراجع المعتمدة"
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>📖</span>
                              <span>المتون والمراجع العلمية المعتمدة</span>
                              <span className="ref-badge">{formatted.references.length}</span>
                            </span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                              {isRefsOpen ? '▲ طي' : '▼ عرض المتون'}
                            </span>
                          </button>

                          {isRefsOpen && (
                            <div className="ref-list">
                              {formatted.references.map((ref, rIdx) => {
                                const refKey = `${index}-${rIdx}`;
                                return (
                                  <div key={rIdx} className="ref-card">
                                    <div className="ref-card-header">
                                      <span className="ref-title">
                                        <span>📜</span>
                                        <span>{ref.title}</span>
                                      </span>
                                      {ref.location && (
                                        <span className="ref-loc">📍 {ref.location}</span>
                                      )}
                                    </div>
                                    <div className="ref-excerpt">
                                      «{ref.excerpt}»
                                    </div>
                                    <button
                                      type="button"
                                      className="ref-copy-btn"
                                      onClick={() =>
                                        handleCopyRef(
                                          `${ref.title} - ${ref.location || ''}\n«${ref.excerpt}»`,
                                          refKey
                                        )
                                      }
                                    >
                                      {copiedRefKey === refKey ? '✓ تم نسخ المتن' : 'نسخ نص المتن'}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Interactive follow-up suggestions */}
                      {formatted.followUps.length > 0 && !isGenerating && (
                        <div className="chips">
                          {formatted.followUps.map((fu, fuIdx) => (
                            <button
                              key={fuIdx}
                              onClick={() => ask(fu)}
                            >
                              {fu}
                            </button>
                          ))}
                        </div>
                      )}

                      {!isCurrentlyStreaming && !m.isError && m.content && (
                        <div className="act">
                          <button onClick={() => handleCopyMessage(m.content, index)}>
                            {copiedId === index ? '✓ تم النسخ' : 'نسخ الإجابة'}
                          </button>
                          <button
                            type="button"
                            className="quick-action"
                            onClick={() =>
                              ask(
                                'لخص الإجابة السابقة واجعلها أقصر وأكثر إيجازاً وتركيزاً في صلب المسألة، مع الحفاظ التام على جميع الأدلة والشروط والضوابط الفقهية دون إخلال.'
                              )
                            }
                            title="طلب إجابة أقصر وموجزة بدون إخلال بالتفاصيل"
                          >
                            <span>⚡</span>
                            <span>إيجاز مختصر (بدون إخلال)</span>
                          </button>
                          <button
                            type="button"
                            className="quick-action"
                            onClick={() =>
                              ask(
                                'أريد تفصيلاً وبسطاً أوسع واستقصاءً شاملاً للمسألة السابقة، مع ذكر مذاهب الفقهاء وأدلتهم ومناقشتها والترجيح المعتمد دون إغفال أي جزئية.'
                              )
                            }
                            title="طلب إجابة مفصلة وبسط واسع للمسألة"
                          >
                            <span>🔍</span>
                            <span>بسط وتفصيل مستقصى</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="dock">
          <div className="comp">
            <button
              id="send"
              disabled={!isGenerating && !inputQuestion.trim()}
              onClick={() => (isGenerating ? stopGeneration() : ask(inputQuestion))}
              title={isGenerating ? 'إيقاف' : 'إرسال'}
            >
              {isGenerating ? '■' : '↑'}
            </button>
            <textarea
              ref={textareaRef}
              id="q"
              rows={1}
              placeholder="اسأل عن مسألة شرعية"
              value={inputQuestion}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>
        <div className="note">
          قد يخطئ «AYAH (آية)»، فتثبّت من الأدلة وراجع أهل العلم الثقات، ولا سيما في النوازل.
        </div>
      </main>

      {/* Settings Modal */}
      <div
        id="ov"
        className={isSettingsOpen ? 'on' : ''}
        onClick={e => {
          if (e.target === e.currentTarget) setIsSettingsOpen(false);
        }}
      >
        <div className="modal">
          <h3>
            <span>الإعدادات</span>
            <button id="close" onClick={() => setIsSettingsOpen(false)}>
              ✕
            </button>
          </h3>

          {/* User Account Section */}
          <div className="set">
            <span>الحساب والمزامنة</span>
            {currentUser ? (
              <div style={{ textAlign: 'start' }}>
                <div style={{ fontSize: '0.85rem' }}>{currentUser.displayName || currentUser.email}</div>
                <button
                  className="danger"
                  style={{ marginTop: '4px', fontSize: '0.78rem' }}
                  onClick={handleSignOut}
                >
                  تسجيل الخروج
                </button>
              </div>
            ) : (
              <button className="danger" onClick={handleSignIn}>
                تسجيل الدخول عبر Google
              </button>
            )}
          </div>

          <div className="set">
            <span>المظهر</span>
            <div className="seg">
              <button
                className={settings.theme === 'system' ? 'on' : ''}
                onClick={() => setSettings(s => ({ ...s, theme: 'system' }))}
              >
                تلقائي
              </button>
              <button
                className={settings.theme === 'light' ? 'on' : ''}
                onClick={() => setSettings(s => ({ ...s, theme: 'light' }))}
              >
                فاتح
              </button>
              <button
                className={settings.theme === 'dark' ? 'on' : ''}
                onClick={() => setSettings(s => ({ ...s, theme: 'dark' }))}
              >
                داكن
              </button>
            </div>
          </div>

          <div className="set">
            <span>حجم الخط</span>
            <div className="seg">
              <button
                className={settings.size === 's' ? 'on' : ''}
                onClick={() => setSettings(s => ({ ...s, size: 's' }))}
              >
                صغير
              </button>
              <button
                className={settings.size === 'm' ? 'on' : ''}
                onClick={() => setSettings(s => ({ ...s, size: 'm' }))}
              >
                متوسط
              </button>
              <button
                className={settings.size === 'l' ? 'on' : ''}
                onClick={() => setSettings(s => ({ ...s, size: 'l' }))}
              >
                كبير
              </button>
            </div>
          </div>

          <div className="set">
            <span>أسلوب الإجابة</span>
            <div className="seg">
              <button
                className={settings.style === 'short' ? 'on' : ''}
                onClick={() => setSettings(s => ({ ...s, style: 'short' }))}
              >
                مختصر
              </button>
              <button
                className={settings.style === 'detailed' ? 'on' : ''}
                onClick={() => setSettings(s => ({ ...s, style: 'detailed' }))}
              >
                مفصّل
              </button>
            </div>
          </div>

          <div className="set">
            <span>المذهب الفقهي</span>
            <select
              id="madh"
              className="danger"
              style={{ background: 'var(--bg)', color: 'var(--text)' }}
              value={settings.madhhab}
              onChange={e =>
                setSettings(s => ({ ...s, madhhab: e.target.value as any }))
              }
            >
              <option value="none">بدون تحديد</option>
              <option value="hanafi">حنفي</option>
              <option value="maliki">مالكي</option>
              <option value="shafii">شافعي</option>
              <option value="hanbali">حنبلي</option>
            </select>
          </div>

          <div className="set">
            <span>حذف جميع المحادثات</span>
            <button className="danger" id="wipe" onClick={clearAllChats}>
              حذف
            </button>
          </div>

          <div className="about">
            «AYAH (آية)» مساعد علمي شرعي على منهج أهل السنة والجماعة بفهم السلف الصالح. لا يغني عن سؤال العلماء الثقات.
          </div>
        </div>
      </div>
    </>
  );
}
