"use client";

import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import CheckoutSuspense from "./checkoutSkeleton";

function CheckoutPage() {
  const options = {
    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
  };

  return (
    <PayPalScriptProvider options={options}>
      <CheckoutSuspense />
    </PayPalScriptProvider>
  );
}

export default CheckoutPage;
