
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { levels } from './data/levels';
import { Level, Theme } from './types';
import { THEMES } from './constants';
import { getHintFromGemini } from './services/geminiService';
import { CoinIcon, LightbulbIcon, SettingsIcon, ClockIcon, UndoIcon } from './components/icons';

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
    onSelectionChange: (word: string) => void;
}

const LetterCircle: React.FC<LetterCircleProps> = ({ letters, onWordSubmit, theme, onSelectionChange }) => {
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

    const handleInteractionEnd = () => {
        if (!isDragging) return;
        setIsDragging(false);
        if (selectedIndices.length > 0) {
            const word = selectedIndices.map(i => letters[i]).join('');
            onWordSubmit(word);
        }
        setSelectedIndices([]);
    };
    
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDragging]);

    const radius = 90; // sm:100, md:120

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
                return (
                    <div
                        key={index}
                        ref={el => letterRefs.current[index] = el}
                        className={`absolute flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full cursor-pointer transition-all duration-200 shadow-lg border-4 border-black/10
                            ${theme.letterBg} ${theme.letterText} 
                            ${isSelected ? 'transform scale-110 shadow-2xl bg-opacity-100' : 'bg-opacity-80'}`
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


// --- Main App Component ---

export default function App() {
    const [theme, setTheme] = useState<Theme>(THEMES.classic);
    const [levelIndex, setLevelIndex] = useState(0);
    const [currentLevel, setCurrentLevel] = useState<Level>(levels[levelIndex]);
    const [shuffledLetters, setShuffledLetters] = useState<string[]>([]);
    const [foundWords, setFoundWords] = useState<string[]>([]);
    const [coins, setCoins] = useState(100);
    const [currentGuess, setCurrentGuess] = useState('');
    const [message, setMessage] = useState('');
    const [hint, setHint] = useState('');
    const [isLoadingHint, setIsLoadingHint] = useState(false);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [lastFoundWord, setLastFoundWord] = useState<string | null>(null);
    const [isLevelComplete, setIsLevelComplete] = useState(false);

    const messageTimeoutRef = useRef<number | null>(null);
    const timerRef = useRef<number | null>(null);

    const resetLevel = useCallback((levelIdx: number) => {
        const newLevel = levels[levelIdx];
        setCurrentLevel(newLevel);
        setShuffledLetters(shuffleArray(newLevel.letters.split('')));
        setFoundWords([]);
        setCurrentGuess('');
        setHint('');
        setTimeElapsed(0);
        setIsTimerRunning(true);
        setLastFoundWord(null);
        setIsLevelComplete(false);
    }, []);

    useEffect(() => {
        resetLevel(levelIndex);
    }, [levelIndex, resetLevel]);

    useEffect(() => {
        if (isTimerRunning) {
            timerRef.current = window.setInterval(() => {
                setTimeElapsed(prevTime => prevTime + 1);
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isTimerRunning]);


    const showMessage = (msg: string, duration: number = 1500) => {
        if (messageTimeoutRef.current) {
            clearTimeout(messageTimeoutRef.current);
        }
        setMessage(msg);
        messageTimeoutRef.current = window