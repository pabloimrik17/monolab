import fs from "node:fs";
import path from "node:path";

// Paquetes que tienen jsr.json
const packagesWithJsr = ["packages/react-clean"];

packagesWithJsr.forEach((packagePath) => {
    const packageJsonPath = path.join(packagePath, "package.json");
    const jsrJsonPath = path.join(packagePath, "jsr.json");

    if (fs.existsSync(packageJsonPath) && fs.existsSync(jsrJsonPath)) {
        const packageJson = JSON.parse(
            fs.readFileSync(packageJsonPath, "utf8")
        );
        const jsrJson = JSON.parse(fs.readFileSync(jsrJsonPath, "utf8"));

        // Sincronizar versión
        jsrJson.version = packageJson.version;

        fs.writeFileSync(jsrJsonPath, JSON.stringify(jsrJson, null, 4) + "\n");
        console.log(
            `✅ Syn§ced version ${packageJson.version} to ${jsrJsonPath}`
        );
    }
});
