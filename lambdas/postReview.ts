import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from "aws-lambda";
import { Ok, SchemaError, ServerError } from "/opt/custom-code/httpResponses";
import { isValid } from "../shared/validator";

const schema = require("../shared/types.schema.json");
import { MovieReview } from "../shared/types";
import { PutCommandInput, PutCommandOutput } from "@aws-sdk/lib-dynamodb";
import { sendCreate } from "../shared/dynamoDbHelpers";

export const handler: APIGatewayProxyHandlerV2 = async function (
  event: APIGatewayProxyEventV2
) {
  console.log("Event: ", event);

  try {
    const body = event.body ? JSON.parse(event.body) : undefined;
    const requestTypeName = "CreateMovieReviewRequest";

    if (body && !isValid(requestTypeName, body)) {
      return SchemaError(schema.definitions[requestTypeName]);
    }

    const movieReview = {
      ...body,
      reviewDate: getReviewDate(),
    };

    const response = await createMovieReview(movieReview);

    return Ok(response);
  } catch (error: any) {
    console.log(JSON.stringify(error));

    return ServerError(error);
  }
};

function getReviewDate() {
  return new Intl.DateTimeFormat("fr-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(Date.now());
}

async function createMovieReview(
  review: MovieReview
): Promise<PutCommandOutput> {
  const commandInput = buildCreateReviewCommandInput(review);

  const response = await sendCreate(commandInput);

  console.log("Create response: ", response);

  return response;
}

function buildCreateReviewCommandInput(review: MovieReview): PutCommandInput {
  return {
    TableName: process.env.TABLE_NAME,
    Item: review,
  };
}
