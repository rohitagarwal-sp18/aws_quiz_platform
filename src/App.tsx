import { useState, useCallback } from 'react';
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
  activeQuestions: Question[];
  currentIndex: number;
  userAnswers: Record<number, UserAnswer>;
  currentSelection: string[];
  showAnswer: boolean;
}

// ── Home Screen ──────────────────────────────────────────────────────────────
function HomeScreen({ onStart }: { onStart: (mode: QuizMode, domain: number) => void }) {
  const [selectedDomain, setSelectedDomain] = useState(0);

  return (
    <div className="home">
      <div className="home-header">
        <div className="aws-badge">AWS DEA-C01</div>
        <h1 className="home-title">
          Data Engineer<br />
          <span className="title-accent">Associate</span>
        </h1>
        <p className="home-subtitle">100 original practice questions across 4 domains</p>
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
        <button className="mode-card mode-practice" onClick={() => onStart('practice', selectedDomain)}>
          <div className="mode-icon">⚡</div>
          <h2>Practice</h2>
          <p>Instant feedback after each answer with explanation</p>
          <div className="mode-cta">Start Practice →</div>
        </button>
        <button className="mode-card mode-mock" onClick={() => onStart('mock', selectedDomain)}>
          <div className="mode-icon">🎯</div>
          <h2>Mock Exam</h2>
          <p>Answer all questions, then see your full results</p>
          <div className="mode-cta">Start Mock →</div>
        </button>
      </div>

      <div className="exam-info">
        <div className="info-item"><span className="info-num">65</span><span>Questions on real exam</span></div>
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

// ── Quiz Screen ──────────────────────────────────────────────────────────────
function QuizScreen({ state, onSelect, onSubmit, onNext, onQuit }: {
  state: QuizState;
  onSelect: (letter: string) => void;
  onSubmit: () => void;
  onNext: () => void;
  onQuit: () => void;
}) {
  const { quizMode, activeQuestions, currentIndex, currentSelection, showAnswer } = state;
  const q = activeQuestions[currentIndex];
  const progress = ((currentIndex) / activeQuestions.length) * 100;
  const answeredCount = Object.keys(state.userAnswers).length;

  const canSubmit = q.multiSelect
    ? currentSelection.length === 2
    : currentSelection.length === 1;

  const practiceAnswered = quizMode === 'practice' && showAnswer;
  const mockSelected = quizMode === 'mock' && currentSelection.length > 0;
  const showNext = practiceAnswered || mockSelected;

  const isLast = currentIndex === activeQuestions.length - 1;

  return (
    <div className="quiz">
      {/* Header */}
      <div className="quiz-header">
        <button className="quit-btn" onClick={onQuit}>← Exit</button>
        <div className="quiz-meta">
          <span className="domain-tag" style={{ '--domain-color': DOMAIN_COLORS[q.domain] } as React.CSSProperties}>
            D{q.domain} · {q.domainName}
          </span>
          <span className="q-counter">{currentIndex + 1} / {activeQuestions.length}</span>
        </div>
        {quizMode === 'mock' && (
          <span className="answered-count">{answeredCount} answered</span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Question */}
      <div className="question-wrap">
        <div className="q-number">Q{q.id}</div>
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

      {/* Practice: submit button before answer shown */}
      {quizMode === 'practice' && !showAnswer && canSubmit && (
        <div className="action-row">
          <button className="btn-primary" onClick={onSubmit}>Check Answer</button>
        </div>
      )}

      {/* Explanation (practice mode) */}
      {quizMode === 'practice' && showAnswer && (
        <div className={`explanation ${state.userAnswers[q.id]?.correct ? 'exp-correct' : 'exp-wrong'}`}>
          <div className="exp-header">
            {state.userAnswers[q.id]?.correct
              ? <span className="exp-badge correct-badge">Correct ✓</span>
              : <span className="exp-badge wrong-badge">Incorrect ✗</span>}
            {!state.userAnswers[q.id]?.correct && (
              <span className="exp-correct-label">
                Correct: {q.correct.join(', ')}
              </span>
            )}
          </div>
          <p className="exp-text">{q.explanation}</p>
        </div>
      )}

      {/* Next / Finish */}
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

// ── Results Screen ───────────────────────────────────────────────────────────
function ResultsScreen({ state, onRestart, onHome }: {
  state: QuizState;
  onRestart: () => void;
  onHome: () => void;
}) {
  const [showReview, setShowReview] = useState(false);
  const { activeQuestions, userAnswers } = state;

  const total = activeQuestions.length;
  const correct = Object.values(userAnswers).filter(a => a.correct).length;
  const pct = Math.round((correct / total) * 100);
  const pass = pct >= 72;

  // Per-domain stats
  const domainStats = [1, 2, 3, 4].map(d => {
    const qs = activeQuestions.filter(q => q.domain === d);
    if (!qs.length) return null;
    const c = qs.filter(q => userAnswers[q.id]?.correct).length;
    return { domain: d, correct: c, total: qs.length, pct: Math.round((c / qs.length) * 100) };
  }).filter(Boolean) as { domain: number; correct: number; total: number; pct: number }[];

  const wrongQuestions = activeQuestions.filter(q => !userAnswers[q.id]?.correct);

  return (
    <div className="results">
      <div className="results-header">
        <div className={`score-ring ${pass ? 'pass' : 'fail'}`}>
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" className="ring-bg" />
            <circle
              cx="60" cy="60" r="50"
              className="ring-fill"
              strokeDasharray={`${pct * 3.14159} 314.159`}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="score-text">
            <span className="score-pct">{pct}%</span>
            <span className="score-label">{pass ? 'PASS' : 'FAIL'}</span>
          </div>
        </div>
        <div className="score-detail">
          <h2 className={pass ? 'result-pass' : 'result-fail'}>
            {pass ? 'Well done! 🎉' : 'Keep studying 📚'}
          </h2>
          <p className="score-fraction">{correct} / {total} correct</p>
          <p className="score-threshold">Passing threshold ≈ 72%</p>
        </div>
      </div>

      {/* Domain breakdown */}
      <div className="domain-breakdown">
        <h3 className="breakdown-title">Domain Breakdown</h3>
        {domainStats.map(d => (
          <div key={d.domain} className="domain-row">
            <span className="dr-label" style={{ color: DOMAIN_COLORS[d.domain] }}>
              D{d.domain} · {DOMAIN_NAMES[d.domain]}
            </span>
            <div className="dr-bar-wrap">
              <div
                className="dr-bar"
                style={{ width: `${d.pct}%`, background: DOMAIN_COLORS[d.domain] }}
              />
            </div>
            <span className="dr-stat">{d.correct}/{d.total} ({d.pct}%)</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="results-actions">
        <button className="btn-primary" onClick={onRestart}>Retry Same Set</button>
        <button className="btn-secondary" onClick={onHome}>New Quiz</button>
        {wrongQuestions.length > 0 && (
          <button className="btn-ghost" onClick={() => setShowReview(!showReview)}>
            {showReview ? 'Hide' : 'Review'} {wrongQuestions.length} Wrong Answers
          </button>
        )}
      </div>

      {/* Review wrong answers */}
      {showReview && (
        <div className="review-list">
          <h3 className="review-title">Questions You Missed</h3>
          {wrongQuestions.map(q => (
            <div key={q.id} className="review-item">
              <div className="review-q-header">
                <span className="review-qnum">Q{q.id}</span>
                <span className="review-domain" style={{ color: DOMAIN_COLORS[q.domain] }}>
                  {q.domainName}
                </span>
              </div>
              <p className="review-q-text">{q.question}</p>
              <div className="review-answers">
                {userAnswers[q.id] && (
                  <span className="review-wrong-ans">
                    Your answer: {userAnswers[q.id].selected.join(', ')}
                  </span>
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

  const handleStart = useCallback((mode: QuizMode, domain: number) => {
    const filtered = domain === 0
      ? [...questions]
      : questions.filter(q => q.domain === domain);

    setQuizState({
      quizMode: mode,
      activeQuestions: filtered,
      currentIndex: 0,
      userAnswers: {},
      currentSelection: [],
      showAnswer: false,
    });
    setScreen('quiz');
  }, []);

  const handleSelect = useCallback((letter: string) => {
    if (!quizState) return;
    const q = quizState.activeQuestions[quizState.currentIndex];
    if (quizState.showAnswer) return;

    setQuizState(prev => {
      if (!prev) return prev;
      if (q.multiSelect) {
        const sel = prev.currentSelection.includes(letter)
          ? prev.currentSelection.filter(l => l !== letter)
          : prev.currentSelection.length < 2
            ? [...prev.currentSelection, letter]
            : prev.currentSelection;
        return { ...prev, currentSelection: sel };
      } else {
        // In mock mode, selecting another option replaces the current one
        // In practice mode, just set it
        return { ...prev, currentSelection: [letter] };
      }
    });
  }, [quizState]);

  const handleSubmit = useCallback(() => {
    if (!quizState) return;
    const q = quizState.activeQuestions[quizState.currentIndex];
    const sel = quizState.currentSelection;
    const isCorrect =
      sel.length === q.correct.length &&
      sel.every(l => q.correct.includes(l));

    setQuizState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        showAnswer: true,
        userAnswers: {
          ...prev.userAnswers,
          [q.id]: { selected: sel, correct: isCorrect },
        },
      };
    });
  }, [quizState]);

  const handleNext = useCallback(() => {
    if (!quizState) return;
    const q = quizState.activeQuestions[quizState.currentIndex];
    const isLast = quizState.currentIndex === quizState.activeQuestions.length - 1;

    // In mock mode, record the answer on Next
    if (quizState.quizMode === 'mock') {
      const sel = quizState.currentSelection;
      const isCorrect =
        sel.length === q.correct.length &&
        sel.every(l => q.correct.includes(l));

      const newAnswers = {
        ...quizState.userAnswers,
        [q.id]: { selected: sel, correct: isCorrect },
      };

      if (isLast) {
        setQuizState(prev => prev ? { ...prev, userAnswers: newAnswers } : prev);
        setScreen('results');
        return;
      }

      setQuizState(prev => prev ? {
        ...prev,
        currentIndex: prev.currentIndex + 1,
        currentSelection: [],
        showAnswer: false,
        userAnswers: newAnswers,
      } : prev);
      return;
    }

    // Practice mode
    if (isLast) {
      setScreen('results');
      return;
    }

    setQuizState(prev => prev ? {
      ...prev,
      currentIndex: prev.currentIndex + 1,
      currentSelection: [],
      showAnswer: false,
    } : prev);
  }, [quizState]);

  const handleRestart = useCallback(() => {
    if (!quizState) return;
    setQuizState({
      ...quizState,
      currentIndex: 0,
      userAnswers: {},
      currentSelection: [],
      showAnswer: false,
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
          />
        )}
        {screen === 'results' && quizState && (
          <ResultsScreen
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
