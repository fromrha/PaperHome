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

        // --- 1. National (SINTA) ---
        const rawNationalJournals = getSintaJournals(field);

        // Calculate Score for National
        const nationalJournals = rawNationalJournals.map(j => {
            const scope = Array.isArray(j.specific_focus) ? j.specific_focus : [j.specific_focus as string];

            // Calculate Keyword Match
            let matchScore = calculateJaccardSimilarity(keywordsArray, scope);

            // Baseline Boost: If journal has no specific scope but matches broad field, give it 50%
            // Or if score is low but field matches, boost it.
            // Check loosely if 'broad_field' contains our 'field' or vice versa
            const isFieldMatch = j.broad_field.toLowerCase().includes(field.toLowerCase()) ||
                field.toLowerCase().includes(j.broad_field.toLowerCase());

            if (isFieldMatch) {
                // If Jaccard is 0 (no specific keywords match), give meaningful baseline (e.g. 50%)
                // If Jaccard > 0, give small boost (e.g. +20)
                if (matchScore === 0) matchScore = 50;
                else matchScore = Math.min(matchScore + 20, 100);
            }

            return { ...j, matchScore };
        }).sort((a, b) => b.matchScore - a.matchScore);


        // --- 2. International (Elsevier Scopus) ---
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const internationalJournals: any[] = [];
        const apiKey = process.env.ELSEVIER_API_KEY;

        if (apiKey) {
            // Refine Query: Include Field to ensure relevance (e.g. "Communication" AND ("keyword" OR "keyword"))
            // Limiting keywords to top 3 to prevent query explosion
            const topKeywords = keywordsArray.slice(0, 3).join('" OR "');
            const keywordQuery = `"${topKeywords}"`;

            // Search Query: (Subject(Field) OR TitleAbsKey(Field)) AND TitleAbsKey(Keywords)
            // This forces the Field to be present, avoiding "Waste Management" showing up for "Communication" just because of one keyword.
            const fieldQuery = `"${field}"`;
            const finalQuery = `TITLE-ABS-KEY(${fieldQuery}) AND TITLE-ABS-KEY(${keywordQuery}) AND SRCTYPE(j)`;

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

                                    // Subject Areas
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    const subjectAreas = entry['subject-area']?.map((s: any) => s['$']) || [];

                                    // Calculate Match Score
                                    let matchScore = calculateJaccardSimilarity(keywordsArray, subjectAreas);

                                    // Apply Baseline Boost for International as well
                                    // Check if Subject Areas contain the Field
                                    const isFieldInScope = subjectAreas.some((s: string) =>
                                        s.toLowerCase().includes(field.toLowerCase()) ||
                                        field.toLowerCase().includes(s.toLowerCase())
                                    );

                                    if (isFieldInScope) {
                                        if (matchScore === 0) matchScore = 40; // Conservative baseline
                                        else matchScore = Math.min(matchScore + 20, 100);
                                    }

                                    // Filter out purely irrelevant (0 score and no field match)
                                    // if (matchScore === 0 && !isFieldInScope) continue; 

                                    // Journal Link
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    const linkObj = entry.link?.find((l: any) => l['@ref'] === 'scopus-source');
                                    const url = linkObj ? linkObj['@href'] : `https://www.scopus.com/sourceid/${entry['source-id']}`;

                                    internationalJournals.push({
                                        name: entry['dc:title'],
                                        rank: `CiteScore: ${citeScore}`,
                                        issn: issn,
                                        publisher: entry['dc:publisher'] || 'Unknown',
                                        broad_field: field, // Use analyzed field
                                        specific_focus: subjectAreas,
                                        avg_processing_time: 'Varies',
                                        url: url,
                                        source: 'Scopus',
                                        matchScore: matchScore,
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
