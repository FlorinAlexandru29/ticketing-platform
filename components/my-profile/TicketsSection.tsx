// components/my-profile/TicketsSection.tsx
export default function TicketsSection() {
  return (
    <section className="rounded-2xl border shadow-sm p-5">
      <h3 className="text-base font-semibold">Tickets</h3>
      <p className="mt-2 text-sm opacity-80">
        You don’t have any tickets yet.
      </p>
      {/* Future: render a grid/list of tickets from your DB */}
    </section>
  );
}
