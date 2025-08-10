import { redirect } from "next/navigation";

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const code = searchParams?.error ?? "Unknown";
  return (
    <main className="p-8 max-w-xl mx-auto">
      <h1 className="text-xl font-semibold">Sign-in Error</h1>
      <p className="mt-2">Error code: <code className="px-1 py-0.5 bg-black/5 rounded">{code}</code></p>
      <ul className="mt-4 list-disc pl-5 text-sm opacity-90">
        <li>Ensure NEXTAUTH_URL matches this site’s origin.</li>
        <li>Ensure Spotify Redirect URI matches exactly (see checklist).</li>
        <li>Confirm DATABASE_URL and Prisma migrations are applied.</li>
      </ul>
    </main>
  );
}
