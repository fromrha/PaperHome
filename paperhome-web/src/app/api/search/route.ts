import { NextRequest, NextResponse } from 'next/server';
import { getSintaJournals } from '@/lib/sinta';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const { field, keywords } = await req.json();

        if (!field && (!keywords || keywords.length === 0)) {
            return NextResponse.json({ national: [], international: [] });
        }

        // 1. National (SINTA)
        // Use the field to find relevant journals in our local database
        const nationalJournals = getSintaJournals(field);

        // 2. International
        const internationalJournals: any[] = [];
        const keywordQuery = Array.isArray(keywords) ? keywords.join(' ') : keywords;
        const encodedQuery = encodeURIComponent(keywordQuery);

        // --- Crossref Search ---
        try {
            const crRes = await fetch(`https://api.crossref.org/works?query=${encodedQuery}&filter=type:journal-article&rows=5&select=container-title,ISSN,publisher,URL,subject`);
            if (crRes.ok) {
                const crData = await crRes.json();
                if (crData.message?.items) {
                    // Filter distinct journals from articles
                    const seen = new Set();
                    crData.message.items.forEach((item: any) => {
                        const name = item['container-title']?.[0];
                        if (name && !seen.has(name)) {
                            seen.add(name);
                            internationalJournals.push({
                                name: name,
                                rank: 'Scopus/Crossref Indexed',
                                issn: item.ISSN?.[0] || 'N/A',
                                publisher: item.publisher || 'Unknown',
                                broad_field: field, // Inferred
                                specific_focus: item.subject || [],
                                avg_processing_time: 'Varies',
                                url: item.URL,
                                source: 'Crossref'
                            });
                        }
                    });
                }
            }
        } catch (e) {
            console.error("Crossref search failed:", e);
        }

        // --- DOAJ Search ---
        try {
            const doajRes = await fetch(`https://doaj.org/api/v4/search/journals/${encodedQuery}?pageSize=5`);
            if (doajRes.ok) {
                const doajData = await doajRes.json();
                if (doajData.results) {
                    doajData.results.forEach((r: any) => {
                        const name = r.bibjson.title;
                        // Avoid duplicates if possible (though unlikely to overlap perfectly with Crossref in this simple logic)
                        internationalJournals.push({
                            name: name,
                            rank: 'DOAJ Indexed (Open Access)',
                            issn: r.bibjson.eissn || r.bibjson.pissn || 'N/A',
                            publisher: r.bibjson.publisher?.name || 'Unknown',
                            broad_field: field,
                            specific_focus: r.bibjson.subject?.map((s: any) => s.term) || [],
                            avg_processing_time: r.bibjson.average_processing_time || 'Unknown', // DOAJ sometimes has this
                            url: r.bibjson.link?.[0]?.url || `https://doaj.org/toc/${r.bibjson.eissn}`,
                            source: 'DOAJ'
                        });
                    });
                }
            }
        } catch (e) {
            console.error("DOAJ search failed:", e);
        }

        return NextResponse.json({
            national: nationalJournals,
            international: internationalJournals
        });

    } catch (error) {
        console.error("Search API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
