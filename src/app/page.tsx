// src/app/page.tsx
import { redirect } from "next/navigation";

// Root redirects to marketplace
export default function HomePage() {
  redirect("/marketplace");
}
