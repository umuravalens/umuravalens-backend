import { Router } from "express";
import { getScreeningResults, getScreeningStatus, listScreenings, runScreening } from "../controllers/screeningController";

const router = Router();

router.post("/screenings/run", runScreening);
router.get("/screenings", listScreenings);
router.get("/screenings/:id/status", getScreeningStatus);
router.get("/screenings/:id/results", getScreeningResults);

export default router;
