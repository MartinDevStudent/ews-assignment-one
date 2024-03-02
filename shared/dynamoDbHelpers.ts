import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export function createDDbDocClient(awsRegion: string | undefined): DynamoDBDocumentClient {
    const ddbClient = new DynamoDBClient({ region: awsRegion });
    const marshallOptions = {
        convertEmptyValues: true,
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
    };
    const unmarshallOptions = {
        wrapNumbers: false,
    };
    const translateConfig = { marshallOptions, unmarshallOptions };

    return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
