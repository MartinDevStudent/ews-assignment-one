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

import * as iam from "aws-cdk-lib/aws-iam";
import { NodejsFunctionProps } from "aws-cdk-lib/aws-lambda-nodejs";

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
        name: "Id",
        type: dynamodb.AttributeType.STRING,
      },
      indexName: "some-index",
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
        physicalResourceId: custom.PhysicalResourceId.of(
          "movieReviewsddbInitData"
        ),
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [movieReviewsTable.tableArn],
      }),
    });

    // Layers
    const customCodeLayer = new lambda.LayerVersion(this, "custom-code-layer", {
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      layerVersionName: "custom-code-layer",
      code: lambda.Code.fromAsset("layers/custom-code"),
      description: "Custom code layer",
    });

    const nodeModulesLayer = new lambda.LayerVersion(
      this,
      "node-modules-layer",
      {
        compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
        code: lambda.Code.fromAsset("layers/node-modules"),
        description: "Node modules layer",
      }
    );

    // Functions
    const appCommonFnProps: NodejsFunctionProps = {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: 128,
      timeout: cdk.Duration.seconds(10),
      environment: {
        TABLE_NAME: movieReviewsTable.tableName,
        REGION: "eu-west-1",
      },
      bundling: {
        externalModules: [
          "aws-sdk", // Use the 'aws-sdk' available in the Lambda runtime
          "axios",
          "jsonwebtoken",
          "jwk-to-pem",
          "ajv",
        ],
      },
      layers: [customCodeLayer, nodeModulesLayer],
    };

    const authorizerFn = new node.NodejsFunction(this, "AuthorizerFn", {
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
      entry: "./lambdas/auth/authorizer.ts",
    });

    const getReviewsByMovieIdFn = new lambdanode.NodejsFunction(
      this,
      "GetReviewsByMovieIdFn",
      {
        ...appCommonFnProps,
        entry: `${__dirname}/../lambdas/getReviewsByMovieId.ts`,
      }
    );

    const getAMoviesReviewsByReviewerNameOrYearFn =
      new lambdanode.NodejsFunction(
        this,
        "getAMoviesReviewsByReviewerNameOrYearFn",
        {
          ...appCommonFnProps,
          entry: `${__dirname}/../lambdas/getAMoviesReviewsByReviewerNameOrYear.ts`,
        }
      );

    const getReviewersReviewsFn = new lambdanode.NodejsFunction(
      this,
      "getReviewersReviewsFn",
      {
        ...appCommonFnProps,
        entry: `${__dirname}/../lambdas/getReviewersReviews.ts`,
      }
    );

    const getTranslationFn = new lambdanode.NodejsFunction(
      this,
      "getTranslationFn",
      {
        ...appCommonFnProps,
        entry: `${__dirname}/../lambdas/getTranslation.ts`,
      }
    );

    const postReviewFn = new lambdanode.NodejsFunction(this, "postReviewFn", {
      ...appCommonFnProps,
      entry: `${__dirname}/../lambdas/postReview.ts`,
    });

    const putReviewFn = new lambdanode.NodejsFunction(this, "putReviewFn", {
      ...appCommonFnProps,
      entry: `${__dirname}/../lambdas/putReview.ts`,
    });

    const requestAuthorizer = new apig.RequestAuthorizer(
      this,
      "RequestAuthorizer",
      {
        identitySources: [apig.IdentitySource.header("cookie")],
        handler: authorizerFn,
        resultsCacheTtl: cdk.Duration.minutes(0),
      }
    );

    // Permissions
    movieReviewsTable.grantReadData(getReviewsByMovieIdFn);
    movieReviewsTable.grantReadData(getAMoviesReviewsByReviewerNameOrYearFn);
    movieReviewsTable.grantReadData(getReviewersReviewsFn);
    movieReviewsTable.grantReadData(getTranslationFn);
    movieReviewsTable.grantReadData(postReviewFn);
    movieReviewsTable.grantWriteData(postReviewFn);
    movieReviewsTable.grantReadData(putReviewFn);
    movieReviewsTable.grantWriteData(putReviewFn);

    const translatePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["translate:*"],
      resources: ["*"],
    });

    getTranslationFn.role?.attachInlinePolicy(
      new iam.Policy(this, "translate-policy", {
        statements: [translatePolicy],
      })
    );

    // REST API
    const appApi = new apig.RestApi(this, "AppApi", {
      description: "App RestApi",
      endpointTypes: [apig.EndpointType.REGIONAL],
      defaultCorsPreflightOptions: {
        allowOrigins: apig.Cors.ALL_ORIGINS,
      },
    });

    const moviesEndpoint = appApi.root.addResource("movies");
    moviesEndpoint.addMethod("POST", new apig.LambdaIntegration(postReviewFn), {
      authorizer: requestAuthorizer,
      authorizationType: apig.AuthorizationType.CUSTOM,
    });

    const movieIdEndpoint = moviesEndpoint.addResource("{movieId}");

    const reviewsByMovieIdEndpoint = movieIdEndpoint.addResource("reviews");
    reviewsByMovieIdEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getReviewsByMovieIdFn)
    );

    const aMoviesReviewsByReviewerNameOrYearEndpoint =
      reviewsByMovieIdEndpoint.addResource("{reviewerNameOrYear}");
    aMoviesReviewsByReviewerNameOrYearEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getAMoviesReviewsByReviewerNameOrYearFn)
    );
    aMoviesReviewsByReviewerNameOrYearEndpoint.addMethod(
      "PUT",
      new apig.LambdaIntegration(putReviewFn),
      {
        authorizer: requestAuthorizer,
        authorizationType: apig.AuthorizationType.CUSTOM,
      }
    );

    const reviewsEndpoint = appApi.root.addResource("reviews");

    const reviewerNameEndpoint = reviewsEndpoint.addResource("{reviewerName}");
    reviewerNameEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getReviewersReviewsFn)
    );

    const reviewerNameThenMovieIdEndpoint =
      reviewerNameEndpoint.addResource("{movieId}");

    const translationEndpoint =
      reviewerNameThenMovieIdEndpoint.addResource("translation");
    translationEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getTranslationFn)
    );
  }
}
