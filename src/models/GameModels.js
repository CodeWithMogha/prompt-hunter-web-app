/**
 * Represents a riddle that the user must solve  
 */
export class Riddle {
    constructor(id, text, answer, difficulty, category, acceptedAnswers = [], createdAt = Date.now()) {
        this.id = id;
        this.text = text;
        this.answer = answer;
        this.difficulty = difficulty;
        this.category = category;
        this.acceptedAnswers = acceptedAnswers;
        this.createdAt = createdAt;
    }

    static SAMPLE = new Riddle(
        "sample_1",
        "I have legs but cannot walk. What am I?",
        "chair",
        1,
        "furniture",
        ["chair", "table", "bench"]
    );
}

/**
 * Verification result class
 */
export class VerificationResult {
    constructor(isCorrect, feedback) {
        this.isCorrect = isCorrect;
        this.feedback = feedback;
    }

    static ERROR = new VerificationResult(false, "An error occurred during verification.");
}

/**
 * Hunter rank tiers
 */
export const HunterRanks = {
    NOVICE: { displayName: "Novice Hunter", minXp: 0, emoji: "🌱" },
    AMATEUR: { displayName: "Amateur Hunter", minXp: 100, emoji: "🎯" },
    SKILLED: { displayName: "Skilled Hunter", minXp: 300, emoji: "⭐" },
    EXPERT: { displayName: "Expert Hunter", minXp: 600, emoji: "🔥" },
    MASTER: { displayName: "Master Hunter", minXp: 1000, emoji: "💎" },
    LEGEND: { displayName: "Legendary Hunter", minXp: 2000, emoji: "👑" }
};

export const getRankFromXp = (xp) => {
    const ranks = Object.values(HunterRanks).sort((a, b) => b.minXp - a.minXp);
    return ranks.find(r => xp >= r.minXp) || HunterRanks.NOVICE;
};

export class Hunter {
    constructor({ id = "", displayName = "Hunter", xp = 0, currentStreak = 0, longestStreak = 0, totalSolves = 0, lastHuntDate = null }) {
        this.id = id;
        this.displayName = displayName;
        this.xp = xp;
        this.currentStreak = currentStreak;
        this.longestStreak = longestStreak;
        this.totalSolves = totalSolves;
        this.lastHuntDate = lastHuntDate;
    }

    get rank() {
        return getRankFromXp(this.xp);
    }

    xpToNextRank() {
        const ranks = Object.values(HunterRanks).sort((a, b) => a.minXp - b.minXp);
        const currentRankIdx = ranks.findIndex(r => r.minXp === this.rank.minXp);
        if (currentRankIdx >= ranks.length - 1) return 0; // Max rank
        return ranks[currentRankIdx + 1].minXp - this.xp;
    }

    progressToNextRank() {
        const ranks = Object.values(HunterRanks).sort((a, b) => a.minXp - b.minXp);
        const currentRankIdx = ranks.findIndex(r => r.minXp === this.rank.minXp);
        if (currentRankIdx >= ranks.length - 1) return 1; // Max rank

        const currentRankXp = this.rank.minXp;
        const nextRank = ranks[currentRankIdx + 1];

        const xpInCurrentRank = this.xp - currentRankXp;
        const xpNeededForNext = nextRank.minXp - currentRankXp;
        return Math.max(0, Math.min(1, xpInCurrentRank / xpNeededForNext));
    }
}
