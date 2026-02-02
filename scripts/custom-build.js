import { exec } from "child_process";
import chalk from "chalk";

console.log(chalk.cyan.bold("🚀 SRJSoft Build Started..."));

const startTime = Date.now();

exec("next build", (error, stdout, stderr) => {
  if (error) {
    console.error(chalk.red("❌ Build Failed:\n"), stderr);
    process.exit(1);
  }

  // Modify Next.js logs
  const modifiedLogs = stdout
    .replace(/info\s*-/g, chalk.blue("ℹ️ SRJSoft:"))
    .replace(/warn\s*-/g, chalk.yellow("⚠️ SRJSoft Warning:"))
    .replace(/error\s*-/g, chalk.red("❌ SRJSoft Error:"))
    .replace(/Compiled successfully/g, chalk.green("✅ SRJSoft Build Successful!"));

  console.log(modifiedLogs);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(chalk.greenBright(`🏁 Build completed in ${duration}s\n`));
});
