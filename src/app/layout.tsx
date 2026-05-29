import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata = {
  title: "StudioFeed",
  description: "设计工作室作品聚合展示工具",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
                var applyTheme = function () {
                  var theme = localStorage.getItem("studio-feed-theme-mode") || "system";
                  var useDark = theme === "dark" || (theme === "system" && mediaQuery.matches);
                  document.documentElement.classList.toggle("light", theme === "light");
                  document.documentElement.classList.toggle("dark", useDark);
                };
                applyTheme();
                if (!localStorage.getItem("studio-feed-theme-mode")) {
                  localStorage.setItem("studio-feed-theme-mode", "system");
                }
                mediaQuery.addEventListener("change", applyTheme);
              } catch {}
            `,
          }}
        />
        <script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async></script>
      </head>
      <body>
        <div className="min-h-screen flex flex-col">
          <SiteHeader />

          <main className="flex-1">{children}</main>

          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
