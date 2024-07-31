import simpleGit, { type SimpleGit } from 'simple-git';
import * as fs from 'fs/promises';
import path from 'path';
import { Client } from '@elastic/elasticsearch';

const client = new Client({
  node:'',
  auth: {
     apiKey: '' 
  }
});

async function processFile(filePath: string, type: string): Promise<void> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');

    const combinedRegex = /(describe\.skip|describe|it\.skip|\bit\b)\s*\(/g;

    let describeSkipCount = 0;
    let describeCount = 0;
    let itSkipCount = 0;
    let itCount = 0;
    let itInDescribeSkipCount = 0;

    let match;
    let describeStack: boolean[] = [];


    while ((match = combinedRegex.exec(content)) !== null) {
      const matchType = match[1];
      const isCurrentDescribeSkipped = describeStack.includes(true);
      switch (matchType) {
        case 'describe.skip':
          describeSkipCount++;
          describeStack.push(true);
          break;
        case 'describe':
          describeCount++;
          describeStack.push(false);
          break;
        case 'it.skip':
          itSkipCount++;
          itCount++;
          if (isCurrentDescribeSkipped) {
            itInDescribeSkipCount++;
          }
          break;
        case 'it':
          itCount++;
          if (isCurrentDescribeSkipped) {
            itSkipCount++;
          }
          break;
      }

      const nextChar = content[combinedRegex.lastIndex];
      if (nextChar === ')') {
        if (describeStack.length > 0) {
          describeStack.pop();
        }
      }
    }

    const cypressTeamRegex =  /e2e\/([^\/]+)/;
    const APITeamRegex =  /test_suites\/([^\/]+)/;

    const regex = type === 'cypress' ? cypressTeamRegex : APITeamRegex

    const teamMatch = filePath.match(regex)
    let team = teamMatch ? teamMatch[1] : null;

    if(team?.match(/detections?_response/)){
      const subTeam = filePath.match(/detections?_response\/([^\/]+)/)
      team = subTeam ? subTeam[1] : null;
    }

    if(team === 'investigation') {
      team = 'investigations';
    }

    if(team === 'rules_management') {
      team = 'rule_management';
    }

    if (team === 'telemetry' || team === 'user_roles') {
      team = 'detection_engine'
    }

    if(itCount > 0) {
        const testData = { 
          "@timestamp": new Date().toISOString(),
          team,
          filePath,
          totalTests: itCount,
          skippedTests: itSkipCount,
          type
        };


        await sendToElasticsearch(testData);
      }

    console.log(`Scanning: ${filePath}`);

  } catch (error) {
    console.error(`Error al procesar archivo ${filePath}: ${error}`);
  }
}

async function sendToElasticsearch(testData: Record<string, any>): Promise<void> {
  try {
    const response = await client.index({
      index: 'skipped-tests',
      body: testData,
    });

    console.log(`Data send to Elasticsearch: ${response}`);
  } catch (error) {
    console.error('There is an error sending the data to Elasticsearch:', error);
  }
}

async function processRepo(repoUrl: string, localPath: string): Promise<void> {
  const git: SimpleGit = simpleGit();

  const toProcess = [{file: 'kibana/x-pack/test/security_solution_cypress/cypress/e2e', type: 'cypress'}, {file: 'kibana/x-pack/test/security_solution_api_integration', type: 'API'}]

  try {
    console.log(`Cloning the ${repoUrl} to ${localPath}...`);
    await git.clone(repoUrl, localPath);

    console.log('Starting the file processing.');

   for(const { file, type } of toProcess) {
      await processDirectory(file, type);
    }
   
  } catch (error) {
    console.error(`Error al clonar o procesar el repositorio: ${error}`);
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
    console.error(`Error al procesar directorio ${directoryPath}: ${error}`);
  }
}


const repoUrl = 'https://github.com/elastic/kibana.git'; 
const localPath = './kibana';
processRepo(repoUrl, localPath);
