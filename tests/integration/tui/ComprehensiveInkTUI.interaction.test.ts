// @vitest-environment node
import React from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { render } from 'ink-testing-library';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComprehensiveInkTUI } from '@/presentation/tui/ComprehensiveInkTUI';
import { buildConversation } from '../../utils/conversationFactory';
import { RawConversationEntry } from '@/domain/models/RawConversationEntry';

const waitForFrame = async (
  lastFrame: () => string,
  predicate: (frame: string) => boolean,
  label: string
): Promise<string> => {
  let latestFrame = '';
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const frame = lastFrame();
    if (frame) {
      latestFrame = frame;
    }
    if (frame && predicate(frame)) {
      return frame;
    }
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error(`Timed out waiting for frame: ${label}\nLast frame:\n${latestFrame}`);
};

const normalizeFrame = (frame: string): string => {
  return frame
    .replace(/\d{1,2}:\d{2}:\d{2}\s?(AM|PM)?/g, '<time>')
    .replace(/\d{1,2}:\d{2}\s?(AM|PM)?/g, '<time>')
    .replace(/Loaded \d+ conversations? from \d+ projects?/g, 'Loaded <n> conversations from <n> projects')
    .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\b/g, '<iso-time>');
};

const findTimelineHeaderRow = (frame: string): number => {
  return frame.split('\n').findIndex(line => line.includes('Timeline ['));
};

const setTerminalSize = (columns: number, rows: number): void => {
  Object.defineProperty(process.stdout, 'columns', { value: columns, configurable: true });
  Object.defineProperty(process.stdout, 'rows', { value: rows, configurable: true });
};

describe('ComprehensiveInkTUI interactions (snapshot regression)', () => {
  const originalColumns = process.stdout.columns;
  const originalRows = process.stdout.rows;

  beforeEach(() => {
    process.env.TZ = 'UTC';
    setTerminalSize(100, 32);
  });

  afterEach(() => {
    setTerminalSize(originalColumns || 100, originalRows || 32);
    vi.restoreAllMocks();
  });

  it('renders project → conversation → thread flow with timeline interactions', async () => {
    const conversation = buildConversation('session-1', 'ragame', [
      { role: 'user', content: 'First question' },
      { role: 'assistant', content: 'First answer' },
      { role: 'user', content: 'Second question' },
      { role: 'assistant', content: 'Second answer' }
    ]);

    const baseTime = new Date('2025-01-01T09:00:00.000Z');
    const rawEntries: RawConversationEntry[] = [
      { id: 'r1', type: 'system', timestamp: baseTime, content: 'System start' },
      { id: 'r2', type: 'user', timestamp: new Date(baseTime.getTime() + 60_000), content: 'First question' },
      { id: 'r3', type: 'assistant', timestamp: new Date(baseTime.getTime() + 120_000), content: 'First answer' },
      { id: 'r4', type: 'summary', timestamp: new Date(baseTime.getTime() + 180_000), content: 'Checkpoint Alpha' },
      { id: 'r5', type: 'user', timestamp: new Date(baseTime.getTime() + 240_000), content: 'Second question' },
      { id: 'r6', type: 'assistant', timestamp: new Date(baseTime.getTime() + 300_000), content: 'Second answer' },
      {
        id: 'r7',
        type: 'file_snapshot',
        timestamp: new Date(baseTime.getTime() + 360_000),
        content: '',
        metadata: { files: ['src/index.ts', 'README.md'] }
      }
    ];

    rawEntries.forEach(entry => conversation.addRawEntry(entry));

    const repo = {
      findAll: vi.fn().mockResolvedValue([conversation]),
      getAllProjects: vi.fn().mockResolvedValue([conversation.projectContext])
    };
    const conversationService = { conversationRepository: repo } as any;

    const tui = new ComprehensiveInkTUI(conversationService, { claudeDir: '/tmp', debug: false });
    const App = tui.createInkApp(React, { Box, Text, useInput, useApp });

    const { lastFrame, stdin, unmount } = render(React.createElement(App));

    const projectFrame = await waitForFrame(lastFrame, frame => frame.includes('Project Selection'), 'project list');
    expect(normalizeFrame(projectFrame)).toMatchSnapshot('project-list');

    // Wait for useInput to set up event listeners (useLayoutEffect runs after paint)
    await new Promise(resolve => setTimeout(resolve, 50));

    stdin.write('\r');
    await new Promise(resolve => setTimeout(resolve, 50));
    const conversationFrame = await waitForFrame(
      lastFrame,
      frame => frame.includes(' - 1 conversations ') && !frame.includes('Project Selection'),
      'conversation list'
    );
    expect(normalizeFrame(conversationFrame)).toMatchSnapshot('conversation-list');

    stdin.write('\r');
    await new Promise(resolve => setTimeout(resolve, 30));
    stdin.write('\r');
    const messageFrame = await waitForFrame(lastFrame, frame => frame.includes('CLEAN'), 'message detail');
    expect(normalizeFrame(messageFrame)).toMatchSnapshot('message-detail-single');

    stdin.write('v');
    await new Promise(resolve => setTimeout(resolve, 30));
    const threadFrame = await waitForFrame(lastFrame, frame => frame.includes('THREAD'), 'thread view');
    expect(normalizeFrame(threadFrame)).toMatchSnapshot('thread-view');
    const timelineHeaderRow = findTimelineHeaderRow(threadFrame);
    expect(timelineHeaderRow).toBeGreaterThanOrEqual(0);

    stdin.write('r');
    await new Promise(resolve => setTimeout(resolve, 30));
    const rawThreadFrame = await waitForFrame(lastFrame, frame => frame.includes('RAW'), 'raw thread view');
    expect(normalizeFrame(rawThreadFrame)).toMatchSnapshot('thread-view-raw');
    expect(findTimelineHeaderRow(rawThreadFrame)).toBe(timelineHeaderRow);

    stdin.write('t');
    await new Promise(resolve => setTimeout(resolve, 30));
    const timelineFocusFrame = await waitForFrame(lastFrame, frame => frame.includes('Timeline focus'), 'timeline focus');
    expect(normalizeFrame(timelineFocusFrame)).toMatchSnapshot('timeline-focus');
    expect(findTimelineHeaderRow(timelineFocusFrame)).toBe(timelineHeaderRow);

    stdin.write('j');
    await new Promise(resolve => setTimeout(resolve, 30));
    const timelineSelectFrame = await waitForFrame(lastFrame, frame => frame.includes('Timeline focus'), 'timeline selection');
    expect(normalizeFrame(timelineSelectFrame)).toMatchSnapshot('timeline-selection');
    expect(findTimelineHeaderRow(timelineSelectFrame)).toBe(timelineHeaderRow);

    stdin.write('\r');
    await new Promise(resolve => setTimeout(resolve, 30));
    const jumpedFrame = await waitForFrame(lastFrame, frame => frame.includes('Jumped to') || frame.includes('Switched'), 'timeline jump');
    expect(normalizeFrame(jumpedFrame)).toMatchSnapshot('timeline-jump');
    expect(findTimelineHeaderRow(jumpedFrame)).toBe(timelineHeaderRow);

    stdin.write('t');
    await waitForFrame(lastFrame, frame => frame.includes('Mode: READING'), 'exit timeline focus');

    stdin.write('p');
    await new Promise(resolve => setTimeout(resolve, 30));
    const checkpointOnlyFrame = await waitForFrame(lastFrame, frame => frame.includes('Checkpoint-only'), 'checkpoint-only');
    expect(normalizeFrame(checkpointOnlyFrame)).toMatchSnapshot('checkpoint-only');
    expect(findTimelineHeaderRow(checkpointOnlyFrame)).toBe(timelineHeaderRow);

    unmount();
  });
});
