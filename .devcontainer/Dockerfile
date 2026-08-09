FROM mcr.microsoft.com/devcontainers/typescript-node:22-bookworm

RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      latexmk texlive-xetex texlive-latex-extra texlive-fonts-recommended \
      poppler-utils fonts-noto-cjk unzip zip \
 && rm -rf /var/lib/apt/lists/*
