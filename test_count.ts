const fs = require("fs");
const axios = require("axios");
//const { Client } = require('@elastic/elasticsearch');

// Configura tu cliente de Elasticsearch
// const client = new Client({ node: process.env.ELASTICSEARCH_NODE });

const owner = process.argv[2];
const repo = process.argv[3];
const path = process.argv[4];
const team = process.argv[5];
const tags = process.argv.slice(6); // Pasar tags adicionales como argumentos

/*
if (!owner || !repo || !path || !team) {
  console.error('Uso: node count-tests-from-github.js <owner> <repo> <path> <team> [tags]');
  process.exit(1);
} */

async function fetchFilesFromGithub() {
  //const url = `https://api.github.com/repos/elastic/kibana/contents/x-pack/test/security_solution_cypress/cypress/e2e/investigations/dasbhoards`;
  const url = `https://api.github.com/repos/elastic/kibana/contents/x-pack/test/security_solution_cypress/cypress/e2e/investigations`;
  const response = await axios.get(url);

  console.log(response.data);
  return response.data;
}

async function fetchFileContentFromGithub(url: string) {
  const response = await axios.get(url);
  return response.data as string;
}

async function countTestsAndSendToElasticsearch() {
  const files = await fetchFilesFromGithub();

  console.log(files);

  const describeSkipRegex = /describe\.skip\s*\(/g;
  const itRegex = /it\s*\(/g;

  let describeCount = 0;
  let itCount = 0;

  let match;
  for (const file of files) {
    if (file.type === "file" && file.name.endsWith(".ts")) {
      const content = await fetchFileContentFromGithub(file.download_url);

      // Encontrar todos los describe.skip
      while ((match = describeSkipRegex.exec(content)) !== null) {
        describeCount++;
        const start = match.index;
        // Encontrar todos los it dentro del describe.skip
        while ((match = itRegex.exec(content)) !== null) {
          const itStart = match.index;
          if (itStart > start) {
            itCount++;
          } else {
            // Si encontramos un it antes de encontrar un nuevo describe.skip, salimos del bucle interior
            break;
          }
        }
      }
    }
  }

  // Mostrar resultados
  console.log(`  Describes con .skip: ${describeCount}`);
  console.log(`  Tests (it.) dentro de describe.skip: ${itCount}`);
  console.log();

  /*
    const result = await client.index({
      index: 'test-results',
      document: {
        team: team,
        timestamp: new Date(),
        testCount: testCount,
        skippedTestCount: skippedTestCount,
        taggedTestCount: taggedTestCount,
        tags: tags,
      }
    });

    console.log('Resultados enviados a Elasticsearch:', result); */
}

countTestsAndSendToElasticsearch();
