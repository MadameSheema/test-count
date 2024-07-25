import simpleGit, { type SimpleGit } from 'simple-git';
import * as fs from 'fs/promises';
import path from 'path';

async function processFile(filePath: string): Promise<void> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');

    const combinedRegex = /(describe\.skip|describe|it\.skip|it)\s*\(/g;

    let describeSkipCount = 0;
    let describeCount = 0;
    let itSkipCount = 0;
    let itCount = 0;
    let itInDescribeSkipCount = 0;

    let match;
    let describeStack = []; 
    let currentDescribeIsSkipped = false;

    while ((match = combinedRegex.exec(content)) !== null) {
      const matchType = match[1];
      switch (matchType) {
        case 'describe.skip':
          describeSkipCount++;
          describeStack.push('skip');
          currentDescribeIsSkipped = true;
          break;
        case 'describe':
          describeCount++;
          describeStack.push('normal');
          currentDescribeIsSkipped = false;
          break;
        case 'it.skip':
          itSkipCount++;
          itCount++;
          if (describeStack.includes('skip')) {
            itInDescribeSkipCount++;
          }
          break;
        case 'it':
          itCount++;
          if (describeStack.includes('skip')) {
            itInDescribeSkipCount++;
          }
          break;
      }

      const nextChar = content[combinedRegex.lastIndex];
      if (nextChar === ')') {
        if (describeStack.length > 0) {
          describeStack.pop();
        }
        currentDescribeIsSkipped = describeStack.includes('skip');
      }
    }

    console.log(`File: ${filePath}`);
    console.log('Total number of describes:', describeCount + describeSkipCount);
    console.log('Total number of tests:', itCount);
    console.log('Total number of skipped tests:', itSkipCount);
    console.log('Number of "it" inside "describe.skip":', itInDescribeSkipCount);

  } catch (error) {
    console.error(`Error al procesar archivo ${filePath}: ${error}`);
  }
}

async function processRepo(repoUrl: string, localPath: string): Promise<void> {
  const git: SimpleGit = simpleGit();

  try {
    console.log(`Clonando repositorio desde ${repoUrl} a ${localPath}...`);
    // await git.clone(repoUrl, localPath);

    // Procesar cada archivo de tests dentro del repositorio clonado
    console.log('Procesando archivos de tests...');
    await processDirectory(localPath);
  } catch (error) {
    console.error(`Error al clonar o procesar el repositorio: ${error}`);
  }
}

async function processDirectory(directoryPath: string): Promise<void> {
  try {
    const files = await fs.readdir(directoryPath);
    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      const fileStat = await fs.stat(filePath);
      if (fileStat.isDirectory()) {
        await processDirectory(filePath);
      } else {
        // Si es un archivo, procesarlo
        if (file.endsWith('.cy.ts')) { // Asumiendo que son archivos de tests de Cypress
          await processFile(filePath);
        }
      }
    }
  } catch (error) {
    console.error(`Error al procesar directorio ${directoryPath}: ${error}`);
  }
}

// URL del repositorio Git y ruta local donde se clonará
const repoUrl = 'https://github.com/elastic/kibana.git'; // Cambiar por la URL de tu repositorio
//const localPath = './kibana'; // Cambiar por la ruta local donde quieres clonar el repositorio
//const localPath = './kibana/x-pack/test/security_solution_cypress/cypress/e2e/detection_response/detection_engine/detection_alerts/assignments'

//const localPath = './kibana/x-pack/test/security_solution_cypress/cypress/e2e/detection_response/detection_engine/detection_alerts/enrichments'

const localPath = "./kibana/x-pack/test/security_solution_cypress/cypress/e2e/detection_response/detection_engine/detection_alerts/status"

// Llamar a la función principal para procesar el repositorio Git
processRepo(repoUrl, localPath);
