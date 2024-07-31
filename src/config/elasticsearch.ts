import { Client } from '@elastic/elasticsearch';
import * as dotenv from 'dotenv';

dotenv.config();

export const client = new Client({
  node: process.env.ELASTICSEARCH_NODE || '',
  auth: {
    apiKey: process.env.ELASTICSEARCH_API_KEY || ''
  }
});