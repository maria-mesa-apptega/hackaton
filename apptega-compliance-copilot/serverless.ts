import type { AWS } from '@serverless/typescript';

const serverlessConfiguration: AWS = {
  service: 'apptega-compliance-copilot',
  frameworkVersion: '4',
  plugins: [
    'serverless-esbuild',
    'serverless-offline'
  ],
  provider: {
    name: 'aws',
    runtime: 'nodejs20.x',
    region: 'us-east-1',
    stage: '${opt:stage, "dev"}',
    timeout: 30,
    memorySize: 1024,
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
      BEDROCK_MODEL_ID: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      BEDROCK_REGION: 'us-east-1',
      DYNAMODB_TABLE_NAME: '${self:service}-conversations-${self:provider.stage}',
      LOG_LEVEL: 'info',
      STAGE: '${self:provider.stage}',
      SERVICE_NAME: '${self:service}',
      // MySQL Connection from existing Apptega infrastructure
      DB_HOST: '${env:DB_HOST, "localhost"}',
      DB_USERNAME: '${env:DB_USERNAME, "apptega"}',
      DB_PASSWORD: '${env:DB_PASSWORD, "apptega123"}',
      DB_DATABASE: '${env:DB_DATABASE, "apptega"}',
      DB_HOST_PORT: '${env:DB_HOST_PORT, "3306"}',
      // One API integration
      ONE_API_BASE_URL: '${env:ONE_API_BASE_URL, "http://one-api:3000"}',
      WEB_API_BASE_URL: '${env:WEB_API_BASE_URL, "http://web:8080"}'
    },
    iam: {
      role: {
        statements: [
          {
            Effect: 'Allow',
            Action: [
              'bedrock:InvokeModel',
              'bedrock:InvokeModelWithResponseStream'
            ],
            Resource: [
              'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0',
              'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-haiku-20240307-v1:0'
            ]
          },
          {
            Effect: 'Allow',
            Action: [
              'dynamodb:GetItem',
              'dynamodb:PutItem',
              'dynamodb:Query',
              'dynamodb:UpdateItem',
              'dynamodb:DeleteItem',
              'dynamodb:BatchGetItem',
              'dynamodb:BatchWriteItem'
            ],
            Resource: [
              { 'Fn::GetAtt': ['ConversationsTable', 'Arn'] },
              { 'Fn::Sub': '${ConversationsTable}/index/*' }
            ]
          },
          {
            Effect: 'Allow',
            Action: [
              'xray:PutTraceSegments',
              'xray:PutTelemetryRecords'
            ],
            Resource: '*'
          },
          {
            Effect: 'Allow',
            Action: [
              'logs:CreateLogGroup',
              'logs:CreateLogStream',
              'logs:PutLogEvents'
            ],
            Resource: 'arn:aws:logs:*:*:*'
          }
        ]
      }
    },
    tracing: {
      lambda: true,
      apiGateway: true
    }
  },
  functions: {
    // Compliance functions
    ask: {
      handler: 'src/functions/compliance/ask.handler',
      description: 'Process compliance questions using AI',
      events: [
        {
          http: {
            method: 'post',
            path: 'compliance/ask',
            cors: {
              origin: '*',
              headers: [
                'Content-Type',
                'X-Amz-Date',
                'Authorization',
                'X-Api-Key',
                'X-Amz-Security-Token',
                'X-Amz-User-Agent'
              ],
              allowCredentials: false
            }
          }
        }
      ]
    },
    history: {
      handler: 'src/functions/compliance/history.handler',
      description: 'Get user conversation history',
      events: [
        {
          http: {
            method: 'get',
            path: 'compliance/history/{userId}',
            cors: {
              origin: '*',
              headers: [
                'Content-Type',
                'X-Amz-Date',
                'Authorization',
                'X-Api-Key',
                'X-Amz-Security-Token',
                'X-Amz-User-Agent'
              ],
              allowCredentials: false
            }
          }
        }
      ]
    },
    conversation: {
      handler: 'src/functions/compliance/conversation.handler',
      description: 'Get specific conversation details',
      events: [
        {
          http: {
            method: 'get',
            path: 'compliance/conversation/{conversationId}',
            cors: {
              origin: '*',
              headers: [
                'Content-Type',
                'X-Amz-Date',
                'Authorization',
                'X-Api-Key',
                'X-Amz-Security-Token',
                'X-Amz-User-Agent'
              ],
              allowCredentials: false
            }
          }
        }
      ]
    },
    // AI functions
    bedrockProcess: {
      handler: 'src/functions/ai/bedrock.handler',
      description: 'Direct Bedrock AI processing endpoint',
      timeout: 60, // Longer timeout for AI processing
      events: [
        {
          http: {
            method: 'post',
            path: 'ai/bedrock/process',
            cors: {
              origin: '*',
              headers: [
                'Content-Type',
                'X-Amz-Date',
                'Authorization',
                'X-Api-Key',
                'X-Amz-Security-Token',
                'X-Amz-User-Agent'
              ],
              allowCredentials: false
            }
          }
        }
      ]
    },
    modelsInfo: {
      handler: 'src/functions/ai/models.handler',
      description: 'AI models information and health checks',
      events: [
        {
          http: {
            method: 'get',
            path: 'ai/models',
            cors: {
              origin: '*',
              headers: [
                'Content-Type',
                'X-Amz-Date',
                'Authorization',
                'X-Api-Key',
                'X-Amz-Security-Token',
                'X-Amz-User-Agent'
              ],
              allowCredentials: false
            }
          }
        }
      ]
    },
    modelHealth: {
      handler: 'src/functions/ai/models.handler',
      description: 'Individual model health check',
      events: [
        {
          http: {
            method: 'get',
            path: 'ai/models/{model}/health',
            cors: {
              origin: '*',
              headers: [
                'Content-Type',
                'X-Amz-Date',
                'Authorization',
                'X-Api-Key',
                'X-Amz-Security-Token',
                'X-Amz-User-Agent'
              ],
              allowCredentials: false
            }
          }
        }
      ]
    },
    allModelsHealth: {
      handler: 'src/functions/ai/models.handler',
      description: 'All models health check',
      events: [
        {
          http: {
            method: 'post',
            path: 'ai/models/health',
            cors: {
              origin: '*',
              headers: [
                'Content-Type',
                'X-Amz-Date',
                'Authorization',
                'X-Api-Key',
                'X-Amz-Security-Token',
                'X-Amz-User-Agent'
              ],
              allowCredentials: false
            }
          }
        }
      ]
    },
    // Health check
    ping: {
      handler: 'src/functions/health/ping.handler',
      description: 'Health check endpoint',
      events: [
        {
          http: {
            method: 'get',
            path: 'health/ping',
            cors: {
              origin: '*',
              headers: [
                'Content-Type',
                'X-Amz-Date',
                'Authorization',
                'X-Api-Key',
                'X-Amz-Security-Token',
                'X-Amz-User-Agent'
              ],
              allowCredentials: false
            }
          }
        }
      ]
    }
  },
  resources: {
    Resources: {
      // DynamoDB Table for conversation history
      ConversationsTable: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          TableName: '${self:service}-conversations-${self:provider.stage}',
          BillingMode: 'PAY_PER_REQUEST',
          AttributeDefinitions: [
            {
              AttributeName: 'PK',
              AttributeType: 'S'
            },
            {
              AttributeName: 'SK',
              AttributeType: 'S'
            },
            {
              AttributeName: 'GSI1PK',
              AttributeType: 'S'
            },
            {
              AttributeName: 'GSI1SK',
              AttributeType: 'S'
            }
          ],
          KeySchema: [
            {
              AttributeName: 'PK',
              KeyType: 'HASH'
            },
            {
              AttributeName: 'SK',
              KeyType: 'RANGE'
            }
          ],
          GlobalSecondaryIndexes: [
            {
              IndexName: 'GSI1',
              KeySchema: [
                {
                  AttributeName: 'GSI1PK',
                  KeyType: 'HASH'
                },
                {
                  AttributeName: 'GSI1SK',
                  KeyType: 'RANGE'
                }
              ],
              Projection: {
                ProjectionType: 'ALL'
              }
            }
          ],
          PointInTimeRecoverySpecification: {
            PointInTimeRecoveryEnabled: true
          },
          Tags: [
            {
              Key: 'Service',
              Value: '${self:service}'
            },
            {
              Key: 'Stage',
              Value: '${self:provider.stage}'
            },
            {
              Key: 'Project',
              Value: 'ApptegaComplianceCopilot'
            }
          ]
        }
      },
      // S3 Bucket for static assets
      StaticAssetsBucket: {
        Type: 'AWS::S3::Bucket',
        Properties: {
          BucketName: '${self:service}-static-${self:provider.stage}',
          PublicAccessBlockConfiguration: {
            BlockPublicAcls: false,
            BlockPublicPolicy: false,
            IgnorePublicAcls: false,
            RestrictPublicBuckets: false
          },
          WebsiteConfiguration: {
            IndexDocument: 'index.html',
            ErrorDocument: 'error.html'
          },
          CorsConfiguration: {
            CorsRules: [
              {
                AllowedHeaders: ['*'],
                AllowedMethods: ['GET', 'HEAD'],
                AllowedOrigins: ['*'],
                MaxAge: 3000
              }
            ]
          },
          Tags: [
            {
              Key: 'Service',
              Value: '${self:service}'
            },
            {
              Key: 'Stage',
              Value: '${self:provider.stage}'
            }
          ]
        }
      }
    },
    Outputs: {
      ApiGatewayRestApiId: {
        Value: {
          Ref: 'ApiGatewayRestApi'
        },
        Export: {
          Name: '${self:service}-${self:provider.stage}-ApiGatewayRestApiId'
        }
      },
      ApiGatewayRestApiRootResourceId: {
        Value: {
          'Fn::GetAtt': ['ApiGatewayRestApi', 'RootResourceId']
        },
        Export: {
          Name: '${self:service}-${self:provider.stage}-ApiGatewayRestApiRootResourceId'
        }
      },
      ConversationsTableName: {
        Value: {
          Ref: 'ConversationsTable'
        },
        Export: {
          Name: '${self:service}-${self:provider.stage}-ConversationsTableName'
        }
      },
      StaticAssetsBucketName: {
        Value: {
          Ref: 'StaticAssetsBucket'
        },
        Export: {
          Name: '${self:service}-${self:provider.stage}-StaticAssetsBucketName'
        }
      }
    }
  },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ['aws-sdk'],
      target: 'node20',
      define: { 'require.resolve': undefined },
      platform: 'node',
      concurrency: 10,
      watch: {
        pattern: ['src/**/*.ts'],
        ignore: ['temp/**/*']
      }
    },
    'serverless-offline': {
      httpPort: 3000,
      babelOptions: {
        presets: ['env']
      }
    }
  }
};

module.exports = serverlessConfiguration;
