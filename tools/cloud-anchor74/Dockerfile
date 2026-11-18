FROM postgres:17.6-bookworm@sha256:f3bd19c606e442c3d7bdfa8002e03fe260a1023351e0ea4598032022b68dd6e3
USER root
RUN apt-get -qq update && apt-get -qq install --no-install-recommends -y python3 age ca-certificates && rm -rf /var/lib/apt/lists/*
ARG ANCHOR_UID=1001
RUN test "$ANCHOR_UID" -gt 0 && { getent passwd "$ANCHOR_UID" >/dev/null || useradd -u "$ANCHOR_UID" -d /work anchor_runner; }
ENV PATH=/usr/lib/postgresql/17/bin:/usr/local/bin:/usr/bin:/bin
ENTRYPOINT ["python3", "-I", "/anchor/anchor.py"]
USER postgres
