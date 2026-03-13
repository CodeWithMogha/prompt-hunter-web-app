import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function WelcomeView() {
    const navigate = useNavigate();
    
    return (
        <div className="animate-fade-in" style={{
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center',
            height: '100%', padding: '2rem',
            textAlign: 'center', background: 'var(--bg-base)',
            position: 'absolute', inset: 0, zIndex: 100
        }}>
            <h1 className="gradient-text" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>PromptHunter</h1>
            <p style={{ color: 'var(--text-2)', fontSize: '1.1rem', marginBottom: '3rem', fontWeight: 600, maxWidth: 300, lineHeight: 1.4 }}>
                Turn the real world into your game level
            </p>
            
            <button 
                className="btn-primary" 
                style={{ padding: '1.1rem 3rem', fontSize: '1.1rem', width: '100%', maxWidth: 300, borderRadius: '16px' }}
                onClick={() => navigate('/')}
            >
                TAP TO START
            </button>
        </div>
    );
}
