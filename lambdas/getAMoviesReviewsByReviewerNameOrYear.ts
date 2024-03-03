import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from "aws-lambda";
import { GetCommandInput, QueryCommandInput } from "@aws-sdk/lib-dynamodb";

import { MovieReview } from "../shared/types";
import { NotFound, Ok, ServerError } from "../shared/httpResponses";
import { tryParseInt } from "../shared/parameterHelpers";
import { getItem, sendQuery } from "../shared/dynamoDbHelpers";

export const handler: APIGatewayProxyHandlerV2 = async function (
  event: APIGatewayProxyEventV2
) {
  console.log("Event: ", event);

  try {
    const movieId = tryParseInt(event?.pathParameters?.movieId);
    const year = tryParseInt(event?.pathParameters?.reviewerNameOrYear);
    const reviewerName = event?.pathParameters?.reviewerNameOrYear;

    if (!movieId) {
      return NotFound("Missing movie Id");
    } else if (!reviewerName) {
      return NotFound("You have not provided a valid reviewer name or year");
    }

    const movieReviews = year
      ? await getMovieReviewsByYear(movieId, year)
      : await getMovieReviewsByReviewerName(movieId, reviewerName);

    if (!movieReviews) {
      const message = year
        ? "No movie reviews for specified year found for the movie"
        : "No movie reviews by specified reviewer found for the movie";

      return NotFound(message);
    }

    return Ok(movieReviews);
  } catch (error: any) {
    console.log(JSON.stringify(error));

    return ServerError(error);
  }
};

async function getMovieReviewsByReviewerName(
  movieId: number,
  reviewerName: string
): Promise<MovieReview | undefined> {
  const commandInput = buildGetItemCommandInput(movieId, reviewerName);

  const queryResponse = await getItem(commandInput);

  console.log("GetCommand response: ", queryResponse);

  return queryResponse.Item ? (queryResponse.Item as MovieReview) : undefined;
}

async function getMovieReviewsByYear(
  movieId: number,
  year: number
): Promise<MovieReview[] | undefined> {
  const commandInput = buildByYearQueryCommandInput(movieId, year);

  const queryResponse = await sendQuery(commandInput);

  console.log("GetCommand response: ", queryResponse);

  return queryResponse.Items && queryResponse.Items.length > 0
    ? (queryResponse.Items as MovieReview[])
    : undefined;
}

function buildGetItemCommandInput(
  movieId: number,
  reviewerName: string
): GetCommandInput {
  return {
    TableName: process.env.TABLE_NAME,
    Key: { movieId: movieId, reviewerName: reviewerName },
  };
}

function buildByYearQueryCommandInput(
  movieId: number,
  year: number
): QueryCommandInput {
  return {
    TableName: process.env.TABLE_NAME,
    IndexName: "reviewDateIx",
    KeyConditionExpression: "movieId = :m and begins_with(reviewDate, :y)",
    ExpressionAttributeValues: { ":m": movieId, ":y": year.toString() },
  };
}
