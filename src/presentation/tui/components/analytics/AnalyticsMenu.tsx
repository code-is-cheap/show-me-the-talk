import React from 'react';
import { Box, Text } from 'ink';

export interface AnalyticsMenuProps {
    selectedOption: string;
}

/**
 * Analytics menu component
 */
export const AnalyticsMenu: React.FC<AnalyticsMenuProps> = ({ selectedOption }) => {
    const options = [
        { key: 'w', label: 'Word Cloud', icon: '☁️' },
        { key: 'c', label: 'Clusters', icon: '🔧' },
        { key: 't', label: 'Timeline', icon: '📅' },
        { key: 'i', label: 'Insights', icon: '💡' },
        { key: 'e', label: 'Export HTML', icon: '📄' },
        { key: 'b', label: 'Back', icon: '◀️' }
    ];

    return (
        <Box flexDirection="column">
            <Box borderStyle="single" borderColor="blue">
                <Text bold color="blue"> Analytics Dashboard </Text>
            </Box>
            <Box flexDirection="column" marginTop={1}>
                {options.map((option) => {
                    const isSelected = selectedOption === option.key;
                    return (
                        <Text
                            key={option.key}
                            color={isSelected ? 'black' : 'white'}
                            backgroundColor={isSelected ? 'cyan' : undefined}
                            bold={isSelected}
                        >
                            {isSelected ? '▶ ' : '  '}{option.icon} [{option.key}] {option.label}
                        </Text>
                    );
                })}
            </Box>
            <Box marginTop={1} borderStyle="single" borderColor="gray">
                <Text color="gray"> w/c/t/i:view | e:export | b:back | q:quit </Text>
            </Box>
        </Box>
    );
};
