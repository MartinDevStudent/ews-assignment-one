import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from "aws-lambda";
import { QueryCommand, QueryCommandInput } from "@aws-sdk/lib-dynamodb";

import { MovieReview } from "../shared/types";
import { NotFound, Ok, SchemaError, ServerError } from "../shared/httpResponses";
import { tryParseInt } from "../shared/parameterHelpers";
import { createDDbDocClient } from "../shared/dynamoDbHelpers";

import schema from "../shared/types.schema.json";
import { validateQueryParmas as validateQueryParams } from "../shared/validator";

export const handler : APIGatewayProxyHandlerV2  = async function (event: APIGatewayProxyEventV2) {
    console.log("Event: ", event);

    try {
        const queryParams = event.queryStringParameters;
        const queryParamsTypeName = "MovieReviewsQueryParams";
        const isValidQueryParams = validateQueryParams(queryParamsTypeName, queryParams);
        
        const movieId = tryParseInt(event.pathParameters?.movieId);
        const minRating = tryParseInt(queryParams?.minRating);

        if (!movieId) {
            return NotFound("Missing movie Id");

        } else if (queryParams && !isValidQueryParams) {
            return SchemaError(schema.definitions[queryParamsTypeName]);
        }

        const movieReviews = await getMovieReviews(movieId!, minRating);

        if (!movieReviews) {
            return NotFound("Invalid movie Id");
        }
      
        return Ok(movieReviews);
    } catch (error: any) {
        console.log(JSON.stringify(error));

        return ServerError(error);
    }
};

async function getMovieReviews(movieId: number, minRating?: number): Promise<MovieReview[] | undefined> {
    const ddbDocClient = createDDbDocClient(process.env.REGION);

    const commandInput = buildQueryCommandInput(movieId, minRating);

    const commandOutput = await ddbDocClient.send(
        new QueryCommand(commandInput)
    );

    console.log("GetCommand response: ", commandOutput);

    return commandOutput.Items
        ? commandOutput.Items as MovieReview[]
        : undefined;
}

function buildQueryCommandInput(movieId: number, minRating?: number): QueryCommandInput {
    const keyConditionExpression = minRating === undefined
        ? "movieId = :m"
        : "movieId = :m and rating >= :r"
    const expressionAttributeValues = minRating === undefined
        ? { ":m": movieId }
        : { ":m": movieId, ":r": minRating }

    return {
        TableName: process.env.TABLE_NAME,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues
    };
};