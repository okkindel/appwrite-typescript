import { AppwriteAttribute } from './models/appwrite.models.js';
import { LibConfig } from './models/lib-config.model.js';
import { Models } from 'node-appwrite';
import { fileURLToPath } from 'url';
import { renderFile } from 'ejs';
import * as path from 'path';

interface AttributePayload {
  key: string;
  optional: boolean;
  array: boolean;
  type: string;
}

export class CollectionBuilder {
  private readonly _originalCollection: Models.Collection;
  private readonly _config: LibConfig;

  private _enums: Record<string, string[]> = {};
  private _attributes: AttributePayload[] = [];

  constructor(collection: Models.Collection, config: LibConfig) {
    this._originalCollection = collection;
    this._config = config;
  }

  public retrieveEnumValues(): CollectionBuilder {
    for (const field of this._originalCollection.attributes as unknown as AppwriteAttribute[]) {
      if (field.format === 'enum') {
        const typeName = this._toCamelCase(`${this._originalCollection.name}_${field.key}`);
        this._enums[typeName] = field.elements!;
      }
    }
    return this;
  }

  public parseAttributes(): CollectionBuilder {
    for (const field of this._originalCollection.attributes as unknown as AppwriteAttribute[]) {
      if (field.format === 'enum') {
        this._attributes.push(this._parseEnum(field));
      } else if (field.type === 'relationship') {
        this._attributes.push(this._parseRelationship(field));
      } else {
        this._attributes.push(this._parsePrimitive(field));
      }
    }
    return this;
  }

  public async build(): Promise<string> {
    const interfaceName = this._toCamelCase(this._originalCollection.name);
    let content = ``;

    for (const name in this._enums) {
      const templateFile =
        (this._config.enumsType === 'native' && './templates/enum-native.template.ejs') ||
        (this._config.enumsType === 'object' && './templates/enum-object.template.ejs');
      content += await renderFile(path.join(fileURLToPath(path.dirname(import.meta.url)), templateFile), {
        elements: this._enums[name],
        name: name,
      });
      content += '\n';
    }

    const templateFile = './templates/interface.template.ejs';
    content += await renderFile(path.join(fileURLToPath(path.dirname(import.meta.url)), templateFile), {
      attributes: this._attributes,
      name: interfaceName,
    });
    content += '\n';

    return content;
  }

  private _parseRelationship(field: AppwriteAttribute): AttributePayload {
    const typeName = this._toCamelCase(field.relatedCollection!);
    switch (field.relationType) {
      case 'oneToMany':
      case 'manyToMany':
        return { key: field.key, type: typeName, optional: !field.required, array: true };
      case 'oneToOne':
      case 'manyToOne':
        return { key: field.key, type: typeName, optional: !field.required, array: false };
      default:
        return { key: field.key, type: 'unknown', optional: !field.required, array: false };
    }
  }

  private _parseEnum(field: AppwriteAttribute): AttributePayload {
    const typeName = this._toCamelCase(`${this._originalCollection.name}_${field.key}`);
    return { key: field.key, type: typeName, optional: !field.required, array: field.array };
  }

  private _parsePrimitive(field: AppwriteAttribute): AttributePayload {
    // prettier-ignore
    const typeName = (type: string): string => {
      switch (type) {
        case "string":    return "string";
        case "integer":   return "number";
        case "boolean":   return "boolean";
        case "double":    return "number";
        case "datetime":  return "Date";
        default:          return "unknown";
      }
    };
    return { key: field.key, type: typeName(field.type), optional: !field.required, array: field.array };
  }

  private _toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  }
}
