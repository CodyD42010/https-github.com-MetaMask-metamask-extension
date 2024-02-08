# Make sure that image used in this docker match with the one in circleci config.yaml file
FROM mcr.microsoft.com/playwright:v1.41.1-jammy AS build

WORKDIR '/usr/src/app'

# Copy test files
COPY playwright.config.ts .
COPY . ./test/e2e/playwright/mmi/
# Copy extension for test
COPY ./dist/chrome ./dist/chrome

# Install testing dependencies
# Make sure deps here are aligned with package.json
RUN yarn add dotenv@^16.0.1 @playwright/test@^1.41.1 axios@^1.1.3
ENV HEADLESS=false

ENTRYPOINT ["npx", "xvfb-run", "playwright", "test", "--workers=1", "--project=mmi.visual"]