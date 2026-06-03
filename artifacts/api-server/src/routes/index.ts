import { Router, type IRouter } from "express";
import healthRouter from "./health";
import quotesRouter from "./quotes";
import meRouter from "./me";
import stripeRouter from "./stripe";
import adminTempRouter from "./admin-temp";

const router: IRouter = Router();

router.use(healthRouter);
router.use(meRouter);
router.use(quotesRouter);
router.use(stripeRouter);
router.use(adminTempRouter);

export default router;
