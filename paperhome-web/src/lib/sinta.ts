import fs from 'fs';
import path from 'path';

export interface Journal {
    name: string;
    rank: string;
    issn: string;
    publisher: string;
    broad_field: string;
    specific_focus: string[] | string; // Handle legacy string data if any
    avg_processing_time: string;
    url: string;
}

export function getSintaJournals(researchField: string): Journal[] {
    try {
        const filePath = path.join(process.cwd(), 'data', 'master_journals.json');

        if (!fs.existsSync(filePath)) {
            console.warn(`SINTA database not found at ${filePath}`);
            return [];
        }

        const fileContent = fs.readFileSync(filePath, 'utf8');
        const journals: Journal[] = JSON.parse(fileContent);

        if (!researchField) return [];

        const searchTerms = researchField.toLowerCase().split(' ').filter(term => term.length > 3); // Simple keyword extraction if full sentence

        return journals.filter(j => {
            const broad = (j.broad_field || '').toLowerCase();

            let focus = '';
            if (Array.isArray(j.specific_focus)) {
                focus = j.specific_focus.join(' ').toLowerCase();
            } else if (typeof j.specific_focus === 'string') {
                focus = j.specific_focus.toLowerCase();
            }

            const textToSearch = `${broad} ${focus}`;

            // Match if the research field (e.g. "Computer Science") appears in the journal data
            return textToSearch.includes(researchField.toLowerCase());
        }).slice(0, 50); // Limit results
    } catch (error) {
        console.error("Error loading SINTA journals:", error);
        return [];
    }
}
