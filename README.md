# Pixelpact 📸

Pixelpact gets you started quickly with visual testing for the web.

In contrast to functional or snapshot testing, visual testing verifies that the actually rendered HTML/CSS/JS of your web app truly looks the way it is supposed to. Pixelpact does this by taking screenshots and comparing them to reference images stored in your git repository (using [Git LFS](https://git-lfs.github.com/)).

Checkout our [Getting Started Guide](./getting-started.md).

## Goals

Visual testing is not a new idea and there are plenty of other tools, libraries and service providers that offer a similar functionality as we do. In fact, Pixelpact took a lot of inspiration from existing solutions and is based on their hard work! We created Pixelpact with the following goals:

* **Low entry barrier**. Pixelpact helps you to easily integrate visual testing, without any vendor lock-in or service provider discussions. Start using Pixelpact today and start growing with visual testing.
* **Integrated in Git**. Git is an integral part of our work setting and lot of tools are built on top of it, e.g. code reviews. Since all our tests are stored in git repositories visual tests should live there too.
* **Optimized for local development environment**: To keep the feedback loop short, we optimized Pixelpact for local development.

## Non-Goals

* **Scale to thousands of screenshots**. The more you rely heavily on visual testing, the more screenshots you have to manage. This will get increasingly difficult and frustrating, especially when simple changes (for example changing the border radius of your buttons) cause a lot of red tests. This is when you have outgrown Pixelpact - which is great! Now move to a more sophisticated service provider such as Percy.io or Applitools.
* **Crazy fast performance**: Although Pixelpact is not really slow, it is not crazy fast either. For the time being we won't optimize for speed.
* **Cross Device and Cross Browser Testing**: Fortunately, the differences between the browsers have become smaller. Therefore, it is usually sufficient to test with one browser. If you really need to ensure cross browser or even cross device compatibility, then Pixelpact is not the solution for you. Currently, we only support chrome and we don't intend to support mobile browsers at all.

## Components

For an overview on our architecture, checkout our [Architecture Guide](./docs/architecture.md).

### Pixelpact

The core of Pixelpact is a docker container that you run in your local development environment. Your tests will run locally and send the required data to this server. Pixelpact will then respond with the matching result and a optional diff.

### Pixelpact Playwright

Playwright JS integration.

### ... other test frameworks

The integration in other test frameworks requires no witchcraft. We designed our API to make this as simple as possible.
Checkout our playwright integration or the [API Docs](./docs/architecture.md) to roll your own.


## Security

* Desigend for local development only!

## Attribution

* [Pixelmatch](https://github.com/mapbox/pixelmatch)
* [Percy.io for OSS Library](https://github.com/percy)
* [Applitools for insightful talks](https://applitools.com/on-demand-video-catalog/)