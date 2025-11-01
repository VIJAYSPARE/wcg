import React, { useState, useEffect, useCallback, useRef } from 'react';
import { levels } from './data/levels';
import { Level, Theme } from './types';
import { THEMES, HINT_COST, INITIAL_SKIP_COST, SKIP_COST_INCREMENT } from './constants';
import { getHintFromGemini } from './services/geminiService';
import { CoinIcon, LightbulbIcon, SettingsIcon, ClockIcon, UndoIcon, LockClosedIcon, CheckCircleIcon, SkipIcon } from './components/icons';

// --- Helper Functions ---
const shuffleArray = <T,>(array: T[]): T[] => {
    return [...array].sort(() => Math.random() - 0.5);
};

const getCircularPosition = (index: number, total: number, radius: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    return {
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
    };
};

const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};


// --- Child Components defined outside App to prevent re-rendering issues ---

interface WordGridProps {
    words: string[];
    foundWords: string[];
    theme: Theme;
}

const WordGrid: React.FC<WordGridProps> = ({ words, foundWords, theme }) => {
    const sortedWords = React.useMemo(() => [...words].sort((a, b) => a.length - b.length || a.localeCompare(b)), [words]);

    return (
        <div className={`w-full max-w-md p-4 rounded-lg transition-colors duration-500 ${theme.gridBg}`}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                {sortedWords.map((word, index) => (
                    <div key={index} className="flex items-center justify-center space-x-1">
                        {word.split('').map((letter, letterIndex) => (
                            <div
                                key={letterIndex}
                                className={`
                                    flex items-center justify-center
                                    w-6 h-6 sm:w-8 sm:h-8
                                    rounded transition-all duration-300
                                    font-bold text-sm sm:text-lg uppercase
                                    ${foundWords.includes(word)
                                        ? `${theme.correctBg} ${theme.correctText}`
                                        : `${theme.letterBg} ${theme.letterText} opacity-40`
                                    }
                                `}
                            >
                                {foundWords.includes(word) ? letter : ''}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};


interface LetterCircleProps {
    letters: string[];
    onWordSubmit: (word: string) => void;
    theme: Theme;
    onSelectionChange: (word:string) => void;
    hintedLetters: string[];
}

const LetterCircle: React.FC<LetterCircleProps> = ({ letters, onWordSubmit, theme, onSelectionChange, hintedLetters }) => {
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const letterRefs = useRef<(HTMLDivElement | null)[]>([]);
    const circleRef = useRef<HTMLDivElement | null>(null);

    const handleInteractionStart = (index: number) => {
        setIsDragging(true);
        setSelectedIndices([index]);
    };

    const handleInteractionMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging || !circleRef.current) return;
        
        const touch = 'touches' in e ? e.touches[0] : e;
        const { clientX, clientY } = touch;
        
        letterRefs.current.forEach((ref, index) => {
            if (ref && !selectedIndices.includes(index)) {
                const { left, top, width, height } = ref.getBoundingClientRect();
                if (clientX > left && clientX < left + width && clientY > top && clientY < top + height) {
                    setSelectedIndices(prev => [...prev, index]);
                }
            }
        });
    };

    const handleInteractionEnd = useCallback(() => {
        if (!isDragging) return;
        setIsDragging(false);
        if (selectedIndices.length > 0) {
            const word = selectedIndices.map(i => letters[i]).join('');
            onWordSubmit(word);
        }
        setSelectedIndices([]);
    },[isDragging, letters, onWordSubmit, selectedIndices]);
    
    useEffect(() => {
        const word = selectedIndices.map(i => letters[i]).join('');
        onSelectionChange(word);
    }, [selectedIndices, letters, onSelectionChange]);

    useEffect(() => {
        window.addEventListener('mouseup', handleInteractionEnd);
        window.addEventListener('touchend', handleInteractionEnd);
        return () => {
            window.removeEventListener('mouseup', handleInteractionEnd);
            window.removeEventListener('touchend', handleInteractionEnd);
        };
    }, [handleInteractionEnd]);

    const radius = 90;

    return (
        <div 
            ref={circleRef}
            className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center select-none"
            onMouseMove={handleInteractionMove}
            onTouchMove={handleInteractionMove}
            onMouseLeave={handleInteractionEnd}
        >
            {letters.map((letter, index) => {
                const { x, y } = getCircularPosition(index, letters.length, radius);
                const isSelected = selectedIndices.includes(index);
                const isHinted = hintedLetters.includes(letter);
                return (
                    <div
                        key={index}
                        // FIX: Changed the ref callback to use a block body to prevent it from returning a value, which caused a TypeScript error.
                        ref={el => { letterRefs.current[index] = el; }}
                        className={`absolute flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full cursor-pointer transition-all duration-200 shadow-lg border-4 border-black/10
                            ${theme.letterBg} ${theme.letterText} 
                            ${isSelected ? 'transform scale-110 shadow-2xl bg-opacity-100' : 'bg-opacity-80'}
                            ${isHinted && !isSelected ? 'animate-pulse ring-2 ring-yellow-300' : ''}`
                        }
                        style={{
                            transform: `translate(${x}px, ${y}px)`,
                        }}
                        onMouseDown={() => handleInteractionStart(index)}
                        onTouchStart={() => handleInteractionStart(index)}
                    >
                        <span className="text-3xl sm:text-4xl font-bold uppercase">{letter}</span>
                    </div>
                );
            })}
        </div>
    );
};

const ThemeModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelectTheme: (themeKey: string) => void;
    currentThemeKey: string;
    unlockedThemes: Set<string>;
}> = ({ isOpen, onClose, onSelectTheme, currentThemeKey, unlockedThemes }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 max-w-2xl w-full text-gray-800 shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4 text-center">Select Theme</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(THEMES).map(([key, themeData]) => {
                        const isUnlocked = unlockedThemes.has(key);
                        const isSelected = currentThemeKey === key;
                        return (
                            <div key={key} className="flex flex-col items-center">
                                <button
                                    onClick={() => isUnlocked && onSelectTheme(key)}
                                    className={`w-full rounded-lg p-2 border-4 transition-all duration-200 ${isSelected ? 'border-blue-500' : 'border-transparent'} ${!isUnlocked ? 'cursor-not-allowed' : 'hover:border-blue-300'}`}
                                    disabled={!isUnlocked}
                                >
                                    <div className={`w-full h-16 rounded-lg ${themeData.bg} flex items-center justify-center shadow-inner`}>
                                        <div className={`w-8 h-8 rounded-full ${themeData.letterBg}`}></div>
                                    </div>
                                    <p className="mt-2 font-semibold">{themeData.name}</p>
                                </button>
                                {!isUnlocked ? (
                                    <div className="flex items-center text-xs text-gray-500 mt-1">
                                        <LockClosedIcon className="w-3 h-3 mr-1" />
                                        <span>Unlock at Level {themeData.unlockLevel}</span>
                                    </div>
                                ) : isSelected ? (
                                    <div className="flex items-center text-xs text-blue-600 mt-1">
                                        <CheckCircleIcon className="w-4 h-4 mr-1" />
                                        <span>Selected</span>
                                    </div>
                                ): <div className="h-5 mt-1"></div>}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const LevelCompleteModal: React.FC<{
    onNextLevel: () => void;
    level: number;
    time: number;
    wordsFound: number;
}> = ({ onNextLevel, level, time, wordsFound }) => {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40 p-4">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 text-center text-gray-800 shadow-2xl animate-fade-in">
                <h2 className="text-3xl font-bold mb-2">Level {level} Complete!</h2>
                <div className="text-lg space-y-2 mb-6">
                    <p>Time: <span className="font-semibold">{formatTime(time)}</span></p>
                    <p>Words Found: <span className="font-semibold">{wordsFound}</span></p>
                </div>
                <button
                    onClick={onNextLevel}
                    className="bg-blue-500 text-white font-bold py-3 px-8 rounded-full hover:bg-blue-600 transition-transform transform hover:scale-105"
                >
                    Next Level
                </button>
            </div>
        </div>
    );
};


// --- Main App Component ---

export default function App() {
    const [theme, setTheme] = useState<Theme>(THEMES.classic);
    const [currentThemeKey, setCurrentThemeKey] = useState('classic');
    const [unlockedThemes, setUnlockedThemes] = useState<Set<string>>(new Set(['classic']));
    const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

    const [levelIndex, setLevelIndex] = useState(0);
    const [currentLevel, setCurrentLevel] = useState<Level>(levels[levelIndex]);
    const [shuffledLetters, setShuffledLetters] = useState<string[]>([]);
    const [foundWords, setFoundWords] = useState<string[]>([]);
    const [coins, setCoins] = useState(100);
    const [currentGuess, setCurrentGuess] = useState('');
    const [message, setMessage] = useState('');
    const [hint, setHint] = useState('');
    const [hintedLetters, setHintedLetters] = useState<string[]>([]);
    const [isLoadingHint, setIsLoadingHint] = useState(false);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [isLevelComplete, setIsLevelComplete] = useState(false);
    const [skipCost, setSkipCost] = useState(INITIAL_SKIP_COST);

    const messageTimeoutRef = useRef<number | null>(null);
    const timerRef = useRef<number | null>(null);
    const hintTimeoutRef = useRef<number | null>(null);


    // Load saved state from localStorage on initial mount
    useEffect(() => {
        const savedThemeKey = localStorage.getItem('wordConnectTheme') || 'classic';
        const savedUnlockedThemes = localStorage.getItem('wordConnectUnlockedThemes');

        setCurrentThemeKey(savedThemeKey);
        setTheme(THEMES[savedThemeKey] || THEMES.classic);

        if (savedUnlockedThemes) {
            setUnlockedThemes(new Set(JSON.parse(savedUnlockedThemes)));
        }
    }, []);

    // Save unlocked themes whenever they change
    useEffect(() => {
        if (unlockedThemes.size > 1 || (unlockedThemes.size === 1 && !unlockedThemes.has('classic'))) {
            localStorage.setItem('wordConnectUnlockedThemes', JSON.stringify(Array.from(unlockedThemes)));
        }
    }, [unlockedThemes]);

    const showMessage = useCallback((msg: string, duration: number = 1500) => {
        if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
        setMessage(msg);
        messageTimeoutRef.current = window.setTimeout(() => setMessage(''), duration);
    }, []);

    const resetLevel = useCallback((levelIdx: number) => {
        const newLevel = levels[levelIdx];
        setCurrentLevel(newLevel);
        setShuffledLetters(shuffleArray(newLevel.letters.split('')));
        setFoundWords([]);
        setCurrentGuess('');
        setHint('');
        setHintedLetters([]);
        if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
        setIsLoadingHint(false);
        setTimeElapsed(0);
        setIsTimerRunning(true);
        setIsLevelComplete(false);
        setSkipCost(INITIAL_SKIP_COST);
    }, []);

    useEffect(() => {
        resetLevel(levelIndex);
    }, [levelIndex, resetLevel]);

    useEffect(() => {
        if (isTimerRunning) {
            timerRef.current = window.setInterval(() => setTimeElapsed(prev => prev + 1), 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isTimerRunning]);

    // Level completion and theme unlocking logic
    useEffect(() => {
        if (foundWords.length > 0 && foundWords.length === currentLevel.words.length && !isLevelComplete) {
            setIsLevelComplete(true);
            setIsTimerRunning(false);

            const newUnlocked = new Set(unlockedThemes);
            let themesChanged = false;
            Object.entries(THEMES).forEach(([key, themeData]) => {
                if ((levelIndex + 1) >= themeData.unlockLevel && !newUnlocked.has(key)) {
                    newUnlocked.add(key);
                    themesChanged = true;
                    setTimeout(() => showMessage(`Theme Unlocked: ${themeData.name}!`, 3000), 500);
                }
            });

            if (themesChanged) {
                setUnlockedThemes(newUnlocked);
            }
        }
    }, [foundWords, currentLevel.words, isLevelComplete, levelIndex, unlockedThemes, showMessage]);

    const handleWordSubmit = (word: string) => {
        if (foundWords.includes(word)) {
            showMessage('Already found!', 1000);
            return;
        }

        if (currentLevel.words.includes(word)) {
            setFoundWords(prev => [...prev, word]);
            setCoins(c => c + word.length * 10);
            showMessage('Correct!', 1000);
        } else {
            showMessage('Incorrect', 1000);
        }
    };

    const handleThemeSelect = (themeKey: string) => {
        if (unlockedThemes.has(themeKey)) {
            setTheme(THEMES[themeKey]);
            setCurrentThemeKey(themeKey);
            localStorage.setItem('wordConnectTheme', themeKey);
            setIsThemeModalOpen(false);
        }
    };

    const handleGetHint = async () => {
        if (isLoadingHint) return;
        if (coins < HINT_COST) {
            showMessage(`Not enough coins! Need ${HINT_COST}.`, 2000);
            return;
        }
        if (foundWords.length === currentLevel.words.length) {
            showMessage("You have already found all the words!", 2000);
            return;
        }

        setIsLoadingHint(true);
        setHint('');
        setCoins(c => c - HINT_COST);

        try {
            const { hint: newHint, word: hintedWord } = await getHintFromGemini(
                currentLevel.letters,
                foundWords,
                currentLevel.words
            );
            setHint(newHint);
            
            // Set letters for visual hint and clear after a delay
            const uniqueLetters = [...new Set(hintedWord.split(''))];
            setHintedLetters(uniqueLetters);
            hintTimeoutRef.current = window.setTimeout(() => {
                setHintedLetters([]);
            }, 2500);

        } catch (error) {
            console.error("Error fetching hint:", error);
            showMessage("Could not get a hint right now.", 2000);
            setCoins(c => c + HINT_COST); // Refund coins on error
        } finally {
            setIsLoadingHint(false);
        }
    };
    
    const handleUndo = () => {
        if (foundWords.length === 0) {
            return; // Nothing to undo
        }

        const wasLevelComplete = isLevelComplete;
        const lastWord = foundWords[foundWords.length - 1];

        const newFoundWords = foundWords.slice(0, -1);
        setFoundWords(newFoundWords);

        // Revert coins
        setCoins(c => c - lastWord.length * 10);

        // If the level was just completed, "un-complete" it and resume timer
        if (wasLevelComplete) {
            setIsLevelComplete(false);
            setIsTimerRunning(true);
        }
        
        showMessage(`Reverted "${lastWord}"`);
    };
    
    const handleSkipWord = () => {
        if (isLoadingHint) return;
        if (isLevelComplete) {
            showMessage("All words already found!", 2000);
            return;
        }
        if (coins < skipCost) {
            showMessage(`Not enough coins! Need ${skipCost}.`, 2000);
            return;
        }

        setCoins(c => c - skipCost);
        setSkipCost(prev => prev + SKIP_COST_INCREMENT);

        const unFoundWords = currentLevel.words.filter(word => !foundWords.includes(word));
        if (unFoundWords.length > 0) {
            const wordToReveal = unFoundWords[Math.floor(Math.random() * unFoundWords.length)];
            setFoundWords(prev => [...prev, wordToReveal]);
            showMessage(`Revealed: "${wordToReveal}"`);
        }
    };

    const handleNextLevel = () => {
        setLevelIndex(prev => (prev + 1) % levels.length);
    };

    return (
        <main className={`w-screen h-screen overflow-hidden flex flex-col items-center justify-between p-4 ${theme.bg} text-white transition-colors duration-500`}>
            {isLevelComplete && (
                <LevelCompleteModal
                    onNextLevel={handleNextLevel}
                    level={levelIndex + 1}
                    time={timeElapsed}
                    wordsFound={foundWords.length}
                />
            )}
            <ThemeModal
                isOpen={isThemeModalOpen}
                onClose={() => setIsThemeModalOpen(false)}
                onSelectTheme={handleThemeSelect}
                currentThemeKey={currentThemeKey}
                unlockedThemes={unlockedThemes}
            />

            <header className="w-full max-w-md flex justify-between items-center">
                <div className="flex items-center gap-2 sm:gap-4">
                    <button onClick={() => setIsThemeModalOpen(true)} className="p-2 rounded-full bg-black/20 hover:bg-black/40 transition">
                        <SettingsIcon className="w-6 h-6" />
                    </button>
                    <button onClick={handleGetHint} disabled={isLoadingHint || isLevelComplete} className="p-2 rounded-full bg-black/20 hover:bg-black/40 transition disabled:opacity-50 disabled:cursor-not-allowed">
                        <LightbulbIcon className="w-6 h-6" />
                    </button>
                    <button onClick={handleSkipWord} disabled={isLevelComplete} className="p-2 rounded-full bg-black/20 hover:bg-black/40 transition disabled:opacity-50 disabled:cursor-not-allowed">
                        <SkipIcon className="w-6 h-6" />
                    </button>
                    <button onClick={handleUndo} disabled={foundWords.length === 0} className="p-2 rounded-full bg-black/20 hover:bg-black/40 transition disabled:opacity-50 disabled:cursor-not-allowed">
                        <UndoIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-2 p-2 rounded-full bg-black/20">
                        <ClockIcon className="w-6 h-6" />
                        <span className="font-mono font-semibold">{formatTime(timeElapsed)}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-full bg-black/20">
                        <CoinIcon className="w-6 h-6 text-yellow-400" />
                        <span className="font-semibold">{coins}</span>
                    </div>
                </div>
            </header>
            
            <WordGrid words={currentLevel.words} foundWords={foundWords} theme={theme} />

            <div className="relative flex flex-col items-center">
                 <div className={`absolute -top-12 flex items-center justify-center p-2 rounded-lg transition-opacity duration-300 ${theme.gridBg} ${message ? 'opacity-100' : 'opacity-0'}`}>
                    <p className="font-semibold">{message}</p>
                </div>

                <div className="h-10 text-center mb-2 px-2 flex items-center justify-center">
                    {isLoadingHint && <p className="italic animate-pulse">Getting a hint...</p>}
                    {hint && !isLoadingHint && <p className="italic text-sm">"{hint}"</p>}
                </div>

                <div className={`h-12 flex items-center justify-center text-4xl font-bold tracking-widest uppercase ${theme.letterText}`}>
                    {currentGuess}
                </div>
                 <LetterCircle 
                    letters={shuffledLetters} 
                    onWordSubmit={handleWordSubmit} 
                    theme={theme}
                    onSelectionChange={setCurrentGuess}
                    hintedLetters={hintedLetters}
                />
            </div>
        </main>
    );
}