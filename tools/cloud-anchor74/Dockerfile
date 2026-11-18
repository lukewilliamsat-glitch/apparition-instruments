FROM supabase/postgres:17.6.1.136@sha256:f371b5f3f2ac0a05703f33d6e6134515fb2498cab708fb948a0aeb7481467c00
USER root
RUN apt-get -qq update && apt-get -qq install --no-install-recommends -y python3 age ca-certificates && rm -rf /var/lib/apt/lists/*
ARG ANCHOR_UID=1001
RUN test "$ANCHOR_UID" -gt 0 && { getent passwd "$ANCHOR_UID" >/dev/null || useradd -u "$ANCHOR_UID" -d /work anchor_runner; }
ENV PATH=/usr/lib/postgresql/17/bin:/usr/local/bin:/usr/bin:/bin
ENTRYPOINT ["python3", "-I", "/anchor/anchor.py"]
USER postgres
