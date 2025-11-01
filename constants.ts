import { Theme } from './types';

// By defining the type here, we can add metadata like `unlockLevel`
// without modifying the global `Theme` type, which is used for styling.
type ThemeDefinition = Theme & { unlockLevel: number };

export const THEMES: Record<string, ThemeDefinition> = {
  classic: {
    name: 'Classic Wood',
    unlockLevel: 1, // Available from the start
    bg: 'bg-gradient-to-br from-yellow-600 via-amber-700 to-yellow-800',
    gridBg: 'bg-yellow-800/50',
    gridText: 'text-yellow-100',
    letterBg: 'bg-yellow-200',
    letterText: 'text-yellow-800',
    correctBg: 'bg-blue-500',
    correctText: 'text-white',
    line: 'stroke-amber-300',
  },
  night: {
    name: 'Night Sky',
    unlockLevel: 3, // Unlocks after completing level 2
    bg: 'bg-gradient-to-br from-gray-800 via-slate-900 to-black',
    gridBg: 'bg-slate-800/50',
    gridText: 'text-slate-100',
    letterBg: 'bg-slate-200',
    letterText: 'text-slate-800',
    correctBg: 'bg-indigo-500',
    correctText: 'text-white',
    line: 'stroke-indigo-300',
  },
  sunny: {
    name: 'Sunny Day',
    unlockLevel: 5, // Unlocks after completing level 4
    bg: 'bg-gradient-to-br from-sky-400 via-cyan-400 to-blue-500',
    gridBg: 'bg-sky-200/50',
    gridText: 'text-sky-800',
    letterBg: 'bg-white',
    letterText: 'text-sky-700',
    correctBg: 'bg-orange-500',
    correctText: 'text-white',
    line: 'stroke-yellow-300',
  },
  forest: {
    name: 'Deep Forest',
    unlockLevel: 7, // Unlocks after completing level 6
    bg: 'bg-gradient-to-br from-green-700 via-teal-800 to-green-900',
    gridBg: 'bg-green-900/50',
    gridText: 'text-green-100',
    letterBg: 'bg-lime-200',
    letterText: 'text-green-900',
    correctBg: 'bg-amber-500',
    correctText: 'text-white',
    line: 'stroke-lime-300',
  },
  ocean: {
    name: 'Coral Reef',
    unlockLevel: 9, // Unlocks after completing level 8
    bg: 'bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600',
    gridBg: 'bg-blue-400/50',
    gridText: 'text-white',
    letterBg: 'bg-white',
    letterText: 'text-blue-700',
    correctBg: 'bg-pink-500',
    correctText: 'text-white',
    line: 'stroke-cyan-200',
  },
};


export const DAILY_CHALLENGE_MODE = "Daily";
export const HOLIDAY_MODE = "Holiday";
export const CHALLENGE_MODE = "Challenge";

export const GAME_MODES = [DAILY_CHALLENGE_MODE, HOLIDAY_MODE, CHALLENGE_MODE];

export const HINT_COST = 50;
export const INITIAL_SKIP_COST = 10;
export const SKIP_COST_INCREMENT = 5;