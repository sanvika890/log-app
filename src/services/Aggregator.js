class Aggregator {
    constructor() {
        this.totalLines = 0;
        this.timeRange = {
            start: null,
            end: null
        };
        this.levelCounts = {};
        this.eventCounts = {};
    }

    processEntry(entry, rules) {
        try {
            this.totalLines++;

            // Update time range if timestamp is valid
            if (entry.timestamp && !isNaN(entry.timestamp.getTime())) {
                if (!this.timeRange.start || entry.timestamp < this.timeRange.start) {
                    this.timeRange.start = entry.timestamp;
                }
                if (!this.timeRange.end || entry.timestamp > this.timeRange.end) {
                    this.timeRange.end = entry.timestamp;
                }
            }

            // Update level counts
            const level = entry.level || 'UNKNOWN';
            this.levelCounts[level] = (this.levelCounts[level] || 0) + 1;

            // Update event counts based on matching rules
            if (Array.isArray(rules)) {
                rules.forEach(rule => {
                    if (rule && rule.tag) {
                        this.eventCounts[rule.tag] = (this.eventCounts[rule.tag] || 0) + 1;
                    }
                });
            }
        } catch (error) {
            console.error('Error processing entry:', error);
        }
    }

    getResults() {
        return {
            totalLines: this.totalLines,
            timeRange: {
                start: this.timeRange.start ? this.timeRange.start.toISOString() : null,
                end: this.timeRange.end ? this.timeRange.end.toISOString() : null
            },
            levelCounts: this.levelCounts,
            eventCounts: this.eventCounts
        };
    }
}

module.exports = { Aggregator };
