const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const yaml = require('yaml');
const fs = require('fs');
const cors = require('cors');
const { LogParser } = require('./services/LogParser');
const { Aggregator } = require('./services/Aggregator');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
    abortOnLimit: true,
    createParentPath: true,
    preserveExtension: true,
    safeFileNames: true,
    debug: false,
}));
app.use(express.static('static'));

// Load rules from config
const loadRules = () => {
    try {
        console.log('Loading rules...');
        const configPath = path.join(__dirname, '../config/rules.yaml');
        console.log('Rules path:', configPath);
        const configFile = fs.readFileSync(configPath, 'utf8');
        console.log('Rules file content:', configFile);
        const config = yaml.parse(configFile);
        console.log('Parsed rules:', config.rules);
        return config.rules;
    } catch (error) {
        console.error('Error loading rules:', error);
        throw error;
    }
};

// Routes
app.post('/api/analyze', async (req, res) => {
    // Add request logging
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    try {
        console.log('Received analyze request');
        
        if (!req.files || !req.files.logFile) {
            console.error('No file uploaded');
            return res.status(400).json({ error: 'No log file uploaded' });
        }

        const logFile = req.files.logFile;
        console.log('File info:', { name: logFile.name, size: logFile.size });

        // Check file type
        const fileExtension = path.extname(logFile.name).toLowerCase();
        if (!['.log', '.txt'].includes(fileExtension)) {
            console.error('Invalid file type:', fileExtension);
            return res.status(400).json({ error: 'Only .log and .txt files are allowed' });
        }

        // Check file size (already handled by express-fileupload, but double-check)
        if (logFile.size > 50 * 1024 * 1024) {
            console.error('File too large:', logFile.size);
            return res.status(400).json({ error: 'File size must be less than 50MB' });
        }

        const uploadPath = path.join(__dirname, '../uploads', 'temp.log');
        console.log('Upload path:', uploadPath);

        // Ensure uploads directory exists
        const uploadsDir = path.dirname(uploadPath);
        if (!fs.existsSync(uploadsDir)) {
            console.log('Creating uploads directory:', uploadsDir);
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        try {
            // Save uploaded file
            await logFile.mv(uploadPath);
            console.log('File saved successfully');

            // Initialize parser and aggregator
            const rules = loadRules();
            console.log('Loaded rules:', rules);

            const parser = new LogParser(rules);
            const aggregator = new Aggregator();

            // Set up event handlers before parsing
            let matchCount = 0;
            parser.on('match', ({ entry, rules }) => {
                console.log('Found match:', { entry, rules });
                aggregator.processEntry(entry, rules);
                matchCount++;
            });

            parser.on('error', (error) => {
                console.error('Parser error:', error);
            });

            // Process log file
            console.log('Starting to parse file');
            const parseResult = await parser.parseFile(uploadPath);
            console.log('Parse result:', parseResult);

            // Get analysis results
            const results = aggregator.getResults();
            console.log('Analysis results:', results);

            // Clean up
            fs.unlinkSync(uploadPath);
            console.log('Cleaned up temporary file');

            if (matchCount === 0) {
                console.log('No matches found in file');
                return res.status(400).json({ error: 'No analyzable log entries found in file' });
            }

            // Return results
            res.json(results);
        } catch (error) {
            console.error('Error processing file:', error);
            // Clean up on error
            if (fs.existsSync(uploadPath)) {
                fs.unlinkSync(uploadPath);
            }
            throw error;
        }
    } catch (error) {
        console.error('Error processing log file:', error);
        console.error('Stack trace:', error.stack);
        if (error.code === 'ENOENT') {
            res.status(400).json({ error: 'File not found or could not be accessed' });
        } else if (error.message.includes('Invalid log format')) {
            res.status(400).json({ error: 'Invalid log file format' });
        } else {
            res.status(500).json({ error: `Failed to process log file: ${error.message}` });
        }
    }
});

// Start server
// Export for Vercel
module.exports = app;

// Start server if running directly
if (require.main === module) {
    const port = process.env.PORT || 8080;
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}
