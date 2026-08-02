#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
printf '%s\n' 'Terra Testudo sera disponible sur http://localhost:4173'
node server.mjs
