import Ajv from "ajv";
import schema from "../shared/types.schema.json";
import { APIGatewayProxyEventQueryStringParameters } from "aws-lambda";

export function validateQueryParmas(
    objectToValidateName: string,
    queryParams: APIGatewayProxyEventQueryStringParameters | undefined
) {
    const ajv = new Ajv();

    const isValid = ajv.compile(
        schema.definitions[objectToValidateName] || {}
    );

    return isValid(queryParams);
}