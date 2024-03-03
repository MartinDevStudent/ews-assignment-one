import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from "aws-lambda";
import { Ok, SchemaError, ServerError } from "../shared/httpResponses";
import { isValid } from "../shared/validator";

import schema from "../shared/types.schema.json";
import { MovieReview } from "../shared/types";

export const handler: APIGatewayProxyHandlerV2 = async function (
  event: APIGatewayProxyEventV2
) {
  console.log("Event: ", event);

  try {
    const body = event.body ? JSON.parse(event.body) : undefined;
    const movieReviewRequestTypeName = "MovieReview";

    if (body && !isValid(movieReviewRequestTypeName, body)) {
      return SchemaError(schema.definitions[movieReviewRequestTypeName]);
    }

    const movieReview = body as MovieReview;

    return Ok(movieReview);
  } catch (error: any) {
    console.log(JSON.stringify(error));

    return ServerError(error);
  }
};
