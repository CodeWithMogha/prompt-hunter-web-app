import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Target, ArrowRight, Flame, Trophy, Star,
    CheckCircle, Clock, Zap, Award, TrendingUp,
    ChevronRight, Camera, Circle, Leaf, Coffee,
    Laptop, ShoppingBag, BookOpen, Cpu, RefreshCw,
    ChevronLeft, ChevronRight as ChevronRightIcon, Smartphone
} from 'lucide-react';
import { useRiddleBuffer } from '../hooks/useRiddleBuffer';
import {
    getHunter, setActiveRiddleIndex,
    getRecentHunts, formatHuntTime,
    getWeeklyActivity, buildChallenges, computeAchievements
} from '../services/GameStorage';

/* ═══════════ tiny sub-components ═══════════════════ */

const ICON_COMPONENTS = { Target, Circle, Leaf, Coffee, Laptop, ShoppingBag, BookOpen, Cpu, Smartphone, Trophy, Star };

function resolveIconElement(name, size, color) {
    const Comp = ICON_COMPONENTS[name] || Target;
    return <Comp size={size} color={color} />;
}

/* Weekly bar chart */
function WeekGraph({ data }) {
    const max = Math.max(...data, 1);
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const todayIdx = (new Date().getDay() + 6) % 7;
    return (
        <div style={{ display: 'flex', gap: 6, height: 60, alignItems: 'flex-end' }}>
            {data.map((v, i) => {
                const isToday = i === todayIdx;
                return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{
                            width: '100%',
                            height: Math.max((v / max) * 44, 4),
                            borderRadius: 5,
                            background: isToday
                                ? 'linear-gradient(180deg,#4f46e5,#2563eb)'
                                : v > 0 ? 'rgba(79,70,229,0.35)' : 'rgba(255,255,255,0.06)',
                            boxShadow: isToday ? '0 0 10px rgba(79,70,229,0.5)' : 'none',
                            transition: 'height 0.8s cubic-bezier(0.4,0,0.2,1)',
                        }} />
                        <span style={{ fontSize: '0.6rem', color: isToday ? 'var(--blue-light)' : 'var(--text-3)', fontWeight: 700 }}>
                            {days[i]}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

/* Achievement badge */
function Badge({ emoji, label, unlocked }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, opacity: unlocked ? 1 : 0.3 }}>
            <div style={{
                width: 50, height: 50, borderRadius: 13,
                background: unlocked ? 'linear-gradient(135deg,rgba(37,99,235,0.22),rgba(79,70,229,0.22))' : 'rgba(255,255,255,0.04)',
                border: unlocked ? '1.5px solid rgba(79,70,229,0.45)' : '1.5px solid rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem',
                boxShadow: unlocked ? '0 4px 16px rgba(79,70,229,0.3)' : 'none',
            }}>{emoji}</div>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: unlocked ? 'var(--text-2)' : 'var(--text-3)', textAlign: 'center', maxWidth: 54, lineHeight: 1.3 }}>
                {label}
            </span>
        </div>
    );
}

/* Challenge row */
function ChallengeRow({ label, xp, colorHue, icon, done }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0', borderBottom: '1px solid var(--border)', opacity: done ? 0.5 : 1 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: `${colorHue}18`, border: `1px solid ${colorHue}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {resolveIconElement(icon, 15, colorHue)}
            </div>
            <span style={{ flex: 1, fontSize: '0.86rem', fontWeight: 600, textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--text-3)' : 'var(--text-1)' }}>
                {label}
            </span>
            {done
                ? <CheckCircle size={15} color="var(--success)" />
                : <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--gold)', background: 'var(--gold-bg)', padding: '2px 8px', borderRadius: 999 }}>+{xp} XP</span>
            }
        </div>
    );
}

/* Recent hunt row */
function HuntRow({ label, xp, color, timestamp }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {resolveIconElement('Trophy', 17, color)}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 700 }}>{label}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Clock size={10} />{formatHuntTime(timestamp)}
                </div>
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--success)' }}>+{xp} XP</span>
        </div>
    );
}

/* Riddle difficulty stars */
function DifficultyDots({ level = 1 }) {
    return (
        <div style={{ display: 'flex', gap: 3 }}>
            {[1, 2, 3, 4, 5].map(n => (
                <div key={n} style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: n <= level ? 'var(--blue-light)' : 'rgba(255,255,255,0.12)',
                }} />
            ))}
        </div>
    );
}

/* ═══════════ MAIN HOME VIEW ═════════════════════════ */
export default function HomeView() {
    const navigate = useNavigate();

    // Game Storage State
    const [hunter, setHunter]       = useState(null);
    const [recentHunts, setRecentHunts] = useState([]);
    const [weekData, setWeekData]   = useState([0,0,0,0,0,0,0]);
    const [achievements, setAchievements] = useState([]);
    const [challenges, setChallenges] = useState([]);

    // Riddle Buffer Integration
    const { activeRiddles, isLoading, isRefilling } = useRiddleBuffer();
    const riddles = activeRiddles.slice(0, 4); // Show top 4 riddles
    const loading = isLoading || (activeRiddles.length === 0 && isRefilling);
    const [activeIdx, setActiveIdx] = useState(0);

    const getGreeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good Morning';
        if (h < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    // ── Load everything on mount ─────────────────────
    /* eslint-disable react-hooks/exhaustive-deps */
    useEffect(() => {
        const h = getHunter();
        setHunter(h);
        setRecentHunts(getRecentHunts());
        setWeekData(getWeeklyActivity());
        setAchievements(computeAchievements(h));
    }, []);

    // Effect to rebuild challenges when activeRiddles syncs
    useEffect(() => {
        if (riddles.length > 0) {
            setChallenges(buildChallenges(riddles));
            // Keep activeIdx in bounds
            if (activeIdx >= riddles.length) {
                setActiveIdx(0);
            }
        }
    }, [riddles.length, activeIdx]);
    /* eslint-enable react-hooks/exhaustive-deps */

    // Update active riddle index in storage for the CameraView
    const selectRiddle = (idx) => {
        setActiveIdx(idx);
        setActiveRiddleIndex(idx);
    };

    const activeRiddle = riddles[activeIdx];
    const progress = hunter ? hunter.progressToNextRank() * 100 : 0;
    const xpNeeded = hunter ? hunter.xpToNextRank() : 0;

    // Rank info
    const rankName  = hunter?.rank?.displayName || 'Novice Hunter';
    const rankEmoji = hunter?.rank?.emoji || '🌱';

    // DEBUG LOGGING
    console.log("HomeView Render ->", { 
        activeRiddlesCount: activeRiddles.length, 
        isLoading, 
        isRefilling,
        riddles: activeRiddles 
    });

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '1rem' }}>

            {/* ── GREETING HEADER ──────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.2rem 0 1rem' }}>
                <div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-2)', fontWeight: 600, marginBottom: 2 }}>
                        {getGreeting()}, Hunter 👋
                    </p>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 900, lineHeight: 1.15 }}>
                        Ready for today's&nbsp;<span className="gradient-text">hunt?</span>
                    </h1>
                </div>
                <div style={{
                    width: 46, height: 46, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#2563eb,#4f46e5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.3rem', flexShrink: 0,
                    boxShadow: '0 0 0 2.5px rgba(37,99,235,0.45)',
                }}>
                    {rankEmoji}
                </div>
            </div>

            {/* ── PLAYER PROGRESS CARD ─────────────────── */}
            {hunter && (
                <div className="card" style={{ padding: '1.1rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                        <div>
                            <div style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--blue-light)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>
                                {rankName}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
                                {hunter.xp} XP {xpNeeded > 0 ? `/ ${hunter.xp + xpNeeded} XP` : '(Max Rank!)'}
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--gold-bg)', border: '1px solid rgba(245,158,11,0.22)', padding: '0.35rem 0.75rem', borderRadius: 999 }}>
                            <Flame size={14} color="var(--gold)" />
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--gold)' }}>
                                {hunter.currentStreak} Day Streak
                            </span>
                        </div>
                    </div>
                    <div className="progress-track" style={{ height: 9, marginBottom: '0.4rem' }}>
                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.66rem', color: 'var(--text-3)' }}>{hunter.rank.displayName}</span>
                        <span style={{ fontSize: '0.66rem', color: 'var(--text-3)' }}>
                            {xpNeeded > 0 ? `${xpNeeded} XP to next rank` : '🏆 Max Rank!'}
                        </span>
                    </div>
                </div>
            )}

            {/* ── RIDDLES SECTION ──────────────────────── */}
            <div style={{ marginBottom: '0.75rem' }}>
                {/* Section header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                        <Target size={15} color="var(--blue-light)" /> Today's Riddles
                    </h3>
                </div>

                {/* Riddle tabs */}
                {!loading && riddles.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.65rem', overflowX: 'auto', paddingBottom: 2 }}>
                        {riddles.map((r, i) => (
                            <button
                                key={i}
                                onClick={() => selectRiddle(i)}
                                style={{
                                    flexShrink: 0,
                                    padding: '0.3rem 0.75rem',
                                    borderRadius: 999,
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    border: activeIdx === i ? 'none' : '1px solid var(--border)',
                                    background: activeIdx === i ? 'var(--accent-grad)' : 'var(--bg-card)',
                                    color: activeIdx === i ? '#fff' : 'var(--text-3)',
                                    cursor: 'pointer',
                                    transition: 'all 0.18s ease',
                                    boxShadow: activeIdx === i ? '0 4px 14px var(--accent-glow)' : 'none',
                                }}
                            >
                                Riddle {i + 1}
                            </button>
                        ))}
                    </div>
                )}

                {/* Active riddle hero card */}
                <div className="hero-card">
                    {/* Glow orb */}
                    <div style={{ position: 'absolute', top: -55, right: -45, width: 190, height: 190, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.38) 0%, transparent 70%)', pointerEvents: 'none' }} />

                    <div style={{ padding: '1.25rem', position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem' }}>
                            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#2563eb,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(37,99,235,0.5)' }}>
                                <Target size={16} color="#fff" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.67rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    {loading ? '...' : activeRiddle?.category || 'Daily'}
                                </div>
                            </div>
                            {!loading && activeRiddle && (
                                <DifficultyDots level={activeRiddle.difficulty || 1} />
                            )}
                            <span className="chip chip-blue">{loading ? '…' : `#${activeIdx + 1}`}</span>
                        </div>

                        {loading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '0.5rem', alignItems: 'center' }}>
                                <RefreshCw size={32} className="gradient-text" style={{ animation: 'spin 2s linear infinite' }} />
                                <span className="text-secondary" style={{ fontSize: '0.8rem' }}>Consulting the AI Oracles for new riddles...</span>
                                <div className="skeleton" style={{ height: 42, width: '100%', borderRadius: 24, marginTop: '0.4rem' }} />
                            </div>
                        ) : activeRiddle ? (
                            <>
                                <p style={{ fontSize: '1rem', fontStyle: 'italic', color: 'rgba(241,245,249,0.92)', lineHeight: 1.7, marginBottom: '1.1rem' }}>
                                    "{activeRiddle?.text}"
                                </p>
                                <button
                                    id="start-hunting-btn"
                                    className="btn-primary"
                                    style={{ width: '100%', fontWeight: 800 }}
                                    onClick={() => {
                                        // Save chosen riddle locally for CameraView
                                        setActiveRiddleIndex(activeIdx);
                                        navigate('/hunt');
                                    }}
                                >
                                    Start Hunting <ArrowRight size={16} />
                                </button>
                            </>
                        ) : (
                            <div className="text-center text-secondary" style={{ padding: '2rem 0' }}>
                                No riddles available right now.
                            </div>
                        )}
                    </div>

                    {/* Nav arrows */}
                    {!loading && riddles.length > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '0 1.25rem 1rem' }}>
                            {riddles.map((r, i) => (
                                <div key={r.id || i} onClick={() => selectRiddle(i)} style={{
                                    width: activeIdx === i ? 20 : 6, height: 6, borderRadius: 3,
                                    background: activeIdx === i ? 'var(--blue-light)' : 'rgba(255,255,255,0.2)',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                }} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── DAILY CHALLENGES ─────────────────────── */}
            <div className="card" style={{ padding: '1.1rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                        <Zap size={15} color="var(--blue-light)" /> Daily Challenges
                    </h3>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 700 }}>
                        {challenges.filter(c => c.done).length}/{challenges.length} done
                    </span>
                </div>
                {loading
                    ? [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 42, borderRadius: 10, marginTop: '0.5rem' }} />)
                    : challenges.map((c, i) => <ChallengeRow key={i} {...c} />)
                }
            </div>

            {/* ── RECENT HUNTS ─────────────────────────── */}
            <div className="card" style={{ padding: '1.1rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                        <Camera size={15} color="var(--blue-light)" /> Recent Hunts
                    </h3>
                    {recentHunts.length > 0 && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-3)' }}>
                            {recentHunts.length} total
                        </span>
                    )}
                </div>
                {recentHunts.length === 0 ? (
                    <div style={{ padding: '1.5rem 0', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.82rem' }}>
                        <Camera size={28} color="var(--text-3)" style={{ marginBottom: 8, opacity: 0.5 }} />
                        <p>No hunts yet — start your first one!</p>
                    </div>
                ) : (
                    recentHunts.slice(0, 5).map((h, i) => <HuntRow key={i} {...h} />)
                )}
            </div>


            {/* ── LEADERBOARD PREVIEW ──────────────────── */}
            <div className="card" style={{ padding: '1.1rem', marginBottom: '0.75rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem', fontSize: '0.9rem' }}>
                    <Trophy size={15} color="var(--gold)" /> Top Hunters Today
                </h3>
                {[
                    { rank: 1, name: 'Alex',  xp: 2100, isMe: false },
                    { rank: 2, name: 'Sam',   xp: 1800, isMe: false },
                    { rank: 3, name: hunter?.displayName || 'You', xp: hunter?.xp || 0, isMe: true },
                ].map(p => (
                    <div key={p.rank} style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.55rem 0.7rem', borderRadius: 11, marginBottom: '0.4rem',
                        background: p.isMe ? 'var(--accent-soft)' : 'transparent',
                        border: p.isMe ? '1px solid rgba(37,99,235,0.2)' : '1px solid transparent',
                    }}>
                        <span style={{
                            width: 24, height: 24, borderRadius: 7,
                            background: ['#f59e0b22','#94a3b822','#cd7c3a22'][p.rank-1],
                            border: `1px solid ${['#f59e0b44','#94a3b844','#cd7c3a44'][p.rank-1]}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.62rem', fontWeight: 900,
                            color: ['#f59e0b','#94a3b8','#cd7c3a'][p.rank-1], flexShrink: 0,
                        }}>{p.rank}</span>
                        <span style={{ flex: 1, fontWeight: p.isMe ? 800 : 600, fontSize: '0.88rem', color: p.isMe ? 'var(--blue-light)' : 'var(--text-1)' }}>
                            {p.name}{p.isMe ? ' (You)' : ''}
                        </span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: p.isMe ? 'var(--blue-light)' : 'var(--text-2)' }}>
                            {p.xp.toLocaleString()} XP
                        </span>
                    </div>
                ))}
                <button className="btn-secondary" style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.82rem', padding: '0.65rem 1rem' }}
                    onClick={() => navigate('/profile')}>
                    View Full Leaderboard <ChevronRight size={14} />
                </button>
            </div>

            {/* ── ACHIEVEMENTS ─────────────────────────── */}
            <div className="card" style={{ padding: '1.1rem', marginBottom: '0.75rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.9rem', fontSize: '0.9rem' }}>
                    <Award size={15} color="var(--gold)" /> Achievements
                    <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 700 }}>
                        {achievements.filter(a => a.unlocked).length}/{achievements.length} unlocked
                    </span>
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.5rem' }}>
                    {achievements.map((a, i) => <Badge key={i} {...a} />)}
                </div>
            </div>

            {/* ── WEEKLY ACTIVITY ──────────────────────── */}
            <div className="card" style={{ padding: '1.1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                        <TrendingUp size={15} color="var(--blue-light)" /> Weekly Activity
                    </h3>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-3)' }}>This week</span>
                </div>
                <WeekGraph data={weekData} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.8rem', padding: '0.55rem 0.8rem', background: 'rgba(37,99,235,0.08)', borderRadius: 10, border: '1px solid rgba(37,99,235,0.14)' }}>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-2)' }}>Total this week</span>
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--blue-light)' }}>
                        {weekData.reduce((s, v) => s + v, 0)} hunts
                    </span>
                </div>
            </div>

        </div>
    );
}
