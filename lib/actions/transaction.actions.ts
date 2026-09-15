"use server";

import { ID, Query } from "node-appwrite";

import { createAdminClient } from "../server/appwrite";

import { parseStringify } from "../utils";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_TRANSACTION_COLLECTION_ID: TRANSACTION_COLLECTION_ID,
} = process.env;

export const createTransaction = async (
  transaction: CreateTransactionProps,
) => {
  try {
    const { database } = await createAdminClient();

    const newTransaction = await database.createRow(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      ID.unique(),
      {
        channel: "online",
        category: "Transfer",
        ...transaction,
      },
    );

    return parseStringify(newTransaction);
  } catch (error) {
    console.log("Error creating transaction:", error);
  }
};

export const getTransactionsByBankId = async ({
  bankId,
}: getTransactionsByBankIdProps) => {
  try {
    const { database } = await createAdminClient();

    const senderTransactions = await database.listRows(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      [Query.equal("senderBankId", [bankId])],
    );

    const receiverTransactions = await database.listRows(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      [Query.equal("receiverBankId", [bankId])],
    );

    const transactions = {
      total: senderTransactions.total + receiverTransactions.total,

      rows: [...senderTransactions.rows, ...receiverTransactions.rows],
    };

    return parseStringify(transactions);
  } catch (error) {
    console.log("Error getting transactions:", error);
  }
};
