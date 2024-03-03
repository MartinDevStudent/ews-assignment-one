import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  GetCommandInput,
  GetCommandOutput,
  PutCommand,
  PutCommandInput,
  PutCommandOutput,
  QueryCommand,
  QueryCommandInput,
  QueryCommandOutput,
  ScanCommand,
  ScanCommandInput,
  ScanCommandOutput,
  UpdateCommand,
  UpdateCommandInput,
  UpdateCommandOutput,
} from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient(process.env.REGION);

function createDDbDocClient(
  awsRegion: string | undefined
): DynamoDBDocumentClient {
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

export async function sendQuery(
  commandInput: QueryCommandInput
): Promise<QueryCommandOutput> {
  return await ddbDocClient.send(new QueryCommand(commandInput));
}

export async function getItem(
  commandInput: GetCommandInput
): Promise<GetCommandOutput> {
  return await ddbDocClient.send(new GetCommand(commandInput));
}

export async function scan(
  commandInput: ScanCommandInput
): Promise<ScanCommandOutput> {
  return await ddbDocClient.send(new ScanCommand(commandInput));
}

export async function sendCreate(
  commandInput: PutCommandInput
): Promise<PutCommandOutput> {
  return await ddbDocClient.send(new PutCommand(commandInput));
}

export async function sendUpdate(
  commandInput: UpdateCommandInput
): Promise<UpdateCommandOutput> {
  return await ddbDocClient.send(new UpdateCommand(commandInput));
}
