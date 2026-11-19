import { fileHref } from "@/lib/classwork";
import { initials } from "@/lib/session";

const SIZES = { sm: "h-8 w-8 text-[11px]", md: "h-10 w-10 text-xs", lg: "h-20 w-20 text-xl" };

/** Foto de perfil o, si no hay, iniciales sobre teal. */
export function Avatar({
  name,
  avatarUrl,
  size = "md",
  tone = "teal",
}: {
  name: string;
  avatarUrl?: string | null;
  size?: keyof typeof SIZES;
  tone?: "teal" | "petrol";
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- archivo privado servido por la API
      <img
        src={fileHref(avatarUrl)}
        alt=""
        className={`${SIZES[size]} shrink-0 rounded-full bg-uach-subtle object-cover`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`${SIZES[size]} grid shrink-0 place-items-center rounded-full font-semibold text-white ${
        tone === "petrol" ? "bg-uach-petrol" : "bg-uach-tealDark"
      }`}
    >
      {initials(name)}
    </span>
  );
}
