/**
 * Deployment Entry Point Bridge
 * 
 * Some hosting platforms (like Replit Deployments) expect a root-level `server.js`
 * as the entry file and do not allow modifying the execution path.
 * 
 * Since this project is configured as "type": "module", we use dynamic import
 * to boot up the compiled production build from the `dist` directory.
 */
import("./dist/index.cjs").catch((err) => {
  console.error("Failed to boot production server from dist/index.cjs:", err);
  process.exit(1);
});
