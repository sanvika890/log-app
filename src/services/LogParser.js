const { EventEmitter } = require('events');
const fs = require('fs');
const readline = require('readline');

class LogParser extends EventEmitter {
    constructor(rules) {
        super();
        this.rules = rules;
    }

    async parseFile(filePath) {
        console.log('Starting to parse file:', filePath);
        let lineCount = 0;
        let matchCount = 0;
        let errorCount = 0;
        
        try {
            console.log('Creating read stream...');
            const fileStream = fs.createReadStream(filePath);
            
            fileStream.on('error', (error) => {
                console.error('File stream error:', error);
                throw error;
            });

            console.log('Creating readline interface...');
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });

            console.log('Starting to read lines...');
            for await (const line of rl) {
                lineCount++;
                try {
                    if (line.trim()) { // Skip empty lines
                        const result = this.parseLine(line);
                        if (result) matchCount++;
                    }
                } catch (error) {
                    console.error(`Error processing line ${lineCount}:`, error);
                    errorCount++;
                }
            }
            
            console.log(`Processed ${lineCount} lines, found ${matchCount} matches, encountered ${errorCount} errors`);
            return { lineCount, matchCount, errorCount };
        } catch (error) {
            console.error('Error in parseFile:', error);
            throw error;
        }
    }

    parseLine(line) {
        try {
            const entry = this.parseLogEntry(line);
            
            // Skip lines that couldn't be parsed
            if (!entry) {
                console.log('Could not parse line:', line);
                return false;
            }
            
            const matchingRules = this.rules.filter(rule => {
                try {
                    const pattern = new RegExp(rule.pattern, 'i');
                    const matches = pattern.test(line);
                    if (matches) {
                        console.log(`Rule '${rule.name}' matched line:`, line);
                    }
                    return matches;
                } catch (error) {
                    console.error(`Invalid rule pattern: ${rule.pattern}`, error);
                    return false;
                }
            });

            if (matchingRules.length > 0) {
                this.emit('match', { entry, rules: matchingRules });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error parsing line:', line, error);
            this.emit('error', { line, error });
            return false;
        }
    }

    parseLogEntry(line) {
        console.log('Parsing line:', line);
        
        // Try various timestamp formats
        let timestampMatch = 
            // YYYY-MM-DD HH:mm:ss,SSS
            line.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d{3})/) ||
            // [YYYY-MM-DD HH:mm:ss]
            line.match(/\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\]/) ||
            // YYYY-MM-DD HH:mm:ss
            line.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/) ||
            // Timestamp in brackets
            line.match(/\[([^\]]+)\]/);

        // Try various log level formats
        let levelMatch = 
            // INFO|ERROR|WARN|DEBUG with optional brackets
            line.match(/[\[\s](INFO|ERROR|WARN(?:ING)?|DEBUG|FAILURE|FAILED)[\]\s]/i) ||
            // Look for common level-indicating words
            line.match(/\b(ERROR|FAILED|FAILURE|WARN(?:ING)?|INFO|DEBUG)\b/i) ||
            // Look for error-indicating phrases
            (line.toLowerCase().includes('error') || line.toLowerCase().includes('failed') || 
             line.toLowerCase().includes('failure')) ? ['', 'ERROR'] : null;
        
        // If we can't find a level but have a timestamp, assume it's INFO
        if (timestampMatch && !levelMatch) {
            console.log('Found timestamp but no level, assuming INFO');
            levelMatch = ['INFO', 'INFO'];
        }
        
        // If we can't find either, try to guess based on content
        if (!timestampMatch && !levelMatch) {
            console.log('No timestamp or level match found, trying to guess...');
            if (line.toLowerCase().includes('error') || 
                line.toLowerCase().includes('failed') || 
                line.toLowerCase().includes('failure')) {
                levelMatch = ['ERROR', 'ERROR'];
            } else if (line.toLowerCase().includes('warn')) {
                levelMatch = ['WARN', 'WARN'];
            } else if (line.trim()) { // If line is not empty
                levelMatch = ['INFO', 'INFO'];
            } else {
                return null; // Skip empty lines
            }
            timestampMatch = ['now', new Date().toISOString()];
        }
        
        console.log('Found matches:', { timestampMatch, levelMatch });

        // Extract message
        let message = line;
        if (timestampMatch) {
            message = message.replace(timestampMatch[0], '').trim();
        }
        if (levelMatch) {
            message = message.replace(levelMatch[0], '').trim();
        }

        // Clean up message
        message = message.replace(/^[-:\s]+/, '').trim();

        // Map log levels to standard format
        const levelMap = {
            'FAILURE': 'ERROR',
            'FAILED': 'ERROR',
            'WARNING': 'WARN'
        };

        const level = levelMatch ? 
            (levelMap[levelMatch[1].toUpperCase()] || levelMatch[1].toUpperCase()) : 
            'INFO';

        return {
            timestamp: timestampMatch ? (() => {
                try {
                    const date = new Date(timestampMatch[1]);
                    if (isNaN(date.getTime())) {
                        console.warn('Invalid timestamp:', timestampMatch[1]);
                        return new Date();
                    }
                    return date;
                } catch (error) {
                    console.warn('Error parsing timestamp:', error);
                    return new Date();
                }
            })() : new Date(),
            level: level,
            message: message || line,
            raw: line
        };
    }
}

module.exports = { LogParser };
