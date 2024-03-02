import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from "aws-lambda";
import { QueryCommand, QueryCommandInput } from "@aws-sdk/lib-dynamodb";

import { MovieReview } from "../shared/types";
import { NotFound, Ok, ServerError } from "../shared/httpResponses";
import { tryParseInt } from "../shared/parameterHelpers";
import { createDDbDocClient } from "../shared/dynamoDbHelpers";

export const handler : APIGatewayProxyHandlerV2  = async function (event: APIGatewayProxyEventV2) {
    console.log("Event: ", event);

    try {        
        const movieId = tryParseInt(event?.pathParameters?.movieId);
        const reviewerName = event?.pathParameters?.reviewerName;

        if (!movieId) {
            return NotFound("Missing movie Id");

        } else if (!reviewerName) {
            return NotFound("Missing reviewer name");
        }

        const movieReviews = await getMovieReviews(movieId, reviewerName);

        if (!movieReviews) {
            return NotFound("No movie reviews by specified reviewer found for the movie");
        }
      
        return Ok(movieReviews);
    } catch (error: any) {
        console.log(JSON.stringify(error));

        return ServerError(error);
    }
};

async function getMovieReviews(movieId: number, reviewerName: string): Promise<MovieReview[] | undefined> {
    const ddbDocClient = createDDbDocClient(process.env.REGION);

    const commandInput = buildQueryCommandInput(movieId, reviewerName);

    const commandOutput = await ddbDocClient.send(
        new QueryCommand(commandInput)
    );

    console.log("GetCommand response: ", commandOutput);

    return commandOutput.Items && commandOutput.Items.length > 0
        ? commandOutput.Items as MovieReview[]
        : undefined;
}

function buildQueryCommandInput(movieId: number, reviewerName: string): QueryCommandInput {
    return {
        TableName: process.env.TABLE_NAME,
        KeyConditionExpression: "movieId = :m and reviewerName = :r",
        ExpressionAttributeValues: { ":m": movieId, ":r": reviewerName }
    };
};