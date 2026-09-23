# Repository freshness

Before starting implementation or opening a preview:
- Check the working tree, current branch, and remote.
- Fetch the remote and compare the checkout with the latest remote main. Never assume local main or remote-tracking refs are current.
- When working on main, fast-forward to origin/main before editing. Preserve local work first and reapply it carefully; never discard user changes.
- On a feature branch, check its relationship to current remote main and report any divergence before choosing how to integrate upstream changes.
- Verify the preview is serving the intended checkout and current routes.

These checks do not override account-routing, commit, push, or deployment safeguards.
