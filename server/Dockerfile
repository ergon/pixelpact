FROM mcr.microsoft.com/playwright:v1.65.1-noble@sha256:1507cbfc550a63a6b7396791ca4f00df17beb56342d2447b3f106c306f525579

WORKDIR /workspace
ADD package.json /workspace/
ADD package-lock.json /workspace/
RUN npm ci --omit=dev

ADD ./src/ /workspace/
EXPOSE 8888
ENTRYPOINT [ "node", "index.js" ]