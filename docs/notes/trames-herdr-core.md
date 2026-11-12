# Le mode tramé de herdr-core (hc 0.1.20)

Établi le 2026-11-12 en observant les octets échangés par `hc attach` avec le
core (relais sur un faux socket via `XDG_STATE_HOME`). Rien de ceci n'est
documenté dans `hc schema` : à revérifier à chaque mise à jour de `hc`.

## Ouverture

1. Le client envoie une ligne JSON simple :
   `{"jsonrpc":"2.0","id":0,"method":"hello","params":{"framed":true}}` (+ `generation: 1`).
2. Le core répond par une ligne JSON simple.
3. Ensuite, tout passe en trames, dans les deux sens.

## Une trame

En-tête de 9 octets, petit boutiste, puis `longueur` octets de données :

| octets | champ |
|---|---|
| 0–3 | canal (u32) |
| 4 | type (u8) |
| 5–8 | longueur (u32) |

Le canal 0 porte le JSON-RPC (type 0, un message JSON par trame, sans fin de ligne).
`terminal.attach` rend un `channel` (1, 2, …) pour le flux du terminal.

## Types sur le canal d'un terminal

| type | nom | sens | données |
|---|---|---|---|
| 0 | DATA | les deux | octets bruts (écran vers le client, touches vers le core) |
| 1 | CREDIT | client → core | u32 : nombre d'octets DATA reçus et traités |
| 2 | CLOSE | les deux | vide : fin du flux (détacher, sans tuer le programme) |
| 3 | RESIZE | client → core | u16 colonnes, u16 lignes |
| 4 | FOCUS | client → core | 1 octet : 1 = fenêtre active, 0 = inactive |
| 6 | AUTOMATIC_INPUT | client → core | saisie automatique (pas utilisée par `hc attach` pour les touches tapées) |

`hc attach` rend un CREDIT de la longueur de chaque trame DATA reçue, juste
après l'avoir écrite. Les touches tapées partent en DATA (type 0), même quand
`automatic_input` vaut vrai. FACTS (probablement le type 5) n'a pas été observé.
