export function calculateJaccardSimilarity(targetKeywords: string[], journalScope: string[]): number {
    // Normalize logic
    const normalize = (str: string) => str.toLowerCase().trim().replace(/[^a-z0-9]/g, '');

    const targetSet = new Set(targetKeywords.map(normalize));
    const scopeSet = new Set(journalScope.map(normalize));

    // Handle empty cases to avoid division by zero
    if (targetSet.size === 0 || scopeSet.size === 0) return 0;

    // Intersection
    let intersection = 0;
    targetSet.forEach(item => {
        if (scopeSet.has(item)) intersection++;
    });

    // Union
    const union = new Set([...targetSet, ...scopeSet]).size;

    // Calculate score (0 to 1)
    const score = intersection / union;

    // Return percentage rounded to integer
    return Math.round(score * 100);
}
