import Navbar from "@/components/Navbar";
import CreateEventShell from "./Create-EventShell";
import { ar } from "zod/locales";





export default function CreateEventPage() {




  return (
    <main className="min-h-dvh h-dvh flex flex-col bg-base-100 overflow-hidden"

      style={{ ['--pad' as any]: 'clamp(1rem, 3dvh, 1.5rem)' }}>
      <Navbar/>
      <CreateEventShell />
      
    </main>
  );
}
/* End */
