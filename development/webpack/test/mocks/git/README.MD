## Git Mocks

### loose

Loose mocks are created by copying key files from a fully checked out repo:

```bash
git clone git@github.com:MetaMask/metamask-extension.git .
git checkout "<branch name>"
```

The key files are:

1. `.git/HEAD`
2. View the contents of HEAD. Copy the file indicated by `ref: `.
3. The first is a folder in `.git/objects/<byte>/<...bytes>`
   - where `byte` is the byte (its in hex) of the contents of the file from step 2
   - where `...bytes` is the remainder of the contents of the file from step 2

### pack

Pack mocks are created by copying key files from a shallow clone of a repo:

```bash
git clone --depth 1 --no-checkout git@github.com:MetaMask/metamask-extension.git .
git fetch --depth 1 origin "<commit hash>"
git checkout -B "<branch name>" "<commit hash>"
```

The key files are:

1. `.git/HEAD`
2. The contents of HEAD points to a file in `.git/refs/heads/` which contains the commit hash of the current branch.
3. all of the files in `.git/objects/pack/`

- not all will always be needed, but it's easier to just copy them all.
