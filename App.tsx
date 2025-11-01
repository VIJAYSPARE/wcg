
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { levels } from './data/levels';
import { Level, Theme } from './types';
import { THEMES } from './constants';
import { getHintFromGemini } from './services/geminiService';
import { CoinIcon, LightbulbIcon, SettingsIcon } from './components/icons';

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
    
    const messageTimeoutRef = useRef<number | null>(null);

    const resetLevel = useCallback((levelIdx: number) => {
        const newLevel = levels[levelIdx];
        setCurrentLevel(newLevel);
        setShuffledLetters(shuffleArray(newLevel.letters.split('')));
        setFoundWords([]);
        setCurrentGuess('');
        setHint('');
    }, []);

    useEffect(() => {
        resetLevel(levelIndex);
    }, [levelIndex, resetLevel]);

    const showMessage = (msg: string, duration: number = 1500) => {
        if (messageTimeoutRef.current) {
            clearTimeout(messageTimeoutRef.current);
        }
        setMessage(msg);
        messageTimeoutRef.current = window.setTimeout(() => {
            setMessage('');
        }, duration);
    };

    const handleWordSubmit = (word: string) => {
        setCurrentGuess('');
        if (word.length < 2) return;
        
        if (foundWords.includes(word)) {
            showMessage("Already found!", 1000);
            return;
        }

        if (currentLevel.words.includes(word.toUpperCase())) {
            setFoundWords(prev => [...prev, word.toUpperCase()]);
            setCoins(c => c + word.length * 5);
            showMessage("Correct!", 1000);

            // Check for level complete
            const allWordsFound = currentLevel.words.every(w => [...foundWords, word.toUpperCase()].includes(w));
            if(allWordsFound){
                showMessage("Level Complete!", 3000);
                setCoins(c => c + 50); // Level complete bonus
                setTimeout(() => {
                    setLevelIndex(prev => (prev + 1) % levels.length);
                }, 3000);
            }

        } else {
            showMessage("Incorrect!", 1000);
        }
    };
    
    const handleGetHint = async () => {
        if (coins < 25) {
            showMessage("Not enough coins for a hint!", 2000);
            return;
        }
        if (isLoadingHint) return;

        setIsLoadingHint(true);
        setCoins(c => c - 25);
        try {
            const newHint = await getHintFromGemini(currentLevel.letters, foundWords, currentLevel.words);
            setHint(newHint);
        } catch (error) {
            console.error(error);
            showMessage("Failed to get hint.", 2000);
            setCoins(c => c + 25); // Refund coins on failure
        } finally {
            setIsLoadingHint(false);
        }
    };

    return (
        <div className={`w-full h-screen overflow-hidden flex flex-col items-center justify-between font-sans transition-colors duration-500 p-4 ${theme.bg} ${theme.gridText}`}>
            {/* Header */}
            <header className="w-full max-w-4xl flex justify-between items-center p-2 rounded-lg bg-black/20 text-white">
                <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold">WCG</h1>
                    <span className="text-sm font-semibold">Level {levelIndex + 1}</span>
                </div>
                <div className="flex items-center gap-4">
                     <button onClick={handleGetHint} disabled={isLoadingHint} className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded-full text-white transition-transform duration-200 active:scale-95 disabled:bg-gray-500">
                        <LightbulbIcon className="w-5 h-5" />
                        <span className="font-semibold">Hint (25)</span>
                    </button>
                    <div className="flex items-center gap-2 bg-yellow-500 px-3 py-1 rounded-full text-black">
                        <CoinIcon className="w-5 h-5" />
                        <span className="font-bold text-lg">{coins}</span>
                    </div>
                   <div className="relative group">
                     <button className="p-2 rounded-full hover:bg-white/20 transition">
                         <SettingsIcon className="w-6 h-6" />
                     </button>
                     <div className="absolute right-0 mt-2 w-48 bg-white/90 backdrop-blur-sm text-black rounded-lg shadow-xl p-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-300">
                        <p className="text-sm font-bold mb-2 px-2">Change Theme</p>
                        {Object.values(THEMES).map(t => (
                            <button key={t.name} onClick={() => setTheme(t)} className="w-full text-left px-2 py-1 rounded hover:bg-black/10 transition">{t.name}</button>
                        ))}
                     </div>
                   </div>
                </div>
            </header>

            {/* Hint & Message Display */}
            <div className="h-16 flex items-center justify-center text-center px-4">
                {isLoadingHint ? (
                     <p className="text-lg italic animate-pulse">Getting a hint from Gemini...</p>
                ) : message ? (
                    <p className="text-xl font-bold animate-bounce">{message}</p>
                ) : hint ? (
                    <p className="text-lg italic">{hint}</p>
                ) : null}
            </div>

            {/* Word Grid */}
            <WordGrid words={currentLevel.words} foundWords={foundWords} theme={theme} />
            
            {/* Current Guess Display */}
            <div className="h-16 w-full max-w-md flex items-center justify-center bg-black/20 rounded-lg my-4">
                <p className="text-3xl font-bold tracking-[0.2em] uppercase text-white">{currentGuess || ' '}</p>
            </div>

            {/* Letter Circle */}
            <div className="flex-grow flex items-center justify-center w-full">
                <LetterCircle letters={shuffledLetters} onWordSubmit={handleWordSubmit} onSelectionChange={setCurrentGuess} theme={theme} />
            </div>
            
        </div>
    );
}
