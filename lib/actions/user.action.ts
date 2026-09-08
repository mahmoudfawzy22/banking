"use server";

import { cookies } from "next/headers";
import { createAdminClient, createSessionClient } from "../server/appwrite";
import { parseStringify } from "../utils";
import { ID } from "node-appwrite";

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

    return parseStringify(session);
  } catch (error) {
    console.log("Error", error);
  }
};

export const signUp = async (userData: SignUpParams) => {
  const { email, password, firstName, lastName } = userData;

  try {
    const { account } = await createAdminClient();

    const newUserAccount = await account.create({
      userId: ID.unique(),
      email,
      password,
      name: `${firstName} ${lastName}`,
    });

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
    return parseStringify(newUserAccount);
  } catch (error) {
    console.log("Error", error);
  }
};

// ... your initilization functions

export async function getLoggedInUser() {
  try {
    const { account } = await createSessionClient();

    const user = await account.get();

    return parseStringify(user);
  } catch (error) {
    console.log("getLoggedInUser error:", error);
    return null;
  }
}

export const logoutAccount = async () => {
  try {
    const { account } = await createSessionClient();

    // Delete the current Appwrite session
    await account.deleteSession("current");

    // Delete the session cookie
    cookies().delete("appwrite-session");

    return {
      success: true,
    };
  } catch (error) {
    console.log("Logout error:", error);

    return {
      success: false,
    };
  }
};

export default signIn;
