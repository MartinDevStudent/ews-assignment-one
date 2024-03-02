import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from "aws-lambda";
import { QueryCommand, QueryCommandInput, QueryCommandOutput } from "@aws-sdk/lib-dynamodb";

import { MovieReview } from "../shared/types";
import { NotFound, Ok, SchemaError, ServerError } from "../shared/httpResponses";
import { getMovieIdParameter } from "../shared/parameterHelpers";
import { createDDbDocClient } from "../shared/dynamoDbHelpers";

import Ajv from "ajv";
import schema from "../shared/types.schema.json";

const ajv = new Ajv();
const isValidQueryParams = ajv.compile(
  schema.definitions["MovieReviewsQueryParams"] || {}
);

export const handler : APIGatewayProxyHandlerV2  = async function (event: APIGatewayProxyEventV2) {
    console.log("Event: ", event);

    try {        
        const movieId = getMovieIdParameter(event);

        if (!movieId) {
            return NotFound("Missing movie Id" );
        }

        const queryParams = event.queryStringParameters;
        const minRating = queryParams?.minRating ? parseInt(queryParams.minRating) : undefined;

        if (queryParams && !isValidQueryParams(queryParams)) {
            return SchemaError(schema.definitions["MovieReviewsQueryParams"]);
        }

        const movieReviews = await getMovieReviews(movieId, minRating);

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

    return commandOutput.Items as MovieReview[];
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