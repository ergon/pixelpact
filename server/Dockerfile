FROM mcr.microsoft.com/playwright:v1.64.1-noble@sha256:7852dc5a7d72f5fe458a597d690f6c42fbc8e9e26ddfa95f8e6ef552558d9bbf

WORKDIR /workspace
ADD package.json /workspace/
ADD package-lock.json /workspace/
RUN npm ci --omit=dev

ADD ./src/ /workspace/
EXPOSE 8888
ENTRYPOINT [ "node", "index.js" ]