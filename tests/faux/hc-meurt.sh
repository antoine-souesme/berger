#!/bin/sh
# Faux `hc connect` : répond au hello, ferme son entrée, puis meurt 300 ms plus tard.
read -r ligne
echo '{"jsonrpc":"2.0","id":1,"result":{"core":{"name":"faux"}}}'
exec 0<&-
sleep 0.3
exit 1
