"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCouponStore } from "@/store/useCouponStore";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import React, { useEffect, useRef } from "react";
import { toast } from "sonner";

const SuperAdminCouponsListingPage = () => {
  const { couponList, isLoading, fetchAllCoupons, deleteCoupon } =
    useCouponStore();
  const router = useRouter();
  const fetchCouponRef = useRef(false);

  useEffect(() => {
    if (!fetchCouponRef.current) {
      fetchAllCoupons();
      fetchCouponRef.current = true;
    }
  }, [fetchAllCoupons]);

  const handleDeleteCoupon = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this coupon?")) {
      const result = await deleteCoupon(id);
      if (result) {
        toast.success("Coupon deleted successfully");
        fetchAllCoupons();
      }
    }
  };

  if (isLoading) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-6">
        <header className="flex items-center justify-between">
          <h1>All Coupons</h1>
          <Button onClick={() => router.push("/super-admin/coupons/add")}>
            Add New Coupon
          </Button>
        </header>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {couponList.map((coupon) => (
              <TableRow key={coupon.id}>
                <TableCell>
                  <p className="font-semibold">{coupon.code}</p>
                </TableCell>
                <TableCell>
                  <p>{coupon.discountPercent}%</p>
                </TableCell>
                <TableCell>
                  <p>
                    {coupon.usageCount}/{coupon.usageLimit}
                  </p>
                </TableCell>
                <TableCell>
                  {format(new Date(coupon.startDate), "dd MMM yyyy")}
                </TableCell>
                <TableCell>
                  {format(new Date(coupon.endDate), "dd MMM yyyy")}
                </TableCell>
                <TableCell>
                  <Badge>
                    {new Date(coupon.endDate) > new Date()
                      ? "Active"
                      : "Expired"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    onClick={() => handleDeleteCoupon(coupon.id)}
                    variant="ghost"
                    size={"sm"}
                    className="text-red-500 hover:bg-red-500/10 focus:ring-red-500/50 focus:ring-offset-red-500/10 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default SuperAdminCouponsListingPage;
