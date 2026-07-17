---
name: deploy-firebase-prototype
description: Build, deploy, and independently verify the OceanEyes web app on its Firebase prototype hosting channel. Use when the user asks to deploy, publish, update, or refresh the hosted web app; asks whether a change is live; or explicitly requires a code/UI change to reach the Firebase prototype URL rather than remain local.
---

# Deploy Firebase Prototype

Treat deployment and hosted verification as required work. Do not report a user-facing change as live based only on local source, Git state, build output, or matching text fragments in an older bundle.

## Workflow

1. Inspect `package.json`, `.firebaserc`, and `firebase.json`. Confirm the intended project and prototype channel before mutation.
2. Record the deployment start time and the current Git commit. Do not claim a commit is deployed merely because the worktree is clean or the branch is pushed.
3. Run `npm run firebase:preview`. This must build first and then deploy the `prototype` Firebase Hosting channel.
4. Stop and report the exact blocking error if either build or deployment exits nonzero. Never describe a partial run as deployed.
5. Run the local Firebase CLI channel listing:

   ```powershell
   & 'node_modules/.bin/firebase.cmd' hosting:channel:list --project ocean-eyes-webapp
   ```

   Confirm the `prototype` release time is later than the recorded deployment start and capture the channel URL returned by Firebase. Use the CLI appropriate to the current OS if not on Windows.
6. Read the built entry asset name from `dist/index.html`.
7. Fetch the prototype channel URL with a unique cache-busting query parameter and `Cache-Control: no-cache`. Read its entry asset name from the returned HTML.
8. Require the hosted entry asset name to exactly equal the built entry asset name. Asset equality plus the new release timestamp is the deployment proof. Do not substitute fuzzy source-string checks.
9. When the requested behavior is visually or interactively significant, reload the prototype URL and inspect that behavior after the asset check. Keep this proportional to the change.

## Completion Rules

Report success only when all are true:

- The production build succeeded.
- Firebase reported the prototype release complete.
- The prototype channel has a new release timestamp.
- The hosted entry asset exactly matches the freshly built entry asset.

Include the verified prototype URL and release time in the final response. State clearly that this is the `prototype` channel, not the Firebase `live` channel.

Do not deploy the `live` channel unless the user explicitly asks for a production/live deployment.
