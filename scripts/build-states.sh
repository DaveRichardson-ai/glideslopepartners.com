#!/usr/bin/env bash
# Builds the site twice: as it is (dist/) and with fixture articles published (dist-published/).
set -euo pipefail
rm -rf .astro/data-store.json node_modules/.astro
npx astro build
rm -rf .astro/data-store.json node_modules/.astro
INSIGHTS_DIR=tests/fixtures/insights-published ASTRO_OUT_DIR=dist-published npx astro build
rm -rf .astro/data-store.json node_modules/.astro
