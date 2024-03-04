import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  NotFound,
  Ok,
  SchemaError,
  ServerError,
} from "/opt/custom-code/httpResponses";
import { isValid } from "../shared/validator";
const schema = require("../shared/types.schema.json");
import { UpdateCommandInput } from "@aws-sdk/lib-dynamodb";
import { sendUpdate } from "../shared/dynamoDbHelpers";
import { tryParseInt } from "/opt/custom-code/parameterHelpers";
import { MovieReview } from "../shared/types";

export const handler: APIGatewayProxyHandlerV2 = async function (
  event: APIGatewayProxyEventV2
) {
  console.log("Event: ", event);

  try {
    const movieId = tryParseInt(event?.pathParameters?.movieId);
    const reviewerName = event?.pathParameters?.reviewerNameOrYear;

    const body = event.body ? JSON.parse(event.body) : undefined;
    const requestTypeName = "UpdateMovieReviewRequest";

    if (!movieId) {
      return NotFound("Missing movie Id");
    } else if (!reviewerName) {
      return NotFound("Missing reviewer name");
    } else if (body && !isValid(requestTypeName, body)) {
      return SchemaError(schema.definitions[requestTypeName]);
    }

    const updatedReview = await updateMovieReview(
      movieId,
      reviewerName,
      body.content as string
    );

    return Ok(updatedReview);
  } catch (error: any) {
    console.log(JSON.stringify(error));

    if (error.name === "ConditionalCheckFailedException") {
      return NotFound(
        "No review found with specified movie Id and reviewer name"
      );
    }

    return ServerError(error);
  }
};

async function updateMovieReview(
  movieId: number,
  reviewerName: string,
  content: string
): Promise<MovieReview> {
  const commandInput = buildUpdateReviewCommandInput(
    movieId,
    reviewerName,
    content
  );

  const response = await sendUpdate(commandInput);

  console.log("Create response: ", response);

  return response.Attributes as MovieReview;
}

function buildUpdateReviewCommandInput(
  movieId: number,
  reviewerName: string,
  content: string
): UpdateCommandInput {
  return {
    TableName: process.env.TABLE_NAME,
    Key: {
      movieId: movieId,
      reviewerName: reviewerName,
    },
    UpdateExpression: "set content = :c",
    ConditionExpression: "movieId = :m and reviewerName = :r",
    ExpressionAttributeValues: {
      ":c": content,
      ":m": movieId,
      ":r": reviewerName,
    },
    ReturnValues: "ALL_NEW",
  };
}
