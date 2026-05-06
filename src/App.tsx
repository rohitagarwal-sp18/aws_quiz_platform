import { useState, useCallback, useEffect, useRef } from 'react';
import { questions, DOMAIN_NAMES, DOMAIN_COLORS, type Question } from './data/questions';
import './App.css';

type Screen = 'home' | 'quiz' | 'results';
type QuizMode = 'practice' | 'mock';

interface UserAnswer {
  selected: string[];
  correct: boolean;
}

interface QuizState {
  quizMode: QuizMode;
  playerName: string;
  activeQuestions: Question[];
  currentIndex: number;
  userAnswers: Record<number, UserAnswer>;
  currentSelection: string[];
  showAnswer: boolean;
  questionStartTime: number;
  questionTimes: Record<number, number>;
  quizStartTime: number;
  showJumpPopup: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

function makeDevState(mode: QuizMode, name: string): QuizState {
  const qs = [...questions];
  const answers: Record<number, UserAnswer> = {};
  const times: Record<number, number> = {};
  qs.forEach((q, i) => {
    const correct = i % 4 !== 0;
    answers[q.id] = { selected: correct ? q.correct : [q.options[q.correct.includes('A') ? 1 : 0].letter], correct };
    times[q.id] = Math.floor(Math.random() * 20000 + 5000);
  });
  return {
    quizMode: mode,
    playerName: name || 'Dev User',
    activeQuestions: qs,
    currentIndex: qs.length - 1,
    userAnswers: answers,
    currentSelection: [],
    showAnswer: false,
    questionStartTime: Date.now(),
    questionTimes: times,
    quizStartTime: Date.now() - 1200000,
    showJumpPopup: false,
  };
}

// ── Home Screen ──────────────────────────────────────────────────────────────
function HomeScreen({ onStart }: { onStart: (mode: QuizMode, domain: number, name: string) => void }) {
  const [selectedDomain, setSelectedDomain] = useState(0);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [devMode] = useState(false);

  function tryStart(mode: QuizMode) {
    if (!name.trim()) { setNameError(true); return; }
    setNameError(false);
    onStart(mode, selectedDomain, name.trim());
  }

  return (
    <div className="home">
      <div className="home-header">
        <div className="aws-badge">AWS DEA-C01</div>
        <h1 className="home-title">
          Data Engineer<br />
          <span className="title-accent">Associate </span>
          <span className="title-sub">Practice Quiz</span>
        </h1>
        <p className="home-subtitle">100 original practice questions across 4 domains</p>
      </div>

      <div className="name-row">
        <label className="name-label" htmlFor="player-name">Your name</label>
        <input
          id="player-name"
          className={`name-input${nameError ? ' name-input-error' : ''}`}
          type="text"
          placeholder="Enter your name…"
          value={name}
          onChange={e => { setName(e.target.value); if (e.target.value.trim()) setNameError(false); }}
          maxLength={40}
        />
        {nameError && <p className="name-error">Name required to start</p>}
      </div>

      <div className="domain-filter">
        <p className="filter-label">Domain</p>
        <div className="domain-pills">
          <button
            className={`domain-pill ${selectedDomain === 0 ? 'active' : ''}`}
            onClick={() => setSelectedDomain(0)}
          >
            All 100
          </button>
          {[1, 2, 3, 4].map(d => (
            <button
              key={d}
              className={`domain-pill ${selectedDomain === d ? 'active' : ''}`}
              style={{ '--domain-color': DOMAIN_COLORS[d] } as React.CSSProperties}
              onClick={() => setSelectedDomain(d)}
            >
              D{d}
            </button>
          ))}
        </div>
        {selectedDomain > 0 && (
          <p className="domain-name-display" style={{ color: DOMAIN_COLORS[selectedDomain] }}>
            {DOMAIN_NAMES[selectedDomain]}
          </p>
        )}
      </div>

      <div className="mode-cards">
        <button className="mode-card mode-practice" onClick={() => tryStart('practice')}>
          <div className="mode-icon">⚡</div>
          <h2>Practice</h2>
          <p>Instant feedback after each answer with explanation</p>
          <div className="mode-cta">Start Practice →</div>
        </button>
        <button className="mode-card mode-mock" onClick={() => tryStart('mock')}>
          <div className="mode-icon">🎯</div>
          <h2>Mock Exam</h2>
          <p>Answer all questions, then see your full results</p>
          <div className="mode-cta">Start Mock →</div>
        </button>
      </div>

      {devMode && (
        <div className="dev-strip">
          <span className="dev-label">DEV</span>
          <button className="dev-btn" onClick={() => onStart('__dev_practice__' as QuizMode, 0, name || 'Dev User')}>
            Preview Scorecard (Practice)
          </button>
          <button className="dev-btn" onClick={() => onStart('__dev_mock__' as QuizMode, 0, name || 'Dev User')}>
            Preview Scorecard (Mock)
          </button>
        </div>
      )}

      <div className="exam-info">
        <div className="info-item"><span className="info-num">65</span><span>Questions on exam</span></div>
        <div className="info-divider" />
        <div className="info-item"><span className="info-num">130</span><span>Minutes allowed</span></div>
        <div className="info-divider" />
        <div className="info-item"><span className="info-num">720</span><span>Passing score</span></div>
      </div>
    </div>
  );
}

// ── Option Button ────────────────────────────────────────────────────────────
function OptionButton({
  option, selected, showAnswer, isCorrect, onClick,
}: {
  option: { letter: string; text: string };
  selected: boolean;
  showAnswer: boolean;
  isCorrect: boolean;
  onClick: () => void;
}) {
  let state = '';
  if (showAnswer) {
    if (isCorrect) state = 'correct';
    else if (selected) state = 'wrong';
    else state = 'dim';
  } else if (selected) {
    state = 'selected';
  }
  return (
    <button className={`option ${state}`} onClick={onClick} disabled={showAnswer}>
      <span className="option-letter">{option.letter}</span>
      <span className="option-text">{option.text}</span>
      {showAnswer && isCorrect && <span className="option-tick">✓</span>}
      {showAnswer && selected && !isCorrect && <span className="option-tick">✗</span>}
    </button>
  );
}

// ── Jump Popup ───────────────────────────────────────────────────────────────
function JumpPopup({ state, onJump, onClose }: {
  state: QuizState;
  onJump: (index: number) => void;
  onClose: () => void;
}) {
  const { activeQuestions, currentIndex, userAnswers, quizMode } = state;

  function btnClass(i: number) {
    const q = activeQuestions[i];
    const ans = userAnswers[q.id];
    if (i === currentIndex) return 'jq current';
    if (!ans) return 'jq unanswered';
    if (quizMode === 'mock') return 'jq answered-mock';
    return ans.correct ? 'jq answered-correct' : 'jq answered-wrong';
  }

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="jump-popup" onClick={e => e.stopPropagation()}>
        <div className="popup-header">
          <span className="popup-title">Jump to Question</span>
          <button className="popup-close" onClick={onClose}>✕</button>
        </div>
        <div className="popup-legend">
          <span className="leg current">Current</span>
          {quizMode === 'practice' ? (
            <>
              <span className="leg answered-correct">Correct</span>
              <span className="leg answered-wrong">Wrong</span>
            </>
          ) : (
            <span className="leg answered-mock">Answered</span>
          )}
          <span className="leg unanswered">Unanswered</span>
        </div>
        <div className="jump-grid">
          {activeQuestions.map((q, i) => (
            <button key={q.id} className={btnClass(i)} onClick={() => onJump(i)}>
              {q.id}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Quiz Screen ──────────────────────────────────────────────────────────────
function QuizScreen({ state, onSelect, onSubmit, onNext, onQuit, onJump, onToggleJump }: {
  state: QuizState;
  onSelect: (letter: string) => void;
  onSubmit: () => void;
  onNext: () => void;
  onQuit: () => void;
  onJump: (index: number) => void;
  onToggleJump: () => void;
}) {
  const { quizMode, activeQuestions, currentIndex, currentSelection, showAnswer, quizStartTime } = state;
  const q = activeQuestions[currentIndex];
  const progress = (currentIndex / activeQuestions.length) * 100;
  const answeredCount = Object.keys(state.userAnswers).length;

  // Live timer
  const [elapsed, setElapsed] = useState(() => Date.now() - quizStartTime);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(Date.now() - quizStartTime), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [quizStartTime]);

  const canSubmit = q.multiSelect ? currentSelection.length === 2 : currentSelection.length === 1;
  const practiceAnswered = quizMode === 'practice' && showAnswer;
  const mockSelected = quizMode === 'mock' && currentSelection.length > 0;
  const showNext = practiceAnswered || mockSelected;
  const isLast = currentIndex === activeQuestions.length - 1;

  return (
    <div className="quiz">
      {state.showJumpPopup && (
        <JumpPopup state={state} onJump={onJump} onClose={onToggleJump} />
      )}

      {/* Header */}
      <div className="quiz-header">
        <button className="quit-btn" onClick={onQuit}>← Exit</button>
        <div className="quiz-meta">
          <span className="domain-tag" style={{ '--domain-color': DOMAIN_COLORS[q.domain] } as React.CSSProperties}>
            D{q.domain}
          </span>
          <span className="q-counter">{currentIndex + 1} / {activeQuestions.length}</span>
        </div>
        <div className="quiz-header-right">
          <span className="timer-display">⏱ {formatMs(elapsed)}</span>
          {quizMode === 'mock' && (
            <span className="answered-count">{answeredCount}/{activeQuestions.length}</span>
          )}
          <button className="jump-open-btn" onClick={onToggleJump} title="Jump to question">
            <span>⊞</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Question */}
      <div className="question-wrap">
        <div className="q-number-row">
          <span className="q-number">Q{q.id}</span>
          <span className="q-domain-full" style={{ color: DOMAIN_COLORS[q.domain] }}>{q.domainName}</span>
        </div>
        <p className="q-text">{q.question}</p>
        {q.multiSelect && (
          <p className="multi-hint">Select 2 answers · {currentSelection.length}/2 selected</p>
        )}
      </div>

      {/* Options */}
      <div className="options-list">
        {q.options.map(opt => (
          <OptionButton
            key={opt.letter}
            option={opt}
            selected={currentSelection.includes(opt.letter)}
            showAnswer={quizMode === 'practice' ? showAnswer : false}
            isCorrect={q.correct.includes(opt.letter)}
            onClick={() => onSelect(opt.letter)}
          />
        ))}
      </div>

      {/* Practice: check button */}
      {quizMode === 'practice' && !showAnswer && canSubmit && (
        <div className="action-row">
          <button className="btn-primary" onClick={onSubmit}>Check Answer</button>
        </div>
      )}

      {/* Explanation */}
      {quizMode === 'practice' && showAnswer && (
        <div className={`explanation ${state.userAnswers[q.id]?.correct ? 'exp-correct' : 'exp-wrong'}`}>
          <div className="exp-header">
            {state.userAnswers[q.id]?.correct
              ? <span className="exp-badge correct-badge">Correct ✓</span>
              : <span className="exp-badge wrong-badge">Incorrect ✗</span>}
            {!state.userAnswers[q.id]?.correct && (
              <span className="exp-correct-label">Correct: {q.correct.join(', ')}</span>
            )}
          </div>
          <p className="exp-text">{q.explanation}</p>
        </div>
      )}

      {/* Next */}
      {showNext && (
        <div className="action-row">
          <button className="btn-primary" onClick={onNext}>
            {isLast ? (quizMode === 'mock' ? 'See Results →' : 'Finish →') : 'Next →'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Score Card ───────────────────────────────────────────────────────────────
function ScoreCard({ state, onRestart, onHome }: {
  state: QuizState;
  onRestart: () => void;
  onHome: () => void;
}) {
  const [showReview, setShowReview] = useState(false);
  const { activeQuestions, userAnswers, playerName, questionTimes, quizMode } = state;

  const total = activeQuestions.length;
  const correct = Object.values(userAnswers).filter(a => a.correct).length;
  const pct = Math.round((correct / total) * 100);
  const pass = pct >= 72;

  // Time stats
  const totalMs = Object.values(questionTimes).reduce((s, t) => s + t, 0);
  const answered = Object.keys(questionTimes).length;
  const avgMs = answered > 0 ? Math.round(totalMs / answered) : 0;
  const avgSec = Math.round(avgMs / 1000);

  // Per-domain
  const domainStats = [1, 2, 3, 4].map(d => {
    const qs = activeQuestions.filter(q => q.domain === d);
    if (!qs.length) return null;
    const c = qs.filter(q => userAnswers[q.id]?.correct).length;
    return { domain: d, correct: c, total: qs.length, pct: Math.round((c / qs.length) * 100) };
  }).filter(Boolean) as { domain: number; correct: number; total: number; pct: number }[];

  const wrongQuestions = activeQuestions.filter(q => !userAnswers[q.id]?.correct);
  const displayName = playerName.trim() || 'Anonymous';
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="scorecard-page">
      {/* ── The Card ── */}
      <div className={`scorecard ${pass ? 'sc-pass' : 'sc-fail'}`}>
        {/* Card header bar */}
        <div className="sc-topbar">
          <div className="sc-topbar-left">
            <span className="sc-exam-badge">AWS DEA-C01</span>
            <span className="sc-mode-badge">{quizMode === 'practice' ? 'Practice' : 'Mock Exam'}</span>
          </div>
          <span className="sc-date">{dateStr}</span>
        </div>

        {/* Name + verdict */}
        <div className="sc-identity">
          <div className="sc-name-block">
            <span className="sc-name-label">Candidate</span>
            <span className="sc-name">{displayName}</span>
          </div>
          <div className={`sc-verdict ${pass ? 'verdict-pass' : 'verdict-fail'}`}>
            {pass ? '✓ PASS' : '✗ FAIL'}
          </div>
        </div>

        {/* Score ring + stats */}
        <div className="sc-score-row">
          <div className={`sc-ring-wrap ${pass ? 'ring-pass' : 'ring-fail'}`}>
            <svg viewBox="0 0 120 120" className="sc-ring-svg">
              <circle cx="60" cy="60" r="50" className="ring-bg" />
              <circle
                cx="60" cy="60" r="50"
                className="ring-fill"
                strokeDasharray={`${(pct / 100) * 314.159} 314.159`}
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div className="sc-ring-text">
              <span className="sc-pct">{pct}%</span>
              <span className="sc-ring-sub">{correct}/{total}</span>
            </div>
          </div>

          <div className="sc-stats-grid">
            <div className="sc-stat">
              <span className="sc-stat-val">{correct}</span>
              <span className="sc-stat-label">Correct</span>
            </div>
            <div className="sc-stat">
              <span className="sc-stat-val">{total - correct}</span>
              <span className="sc-stat-label">Incorrect</span>
            </div>
            <div className="sc-stat">
              <span className="sc-stat-val">{formatMs(totalMs)}</span>
              <span className="sc-stat-label">Total Time</span>
            </div>
            <div className="sc-stat">
              <span className="sc-stat-val">{avgSec}s</span>
              <span className="sc-stat-label">Avg / Question</span>
            </div>
            <div className="sc-stat sc-stat-threshold">
              <span className="sc-stat-val">72%</span>
              <span className="sc-stat-label">Pass Threshold</span>
            </div>
            <div className="sc-stat">
              <span className={`sc-stat-val ${pct >= 72 ? 'val-green' : pct >= 60 ? 'val-orange' : 'val-red'}`}>
                {pct >= 72 ? 'Strong' : pct >= 60 ? 'Close' : 'Needs Work'}
              </span>
              <span className="sc-stat-label">Status</span>
            </div>
          </div>
        </div>

        {/* Domain bars */}
        <div className="sc-domains">
          <div className="sc-section-label">Domain Performance</div>
          {domainStats.map(d => (
            <div key={d.domain} className="sc-domain-row">
              <span className="sc-dr-num" style={{ color: DOMAIN_COLORS[d.domain] }}>D{d.domain}</span>
              <span className="sc-dr-name">{DOMAIN_NAMES[d.domain]}</span>
              <div className="sc-dr-bar-track">
                <div
                  className="sc-dr-bar-fill"
                  style={{ width: `${d.pct}%`, background: DOMAIN_COLORS[d.domain] }}
                />
                <div className="sc-dr-threshold-line" />
              </div>
              <span className="sc-dr-stat">{d.correct}/{d.total} <span className="sc-dr-pct">({d.pct}%)</span></span>
            </div>
          ))}
        </div>

        {/* Card footer */}
        <div className="sc-footer">
          <span className="sc-footer-text">Practice set · not an official AWS assessment</span>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="results-actions">
        <button className="btn-primary" onClick={onRestart}>Retry Same Set</button>
        <button className="btn-secondary" onClick={onHome}>New Quiz</button>
        {wrongQuestions.length > 0 && (
          <button className="btn-ghost" onClick={() => setShowReview(!showReview)}>
            {showReview ? 'Hide' : 'Review'} {wrongQuestions.length} Wrong
          </button>
        )}
      </div>

      {/* ── Review wrong ── */}
      {showReview && (
        <div className="review-list">
          <h3 className="review-title">Questions You Missed</h3>
          {wrongQuestions.map(q => (
            <div key={q.id} className="review-item">
              <div className="review-q-header">
                <span className="review-qnum">Q{q.id}</span>
                <span className="review-domain" style={{ color: DOMAIN_COLORS[q.domain] }}>{q.domainName}</span>
                {questionTimes[q.id] && (
                  <span className="review-time">⏱ {Math.round(questionTimes[q.id] / 1000)}s</span>
                )}
              </div>
              <p className="review-q-text">{q.question}</p>
              <div className="review-answers">
                {userAnswers[q.id] && (
                  <span className="review-wrong-ans">Your answer: {userAnswers[q.id].selected.join(', ')}</span>
                )}
                <span className="review-correct-ans">
                  Correct: {q.correct.join(', ')} · {q.options.filter(o => q.correct.includes(o.letter)).map(o => o.text).join(', ')}
                </span>
              </div>
              <p className="review-exp">{q.explanation}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── App ──────────────────────────────────────────────────────────────────────
function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [quizState, setQuizState] = useState<QuizState | null>(null);

  const handleStart = useCallback((mode: QuizMode, domain: number, name: string) => {
    // Dev shortcuts
    if (mode === ('__dev_practice__' as QuizMode)) {
      setQuizState(makeDevState('practice', name));
      setScreen('results');
      return;
    }
    if (mode === ('__dev_mock__' as QuizMode)) {
      setQuizState(makeDevState('mock', name));
      setScreen('results');
      return;
    }

    const filtered = shuffle(domain === 0 ? [...questions] : questions.filter(q => q.domain === domain));
    setQuizState({
      quizMode: mode,
      playerName: name,
      activeQuestions: filtered,
      currentIndex: 0,
      userAnswers: {},
      currentSelection: [],
      showAnswer: false,
      questionStartTime: Date.now(),
      questionTimes: {},
      quizStartTime: Date.now(),
      showJumpPopup: false,
    });
    setScreen('quiz');
  }, []);

  const handleSelect = useCallback((letter: string) => {
    setQuizState(prev => {
      if (!prev || prev.showAnswer) return prev;
      const q = prev.activeQuestions[prev.currentIndex];
      if (q.multiSelect) {
        const sel = prev.currentSelection.includes(letter)
          ? prev.currentSelection.filter(l => l !== letter)
          : prev.currentSelection.length < 2 ? [...prev.currentSelection, letter] : prev.currentSelection;
        return { ...prev, currentSelection: sel };
      }
      return { ...prev, currentSelection: [letter] };
    });
  }, []);

  const handleSubmit = useCallback(() => {
    setQuizState(prev => {
      if (!prev) return prev;
      const q = prev.activeQuestions[prev.currentIndex];
      const sel = prev.currentSelection;
      const isCorrect = sel.length === q.correct.length && sel.every(l => q.correct.includes(l));
      const elapsed = Date.now() - prev.questionStartTime;
      return {
        ...prev,
        showAnswer: true,
        userAnswers: { ...prev.userAnswers, [q.id]: { selected: sel, correct: isCorrect } },
        questionTimes: { ...prev.questionTimes, [q.id]: (prev.questionTimes[q.id] || 0) + elapsed },
      };
    });
  }, []);

  const handleNext = useCallback(() => {
    setQuizState(prev => {
      if (!prev) return prev;
      const q = prev.activeQuestions[prev.currentIndex];
      const isLast = prev.currentIndex === prev.activeQuestions.length - 1;
      const elapsed = Date.now() - prev.questionStartTime;

      if (prev.quizMode === 'mock') {
        const sel = prev.currentSelection;
        const isCorrect = sel.length === q.correct.length && sel.every(l => q.correct.includes(l));
        const newAnswers = { ...prev.userAnswers, [q.id]: { selected: sel, correct: isCorrect } };
        const newTimes = { ...prev.questionTimes, [q.id]: (prev.questionTimes[q.id] || 0) + elapsed };

        if (isLast) {
          // Trigger results via side-effect (can't call setScreen here)
          setTimeout(() => setScreen('results'), 0);
          return { ...prev, userAnswers: newAnswers, questionTimes: newTimes };
        }
        return {
          ...prev,
          currentIndex: prev.currentIndex + 1,
          currentSelection: [],
          showAnswer: false,
          userAnswers: newAnswers,
          questionTimes: newTimes,
          questionStartTime: Date.now(),
        };
      }

      // Practice mode
      const newTimes = { ...prev.questionTimes, [q.id]: (prev.questionTimes[q.id] || 0) + elapsed };
      if (isLast) {
        setTimeout(() => setScreen('results'), 0);
        return { ...prev, questionTimes: newTimes };
      }
      return {
        ...prev,
        currentIndex: prev.currentIndex + 1,
        currentSelection: [],
        showAnswer: false,
        questionTimes: newTimes,
        questionStartTime: Date.now(),
      };
    });
  }, []);

  const handleJump = useCallback((targetIndex: number) => {
    setQuizState(prev => {
      if (!prev) return prev;
      const q = prev.activeQuestions[prev.currentIndex];
      if (targetIndex === prev.currentIndex) {
        return { ...prev, showJumpPopup: false };
      }
      const elapsed = Date.now() - prev.questionStartTime;
      const newTimes = { ...prev.questionTimes, [q.id]: (prev.questionTimes[q.id] || 0) + elapsed };

      // Auto-save selection in mock mode
      const newAnswers = { ...prev.userAnswers };
      if (prev.quizMode === 'mock' && prev.currentSelection.length > 0) {
        const sel = prev.currentSelection;
        const isCorrect = sel.length === q.correct.length && sel.every(l => q.correct.includes(l));
        newAnswers[q.id] = { selected: sel, correct: isCorrect };
      }

      const targetQ = prev.activeQuestions[targetIndex];
      const savedAnswer = newAnswers[targetQ.id];
      const targetSelection = savedAnswer ? savedAnswer.selected : [];
      const targetShowAnswer = prev.quizMode === 'practice' && !!savedAnswer;

      return {
        ...prev,
        currentIndex: targetIndex,
        currentSelection: targetSelection,
        showAnswer: targetShowAnswer,
        userAnswers: newAnswers,
        questionTimes: newTimes,
        questionStartTime: Date.now(),
        showJumpPopup: false,
      };
    });
  }, []);

  const handleToggleJump = useCallback(() => {
    setQuizState(prev => prev ? { ...prev, showJumpPopup: !prev.showJumpPopup } : prev);
  }, []);

  const handleRestart = useCallback(() => {
    if (!quizState) return;
    setQuizState({
      ...quizState,
      currentIndex: 0,
      userAnswers: {},
      currentSelection: [],
      showAnswer: false,
      questionTimes: {},
      questionStartTime: Date.now(),
      quizStartTime: Date.now(),
      showJumpPopup: false,
    });
    setScreen('quiz');
  }, [quizState]);

  const handleHome = useCallback(() => {
    setScreen('home');
    setQuizState(null);
  }, []);

  return (
    <div className="app">
      <div className="app-inner">
        {screen === 'home' && <HomeScreen onStart={handleStart} />}
        {screen === 'quiz' && quizState && (
          <QuizScreen
            state={quizState}
            onSelect={handleSelect}
            onSubmit={handleSubmit}
            onNext={handleNext}
            onQuit={handleHome}
            onJump={handleJump}
            onToggleJump={handleToggleJump}
          />
        )}
        {screen === 'results' && quizState && (
          <ScoreCard
            state={quizState}
            onRestart={handleRestart}
            onHome={handleHome}
          />
        )}
      </div>
    </div>
  );
}

export default App;
