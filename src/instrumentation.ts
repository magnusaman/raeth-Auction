export async function register() {
  // Only run on the Node.js server runtime
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[Socket.io] Ready for initialization");
  }
}
