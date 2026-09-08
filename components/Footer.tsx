import { logoutAccount } from "@/lib/actions/user.action";
import Image from "next/image";
import { useRouter } from "next/navigation";

function Footer({ user, type = "desktop" }: FooterProps) {
  const router = useRouter();
  async function handleLogout() {
    const loggedOut = await logoutAccount();
    if (loggedOut) router.push("/sign-in");
  }
  const firstLetter = user?.name
    ?.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .trim()
    .charAt(0);
  return (
    <footer className="footer">
      <div className={type === "mobile" ? "footer_name-mobile" : "footer_name"}>
        <p className="text-xl font-bold text-gray-700">{firstLetter}</p>
      </div>

      <div
        className={type === "mobile" ? "footer_email-mobile" : "footer_email"}
      >
        <h1 className="text-14 truncate font-normal text-gray-700 font-semibold">
          {user?.name}
        </h1>
        <p className="text-14 truncate font-normal text-gray-600">
          {user?.email}
        </p>
      </div>
      <div className="footer_image">
        <Image
          src="icons/logout.svg"
          fill
          alt="logout"
          onClick={handleLogout}
        />
      </div>
    </footer>
  );
}
export default Footer;
