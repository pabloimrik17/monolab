import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("ts-configs", () => {
    it("should have valid tsconfig.base.json", () => {
        const tsconfigPath = resolve(__dirname, "../tsconfig.base.json");
        const content = readFileSync(tsconfigPath, "utf-8");

        // Remove comments from JSON (TypeScript allows comments in tsconfig)
        const jsonContent = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");

        expect(() => JSON.parse(jsonContent)).not.toThrow();

        const tsconfig = JSON.parse(jsonContent);

        expect(tsconfig).toBeDefined();
        expect(tsconfig.compilerOptions).toBeDefined();
    });

    it("should export tsconfig.base.json in package.json", () => {
        const packageJsonPath = resolve(__dirname, "../package.json");
        const content = readFileSync(packageJsonPath, "utf-8");
        const packageJson = JSON.parse(content);

        expect(packageJson.exports).toBeDefined();
        expect(packageJson.exports["./tsconfig.base.json"]).toBe(
            "./tsconfig.base.json"
        );
    });
});
