import { Navbar } from "@/components/layouts/navbar";
import { Footer } from "@/components/layouts/footer";

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">{children}</main>
      <Footer />
    </>
  );
}
