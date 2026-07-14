import { Router, type IRouter } from "express";
import healthRouter from "./health";
import quotesRouter from "./quotes";
import meRouter from "./me";
import stripeRouter from "./stripe";
import adminTempRouter from "./admin-temp";
import authAdminRouter from "./auth-admin";
import userRecordsRouter from "./userRecords";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(meRouter);
router.use(quotesRouter);
router.use(stripeRouter);
router.use(authAdminRouter);
router.use(userRecordsRouter);
router.use(aiRouter);
router.use(adminTempRouter);

export default router;
