FROM mcr.microsoft.com/playwright:v1.54.1-noble

WORKDIR /workspace
ADD package.json /workspace/
ADD package-lock.json /workspace/
RUN npm ci --omit=dev

ADD ./src/ /workspace/
EXPOSE 8888
ENTRYPOINT [ "node", "index.js" ]