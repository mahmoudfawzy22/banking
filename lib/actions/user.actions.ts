"use server";
import { cookies } from "next/headers";
import { ID, Query } from "node-appwrite";
import {
  CountryCode,
  ProcessorTokenCreateRequest,
  ProcessorTokenCreateRequestProcessorEnum,
  Products,
} from "plaid";
import { revalidatePath } from "next/cache";
import { createAdminClient, createSessionClient } from "../server/appwrite";
import { encryptId, extractCustomerIdFromUrl, parseStringify } from "../utils";
import { plaidClient } from "../pliad/plaid";
import { addFundingSource, createDwollaCustomer } from "./dowalla.actions";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID,
  APPWRITE_BANK_COLLECTION_ID: BANK_COLLECTION_ID,
} = process.env;

export const getUserInfo = async ({ userId }: getUserInfoProps) => {
  try {
    const { database } = await createAdminClient();
    const users = await database.listRows(DATABASE_ID!, USER_COLLECTION_ID!, [
      Query.equal("userId", [userId]),
    ]);
    if (!users.rows.length) {
      console.log("No user found with userId:", userId);
      return null;
    }
    return parseStringify(users.rows[0]);
  } catch (error) {
    console.log("Error getting user:", error);
    return null;
  }
};

const signIn = async ({ email, password }: signInProps) => {
  try {
    const { account } = await createAdminClient();
    const session = await account.createEmailPasswordSession({
      email,
      password,
    });
    cookies().set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });
    const user = await getUserInfo({ userId: session.userId });
    return parseStringify(user);
  } catch (error) {
    console.log("Sign in error:", error);
    return null;
  }
};

export const signUp = async ({ password, ...userData }: SignUpParams) => {
  const { email, firstName, lastName } = userData;
  try {
    const { account, database } = await createAdminClient();
    const newUserAccount = await account.create({
      userId: ID.unique(),
      email,
      password,
      name: `${firstName} ${lastName}`,
    });
    if (!newUserAccount) {
      throw new Error("Error creating user");
    }
    console.log("Dwolla customer data:", {
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      address1: userData.address1,
      city: userData.city,
      state: userData.state,
      postalCode: userData.postalCode,
      dateOfBirth: userData.dateOfBirth,
    });
    const dwollaCustomerUrl = await createDwollaCustomer({
      ...userData,
      type: "personal",
    });
    if (!dwollaCustomerUrl) {
      throw new Error("Error creating Dwolla customer");
    }
    const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);
    const newUser = await database.createRow(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      ID.unique(),
      {
        ...userData,
        userId: newUserAccount.$id,
        dwollaCustomerId,
        dwollaCustomerUrl,
      },
    );
    const session = await account.createEmailPasswordSession({
      email,
      password,
    });
    cookies().set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });
    return parseStringify(newUser);
  } catch (error) {
    console.log("Sign up error:", error);
    return null;
  }
};

export async function getLoggedInUser() {
  try {
    const { account } = await createSessionClient();
    const result = await account.get();
    const user = await getUserInfo({ userId: result.$id });
    return parseStringify(user);
  } catch (error) {
    console.log("getLoggedInUser error:", error);
    return null;
  }
}

export const logoutAccount = async () => {
  try {
    const { account } = await createSessionClient();
    await account.deleteSession("current");
    cookies().delete("appwrite-session");
    return { success: true };
  } catch (error) {
    console.log("Logout error:", error);
    cookies().delete("appwrite-session");
    return { success: false };
  }
};

export const createLinkToken = async (user: User) => {
  try {
    const tokenParams = {
      user: { client_user_id: user.$id },
      client_name: `${user.firstName} ${user.lastName}`,
      products: ["auth", "transactions"] as Products[],
      language: "en",
      country_codes: ["US"] as CountryCode[],
    };
    const response = await plaidClient.linkTokenCreate(tokenParams);
    return parseStringify({ linkToken: response.data.link_token });
  } catch (error) {
    console.log("Create link token error:", error);
    return null;
  }
};

export const createBankAccount = async ({
  userId,
  bankId,
  accountId,
  accessToken,
  fundingSourceUrl,
  shareableId,
}: createBankAccountProps) => {
  try {
    console.log("🔥🔥🔥 CREATE BANK ACCOUNT CALLED 🔥🔥🔥");
    const { database } = await createAdminClient();
    console.log("🔥 Creating bank account:", { userId, bankId, accountId });
    const bankAccount = await database.createRow(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      ID.unique(),
      { userId, bankId, accountId, accessToken, fundingSourceUrl, shareableId },
    );
    console.log("✅ Bank account created:", bankAccount);
    return parseStringify(bankAccount);
  } catch (error) {
    console.log("Create bank account error:", error);
    return null;
  }
};

export const exchangePublicToken = async ({
  publicToken,
  user,
}: exchangePublicTokenProps) => {
  try {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });
    if (!accountsResponse.data.accounts.length) {
      throw new Error("No bank accounts found in Plaid");
    }
    const accountData = accountsResponse.data.accounts[0];
    const request: ProcessorTokenCreateRequest = {
      access_token: accessToken,
      account_id: accountData.account_id,
      processor: "dwolla" as ProcessorTokenCreateRequestProcessorEnum,
    };
    const processorTokenResponse =
      await plaidClient.processorTokenCreate(request);
    const processorToken = processorTokenResponse.data.processor_token;
    const fundingSourceUrl = await addFundingSource({
      dwollaCustomerId: user.dwollaCustomerId,
      processorToken,
      bankName: accountData.name,
    });
    if (!fundingSourceUrl) {
      throw new Error("Failed to create Dwolla funding source");
    }
    await createBankAccount({
      userId: user.$id,
      bankId: itemId,
      accountId: accountData.account_id,
      accessToken,
      fundingSourceUrl,
      shareableId: encryptId(accountData.account_id),
    });
    revalidatePath("/");
    return parseStringify({ publicTokenExchange: "complete" });
  } catch (error: any) {
    console.error("========== EXCHANGE TOKEN ERROR ==========");
    console.error("MESSAGE:", error?.message);
    console.error("STATUS:", error?.status);
    console.error("BODY:", error?.body);
    console.error("RESPONSE:", error?.response);
    console.error("FULL ERROR:", error);
    console.error("==========================================");
    return null;
  }
};

export const getBanks = async ({ userId }: getBanksProps) => {
  try {
    console.log("🔥 Getting banks for userId:", userId);
    const { database } = await createAdminClient();
    const banks = await database.listRows(DATABASE_ID!, BANK_COLLECTION_ID!, [
      Query.equal("userId", [userId]),
    ]);

    return parseStringify(banks.rows);
  } catch (error) {
    console.log("❌ Error getting banks:", error);
    return [];
  }
};

export const getBank = async ({ rowId }: getBankProps) => {
  try {
    if (!rowId) {
      console.log("❌ rowId is missing");
      return null;
    }
    const { database } = await createAdminClient();
    const bank = await database.getRow({
      databaseId: DATABASE_ID!,
      tableId: BANK_COLLECTION_ID!,
      rowId,
    });
    return parseStringify(bank);
  } catch (error) {
    console.log("Error getting bank:", error);
    return null;
  }
};

export const getBankByAccountId = async ({
  accountId,
}: getBankByAccountIdProps) => {
  try {
    if (!accountId) {
      console.log("❌ accountId is missing");
      return null;
    }

    const { database } = await createAdminClient();

    const banks = await database.listRows(DATABASE_ID!, BANK_COLLECTION_ID!, [
      Query.equal("accountId", [accountId]),
    ]);

    if (!banks.rows.length) {
      console.log("❌ No bank found with accountId:", accountId);
      return null;
    }

    return parseStringify(banks.rows[0]);
  } catch (error) {
    console.log("Error getting bank:", error);
    return null;
  }
};

export default signIn;
