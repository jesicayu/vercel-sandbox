import { config } from "dotenv";
import ms from "ms";
import { Sandbox, Snapshot } from "@vercel/sandbox";

config({ path: ".env.local" });

async function main() {
  const sandbox = await Sandbox.create({
    name: "one-otter-sandbox",
    timeout: 30 * 60 * 1000,
    networkPolicy: {
      allow: {
        "api.github.com": [
          {
            match: {
              method: ["GET"],
            },
            transform: [{ headers: { Host: "api.github.com" } }],
          },
          { response: { statusCode: 403 } },
        ],
      },
    },
  });

  const result = await sandbox.runCommand("echo", [
    "Hello from Vercel Sandbox!",
  ]);
  console.log(await result.stdout());

  const getResult = await sandbox.runCommand({
    cmd: "curl",
    args: ["-s", "https://api.github.com"],
  });

  console.log("GET:", await getResult.stdout());

  const postResult = await sandbox.runCommand({
    cmd: "curl",
    args: [
      "-sS",
      "-o",
      "/dev/null",
      "-w",
      "%{http_code}",
      "-X",
      "POST",
      "https://api.github.com",
    ],
  });
  console.log("POST:", await postResult.stdout());

  await sandbox.runCommand("npm", ["install"]);

  const snapshot = await sandbox.snapshot({ expiration: ms("14d") });
  console.log(snapshot.snapshotId);

  const secondSandbox = await Sandbox.create({
    source: { type: "snapshot", snapshotId: snapshot.snapshotId },
  });

  const snapshotList = await Snapshot.list();
  for await (const snapshot of snapshotList) {
    console.log(snapshot.id, snapshot.status);
  }
}

main().catch(console.error);
