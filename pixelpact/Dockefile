FROM mcr.microsoft.com/playwright:v1.26.1-focal

WORKDIR /workspace
ADD package.json /workspace/
ADD package-lock.json /workspace/
RUN npm ci

ADD . /workspace/
EXPOSE 8888
ENTRYPOINT [ "node", "index.js" ]