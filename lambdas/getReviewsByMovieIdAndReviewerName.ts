import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from "aws-lambda";
import { QueryCommandInput } from "@aws-sdk/lib-dynamodb";

import { MovieReview } from "../shared/types";
import { NotFound, Ok, ServerError } from "../shared/httpResponses";
import { tryParseInt } from "../shared/parameterHelpers";
import { sendQuery } from "../shared/dynamoDbHelpers";

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

        const movieReview = await getMovieReview(movieId, reviewerName);

        if (!movieReview) {
            return NotFound("No movie reviews by specified reviewer found for the movie");
        }
      
        return Ok(movieReview);
    } catch (error: any) {
        console.log(JSON.stringify(error));

        return ServerError(error);
    }
};

async function getMovieReview(movieId: number, reviewerName: string): Promise<MovieReview | undefined> {
    const commandInput = buildQueryCommandInput(movieId, reviewerName);

    const queryResponse = await sendQuery(commandInput);

    console.log("GetCommand response: ", queryResponse);

    return queryResponse.Items && queryResponse.Items.length > 0
        ? queryResponse.Items[0] as MovieReview
        : undefined;
}

function buildQueryCommandInput(movieId: number, reviewerName: string): QueryCommandInput {
    return {
        TableName: process.env.TABLE_NAME,
        KeyConditionExpression: "movieId = :m and reviewerName = :r",
        ExpressionAttributeValues: { ":m": movieId, ":r": reviewerName }
    };
};