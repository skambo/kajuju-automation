FROM n8nio/n8n:latest
USER root
ENTRYPOINT ["sh", "-c", "chown -R node:node /data && exec su-exec node /docker-entrypoint.sh"]
