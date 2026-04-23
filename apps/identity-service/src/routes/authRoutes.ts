import { Router } from "express";
import {
  changePassword,
  forgotPassword,
  googleAuth,
  loginUser,
  logout,
  logoutAll,
  me,
  refreshAccessToken,
  registerUser,
  resendVerification,
  resetPassword,
  updateProfile,
  verifyEmail,
  getUserInternal
} from "../controllers/authController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google", googleAuth);
router.post("/refresh-token", refreshAccessToken);
router.post("/forgot-password", forgotPassword);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/reset-password", resetPassword);
router.get("/me", authenticate, me);
router.patch("/me", authenticate, updateProfile);
router.patch("/change-password", authenticate, changePassword);
router.post("/logout", authenticate, logout);
router.post("/logout-all", authenticate, logoutAll);
router.get("/internal/users/:id", getUserInternal);

export default router;
