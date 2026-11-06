#!/usr/bin/env bash
# Respaldo diario de la base de GesPLAFT. Uso: backup.sh /etc/gesplaft/test.env /var/backups/gesplaft
# Cron sugerido (como el usuario que ejecuta la app): 15 3 * * * /var/www/gesplaft-test/deploy/backup.sh /etc/gesplaft/test.env /var/backups/gesplaft
set -euo pipefail
ENV_FILE="${1:?Indicá el archivo de entorno}"
DEST="${2:?Indicá la carpeta de destino}"
KEEP_DAYS="${KEEP_DAYS:-14}"
set -a; . "$ENV_FILE"; set +a
umask 077
mkdir -p "$DEST"
FILE="$DEST/gesplaft-$(date +%Y%m%d-%H%M%S).dump"
pg_dump --format=custom --no-owner "$DATABASE_URL" > "$FILE"
pg_restore --list "$FILE" > /dev/null   # comprueba que el respaldo es legible
find "$DEST" -name 'gesplaft-*.dump' -mtime +"$KEEP_DAYS" -delete
echo "Respaldo listo: $FILE"
