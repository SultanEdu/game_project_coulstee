import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    const response = await next();

    if (response instanceof Response && response.status === 404) {
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html")) {
        return response;
      }
      return new Response(renderErrorPage(404), {
        status: 404,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    return response;
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      const code = (error as { statusCode: number }).statusCode;
      if (code === 404) {
        return new Response(renderErrorPage(404), {
          status: 404,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(500), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
}));
