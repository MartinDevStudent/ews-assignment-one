import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from "@aws-sdk/lib-dynamodb";

function createDDbDocClient(awsRegion: string | undefined): DynamoDBDocumentClient {
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

export async function sendQuery(commandInput: QueryCommandInput) {
    const ddbDocClient = createDDbDocClient(process.env.REGION);

    const commandOutput = await ddbDocClient.send(
        new QueryCommand(commandInput)
    );

    return commandOutput;
}
