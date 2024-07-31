import { client } from '../config/elasticsearch';

export const sendToElasticsearch = async (testData: Record<string, any>): Promise<void> => {
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
