/** Database every integration file clones (`CREATE DATABASE ... TEMPLATE`), so files never share rows. */
export const TEMPLATE_DATABASE = "investlab_template";

/** Same server, another database name. */
export function withDatabase(url: string, database: string): string {
    const next = new URL(url);
    next.pathname = `/${database}`;
    return next.toString();
}
