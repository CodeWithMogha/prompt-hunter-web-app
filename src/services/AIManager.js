import { VerificationResult, Riddle } from "../models/GameModels";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * AIManager - Orchestrates AI services for the app.
 * Uses Gemini as primary with Groq fallback.
 */
class AIManager {
    constructor() {
        this.geminiAi = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");
        this.groqApiKey = import.meta.env.VITE_GROQ_API_KEY || "";
    }

    /**
     * Generates a new batch of daily riddles in YAML format.
     */
    async generateRiddleBatchYaml(count, exclusionList) {
        const cocoSsdLabels = ["person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat", "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket", "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse", "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink", "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"];
        
        const prompt = `
            You are a creative puzzle master designing a real-world scavenger hunt for a mobile app.
            Your task is to generate EXACTLY ${count} unique riddles.
            
            RULES:
            1. The target 'answer' for each riddle MUST be one of these exact supported objects: ${cocoSsdLabels.join(', ')}.
            2. NEGATIVE CONSTRAINT: DO NOT use any of these items as the target answer, as they were recently used: [${exclusionList.join(', ')}]. If you do, the game breaks.
            3. The riddle should describe the object cleverly without saying its name directly.
            
            Return ONLY a valid YAML format representing a list of riddles. EXACTLY this format, nothing else (no markdown blocks):
            riddles:
              - text: "Your clever riddle here"
                targetLabel: "exact item name from supported list"
              - text: "Another riddle"
                targetLabel: "another item"
        `;

        try {
            if (!this.geminiAi.apiKey) throw new Error("Gemini API Key missing");
            console.log(`Generating ${count} riddles with Gemini AI...`);
            
            const model = this.geminiAi.getGenerativeModel({ 
                model: "gemini-2.0-flash",
                generationConfig: {
                    temperature: 0.85, 
                    topP: 1.0     
                }
            });
            
            const result = await model.generateContent(prompt);
            let responseText = result.response.text();
            
            // Extract from markdown block if present
            const yamlMatch = responseText.match(/```(?:yaml)?\n([\s\S]*?)```/);
            if (yamlMatch) {
                responseText = yamlMatch[1].trim();
            }

            console.log("Gemini successfully generated YAML:", responseText.substring(0, 50) + "...");
            return responseText;

        } catch (e) {
            console.warn("Gemini AI YAML generation failed:", e.message);
            // Fallback to Groq
            try {
                if (!this.groqApiKey) throw new Error("Groq API Key missing also");
                console.log(`Falling back to Groq Llama for ${count} riddles...`);
                
                let responseText = await this.groqTextCompletion(prompt);
                console.log("Raw Groq output snippet:", responseText.substring(0, 100));
                
                // Extract from markdown block if present
                const yamlMatch = responseText.match(/```(?:yaml)?\n([\s\S]*?)```/);
                if (yamlMatch) {
                    console.log("Groq YAML block extracted!");
                    responseText = yamlMatch[1].trim();
                } else {
                    console.log("No markdown code block found in Groq response. Using raw string.");
                }

                return responseText;
            } catch (groqError) {
                console.error("Groq AI YAML generation also failed completely:", groqError.message);
                return null;
            }
        }
    }

    /**
     * Verifies if the image answers the riddle.
     */
    async verifyAnswer(base64Image, riddle) {
        const prompt = `
            You are a playful and witty scavenger hunt judge for the game "Prompt Hunter". 
            Your goal is to be "unpredictably fair":
            - Sometimes accept creative or abstract interpretations if they are clever.
            - Sometimes be strict about exact matches if the riddle implies it.
            - Always return valid JSON ONLY. Do not wrap in markdown tags like \`\`\`json.
            - IMPORTANT: If the user's answer is WRONG, your feedback message must say what they found instead, and give a small hint for the correct answer. (eg. "That is a person, not the answer! Hint: Look for something you can sit on.")
            - If the user's answer is CORRECT, provide a witty, engaging feedback message (1-2 sentences).

            Riddle: "${riddle.text}"
            Target object (approximate): "${riddle.answer}"

            Task: Analyze the provided image. Does it answer the riddle?
            Output strict JSON in this exact format ONLY, nothing else:
            {
              "isCorrect": boolean,
              "feedback": "your witty response or hint here"
            }
        `;

        try {
            if (!this.geminiAi.apiKey) throw new Error("Gemini API Key missing");
            console.log("Attempting verification with Gemini AI...");
            const model = this.geminiAi.getGenerativeModel({ model: "gemini-2.0-flash" });

            const imageParts = [
                {
                    inlineData: {
                        data: base64Image.split(",")[1], // Remove data URL prefix
                        mimeType: "image/jpeg"
                    }
                }
            ];

            const result = await model.generateContent([prompt, ...imageParts]);
            const responseText = result.response.text();
            return this.parseVerificationResponse(responseText);

        } catch { // 'e' was unused
            console.warn("Gemini AI verification failed.");

            console.log("Attempting Groq fallback for verification...");
            return await this.tryGroqFallback(base64Image, prompt);
        }
    }

    /**
     * Fallback using Groq LLM API.
     */
    async tryGroqFallback(base64Image, prompt) {
        try {
            if (!this.groqApiKey) throw new Error("Groq API Key missing");
            const responseText = await this.groqVisionCompletion(base64Image, prompt);
            const result = this.parseVerificationResponse(responseText);
            return new VerificationResult(result.isCorrect, result.feedback + " [via Groq]");
        } catch (e) {
            console.error("Groq fallback failed:", e.message);
            // Mock response if both fail
            console.log("Returning mock verification response");
            return new VerificationResult(
                true,
                "Looks like you found it! (Mock response as AI providers are missing/failing: " + e.message.substring(0, 30) + "...)"
            );
        }
    }

    async groqTextCompletion(prompt) {
        const requestBody = {
            model: "llama-3.3-70b-versatile", // Smartest model for strict formatting
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 1024,
        };

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.groqApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) throw new Error(`Groq Error: ${response.status}`);
        const data = await response.json();
        return data.choices[0].message.content;
    }

    async groqVisionCompletion(base64Image, prompt) {
        // Ensure the base64 string has the correct data URL prefix
        const imageStr = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;

        const requestBody = {
            model: "meta-llama/llama-4-scout-17b-16e-instruct", // Model used in Android app
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: imageStr } }
                    ]
                }
            ],
            temperature: 0.7,
            max_tokens: 1024
        };

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.groqApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) throw new Error(`Groq Error: ${response.status}`);
        const data = await response.json();
        return data.choices[0].message.content;
    }

    extractJson(text) {
        // Find the first { and the last }
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
            return text.substring(start, end + 1);
        }
        return "{}";
    }

    parseVerificationResponse(text) {
        try {
            console.log("Raw AI Response:", text);
            const cleanJson = this.extractJson(text);
            const parsed = JSON.parse(cleanJson);
            return new VerificationResult(parsed.isCorrect || false, parsed.feedback || "I'm speechless!");
        } catch { // 'e' was unused
            console.error("Failed to parse verification response:", text);
            return new VerificationResult(false, "Failed to parse AI response. It didn't speak JSON!");
        }
    }

    parseRiddleResponse(text, category) {
        try {
            const cleanJson = this.extractJson(text);
            const parsed = JSON.parse(cleanJson);
            return new Riddle(
                "id_" + Date.now(),
                parsed.text || "I have legs but cannot walk.",
                parsed.answer || "chair",
                parsed.difficulty || 1,
                category
            );
        } catch {
            return Riddle.SAMPLE;
        }
    }
}

export default new AIManager();
