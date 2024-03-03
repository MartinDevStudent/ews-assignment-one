import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, GetCommandInput, GetCommandOutput, QueryCommand, QueryCommandInput, QueryCommandOutput, ScanCommand, ScanCommandInput, ScanCommandOutput } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient(process.env.REGION);

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

export async function sendQuery(commandInput: QueryCommandInput): Promise<QueryCommandOutput> {
    const commandOutput = await ddbDocClient.send(
        new QueryCommand(commandInput)
    );

    return commandOutput;
}

export async function getItem(commandInput: GetCommandInput): Promise<GetCommandOutput> {
    const commandOutput = await ddbDocClient.send(
        new GetCommand(commandInput)
    );
            
    return commandOutput;
}

export async function scan(commandInput: ScanCommandInput): Promise<ScanCommandOutput> {
    const commandOutput = await ddbDocClient.send(
        new ScanCommand(commandInput)
    );
            
    return commandOutput;
}