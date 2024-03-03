import * as AWS from "aws-sdk";
import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from "aws-lambda";
import { GetCommandInput } from "@aws-sdk/lib-dynamodb";

import { MovieReview } from "../shared/types";
import {
  BadRequest,
  NotFound,
  Ok,
  SchemaError,
  ServerError,
} from "../shared/httpResponses";
import { tryParseInt } from "../shared/parameterHelpers";
import { getItem } from "../shared/dynamoDbHelpers";
import { isValidQueryParams } from "../shared/validator";
import schema from "../shared/types.schema.json";
import {
  TranslateTextRequest,
  TranslateTextResponse,
} from "aws-sdk/clients/translate";

const translate = new AWS.Translate();

export const handler: APIGatewayProxyHandlerV2 = async function (
  event: APIGatewayProxyEventV2
) {
  console.log("Event: ", event);

  try {
    const reviewerName = event?.pathParameters?.reviewerName;
    const movieId = tryParseInt(event?.pathParameters?.movieId);

    const queryParams = event?.queryStringParameters;
    const queryParamsTypeName = "TranslationQueryParams";

    if (!reviewerName) {
      return NotFound("You have not provided a valid reviewer name");
    } else if (!movieId) {
      return NotFound("Missing movie Id");
    } else if (
      queryParams &&
      !isValidQueryParams(queryParamsTypeName, queryParams)
    ) {
      return SchemaError(schema.definitions[queryParamsTypeName]);
    }

    const movieReview = await getMovieReview(movieId, reviewerName);

    if (!movieReview) {
      return NotFound(
        "No movie review found for the specified movied id/ reviewer name"
      );
    } else if (!movieReview.content) {
      return BadRequest("Unable to translate as movie review has no content");
    }

    const language = queryParams!.language!;
    const translatedConetent = await getTranslatedReview(
      movieReview.content,
      language
    );

    return Ok({
      ...movieReview,
      content: translatedConetent,
    });
  } catch (error: any) {
    console.log(JSON.stringify(error));

    return ServerError(error);
  }
};

async function getMovieReview(
  movieId: number,
  reviewerName: string
): Promise<MovieReview | undefined> {
  const commandInput = buildGetItemCommandInput(movieId, reviewerName);

  const queryResponse = await getItem(commandInput);

  console.log("GetCommand response: ", queryResponse);

  return queryResponse.Item ? (queryResponse.Item as MovieReview) : undefined;
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

async function getTranslatedReview(
  review: string,
  language: string
): Promise<string> {
  const translateParams = buildTranslateParams(review, language);

  const translationResponse: TranslateTextResponse = await translate
    .translateText(translateParams)
    .promise();

  return translationResponse.TranslatedText;
}

function buildTranslateParams(
  text: string,
  language: string
): TranslateTextRequest {
  return {
    Text: text,
    SourceLanguageCode: "en",
    TargetLanguageCode: language,
  };
}
