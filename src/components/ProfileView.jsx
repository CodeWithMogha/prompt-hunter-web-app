import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Trophy, Star, Shield, Zap, Award, Edit3, Lock, Flame, 
    Target, ChevronRight, Settings, Bell, Camera as CameraIcon, 
    Moon, LogOut, CheckCircle, Package 
} from 'lucide-react';
import { Hunter } from '../models/GameModels';
import { 
    getHunter, saveHunter, getRecentHunts, getWeeklyActivity, 
    computeAchievements, formatHuntTime 
} from '../services/GameStorage';
import * as LucideIcons from 'lucide-react';

/* ── Helpers ── */
const ToggleSwitch = ({ checked, onChange }) => (
    <div 
        onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
        style={{
            width: 44, height: 24, borderRadius: 12,
            background: checked ? 'var(--blue-1)' : 'rgba(255,255,255,0.1)',
            position: 'relative', cursor: 'pointer', transition: '0.3s'
        }}
    >
        <div style={{
            width: 20, height: 20, borderRadius: 10, background: '#fff',
            position: 'absolute', top: 2, left: checked ? 22 : 2,
            transition: '0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }} />
    </div>
);

const DynamicIcon = ({ name, size = 18, color = 'currentColor', ...props }) => {
    const IconComponent = LucideIcons[name] || LucideIcons.Target;
    return <IconComponent size={size} color={color} {...props} />;
};

// eslint-disable-next-line no-unused-vars
function StatTile({ icon: Icon, value, label, color, bgColor }) {
    return (
        <div className="card" style={{ padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ background: bgColor, width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={14} color={color} />
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900 }}>{value}</div>
            </div>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        </div>
    );
}

export default function ProfileView() {
    const navigate = useNavigate();
    const [hunter, setHunter] = useState(() => getHunter() || new Hunter({ displayName: 'Guest Hunter', xp: 0 }));
    const [recentHunts, setRecentHunts] = useState([]);
    const [weeklyActivity, setWeeklyActivity] = useState([0,0,0,0,0,0,0]);
    const [achievements, setAchievements] = useState([]);
    const [toastMessage, setToastMessage] = useState(null);
    
    // Feature States
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [editEmoji, setEditEmoji] = useState('🧑‍🚀');
    
    const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
        return localStorage.getItem('notificationsEnabled') === 'true';
    });
    const [isDarkMode, setIsDarkMode] = useState(() => {
        return localStorage.getItem('theme') !== 'light';
    });

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        // Hunter is loaded in initial state above
        const h = getHunter();
        setRecentHunts(getRecentHunts());
        setWeeklyActivity(getWeeklyActivity());
        setAchievements(computeAchievements(h));

        // Init theme on mount
        if (localStorage.getItem('theme') === 'light') {
            document.body.classList.add('light-mode');
        }
    }, []);

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    /** Settings Handlers */
    const saveProfile = () => {
        const updatedHunter = new Hunter({
            ...hunter,
            displayName: editName,
            rank: { ...hunter.rank, emoji: editEmoji }
        });
        saveHunter(updatedHunter);
        setHunter(updatedHunter);
        setIsEditModalOpen(false);
        showToast("Profile updated successfully!");
    };

    const handleNotifToggle = (val) => {
        setNotificationsEnabled(val);
        localStorage.setItem('notificationsEnabled', val);
        showToast(`Notifications ${val ? 'Enabled' : 'Disabled'}`);
    };

    const handleThemeToggle = (val) => {
        setIsDarkMode(val);
        localStorage.setItem('theme', val ? 'dark' : 'light');
        if (val) {
            document.body.classList.remove('light-mode');
        } else {
            document.body.classList.add('light-mode');
        }
    };

    const checkCameraPermission = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(t => t.stop());
            showToast("Camera Access Enabled");
        } catch {
            showToast("Camera Access Blocked");
        }
    };

    const handleLogout = () => {
        sessionStorage.clear();
        navigate('/welcome');
    };

    const progress = hunter.progressToNextRank() * 100;
    const xpNeeded = hunter.xpToNextRank();
    
    // Derived proxy stats
    const joinDate = "Joined: Mar 2026";
    const accuracy = Math.min(100, Math.round(85 + (hunter.totalSolves * 0.3)));
    const objectsFound = hunter.totalSolves;
    const riddlesSolved = hunter.totalSolves;

    // Derived Collection (mocking a collection based on recent hunts for demo purposes)
    const uniqueObjects = [...new Set(recentHunts.map(h => h.label))].slice(0, 5);
    const mockCollection = uniqueObjects.length > 0 ? uniqueObjects : ['Bottle', 'Laptop', 'Cup', 'Plant'];

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* 1. PROFILE HEADER CARD */}
            <div className="hero-card" style={{ padding: '1.25rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <div style={{
                    position: 'absolute', top: -50, right: -30,
                    width: 180, height: 180, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(79,70,229,0.3) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{
                            width: 72, height: 72, borderRadius: '50%',
                            background: 'rgba(37,99,235,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '2.5rem',
                            boxShadow: '0 0 0 2px rgba(96,165,250,0.5), 0 0 24px rgba(37,99,235,0.4)',
                        }}>
                            {hunter.rank.emoji}
                        </div>
                        <div>
                            <div style={{ fontSize: '1.3rem', fontWeight: 900, marginBottom: '0.2rem', color: '#fff' }}>{hunter.displayName}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                                <Award size={14} color="var(--blue-light)" />
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--blue-light)' }}>
                                    {hunter.rank.displayName}
                                </span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 600 }}>{joinDate}</div>
                        </div>
                    </div>
                    <button 
                        className="settings-item"
                        style={{ 
                            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', 
                            width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--text-1)'
                        }}
                        onClick={() => {
                            setEditName(hunter.displayName);
                            setEditEmoji(hunter.rank.emoji);
                            setIsEditModalOpen(true);
                        }}
                    >
                        <Edit3 size={16} />
                    </button>
                </div>
            </div>

            {/* 2. LEVEL PROGRESSION CARD */}
            <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Level</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>Level {hunter.rank.level} – {hunter.rank.displayName}</div>
                    </div>
                    <span style={{
                        fontSize: '0.85rem', fontWeight: 900, color: 'var(--blue-light)',
                        background: 'var(--accent-soft)', padding: '0.25rem 0.75rem',
                        borderRadius: 999, border: '1px solid rgba(96,165,250,0.2)',
                    }}>
                        {Math.round(progress)}%
                    </span>
                </div>
                <div className="progress-track" style={{ height: 10, background: 'rgba(255,255,255,0.05)' }}>
                    <div className="progress-fill" style={{ width: `${progress}%`, background: 'var(--accent-grad)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.6rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)' }}>
                    <span>{hunter.xp} XP</span>
                    <span>{xpNeeded > 0 ? `${xpNeeded} XP to next rank` : '🏆 Max Rank!'}</span>
                </div>
            </div>

            {/* 3. PLAYER STATISTICS GRID */}
            <div>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.6rem', paddingLeft: '0.25rem' }}>Player Statistics</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                    <StatTile icon={Trophy} value={hunter.xp}           label="Total XP"      color="var(--gold)"    bgColor="var(--gold-bg)"   />
                    <StatTile icon={Zap}    value={hunter.currentStreak} label="Day Streak"    color="var(--blue-light)" bgColor="var(--accent-soft)" />
                    <StatTile icon={Shield} value={hunter.longestStreak} label="Best Streak"   color="var(--purple)"   bgColor="var(--purple-bg)"  />
                    <StatTile icon={Star}   value={riddlesSolved}        label="Riddles Solved" color="var(--success)"  bgColor="var(--success-bg)" />
                    <StatTile icon={Package} value={objectsFound}        label="Objects Found" color="#ec4899"       bgColor="rgba(236,72,153,0.12)" />
                    <StatTile icon={Target} value={`${accuracy}%`}       label="Accuracy Rate" color="#06b6d4"       bgColor="rgba(6,182,212,0.12)" />
                </div>
            </div>

            {/* 4. ACHIEVEMENTS SECTION */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', paddingLeft: '0.25rem', paddingRight: '0.25rem' }}>
                    <h2 style={{ fontSize: '0.95rem', fontWeight: 800 }}>Achievements</h2>
                    <span style={{ fontSize: '0.75rem', color: 'var(--blue-light)', fontWeight: 700 }}>{achievements.filter(a => a.unlocked).length} / {achievements.length}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none', margin: '0 -1rem', padding: '0 1rem' }}>
                    {achievements.map((ach, i) => (
                        <div key={i} className="card" style={{ 
                            minWidth: 100, padding: '1rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                            opacity: ach.unlocked ? 1 : 0.5,
                            border: ach.unlocked ? '1px solid rgba(245,158,11,0.3)' : '1px solid var(--border)',
                            background: ach.unlocked ? 'linear-gradient(135deg, rgba(245,158,11,0.05) 0%, rgba(20,25,41,1) 100%)' : 'var(--bg-card)'
                        }}>
                            <div style={{ 
                                fontSize: '2rem', 
                                filter: ach.unlocked ? 'drop-shadow(0 0 10px rgba(245,158,11,0.4))' : 'grayscale(100%)' 
                            }}>
                                {ach.emoji}
                            </div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, textAlign: 'center', color: ach.unlocked ? 'var(--text-1)' : 'var(--text-3)' }}>
                                {ach.label}
                            </div>
                            {!ach.unlocked && <Lock size={12} color="var(--text-3)" style={{ marginTop: '-2px' }} />}
                        </div>
                    ))}
                </div>
            </div>

            {/* 5. OBJECT COLLECTION SECTION */}
            <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '0.95rem', fontWeight: 800 }}>Object Collection</h2>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', fontWeight: 600 }}>{uniqueObjects.length} unique found</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {mockCollection.map((obj, i) => (
                        <div key={i} style={{ 
                            display: 'flex', alignItems: 'center', gap: '0.4rem', 
                            background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.75rem', 
                            borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' 
                        }}>
                            <CheckCircle size={12} color="var(--success)" />
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)' }}>{obj}</span>
                        </div>
                    ))}
                    {uniqueObjects.length === 0 && <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Complete a hunt to add to your collection!</div>}
                </div>
            </div>

            {/* 7. WEEKLY ACTIVITY GRAPH */}
            <div className="card" style={{ padding: '1.25rem' }}>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '1rem' }}>Weekly Activity</h2>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: 100, paddingBottom: 20 }}>
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
                        const count = weeklyActivity[i] || 0;
                        const max = Math.max(...weeklyActivity, 5); // scale relative to max or 5
                        const heightPct = Math.max(5, (count / max) * 100);
                        const isToday = i === (new Date().getDay() + 6) % 7;
                        
                        return (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', flex: 1 }}>
                                <div style={{ 
                                    width: 14, height: `${heightPct}%`, 
                                    background: isToday ? 'var(--blue-light)' : 'rgba(37,99,235,0.3)',
                                    borderRadius: 4, transition: 'height 1s ease'
                                }} />
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: isToday ? 'var(--text-1)' : 'var(--text-3)' }}>
                                    {day}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 6. RECENT HUNTS SECTION (Moved after activity graph for better flow) */}
            <div>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.6rem', paddingLeft: '0.25rem' }}>Recent Hunts</h2>
                {recentHunts.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {recentHunts.slice(0, 3).map((hunt, i) => (
                            <div key={i} className="card" style={{ padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                    <div style={{ background: `${hunt.color}15`, width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <DynamicIcon name={hunt.icon} size={18} color={hunt.color} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{hunt.label}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 600 }}>{formatHuntTime(hunt.timestamp)}</div>
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    +{hunt.xp} XP
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.85rem' }}>
                        No hunts completed yet. Start hunting to earn XP!
                    </div>
                )}
            </div>

            {/* 8. GLOBAL LEADERBOARD POSITION */}
            <div className="hero-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--blue-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ranking</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#fff', marginTop: '0.2rem' }}>Global Rank: #142</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginTop: '0.1rem' }}>Top 10% Hunters</div>
                </div>
                <button className="btn-primary" style={{ padding: '0.6rem 1rem', fontSize: '0.8rem' }}>
                    Leaderboard <ChevronRight size={14} />
                </button>
            </div>

            {/* 9. SETTINGS SECTION */}
            <div>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.6rem', paddingLeft: '0.25rem' }}>Settings</h2>
                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                    
                    {/* EDIT PROFILE */}
                    <button className="settings-item" onClick={() => {
                        setEditName(hunter.displayName);
                        setEditEmoji(hunter.rank.emoji);
                        setIsEditModalOpen(true);
                    }} style={{ borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <Edit3 size={18} color="var(--text-2)" />
                            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-1)' }}>Edit Profile</span>
                        </div>
                        <ChevronRight size={16} color="var(--text-3)" />
                    </button>

                    {/* NOTIFICATIONS */}
                    <div className="settings-item" style={{ borderBottom: '1px solid var(--border)', cursor: 'default' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <Bell size={18} color="var(--text-2)" />
                            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-1)' }}>Notifications</span>
                        </div>
                        <ToggleSwitch checked={notificationsEnabled} onChange={handleNotifToggle} />
                    </div>

                    {/* CAMERA PERMISSIONS */}
                    <button className="settings-item" onClick={checkCameraPermission} style={{ borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <CameraIcon size={18} color="var(--text-2)" />
                            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-1)' }}>Camera Permissions</span>
                        </div>
                        <ChevronRight size={16} color="var(--text-3)" />
                    </button>

                    {/* DARK MODE */}
                    <div className="settings-item" style={{ borderBottom: '1px solid var(--border)', cursor: 'default' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <Moon size={18} color="var(--blue-light)" />
                            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-1)' }}>Dark Mode</span>
                        </div>
                        <ToggleSwitch checked={isDarkMode} onChange={handleThemeToggle} />
                    </div>

                    {/* LOG OUT */}
                    <button className="settings-item" onClick={handleLogout} style={{ justifyContent: 'flex-start', gap: '0.8rem' }}>
                        <LogOut size={18} color="var(--error)" />
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--error)' }}>Log Out</span>
                    </button>
                </div>
            </div>

            {/* Custom Toast Notification */}
            {toastMessage && (
                <div className="animate-fade-in" style={{
                    position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(11, 15, 30, 0.95)', border: '1px solid var(--border-h)',
                    padding: '0.8rem 1.5rem', borderRadius: 999, zIndex: 100,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    fontSize: '0.85rem', fontWeight: 600, color: '#fff',
                    whiteSpace: 'nowrap'
                }}>
                    {toastMessage}
                </div>
            )}

            {/* Edit Profile Modal */}
            {isEditModalOpen && (
                <div style={{
                    position: 'fixed', inset: 0, 
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: '1rem'
                }}>
                    <div className="card animate-fade-in" style={{ padding: '1.5rem', width: '100%', maxWidth: 360, background: 'var(--bg-card)' }}>
                        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 900 }}>Edit Profile</h3>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-2)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avatar Emoji</label>
                            <input 
                                value={editEmoji} 
                                onChange={e => setEditEmoji(e.target.value)}
                                style={{
                                    width: '100%', padding: '0.8rem', background: 'var(--bg-input)',
                                    border: '1px solid var(--border)', borderRadius: '8px',
                                    color: 'var(--text-1)', fontSize: '1.5rem', textAlign: 'center'
                                }}
                            />
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-2)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username</label>
                            <input 
                                value={editName} 
                                onChange={e => setEditName(e.target.value)}
                                style={{
                                    width: '100%', padding: '0.8rem', background: 'var(--bg-input)',
                                    border: '1px solid var(--border)', borderRadius: '8px',
                                    color: 'var(--text-1)', fontSize: '0.9rem', fontWeight: 600
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                            <button className="btn-primary" style={{ flex: 1 }} onClick={saveProfile}>Save</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
