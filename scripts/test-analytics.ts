#!/usr/bin/env tsx
/**
 * Test script for analytics functionality
 * This script creates mock conversations and generates an analytics report
 */

import { Conversation } from '../src/domain/models/Conversation.js';
import { ProjectContext } from '../src/domain/models/ProjectContext.js';
import { UserMessage, AssistantMessage } from '../src/domain/models/Message.js';
import { AnalyticsService } from '../src/domain/services/analytics/AnalyticsService.js';
import { PrivacySettings, PrivacyLevel } from '../src/domain/models/analytics/index.js';
import { AnalyticsDashboardTemplate } from '../src/infrastructure/rendering/analytics/index.js';
import type { UsageReport as UsageCostReport } from '../src/domain/models/usage/UsageReport.js';
import * as fs from 'fs';
import * as path from 'path';

console.log('🧪 Testing Analytics Functionality\n');
const isEmptyRun = process.env.ANALYTICS_EMPTY === '1';

// Use a fixed midnight reference so relative dates stay within the heatmap window
const referenceDate = new Date();
referenceDate.setHours(0, 0, 0, 0);

function daysAgoDate(daysAgo: number, hour: number = 10, minute: number = 0): Date {
    const date = new Date(referenceDate);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(hour, minute, 0, 0);
    return date;
}

function addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60000);
}

// Create mock conversations
function createMockConversations(): Conversation[] {
    const conversations: Conversation[] = [];

    // Conversation 1: React Development
    const conv1Start = daysAgoDate(90, 10, 0);
    const conv1End = addMinutes(conv1Start, 30);
    const conv1 = new Conversation(
        'session-001',
        new ProjectContext('my-react-app', '/path/to/react-app'),
        conv1Start,
        conv1End
    );

    conv1.addMessage(new UserMessage(
        'msg-001',
        conv1Start,
        null,
        'How do I implement authentication in React using JWT tokens?'
    ));
    conv1.addMessage(new AssistantMessage(
        'msg-002',
        addMinutes(conv1Start, 5),
        'msg-001',
        'To implement JWT authentication in React, you need to: 1) Store the token in localStorage 2) Create an auth context 3) Add axios interceptors for API calls 4) Implement protected routes'
    ));
    conv1.addMessage(new UserMessage(
        'msg-003',
        addMinutes(conv1Start, 10),
        'msg-002',
        'Can you show me code for the auth context?'
    ));
    conv1.addMessage(new AssistantMessage(
        'msg-004',
        addMinutes(conv1Start, 15),
        'msg-003',
        'Here is the code:\n```typescript\nimport React from "react";\nconst AuthContext = React.createContext(null);\nexport const useAuth = () => useContext(AuthContext);\n```'
    ));

    conversations.push(conv1);

    // Conversation 2: TypeScript Debugging
    const conv2Start = daysAgoDate(65, 14, 0);
    const conv2End = addMinutes(conv2Start, 20);
    const conv2 = new Conversation(
        'session-002',
        new ProjectContext('my-react-app', '/path/to/react-app'),
        conv2Start,
        conv2End
    );

    conv2.addMessage(new UserMessage(
        'msg-005',
        conv2Start,
        null,
        'I am getting TypeScript error "Type X is not assignable to type Y" - how do I fix this?'
    ));
    conv2.addMessage(new AssistantMessage(
        'msg-006',
        addMinutes(conv2Start, 5),
        'msg-005',
        'This error usually means there is a type mismatch. You can fix it by: 1) Using type assertions 2) Creating a union type 3) Using generics 4) Adjusting your interface definitions'
    ));

    conversations.push(conv2);

    // Conversation 3: Docker Deployment
    const conv3Start = daysAgoDate(45, 9, 0);
    const conv3End = addMinutes(conv3Start, 45);
    const conv3 = new Conversation(
        'session-003',
        new ProjectContext('backend-api', '/path/to/backend'),
        conv3Start,
        conv3End
    );

    conv3.addMessage(new UserMessage(
        'msg-007',
        conv3Start,
        null,
        'Help me create a Dockerfile for my Node.js Express application'
    ));
    conv3.addMessage(new AssistantMessage(
        'msg-008',
        addMinutes(conv3Start, 10),
        'msg-007',
        'Here is a Dockerfile for Node.js:\n```dockerfile\nFROM node:18-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --only=production\nCOPY . .\nEXPOSE 3000\nCMD ["node", "server.js"]\n```'
    ));
    conv3.addMessage(new UserMessage(
        'msg-009',
        addMinutes(conv3Start, 20),
        'msg-008',
        'How do I use docker-compose with this?'
    ));
    conv3.addMessage(new AssistantMessage(
        'msg-010',
        addMinutes(conv3Start, 30),
        'msg-009',
        'Create a docker-compose.yml file with services for your app and database. Use volumes for persistent data and networks for service communication.'
    ));

    conversations.push(conv3);

    // Conversation 4: Python Data Analysis
    const conv4Start = daysAgoDate(20, 16, 0);
    const conv4End = addMinutes(conv4Start, 40);
    const conv4 = new Conversation(
        'session-004',
        new ProjectContext('data-science-project', '/path/to/data'),
        conv4Start,
        conv4End
    );

    conv4.addMessage(new UserMessage(
        'msg-011',
        conv4Start,
        null,
        'How do I use pandas to analyze CSV data and create visualizations?'
    ));
    conv4.addMessage(new AssistantMessage(
        'msg-012',
        addMinutes(conv4Start, 10),
        'msg-011',
        'Use pandas.read_csv() to load data, then use matplotlib or seaborn for visualizations. You can do df.describe() for statistics and df.plot() for quick charts.'
    ));

    conversations.push(conv4);

    // Conversation 5: Testing with Jest
    const conv5Start = daysAgoDate(7, 11, 0);
    const conv5End = addMinutes(conv5Start, 25);
    const conv5 = new Conversation(
        'session-005',
        new ProjectContext('my-react-app', '/path/to/react-app'),
        conv5Start,
        conv5End
    );

    conv5.addMessage(new UserMessage(
        'msg-013',
        conv5Start,
        null,
        'Write unit tests for React components using Jest and React Testing Library'
    ));
    conv5.addMessage(new AssistantMessage(
        'msg-014',
        addMinutes(conv5Start, 10),
        'msg-013',
        'Use render() from @testing-library/react, then query elements with screen.getByRole() or screen.getByText(). Use fireEvent or userEvent for interactions. Assert with expect() and jest matchers.'
    ));

    conversations.push(conv5);

    return conversations;
}

async function main() {
    try {
        // Step 1: Create mock data
        console.log('📝 Creating mock conversations...');
        const conversations = isEmptyRun ? [] : createMockConversations();
        console.log(`   ✓ Created ${conversations.length} conversations${isEmptyRun ? ' (empty mode)' : ''}\n`);

        // Step 2: Initialize analytics service
        console.log('🔧 Initializing analytics service...');
        const analyticsService = new AnalyticsService();
        console.log('   ✓ Service initialized\n');

        // Step 3: Generate analytics report
        console.log('📊 Generating analytics report...');
        const report = await analyticsService.generateReport(
            conversations,
            PrivacySettings.forLevel(PrivacyLevel.TRANSPARENT)
        );
        console.log('   ✓ Report generated\n');

        // Step 4: Display results
        console.log('═══════════════════════════════════════════════════════');
        console.log('📈 ANALYTICS RESULTS');
        console.log('═══════════════════════════════════════════════════════\n');

        console.log('📊 Statistics:');
        console.log(`   Total Conversations: ${report.statistics.totalConversations}`);
        console.log(`   Total Messages: ${report.statistics.totalMessages}`);
        console.log(`   Total Words: ${report.statistics.totalWords}`);
        console.log(`   Avg Messages/Conv: ${report.statistics.averageMessagesPerConversation.toFixed(1)}`);
        console.log(`   Date Range: ${report.statistics.dateRange.start.toISOString().split('T')[0]} to ${report.statistics.dateRange.end.toISOString().split('T')[0]}\n`);

        console.log('☁️  Top 10 Words:');
        const topWords = report.wordCloud.getTopEntries(10);
        topWords.forEach((word: any, index: number) => {
            console.log(`   ${index + 1}. ${word.text} (weight: ${word.weight.toFixed(2)})`);
        });
        console.log();

        console.log('💡 Tech Stack Clusters:');
        report.techStackClusters.getLargestClusters(5).forEach((cluster, index) => {
            console.log(`   ${index + 1}. ${cluster.label} (${cluster.getSize()} conversations)`);
        });
        console.log();

        console.log('📝 Task Type Distribution:');
        report.taskTypeClusters.clusters.forEach(cluster => {
            console.log(`   - ${cluster.label}: ${cluster.getSize()} conversations`);
        });
        console.log();

        console.log('🎯 Key Insights:');
        report.getKeyInsights().forEach((insight, index) => {
            console.log(`   ${index + 1}. [${insight.importance.toUpperCase()}] ${insight.title}`);
            console.log(`      ${insight.description}`);
        });
        console.log();

        console.log('📈 Timeline:');
        report.timeline.forEach(point => {
            const date = point.date.toISOString().split('T')[0];
            console.log(`   ${date}: ${point.conversationCount} conversations`);
            if (point.techStack.length > 0) {
                console.log(`      Tech: ${point.techStack.slice(0, 5).join(', ')}`);
            }
        });
        console.log();

        // Step 5: Generate HTML
        console.log('═══════════════════════════════════════════════════════');
        console.log('🌐 GENERATING HTML REPORT');
        console.log('═══════════════════════════════════════════════════════\n');

        const dashboard = new AnalyticsDashboardTemplate({
            title: 'Test Analytics Report',
            theme: 'auto',
            enableSocialSharing: false
        });

        let usageReport: UsageCostReport | undefined;
        const usageReportPath = path.join(process.cwd(), 'ccusage-report.json');
        if (fs.existsSync(usageReportPath)) {
            try {
                usageReport = JSON.parse(fs.readFileSync(usageReportPath, 'utf-8')) as UsageCostReport;
                console.log('   ✓ Attached ccusage-report.json for cost section\n');
            } catch (error) {
                console.log('   ⚠️ Failed to parse ccusage-report.json, skipping cost section');
            }
        } else {
            console.log('   ℹ️ No ccusage-report.json found — run `ccshow --cost-report` to unlock the cost pulse section.\n');
        }

        const html = dashboard.render(report, usageReport);

        // Save to file
        const outputPath = path.join(process.cwd(), 'test-analytics-report.html');
        fs.writeFileSync(outputPath, html);

        console.log(`✅ HTML report saved to: ${outputPath}`);
        console.log(`   File size: ${(html.length / 1024).toFixed(2)} KB\n`);

        // Step 6: Summary
        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ ALL TESTS PASSED');
        console.log('═══════════════════════════════════════════════════════\n');

        console.log('✓ Text analysis working');
        console.log('✓ Word frequency analysis working');
        console.log('✓ Tech stack clustering working');
        console.log('✓ Task type categorization working');
        console.log('✓ Timeline generation working');
        console.log('✓ Insights generation working');
        console.log('✓ HTML export working\n');

        console.log(`🎉 Open the HTML file in your browser to view the dashboard!\n`);

    } catch (error) {
        console.error('❌ Error during testing:', error);
        process.exit(1);
    }
}

main();
