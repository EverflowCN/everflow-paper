# Everflow·彼时流年若水

Private source repository for Everflow Core Audit 02.

## Run in GitHub Codespaces

1. Open this private repository.
2. Click **Code → Codespaces → Create codespace on main**.
3. Wait for the dev container to install XeLaTeX, unzip the private source archive, install Node dependencies, and build the project.
4. Everflow starts automatically on port **8787**. Open the forwarded port named **Everflow Web**.

The source archive remains private in this repository as `everflow-private-github-ready.zip`. Codespaces expands it only inside the private development workspace.

## CI

`Everflow archive CI` checks out this private repository, expands the archive in the runner, then runs build, unit tests, and an API health smoke test without committing the expanded source back to Git history.

## License

Proprietary / all rights reserved. The source is not licensed for redistribution or public use.
