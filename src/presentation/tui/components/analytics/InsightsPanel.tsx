import React from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';
import { AnalyticsInsight } from '../../../../domain/models/analytics/AnalyticsReport.js';

export interface InsightsPanelProps {
    insights: AnalyticsInsight[];
}

/**
 * Terminal-friendly insights display panel
 */
export const InsightsPanel: React.FC<InsightsPanelProps> = ({ insights }) => {
    if (insights.length === 0) {
        return (
            <Box flexDirection="column">
                <Text color="yellow">No insights available</Text>
            </Box>
        );
    }

    const getInsightIcon = (type: string): string => {
        switch (type) {
            case 'observation': return '👁️';
            case 'recommendation': return '💡';
            case 'trend': return '📈';
            default: return '•';
        }
    };

    const getImportanceColor = (importance: string): 'red' | 'yellow' | 'gray' => {
        switch (importance) {
            case 'high': return 'red';
            case 'medium': return 'yellow';
            case 'low': return 'gray';
            default: return 'gray';
        }
    };

    // Group by importance
    const highPriority = insights.filter(i => i.importance === 'high');
    const mediumPriority = insights.filter(i => i.importance === 'medium');
    const lowPriority = insights.filter(i => i.importance === 'low');

    const renderInsightGroup = (title: string, insightList: AnalyticsInsight[], color: 'red' | 'yellow' | 'gray') => {
        if (insightList.length === 0) return null;

        return (
            <Box flexDirection="column" marginBottom={1}>
                <Text bold color={color}>{title} ({insightList.length})</Text>
                <Text color="gray">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</Text>
                <Box flexDirection="column" marginTop={1}>
                    {insightList.map((insight, index) => {
                        const icon = getInsightIcon(insight.type);

                        return (
                            <Box key={index} flexDirection="column" marginBottom={1}>
                                <Box flexDirection="row" gap={1}>
                                    <Text>{icon}</Text>
                                    <Text color="white" bold>{insight.title}</Text>
                                </Box>
                                <Box marginLeft={3}>
                                    <Text color="gray">{insight.description}</Text>
                                </Box>
                                {insight.evidence.length > 0 && (
                                    <Box marginLeft={3}>
                                        <Text color={color} dimColor>
                                            Evidence: {insight.evidence.slice(0, 2).join(', ')}
                                        </Text>
                                    </Box>
                                )}
                            </Box>
                        );
                    })}
                </Box>
            </Box>
        );
    };

    return (
        <Box flexDirection="column">
            <Text bold color="cyan">AI-Generated Insights</Text>
            <Box height={1} />
            {renderInsightGroup('🔴 High Priority', highPriority, 'red')}
            {renderInsightGroup('🟡 Medium Priority', mediumPriority, 'yellow')}
            {renderInsightGroup('⚪ Low Priority', lowPriority, 'gray')}
            <Box marginTop={1}>
                <Text color="gray" dimColor>
                    Total: {insights.length} insights | Based on conversation patterns and content analysis
                </Text>
            </Box>
        </Box>
    );
};
