import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import cloudinary from "../config/cloudinary";
import { prisma } from "../server";
import fs from "fs";
import { Prisma } from "@prisma/client";
import { orderBy } from "lodash";

// create new product
export const createProduct = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      name,
      brand,
      description,
      category,
      gender,
      sizes,
      colors,
      price,
      stock,
    } = req.body;

    const files = req.files as Express.Multer.File[];

    // upload all image to cloudinary
    const uploadImages = files.map((file) =>
      cloudinary.uploader.upload(file.path, {
        folder: "ecommerce",
      })
    );

    const uploadResults = await Promise.all(uploadImages);
    const imageUrls = uploadResults.map((result) => result.secure_url);

    // create product
    const newProduct = await prisma.product.create({
      data: {
        name,
        brand,
        description,
        category,
        gender,
        sizes: sizes.split(","),
        colors: colors.split(","),
        price: parseFloat(price),
        stock: parseInt(stock),
        images: imageUrls,
        soldCount: 0,
        rating: 0,
      },
    });

    // clean up the uploaded files
    files.forEach((file) => {
      if (file.path) fs.unlinkSync(file.path);
      else return;
    });
    res.status(201).json(newProduct);
  } catch (error) {
    console.error("Error in creating product:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error!",
    });
  }
};

// fetch all products for admin
export const fetchAllProductForAdmin = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const fetchAllProducts = await prisma.product.findMany();
    res.status(200).json(fetchAllProducts);
  } catch (error) {
    console.error("Error in fetching product for admin:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error!",
    });
  }
};

// get a single product
export const getProductById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      res.status(404).json({
        success: false,
        message: "Product not found!",
      });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error("Error in fetching product details:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error!",
    });
  }
};

// update a product (admin)
export const updateProduct = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      brand,
      description,
      category,
      gender,
      sizes,
      colors,
      price,
      stock,
      rating,
    } = req.body;

    // const files = req.files as Express.Multer.File[];
    // // upload all image to cloudinary
    // const uploadImages = files.map((file) =>
    //   cloudinary.uploader.upload(file.path, {
    //     folder: "ecommerce",
    //   })
    // );

    // const uploadResults = await Promise.all(uploadImages);
    // const imageUrls = uploadResults.map((result) => result.secure_url);

    // update product
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name,
        brand,
        description,
        category,
        gender,
        sizes: sizes.split(","),
        colors: colors.split(","),
        price: parseFloat(price),
        stock: parseInt(stock),
        rating: parseFloat(rating),
      },
    });

    // clean up the uploaded files
    // files.forEach((file) => fs.unlinkSync(file.path));
    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error("Error in updating product by admin:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error!",
    });
  }
};

// delete a product (admin)
export const delteProduct = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.product.delete({
      where: { id },
    });
    res
      .status(200)
      .json({ success: true, message: "Product deleted successfully!" });
  } catch (error) {
    console.error("Error in deleting product by admin:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error!",
    });
  }
};

// fetch product with filter (client)
export const getProductForClient = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const categories = ((req.query.categories as string) || "")
      .split(",")
      .filter(Boolean);
    const brands = ((req.query.brands as string) || "")
      .split(",")
      .filter(Boolean);
    const sizes = ((req.query.sizes as string) || "")
      .split(",")
      .filter(Boolean);
    const colors = ((req.query.colors as string) || "")
      .split(",")
      .filter(Boolean);

    const minPrice = parseFloat(req.query.minPrice as string) || 0;
    const maxPrice =
      parseFloat(req.query.maxPrice as string) || Number.MAX_SAFE_INTEGER;

    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortOrder = (req.body.sortOrder as "asc" | "desc") || "desc";

    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      AND: [
        categories.length > 0
          ? {
              category: {
                in: categories,
                mode: "insensitive",
              },
            }
          : {},
        brands.length > 0
          ? {
              brand: {
                in: brands,
                mode: "insensitive",
              },
            }
          : {},
        sizes.length > 0
          ? {
              sizes: {
                hasSome: sizes,
              },
            }
          : {},
        colors.length > 0
          ? {
              colors: {
                hasSome: colors,
              },
            }
          : {},
        {
          price: { gte: minPrice, lte: maxPrice },
        },
      ],
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),

      prisma.product.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      products,
      currentPage: page,
      totalPage: Math.ceil(total / limit),
      totalProducts: total,
    });
  } catch (error) {
    console.error("Error in fetching product:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error!",
    });
  }
};
