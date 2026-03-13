/**
 * GameStorage.js
 * Centralised read/write helpers for all app state in sessionStorage.
 * 
 * Keys used:
 *   hunter_stats        → Hunter object fields
 *   home_riddles        → Array of Riddle objects (generated today)
 *   active_riddle_index → Which riddle user is currently hunting
 *   recent_hunts        → Array of { label, xp, time, icon, color }
 *   weekly_activity     → Array of 7 numbers (hunts per day, Mon–Sun)
 *   challenges          → Array of challenge objects derived from riddle answers
 */

import { Hunter } from '../models/GameModels';

/* ─── Default hunter ─────────────────────────── */
const DEFAULT_HUNTER = {
    id: 'guest',
    displayName: 'Guest Hunter',
    xp: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalSolves: 0,
    lastHuntDate: null,
};

/* ─── Hunter ─────────────────────────────────── */
export const getHunter = () => {
    try {
        const raw = sessionStorage.getItem('hunter_stats');
        return raw ? new Hunter(JSON.parse(raw)) : new Hunter(DEFAULT_HUNTER);
    } catch { return new Hunter(DEFAULT_HUNTER); }
};

export const saveHunter = (hunter) => {
    sessionStorage.setItem('hunter_stats', JSON.stringify({
        id: hunter.id,
        displayName: hunter.displayName,
        xp: hunter.xp,
        currentStreak: hunter.currentStreak,
        longestStreak: hunter.longestStreak,
        totalSolves: hunter.totalSolves,
        lastHuntDate: hunter.lastHuntDate,
    }));
};

/**
 * Call after a successful hunt. Awards XP, increments streak & totalSolves,
 * updates lastHuntDate, and re-saves.
 */
export const recordSuccessfulHunt = (xpGained) => {
    const hunter = getHunter();
    const today = new Date().toDateString();
    const lastDate = hunter.lastHuntDate;

    // Streak logic
    if (lastDate === today) {
        // Same day — no streak change
    } else if (lastDate === new Date(Date.now() - 86400000).toDateString()) {
        hunter.currentStreak += 1; // consecutive day
    } else {
        hunter.currentStreak = 1; // broken streak, restart
    }

    hunter.xp          += xpGained;
    hunter.totalSolves += 1;
    hunter.longestStreak = Math.max(hunter.longestStreak, hunter.currentStreak);
    hunter.lastHuntDate  = today;
    saveHunter(hunter);
    return hunter;
};

/* ─── Home Riddles  ──────────────────────────── */
export const getHomeRiddles = () => {
    try {
        const raw = sessionStorage.getItem('home_riddles');
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
};

export const saveHomeRiddles = (riddles) => {
    sessionStorage.setItem('home_riddles', JSON.stringify(riddles));
};

/* ─── Active riddle index (used in CameraView) ─ */
export const getActiveRiddleIndex = () => {
    return parseInt(sessionStorage.getItem('active_riddle_index') || '0', 10);
};

export const setActiveRiddleIndex = (idx) => {
    sessionStorage.setItem('active_riddle_index', String(idx));
};

export const getActiveRiddle = () => {
    const riddles = getHomeRiddles();
    if (!riddles || riddles.length === 0) {
        const legacy = sessionStorage.getItem('daily_riddle');
        return legacy ? JSON.parse(legacy) : null;
    }
    const idx = getActiveRiddleIndex();
    return riddles[idx] || riddles[0];
};

/* ─── Recent Hunts ───────────────────────────── */
const ICON_MAP = {
    chair: { icon: 'Armchair', color: '#60a5fa' },
    cup: { icon: 'Coffee', color: '#f59e0b' },
    bottle: { icon: 'Coffee', color: '#60a5fa' },
    laptop: { icon: 'Laptop', color: '#8b5cf6' },
    book: { icon: 'BookOpen', color: '#10b981' },
    plant: { icon: 'Leaf', color: '#10b981' },
    person: { icon: 'User', color: '#f59e0b' },
    phone: { icon: 'Smartphone', color: '#60a5fa' },
    default: { icon: 'Target', color: '#60a5fa' },
};

export const getIconForObject = (label) => {
    const lower = label?.toLowerCase() || '';
    for (const [key, val] of Object.entries(ICON_MAP)) {
        if (lower.includes(key)) return val;
    }
    return ICON_MAP.default;
};

export const getRecentHunts = () => {
    try {
        const raw = sessionStorage.getItem('recent_hunts');
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
};

export const addRecentHunt = (label, xp) => {
    const hunts = getRecentHunts();
    const { color } = getIconForObject(label);
    const entry = {
        label: label.charAt(0).toUpperCase() + label.slice(1),
        xp,
        color,
        time: 'Just now',
        timestamp: Date.now(),
    };
    // Shift timestamps to relative labels on read
    const updated = [entry, ...hunts].slice(0, 10); // keep last 10
    sessionStorage.setItem('recent_hunts', JSON.stringify(updated));
    return updated;
};

/** Converts stored timestamp -> human-readable relative time */
export const formatHuntTime = (timestamp) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return 'Yesterday';
};

/* ─── Weekly Activity ────────────────────────── */
export const getWeeklyActivity = () => {
    try {
        const raw = sessionStorage.getItem('weekly_activity');
        if (raw) return JSON.parse(raw);
    } catch {
        // Ignore JSON parse errors and return default
    }
    // Default: empty week
    return [0, 0, 0, 0, 0, 0, 0];
};

export const incrementTodayActivity = () => {
    const activity = getWeeklyActivity();
    const dayIdx = (new Date().getDay() + 6) % 7; // Mon=0 … Sun=6
    activity[dayIdx] = (activity[dayIdx] || 0) + 1;
    sessionStorage.setItem('weekly_activity', JSON.stringify(activity));
    return activity;
};

/* ─── Challenges derived from riddles ───────── */
const CHALLENGE_TEMPLATES = [
    { label: 'Find something red',      xpBase: 50,  colorHue: '#ef4444', icon: 'Circle'   },
    { label: 'Find a cup',              xpBase: 40,  colorHue: '#f59e0b', icon: 'Coffee'   },
    { label: 'Find something circular', xpBase: 60,  colorHue: '#8b5cf6', icon: 'Circle'   },
    { label: 'Find a plant',            xpBase: 70,  colorHue: '#10b981', icon: 'Leaf'     },
    { label: 'Find something electronic', xpBase: 90, colorHue: '#60a5fa', icon: 'Cpu'     },
    { label: 'Find a book',             xpBase: 55,  colorHue: '#f59e0b', icon: 'BookOpen' },
];

/**
 * Build challenge list from riddle answers. Inserts answer-based challenges
 * at the top, then fills from templates to always show 4.
 */
export const buildChallenges = (riddles, completedAnswers = []) => {
    const riddleChallenges = riddles.slice(0, 2).map((r, i) => ({
        label: `Find: ${r.answer.charAt(0).toUpperCase() + r.answer.slice(1)}`,
        xp: 50 + (r.difficulty || 1) * 20,
        colorHue: ['#60a5fa', '#8b5cf6'][i % 2],
        icon: 'Target',
        done: completedAnswers.includes(r.answer.toLowerCase()),
    }));

    const fillers = CHALLENGE_TEMPLATES
        .filter(t => !riddleChallenges.some(rc => rc.label.toLowerCase().includes(t.label.split(' ').pop())))
        .slice(0, Math.max(0, 4 - riddleChallenges.length))
        .map(t => ({ ...t, done: false }));

    return [...riddleChallenges, ...fillers].slice(0, 4);
};

/* ─── Achievements computed from hunter stats ── */
export const computeAchievements = (hunter) => [
    { emoji: '🥇', label: 'First Hunt',    unlocked: hunter.totalSolves >= 1  },
    { emoji: '🔥', label: '7 Day Streak',  unlocked: hunter.currentStreak >= 7 },
    { emoji: '🎯', label: '50 Objects',    unlocked: hunter.totalSolves >= 50  },
    { emoji: '🧠', label: 'Riddle Master', unlocked: hunter.totalSolves >= 20  },
    { emoji: '⚡', label: 'Speed Hunter',  unlocked: hunter.totalSolves >= 5   },
    { emoji: '📸', label: '100 Captures',  unlocked: hunter.totalSolves >= 100 },
];
