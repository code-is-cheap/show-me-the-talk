import React from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';
import { TimelineDataPoint } from '../../../../domain/models/analytics/AnalyticsReport.js';

export interface TimelineViewProps {
    timeline: TimelineDataPoint[];
}

/**
 * Terminal-friendly timeline evolution view
 */
export const TimelineView: React.FC<TimelineViewProps> = ({ timeline }) => {
    if (timeline.length === 0) {
        return (
            <Box flexDirection="column">
                <Text color="yellow">No timeline data available</Text>
            </Box>
        );
    }

    const formatMonth = (date: Date): string => {
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    };

    return (
        <Box flexDirection="column">
            <Text bold color="cyan">Timeline Evolution</Text>
            <Text color="gray">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</Text>
            <Box flexDirection="column" marginTop={1}>
                {timeline.map((point, index) => {
                    const month = formatMonth(point.date);
                    const convCount = point.conversationCount;
                    const msgCount = point.messageCount;

                    // Create bar chart for activity
                    const maxConvs = Math.max(...timeline.map(p => p.conversationCount));
                    const barWidth = Math.max(1, Math.floor((convCount / maxConvs) * 30));
                    const bar = '▓'.repeat(barWidth);

                    return (
                        <Box key={index} flexDirection="column" marginBottom={1}>
                            <Box flexDirection="row" gap={1}>
                                <Text color="white" bold>{month.padEnd(12)}</Text>
                                <Text color="green">{bar}</Text>
                                <Text color="gray" dimColor>
                                    {convCount} convs, {msgCount} msgs
                                </Text>
                            </Box>
                            {point.techStack.length > 0 && (
                                <Box marginLeft={14}>
                                    <Text color="cyan" dimColor>
                                        Tech: {point.techStack.slice(0, 5).join(', ')}
                                    </Text>
                                </Box>
                            )}
                            {point.keywords.length > 0 && (
                                <Box marginLeft={14}>
                                    <Text color="yellow" dimColor>
                                        Focus: {point.keywords.slice(0, 3).join(', ')}
                                    </Text>
                                </Box>
                            )}
                        </Box>
                    );
                })}
            </Box>
            <Box marginTop={1}>
                <Text color="gray" dimColor>
                    Showing {timeline.length} time periods with activity
                </Text>
            </Box>
        </Box>
    );
};
