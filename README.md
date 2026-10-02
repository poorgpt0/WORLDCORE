# BinancePH Pro

A professional crypto trading platform rebuilt with advanced UI, secure authentication, and now integrating AgentPay.

## AgentPay SDK Installation

To use the local AgentPay daemon that interacts with this application, you will need to install it on your local machine (macOS or Linux).

### Quick start (macOS only)

One-click install (recommended):

```bash
curl -fsSL https://wlfi.sh | bash
```

To install the latest version explicitly, or pin a specific release:

```bash
# latest
curl -fsSL https://wlfi.sh/latest | bash

# specific version
curl -fsSL https://wlfi.sh/0.1.0 | bash
```

The script downloads a prebuilt runtime bundle, installs `agentpay`, and auto-detects supported AI host integrations. No Rust, Cargo, or pnpm required. After install, run `agentpay admin setup` to create a wallet.

### Install from source (macOS/Linux)
Requires Node.js `20+`, `pnpm`, Rust `1.87.0+`, and Xcode CLI Tools.

```bash
git clone https://github.com/worldliberty/agentpay-sdk.git
cd agentpay-sdk
pnpm install
pnpm run build
pnpm run install:cli-launcher
pnpm run install:rust-binaries
```

On macOS, add `export PATH="$HOME/.agentpay/bin:$PATH"` to `~/.zshrc`, then reload your shell with `source ~/.zshrc`.
On Linux, add `export PATH="$HOME/.agentpay/bin:$PATH"` to your shell startup file such as `~/.bashrc`, `~/.zshrc`, or `~/.profile`, then reload that file.

### Setup

Then set up the wallet:

```bash
agentpay admin setup
```

From here, continue to Wallet setup -> Funding -> Policy -> Transfers in the World Liberty Financial docs.

## Skill Pack

To install **only** the skill pack and adapters without the full runtime, pass `--skills-only`:

```bash
curl -fsSL https://wlfi.sh/ | bash -s -- --skills-only
```
