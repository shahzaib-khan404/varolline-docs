import { Navbar } from "@/components/layouts/navbar";
import { Footer } from "@/components/layouts/footer";
import { AmbientVideoBackground } from "@/components/ui/ambient-video-background";

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <div className="relative min-h-screen">
        <AmbientVideoBackground className="fixed" />
        <main className="relative z-10 min-h-screen pt-16">{children}</main>
      </div>
      <Footer />
    </>
  );
}
