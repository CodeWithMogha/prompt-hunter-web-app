import fs from 'fs';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Parse .env manually
const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const geminiKey = env.VITE_GEMINI_API_KEY;
const groqKey = env.VITE_GROQ_API_KEY;

const prompt = `You are a creative puzzle master designing a real-world scavenger hunt for a mobile app.
Your task is to generate EXACTLY 2 unique riddles.

RULES:
1. The target 'answer' for each riddle MUST be one of these exact supported objects: person, bicycle, car.
2. NEGATIVE CONSTRAINT: DO NOT use any of these items as the target answer, as they were recently used: []. If you do, the game breaks.
3. The riddle should describe the object cleverly without saying its name directly.

Return ONLY a valid YAML format representing a list of riddles. EXACTLY this format, nothing else (no markdown blocks):
riddles:
  - text: "Your clever riddle here"
    targetLabel: "exact item name from supported list"
  - text: "Another riddle"
    targetLabel: "another item"`;

async function testGemini() {
    if (!geminiKey) return console.log("No Gemini key in .env");
    try {
        const ai = new GoogleGenerativeAI(geminiKey);
        const model = ai.getGenerativeModel({ model: "gemini-2.0-flash", generationConfig: { temperature: 0.85, topP: 1.0 } });
        const result = await model.generateContent(prompt);
        console.log("Gemini ResponseText:", result.response.text());
    } catch (e) {
        console.error("Gemini Error:", e.message);
    }
}

async function testGroq() {
    if (!groqKey) return console.log("No Groq key in .env");
    try {
        const requestBody = {
            model: "llama3-8b-8192", 
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 1024,
        };
        // Node 18+ has fetch natively
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });
        const data = await response.json();
        console.log("Groq Response Data:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Groq Network Error:", e.message);
    }
}

async function main() {
    console.log("Testing Gemini API...");
    await testGemini();
    console.log("\\n-------------------\\nTesting Groq API...");
    await testGroq();
}

main();
