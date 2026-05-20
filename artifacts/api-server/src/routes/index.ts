import { Router, type IRouter } from "express";
import healthRouter from "./health";
import quotesRouter from "./quotes";
import meRouter from "./me";
import stripeRouter from "./stripe";

const router: IRouter = Router();

router.use(healthRouter);
router.use(meRouter);
router.use(quotesRouter);
router.use(stripeRouter);

export default router;
