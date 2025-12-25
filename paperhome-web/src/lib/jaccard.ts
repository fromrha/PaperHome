// Sophisticated Match Score
export function calculateJaccardSimilarity(targetKeywords: string[], journalScope: string[]): number {
    // 1. Better Normalization: kept minimal space but lowercased
    const normalize = (str: string) => str.toLowerCase().trim().replace(/[^a-z0-9 ]/g, ''); // Keep spaces for multi-word comparison

    const targetSet = targetKeywords.map(normalize).filter(s => s.length > 2); // Filter tiny stopwords
    const scopeSet = journalScope.map(normalize);

    if (targetSet.length === 0 || scopeSet.length === 0) return 0;

    // 2. Soft Intersection (Partial Semantic Match)
    let intersectionScore = 0;

    // We check every target keyword against every scope keyword
    // If there is a "good enough" substring match, we count it.
    targetSet.forEach(target => {
        let bestMatch = 0;
        scopeSet.forEach(scope => {
            // Exact Match
            if (scope === target) {
                bestMatch = 1;
            }
            // Partial Match (e.g. "communication" vs "communication studies")
            else if (scope.includes(target) || target.includes(scope)) {
                bestMatch = Math.max(bestMatch, 0.75); // Partial penalty
            }
            // Very loose partial (word overlap)
            else {
                const targetWords = target.split(' ');
                const scopeWords = scope.split(' ');
                const wordOverlap = targetWords.filter(tw => scopeWords.some(sw => sw.includes(tw) || tw.includes(sw))).length;
                if (wordOverlap > 0) {
                    bestMatch = Math.max(bestMatch, 0.3); // Loose word match
                }
            }
        });
        intersectionScore += bestMatch;
    });

    // 3. Union (Weighted)
    // Conceptually union is roughly (Set A size + Set B size) - Intersection
    // But since we use soft scores, let's simplify to: Score = Intersection / Max(TargetSize, ScopeSize)
    // This rewards "Precision" more than "Recall" or Jaccard
    // Or standard Dice-like: 2 * Intersection / (Size A + Size B)

    const unionSize = targetSet.length + scopeSet.length;
    const similarity = (2 * intersectionScore) / unionSize;

    // Boost factor for high quality exact matches?
    // Let's optimize to return a 0-100 percentage
    return Math.round(Math.min(similarity * 120, 100)); // 1.2x boost to make "good" matches look great (90%+)
}
