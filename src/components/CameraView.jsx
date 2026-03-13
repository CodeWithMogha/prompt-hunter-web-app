import React, { useRef, useState, useEffect } from 'react';
import { Camera as CameraIcon, CheckCircle, XCircle, RefreshCw, Home, Zap, SwitchCamera } from 'lucide-react';
import VisionService from '../services/VisionService';
import AIManager from '../services/AIManager';
import { useRiddleBuffer } from '../hooks/useRiddleBuffer';
import { recordSuccessfulHunt, addRecentHunt, incrementTodayActivity, getActiveRiddleIndex } from '../services/GameStorage';

export default function CameraView() {
    const videoRef      = useRef(null);
    const canvasRef     = useRef(null);
    const overlayCanvas = useRef(null);
    const streamRef     = useRef(null); // live ref for flash / flip
    const isTogglingRef = useRef(false); // prevents concurrent applyConstraints calls
    const isFlippingRef = useRef(false); // prevents concurrent camera flips

    const { activeRiddles, markRiddleUsed } = useRiddleBuffer();
    const activeIdx = getActiveRiddleIndex();
    const riddle = activeRiddles[activeIdx] || activeRiddles[0];

    const [, setStream]                       = useState(null);
    const [detectedLabels, setDetectedLabels] = useState([]);
    const [status, setStatus]                 = useState('hunting'); // hunting | verifying | success | failed
    const [feedback, setFeedback]             = useState('');
    const [earnedXp, setEarnedXp]             = useState(0);
    const [flashOn, setFlashOn]               = useState(false);
    const [flashSupported, setFlashSupported] = useState(true);
    const [flashError, setFlashError]         = useState('');
    const [facingMode, setFacingMode]         = useState('environment'); // 'environment' | 'user'
    const [isFlipping, setIsFlipping]         = useState(false);

    /* ── Shared camera starter (used on mount + flip) ── */
    const startCameraWithMode = async (mode) => {
        // Stop any existing stream first
        const existing = streamRef.current;
        if (existing) {
            const prevTrack = existing.getVideoTracks()[0];
            if (prevTrack) {
                try { await prevTrack.applyConstraints({ advanced: [{ torch: false }] }); } catch { /* ignore */ }
            }
            existing.getTracks().forEach(t => t.stop());
        }
        try {
            const ms = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: mode,
                    width:  { ideal: 640, max: 1280 },
                    height: { ideal: 480, max: 720  },
                },
            });
            setStream(ms);
            streamRef.current = ms;
            if (videoRef.current) videoRef.current.srcObject = ms;
            // Torch only available on rear camera
            if (mode === 'environment') {
                const track = ms.getVideoTracks()[0];
                const caps  = track?.getCapabilities?.();
                setFlashSupported(!!caps?.torch);
            } else {
                setFlashSupported(false); // front cam has no torch
                setFlashOn(false);
            }
        } catch (e) { console.error('Camera error:', e); }
    };

    /* ── Camera mount ── */
    useEffect(() => {
        startCameraWithMode('environment');
        return () => {
            const ms = streamRef.current;
            if (ms) {
                const track = ms.getVideoTracks()[0];
                if (track) {
                    try { track.applyConstraints({ advanced: [{ torch: false }] }); } catch { /* ignore */ }
                }
                ms.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    /* ── Flip camera ── */
    const flipCamera = async () => {
        if (isFlippingRef.current) return;
        isFlippingRef.current = true;
        setIsFlipping(true);
        const newMode = facingMode === 'environment' ? 'user' : 'environment';
        setFacingMode(newMode);
        await startCameraWithMode(newMode);
        setIsFlipping(false);
        isFlippingRef.current = false;
    };

    /* ── Detection Loop (throttled for mobile perf) ── */
    useEffect(() => {
        let timer;
        let isDetecting = false;
        // Cache last known canvas dimensions to avoid resetting every tick
        let lastW = 0, lastH = 0;

        const tick = async () => {
            const video = videoRef.current;
            const canvas = overlayCanvas.current;

            if (video?.readyState === 4 && status === 'hunting' && !isDetecting) {
                isDetecting = true;
                try {
                    const preds = await VisionService.detectObjects(video);

                    if (canvas && video.videoWidth) {
                        const ctx = canvas.getContext('2d');

                        // Only reset dimensions when they change (avoids GPU flush every frame)
                        if (video.videoWidth !== lastW || video.videoHeight !== lastH) {
                            canvas.width  = video.videoWidth;
                            canvas.height = video.videoHeight;
                            lastW = video.videoWidth;
                            lastH = video.videoHeight;
                        }

                        ctx.clearRect(0, 0, canvas.width, canvas.height);

                        preds.forEach(p => {
                            ctx.strokeStyle = '#60a5fa';
                            ctx.lineWidth   = 2;
                            ctx.strokeRect(...p.bbox);

                            const txt = `${p.class} ${Math.round(p.score * 100)}%`;
                            ctx.font = 'bold 12px system-ui';
                            const tw = ctx.measureText(txt).width;
                            const ty = p.bbox[1] > 22 ? p.bbox[1] - 22 : p.bbox[1] + 4;
                            ctx.fillStyle = 'rgba(11,15,30,0.82)';
                            ctx.fillRect(p.bbox[0], ty, tw + 10, 20);
                            ctx.fillStyle = '#60a5fa';
                            ctx.fillText(txt, p.bbox[0] + 5, ty + 14);
                        });

                        setDetectedLabels(prev => {
                            const next = [...new Set(preds.map(p => p.class))];
                            // Only trigger re-render if labels actually changed
                            return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
                        });
                    }
                } catch { /* ignore */ }
                isDetecting = false;
            }

            // 500ms between inference ticks — good balance of responsiveness vs CPU
            timer = setTimeout(tick, 500);
        };

        tick();
        return () => clearTimeout(timer);
    }, [status]);

    /* ── Capture & Validate (Gemini AI Flow) ── */
    const captureAndVerify = async () => {
        if (!videoRef.current || !canvasRef.current || !riddle) return;

        setStatus('verifying'); // triggers UI
        
        // Draw video to canvas to get base64
        const ctx = canvasRef.current.getContext('2d');
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
        const base64Image = canvasRef.current.toDataURL('image/jpeg', 0.8);

        try {
            // Verify using AI
            const result = await AIManager.verifyAnswer(base64Image, riddle);
            
            setFeedback(result.feedback || "");
            
            if (result.isCorrect) {
                // STEP 6 - XP Logic (+70 XP only for correct matches)
                const xpGained = 70;
                setEarnedXp(xpGained);
                
                // Update Storage
                recordSuccessfulHunt(xpGained);
                addRecentHunt(riddle.answer || "Target", xpGained);
                incrementTodayActivity();
                
                setStatus('success');
                await markRiddleUsed(riddle.id); // Triggers background refill
            } else {
                setStatus('failed');
            }

        } catch (error) {
            console.error('Detection failed', error);
            setFeedback('Detection error. Try again.');
            setStatus('failed');
        }
    };

    const reset = () => { setStatus('hunting'); setFeedback(''); };

    /* ── Flash / Torch toggle ── */
    const toggleFlash = async () => {
        // Lock: prevent concurrent calls from rapid taps
        if (isTogglingRef.current) return;
        isTogglingRef.current = true;

        const ms = streamRef.current;
        if (!ms) { isTogglingRef.current = false; return; }
        const track = ms.getVideoTracks()[0];
        if (!track) { isTogglingRef.current = false; return; }

        const newState = !flashOn;
        try {
            // Race applyConstraints against a 1.5s timeout so it can't hang the page
            await Promise.race([
                track.applyConstraints({ advanced: [{ torch: newState }] }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('torch_timeout')), 1500)
                ),
            ]);
            setFlashOn(newState);
            setFlashError('');
        } catch (e) {
            console.warn('Torch toggle failed:', e.message);
            // If we were turning on and it failed, make sure state stays false
            setFlashOn(false);
            if (e.message === 'torch_timeout') {
                setFlashError('Flash timed out – not supported here');
            } else {
                setFlashError('Flash not supported on this device');
            }
            setFlashSupported(false);
            setTimeout(() => setFlashError(''), 3000);
        } finally {
            // Always release the lock
            isTogglingRef.current = false;
        }
    };

    return (
        <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingBottom: '0.5rem' }}>

            {/* ── Riddle Banner ── */}
            <div className="card" style={{
                padding: '0.85rem 1.1rem',
                borderLeft: '3px solid var(--blue-1)',
                borderRadius: '16px',
                flexShrink: 0,
                marginTop: '0.9rem',
            }}>
                <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--blue-light)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.3rem' }}>
                    🎯 Your Target
                </p>
                <p style={{ fontSize: '0.92rem', fontStyle: 'italic', color: 'var(--text-1)', lineHeight: 1.5 }}>
                    {riddle?.text || 'Loading your mission…'}
                </p>
            </div>

            {/* ── Camera Viewport ── */}
            <div style={{
                flex: 1,
                position: 'relative',
                borderRadius: 22,
                overflow: 'hidden',
                background: '#000',
                border: '1px solid var(--border)',
                boxShadow: '0 0 0 1px rgba(37,99,235,0.15), 0 8px 32px rgba(0,0,0,0.5)',
                minHeight: 0,
            }}>
                <video ref={videoRef} autoPlay playsInline muted
                    style={{
                        width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                        // Mirror the image for front camera (natural selfie feel)
                        transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                        transition: 'transform 0.2s ease',
                    }} />
                <canvas ref={overlayCanvas} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {/* Detected Label Chips */}
                {status === 'hunting' && detectedLabels.length > 0 && (
                    <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 5, flexWrap: 'wrap', maxWidth: '70%' }}>
                        {detectedLabels.map(l => (
                            <span key={l} style={{
                                background: 'rgba(11,15,30,0.85)',
                                border: '1px solid rgba(96,165,250,0.25)',
                                color: '#93c5fd',
                                padding: '3px 10px',
                                borderRadius: 999,
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                backdropFilter: 'blur(8px)',
                            }}>{l}</span>
                        ))}
                    </div>
                )}

                {/* ── Corner Frame Brackets ── */}
                {status === 'hunting' && (() => {
                    const S = 24, T = 2.5, C = 'rgba(96,165,250,0.8)', R = 4;
                    const corners = [
                        { top: 14, left: 14, borderTop: `${T}px solid ${C}`, borderLeft: `${T}px solid ${C}` },
                        { top: 14, right: 14, borderTop: `${T}px solid ${C}`, borderRight: `${T}px solid ${C}` },
                        { bottom: 14, left: 14, borderBottom: `${T}px solid ${C}`, borderLeft: `${T}px solid ${C}` },
                        { bottom: 14, right: 14, borderBottom: `${T}px solid ${C}`, borderRight: `${T}px solid ${C}` },
                    ];
                    return corners.map((s, i) => (
                        <div key={i} style={{ position: 'absolute', width: S, height: S, borderRadius: R, ...s }} />
                    ));
                })()}

                {/* ── Flash Button (top-right) ── */}
                {status === 'hunting' && (
                    <button
                        id="flash-btn"
                        onClick={toggleFlash}
                        disabled={!flashSupported}
                        aria-label={flashOn ? 'Turn flash off' : 'Turn flash on'}
                        title={!flashSupported ? 'Flash not supported' : flashOn ? 'Flash On' : 'Flash Off'}
                        style={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            border: flashOn
                                ? '1.5px solid rgba(250,204,21,0.5)'
                                : '1.5px solid rgba(255,255,255,0.18)',
                            background: flashOn
                                ? 'rgba(250,204,21,0.18)'
                                : 'rgba(10,14,28,0.7)',
                            backdropFilter: 'blur(10px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: !flashSupported ? 'not-allowed' : 'pointer',
                            boxShadow: flashOn
                                ? '0 0 16px rgba(250,204,21,0.55), inset 0 0 8px rgba(250,204,21,0.15)'
                                : '0 2px 8px rgba(0,0,0,0.4)',
                            transition: 'all 0.22s ease',
                            opacity: !flashSupported ? 0.35 : 1,
                        }}
                    >
                        <Zap
                            size={18}
                            color={flashOn ? '#fde047' : 'rgba(255,255,255,0.7)'}
                            fill={flashOn ? '#fde047' : 'none'}
                            style={{ transition: 'all 0.2s ease' }}
                        />
                    </button>
                )}

                {/* ── Flip Camera Button (top-left) ── */}
                {status === 'hunting' && (
                    <button
                        id="flip-camera-btn"
                        onClick={flipCamera}
                        disabled={isFlipping}
                        aria-label="Flip camera"
                        title={facingMode === 'environment' ? 'Switch to Front Camera' : 'Switch to Rear Camera'}
                        style={{
                            position: 'absolute',
                            top: 12,
                            left: 12,
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            border: '1.5px solid rgba(255,255,255,0.18)',
                            background: 'rgba(10,14,28,0.7)',
                            backdropFilter: 'blur(10px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: isFlipping ? 'not-allowed' : 'pointer',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                            transition: 'all 0.22s ease',
                            opacity: isFlipping ? 0.5 : 1,
                        }}
                    >
                        <SwitchCamera
                            size={18}
                            color="rgba(255,255,255,0.8)"
                            style={{ animation: isFlipping ? 'spin 0.6s linear infinite' : 'none' }}
                        />
                    </button>
                )}

                {/* ── Flash Error Toast ── */}
                {flashError && (
                    <div style={{
                        position: 'absolute',
                        bottom: 14,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(10,14,28,0.88)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        backdropFilter: 'blur(10px)',
                        color: '#fca5a5',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.4rem 1rem',
                        borderRadius: 999,
                        whiteSpace: 'nowrap',
                        animation: 'fadeSlideUp 0.3s ease',
                        zIndex: 10,
                    }}>
                        ⚡ {flashError}
                    </div>
                )}


                {status !== 'hunting' && (
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(8,12,28,0.9)',
                        backdropFilter: 'blur(14px)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        padding: '2rem', textAlign: 'center', gap: '0.75rem',
                    }}>

                        {status === 'verifying' && (
                            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                <div style={{
                                    width: 70, height: 70, borderRadius: '50%',
                                    background: 'var(--accent-soft)',
                                    border: '1px solid rgba(37,99,235,0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <RefreshCw size={30} color="var(--blue-light)" style={{ animation: 'spin 1.1s linear infinite' }} />
                                </div>
                                <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>AI is verifying…</h2>
                                <p style={{ color: 'var(--text-2)', fontSize: '0.83rem' }}>Analysing your capture</p>
                            </div>
                        )}

                        {status === 'success' && (
                            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem', maxWidth: 260 }}>
                                <div style={{
                                    width: 78, height: 78, borderRadius: '50%',
                                    background: 'var(--success-bg)',
                                    border: '1px solid rgba(16,185,129,0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 0 30px rgba(16,185,129,0.3)',
                                }}>
                                    <CheckCircle size={42} color="var(--success)" />
                                </div>
                                <h2 style={{ color: 'var(--success)', fontSize: '1.45rem', fontWeight: 900 }}>Found it! 🎉</h2>
                                {/* XP reward badge */}
                                <div style={{
                                    background: 'linear-gradient(135deg,rgba(37,99,235,0.25),rgba(79,70,229,0.25))',
                                    border: '1px solid rgba(79,70,229,0.4)',
                                    padding: '0.4rem 1.2rem', borderRadius: 999,
                                    fontSize: '1.1rem', fontWeight: 900, color: '#a5b4fc',
                                    animation: 'pulse 1.5s ease-in-out 2',
                                }}>
                                    +{earnedXp} XP
                                </div>
                                <p style={{ color: 'var(--text-2)', fontSize: '0.86rem', lineHeight: 1.55 }}>{feedback}</p>
                                <button id="go-home-btn" className="btn-primary mt-4" style={{ width: '100%' }}
                                    onClick={() => window.location.href = '/'}>
                                    <Home size={17} /> Go Home
                                </button>
                            </div>
                        )}

                        {status === 'failed' && (
                            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem', maxWidth: 260 }}>
                                <div style={{
                                    width: 78, height: 78, borderRadius: '50%',
                                    background: 'var(--error-bg)',
                                    border: '1px solid rgba(239,68,68,0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 0 30px rgba(239,68,68,0.25)',
                                }}>
                                    <XCircle size={42} color="var(--error)" />
                                </div>
                                <h2 style={{ color: 'var(--error)', fontSize: '1.45rem', fontWeight: 900 }}>Not quite…</h2>
                                <p style={{ color: 'var(--text-2)', fontSize: '0.86rem', lineHeight: 1.55 }}>{feedback}</p>
                                <button id="try-again-btn" className="btn-secondary mt-4" style={{ width: '100%' }}
                                    onClick={reset}>
                                    Try Again
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Capture Button ── */}
            <div className="flex-center" style={{ paddingBottom: '0.25rem', flexShrink: 0 }}>
                <button
                    id="capture-btn"
                    onClick={captureAndVerify}
                    disabled={status !== 'hunting'}
                    aria-label="Capture to verify"
                    style={{
                        width: 74, height: 74,
                        borderRadius: '50%',
                        background: status === 'hunting' ? 'linear-gradient(135deg,#2563eb,#4f46e5)' : 'var(--bg-card)',
                        border: '3px solid rgba(255,255,255,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: status === 'hunting'
                            ? '0 0 0 8px rgba(37,99,235,0.12), 0 8px 24px rgba(37,99,235,0.45)'
                            : 'none',
                        cursor: status !== 'hunting' ? 'not-allowed' : 'pointer',
                        transition: 'all 0.22s ease',
                        animation: status === 'hunting' ? 'glow-pulse 2.5s ease-in-out infinite' : 'none',
                    }}
                >
                    <CameraIcon size={28} color={status === 'hunting' ? '#fff' : 'var(--text-3)'} />
                </button>
            </div>

            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
