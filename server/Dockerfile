FROM mcr.microsoft.com/playwright:v1.64.0-noble@sha256:06a9939e57531807f8d5fd76ce44b53165ffb7d7501d87ab10e285c20b1e971f

WORKDIR /workspace
ADD package.json /workspace/
ADD package-lock.json /workspace/
RUN npm ci --omit=dev

ADD ./src/ /workspace/
EXPOSE 8888
ENTRYPOINT [ "node", "index.js" ]