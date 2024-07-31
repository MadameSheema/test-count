import {git} from './config/git';
import { processDirectory } from './services/directoryProcessor';

const repoUrl = 'https://github.com/elastic/kibana.git';
const localPath = './kibana';

async function processRepo(repoUrl: string, localPath: string): Promise<void> {
  const directoriesToProcess = [
      { file: 'kibana/x-pack/test/security_solution_cypress/cypress/e2e', type: 'cypress' },
      { file: 'kibana/x-pack/test/security_solution_api_integration', type: 'API' },
      { file: 'kibana/x-pack/plugins/security_solution/public/management/cypress/e2e', type: 'cypress'},
      { file: 'kibana/x-pack/plugins/osquery/cypress/e2e', type: 'cypress'}
  ];

  try {
    console.log(`Cloning the ${repoUrl} to ${localPath}...`);
    //await git.clone(repoUrl, localPath);

    console.log('Starting the file processing.');
    for (const { file, type } of directoriesToProcess) {
      await processDirectory(file, type);
    }
  } catch (error) {
    console.error(`Error cloning the repo: ${error}`);
  }
}

processRepo(repoUrl, localPath);
