import { APIGatewayProxyEventV2 } from "aws-lambda";

export function getMovieIdParameter(event: APIGatewayProxyEventV2): number | undefined {
    const parameters = event?.pathParameters;

    const movieId = parameters?.movieId ? parseInt(parameters.movieId) : undefined;

    return movieId;
}