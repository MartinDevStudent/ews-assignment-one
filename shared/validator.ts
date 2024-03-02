import Ajv from "ajv";
import schema from "../shared/types.schema.json";
import { APIGatewayProxyEventQueryStringParameters } from "aws-lambda";

export function isValidQueryParams(
    queryParamsTypeName: string,
    queryParams: APIGatewayProxyEventQueryStringParameters | undefined
) {
    const ajv = new Ajv({ coerceTypes: true });

    const isValid = ajv.compile(
        schema.definitions[queryParamsTypeName] || {}
    );

    return isValid(queryParams);
}