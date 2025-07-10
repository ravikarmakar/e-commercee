import axios from "axios";
import { NextFunction, Response } from "express";
import { v4 as uuidv4 } from "uuid";

import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { prisma } from "../server";

const getPlaypalAccessToken = async () => {
  const response = await axios.post(
    "https://api-m.sandbox.paypal.com/v1/oauth2/token",
    "grant_type=client_credentials",
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
        ).toString("base64")}`,
      },
    }
  );

  return response.data.access_token;
};

export const createPaypalOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { items, total } = req.body;
    const accessToken = await getPlaypalAccessToken();

    const paypalItems = items.map((item: any) => ({
      name: item.name,
      description: item.description,
      sku: item.sku,
      quantity: item.quantity.toString(),
      unit_amount: {
        currency_code: "USD",
        value: item.price.toFixed(2),
      },
      category: "PHYSICAL_GOODS",
    }));

    const itemTotal = paypalItems.reduce(
      (sum: any, item: any) =>
        sum + parseFloat(item.unit_amount.value) * parseInt(item.quantity),
      0
    );

    const response = await axios.post(
      "https://api-m.sandbox.paypal.com/v2/checkout/orders",
      {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: total.toFixed(2),
              breakdown: {
                item_total: {
                  currency_code: "USD",
                  value: itemTotal.toFixed(2),
                },
              },
            },
            items: paypalItems,
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "paypal-request-id": uuidv4(),
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error creating PayPal order:", error);
    res.status(500).json({ message: "Internal server error", success: false });
  }
};

export const capturePaypalOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { orderId } = req.body;
    const accessToken = await getPlaypalAccessToken();

    const response = await axios.post(
      `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error captureing PayPal order:", error);
    res.status(500).json({ message: "Internal server error", success: false });
  }
};

export const createFinalOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { items, addressId, couponId, total, paymentId } = req.body;
    const userId = req.user?.userId;
    if (!userId) {
      res.status(400).json({ message: "Unauthenticated user", success: false });
      return;
    }

    // start a transaction
    const order = await prisma.$transaction(async (prisma) => {
      const newOrder = await prisma.order.create({
        data: {
          userId,
          addressId,
          couponId,
          total,
          paymentMethod: "CREDIT_CARD",
          paymentStatus: "COMPLETED",
          paymentId,
          item: {
            create: items.map((item: any) => ({
              productId: item.productId,
              productName: item.productName,
              productCategory: item.productCategory,
              quantity: item.quantity,
              size: item.size,
              color: item.color,
              price: item.price,
            })),
          },
        },
        include: {
          item: true,
        },
      });

      for (const item of items) {
        const product = await prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
            soldCount: { increment: item.quantity },
          },
        });
      }

      await prisma.cartItem.deleteMany({
        where: { cart: { userId } },
      });

      await prisma.cart.delete({
        where: { userId },
      });

      if (couponId) {
        await prisma.coupon.update({
          where: { id: couponId },
          data: { usageCount: { increment: 1 } },
        });
      }

      return newOrder;
    });

    res.status(201).json(order);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Internal server error", success: false });
  }
};

export const getOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const orderId = req.params.id;

    if (!userId) {
      res.status(400).json({ message: "Unauthenticated user", success: false });
      return;
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        item: true,
        address: true,
        coupon: true,
      },
    });

    res.status(200).json(order);
  } catch (error) {
    console.error("Error getting order:", error);
    res.status(500).json({ message: "Internal server error", success: false });
  }
};

export const updateOrderStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { orderId } = req.params;
    const { status } = req.body;

    if (!userId) {
      res.status(400).json({ message: "Unauthenticated user", success: false });
      return;
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });

    res.status(200).json({
      message: "Order status updated successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Internal server error", success: false });
  }
};

export const getAllOrdersForAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(400).json({ message: "Unauthenticated user", success: false });
      return;
    }

    const orders = await prisma.order.findMany({
      include: {
        item: true,
        address: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(200).json(orders);
  } catch (error) {
    console.error("Error getAll orders for admin:", error);
    res.status(500).json({ message: "Internal server error", success: false });
  }
};

export const getOrderByUserId = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(400).json({ message: "Unauthenticated user", success: false });
      return;
    }

    const orders = await prisma.order.findMany({
      where: { userId: userId },
      include: {
        item: true,
        address: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(orders);
  } catch (error) {
    console.error("Error getting order by ID:", error);
    res.status(500).json({ message: "Internal server error", success: false });
  }
};
