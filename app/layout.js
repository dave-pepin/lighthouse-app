import "./globals.css";
import ActionErrorNotice from "@/components/ActionErrorNotice";

export const metadata = {
  title: "Lighthouse",
  description: "Guiding every client Journey, from offer to Harbor.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ActionErrorNotice />
      </body>
    </html>
  );
}
