"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import NextError from "next/error";

// The root error boundary — catches anything that escapes every other
// error.js boundary in the app. Next.js doesn't report to Sentry
// automatically here, so this is what makes sure a truly fatal render
// error still shows up.
export default function GlobalError({ error }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
