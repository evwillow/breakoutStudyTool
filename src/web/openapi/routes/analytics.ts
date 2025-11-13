/**
 * @fileoverview OpenAPI schema definitions for the analytics API route.
 * @module src/web/openapi/routes/analytics.ts
 * @dependencies openapi3-ts, @/openapi/createDocument
 */
import { OpenAPIObject, SchemaObject } from "openapi3-ts";

import type { DocumentOptions } from "@/openapi/createDocument";

const percentageSchema: SchemaObject = {
  type: "number",
  format: "float",
  minimum: 0,
  maximum: 100,
};

const userMetricsSchema: SchemaObject = {
  type: "object",
  required: [
    "userId",
    "email",
    "segment",
    "totalRounds",
    "completedRounds",
    "totalMatches",
    "averageAccuracy",
    "daysSinceSignUp",
    "daysSinceLastActivity",
    "activationTime",
    "isActive",
    "signUpDate",
  ],
  properties: {
    userId: { type: "string", description: "UUID of the user." },
    email: { type: "string", format: "email" },
    segment: {
      type: "string",
      enum: ["power", "active", "casual", "one-time", "churned", "new"],
    },
    totalRounds: { type: "integer", minimum: 0 },
    completedRounds: { type: "integer", minimum: 0 },
    totalMatches: { type: "integer", minimum: 0 },
    averageAccuracy: percentageSchema,
    daysSinceSignUp: { type: "integer", minimum: 0 },
    daysSinceLastActivity: { type: "integer", minimum: 0, nullable: true },
    activationTime: { type: "integer", minimum: 0, description: "Days until first completed round." },
    isActive: { type: "boolean" },
    lastActivityDate: { type: "string", format: "date-time", nullable: true },
    signUpDate: { type: "string", format: "date-time" },
  },
};

const segmentDefinitionSchema: SchemaObject = {
  type: "object",
  required: ["type", "name", "description", "criteria", "color"],
  properties: {
    type: {
      type: "string",
      enum: ["power", "active", "casual", "one-time", "churned", "new"],
    },
    name: { type: "string" },
    description: { type: "string" },
    criteria: { type: "string" },
    targetPercentage: {
      type: "object",
      required: ["min", "max"],
      properties: {
        min: percentageSchema,
        max: percentageSchema,
      },
      nullable: true,
    },
    color: { type: "string" },
  },
};

const analyticsResponseSchema: SchemaObject = {
  type: "object",
  required: [
    "totalUsers",
    "verifiedUsers",
    "activeUsers",
    "powerUsers",
    "activeUserSegment",
    "casualUsers",
    "oneTimeUsers",
    "churnedUsers",
    "activationRate",
    "averageActivationTime",
    "completionRate",
    "averageRoundsPerUser",
    "averageMatchesPerUser",
    "averageAccuracy",
    "day1Retention",
    "day7Retention",
    "day30Retention",
    "weeklyActiveUsers",
    "monthlyActiveUsers",
    "signUpToFirstRound",
    "firstToSecondRoundRate",
    "secondToThirdRoundRate",
    "thirdToPowerUserRate",
    "datasetUsage",
    "usersByWeek",
    "activityByWeek",
    "userDetails",
    "topPerformers",
    "atRiskUsers",
    "segmentDefinitions",
  ],
  properties: {
    totalUsers: { type: "integer", minimum: 0 },
    verifiedUsers: { type: "integer", minimum: 0 },
    activeUsers: { type: "integer", minimum: 0 },
    powerUsers: { type: "integer", minimum: 0 },
    activeUserSegment: { type: "integer", minimum: 0 },
    casualUsers: { type: "integer", minimum: 0 },
    oneTimeUsers: { type: "integer", minimum: 0 },
    churnedUsers: { type: "integer", minimum: 0 },
    activationRate: percentageSchema,
    averageActivationTime: { type: "number", format: "float" },
    completionRate: percentageSchema,
    averageRoundsPerUser: { type: "number", format: "float" },
    averageMatchesPerUser: { type: "number", format: "float" },
    averageAccuracy: percentageSchema,
    day1Retention: percentageSchema,
    day7Retention: percentageSchema,
    day30Retention: percentageSchema,
    weeklyActiveUsers: { type: "integer", minimum: 0 },
    monthlyActiveUsers: { type: "integer", minimum: 0 },
    signUpToFirstRound: { type: "integer", minimum: 0 },
    firstToSecondRoundRate: percentageSchema,
    secondToThirdRoundRate: percentageSchema,
    thirdToPowerUserRate: percentageSchema,
    datasetUsage: {
      type: "object",
      additionalProperties: { type: "integer", minimum: 0 },
      description: "Counts of dataset usage keyed by dataset identifier.",
    },
    usersByWeek: {
      type: "object",
      additionalProperties: { type: "integer", minimum: 0 },
      description: "Weekly user counts keyed by ISO week (e.g., 2024-W10).",
    },
    activityByWeek: {
      type: "object",
      additionalProperties: { type: "integer", minimum: 0 },
      description: "Weekly match counts keyed by ISO week.",
    },
    userDetails: {
      type: "array",
      items: userMetricsSchema,
    },
    topPerformers: {
      type: "array",
      items: userMetricsSchema,
    },
    atRiskUsers: {
      type: "array",
      items: userMetricsSchema,
    },
    segmentDefinitions: {
      type: "object",
      additionalProperties: segmentDefinitionSchema,
    },
  },
};

const errorResponseSchema: SchemaObject = {
  type: "object",
  required: ["error"],
  properties: {
    error: { type: "string" },
  },
};

export function getAnalyticsDocumentation(): DocumentOptions {
  const paths: OpenAPIObject["paths"] = {
    "/api/analytics": {
      get: {
        operationId: "getAnalytics",
        tags: ["Analytics"],
        summary: "Retrieve comprehensive platform analytics",
        description:
          "Returns aggregated user engagement, retention, and dataset usage metrics for the admin analytics dashboard.",
        security: [{ sessionToken: [] }],
        responses: {
          200: {
            description: "Analytics metrics retrieved successfully.",
            content: {
              "application/json": {
                schema: analyticsResponseSchema,
                examples: {
                  success: {
                    value: {
                      totalUsers: 1280,
                      verifiedUsers: 970,
                      activeUsers: 420,
                      powerUsers: 96,
                      activeUserSegment: 315,
                      casualUsers: 210,
                      oneTimeUsers: 180,
                      churnedUsers: 89,
                      activationRate: 68.5,
                      averageActivationTime: 3.2,
                      completionRate: 74.1,
                      averageRoundsPerUser: 6.4,
                      averageMatchesPerUser: 42.7,
                      averageAccuracy: 61.3,
                      day1Retention: 41.2,
                      day7Retention: 28.6,
                      day30Retention: 14.9,
                      weeklyActiveUsers: 520,
                      monthlyActiveUsers: 890,
                      signUpToFirstRound: 860,
                      firstToSecondRoundRate: 55.4,
                      secondToThirdRoundRate: 38.9,
                      thirdToPowerUserRate: 12.3,
                      datasetUsage: {
                        "quality_breakouts/AAPL": 312,
                        "quality_breakouts/MSFT": 287,
                      },
                      usersByWeek: {
                        "2024-W09": 380,
                        "2024-W10": 412,
                      },
                      activityByWeek: {
                        "2024-W09": 1480,
                        "2024-W10": 1594,
                      },
                      userDetails: [
                        {
                          userId: "44f9c2bb-3a11-4a18-a0fb-3e1f7b2f1a7c",
                          email: "power.user@example.com",
                          segment: "power",
                          totalRounds: 56,
                          completedRounds: 54,
                          totalMatches: 640,
                          averageAccuracy: 78.4,
                          daysSinceSignUp: 210,
                          daysSinceLastActivity: 3,
                          activationTime: 1,
                          isActive: true,
                          lastActivityDate: "2024-03-15T12:34:00.000Z",
                          signUpDate: "2023-08-17T10:12:00.000Z",
                        },
                      ],
                      topPerformers: [],
                      atRiskUsers: [],
                      segmentDefinitions: {
                        power: {
                          type: "power",
                          name: "Power Users",
                          description: "Highly engaged, frequent users who represent your most valuable user base",
                          criteria: "10+ completed rounds",
                          targetPercentage: { min: 5, max: 10 },
                          color: "purple",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          500: {
            description: "Analytics service failed to respond.",
            content: {
              "application/json": {
                schema: errorResponseSchema,
                examples: {
                  error: {
                    value: { error: "Failed to fetch analytics data" },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  const components: OpenAPIObject["components"] = {
    schemas: {
      AnalyticsResponse: analyticsResponseSchema,
      UserMetrics: userMetricsSchema,
      SegmentDefinition: segmentDefinitionSchema,
      ErrorResponse: errorResponseSchema,
    },
  };

  const tags: OpenAPIObject["tags"] = [
    {
      name: "Analytics",
      description: "Endpoints that expose reporting and engagement metrics for administrators.",
    },
  ];

  return { paths, components, tags };
}
