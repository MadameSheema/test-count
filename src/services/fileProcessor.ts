import * as fs from 'fs/promises';
import { initializeCounts, determineTeam, createTestData, TestCounts } from '../utils/helpers';
import { sendToElasticsearch } from './elasticsearchService';


async function processFile(filePath: string, type: string): Promise<void> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const counts = initializeCounts();
    const describeStack: boolean[] = [];

    processContent(content, counts, describeStack);

    const team = determineTeam(filePath, type);

    if (counts.itCount > 0) {
      const testData = createTestData(filePath, team, counts, type);
      await sendToElasticsearch(testData);
    }

    console.log(`Scanning: ${filePath}`);
  } catch (error) {
    console.error(`Error scanning ${filePath}: ${error}`);
  }
}

function processContent(content: string, counts: TestCounts, describeStack: boolean[]): void {
  const combinedRegex = /(describe\.skip|describe|it\.skip|\bit\b)\s*\(/g;
  let match;

  while ((match = combinedRegex.exec(content)) !== null) {
    const matchType = match[1];
    const isCurrentDescribeSkipped = describeStack.includes(true);

    switch (matchType) {
      case 'describe.skip':
        counts.describeSkipCount++;
        describeStack.push(true);
        break;
      case 'describe':
        counts.describeCount++;
        describeStack.push(false);
        break;
      case 'it.skip':
        counts.itSkipCount++;
        counts.itCount++;
        if (isCurrentDescribeSkipped) counts.itInDescribeSkipCount++;
        break;
      case 'it':
        counts.itCount++;
        if (isCurrentDescribeSkipped) counts.itSkipCount++;
        break;
    }

    const nextChar = content[combinedRegex.lastIndex];
    if (nextChar === ')') {
      if (describeStack.length > 0) describeStack.pop();
    }
  }
}

export { processFile };
