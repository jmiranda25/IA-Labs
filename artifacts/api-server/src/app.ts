import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { env } from "./env";

const app: Express = express();

// Trust Railway's reverse proxy so express-rate-limit sees the real client IP
// from X-Forwarded-For instead of always blocking the proxy's IP.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  helmet({
    // Allow inline scripts/styles needed by the SPA served through the same origin
    contentSecurityPolicy: false,
  }),
);

const allowedOrigins = env.FRONTEND_URL
  ? [env.FRONTEND_URL]
  : true; // permissive in development

app.use(
  cors({
    credentials: true,
    origin: allowedOrigins,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
