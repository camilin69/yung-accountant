FROM alpine:3.19

RUN apk add --no-cache curl jq bash

COPY init-keycloak.sh /init.sh
RUN chmod +x /init.sh

ENTRYPOINT ["/init.sh"]