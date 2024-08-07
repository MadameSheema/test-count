import simpleGit, { type SimpleGit } from 'simple-git';
import * as fs from 'fs/promises';
import path from 'path';
import { Client } from '@elastic/elasticsearch';

const client = new Client({
  node: '',
  auth: {
    apiKey: ''
  }
});

const CYPRESS_TEAM_REGEX = /e2e\/([^\/]+)/;
const API_TEAM_REGEX = /test_suites\/([^\/]+)/;
const DETECTIONS_RESPONSE_REGEX = /detections?_response\/([^\/]+)/;
const DETECTIONS_REGEX = /detections?_response/;

interface TestCounts {
  describeSkipCount: number;
  describeCount: number;
  itSkipCount: number;
  itCount: number;
  itInDescribeSkipCount: number;
}

async function processFile(filePath: string, type: string): Promise<void> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const counts: TestCounts = initializeCounts();
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

function initializeCounts(): TestCounts {
  return {
    describeSkipCount: 0,
    describeCount: 0,
    itSkipCount: 0,
    itCount: 0,
    itInDescribeSkipCount: 0
  };
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

function determineTeam(filePath: string, type: string): string | null {
  const regex = type === 'cypress' ? CYPRESS_TEAM_REGEX : API_TEAM_REGEX;
  let teamMatch = filePath.match(regex);
  let team = teamMatch ? teamMatch[1] : null;

  if (team?.match(DETECTIONS_REGEX)) {
    const subTeamMatch = filePath.match(DETECTIONS_RESPONSE_REGEX);
    team = subTeamMatch ? subTeamMatch[1] : null;
  }

  const teamMap: Record<string, string> = {
    investigation: 'investigations',
    rules_management: 'rule_management',
    telemetry: 'detection_engine',
    user_roles: 'detection_engine'
  };

  return team ? teamMap[team] || team : null;
}

function createTestData(filePath: string, team: string | null, counts: TestCounts, type: string): Record<string, any> {
  return {
    "@timestamp": new Date().toISOString(),
    team,
    filePath,
    totalTests: counts.itCount,
    skippedTests: counts.itSkipCount,
    type
  };
}

async function sendToElasticsearch(testData: Record<string, any>): Promise<void> {
  try {
    const response = await client.index({
      index: 'skipped-tests',
      body: testData
    });

    console.log(`Data sent to Elasticsearch: ${response}`);
  } catch (error) {
    console.error('Error sending the data to Elasticsearch:', error);
  }
}

async function processRepo(repoUrl: string, localPath: string): Promise<void> {
  const git: SimpleGit = simpleGit();

  const directoriesToProcess = [
    { file: 'kibana/x-pack/test/security_solution_cypress/cypress/e2e', type: 'cypress' },
    { file: 'kibana/x-pack/test/security_solution_api_integration', type: 'API' }
  ];

  try {
    console.log(`Cloning the ${repoUrl} to ${localPath}...`);
    await git.clone(repoUrl, localPath);

    console.log('Starting the file processing.');
    for (const { file, type } of directoriesToProcess) {
      await processDirectory(file, type);
    }

  } catch (error) {
    console.error(`Error clonning the repo: ${error}`);
  }
}

async function processDirectory(directoryPath: string, type: string): Promise<void> {
  try {
    const files = await fs.readdir(directoryPath);
    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      const fileStat = await fs.stat(filePath);
      if (fileStat.isDirectory()) {
        await processDirectory(filePath, type);
      } else {
        await processFile(filePath, type);
      }
    }
  } catch (error) {
    console.error(`Error al processing the directory ${directoryPath}: ${error}`);
  }
}

const repoUrl = 'https://github.com/elastic/kibana.git';
const localPath = './kibana';
processRepo(repoUrl, localPath);
