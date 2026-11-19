import { defineRailway, project, service } from "railway/iac";

export default defineRailway(() => {
  const api = service("api", {
    build: { buildEnvironment: "V3", builder: "RAILPACK", buildCommand: "npm run build" },
    deploy: {
      preDeployCommand: ["npx prisma migrate deploy"],
      startCommand: "node dist/main.js",
      healthcheckPath: "/api/v1/salud",
      healthcheckTimeout: 60,
      restartPolicyType: "ON_FAILURE",
      restartPolicyMaxRetries: 5,
    },
    domains: ["cafe-api.multilabs.dev"],
    replicas: { "us-east4-eqdc4a": 1 },
  });

  return project("cafe-la-esquina-api", {
    variables: { managed: false },
    resources: [api],
  });
});
