import React from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';
import { WordCloudData } from '../../../../domain/models/analytics/WordCloudData.js';

export interface TerminalWordCloudProps {
    wordCloud: WordCloudData;
    limit?: number;
}

/**
 * Terminal-friendly word cloud component using horizontal bars
 */
export const TerminalWordCloud: React.FC<TerminalWordCloudProps> = ({ wordCloud, limit = 20 }) => {
    const topWords = wordCloud.getTopEntries(limit) as any[];

    if (topWords.length === 0) {
        return (
            <Box flexDirection="column">
                <Text color="yellow">No word data available</Text>
            </Box>
        );
    }

    // Calculate max value for scaling bars
    const maxValue = Math.max(...topWords.map(w => w.value || w.frequency || w.occurrences || 1));
    const maxBarWidth = 40;

    return (
        <Box flexDirection="column">
            <Text bold color="cyan">Word Cloud (Top {limit})</Text>
            <Text color="gray">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</Text>
            <Box flexDirection="column" marginTop={1}>
                {topWords.map((entry, index) => {
                    const value = entry.value || entry.frequency || entry.occurrences || 0;
                    const text = entry.text || entry.concept || '';
                    const barWidth = Math.max(1, Math.floor((value / maxValue) * maxBarWidth));

                    // Color scheme based on rank
                    let barColor = 'blue';
                    if (index < 3) barColor = 'green';
                    else if (index < 10) barColor = 'cyan';

                    const bar = '█'.repeat(barWidth);

                    return (
                        <Box key={index} flexDirection="row" gap={1}>
                            <Text color="white" dimColor>{String(index + 1).padStart(2, ' ')}.</Text>
                            <Text color={barColor} bold>{text.padEnd(20)}</Text>
                            <Text color={barColor}>{bar}</Text>
                            <Text color="gray" dimColor> {value}</Text>
                        </Box>
                    );
                })}
            </Box>
            <Box marginTop={1}>
                <Text color="gray" dimColor>
                    Vocabulary richness: {(wordCloud.getVocabularyRichness() * 100).toFixed(1)}% |
                    Total: {wordCloud.totalTokens} | Unique: {wordCloud.uniqueTokens}
                </Text>
            </Box>
        </Box>
    );
};
