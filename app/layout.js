import "./globals.css";

export const metadata = {
  title: "Lighthouse",
  description: "Guiding every client Journey, from offer to Harbor.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
