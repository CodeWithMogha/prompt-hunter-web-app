import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, AlertTriangle, ShieldCheck } from 'lucide-react';
import yaml from 'js-yaml';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function AdminPortalView() {
    const navigate = useNavigate();
    const [yamlText, setYamlText] = useState("Loading config...");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const configDocRef = doc(db, 'game_config', 'riddles');

    useEffect(() => {
        async function fetchYaml() {
            try {
                const docSnap = await getDoc(configDocRef);
                if (docSnap.exists() && docSnap.data().yamlString) {
                    setYamlText(docSnap.data().yamlString);
                } else {
                    // Seed initial structure if empty
                    const initialYaml = `config:
  last_updated: "${new Date().toISOString()}"
  total_generated: 0
riddles: []
`;
                    setYamlText(initialYaml);
                }
            } catch (err) {
                console.error("Error fetching config:", err);
                setError("Failed to load config. Make sure Firestore is accessible.");
            }
        }
        fetchYaml();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        setSuccess(false);

        try {
            // 1. Validate Syntax
            const parsed = yaml.load(yamlText);
            
            // Basic schema validation
            if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.riddles)) {
                throw new Error("Invalid schema: 'riddles' array is missing.");
            }

            // 2. Save to Firestore
            await setDoc(configDocRef, { 
                yamlString: yamlText,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);

        } catch (err) {
            console.error("Validation/Save Error:", err);
            setError(`Validation Error: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '1rem' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <button onClick={() => navigate('/')} className="btn-secondary" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowLeft size={16} /> Back
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)' }}>
                    <ShieldCheck size={20} />
                    <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Admin Portal</h2>
                </div>
                <div style={{ width: '70px' }}></div> {/* Spacer for centering */}
            </div>

            <p className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                Direct edit access for the cloud <code>yamlString</code>. Syntax is strictly validated before save.
            </p>

            {/* Error / Success Banners */}
            {error && (
                <div style={{ background: 'rgba(255, 0, 0, 0.1)', borderLeft: '4px solid var(--error-color)', padding: '0.8rem', marginBottom: '1rem', borderRadius: '4px', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <AlertTriangle color="var(--error-color)" size={20} style={{ flexShrink: 0, marginTop: '2px' }}/>
                    <span style={{ color: 'var(--error-color)', fontSize: '0.9rem', fontFamily: 'monospace' }}>{error}</span>
                </div>
            )}

            {success && (
                <div style={{ background: 'rgba(63, 185, 80, 0.1)', borderLeft: '4px solid var(--success-color)', padding: '0.8rem', marginBottom: '1rem', borderRadius: '4px' }}>
                    <span style={{ color: 'var(--success-color)', fontSize: '0.9rem' }}>Config saved successfully to cloud!</span>
                </div>
            )}

            {/* Editor Textarea */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    riddles.yaml (Game Config Document)
                </div>
                <textarea 
                    value={yamlText}
                    onChange={(e) => setYamlText(e.target.value)}
                    spellCheck="false"
                    style={{
                        flex: 1,
                        width: '100%',
                        padding: '1rem',
                        background: '#0d1117',
                        color: '#c9d1d9',
                        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                        fontSize: '14px',
                        border: 'none',
                        resize: 'none',
                        outline: 'none',
                        lineHeight: '1.5'
                    }}
                />
            </div>

            {/* Save Button Action */}
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                    className="btn-primary" 
                    onClick={handleSave} 
                    disabled={isSaving}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Save size={18} />
                    {isSaving ? "Saving & Validating..." : "Save Config to Cloud"}
                </button>
            </div>

        </div>
    );
}
