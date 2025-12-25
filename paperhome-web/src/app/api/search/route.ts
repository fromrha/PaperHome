import { NextRequest, NextResponse } from 'next/server';
import { getSintaJournals } from '@/lib/sinta';
import { calculateJaccardSimilarity } from '@/lib/jaccard';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const { field, keywords } = await req.json();

        if (!field && (!keywords || keywords.length === 0)) {
            return NextResponse.json({ national: [], international: [] });
        }

        const keywordsArray = Array.isArray(keywords) ? keywords : [keywords];

        // 1. National (SINTA)
        const rawNationalJournals = getSintaJournals(field);

        // Calculate Jaccard Score for National
        const nationalJournals = rawNationalJournals.map(j => {
            const scope = Array.isArray(j.specific_focus) ? j.specific_focus : [j.specific_focus as string];
            const matchScore = calculateJaccardSimilarity(keywordsArray, scope);
            // Ensure legacy SINTA journals without rich scope don't get 0 if they match broad field
            // Boost score if broad field matches? Maybe simpler to just rely on keywords relative to scope.
            // If scope is empty, let's look at broad field as a "keyword"
            if (scope.length === 0 || (scope.length === 1 && scope[0] === '')) {
                const broadScore = calculateJaccardSimilarity(keywordsArray, [j.broad_field]);
                return { ...j, matchScore: broadScore > 0 ? broadScore : 40 }; // Base score fallback
            }
            return { ...j, matchScore };
        }).sort((a, b) => b.matchScore - a.matchScore);


        // 2. International (Elsevier Scopus)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const internationalJournals: any[] = [];
        const apiKey = process.env.ELSEVIER_API_KEY;

        if (apiKey) {
            const keywordQuery = keywordsArray.join(' OR ');
            const encodedQuery = encodeURIComponent(`TITLE-ABS-KEY(${keywordQuery}) AND SRCTYPE(j)`);

            try {
                // A. Search Scopus
                const scopusRes = await fetch(`https://api.elsevier.com/content/search/scopus?query=${encodedQuery}&count=8&sort=citedby-count&apiKey=${apiKey}`, {
                    headers: { 'Accept': 'application/json' }
                });

                if (scopusRes.ok) {
                    const scopusData = await scopusRes.json();
                    const entries = scopusData['search-results']?.entry || [];

                    // Extract distinct ISSNs to fetch details
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

                    // Limit to top 5 distinct journals to avoid rate limits/latency
                    const topIssns = journalsToFetch.slice(0, 5);

                    // B. Fetch Serial Title Details (Metrics)
                    for (const issn of topIssns) {
                        try {
                            const serialRes = await fetch(`https://api.elsevier.com/content/serial/title/issn/${issn}?apiKey=${apiKey}`, {
                                headers: { 'Accept': 'application/json' }
                            });

                            if (serialRes.ok) {
                                const serialData = await serialRes.json();
                                const entry = serialData['serial-metadata-response']?.entry?.[0]; // Usually returned as array

                                if (entry) {
                                    // Extract Metrics
                                    const citeScore = entry['citeScoreYearInfoList']?.citeScoreCurrentMetric || 'N/A';
                                    const sjr = entry['SJRList']?.SJR?.[0]?.['$'] || 'N/A'; // Scimago Journal Rank

                                    // Infer Quartile from Percentile (roughly) if available, or just omit if simpler
                                    // Scopus doesn't give "Q1" directly easily without more parsing.
                                    // Let's use CiteScore as primary rank indicator for now.

                                    // Subject Areas for Scope
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    const subjectAreas = entry['subject-area']?.map((s: any) => s['$']) || [];

                                    // Calculate Jaccard Score
                                    const matchScore = calculateJaccardSimilarity(keywordsArray, subjectAreas);

                                    // Journal Link: Use "scopus-source" link type for Journal Homepage/Profile
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    const linkObj = entry.link?.find((l: any) => l['@ref'] === 'scopus-source');
                                    const url = linkObj ? linkObj['@href'] : `https://www.scopus.com/sourceid/${entry['source-id']}`;

                                    internationalJournals.push({
                                        name: entry['dc:title'],
                                        rank: `CiteScore: ${citeScore}`, // Display CiteScore as "Rank"
                                        issn: issn,
                                        publisher: entry['dc:publisher'] || 'Unknown',
                                        broad_field: field,
                                        specific_focus: subjectAreas,
                                        avg_processing_time: 'Varies', // Not provided by Scopus
                                        url: url,
                                        source: 'Scopus',
                                        matchScore: matchScore, // Jaccard
                                        citeScore: citeScore,
                                        sjr: sjr
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

        // Fallback or sort international
        internationalJournals.sort((a, b) => b.matchScore - a.matchScore);

        return NextResponse.json({
            national: nationalJournals,
            international: internationalJournals
        });

    } catch (error) {
        console.error("Search API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
