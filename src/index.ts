import { existsSync, mkdirSync, readFileSync } from "fs";
import { CollectionBuilder } from "./collection.builder";
import { Client, Databases } from "node-appwrite";

interface Config {
  confFile?: string;
  outDir?: string;
}

async function initialize(config: Config): Promise<void> {
  try {
    const { confFile = "./config.json", outDir = "./types" } = config;
    const client = new Client();

    // Read the configuration file
    const confData = JSON.parse(readFileSync(confFile, "utf8"));

    // Set the client configuration and retrieve the collections
    client
      .setEndpoint(confData.endpoint)
      .setProject(confData.projectId)
      .setKey(confData.apiKey);

    const database = new Databases(client);
    const { collections } = await database.listCollections(confData.databaseId);

    // Create the output directory if it doesn't exist
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }

    for (const collection of collections) {
      const builder = new CollectionBuilder(collection);
      builder.retrieveEnumValues().parseAttributes().build();
    }
  } catch (error) {
    console.error("Something went wrong", error);
  }
}

initialize({});
