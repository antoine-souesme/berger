#!/bin/sh
# Faux `hc connect` : lit son entrée sans jamais répondre.
exec cat >/dev/null
