import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import yaml from 'js-yaml';
import AIManager from '../services/AIManager';

export function useRiddleBuffer() {
    const [riddles, setRiddles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isRefilling, setIsRefilling] = useState(false);
    const [offlineMode, setOfflineMode] = useState(false);

    const configDocRef = doc(db, 'game_config', 'riddles');
    const LOCAL_YAML_KEY = 'fallback_riddles_yaml';

    const fetchBuffer = useCallback(async () => {
        setIsLoading(true);
        try {
            const docSnap = await getDoc(configDocRef);
            if (docSnap.exists() && docSnap.data().yamlString) {
                const parsed = yaml.load(docSnap.data().yamlString);
                if (parsed && Array.isArray(parsed.riddles)) {
                    setRiddles(parsed.riddles);
                    checkAndRefill(parsed.riddles);
                }
            } else {
                setRiddles([]);
                checkAndRefill([]);
            }
        } catch (err) {
            console.error("Error fetching buffer from Firestore:", err.message);
            
            // Offline Fallback Logic
            if (err.message.includes('offline') || err.message.includes('permission')) {
                console.log("Firebase unavailable. Switching to Local YAML sequence.");
                setOfflineMode(true);
                setError("Playing in Offline Mode (Local YAML).");
                
                // Try to load existing local YAML
                const localYaml = localStorage.getItem(LOCAL_YAML_KEY);
                let loadedLocal = false;
                if (localYaml) {
                    try {
                        const parsed = yaml.load(localYaml);
                        if (parsed && Array.isArray(parsed.riddles)) {
                            setRiddles(parsed.riddles);
                            setIsLoading(false); // Enable the UI immediately
                            loadedLocal = true;
                            // Trigger refill seamlessly in background using `true` for isLocal
                            checkAndRefill(parsed.riddles, true);
                        }
                    } catch (e) {
                         console.error("Local YAML parse error:", e);
                    }
                }
                
                // If no local YAML exists or it's invalid, start fresh
                if (!loadedLocal) {
                    setRiddles([]);
                    setIsLoading(false);
                    checkAndRefill([], true);
                }
                return;
            }
            setError(err);
        } finally {
            // Only set false here if we didn't already exit via offline fallback
            setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [configDocRef]);

    useEffect(() => {
        fetchBuffer();
     
    }, [fetchBuffer]);

    const activeRiddles = riddles.filter(r => r.status === 'active');
    // eslint-disable-next-line no-unused-vars
    const usedRiddles = riddles.filter(r => r.status === 'used');

    const checkAndRefill = async (currentRiddles, isLocal = offlineMode) => {
        const currentActiveRiddles = currentRiddles.filter(r => r.status === 'active');
        const activeCount = currentActiveRiddles.length;
        
        if (activeCount < 10 && !isRefilling) {
            setIsRefilling(true);
            try {
                // Determine how many we need to reach exactly 10 active
                const needCount = 10 - activeCount;
                console.log(`Buffer low (${activeCount}/10). Refilling ${needCount} riddles...`);

                const currentUsedRiddles = currentRiddles.filter(r => r.status === 'used');
                const usedCountToHistory = Math.min(20, currentUsedRiddles.length);
                const historyList = currentUsedRiddles.slice(-usedCountToHistory).map(r => r.targetLabel);
                const activeList = currentActiveRiddles.map(r => r.targetLabel);

                let newYamlText = await AIManager.generateRiddleBatchYaml(needCount, [...activeList, ...historyList]);
                
                let validatedNewRiddles = null;

                if (newYamlText) {
                    try {
                        const newParsed = yaml.load(newYamlText);
                        if (newParsed && Array.isArray(newParsed.riddles)) {
                            validatedNewRiddles = newParsed.riddles.slice(0, needCount).map((r, i) => ({
                                id: `riddle_${Date.now()}_${i}`,
                                text: r.text,
                                targetLabel: r.targetLabel.toLowerCase(),
                                status: 'active'
                            }));
                        } else {
                            console.warn("AI generated text, but it lacked a valid 'riddles' array format.");
                        }
                    } catch (e) {
                         console.error("js-yaml failed to parse AI output:", e.message);
                    }
                }

                // FINAL FALLBACK: If AI is rate-limited (returns null) or fails to parse, inject hardcoded riddles
                if (!validatedNewRiddles || validatedNewRiddles.length === 0) {
                    console.log("AI Generation skipped or failed parsing. Injecting hardcoded fallback riddles.");
                    const fallbackYamlText = `riddles:
  - text: "I have legs but cannot walk. You sit on me to talk."
    targetLabel: "chair"
  - text: "I have a screen and buttons too, I connect you to the world anew."
    targetLabel: "laptop"
  - text: "I keep your food cold and fresh, inside my freezing mesh."
    targetLabel: "refrigerator"
  - text: "I have hands but cannot hold, I tell you if you're getting old."
    targetLabel: "clock"
  - text: "I am full of pages, words, and art. Reading me will make you smart."
    targetLabel: "book"
  - text: "I'm filled with water, soap, and foam. I'm where you wash up in your home."
    targetLabel: "sink"
  - text: "You drink from me when you are dry, clear liquid is what I supply."
    targetLabel: "bottle"
  - text: "I have four legs and a tail, I bark when I see the mail."
    targetLabel: "dog"
  - text: "I live in a pot but I'm not for stew, I have green leaves to share with you."
    targetLabel: "potted plant"
  - text: "I have four wheels and a motor, I take you far like a speedy boater."
    targetLabel: "car"`;
                    
                    const fallbackParsed = yaml.load(fallbackYamlText);
                    validatedNewRiddles = fallbackParsed.riddles.slice(0, needCount).map((r, i) => ({
                        id: `riddle_fallback_${Date.now()}_${i}`,
                        text: r.text,
                        targetLabel: r.targetLabel.toLowerCase(),
                        status: 'active'
                    }));
                }

                if (validatedNewRiddles && validatedNewRiddles.length > 0) {
                    const updatedRiddles = [...currentRiddles, ...validatedNewRiddles];
                    await saveRiddles(updatedRiddles, isLocal);
                }
            } catch (err) {
                console.error("Refill failed:", err);
            } finally {
                setIsRefilling(false);
            }
        }
    };

    const saveRiddles = async (updatedRiddlesList, isLocal = offlineMode) => {
        try {
            // OPTIMISTIC UPDATE: Update local state explicitly to force React re-render immediately
            // This prevents UI blockage if Firestore hangs or throws a permission error
            setRiddles([...updatedRiddlesList]);

            const yamlObject = {
                config: {
                    last_updated: new Date().toISOString(),
                    total_generated: updatedRiddlesList.length
                },
                riddles: updatedRiddlesList
            };
            const yamlString = yaml.dump(yamlObject);
            
            if (isLocal) {
                localStorage.setItem(LOCAL_YAML_KEY, yamlString);
                console.log("Saved local sequence to localStorage YAML.");
            } else {
                await setDoc(configDocRef, { yamlString, updatedAt: new Date().toISOString() }, { merge: true });
            }
            
            return true;
        } catch (err) {
            console.error("Failed to save updated buffer:", err);
            return false;
        }
    };

    const markRiddleUsed = async (riddleId) => {
        const updatedRiddles = riddles.map(r => 
            r.id === riddleId ? { ...r, status: 'used' } : r
        );
        
        await saveRiddles(updatedRiddles);
        
        // After marking used, check if we need to refill
        checkAndRefill(updatedRiddles);
    };

    return {
        activeRiddles,
        isLoading,
        error,
        isRefilling,
        markRiddleUsed,
        refresh: fetchBuffer
    };
}
