// Plain module, not "use server": a server-function file may only export async functions.
export const API_URL = process.env["QUP_API_URL"] ?? "http://localhost:3001";
