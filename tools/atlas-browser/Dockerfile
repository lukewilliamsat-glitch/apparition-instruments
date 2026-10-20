# Digests are resolved and recorded by Run-AtlasBrowser.ps1 before build.
# Browser installation/build has network; candidate execution NEVER does.
ARG NODE_IMAGE
ARG COMPILER_IMAGE
ARG BROWSER_IMAGE
FROM ${COMPILER_IMAGE} AS compiler
COPY tests/atlas/browser-network-deny.c /src/network-deny.c
RUN gcc -static -std=c11 -O2 -Wall -Wextra -Werror /src/network-deny.c -o /network-deny
FROM ${NODE_IMAGE} AS node
FROM ${BROWSER_IMAGE}
COPY --from=compiler /network-deny /atlas-network-deny
COPY --from=node /usr/local/bin/node /usr/local/bin/node22
WORKDIR /atlas/tools/atlas-browser
COPY tools/atlas-browser/package*.json ./
RUN PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --ignore-scripts --omit=optional --no-audit --no-fund
COPY scripts/atlas /atlas/scripts/atlas
COPY tests/atlas/isolated-browser.mjs /atlas/tests/atlas/isolated-browser.mjs
COPY tools/atlas-browser/entrypoint.sh /entrypoint.sh
RUN chmod 755 /entrypoint.sh && /usr/local/bin/node22 -e "if(process.versions.node!=='22.20.0')process.exit(1)"
ENTRYPOINT ["/entrypoint.sh"]
