import React from "react";
import HeaderBox from "../../../components/HeaderBox";
import PaymentTransferForm from "@/components/paymentTransferForm";
import { getAccount, getAccounts } from "@/lib/actions/bank.actions";
import { getLoggedInUser } from "@/lib/actions/user.actions";
async function Transfer() {
  const loggedIn = await getLoggedInUser();
  if (!loggedIn) {
    // not authenticated — handle redirect or empty state as your app does elsewhere
    return null;
  }

  const accounts = await getAccounts({ userId: loggedIn.$id });

  if (!accounts) return null;

  const accountsData = accounts?.data ?? [];

  // Only fetch a specific account if the user actually has at least one linked bank
  const appwriteItemId = accountsData[0]?.appwriteItemId;

  const account = appwriteItemId ? await getAccount({ appwriteItemId }) : null;
  return (
    <section className="payment-transfer">
      <HeaderBox
        title="Payment Transfer"
        subtext="please provide any specific details or notes related to the payment transfer"
      />
      <section className="size-full pt-5">
        <PaymentTransferForm accounts={accountsData} />
      </section>
    </section>
  );
}

export default Transfer;
