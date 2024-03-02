import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from "aws-lambda";

import { QueryCommand, QueryCommandInput, QueryCommandOutput } from "@aws-sdk/lib-dynamodb";
import { MovieReview } from "../shared/types";
import { NotFound, Ok, ServerError } from "../shared/httpResponses";
import { getMovieIdParameter } from "../shared/parameterHelpers";
import { createDDbDocClient } from "../shared/dynamoDbHelpers";

export const handler : APIGatewayProxyHandlerV2  = async function (event: APIGatewayProxyEventV2) {
    console.log("Event: ", event);

    try {        
        const movieId = getMovieIdParameter(event);

        if (!movieId) {
            return NotFound("Missing movie Id" );
        }

        const movieReview = await getMovieReview(movieId);

        console.log("movieReview", movieReview)

        if (!movieReview) {
            return NotFound("Invalid movie Id");
        }
      
        return Ok(movieReview);
    } catch (error: any) {
        console.log(JSON.stringify(error));

        return ServerError(error);
    }
};

async function getMovieReview(movieId: number): Promise<MovieReview | undefined> {
    const ddbDocClient = createDDbDocClient(process.env.REGION);

    const commandInput = buildQueryCommandInput(movieId);

    const commandOutput = await ddbDocClient.send(
        new QueryCommand(commandInput)
    );

    console.log("GetCommand response: ", commandOutput);

    return parseResponse(commandOutput);
}

function buildQueryCommandInput(movieId: number): QueryCommandInput {
    return {
        TableName: process.env.TABLE_NAME,
        KeyConditionExpression: "movieId = :m",
        ExpressionAttributeValues: {
            ":m": movieId,
        },
    };
}

function parseResponse(movieReviewsCommandOutput: QueryCommandOutput): MovieReview | undefined {
    // if response contains movie review
    return movieReviewsCommandOutput.Count && movieReviewsCommandOutput.Count > 0
        ? movieReviewsCommandOutput.Items[0] as MovieReview
        : undefined;
}