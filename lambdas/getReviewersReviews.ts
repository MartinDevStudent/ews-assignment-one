import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from "aws-lambda";
import { QueryCommandInput, ScanCommandInput } from "@aws-sdk/lib-dynamodb";

import { MovieReview } from "../shared/types";
import { NotFound, Ok, ServerError } from "../shared/httpResponses";
import { scan, sendQuery } from "../shared/dynamoDbHelpers";

export const handler : APIGatewayProxyHandlerV2  = async function (event: APIGatewayProxyEventV2) {
    console.log("Event: ", event);

    try {
        const reviewerName = event?.pathParameters?.reviewerName;

        if (!reviewerName) {
            return NotFound("Missing reviewer name");
        }

        const movieReviews = await getMovieReviews(reviewerName);

        if (!movieReviews) {
            return NotFound("No movie reviews found for reviewer");
        }
      
        return Ok(movieReviews);
    } catch (error: any) {
        console.log(JSON.stringify(error));

        return ServerError(error);
    }
};

async function getMovieReviews(reviewerName: string): Promise<MovieReview[] | undefined> {
    const commandInput = buildScanCommandInput(reviewerName);
    
    const scanResponse = await scan(commandInput);

    console.log("GetCommand response: ", scanResponse);

    return scanResponse.Items && scanResponse.Items.length > 0
        ? scanResponse.Items as MovieReview[]
        : undefined;
}

function buildScanCommandInput(reviewerName: string): ScanCommandInput {
    return {
        TableName: process.env.TABLE_NAME,
        FilterExpression: "reviewerName = :r",
        ExpressionAttributeValues: { ":r": reviewerName }
    };
};