import { fetch as fetchHandler } from "@tanstack/react-start/server-entry";

export default async (req: Request) => {
  return fetchHandler(req, {}, {});
};