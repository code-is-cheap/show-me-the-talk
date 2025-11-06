import React from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';
import { ClusterCollection, ClusterType } from '../../../../domain/models/analytics/SemanticCluster.js';

export interface ClustersSummaryProps {
    techStackClusters: ClusterCollection;
    taskTypeClusters: ClusterCollection;
    topicClusters: ClusterCollection;
}

/**
 * Terminal-friendly clusters summary component
 */
export const ClustersSummary: React.FC<ClustersSummaryProps> = ({
    techStackClusters,
    taskTypeClusters,
    topicClusters
}) => {
    const renderClusterSection = (title: string, collection: ClusterCollection, icon: string, color: 'cyan' | 'green' | 'yellow') => {
        const topClusters = collection.getLargestClusters(5);

        return (
            <Box flexDirection="column" marginBottom={1}>
                <Text bold color={color}>{icon} {title}</Text>
                <Text color="gray">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</Text>
                {topClusters.length === 0 ? (
                    <Text color="gray" dimColor>  No clusters found</Text>
                ) : (
                    <Box flexDirection="column" marginTop={1}>
                        {topClusters.map((cluster, index) => {
                            const size = cluster.getSize();
                            const percentage = ((size / collection.totalConversations) * 100).toFixed(1);

                            return (
                                <Box key={index} flexDirection="column" marginBottom={1}>
                                    <Box flexDirection="row">
                                        <Text color="white">{String(index + 1).padStart(2, ' ')}. </Text>
                                        <Text color={color} bold>{cluster.label}</Text>
                                        <Text color="gray" dimColor> ({size} convs, {percentage}%)</Text>
                                    </Box>
                                    <Box marginLeft={4}>
                                        <Text color="gray" dimColor>
                                            Keywords: {cluster.getTopKeywords(5).join(', ')}
                                        </Text>
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                )}
            </Box>
        );
    };

    return (
        <Box flexDirection="column">
            <Text bold color="cyan">Conversation Clusters Analysis</Text>
            <Box height={1} />
            {renderClusterSection('Tech Stack', techStackClusters, '🔧', 'cyan')}
            {renderClusterSection('Task Types', taskTypeClusters, '📋', 'green')}
            {renderClusterSection('Topics', topicClusters, '💡', 'yellow')}
        </Box>
    );
};
