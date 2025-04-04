import { LogParser } from '../src/services/LogParser';
import { Rule } from '../src/types/Rule';
import path from 'path';
import fs from 'fs';

describe('LogParser', () => {
    let parser: LogParser;
    const testLogPath = path.join(__dirname, 'test.log');

    const rules: Rule[] = [
        {
            name: 'Error Detection',
            pattern: 'ERROR',
            tag: 'error',
            priority: 'high'
        }
    ];

    beforeEach(() => {
        parser = new LogParser(rules);
        // Create a test log file
        fs.writeFileSync(testLogPath, '[2024-01-01T12:00:00] [ERROR] Test error message\n');
    });

    afterEach(() => {
        // Clean up test file
        if (fs.existsSync(testLogPath)) {
            fs.unlinkSync(testLogPath);
        }
    });

    test('should parse log file and emit matches', (done) => {
        let matchCount = 0;

        parser.on('match', ({ entry, rules }) => {
            matchCount++;
            expect(entry.level).toBe('ERROR');
            expect(entry.message).toBe('Test error message');
            expect(rules).toHaveLength(1);
            expect(rules[0].tag).toBe('error');
        });

        parser.parseFile(testLogPath)
            .then(() => {
                expect(matchCount).toBe(1);
                done();
            })
            .catch(done);
    });
});
