const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const OUTPUT_DIR = path.join(__dirname, '../paperhome-web/data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'master_journals.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    try {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        console.log(`Created directory: ${OUTPUT_DIR}`);
    } catch (err) {
        if (err.code !== 'EEXIST') throw err;
        // If it exists now, we're good (race condition with recursive mkdir)
    }
}

function mergeJournals() {
    console.log('Starting journal merge...');

    if (!fs.existsSync(DATA_DIR)) {
        console.error(`Data directory not found: ${DATA_DIR}`);
        process.exit(1);
    }

    const files = fs.readdirSync(DATA_DIR).filter(file => file.endsWith('.json'));
    let allJournals = [];

    console.log(`Found ${files.length} JSON files.`);

    files.forEach(file => {
        const filePath = path.join(DATA_DIR, file);
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const journals = JSON.parse(content);
            if (Array.isArray(journals)) {
                allJournals = allJournals.concat(journals);
            } else {
                console.warn(`Warning: File ${file} does not contain an array.`);
            }
        } catch (error) {
            console.error(`Error reading/parsing ${file}: ${error.message}`);
        }
    });

    console.log(`Merged ${allJournals.length} journals.`);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allJournals, null, 2));
    console.log(`Saved master journal list to ${OUTPUT_FILE}`);
}

mergeJournals();
