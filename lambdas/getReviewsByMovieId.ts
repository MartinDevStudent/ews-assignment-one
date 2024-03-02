import { APIGatewayProxyHandlerV2 } from "aws-lambda";

export const handler : APIGatewayProxyHandlerV2  = async function (event: any) {
    try {
        console.log("Event: ", event);
        const parameters  = event?.pathParameters;

        const movieId = parameters?.movieId ? parseInt(parameters.movieId) : undefined;

        if (!movieId) {
            return {
              statusCode: 404,
              headers: {
                "content-type": "application/json",
              },
              body: JSON.stringify({ Message: "Missing movie Id" }),
            };
        }

        return {
            statusCode: 200,
            body: `This is the getReviewsByMovieId lambda, the movieId parameter is ${movieId}`,
        };
    } catch (error: any) {
        console.log(JSON.stringify(error));
        return {
        statusCode: 500,
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify({ error }),
        };
    }
};