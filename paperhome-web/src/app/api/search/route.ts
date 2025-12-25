import { NextRequest, NextResponse } from 'next/server';
import { getSintaJournals } from '@/lib/sinta';
import { calculateJaccardSimilarity } from '@/lib/jaccard';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const { field, broad_field, keywords, suggested_keywords } = await req.json();

        if (!field && (!keywords || keywords.length === 0)) {
            return NextResponse.json({ national: [], international: [] });
        }

        const primaryKeywords = Array.isArray(keywords) ? keywords : [keywords];
        const secondaryKeywords = Array.isArray(suggested_keywords) ? suggested_keywords : [];

        // Combined keywords for SCORING (Primary + Suggested)
        // This allows broad terms like "Islamic Education" to match journals even if user only had "Pesantren"
        const scoringKeywords = [...primaryKeywords, ...secondaryKeywords];

        // --- 1. National (SINTA) ---
        const rawNationalJournals = getSintaJournals(field);

        // Calculate Score for National
        const nationalJournals = rawNationalJournals.map(j => {
            const scope = Array.isArray(j.specific_focus) ? j.specific_focus : [j.specific_focus as string];

            // Use EXTENDED scoring keywords for the match
            let matchScore = calculateJaccardSimilarity(scoringKeywords, scope);

            // Baseline Boost:
            // 1. Specific Field Match (existing)
            const isFieldMatch = j.broad_field.toLowerCase().includes(field.toLowerCase()) ||
                field.toLowerCase().includes(j.broad_field.toLowerCase());

            // 2. Broad Field Match (new fallback)
            // If specific field defined in paper fails, check if broad_field (from Gemini) matches journal's broad_field
            const isBroadFieldMatch = broad_field && j.broad_field &&
                (j.broad_field.toLowerCase().includes(broad_field.toLowerCase()) ||
                    broad_field.toLowerCase().includes(j.broad_field.toLowerCase()));

            if (isFieldMatch) {
                if (matchScore === 0) matchScore = 50;
                else matchScore = Math.min(matchScore + 20, 100);
            } else if (isBroadFieldMatch) {
                // Weaker boost for just broad field match (e.g. Social Sciences)
                if (matchScore === 0) matchScore = 30; // At least show it
            }

            return { ...j, matchScore };
        }).sort((a, b) => b.matchScore - a.matchScore);


        // --- 2. International (Elsevier Scopus) ---
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const internationalJournals: any[] = [];
        const apiKey = process.env.ELSEVIER_API_KEY;
        let finalQuery = ''; // Lifted scope for logging

        if (apiKey) {
            // QUERY Strategy:
            // 1. Primary Keywords (Specific)
            // 2. Suggested Keywords (Broader) - Use slice to keep query length manageable
            const searchTerms = [...primaryKeywords, ...(secondaryKeywords.slice(0, 3))];

            // Join with OR to broaden the net. If matches ANY keyword, it's a candidate.
            const keywordsString = searchTerms.map(k => `"${k}"`).join(' OR ');

            // Field Query: Specific OR Broad
            // Ensure we catch journals that might be categorized generally or specifically
            let fieldQuery = `"${field}"`;
            if (broad_field) {
                fieldQuery += ` OR "${broad_field}"`;
            }

            // Final Query: (Title/Abs/Key(Fields) AND Title/Abs/Key(Keywords)) AND SourceType(Journal)
            finalQuery = `TITLE-ABS-KEY(${fieldQuery}) AND TITLE-ABS-KEY(${keywordsString}) AND SRCTYPE(j)`;

            const encodedQuery = encodeURIComponent(finalQuery);

            try {
                // A. Search Scopus
                const scopusRes = await fetch(`https://api.elsevier.com/content/search/scopus?query=${encodedQuery}&count=8&sort=relevancy&apiKey=${apiKey}`, {
                    headers: { 'Accept': 'application/json' }
                });

                if (scopusRes.ok) {
                    const scopusData = await scopusRes.json();
                    const entries = scopusData['search-results']?.entry || [];

                    // Extract distinct ISSNs
                    const seenIssns = new Set<string>();
                    const journalsToFetch: string[] = [];

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    entries.forEach((entry: any) => {
                        const issn = entry['prism:issn'];
                        if (issn && !seenIssns.has(issn)) {
                            seenIssns.add(issn);
                            journalsToFetch.push(issn);
                        }
                    });

                    // Limit to top 5 distinct types
                    const topIssns = journalsToFetch.slice(0, 5);

                    // B. Fetch Serial Title Details (Metrics)
                    for (const issn of topIssns) {
                        try {
                            const serialRes = await fetch(`https://api.elsevier.com/content/serial/title/issn/${issn}?apiKey=${apiKey}`, {
                                headers: { 'Accept': 'application/json' }
                            });

                            if (serialRes.ok) {
                                const serialData = await serialRes.json();
                                const entry = serialData['serial-metadata-response']?.entry?.[0];

                                if (entry) {
                                    // Extract Metrics
                                    const citeScore = entry['citeScoreYearInfoList']?.citeScoreCurrentMetric || 0;
                                    const sjr = entry['SJRList']?.SJR?.[0]?.['$'] || 0;

                                    // Infer Quartile from CiteScore (Heuristic)
                                    const cs = Number(citeScore) || 0;
                                    let quartile = '';
                                    if (cs >= 4.0) quartile = 'Q1';
                                    else if (cs >= 2.0) quartile = 'Q2';
                                    else if (cs >= 1.0) quartile = 'Q3';
                                    else quartile = 'Q4';

                                    // Subject Areas
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    const subjectAreas = entry['subject-area']?.map((s: any) => s['$']) || [];

                                    // Calculate Match Score using EXTENDED keywords
                                    let matchScore = calculateJaccardSimilarity(scoringKeywords, subjectAreas);

                                    // Apply Baseline Boost for International
                                    const isFieldInScope = subjectAreas.some((s: string) =>
                                        s.toLowerCase().includes(field.toLowerCase()) ||
                                        field.toLowerCase().includes(s.toLowerCase())
                                    );

                                    // Check if BROAD field is in scope (e.g. Social Sciences)
                                    const isBroadInScope = broad_field ? subjectAreas.some((s: string) =>
                                        s.toLowerCase().includes(broad_field.toLowerCase())
                                    ) : false;

                                    if (isFieldInScope) {
                                        if (matchScore === 0) matchScore = 40;
                                        else matchScore = Math.min(matchScore + 20, 100);
                                    } else if (isBroadInScope) {
                                        if (matchScore === 0) matchScore = 20; // Minimal relevance
                                    }

                                    // Journal Link
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    const linkObj = entry.link?.find((l: any) => l['@ref'] === 'scopus-source');
                                    const url = linkObj ? linkObj['@href'] : `https://www.scopus.com/sourceid/${entry['source-id']}`;

                                    internationalJournals.push({
                                        name: entry['dc:title'],
                                        rank: `${quartile} • CiteScore: ${citeScore}`,
                                        issn: issn,
                                        publisher: entry['dc:publisher'] || 'Unknown',
                                        broad_field: field,
                                        specific_focus: subjectAreas,
                                        avg_processing_time: 'Varies',
                                        url: url,
                                        source: 'Scopus',
                                        matchScore: matchScore,
                                        citeScore: citeScore,
                                        sjr: sjr,
                                        quartile: quartile
                                    });
                                }
                            }
                        } catch (err) {
                            console.error(`Failed to fetch details for ISSN ${issn}`, err);
                        }
                    }
                }
            } catch (e) {
                console.error("Elsevier Scopus search failed:", e);
            }
        }

        if (internationalJournals.length === 0 && apiKey) {
            console.warn("International Search returned 0 results. Query was:", finalQuery || "No Query");
        }

        // Sort: Match Score DESC, then CiteScore DESC
        internationalJournals.sort((a, b) => {
            if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
            return (Number(b.citeScore) || 0) - (Number(a.citeScore) || 0);
        });

        return NextResponse.json({
            national: nationalJournals,
            international: internationalJournals
        });

    } catch (error) {
        console.error("Search API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
