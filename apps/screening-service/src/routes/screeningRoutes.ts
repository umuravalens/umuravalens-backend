import { Router } from "express";
import { deleteScreening, getScreeningResults, getScreeningStatus, listScreenings, runScreening, stopScreening } from "../controllers/screeningController";

const router = Router();

router.post("/screenings/run", runScreening);
router.get("/screenings", listScreenings);
router.get("/screenings/:id/status", getScreeningStatus);
router.get("/screenings/:id/results", getScreeningResults);
router.post("/screenings/:id/stop", stopScreening);
router.delete("/screenings/:id", deleteScreening);

export default router;
