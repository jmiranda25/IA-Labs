import { Router, type IRouter } from "express";
import healthRouter from "./health";
import publicRouter from "./public";
import usersRouter from "./users";
import eventsRouter from "./events";
import forumRouter from "./forum";
import resourcesRouter from "./resources";
import marketplaceRouter from "./marketplace";
import notificationsRouter from "./notifications";
import adminRouter from "./admin";
import reportsRouter from "./reports";
import communityRouter from "./community";
import landingRouter from "./landing";
import storageRouter from "./storage";
import webhooksRouter from "./webhooks";
import seoRouter from "./seo";

const router: IRouter = Router();

router.use(seoRouter);
router.use(healthRouter);
router.use(publicRouter);
router.use(communityRouter);
router.use(webhooksRouter);
router.use(usersRouter);
router.use(eventsRouter);
router.use(forumRouter);
router.use(resourcesRouter);
router.use(marketplaceRouter);
router.use(notificationsRouter);
router.use(adminRouter);
router.use(reportsRouter);
router.use(landingRouter);
router.use(storageRouter);

export default router;
