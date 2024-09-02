export interface AppwriteAttribute {
  key: string;
  type:
    | "string"
    | "integer"
    | "boolean"
    | "double"
    | "boolean"
    | "datetime"
    | "relationship";
  status: "available" | "processing" | "deleting" | "stuck" | "failed";
  error: string;
  required: boolean;
  array: boolean;
  size?: number;
  min?: number;
  max?: number;
  elements?: string[];
  relatedCollection?: string;
  relationType?: "oneToOne" | "oneToMany" | "manyToOne" | "manyToMany";
  format?: "enum" | "email" | "url";
}
