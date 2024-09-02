#!/usr/bin/env node

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { CollectionBuilder } from './collection.builder.js';
import { LibConfig } from './models/lib-config.model.js';
import { Client, Databases } from 'node-appwrite';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';

async function initialize(libConfig: LibConfig): Promise<void> {
  try {
    const { output, config, directory } = libConfig;
    const client = new Client();

    // Read the configuration file
    const appwriteConfig = JSON.parse(readFileSync(config, 'utf8'));

    // Set the client configuration and retrieve the collections
    client.setEndpoint(appwriteConfig.endpoint).setProject(appwriteConfig.projectId).setKey(appwriteConfig.apiKey);

    const database = new Databases(client);
    const { collections } = await database.listCollections(appwriteConfig.databaseId);

    // Create the output directory if it doesn't exist
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }

    let content = `import type { Models } from 'appwrite';\n\n`;

    for (const collection of collections) {
      const builder = new CollectionBuilder(collection, collections, libConfig);
      content += await builder.retrieveEnumValues().parseAttributes().build();
    }

    // Write the output to a file
    writeFileSync(`${directory}/${output}`, content);
  } catch (error) {
    console.error('Something went wrong', error);
  }
}

yargs(hideBin(process.argv)).command(
  '$0',
  'Generate TypeScript models from Appwrite collections',
  (yargs) => {
    return yargs
      .usage('Usage: $0 <command> [options]')
      .option('config', {
        alias: 'c',
        type: 'string',
        description: 'The path to the configuration file',
        required: true,
      })
      .option('output', {
        alias: 'o',
        type: 'string',
        description: 'The name of the output file',
        default: 'appwrite.models.d.ts',
      })
      .option('directory', {
        alias: 'd',
        type: 'string',
        description: 'The output directory',
        default: './types',
      })
      .option('enumsType', {
        alias: 'e',
        choices: ['native', 'object'],
        description: 'The type of enums to generate',
        default: 'object',
      });
  },
  (argv) => {
    initialize(argv as any);
  },
).argv;
