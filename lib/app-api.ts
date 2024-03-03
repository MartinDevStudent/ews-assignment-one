import { Aws } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as custom from "aws-cdk-lib/custom-resources";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as node from "aws-cdk-lib/aws-lambda-nodejs";
import { movieReviews } from "../seed/movieReviews";
import { generateBatch } from "../shared/util";

type AppApiProps = {
  userPoolId: string;
  userPoolClientId: string;
};

export class AppApi extends Construct {
  constructor(scope: Construct, id: string, props: AppApiProps) {
    super(scope, id);

    // Table
    const movieReviewsTable = new dynamodb.Table(this, "MovieReviewsTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "movieId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "reviewerName", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "MovieReviews",
    });

    movieReviewsTable.addGlobalSecondaryIndex({
      partitionKey: {
          name: 'Id',
          type: dynamodb.AttributeType.STRING,
      },
      indexName: 'some-index',
  });
    movieReviewsTable.addLocalSecondaryIndex({
      indexName: "reviewDateIx",
      sortKey: { name: "reviewDate", type: dynamodb.AttributeType.STRING },
    });

    movieReviewsTable.addLocalSecondaryIndex({
      indexName: "ratingIx",
      sortKey: { name: "rating", type: dynamodb.AttributeType.NUMBER },
    });

    new custom.AwsCustomResource(this, "movieReviewsddbInitData", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            [movieReviewsTable.tableName]: generateBatch(movieReviews),
          },
        },
        physicalResourceId: custom.PhysicalResourceId.of("movieReviewsddbInitData"),
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [movieReviewsTable.tableArn],
      }),
    });

    // Functions
    const appCommonFnProps = {
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: "handler",
      environment: {
        USER_POOL_ID: props.userPoolId,
        CLIENT_ID: props.userPoolClientId,
        REGION: cdk.Aws.REGION,
      },
    };

    const protectedFn = new node.NodejsFunction(this, "ProtectedFn", {
      ...appCommonFnProps,
      entry: "./lambdas/protected.ts",
    });

    const publicFn = new node.NodejsFunction(this, "PublicFn", {
      ...appCommonFnProps,
      entry: "./lambdas/public.ts",
    });

    const authorizerFn = new node.NodejsFunction(this, "AuthorizerFn", {
      ...appCommonFnProps,
      entry: "./lambdas/auth/authorizer.ts",
    });

    const getReviewsByMovieIdFn = new lambdanode.NodejsFunction(this, "GetReviewsByMovieIdFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/getReviewsByMovieId.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: movieReviewsTable.tableName,
        REGION: 'eu-west-1',
      },
    });

    const getAMoviesReviewsByReviewerNameOrYearFn = new lambdanode.NodejsFunction(this, "getAMoviesReviewsByReviewerNameOrYearFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/getAMoviesReviewsByReviewerNameOrYear.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: movieReviewsTable.tableName,
        REGION: 'eu-west-1',
      },
    });

    const getReviewersReviewsFn = new lambdanode.NodejsFunction(this, "getReviewersReviewsFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/getReviewersReviews.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: movieReviewsTable.tableName,
        REGION: 'eu-west-1',
      },
    });

    const getTranslationFn = new lambdanode.NodejsFunction(this, "getTranslationFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/getTranslation.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: movieReviewsTable.tableName,
        REGION: 'eu-west-1',
      },
    });

    const requestAuthorizer = new apig.RequestAuthorizer(this, "RequestAuthorizer", {
      identitySources: [apig.IdentitySource.header("cookie")],
      handler: authorizerFn,
      resultsCacheTtl: cdk.Duration.minutes(0),
    });
      
    // Permissions
    movieReviewsTable.grantReadData(getReviewsByMovieIdFn)
    movieReviewsTable.grantReadData(getAMoviesReviewsByReviewerNameOrYearFn)
    movieReviewsTable.grantReadData(getReviewersReviewsFn)
    movieReviewsTable.grantReadData(getTranslationFn)

    // REST API
    const appApi = new apig.RestApi(this, "AppApi", {
      description: "App RestApi",
      endpointTypes: [apig.EndpointType.REGIONAL],
      defaultCorsPreflightOptions: {
        allowOrigins: apig.Cors.ALL_ORIGINS,
      },
    });

    const protectedRes = appApi.root.addResource("protected");
    protectedRes.addMethod("GET", new apig.LambdaIntegration(protectedFn), {
      authorizer: requestAuthorizer,
      authorizationType: apig.AuthorizationType.CUSTOM,
    });
    
    const publicRes = appApi.root.addResource("public");
    publicRes.addMethod("GET", new apig.LambdaIntegration(publicFn));

    const moviesEndpoint = appApi.root.addResource("movies");
    
      const movieIdEndpoint = moviesEndpoint.addResource("{movieId}");

        const reviewsByMovieIdEndpoint = movieIdEndpoint.addResource("reviews");
          reviewsByMovieIdEndpoint.addMethod("GET", new apig.LambdaIntegration(getReviewsByMovieIdFn));

        const aMoviesReviewsByReviewerNameOrYearEndpoint = reviewsByMovieIdEndpoint.addResource("{reviewerNameOrYear}");
          aMoviesReviewsByReviewerNameOrYearEndpoint.addMethod("GET", new apig.LambdaIntegration(getAMoviesReviewsByReviewerNameOrYearFn));

    const reviewsEndpoint = appApi.root.addResource("reviews");

      const reviewerNameEndpoint = reviewsEndpoint.addResource("{reviewerName}");
        reviewerNameEndpoint.addMethod("GET", new apig.LambdaIntegration(getReviewersReviewsFn));
      
        const reviewerNameThenMovieIdEndpoint = reviewerNameEndpoint.addResource("{movieId}");

          const translationEndpoint = reviewerNameThenMovieIdEndpoint.addResource("translation");
            translationEndpoint.addMethod("GET", new apig.LambdaIntegration(getTranslationFn));      
  }
}