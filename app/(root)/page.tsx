import React from "react";
import { redirect } from "next/navigation";

import HeaderBox from "@/components/HeaderBox";
import TotalBalanceBox from "@/components/TotalBalanceBox";
import RightSidebar from "@/components/RightSideBar";

import { getLoggedInUser } from "@/lib/actions/user.actions";
import { getAccount, getAccounts } from "@/lib/actions/bank.actions";

import RecentTransactions from "@/components/RecentTransactions";

const Home = async ({ searchParams: { id, page } }: SearchParamProps) => {
  const loggedIn = await getLoggedInUser();

  if (!loggedIn) {
    redirect("/sign-in");
  }

  const currentPage = Number(page as string) || 1;

  const accounts = await getAccounts({
    userId: loggedIn.$id,
  });

  if (!accounts) return null;

  const accountsData = accounts?.data ?? [];

  const appwriteItemId = accountsData[0]?.appwriteItemId;

  const account = appwriteItemId ? await getAccount({ appwriteItemId }) : null;

  return (
    <section className="home">
      <div className="home-content">
        <header className="home-header">
          <HeaderBox
            type="greeting"
            title="Welcome"
            user={loggedIn?.firstName || "Guest"}
            subtext="Access and manage your account and transactions efficiently"
          />

          <TotalBalanceBox
            accounts={accountsData}
            totalBanks={accounts?.totalBanks}
            totalCurrentBalance={accounts?.totalCurrentBalance}
          />
        </header>

        <RecentTransactions
          accounts={accountsData}
          transactions={account?.transactions}
          appwriteItemId={appwriteItemId}
          page={currentPage}
        />
      </div>

      <RightSidebar
        user={loggedIn}
        transactions={account?.transactions}
        banks={accountsData}
      />
    </section>
  );
};

export default Home;
