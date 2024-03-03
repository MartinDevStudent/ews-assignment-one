import Ajv from "ajv";
import schema from "../shared/types.schema.json";

export function isValid(typeName: string, objectToValidate: any) {
  const ajv = new Ajv({ coerceTypes: true });

  const isValid = ajv.compile(schema.definitions[typeName] || {});

  return isValid(objectToValidate);
}
