FROM alpine:3.19

RUN apk add --no-cache curl jq bash

COPY initialize.sh /initialize.sh
RUN dos2unix /initialize.sh && chmod +x /initialize.sh

ENTRYPOINT ["/initialize.sh"]