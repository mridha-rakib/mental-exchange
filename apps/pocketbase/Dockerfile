FROM alpine:3.21

ARG PB_VERSION=0.36.7

RUN apk add --no-cache ca-certificates curl unzip \
    && curl -fsSL -o /tmp/pocketbase.zip "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" \
    && unzip /tmp/pocketbase.zip pocketbase -d /usr/local/bin \
    && chmod +x /usr/local/bin/pocketbase \
    && rm -f /tmp/pocketbase.zip

WORKDIR /app

COPY apps/pocketbase/pb_migrations ./pb_migrations
COPY apps/pocketbase/pb_hooks ./pb_hooks

EXPOSE 8090

CMD ["sh", "-c", "pocketbase migrate up --dir=/app/pb_data_local --migrationsDir=/app/pb_migrations --hooksDir=/app/pb_hooks --encryptionEnv=PB_ENCRYPTION_KEY && exec pocketbase serve --http=0.0.0.0:8090 --dir=/app/pb_data_local --migrationsDir=/app/pb_migrations --hooksDir=/app/pb_hooks --encryptionEnv=PB_ENCRYPTION_KEY --hooksWatch=false"]
