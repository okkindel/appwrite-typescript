import { renderFile } from "ejs";
import { Models } from "node-appwrite";

interface AttributePayload {
  key: string;
  optional: boolean;
  array: boolean;
  type: string;
}

export class CollectionBuilder {
  private originalCollection: Models.Collection;
  private enums: Record<string, string[]> = {};
  private attributes: AttributePayload[] = [];

  constructor(collection: Models.Collection) {
    this.originalCollection = collection;
  }

  public retrieveEnumValues(): CollectionBuilder {
    for (const field of this.originalCollection
      .attributes as unknown as AppwriteAttribute[]) {
      if (field.format === "enum") {
        const typeName = this._toCamelCase(
          `${this.originalCollection.name}_${field.key}`
        );

        this.enums[typeName] = field.elements!;
      }
    }
    return this;
  }

  public parseAttributes(): CollectionBuilder {
    for (const field of this.originalCollection
      .attributes as unknown as AppwriteAttribute[]) {
      if (field.format === "enum") {
        this.attributes.push(this._parseEnum(field));
      } else if (field.type === "relationship") {
        this.attributes.push(this._parseRelationship(field));
      } else {
        this.attributes.push(this._parsePrimitive(field));
      }
    }

    return this;
  }

  public async build(): Promise<string> {
    const interfaceName = this._toCamelCase(this.originalCollection.name);
    let content = ``;

    for (const name in this.enums) {
      content += await renderFile("./templates/enum.template.ejs", {
        name,
        elements: this.enums[name],
      });
      content += "\n";
    }

    content += await renderFile("./templates/interface.template.ejs", {
      name: interfaceName,
      attributes: this.attributes,
    });
    content += "\n";

    return content;
  }

  private _parseRelationship(field: AppwriteAttribute): AttributePayload {
    const typeName = this._toCamelCase(field.relatedCollection!);

    switch (field.relationType) {
      case "oneToOne":
      case "manyToOne":
        return {
          key: field.key,
          type: typeName,
          optional: !field.required,
          array: false,
        };
      case "oneToMany":
      case "manyToMany":
        return {
          key: field.key,
          type: typeName,
          optional: !field.required,
          array: true,
        };
      default:
        return {
          key: field.key,
          type: "unknown",
          optional: !field.required,
          array: false,
        };
    }
  }

  private _parseEnum(field: AppwriteAttribute): AttributePayload {
    const typeName = this._toCamelCase(
      `${this.originalCollection.name}_${field.key}`
    );

    return {
      key: field.key,
      type: typeName,
      optional: !field.required,
      array: field.array,
    };
  }

  private _parsePrimitive(field: AppwriteAttribute): AttributePayload {
    const typeName = (type: string): string => {
      switch (type) {
        case "string":
          return "string";
        case "integer":
          return "number";
        case "boolean":
          return "boolean";
        case "double":
          return "number";
        case "datetime":
          return "Date";
        default:
          return "unknown";
      }
    };

    return {
      key: field.key,
      type: typeName(field.type),
      optional: !field.required,
      array: field.array,
    };
  }

  private _toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  }
}
