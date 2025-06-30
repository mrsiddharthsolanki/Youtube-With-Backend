import { Router } from "express";
import { registerUser } from "../controllers/user.controllers.js";
import multer from "multer";
import { upload } from "../middlewares/multer.middlewares.js";

const router = Router();


router
  .route("/register")
  .post(
    upload.fields([
      { name: "avatar", maxCount: 1 },
      { name: "coverImage", maxCount: 1 },
    ]),
    registerUser
  );

export default router;