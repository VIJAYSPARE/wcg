
import { Theme } from './types';

export const THEMES: Record<string, Theme> = {
  classic: {
    name: 'Classic Wood',
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
    bg: 'bg-gradient-to-br from-sky-400 via-cyan-400 to-blue-500',
    gridBg: 'bg-sky-200/50',
    gridText: 'text-sky-800',
    letterBg: 'bg-white',
    letterText: 'text-sky-700',
    correctBg: 'bg-orange-500',
    correctText: 'text-white',
    line: 'stroke-yellow-300',
  },
};

export const DAILY_CHALLENGE_MODE = "Daily";
export const HOLIDAY_MODE = "Holiday";
export const CHALLENGE_MODE = "Challenge";

export const GAME_MODES = [DAILY_CHALLENGE_MODE, HOLIDAY_MODE, CHALLENGE_MODE];
