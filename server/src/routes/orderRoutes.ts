import express from "express";

import { authenticateJwt, isSuperAdmin } from "../middleware/authMiddleware";
import {
  capturePaypalOrder,
  createPaypalOrder,
  createFinalOrder,
  getOrder,
  getOrderByUserId,
  getAllOrdersForAdmin,
  updateOrderStatus,
} from "../controllers/orderController";

const router = express.Router();

router.use(authenticateJwt);

router.post("/create-paypal-order", createPaypalOrder);
router.post("/capture-paypal-order", capturePaypalOrder);
router.post("/create-final-order", createFinalOrder);
router.get("/get-single-order/:orderId", getOrder);
router.get("/get-order-by-user-id", getOrderByUserId);
router.get("/get-all-orders-for-admin", isSuperAdmin, getAllOrdersForAdmin);
router.put("/:orderId/status", isSuperAdmin, updateOrderStatus);

export default router;
